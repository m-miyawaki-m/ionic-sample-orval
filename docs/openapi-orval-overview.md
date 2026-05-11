# OpenAPI / Swagger / Orval / zod — 概要と連携

このドキュメントは「**そもそも何のためのツールで、どう関係しているのか**」を整理した概念解説。
具体的な編集手順や設定値の意味は [`orval-and-openapi-guide.md`](./orval-and-openapi-guide.md) を参照。

---

## 1. OpenAPI と Swagger の違い

混同されがちだが、別物。

| 用語 | 正体 |
|---|---|
| **OpenAPI** | REST API の仕様を YAML/JSON で記述するための **規格（仕様書フォーマット）** |
| **Swagger** | OpenAPI の前身の名前。今は SmartBear 社の **ツール群のブランド名**（Swagger UI / Swagger Editor / Swagger Codegen） |

- 「`openapi.yaml` を書く」=「OpenAPI 規格に従ったファイルを書く」
- 「Swagger UI でドキュメント表示」=「Swagger ブランドのツールで OpenAPI ファイルを可視化」

このプロジェクトの `openapi/openapi.yaml` も冒頭で `openapi: 3.0.3` と宣言している。これが規格バージョン。

---

## 2. `openapi.yaml` が表現しているもの

このプロジェクトの `openapi/openapi.yaml` を例にすると、構造は3層:

```yaml
# (1) メタ情報
openapi: 3.0.3
info: { title, version, description }
servers: [...]

# (2) エンドポイント定義
paths:
  /api/items:
    get:  { operationId: listItems,  responses: {...} }
    post: { operationId: createItem, requestBody: {...}, responses: {...} }
  /api/items/{id}:
    get:    { ... }
    delete: { ... }

# (3) スキーマ（データ構造）定義
components:
  schemas:
    Item:       { type: object, required: [...], properties: {...} }
    ItemCreate: { type: object, required: [...], properties: {...} }
```

ポイントは **「URL・HTTP メソッド・入出力の形」が全て1ファイルに集約されている**こと。
これを **Single Source of Truth（SSoT, 信頼できる唯一の情報源）** と呼ぶ。
本プロジェクトの YAML 冒頭にも `Single source of truth for FE (Orval) and BE (Spring Boot).` と明記されている。

---

## 3. Orval の役割

**Orval = OpenAPI ファイルから TypeScript の API クライアントコードを自動生成するツール。**

人間が `openapi.yaml` を書く → Orval が読む → TypeScript の関数・型・モックが吐き出される。

本プロジェクトでの生成物（`frontend/src/api/` 配下）:

| 生成物 | 中身 |
|---|---|
| `models/item.ts` | `interface Item { id, name, price }`（型定義） |
| `models/itemCreate.ts` | `interface ItemCreate { name, price }` |
| `default/default.ts` | `listItems()`, `createItem()`, `getItem(id)`, `deleteItem(id)` 関数 |
| `default/default.msw.ts` | MSW 用モックハンドラ（YAML の `example:` を返す） |

例: `default.ts` の `listItems` 関数:

```ts
export const listItems = () => {
  return request<Item[]>({ url: `/api/items`, method: 'GET' });
}
```

YAML の `paths./api/items.get` 定義から、URL・メソッド・戻り値型まで全部自動生成されており、**手書きしていない**のがポイント。

詳細な設定オプションは [`orval-and-openapi-guide.md` §2.3](./orval-and-openapi-guide.md) を参照。

---

## 4. 連携の全体像

このプロジェクトの開発フロー全体:

```
                ┌─────────────────────────┐
                │   openapi/openapi.yaml  │ ← 人間が書く（唯一の真実）
                └────────────┬────────────┘
                             │
              ┌──────────────┼──────────────┬──────────────┐
              ▼              ▼              ▼              ▼
       ┌─────────────┐ ┌──────────┐ ┌─────────────┐ ┌────────────┐
       │   Orval     │ │  Prism   │ │ Spring Boot │ │ Swagger UI │
       │  (FE生成)   │ │(モックAPI)│ │(BE実装の    │ │  (ドキュ   │
       │             │ │          │ │  契約)      │ │   メント)  │
       └──────┬──────┘ └────┬─────┘ └──────┬──────┘ └────────────┘
              │             │              │
              ▼             ▼              ▼
       TypeScript型・     localhost:4010   localhost:8080
       関数・MSWモック    でモック応答     で本番実装
```

- **FE 側**: `npm run gen` で Orval を実行 → `src/api/` 配下が再生成 → 画面側は `listItems()` を呼ぶだけ
- **BE 側**: 同じ `openapi.yaml` を見て Spring Boot を実装（契約として守る）
- **モック**: Prism（CLI モック）または MSW（ブラウザ内モック）が YAML の `example:` を返す
- **ドキュメント**: Swagger UI / Stoplight Elements / Redocly などが YAML を読んで HTML 化

### 仕様変更時の手順

1. `openapi.yaml` を編集
2. `npm run gen`（FE 側コード再生成）
3. BE 側も実装を追従
4. ドキュメントも自動更新

これが **Spec-First（仕様駆動開発）**。

---

## 5. zod は必要か？

### 5.1 Orval が生成する型の限界

Orval が生成するのは **TypeScript の静的型** だけ。`interface Item` はコンパイル時にしか効かない。
**実行時にサーバが本当に `{id, name, price}` を返したかは検証されない**。

```ts
const items = await listItems();
// items は型上は Item[] だが、
// サーバがバグって { id: "abc" } を返してきても TypeScript は素通り
```

### 5.2 zod を入れるとどうなるか

zod は **「TypeScript 向けスキーマ宣言 + 実行時バリデーション」** のライブラリ。

- スキーマから値を実行時検証: `schema.parse(data)` / `safeParse`
- スキーマから TypeScript 型を自動生成: `z.infer<typeof schema>`

→ 「スキーマ1つで実行時チェックと静的型の両方が手に入る」のが特徴。

```ts
const items = ItemArraySchema.parse(await listItems());
// 形が違えば例外、合っていれば型保証された値
```

Orval の `client: 'zod'` を別ターゲットとして追加すると、OpenAPI から zod スキーマも自動生成できる。
用途は主に:

1. **API レスポンスの実行時検証** — サーバが仕様通りのデータを返したか確認
2. **リクエストボディ / クエリパラメータの検証** — 送信前のチェック
3. **フォーム入力のバリデーション** — `vee-validate` + `@vee-validate/zod` などと組み合わせて

### 5.3 必要性の判断軸

| 状況 | zod の必要性 |
|---|---|
| 学習用・小規模・BE と FE が同チーム | **不要**。型だけで十分 |
| BE が外部 / 仕様がブレやすい | **あった方が安全**（API 不整合を早期検出） |
| フォーム入力のバリデーションもしたい | **便利**（フォーム＋API 検証を同じスキーマで） |
| パフォーマンス重視・バンドルサイズを気にする | **不要**（zod は数十 KB 増える） |

**本プロジェクトの結論**: 学習用 + 同一リポジトリで FE/BE 管理 + 仕様書が真実なので、**現状は不要**。
将来「サーバが嘘をついたら困る」場面が出てきたら追加すれば十分。

### 5.4 もし追加するなら

`frontend/orval.config.ts` に zod 用エントリを追加:

```ts
export default defineConfig({
  api: { /* 既存 */ },
  zod: {
    input: '../openapi/openapi.yaml',
    output: {
      target: 'src/api/zod',
      client: 'zod',
      mode: 'tags-split',
    },
  },
})
```

併せて `npm i -D zod` が必要。

---

## 6. 関連ドキュメント

- [`orval-and-openapi-guide.md`](./orval-and-openapi-guide.md) — Orval 設定の詳細・編集手順・ハマりどころ
- [`openapi-contract.md`](./openapi-contract.md) — Spec-First の契約としての YAML 運用方針
- [`api-viewer-comparison.md`](./api-viewer-comparison.md) — Swagger UI / Stoplight / Redocly の比較
- [`getting-started.md`](./getting-started.md) — 初回セットアップ
