# ionic-sample-orval

Ionic Vue + Capacitor + Spring Boot を OpenAPI（Spec-First）で繋ぐ学習プロジェクト。

## 構成

- `openapi/openapi.yaml` — 共通契約（Single Source of Truth）
- `frontend/` — Ionic Vue 8 + Capacitor 5 + Orval + MSW
- `backend/` — Spring Boot 3.x + Maven + Springdoc

## クイックスタート

詳細は実装後に各サブディレクトリの README を参照。

| 用途 | コマンド |
|------|---------|
| FE のみ（MSW） | `cd frontend && npm run dev` |
| BE のみ | `cd backend && mvn spring-boot:run` |
| Prism モック | `scripts\start-mock-prism.cmd` |
