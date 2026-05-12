# AAR ブリッジサンプル ガイド

Capacitor + Vue + Android 構成で、Android SDK（AAR）を画面から呼び出すためのブリッジサンプルです。実 SDK が手元になくても動作確認できるよう、ダミーの「DemoSdk」AAR を同梱しています。

---

## 1. このサンプルの構成

```
┌────────────────────────────────────────────┐
│ BridgeDemoView.vue   (画面)                 │
├────────────────────────────────────────────┤
│ useDemoSdk.ts        (Vue 向け composable)  │
├────────────────────────────────────────────┤
│ demo-sdk-bridge/     (TS ブリッジ)          │
├────────────────────────────────────────────┤
│ DemoSdkBridgePlugin.kt  (Android ブリッジ)  │
├────────────────────────────────────────────┤
│ demo-sdk.aar         (フェイク SDK)         │
└────────────────────────────────────────────┘
```

各層の役割と詳細な設計判断は `docs/superpowers/specs/2026-05-13-aar-bridge-sample-design.md` を参照してください。

## 2. ファイルの場所

| 関心事 | パス |
|---|---|
| ダミー SDK（AAR ソース） | `frontend/android/demo-sdk/` |
| Capacitor Plugin（Android 側ブリッジ） | `frontend/android/app/src/main/java/jp/co/example/sample/bridge/DemoSdkBridgePlugin.kt` |
| Plugin 登録 | `frontend/android/app/src/main/java/jp/co/example/sample/MainActivity.java` |
| TS ブリッジ層 | `frontend/src/native/demo-sdk-bridge/` |
| Vue Composable | `frontend/src/composables/useDemoSdk.ts` |
| デモ画面 | `frontend/src/views/BridgeDemoView.vue` |
| Vitest | `frontend/src/composables/__tests__/useDemoSdk.spec.ts` |

## 3. 動かし方

### 前提

- Android SDK 33 / JDK 17
- `frontend/` で `npm install` 済み

### ビルドと起動

```powershell
cd frontend

# 1) ダミー AAR を生成して app/libs/ に配置
cd android
./gradlew :demo-sdk:copyAarToApp
cd ..

# 2) Web ビルド + Android 同期 + 実機起動
npm run build
npx cap sync android
npx cap run android
```

**ポイント**: `npx cap run android` 内部の `assembleDebug` には `preBuild` の依存として `:demo-sdk:copyAarToApp` がつながっているので、初回でも自動的に AAR が生成されます。手動の手順は SDK 単体を更新したい時のためのものです。

### デモ画面を開く

アプリ起動後、トップの商品一覧の右上にある **「Bridge」** ボタンから `/bridge-demo` に遷移します。

カードが 5 つあり、上から順に試せます：

1. **init** — `apiKey` を入れて初期化（空文字だと `E_INVALID_KEY` でエラー）
2. **sync** — `getDeviceInfo()`、`echo()`
3. **async** — `performAction()`（約 800ms のディレイ後に大文字化された結果が返る）
4. **events** — `startCounter()` で 1 秒ごとに `count` が増える、`stopCounter()` で停止
5. **error** — `triggerError()` で意図的にエラー（画面下の `lastError` カードに表示）

## 4. SDK 連携の仕組み（4 レイヤー）

### (a) 同期呼び出し

```
View ── useDemoSdk.getDeviceInfo()
     ── DemoSdkBridge.getDeviceInfo()        [TS Plugin Proxy]
     ── Capacitor JSON Bridge
     ── DemoSdkBridgePlugin.getDeviceInfo(call)   [Android]
     ── DemoSdk.getDeviceInfo()                   [AAR]
     ── call.resolve(JSObject)
```

Capacitor 経由なので Web 側は **常に async**（Promise）。

### (b) 非同期呼び出し

Android 側 Plugin が **ワーカースレッドで SDK を呼ぶ** → 結果を `call.resolve()`。`DemoSdkBridgePlugin.performAction()` を参照。

### (c) イベント購読

```
Android: DemoSdk.setListener {
           override fun onCountChange(v) =
             notifyListeners("countChange", { value: v })
         }
TS:      DemoSdkBridge.addListener("countChange", cb)  → handle
         onUnmounted: handle.remove()
```

`useDemoSdk` が `onUnmounted` で `remove()` するため、画面離脱時のリーク無し。

### (d) エラー伝搬

| 層 | 表現 |
|---|---|
| DemoSdk | `throw DemoSdkException(code, message)` |
| Plugin | `call.reject(message, code)` |
| TS | `throw` (e に `.code` が乗る) |
| Composable | `lastError.value = { code, message }` に正規化 |
| View | `v-if="lastError"` で表示 |

## 5. 実 SDK を受け取った時の差し替え手順

このサンプルの一番の目的です。実 SDK 提供時には以下を実施します。

### Step 1. AAR 配置

```
frontend/android/app/libs/
  ├ demo-sdk-release.aar   ← 削除（または残す）
  └ real-sdk.aar           ← ベンダーから受領した AAR を配置
```

### Step 2. app の依存差し替え

`frontend/android/app/build.gradle`

```diff
- implementation files('libs/demo-sdk-release.aar')
+ implementation files('libs/real-sdk.aar')
```

### Step 3. Plugin の import 変更

`DemoSdkBridgePlugin.kt` を実 SDK のパッケージ名に向けます。

```diff
- import jp.co.example.demosdk.DemoSdk
- import jp.co.example.demosdk.DemoSdkException
- import jp.co.example.demosdk.DemoSdkListener
+ import com.vendor.realsdk.RealSdk
+ import com.vendor.realsdk.RealSdkException
+ import com.vendor.realsdk.RealSdkListener
```

メソッド名・引数差分を埋めます。**Plugin の public API（@PluginMethod のシグネチャ）を変えなければ、TS 側は何も変えなくてよい**のがこの構造の利点です。

### Step 4. 不要モジュールの整理

- `frontend/android/demo-sdk/` モジュールは削除可（または参考実装として残す）
- 削除する場合は `settings.gradle` の `include ':demo-sdk'` も外し、`app/build.gradle` 末尾の `:demo-sdk:copyAarToApp` 依存も外す

### Step 5. TS 側の API 形状再検討（必要なら）

実 SDK のメソッド名が大きく違う場合、`definitions.ts` の interface とイベント名定数を変更します。`useDemoSdk` も用語を合わせて改名（例: `useDemoSdk` → `useScannerSdk` など）。

## 6. ビルドコマンドまとめ

| やりたいこと | コマンド |
|---|---|
| AAR を生成して app/libs/ に配置 | `./gradlew :demo-sdk:copyAarToApp` |
| Vue 側ユニットテスト | `npm run test:unit` |
| AAR モジュール単体テスト | `./gradlew :demo-sdk:test` |
| TypeScript 型チェック | `npx vue-tsc --noEmit` |
| デバッグビルド + 実機 | `npx cap run android` |
| 完全リビルド | `./gradlew clean && ./gradlew :demo-sdk:copyAarToApp` |

## 7. トラブルシュート

### AAR を更新したのに古いまま動く

```powershell
cd frontend/android
./gradlew clean :demo-sdk:copyAarToApp
cd ..
npx cap sync android
```

`cap sync` でネイティブ層に変更が伝わります。

### `Cannot find class DemoSdkBridge`（実機ログ）

- `MainActivity.java` の `registerPlugin(DemoSdkBridgePlugin.class)` が呼ばれているか確認
- TS 側 `registerPlugin('DemoSdkBridge')` と Android 側 `@CapacitorPlugin(name = "DemoSdkBridge")` の名前を見比べる
- 名前は `definitions.ts` の `PLUGIN_NAME` 定数で揃えているので、ここから両側にコピペすべき

### Kotlin バージョン衝突

`frontend/android/variables.gradle` の `kotlinVersion` を変更し、全モジュールが同じバージョンを参照しているか確認。

### `notifyListeners` でクラッシュする

Plugin 側で UI スレッドが必要な場合は次のようにラップします。

```kotlin
activity?.runOnUiThread {
    notifyListeners("countChange", data)
}
```

DemoSdk の counter は Timer の TimerTask 経由なので非 UI スレッドで届きますが、Capacitor の `notifyListeners` 自体はスレッドセーフです。

### R8 / ProGuard で SDK クラスが剥がされる（リリースビルド時のみ）

`frontend/android/app/proguard-rules.pro` に追加：

```
-keep class jp.co.example.demosdk.** { *; }
-keep class com.vendor.realsdk.** { *; }
```

## 8. このサンプルの「サンプルでないところ」

実 SDK では以下が違う可能性があります。

- **シングルトンとは限らない**: 実 SDK は `Builder` / `Factory` 経由で取得することが多い
- **JNI ネイティブ**: `x86_64` / `arm64-v8a` の ABI 設定が追加で必要になる
- **Maven 配布**: `implementation files(...)` ではなく `implementation 'group:artifact:version'`
- **初期化がネットワーク**: ライセンスキー検証がオンラインの場合、`init()` は非同期前提の API 設計に
- **権限要求**: SDK が Camera / Bluetooth / Location などを使うなら、`AndroidManifest.xml` への追加と Capacitor の Permissions Plugin が必要

実 SDK の仕様書を受け取ったら、まずこの 5 点をチェックリストとして照合してください。

## 9. 参考リンク

- [Capacitor Plugin Guide (公式)](https://capacitorjs.com/docs/plugins/creating-plugins) — Custom Plugin の作り方
- 設計書: [`docs/superpowers/specs/2026-05-13-aar-bridge-sample-design.md`](./superpowers/specs/2026-05-13-aar-bridge-sample-design.md)
- 関連: [`docs/architecture/`](./architecture/) — レイヤード構成の全体観
