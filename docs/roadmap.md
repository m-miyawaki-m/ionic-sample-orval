# 製造ロードマップ — MSW → Prism → Java の3段階

このプロジェクトは **「いきなり全部作らず、段階的に層を増やす」** という前提で設計されている。
段階ごとに「動作する成果物」が手に入るので、途中で中断しても価値が残る。

```
[Stage 1] フロント + MSW
    │ ブラウザだけで完結する小さな完成形
    ▼
[Stage 2] + Prism モックサーバー
    │ 外部ツール / 実機検証も可能に
    ▼
[Stage 3] + Spring Boot バックエンド
    │ 永続化と実装を持つ本物のシステム
```

各段階の goal / 受け入れ基準 / 次に進む判断材料を以下に示す。

---

## Stage 1: フロントエンド + MSW

### Goal

`openapi.yaml` をもとに **ブラウザだけで完結する** Ionic Vue アプリを動かす。
ネットワーク不要で `/api/items` を呼び出し、CRUD 画面が動く状態にする。

### 構成要素

- `openapi/openapi.yaml`（仕様）
- `frontend/` — Ionic Vue 8 + Capacitor 5
- Orval（型・クライアント・MSW handlers を生成）
- MSW（Service Worker でリクエスト横取り）

### 含めるもの

- 3 画面（List / Detail / Create）
- `npm run gen` で再生成可能な API レイヤー
- `.env.development` の `VITE_USE_MOCK=msw` で起動

### 含めないもの

- バックエンド（後で）
- Prism（後で）
- 永続化（MSW は毎回 example を返すだけ）
- Android（後で）

### 起動手順

```powershell
cd frontend
npm install        # 初回のみ
npm run gen        # openapi.yaml から生成
npm run dev        # http://localhost:5173
```

### 受け入れ基準（Definition of Done）

- [ ] `npm run dev` でブラウザを開いて ListView に「ペン ¥200」「ノート ¥800」が出る
- [ ] DevTools の Network タブで `/api/items` が `(from ServiceWorker)` で 200 を返している
- [ ] 行タップ → 詳細 → 削除 → 一覧に戻る が動く
- [ ] 「追加」→ 入力 → 登録 → 一覧に戻る が動く
- [ ] PC をオフラインにしても上記が全て動く（重要：通信が外に出ていない証拠）

### 次に進む判断材料

以下のいずれかが必要なら **Stage 2 に進む**：

- 外部ツール（Postman / curl）からモックを叩いて検証したい
- Android 実機やエミュレータで動作確認したい
- バックエンド開発者と仕様を擦り合わせたい
- MSW の Service Worker 由来の制限に当たった

そうでなければ Stage 1 だけで十分なケースもある（学習・プロトタイプ用途）。

---

## Stage 2: + Prism モックサーバー

### Goal

`openapi.yaml` の同じ `example` を **HTTP モックサーバー**としても提供できる状態にする。
ブラウザ以外（Postman / curl / Android 実機）からも仕様準拠のレスポンスを叩ける。

### 追加する構成要素

- `scripts/start-mock-prism.cmd`（Prism CLI 起動スクリプト）

### 含めるもの

- Prism のローカル起動（`:4010`）
- `.env.development` で `VITE_USE_MOCK=none` + `VITE_API_BASE_URL=http://localhost:4010` に切替
- ブラウザの MSW を Vitest 単体テスト専用に格下げ

### 含めないもの

- 実装（永続化・ロジック）はまだ無い
- Spring Boot もまだ無い

### 起動手順

```powershell
# ターミナル A: Prism を起動
.\scripts\start-mock-prism.cmd
# → http://localhost:4010 で待受

# ターミナル B: フロント（実 BE モード扱い）
cd frontend
# .env.development を編集:
#   VITE_USE_MOCK=none
#   VITE_API_BASE_URL=http://localhost:4010
npm run dev
```

### 受け入れ基準（Definition of Done）

- [ ] `.\scripts\start-mock-prism.cmd` で Prism が `:4010` で起動する
- [ ] `curl http://localhost:4010/api/items` が `[{"id":1,"name":"ペン",...}]` を返す
- [ ] Postman でも同じレスポンスが取れる
- [ ] フロントの `.env` を切り替えると ListView が Prism 経由のデータで描画される
- [ ] DevTools の Network で `localhost:4010` への通信が見える（MSW の `(from ServiceWorker)` ではない）

### 次に進む判断材料

以下が必要なら **Stage 3 に進む**：

- POST/DELETE で **データを永続化**したい（Prism はステートレス）
- 仕様外の挙動（カスタムロジック・バリデーション）を試したい
- バックエンド側のコードも触ってみたい

そうでなければ Stage 2 でいったんゴール（仕様検証フェーズに留まる）。

---

## Stage 3: + Spring Boot バックエンド

### Goal

`openapi.yaml` に準拠した **実装を持つ Spring Boot サーバー**を立て、
インメモリの永続化と実ロジック（採番・404 など）を実現する。

### 追加する構成要素

- `backend/` — Spring Boot 3.5 + Maven + Springdoc 2.6
  - `Item` / `ItemCreate` DTO（Java record）
  - `ItemService`（インメモリ + TDD 5 テスト）
  - `ItemController`（GET / POST / DELETE）
  - `CorsConfig`（5173 / 8100 を許可）
  - `application.yml`（port 8080 + Springdoc パス）

### 含めるもの

- `mvnw` ベースのビルド・起動
- `http://localhost:8080/swagger-ui.html` で Swagger UI
- フロントの `.env` を `VITE_API_BASE_URL=http://localhost:8080` に切替して接続

### 含めないもの

- 永続 DB（H2/PostgreSQL は後付け課題）
- 認証・認可
- 本番デプロイ
- iOS

### 起動手順

```powershell
# ターミナル A: BE 起動
cd backend
.\mvnw.cmd spring-boot:run
# → Started SampleApplication ...

# ターミナル B: フロント
cd frontend
# .env.development を編集:
#   VITE_USE_MOCK=none
#   VITE_API_BASE_URL=http://localhost:8080
npm run dev
```

### 受け入れ基準（Definition of Done）

- [ ] `.\mvnw.cmd test` で 6 テスト pass（5 ItemService + 1 SmokeTest）
- [ ] `.\mvnw.cmd spring-boot:run` で起動し `/swagger-ui.html` が開く
- [ ] `curl http://localhost:8080/api/items` で空配列 `[]` が返る（インメモリ初期状態）
- [ ] `curl -X POST` で作成 → `curl GET` で 1 件返る
- [ ] フロントの `.env` を切り替えるだけで全画面が実 BE で動く
- [ ] サーバーを再起動するとデータがリセットされることを確認（インメモリの仕様）

### 次に進む判断材料

ここまで来たら **本格運用に向けた拡張**を選択する：

| 拡張 | 必要度 | 概要 |
|------|-------|------|
| H2 / PostgreSQL | プロダクトに必要なら | `spring-boot-starter-data-jpa` + `Item` を Entity 化 |
| 認証 (Spring Security + JWT) | 多人数運用なら | `OncePerRequestFilter` で JWT 検証 |
| Android 実機 | モバイル想定なら | Stage 4 として `npx cap add android` 系（既に追加済） |
| CI / GitHub Actions | チーム開発なら | `mvnw test` + `npm run build` を自動化 |
| 入力バリデーション | 公開API化なら | `spring-boot-starter-validation` + `@Valid` |
| iOS | クロスプラットフォーム化なら | `npx cap add ios` + Xcode 環境 |

---

## 段階遷移時の注意

### Stage 1 → 2

- `.env.development` の値を切り替えるだけ。コード変更は不要。
- MSW を完全に消したくないなら、`vitest` の単体テスト用に handlers を残すのが定石。

### Stage 2 → 3

- BE 実装が進むまでは Prism を残す。BE が一部実装したら、未実装エンドポイントだけ Prism へフォールバックさせる戦略もあり（ただし設定は手間なので学習目的なら不要）。
- `openapi.yaml` を変えたら **両方** 追従させる：
  - フロント: `npm run gen`
  - BE: 手で controller / service / DTO を直す
  - 検証: `http://localhost:8080/v3/api-docs` を yaml と目視比較

### 戻り方（regression）

各段階は前の段階を破壊しない。`.env` を戻すだけで Stage 1 / 2 / 3 を行き来できる。

```
.env.development を切り替えるだけ：

  VITE_USE_MOCK=msw                      → Stage 1 動作
  VITE_API_BASE_URL=http://localhost:4010 → Stage 2 動作
  VITE_API_BASE_URL=http://localhost:8080 → Stage 3 動作
```

`npm run dev` を再起動すれば反映される。

---

## 今このプロジェクトはどこ？

3 段階全て完了済み（コミット数 33+）。

```
[Stage 1 ✅] frontend + MSW    （Phase 0–4）
[Stage 2 ✅] + Prism            （Phase 8）
[Stage 3 ✅] + Spring Boot      （Phase 6）
[Stage 4 ✅] + Android Cap     （Phase 9 partial、最終 Run は手動）
```

新しく加わったメンバーが**最初に動かして触る**なら、まず Stage 1（`cd frontend; npm run dev`）から始めるのが理解が早い。

詳細手順は [`docs/getting-started.md`](./getting-started.md) を参照。
