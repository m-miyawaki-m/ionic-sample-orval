# AAR Bridge サンプル 設計書

- 作成日: 2026-05-13
- 対象: `frontend/` (Ionic Vue 8 + Capacitor 5.7.8 + Android)
- 目的: 非公開 Android SDK（AAR）が将来届くことを想定し、画面から SDK を呼び出すための「ブリッジ」のサンプル実装を作る。実SDK到着時はダミーAARを差し替えるだけでよい構造にする。

## 1. 背景と動機

`frontend/` は Ionic Vue + Capacitor で構成されたモバイル PoC。今後、業務端末向けの非公開 SDK が AAR 形式で配布される見込みだが、SDK 仕様が確定しておらず、Web からネイティブを呼ぶ「橋渡し」の構造だけを先に確立しておきたい。

このサンプルは：
- 汎用 DemoSdk を AAR としてビルドする
- Capacitor Custom Plugin で SDK を Vue から呼べるようにする
- 同期 / 非同期 / イベント / エラー の代表 4 パターンをデモする
- ドキュメントとして「実 SDK が届いた時の差し替え手順」を残す

## 2. アーキテクチャ

### レイヤー構成

```
┌─────────────────────────────────────────────┐
│ [4] BridgeDemoView.vue                       │ ← 画面層
├─────────────────────────────────────────────┤
│ [3] composables/useDemoSdk.ts                │ ← Vue向け層
├─────────────────────────────────────────────┤
│ [2] native/demo-sdk-bridge/                  │ ← ブリッジ層 (TS)
├─────────────────────────────────────────────┤
│ [1a] DemoSdkBridgePlugin.kt                  │ ← ブリッジ層 (Android)
├─────────────────────────────────────────────┤
│ [1b] demo-sdk.aar  (jp.co.example.demosdk)   │ ← ダミーSDK
└─────────────────────────────────────────────┘
```

| 層      | 責務                                        |
| ------- | ------------------------------------------- |
| [4]     | ボタン配置・SDK 結果の表示                  |
| [3]     | Vue の reactive 化、listener 登録/解除      |
| [2]     | Plugin proxy、TS 型、event 名定数の定義     |
| [1a]    | `PluginCall` ↔ DemoSdk 引数/戻り値変換      |
| [1b]    | フェイクな「業務処理」を担う                |

**分離のうれしさ**: 実 SDK 到着時は [1b] の AAR を差し替え、[1a] の import を変えるだけで済む。

### AAR モジュール構成方針（採用: 案 C）

`frontend/android/demo-sdk/` を Library Module として配置し、`assembleRelease` で `.aar` を出力 → Gradle タスクが `app/libs/` に自動コピー → app は `files('libs/demo-sdk-release.aar')` 経由で参照する。

- ワンコマンドビルド完結
- app 側コードは **AAR ファイル経由でしか SDK を使わない**ため、実 SDK 受領時の差し替え練習として有効

却下した案:
- 案 A（`project(':demo-sdk')` 直接依存）: AAR ファイル経由の練習にならない
- 案 B（完全に別プロジェクト）: 更新サイクルが遅く学習コストが高い

## 3. ファイル構成

```
ionic-sample-orval/
├─ frontend/
│  ├─ android/
│  │  ├─ build.gradle                           ← Kotlin classpath を追加
│  │  ├─ settings.gradle                        ← include ':demo-sdk' を追加
│  │  ├─ variables.gradle                       ← kotlinVersion を追加
│  │  ├─ demo-sdk/                              ★ 新規モジュール
│  │  │  ├─ build.gradle
│  │  │  └─ src/
│  │  │     ├─ main/
│  │  │     │  ├─ AndroidManifest.xml
│  │  │     │  └─ java/jp/co/example/demosdk/
│  │  │     │     ├─ DemoSdk.kt
│  │  │     │     ├─ DemoSdkListener.kt
│  │  │     │     └─ DemoSdkException.kt
│  │  │     └─ test/java/jp/co/example/demosdk/
│  │  │        └─ DemoSdkTest.kt
│  │  └─ app/
│  │     ├─ build.gradle                        ← Kotlin プラグイン + AAR 依存
│  │     ├─ libs/demo-sdk-release.aar           ← copyAarToApp で出力
│  │     └─ src/main/java/jp/co/example/sample/
│  │        ├─ MainActivity.java                ← registerPlugin 追加
│  │        └─ bridge/
│  │           └─ DemoSdkBridgePlugin.kt
│  ├─ src/
│  │  ├─ native/demo-sdk-bridge/
│  │  │  ├─ definitions.ts
│  │  │  └─ index.ts
│  │  ├─ composables/useDemoSdk.ts
│  │  ├─ views/BridgeDemoView.vue
│  │  └─ router/index.ts                        ← /bridge-demo 追加
│  └─ src/__tests__/
│     └─ useDemoSdk.spec.ts
└─ docs/
   └─ aar-bridge-sample.md                      ← 利用者向け解説
```

**動線**: 既存 ListView 画面に「Bridge Demo」へのナビゲーションボタンを追加する（App.vue を Tabs にリストラクトする案はリスクが大きいため割愛）。

## 4. データフロー

### (a) 同期的な値取得: `getDeviceInfo()`

```
View → useDemoSdk.getDeviceInfo()
     → DemoSdkBridge.getDeviceInfo()              [TS Plugin Proxy]
     → DemoSdkBridgePlugin.getDeviceInfo(call)    [Android Plugin, メインスレッド]
     → DemoSdk.getDeviceInfo()                    [AAR、同期]
     → call.resolve(JSObject)
```

Capacitor は常に Promise なので、SDK が同期でも Web 側からは `await`。

### (b) 非同期処理: `performAction(input)`

```
View → useDemoSdk.performAction(input)
     → DemoSdkBridge.performAction({input})
     → DemoSdkBridgePlugin.performAction(call)    [ワーカースレッドで実行]
     → DemoSdk.performAction(s)                   [Thread.sleep(800); return s.uppercase()]
     → call.resolve(JSObject().put("output", out))
```

重処理はワーカースレッドで。`call.resolve()` はメインスレッドである必要なし。

### (c) イベント購読: `startCounter()` → `countChange`

```
View (onMounted) → useDemoSdk.startCounter()
       → addListener('countChange', cb)           [PluginListenerHandle 取得]
       → DemoSdkBridge.startCounter({intervalMs})
       → DemoSdkBridgePlugin.startCounter(call)
       → DemoSdk.setListener(...) + startCounter()  [Timer で 1 秒ごと]
       → DemoSdkListener.onCountChange(v)
       → Plugin: notifyListeners('countChange', {value:v})

View (onUnmounted) → stopCounter() → handle.remove()
```

- SDK は **コールバック interface** を渡す形（実 SDK によくある）
- Plugin が `notifyListeners` に変換 → JS 側に届く
- TS 側は `onUnmounted` で必ず `remove()`

### (d) エラー処理: `triggerError()`

```
DemoSdk.triggerError() throws DemoSdkException(code, message)
   → Plugin: catch → call.reject(message, code)
   → TS: throw with .code property
   → useDemoSdk: lastError.value = { code, message }
   → View: v-if で表示
```

## 5. インターフェース定義

### Android: DemoSdk (AAR)

```kotlin
object DemoSdk {
    fun init(apiKey: String): Boolean
    fun getDeviceInfo(): DeviceInfo
    fun echo(text: String): String
    fun performAction(input: String): String
    fun setListener(listener: DemoSdkListener?)
    fun startCounter(intervalMs: Long)
    fun stopCounter()
    fun triggerError()
}

interface DemoSdkListener {
    fun onCountChange(value: Int)
}

data class DeviceInfo(val model: String, val sdkVersion: String)

class DemoSdkException(val code: String, message: String) : RuntimeException(message)
```

### Android: DemoSdkBridgePlugin

```kotlin
@CapacitorPlugin(name = "DemoSdkBridge")
class DemoSdkBridgePlugin : Plugin() {
    @PluginMethod fun init(call: PluginCall)
    @PluginMethod fun getDeviceInfo(call: PluginCall)
    @PluginMethod fun echo(call: PluginCall)
    @PluginMethod fun performAction(call: PluginCall)
    @PluginMethod fun startCounter(call: PluginCall)
    @PluginMethod fun stopCounter(call: PluginCall)
    @PluginMethod fun triggerError(call: PluginCall)
}
```

### TypeScript: DemoSdkBridgePlugin

```ts
export interface DemoSdkBridgePlugin {
  init(options: { apiKey: string }): Promise<{ ok: boolean }>
  getDeviceInfo(): Promise<DeviceInfo>
  echo(options: { text: string }): Promise<{ text: string }>
  performAction(options: { input: string }): Promise<{ output: string }>
  startCounter(options: { intervalMs: number }): Promise<void>
  stopCounter(): Promise<void>
  triggerError(): Promise<void>

  addListener(
    eventName: 'countChange',
    listener: (ev: CountChangeEvent) => void,
  ): Promise<PluginListenerHandle>
  removeAllListeners(): Promise<void>
}
```

### Vue: useDemoSdk

`reactive な count / lastError / initialized` + 各メソッドのラッパ。`onUnmounted` で listener cleanup を担保。

## 6. エラー・イベント・初期化方針

| 項目         | 方針                                                      |
| ------------ | --------------------------------------------------------- |
| エラー       | SDK 例外 → Plugin で `reject(message, code)` → TS 側 `.code` プロパティとして利用 |
| 未知の例外   | Plugin 層で `E_UNKNOWN` に統一                            |
| イベント名   | TS 側で定数化（`DEMO_SDK_EVENTS.countChange`）            |
| 初期化       | 明示的 `init()` 呼び出し（自動初期化はしない）            |
| 初期化前呼び出し | DemoSdk 側で `E_NOT_INIT` を投げる                    |

## 7. ビルド・運用フロー

### 初回 / SDK更新時

```powershell
cd frontend/android
./gradlew :demo-sdk:copyAarToApp        # AAR を生成し app/libs/ に配置
```

### 通常ビルド

```powershell
cd frontend
npm run build
npx cap sync android
npx cap run android
```

### 実 SDK 到着時の差し替え手順（最重要）

1. ベンダーから受領した `real-sdk.aar` を `frontend/android/app/libs/` に配置
2. `frontend/android/app/build.gradle` の `implementation files('libs/demo-sdk-release.aar')` を `implementation files('libs/real-sdk.aar')` に変更
3. `DemoSdkBridgePlugin.kt` の import を実 SDK のパッケージに変更
4. メソッドシグネチャ差分を吸収（このサンプルの抽象が実 SDK にどこまで使えるかチェック）
5. `frontend/android/demo-sdk/` モジュールは不要なら削除可（または参考実装として残す）

## 8. テスト方針

| 対象                    | 手段                       |
| ----------------------- | -------------------------- |
| `DemoSdk.kt`            | JUnit (`demo-sdk` モジュール内) |
| `DemoSdkBridgePlugin.kt` | （Capacitor テストハーネス必要のため手動 E2E のみ） |
| `useDemoSdk.ts`         | Vitest + Bridge モック     |
| `BridgeDemoView.vue`    | 手動確認                   |

## 9. 想定リスクと対処

| リスク                                     | 対処                                                     |
| ------------------------------------------ | -------------------------------------------------------- |
| Kotlin バージョン衝突                      | `variables.gradle` の `kotlinVersion` を共通参照         |
| AAR を更新したのに古いまま動く             | `./gradlew clean :demo-sdk:copyAarToApp` + `cap sync`    |
| Plugin 名 typo                             | TS 側で `PLUGIN_NAME` 定数化                             |
| `notifyListeners` のスレッド               | `activity.runOnUiThread { ... }` でラップ                |
| R8 で SDK クラスが剥がされる               | `proguard-rules.pro` に `-keep class jp.co.example.demosdk.** { *; }` |

## 10. 受け入れ条件

- [ ] `./gradlew :demo-sdk:assembleRelease` で AAR が生成
- [ ] AAR が `app/libs/` に自動配置
- [ ] `npx cap run android` でインストール可能
- [ ] Bridge Demo 画面で全 6 機能が動作（init / getDeviceInfo / echo / performAction / startCounter / triggerError）
- [ ] 画面離脱でリスナー remove
- [ ] `npm run test:unit` パス
- [ ] `docs/aar-bridge-sample.md` に AAR 差し替え手順記載

## 11. このサンプルの「サンプルでないところ」

実 SDK では以下が異なる可能性：

- 実 SDK は `object` シングルトンとは限らない（Builder / Factory が一般的）
- JNI ネイティブの場合は ABI 設定（`x86_64` / `arm64-v8a`）が追加で必要
- 本番 AAR は Maven リポジトリ配布の可能性（その場合は `files(...)` ではなく Maven 依存）
- ライセンスキー検証がオンライン → init() がネットワーク呼び出しを伴う場合あり

## 12. 実装順序

1. DemoSdk (AAR) 単体実装 + JUnit
2. `copyAarToApp` Gradle タスク追加
3. app/build.gradle に AAR 依存 + Kotlin プラグイン追加
4. `DemoSdkBridgePlugin.kt` + MainActivity 登録
5. `definitions.ts` / `index.ts`
6. `useDemoSdk.ts` + Vitest
7. `BridgeDemoView.vue` + ルート + ListView からの動線
8. `docs/aar-bridge-sample.md` 執筆
