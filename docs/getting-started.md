# Getting Started — 起動手順書

このプロジェクトを **どの段階で・どう起動するか** をまとめた実行手引き。
段階の意味は [`roadmap.md`](./roadmap.md) を参照。

---

## 0. 前提環境のチェック

何か始める前に下記コマンドで環境を確認：

```powershell
node -v          # v24.x が望ましい
npm -v           # 11.x
java -version    # JDK 17 (Stage 3 以降で必要)
```

```powershell
# Android SDK 33 の存在確認 (Stage 4 のみ必要)
Test-Path "$env:LOCALAPPDATA\Android\Sdk\platforms\android-33"
# True が返れば OK
```

すべて満たさなくても、必要な Stage に進む時に確認すれば良い。

---

## 1. 初回セットアップ（クローン直後）

```powershell
cd C:\Oracle\3df002\ionic-sample-orval

# フロント依存をインストール
cd frontend
npm install
npm run gen          # OpenAPI から型・クライアント・MSW handlers を生成
cd ..

# バックエンド（Stage 3 以降）— 初回はビルドだけ走らせて依存をキャッシュ
cd backend
.\mvnw.cmd compile
cd ..
```

> **注意**: `npm install` は初回 5–10 分。`.\mvnw.cmd compile` の初回は Maven 本体と依存をダウンロードするため 2–5 分。

---

## 2. Stage 1 — フロント単体（MSW モード）

**最も手軽**。ブラウザで完結。BE 不要。

### .env 確認

`frontend/.env.development` が以下になっていること（デフォルト）：

```
VITE_USE_MOCK=msw
VITE_API_BASE_URL=
```

### 起動

```powershell
cd frontend
npm run dev
```

ブラウザで `http://localhost:5173` を開く。

### 確認ポイント

| チェック項目 | 期待される結果 |
|-------------|--------------|
| ListView | 「ペン ¥200」「ノート ¥800」が表示 |
| DevTools の Network | `/api/items` が `(from ServiceWorker)` と表示、200 OK |
| 行をタップ | DetailView に遷移、商品情報が表示 |
| 削除ボタン | ListView に戻る（モックなので変化はない） |
| 「追加」→ 入力 → 登録 | ListView に戻る（同上） |
| PC をオフラインに | それでも動く（通信が外に出ていない証拠） |

### 停止

ターミナルで `Ctrl+C`。

---

## 3. Stage 2 — Prism モックサーバー追加

外部ツール（Postman / curl / Android 実機）から叩きたい時。

### .env 切替

`frontend/.env.development` を：

```
VITE_USE_MOCK=none
VITE_API_BASE_URL=http://localhost:4010
```

### 起動（2 ターミナル必要）

**ターミナル A: Prism**

```powershell
cd C:\Oracle\3df002\ionic-sample-orval
.\scripts\start-mock-prism.cmd
# → "[CLI] ... » listening on http://0.0.0.0:4010" が出る
```

> 初回は `npx` が Prism CLI（約 30 MB）をダウンロードするため 30 秒程度。

**ターミナル B: フロント**

```powershell
cd C:\Oracle\3df002\ionic-sample-orval\frontend
npm run dev
```

### 確認ポイント

別ターミナルから：

```powershell
curl.exe http://localhost:4010/api/items
# → [{"id":1,"name":"ペン","price":200},{"id":2,"name":"ノート","price":800}]

curl.exe http://localhost:4010/api/items/1
# → {"id":1,"name":"ペン","price":200}
```

ブラウザで `http://localhost:5173`：

| チェック項目 | 期待される結果 |
|-------------|--------------|
| ListView | Prism 経由で 2 件表示 |
| DevTools の Network | `localhost:4010` への通信が見える（ServiceWorker 経由ではない） |

### 停止

両ターミナルで `Ctrl+C`。

---

## 4. Stage 3 — Spring Boot バックエンド連携

実装を持つ実 BE と接続する。永続化（インメモリ）あり。

### .env 切替

`frontend/.env.development` を：

```
VITE_USE_MOCK=none
VITE_API_BASE_URL=http://localhost:8080
```

### 起動（2 ターミナル必要）

**ターミナル A: Spring Boot**

```powershell
cd C:\Oracle\3df002\ionic-sample-orval\backend
.\mvnw.cmd spring-boot:run
# → "Started SampleApplication in ... seconds" が出る
```

> 初回は依存ダウンロードで 2–5 分。2 回目以降は数秒。

**ターミナル B: フロント**

```powershell
cd C:\Oracle\3df002\ionic-sample-orval\frontend
npm run dev
```

### 確認ポイント

ブラウザで：

| URL | 期待される表示 |
|-----|-------------|
| `http://localhost:8080/swagger-ui.html` | Swagger UI が開き、4 つのエンドポイントが見える |
| `http://localhost:8080/api/items` | `[]`（空配列、インメモリ初期状態） |
| `http://localhost:8080/v3/api-docs` | OpenAPI JSON（自動生成） |
| `http://localhost:5173` | フロント。最初は ListView が空 |

操作確認：

| 操作 | 期待される結果 |
|-----|--------------|
| 「追加」→ name=テスト, price=100 → 登録 | ListView に「テスト ¥100」が増える |
| 行タップ → DetailView | id, name, price が表示 |
| 削除 | 一覧から消える |
| 別ターミナルで `curl http://localhost:8080/api/items` | 同じデータが JSON で返る |
| Spring Boot を再起動 | データがリセットされる（インメモリ仕様） |

### Springdoc と openapi.yaml の差分確認（任意）

```powershell
# 起動中の BE から取得
curl.exe -s http://localhost:8080/v3/api-docs > be-spec.json

# 開発した spec
type openapi/openapi.yaml
```

両者を比較し、構造が一致しているか目視確認。学習段階では `openapi.yaml` を真実とする。

### 停止

両ターミナルで `Ctrl+C`。

---

## 5. Stage 4 — Android 実機 / エミュレータ

Capacitor で WebView ラップして Android にインストール。

### 前提

- Android Studio がインストール済み
- Android SDK 33 がある
- 実機 USB デバッグ または エミュレータ Pixel/Android 13 などが用意済み

### .env

ブラウザではなく実機からアクセスするので、PC の IP を指定：

```powershell
ipconfig | findstr IPv4
# 例: 192.168.1.10
```

`frontend/.env.production` を以下に：

```
VITE_USE_MOCK=none
VITE_API_BASE_URL=http://192.168.1.10:8080   # PC の IP
```

> 実機からは `localhost` は実機自身を指すので、必ず PC の IP（同一 LAN）を指定する。

### ビルド + sync + 開く

```powershell
cd C:\Oracle\3df002\ionic-sample-orval\frontend
npm run build              # production ビルド (.env.production 適用)
npx cap sync android       # dist を android/app/src/main/assets にコピー
npx cap open android       # Android Studio を起動
```

### Android Studio 内での操作

1. Gradle sync を待つ（初回 5–10 分）
2. ツールバーの実機 / エミュレータを選択
3. 緑▶（Run）でアプリをデプロイ
4. アプリが起動

### 同時に起動するもの

PC 側で BE（または Prism）を起動しておく：

```powershell
# 別 PowerShell
cd C:\Oracle\3df002\ionic-sample-orval\backend
.\mvnw.cmd spring-boot:run
```

ファイアウォールで 8080 への外部アクセスを許可するダイアログが出たら「許可」。

### 確認ポイント

| チェック項目 | 期待される結果 |
|-------------|--------------|
| 実機 / エミュレータでアプリが起動 | 「Ionic Sample」のスプラッシュ→ ListView |
| ListView が空 or 既存データ | BE のインメモリ状態に依存 |
| 「追加」「削除」が動く | BE と双方向通信が成立 |

### MSW モードを Android で動かす場合の注意

Android WebView の **Service Worker サポートには制限**があり、MSW はそのままでは動かないケースが多い。
Android で動作確認する時は **Prism または実 BE モード（Stage 2 / 3）に切り替える**のが鉄則。

---

## 6. テスト実行

### フロント単体テスト

```powershell
cd C:\Oracle\3df002\ionic-sample-orval\frontend
npm run test:unit
```

> 現時点ではテストファイル未作成（`exit code 1` で「No test files found」と出ても問題なし）。
> 必要なら `src/__tests__/` 等にテストを追加していく。

### バックエンド単体テスト

```powershell
cd C:\Oracle\3df002\ionic-sample-orval\backend
.\mvnw.cmd test
```

期待される結果：`Tests run: 6, Failures: 0`（5 ItemService + 1 SmokeTest）

### バックエンド カバレッジ（任意）

`pom.xml` に jacoco を追加すれば取得可能。今は未設定。

---

## 7. 仕様変更時のフロー

`openapi/openapi.yaml` を編集したら：

```powershell
# フロント側を再生成
cd frontend
npm run gen
npm run build       # 型エラーが出たら views を追従

# バックエンド側を手で追従
cd ..\backend
# ItemController, ItemService, DTO を仕様に合わせて編集
.\mvnw.cmd test     # 既存テストが通ることを確認

# Prism は yaml を起動時に再読み込みするので、Prism を再起動すれば反映
```

詳細は [`orval-and-openapi-guide.md`](./orval-and-openapi-guide.md) §4「修正方法」を参照。

---

## 8. トラブルシュート（実際に踏みやすいやつ）

| 症状 | 原因 | 対処 |
|------|-----|------|
| ListView が空のまま | MSW 起動失敗 / Service Worker キャッシュ | DevTools > Application > Service Workers で「Update on reload」をON、リロード |
| `npm run gen` で関数名が違う | Orval 生成の tag 名がデフォルトと違う | `src/api/<tag>/<tag>.msw.ts` を開いて関数名確認、`src/mocks/handlers.ts` を合わせる |
| MSW のモック値が ランダム英単語 | `mock: true` 設定（直してあるはず） | `orval.config.ts` を `mock: { type: 'msw', useExamples: true }` に |
| BE 接続で CORS エラー | origin がリストに無い | `CorsConfig.java` の `allowedOrigins` に該当 URL を追加して再起動 |
| `.\mvnw.cmd` が動かない | Maven Wrapper の実行権限 | Windows なら `.\mvnw.cmd`、Git Bash なら `./mvnw` を使う |
| Spring Boot 起動で port 8080 衝突 | 他プロセスが占有 | `application.yml` の `server.port` を 8081 などに変更 |
| Prism がエラーで起動しない | Node.js のバージョン違い / 初回 npx ダウンロード失敗 | `npx -y @stoplight/prism-cli mock openapi/openapi.yaml --port 4010` を直接叩いてエラーを見る |
| Android: API 通信が失敗 | PC の IP が違う / firewall ブロック | `ipconfig` で IP 再確認、firewall で 8080 許可 |
| Android: MSW が反応しない | WebView の Service Worker 制限 | Stage 2 / 3 に切り替える |
| `npm run build` で型エラー | `openapi.yaml` 変更後の views 追従漏れ | エラーメッセージのファイル/行を直す |

---

## 9. API 仕様を HTML で見る

`openapi.yaml` を **画面付きの API リファレンス HTML** として閲覧する3つの方法。

### A. 静的 HTML を生成（BE 不要・オフライン可）

```powershell
.\scripts\build-api-docs.cmd
# → docs/api-reference.html が生成される（自己完結型 1 ファイル、59 KiB 程度）
start docs\api-reference.html
```

中身は **Redocly** が生成した綺麗な API リファレンス（左：エンドポイント一覧、右：型・example）。ブラウザで開けば BE もネットも不要で見られる。

> このファイルは `.gitignore` 済。**仕様を変えたら再生成**する：`scripts\build-api-docs.cmd` をもう一度叩くだけ。

### B. Springdoc Swagger UI（BE 起動時）

```powershell
cd backend
.\mvnw.cmd spring-boot:run
# → http://localhost:8080/swagger-ui.html
```

「Try it out」ボタンで実 API を叩ける。**ただし BE が動いていないと見えない**。

### C. VS Code 拡張で yaml プレビュー

拡張機能 `Swagger Viewer` (`Arjun.swagger-viewer`) をインストール → `openapi/openapi.yaml` を開いて `Shift+Alt+P`。

---

## 10. よく使うコマンド早見表

```powershell
# フロント
cd frontend
npm run dev               # 開発サーバー (5173)
npm run gen               # OpenAPI から再生成
npm run build             # 本番ビルド
npm run test:unit         # Vitest
npm run lint              # ESLint
npx cap sync android      # webDir を android にコピー
npx cap open android      # Android Studio を起動

# バックエンド
cd backend
.\mvnw.cmd compile        # コンパイルのみ
.\mvnw.cmd test           # テスト
.\mvnw.cmd spring-boot:run # 起動 (8080)
.\mvnw.cmd clean package  # JAR ビルド

# Prism
.\scripts\start-mock-prism.cmd   # 4010 でモックサーバー起動

# OpenAPI 検証
npx -y @apidevtools/swagger-cli validate openapi/openapi.yaml

# API 仕様を HTML で見る
.\scripts\build-api-docs.cmd     # docs/api-reference.html を生成
start docs\api-reference.html    # ブラウザで開く
```

---

## 11. ドキュメント一覧

| ファイル | 内容 |
|---------|------|
| [`README.md`](../README.md) | 全体の概要（最短のクイックスタート） |
| [`docs/roadmap.md`](./roadmap.md) | 段階的な製造ロードマップ（Stage 1/2/3） |
| [`docs/getting-started.md`](./getting-started.md) | このファイル。各 Stage の詳細起動手順 |
| [`docs/orval-and-openapi-guide.md`](./orval-and-openapi-guide.md) | Orval の仕組みと openapi.yaml 編集方法 |
| [`docs/architecture/`](./architecture/) | アーキ図（PlantUML 5 種） |
