# AAR ブリッジサンプル 成果物まとめ

- 作成日: 2026-05-13
- 担当: m-miyawaki / Claude (claude-opus-4-7)
- 関連: [`./aar-bridge-sample.md`](./aar-bridge-sample.md) / [`./superpowers/specs/2026-05-13-aar-bridge-sample-design.md`](./superpowers/specs/2026-05-13-aar-bridge-sample-design.md)

## なにを作ったか

非公開 Android SDK（AAR）を Ionic + Vue + Capacitor から呼び出すための「ブリッジ層」のサンプル実装。実 SDK は未到着なので、汎用ダミーの `DemoSdk` を別 Android Library モジュールとしてビルドし、本物の SDK と同様に `.aar` ファイル経由で app に組み込んでいる。

実 SDK が届いた時には、`app/libs/` の AAR を差し替えて Plugin の import を変えるだけで使えるよう、各層を疎結合に設計した。

## デモする 4 パターン

| パターン | 実装場所 | 動作 |
| -------- | -------- | ---- |
| 同期       | `getDeviceInfo()`、`echo()`     | 即時に値が返る                    |
| 非同期     | `performAction()`               | 約 800ms 後に結果が返る           |
| イベント   | `startCounter()` / `countChange` | 1秒ごとにイベントが発火           |
| エラー     | `triggerError()`                | code 付きエラーが画面に表示       |

## 成果物（ファイル）

### Android 側

| ファイル | 種別 | 役割 |
| -------- | ---- | ---- |
| `frontend/android/settings.gradle` | 変更 | `include ':demo-sdk'` 追加 |
| `frontend/android/build.gradle` | 変更 | Kotlin Gradle plugin 追加 |
| `frontend/android/variables.gradle` | 変更 | `kotlinVersion` / `androidxCoreKtxVersion` 追加 |
| `frontend/android/demo-sdk/build.gradle` | 新規 | Library Module 定義 + `copyAarToApp` タスク |
| `frontend/android/demo-sdk/src/main/AndroidManifest.xml` | 新規 | パッケージ宣言のみ |
| `frontend/android/demo-sdk/src/main/java/jp/co/example/demosdk/DemoSdk.kt` | 新規 | ダミー SDK 本体 |
| `frontend/android/demo-sdk/src/main/java/jp/co/example/demosdk/DemoSdkListener.kt` | 新規 | コールバック interface |
| `frontend/android/demo-sdk/src/main/java/jp/co/example/demosdk/DemoSdkException.kt` | 新規 | code 付き例外型 |
| `frontend/android/demo-sdk/src/test/java/jp/co/example/demosdk/DemoSdkTest.kt` | 新規 | JUnit テスト (8 ケース) |
| `frontend/android/app/build.gradle` | 変更 | Kotlin plugin + AAR 依存 + preBuild 連鎖 |
| `frontend/android/app/src/main/java/jp/co/example/sample/MainActivity.java` | 変更 | `registerPlugin(DemoSdkBridgePlugin.class)` |
| `frontend/android/app/src/main/java/jp/co/example/sample/bridge/DemoSdkBridgePlugin.kt` | 新規 | Capacitor Plugin |

### TypeScript / Vue 側

| ファイル | 種別 | 役割 |
| -------- | ---- | ---- |
| `frontend/src/native/demo-sdk-bridge/definitions.ts` | 新規 | TS インターフェース + イベント名定数 |
| `frontend/src/native/demo-sdk-bridge/index.ts` | 新規 | `registerPlugin` の実体 |
| `frontend/src/composables/useDemoSdk.ts` | 新規 | Vue 向け composable |
| `frontend/src/composables/__tests__/useDemoSdk.spec.ts` | 新規 | Vitest テスト (9 ケース) |
| `frontend/src/views/BridgeDemoView.vue` | 新規 | デモ画面 |
| `frontend/src/router/index.ts` | 変更 | `/bridge-demo` ルート追加 |
| `frontend/src/views/ListView.vue` | 変更 | ヘッダーに Bridge ボタン追加 |
| `frontend/tests/unit/example.spec.ts` | 削除 | 既に壊れていた scaffold テストを整理 |

### ドキュメント

| ファイル | 種別 | 役割 |
| -------- | ---- | ---- |
| `docs/aar-bridge-sample.md` | 新規 | 利用者向け解説 |
| `docs/superpowers/specs/2026-05-13-aar-bridge-sample-design.md` | 新規 | 設計書 |
| `docs/aar-bridge-sample-deliverables.md` | 新規 | このまとめ |
| `docs/vuetify-vs-ionic-vue.md` | 新規 | （前会話の検討メモ。AAR ブリッジとは無関係） |

## 検証結果

| 項目                                    | 結果 |
| --------------------------------------- | ---- |
| `npx vue-tsc --noEmit`                  | パス |
| `npx eslint . --max-warnings=0`         | パス |
| `npx vitest run` (9 tests)              | パス |
| `npm run build` (vite production build) | パス |
| `./gradlew :demo-sdk:test` (8 tests)    | パス |
| `./gradlew :demo-sdk:copyAarToApp`      | パス（6.5KB AAR が `app/libs/` に配置） |
| `./gradlew :app:assembleDebug`          | パス |
| 実機 / エミュレータでの動作確認         | 未実施（環境次第のため、ユーザ実機で確認をお願いします） |

## ビルド・実行手順

```powershell
cd frontend\android
.\gradlew :demo-sdk:copyAarToApp        # 初回 / AAR 更新時

cd ..
npm run build
npx cap sync android
npx cap run android                      # 実機/エミュレータ起動
```

通常ビルド時は `preBuild` が `:demo-sdk:copyAarToApp` に依存しているため、自動で AAR が生成されます。

## 次のアクション候補

- **(a) 実機での動作確認** — Bridge Demo 画面で 6 ボタンを順に試す
- **(b) 実 SDK 受領時の差し替え練習** — [aar-bridge-sample.md §5](./aar-bridge-sample.md) の手順
- **(c) Web 開発時のモック対応** — `frontend/src/native/demo-sdk-bridge/web.ts` を追加し、`registerPlugin` の第 2 引数で Web 実装を渡す
- **(d) iOS 対応** — `frontend/ios/` を `npx cap add ios` し、同等の Swift Plugin を実装

## 設計判断の経緯

ブレストでの主要な選択肢と決定理由：

| 観点                | 候補                                              | 選んだ理由 |
| ------------------- | ------------------------------------------------- | ---------- |
| SDK フェイク方法    | (A) 別 AS モジュール / (B) appに直書き / (C) OS API | (A): 本物の SDK 受領フローと同じになる |
| デモするパターン    | フルセット / 同期+非同期のみ / フルセット+Webモック | フルセット: 実 SDK 仕様が未確定なので、参照範囲を広く取る |
| UI 配置             | 専用ページ / 既存画面組込 / UI 無し                | 専用ページ: 影響範囲が狭く、後で削除も簡単 |
| ダミー SDK ドメイン | 汎用 / スキャナ / プリンタ                         | 汎用: 業務色が出ず「ブリッジの型見本」として明確 |
| AAR 連携方式        | (A) project 直接依存 / (B) 完全別プロジェクト / (C) 同一プロジェクトで AAR 経由 | (C): ワンコマンドビルド + AAR 経由の練習を両立 |

詳細は設計書 §2 / §3 を参照。

## 既知の注意点

- **JVM target**: Capacitor の `capacitor.build.gradle`（自動生成）が Java 17 を指定するため、demo-sdk / app の Kotlin も `jvmTarget = '17'` で揃えてある。Capacitor を更新して `capacitor.build.gradle` の Java バージョンが変わったら、対応して `jvmTarget` も合わせる必要がある
- **`docs/vuetify-vs-ionic-vue.md`** は本タスクの直前にユーザ要望で作成した別件メモ。AAR ブリッジとは無関係なので、不要なら別途削除可
- **`docs/superpowers/specs/`** ディレクトリは Brainstorming スキルの規約で作られた設計書置き場。今後別の設計書もここに溜まる想定
