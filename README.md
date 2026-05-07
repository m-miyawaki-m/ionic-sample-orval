# ionic-sample-orval

Ionic Vue 8 + Capacitor 5 + Spring Boot 3 を OpenAPI（Spec-First）で繋ぐ学習プロジェクト。

## 構成

- `openapi/openapi.yaml` — 共通契約（Single Source of Truth）
- `frontend/` — Ionic Vue 8 / Capacitor 5.7 / Vite 5 / Orval / MSW
- `backend/` — Spring Boot 3.5 / JDK17 / Maven / Springdoc 2.6
- `scripts/` — Prism モックサーバー起動スクリプト

## 前提環境

- Node.js v24.x / npm 11.x
- JDK 17（`JAVA_HOME` 設定済）
- Android SDK 33（Android Studio または `ANDROID_HOME` 設定）

## クイックスタート

### A. フロントだけサクッと（MSW モード）

```powershell
cd frontend
npm install
npm run gen        # OpenAPI から型・クライアント・MSW handlers を生成
npm run dev
```

ブラウザ `http://localhost:5173`。`/api/*` は Service Worker で完結。

### B. バックエンドも繋ぐ（実 BE モード）

ターミナル A:

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

ターミナル B:

```powershell
cd frontend
# .env.development を編集:
#   VITE_USE_MOCK=none
#   VITE_API_BASE_URL=http://localhost:8080
npm run dev
```

Swagger UI: `http://localhost:8080/swagger-ui.html`

### C. Prism モックサーバー（外部ツールから叩く / 実機検証）

```powershell
.\scripts\start-mock-prism.cmd
# → http://localhost:4010 で待受
```

### D. Android 実機 / エミュレータ

```powershell
cd frontend
npm run build
npx cap sync android
npx cap open android
# Android Studio で Run
```

## OpenAPI 仕様の編集フロー

1. `openapi/openapi.yaml` を編集
2. `cd frontend && npm run gen`（型・クライアント・MSW を再生成）
3. `cd backend` で controller を仕様に追従させる（Spec-First）
4. BE 起動後、`http://localhost:8080/v3/api-docs` と yaml の差分を確認

## トラブルシューティング

| 症状 | 対処 |
|------|------|
| `npm run gen` で生成関数名が違う | `src/api/default/default.msw.ts` を開いて関数名を確認、`src/mocks/handlers.ts` を合わせる |
| MSW が反応しない | DevTools の Application > Service Workers でステータス確認、必要なら Update on reload を有効化 |
| Android で API 通信が失敗 | MSW は WebView で制限あり。Prism + PC IP 指定で代替 |
| Swagger UI が 404 | `application.yml` の `springdoc.swagger-ui.path` を確認 |
| BE 接続で CORS エラー | `CorsConfig.java` の origin リストに該当 URL を追加 |

## ライセンス / 用途

学習用。社外公開用途は想定せず。
