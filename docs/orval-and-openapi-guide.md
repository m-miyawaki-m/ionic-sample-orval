# Orval と OpenAPI ガイド

このドキュメントは、`ionic-sample-orval` プロジェクトでの Orval の動作と `openapi.yaml` の編集方法をまとめたもの。

> このプロジェクトは **Spec-First**（OpenAPI を真実の源として、フロント・バックエンドが両方そこから派生する）。

---

## 1. 全体像

```
[ openapi/openapi.yaml ]  ← 唯一の真実
        │
        ├──► Orval が読み込み（npm run gen）
        │     ├─ TypeScript 型定義（src/api/models/）
        │     ├─ axios クライアント関数（src/api/default/default.ts）
        │     └─ MSW モックハンドラ（src/api/default/default.msw.ts）
        │
        ├──► Prism CLI が読み込み（scripts/start-mock-prism.cmd）
        │     └─ HTTPモックサーバー（:4010）として待受
        │
        └──► Spring Boot は手書きで実装
              └─ Springdoc が起動時に /v3/api-docs として再エクスポート
                  → openapi.yaml と一致しているか目視で確認
```

`openapi.yaml` を編集 → `npm run gen` → コードに反映、というのが基本の編集フロー。

---

## 2. Orval の仕組み

### 2.1 Orval とは

OpenAPI スキーマから **TypeScript 型・HTTPクライアント・モックコード**を自動生成するツール。

- **入力**: OpenAPI 3.0/3.1 の YAML/JSON
- **出力（このプロジェクトの設定）**:
  - `src/api/index.ts` — barrel
  - `src/api/models/*.ts` — schema を TypeScript 型に
  - `src/api/default/default.ts` — クライアント関数（`listItems` `getItem` など）
  - `src/api/default/default.msw.ts` — MSW handlers

### 2.2 設定ファイル: `frontend/orval.config.ts`

```ts
import { defineConfig } from 'orval'

export default defineConfig({
  api: {
    input: '../openapi/openapi.yaml',     // 入力ファイル
    output: {
      target: 'src/api/index.ts',         // クライアント出力先
      schemas: 'src/api/models',          // 型出力先
      client: 'axios-functions',          // 個別 export 関数として生成
      mode: 'tags-split',                 // タグごとにファイル分割
      mock: {
        type: 'msw',
        useExamples: true,                // openapi.yaml の example を使用
      },
      override: {
        mutator: {
          path: 'src/api/axios.ts',       // 自前 axios 設定を mutator として
          name: 'request',                // export 名
        },
      },
    },
  },
})
```

### 2.3 各オプションの意味

| オプション | 意味 | このプロジェクトの値 |
|-----------|-----|---------------------|
| `input` | スキーマファイルのパス（URL指定も可） | `'../openapi/openapi.yaml'` |
| `output.target` | クライアントの生成先 | `'src/api/index.ts'` |
| `output.schemas` | スキーマ型の生成先 | `'src/api/models'` |
| `output.client` | 出力スタイル | `'axios-functions'`（**注意：`'axios'` だと factory 関数になる**） |
| `output.mode` | 生成戦略 | `'tags-split'`（OpenAPI の `tag` ごとにファイル分割。タグ未定義なら `default`） |
| `output.mock` | モック生成 | `{ type: 'msw', useExamples: true }`（**`true` だと faker でランダム値**） |
| `output.override.mutator` | クライアント関数本体を自前実装に差し替え | `axios.ts` の `request` |

### 2.4 mutator（自前 axios の意味）

Orval のデフォルトはむき出しの axios。**baseURL 切替・トークン付与・キャンセル制御** など、共通処理を入れるために mutator を使う。

`frontend/src/api/axios.ts`:

```ts
import Axios, { type AxiosRequestConfig } from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL ?? ''

export const axiosInstance = Axios.create({ baseURL })

export const request = <T>(config: AxiosRequestConfig): Promise<T> => {
  const source = Axios.CancelToken.source()
  const promise = axiosInstance({ ...config, cancelToken: source.token }).then(
    ({ data }) => data,
  )
  // @ts-expect-error allow cancel attach
  promise.cancel = () => source.cancel('Query was cancelled')
  return promise as Promise<T>
}
```

Orval が生成するクライアント関数は内部で `request<T>(...)` を呼び出すコードに展開される：

```ts
// 生成された default.ts の一部（自動生成）
import { request } from '.././axios'
import type { Item } from '../models/item'

export const listItems = () => {
  return request<Item[]>({ url: '/api/items', method: 'GET' })
}
```

つまり mutator を差し替えれば、URL 変更や認証ヘッダなどがアプリ全体に効く。

### 2.5 生成物は触らない

`src/api/` 配下のファイルは **`npm run gen` を実行するたびに上書き**される。手で編集してはいけない（変更は次回再生成で消える）。

修正したい場合は：
- 仕様自体を変えたい → `openapi.yaml` を編集して再生成
- HTTP 通信の挙動を変えたい → `src/api/axios.ts`（mutator）を編集
- MSW の挙動を細かく変えたい → `src/mocks/handlers.ts` で生成された handler を加工

### 2.6 再生成のタイミング

`openapi.yaml` を編集したら、必ず：

```powershell
cd frontend
npm run gen
```

を実行。型ミスマッチによるコンパイルエラーが出た場合、それは仕様変更が UI に伝播していない箇所を教えてくれているサイン。

---

## 3. openapi.yaml の構造

### 3.1 ファイル全体の骨格

```yaml
openapi: 3.0.3              # 規格バージョン
info: { ... }               # メタ情報（title / version / description）
servers: [ ... ]            # 接続先 URL の候補
paths:                      # エンドポイント定義
  /api/items:               # URLパス
    get: { ... }            # HTTPメソッド
    post: { ... }
  /api/items/{id}:
    get: { ... }
    delete: { ... }
components:                 # 共有コンポーネント
  schemas: { ... }           # データモデル定義
  parameters: { ... }        # 共有パラメータ（このプロジェクトでは未使用）
  responses: { ... }         # 共有レスポンス（このプロジェクトでは未使用）
```

### 3.2 paths の中身

各エンドポイントは **operationId**（関数名）と **responses** を持つ：

```yaml
paths:
  /api/items:
    get:
      operationId: listItems              # ← Orval が生成する関数名
      summary: List all items
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/Item' }
              example:                    # ← MSW/Prism がこれを返す
                - { id: 1, name: "ペン", price: 200 }
```

ポイント：

- `operationId` を変えると **Orval 関数名と Spring Boot メソッド名（手動追従）** が変わる。基本変えない方がよい。
- `example` は MSW/Prism のレスポンスとしてそのまま使われる
- `$ref: '#/components/schemas/Item'` で再利用

### 3.3 components/schemas の中身

データ型の定義。Orval は各 schema を1ファイルの TypeScript 型に変換する。

```yaml
components:
  schemas:
    Item:                                  # ← 型名
      type: object
      required: [id, name, price]          # ← 必須フィールド
      properties:
        id:    { type: integer, format: int64, example: 1 }
        name:  { type: string,  example: "ペン" }
        price: { type: integer, example: 200 }
    ItemCreate:
      type: object
      required: [name, price]              # ← idは無し
      properties:
        name:  { type: string,  example: "新商品" }
        price: { type: integer, example: 100 }
```

生成される型（`src/api/models/item.ts`）：

```ts
export interface Item {
  id: number
  name: string
  price: number
}
```

> `format: int64` は TypeScript で `number` になる（JS には Long 型は無い）。Java では `Long` になる。

### 3.4 型の対応表

| OpenAPI | TypeScript | Java |
|---------|-----------|------|
| `type: integer, format: int32` | `number` | `Integer` |
| `type: integer, format: int64` | `number` | `Long` |
| `type: number, format: float` | `number` | `Float` |
| `type: number, format: double` | `number` | `Double` |
| `type: string` | `string` | `String` |
| `type: string, format: date-time` | `string` | `OffsetDateTime`（カスタム） |
| `type: boolean` | `boolean` | `Boolean` |
| `type: array, items: ...` | `T[]` | `List<T>` |
| `$ref: '#/.../Foo'` | `Foo` | `Foo` |

### 3.5 例 (`example`) の意味

`example` を書くと **3 つの場所で活用**される：

1. **Swagger UI** — エンドポイントを叩く時のサンプル値として表示
2. **MSW モック** — `useExamples: true` のとき、Orval がこの値をそのまま返す関数を生成
3. **Prism モック** — Prism サーバーが `example` を見つけたら優先的にそれを返す

つまり `example` を充実させると、フロント・テスト・外部ツール検証の全てで「**仕様通りのサンプルレスポンス**」が手に入る。

### 3.6 example を書く場所のパターン

```yaml
# パターンA: schema のフィールド単位
components:
  schemas:
    Item:
      properties:
        name: { type: string, example: "ペン" }   # ← この値が使われる

# パターンB: response 全体
paths:
  /api/items:
    get:
      responses:
        '200':
          content:
            application/json:
              schema: { type: array, items: { $ref: '...' } }
              example:                                # ← レスポンス全体を指定
                - { id: 1, name: "ペン", price: 200 }
                - { id: 2, name: "ノート", price: 800 }
```

**パターンBが優先**される（明示的に書いた方が勝つ）。配列を返すエンドポイントは、Aだけだと「1件入った配列」になって不自然なので、Bを書くほうがよい。

---

## 4. 修正方法（ユースケース別）

### 4.1 既存フィールドに値を追加・変更

`openapi.yaml` の該当 schema の `example` を直接書き換える。

```diff
   Item:
     properties:
-      name:  { type: string,  example: "ペン" }
+      name:  { type: string,  example: "ボールペン" }
```

```powershell
cd frontend
npm run gen
```

→ `default.msw.ts` に新しい値が反映される。BEは関係なし。

### 4.2 新しいフィールドを追加

例: `Item` に `category` を追加。

```diff
 components:
   schemas:
     Item:
       type: object
-      required: [id, name, price]
+      required: [id, name, price, category]
       properties:
         id:    { type: integer, format: int64, example: 1 }
         name:  { type: string,  example: "ペン" }
         price: { type: integer, example: 200 }
+        category: { type: string, example: "文房具" }
```

```powershell
cd frontend
npm run gen
npm run build       # 型エラーが出る → ListView/DetailView などで category を扱う必要がある
```

→ TypeScript エラー: `Property 'category' is missing` が出るので、UI を追従。

→ Backend 側: `Item.java` の record にも `String category` を追加 + `ItemService` のコンストラクタ呼び出しを追従。

### 4.3 新しいエンドポイントを追加

例: `PATCH /api/items/{id}` で部分更新。

`openapi.yaml`:

```yaml
paths:
  /api/items/{id}:
    # 既存の get と delete は維持
    patch:                                 # ← 追加
      operationId: updateItem
      summary: Update partial fields
      parameters:
        - { name: id, in: path, required: true, schema: { type: integer } }
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/ItemUpdate' }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Item' }
              example: { id: 1, name: "新名前", price: 300 }
        '404':
          description: Not Found

components:
  schemas:
    # 既存の Item, ItemCreate は維持
    ItemUpdate:                            # ← 追加
      type: object
      properties:
        name:  { type: string,  example: "新名前" }
        price: { type: integer, example: 300 }
```

```powershell
cd frontend
npm run gen
```

→ `src/api/default/default.ts` に `updateItem(id, body)` 関数が追加される。  
→ Backend 側: `ItemController` に `@PatchMapping("/{id}")` を手書き。`ItemService.update(id, partial)` も実装。

### 4.4 新しいタグでエンドポイントを分離

仕様が大きくなってきたら `tag` でグルーピングできる。

```yaml
paths:
  /api/items:
    get:
      tags: [items]              # ← タグ付け
      operationId: listItems
      ...
  /api/users:
    get:
      tags: [users]
      operationId: listUsers
      ...
```

`mode: 'tags-split'` のため、Orval は `src/api/items/items.ts`（および `items.msw.ts`）と `src/api/users/users.ts` を別々に生成する。

そうすると `src/mocks/handlers.ts` で両方を統合する必要がある：

```ts
import { getItemsMock } from '../api/items/items.msw'
import { getUsersMock } from '../api/users/users.msw'

export const handlers = [...getItemsMock(), ...getUsersMock()]
```

> 現プロジェクトはタグ未定義なので「default」というタグ名で1つにまとまっている。仕様を増やすときに使い分ける。

### 4.5 仕様の構文検証

書き換えたあと、構文ミスがないか検証：

```powershell
npx -y @apidevtools/swagger-cli validate openapi/openapi.yaml
# 出力例: openapi/openapi.yaml is valid
```

> swagger-cli は deprecated。長期的には `npx -y @redocly/cli lint openapi/openapi.yaml` への移行を検討。

---

## 5. ハマりどころ（このプロジェクトで実際に出たバグ）

### 5.1 mutator名 `axios` が npm の `axios` と衝突

**症状**: `default.ts` で `import axios from 'axios'` と `import { axios } from '../axios'` が共存し `TS2300: Duplicate identifier`。

**原因**: Orval が `client: 'axios'` のとき自動で `import axios from 'axios'` を吐く。一方で mutator の export 名が `axios` だと衝突する。

**対処**: mutator の export 名を `request` などに変える。`orval.config.ts` の `mutator.name` も合わせる。

### 5.2 `client: 'axios'` だと関数が個別 export されない

**症状**: `listItems()` を直接 import しようとすると「定義されていない」エラー。実態は `getDefault()` という factory が `{ listItems: ... }` を返す形。

**原因**: Orval v8.x の `client: 'axios'` は React Query 等のフック前提の構造で出力する。

**対処**: `client: 'axios-functions'` に変える。各 operationId が直接 `export const listItems = ...` として書き出される。

### 5.3 `mock: true` だと faker でランダムデータが返る

**症状**: 商品名が英単語のランダム文字列、価格が 20桁の巨大数字。

**原因**: Orval のデフォルトは `@faker-js/faker` でフィールド型に応じたダミーを生成。`example` は読まない。

**対処**: `mock: { type: 'msw', useExamples: true }` に変える。`openapi.yaml` の `example` を MSW handler に転写してくれる。

### 5.4 example が response にも schema にも無いと faker が残る

**症状**: 一部のエンドポイント（例: POST `/api/items`）の MSW モックだけ faker のままになる。

**原因**: そのエンドポイントの response（または schema）に `example` が書かれていないため、Orval は仕方なく faker にフォールバック。

**対処**: その response の `content.application/json` 配下に `example: { ... }` を追加してから再生成。

### 5.5 Spring Boot の Swagger UI と仕様にズレが発生

**症状**: `openapi.yaml` で `required: [id, name, price]` なのに、`http://localhost:8080/v3/api-docs` を見ると required が違う。

**原因**: Spring Boot は **コードからスキーマを生成**するので、Java 側の type/annotation が真実。`openapi.yaml` と乖離するのは設計上避けられない。

**対処**: 学習目的の今は **`openapi.yaml` を真実とし、Spring Boot 実装をそれに追従させる**運用。気になる時は手で見比べる。本格運用したいなら `openapi-generator-maven-plugin` で yaml から Spring Boot stubs を生成する手もある。

---

## 6. 開発フロー（実用シナリオ）

### 6.1 仕様変更が起点のとき

```
1. openapi/openapi.yaml を編集
2. swagger-cli validate で構文チェック
3. cd frontend && npm run gen
4. npm run build → 型エラーが出る箇所を UI に追従
5. cd backend && controller / service を仕様に追従
6. mvnw test でテスト pass を確認
7. git commit でセットでコミット
```

### 6.2 BE 実装が先行したとき

```
1. Spring Boot で実装、起動
2. http://localhost:8080/v3/api-docs を取得
3. 取得した json を openapi/openapi.yaml にマージ（手動）
4. cd frontend && npm run gen
5. UI 側の使用箇所を追従
```

### 6.3 仕様の議論段階

```
1. openapi/openapi.yaml を draft で書く
2. cd frontend && npm run gen
3. npm run dev → MSW モードで UI を作りながら違和感を確認
4. scripts/start-mock-prism.cmd → curl/Postman で外部ツールでも触る
5. 確定したら BE 実装に着手
```

---

## 7. 参考リンク

- Orval 公式: https://orval.dev/
- OpenAPI 3.0 仕様: https://swagger.io/specification/v3/
- MSW 公式: https://mswjs.io/
- Prism: https://meta.stoplight.io/docs/prism/
- Springdoc: https://springdoc.org/

---

## 8. このドキュメントの更新方針

`openapi.yaml` の構造や Orval の設定を変えたときは、このドキュメントの該当セクションも更新する。バグや仕組みの理解が更新されたら §5（ハマりどころ）に追記。
