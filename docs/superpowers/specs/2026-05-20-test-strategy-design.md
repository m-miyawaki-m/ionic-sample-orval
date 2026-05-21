# テスト戦略 設計書（フロント中心 + Android SDK）

- 日付: 2026-05-20
- 対象リポジトリ: `ionic-sample-orval`
- 主目的: **学習用テストパターン集**として、設計書とテストデータを自動連係させつつ、VSCode で完結する実行・デバッグ環境とエビデンス取得方針を確立する
- 非目的: カバレッジ網羅、本番運用品質保証、BE 側の包括的テスト整備

---

## 1. 採用スタック（決定表）

| 軸 | 採用 | 比較サンプル（学習目的で 1 本残す） | 不採用（比較表のみ） |
|---|---|---|---|
| 1. ランナー | **Vitest** | — | Jest |
| 2. コンポーネント API | **@vue/test-utils** | Testing Library で同一テスト 1 本 | — |
| 3. DOM 環境 | **jsdom** | — | happy-dom（ベンチ表に数値だけ残す） |
| 4. HTTP モック | **MSW**（既存） | — | nock / axios-mock-adapter |
| 5. E2E | **Cypress** | Playwright で同一シナリオ 1 本 | WebdriverIO |
| 6. ブリッジモック | **`vi.mock` パターン**（既存）| Capacitor 公式 mock パターン 1 本 | — |
| 7. Android SDK ランナー | **Gradle wrapper（JVM unit）** + **Espresso（instrumented）1 ケース** | — | — |
| 8. エビデンス | Vitest HTML / Cypress 標準スクショ+HTML / Gradle HTML / Espresso screenrecord | — | 動画フル録画は省略 |
| 9. 設計書連係（API） | **OpenAPI `examples` 拡張** | — | YAML/JSON データシート |
| 10. 設計書連係（UI/SDK 動作） | **Markdown 決定表 → `it.each`** | — | Gherkin（比較表に残す） |
| 11. 雛形生成 | **plop**（テスト雛形 + 設計書リーダー） | — | hygen |

**比較サンプルの位置づけ**: 採用品と並べて `frontend/__samples__/comparison/` に置く。読み手は「同じテストが採用フレームでどう書けるか／比較フレームでどう書けるか」を 1 ペアで比較できる。CI で実行するかは §6.4 Open Items #4 で別途判断。

### 1.1 不採用候補の評価メモ

| 候補 | 不採用の理由 |
|---|---|
| Jest | Vite ベースの Vitest と機能差が小さく、設定が二重化する |
| happy-dom | 速度メリットはあるが、Ionic / Vue 描画の検証で jsdom より不安定なケースがある |
| WebdriverIO | E2E は Cypress + Playwright 比較で十分。学習サンプルとしての差別化が薄い |
| Gherkin (.feature) | step 実装が別ファイルになるため、Markdown 決定表のほうがテストとの距離が近い |
| 独立 YAML/JSON データシート | OpenAPI と二重管理になり仕様とずれるリスクが高い |

---

## 2. テストレイヤー設計

### 2.1 レイヤーピラミッド

```
              ┌─────────────────────────────┐
       数少   │  E2E (Cypress) — 主要動線    │  実ブラウザ + MSW
              │   List→Detail→Create→Delete   │   + BridgeDemo（モックブリッジ）
              ├─────────────────────────────┤
              │ Component (VTU + jsdom)       │  View 単体・Ionic 描画
              │   ListView / BridgeDemoView   │   + MSW 直接呼び出し
              ├─────────────────────────────┤
              │ Composable (Vitest + vi.mock) │  反応性・ロジック・エラー処理
              │   useDemoSdk 系               │
       数多   ├─────────────────────────────┤
              │ Android Unit (Gradle/JUnit)   │  AAR 内ロジック
              ├─────────────────────────────┤
              │ Android Instrumented (1 ケース)│  実機/エミュ必須
              │   Espresso でブリッジ往復確認  │
              └─────────────────────────────┘
```

### 2.2 各層の責務

| 層 | 主責務 | データ源 | モック対象 | 1 テストの粒度 |
|---|---|---|---|---|
| Composable | 状態遷移・エラー写像・購読解除 | Markdown 決定表（`it.each`） | `@/native/...` を `vi.mock` | 1 シナリオ/it |
| Component (View) | テンプレート描画・v-model・イベント | OpenAPI examples（fixtures 経由） | API は MSW、ブリッジは `vi.mock` | 1 画面 1 spec |
| Cypress E2E | 画面間遷移と主要動線 | OpenAPI examples（fixtures 経由） | API は MSW（dev サーバ）、ブリッジは `cy.stub` | 1 動線 1 spec |
| Android JVM Unit | AAR 内 Java/Kotlin ロジック | Markdown 決定表（`@MethodSource`） | 純 JUnit、外部依存なし | 1 メソッド/振る舞い |
| Android Instrumented | プラグイン経由のブリッジ往復が実機で通る | 1 シナリオ手書き | なし（実 SDK） | サンプル 1 本のみ |

### 2.3 共通ルール

- 検証は **Arrange / Act / Assert** を 3 ブロックコメントで明示する（学習用なので可読性優先）
- 各層に「**失敗時の挙動が見えるサンプル**」を 1 本ずつ含める
- **比較サンプル**は採用品と同じシナリオを書き、隣に並べて差分を読めるようにする

### 2.4 Capacitor ブリッジのモック戦略

| 層 | 推奨パターン | 理由 |
|---|---|---|
| Composable | `vi.mock('@/native/demo-sdk-bridge')` | 既存 `useDemoSdk.spec.ts` と同じ。学習導線が短い |
| Component | 同上 + Ionic レンダリングは jsdom で確認 | UI が反応するかを薄く検証 |
| Cypress | `cy.stub(window, 'Capacitor')` 相当 / Capacitor Web fallback | dev サーバ実行モードでブリッジ呼び出しを差し替え |
| 比較サンプル | Capacitor 公式 mock パターン（`@capacitor/core` の `WebPlugin` 派生） | 公式手法との対比 |
| Instrumented | モックなし、実 SDK | 実機検証の意義そのもの |

### 2.5 単体テストの定義と境界

§2.1 ピラミッドで「単体テストか E2E か」が紛らわしくなる層（コンポーネント / 関数 / UI）の分類を本節で確定する。本プロジェクトは**実行プロセスの境界**で線を引く — Vitest / Gradle JUnit のようにプロセス内完結で実行できるテストを「単体テスト」とし、実ブラウザ / 実機 / 別 OS プロセスが必要なものを「E2E（または instrumented）」とする。

#### 2.5.1 定義

> **単体テスト** = Vitest（Frontend）または Gradle JUnit（Android JVM）で、**プロセス内完結・モック前提・watch 対応**のフィードバックループで実行できるテスト。

「単体」の境界は**コードの粒度**（関数 1 個 vs クラス 1 個）ではなく**実行プロセスの境界**で引く。jsdom や MSW（`msw/node` の interceptor 経路）は同一 Vitest プロセス内で動くため単体に含み、Cypress dev サーバや Android エミュレータは別プロセスのため含まない。本定義により、**コンポーネントテストは「単体」に分類される**（一般用語の「コンポーネント統合テスト」とは異なる本プロジェクトの規約）。

#### 2.5.2 In / Out 判定表

| 種別 | 単体か | ランナー | 根拠 |
|---|---|---|---|
| Composable / 関数テスト（`useDemoSdk` 等） | ✅ 単体 | Vitest + `vi.mock` | 純ロジック、ブリッジは `vi.mock` で置換 |
| Component テスト（VTU + jsdom + MSW） | ✅ 単体 | Vitest + VTU | jsdom と MSW（Node）はプロセス内、ブラウザ起動なし |
| Pinia / store テスト（将来導入時） | ✅ 単体 | Vitest | 状態管理ロジックは Vitest で完結 |
| `scripts/gen-fixtures.ts` / `gen-cases.ts` ロジック | ✅ 単体 | Vitest | 入力 YAML / Markdown と期待出力を fixture で検証 |
| MSW handler のレスポンス検証 | ✅ 単体 | Vitest + `setupServer`（`msw/node`） | Node 環境で fetch を発火、handler ロジック単独検証 |
| Snapshot テスト（`toMatchSnapshot`） | ✅ 単体（広義） | Vitest | プロセス内完結。ただし学習サンプル集としては**推奨外**（後述 Q3） |
| Android AAR 内ロジック（`demo-sdk`） | ✅ 単体 | Gradle JVM (`./gradlew :demo-sdk:test`) | JVM 内完結、Android Framework 不要 |
| E2E 動線テスト（Cypress `items-flow`） | ❌ E2E | Cypress | 実ブラウザ起動、dev サーバ別プロセス |
| Espresso instrumented | ❌ instrumented | Gradle `:app:connectedAndroidTest` | AVD / 実機が別プロセス（§4.5） |
| Visual Regression（Chromatic 等） | ❌（採用外） | — | 実ブラウザ起動 + クラウド比較で単体ではない |
| Robolectric | ❓（採用外） | — | Android Framework を JVM 上で疑似実行。§1 で採用していない |

#### 2.5.3 クロスプラットフォーム対応表

| 観点 | Frontend | Android |
|---|---|---|
| 単体テストランナー | **Vitest** | **Gradle JUnit4**（`com.android.library` の `testImplementation`） |
| watch コマンド | `npm run test:unit`（既定で watch） | `./gradlew :demo-sdk:test --continuous` |
| 1 回実行コマンド | `npm run test:unit -- --run` | `./gradlew :demo-sdk:test` |
| モック対象 | `@/native/...` を `vi.mock`、HTTP は MSW | 純 JUnit（必要なら将来 Mockito / MockK） |
| デバッグ | VSCode Vitest Explorer + JS Debug Terminal | VSCode Java Test Runner（`vscjava.vscode-java-test`） |
| HTML レポート | `frontend/.vitest-report/index.html`（§5.1） | `frontend/android/demo-sdk/build/reports/tests/test/index.html`（§5.1） |
| JUnit XML | `frontend/.vitest-report/junit.xml`（§5.1） | `frontend/android/demo-sdk/build/test-results/test/*.xml`（§5.1） |
| カバレッジ | `frontend/coverage/index.html`（`@vitest/coverage-v8` 導入済み） | JaCoCo（将来導入候補） |
| プロセス境界 | Node.js + jsdom | JVM のみ（Android SDK / エミュ不要） |
| 単体外の層 | E2E (Cypress) | Espresso instrumented (`:app:connectedAndroidTest`) |

#### 2.5.4 境界ケース Q&A

- **Q1: VTU + jsdom + MSW で API を呼ぶコンポーネントテストは「単体」？「統合」？**
  A: 本プロジェクトでは**単体**。jsdom と MSW（Node モード）は Vitest プロセス内で完結し、外部依存（実 API / 実 DB / 実ブラウザ）がない。一般用語では「コンポーネント統合テスト」と呼ばれる場合もあるが、本プロジェクトでは Vitest 実行＝単体で統一する。

- **Q2: `vi.mock` で `@/native/demo-sdk-bridge` を差し替えたテストは、ブリッジ依存があるから統合テストでは？**
  A: 違う。`vi.mock` でモジュール全体を置換した時点で外部依存は消えており、純粋に Vitest プロセス内で完結するため**単体**。実ブリッジに依存するのは Espresso 側のみ。

- **Q3: Snapshot テスト（`toMatchSnapshot()`）は推奨されるか？**
  A: 単体テスト枠には含むが**学習サンプル集としては推奨外**。Ionic / Vue の SFC は描画差分が出やすく、保守コストの学習価値より「割れて困る」のほうが先に来る。明示的な `toContain` / `toHaveAttribute` を学ぶほうが本プロジェクトの目的と整合する。

- **Q4: `scripts/gen-fixtures.ts` や `scripts/gen-cases.ts` 自体のテストは単体か？**
  A: **単体**。Vitest で実行可能で、入力 YAML / Markdown と期待出力を fixture で持たせれば純関数テストとして書ける（§3.4 のジェネレータ仕様参照）。

- **Q5: MSW handler 自体のテスト（リクエストに対する正しいレスポンス）は単体か？**
  A: **単体**。MSW は `msw/node` の `setupServer` で Node 環境でも動かせるため、Vitest 内で fetch を発火させる形が取れる。E2E のシナリオ駆動とは別に、handler ロジックそのものを単体で検証できる。

- **Q6: Vue Router の遷移を検証するコンポーネントテストは単体か？**
  A: **単体**。`createMemoryHistory()` を使えば実ブラウザの History API は不要で、Vitest プロセス内で完結する。`router.push()` の結果を `router.currentRoute.value` で読むパターン。

- **Q7: Capacitor `WebPlugin` 派生クラスを使った比較サンプル（§2.4 比較サンプル行）は単体か？**
  A: **単体**。`registerPlugin` で web fallback として登録した時点で Vitest プロセス内に閉じる。実機ブリッジ依存は Espresso のみ。

- **Q8: Android `demo-sdk` の Espresso 1 ケース（§4.5）はなぜ単体に含めない？**
  A: AVD / 実機の別プロセス起動が必須で、`./gradlew :demo-sdk:test` の JVM 単体経路から外れるため。`:app:connectedAndroidTest` で起動する instrumented test は本プロジェクトでは「実機検証 = E2E に相当」と扱う（§4.5 で CI 含めない方針を明記）。

#### 2.5.5 CI / npm script マッピング

| script / task | 実行内容 | 単体テスト枠 | 想定実行頻度 |
|---|---|---|---|
| `npm run test:unit` | `vitest`（watch 既定） | ✅ Frontend 単体すべて | 開発中常駐 |
| `npm run test:unit -- --run` | 1 回実行モード | ✅ 同上 | CI / pre-commit |
| `npm run test:e2e` | `cypress run` | ❌ E2E | PR 必須（dev サーバ起動が要件） |
| `./gradlew :demo-sdk:test` | Android JVM unit | ✅ Android 単体すべて | PR 必須 |
| `./gradlew :app:connectedAndroidTest` | Espresso（AVD 起動必須） | ❌ instrumented | ローカル手動のみ（§4.5「CI 含めない」方針） |

**未導入の script（plop 雛形で追加候補）**:

- `npm run test:component`: 現状は `test:unit` 内に包含。spec 数が増えて分割が必要になったら Vitest の `--project` 分割で `test:unit:composable` / `test:component` に分けることを検討（§6 Open Items 候補）
- `npm run test:unit:coverage`: `@vitest/coverage-v8` は導入済みのため `vitest --coverage` で動作。CI 集計用の script として明示化する余地あり

**GitHub Actions（将来）の job 分割推奨**:

```yaml
jobs:
  unit-frontend:        # npm run test:unit -- --run
  unit-android:         # ./gradlew :demo-sdk:test
  e2e-frontend:         # npm run test:e2e（MSW + dev サーバ + Cypress）
  # :app:connectedAndroidTest は §4.5 により CI 対象外（ローカル手動）
```

単体（`unit-*` job）は PR 必須・並列実行・5 分以内目標、E2E は PR 必須だが unit より後段、Android instrumented はローカル手動、というのが本節の単体定義に基づく自然な分割。

---

## 3. 設計書 → テストデータ 自動連係パイプライン

### 3.1 2 系統のパイプライン

```
┌─────────────────────┐     ┌────────────────────────┐
│ openapi/openapi.yaml │ ──> │ scripts/gen-fixtures.ts │
│  examples: の拡張    │     └────────────────────────┘
└─────────────────────┘            │
                                    ├─> frontend/src/mocks/generated/*.fixtures.ts
                                    ├─> frontend/tests/e2e/fixtures/*.json
                                    └─> frontend/src/mocks/generated/handlers.ts（シナリオ別）

┌─────────────────────────┐ ┌─────────────────────────┐
│ docs/specs/cases/*.md    │ │ scripts/gen-cases.ts    │
│  決定表（front matter+   │─>│  MD→JSON+TS 変換         │
│  Markdown テーブル）     │ └─────────────────────────┘
└─────────────────────────┘            │
                                        ├─> **/*.cases.generated.ts （Vitest `it.each`）
                                        └─> demo-sdk/src/test/resources/cases/*.json
                                                （JUnit `@MethodSource`）
```

### 3.2 OpenAPI examples 拡張規約

1 つの operation に複数の `examples` を持たせ、シナリオ名をキーにする。HTTP status を切り替えたい場合は `x-status` 拡張属性を使う。

```yaml
paths:
  /api/items:
    get:
      responses:
        '200':
          content:
            application/json:
              examples:
                empty:         { summary: 空配列, value: [] }
                two_items:     { summary: 通常2件, value: [...] }
                large_list:    { summary: 大量, value: [...] }
                server_error:
                  summary: 5xx
                  value: { code: "E_INTERNAL", message: "..." }
                  x-status: 500
```

**生成物**:

- `frontend/src/mocks/generated/items.fixtures.ts` — `export const itemsFixtures = { empty, twoItems, largeList, serverError }`
- `frontend/tests/e2e/fixtures/items.json` — 既定シナリオ（`two_items`）のみ
- `frontend/src/mocks/generated/handlers.ts` — シナリオ切替可能な MSW handler（`setScenario('empty')` で切替）

### 3.3 Markdown 決定表スキーマ

```markdown
---
target: composables/useDemoSdk#init
generator: vitest-cases | junit-cases | both
out:
  ts: src/composables/__tests__/useDemoSdk.init.cases.generated.ts
  json: frontend/android/demo-sdk/src/test/resources/cases/useDemoSdk_init.json
---

# useDemoSdk.init 決定表

| case_id | input.apiKey | mock.init             | expect.initialized | expect.lastError.code |
|---------|--------------|-----------------------|--------------------|------------------------|
| C1      | "valid"      | resolves {ok:true}    | true               | null                   |
| C2      | ""           | rejects E_INVALID_KEY | false              | E_INVALID_KEY          |
| C3      | "expired"    | rejects E_EXPIRED     | false              | E_EXPIRED              |
```

- 列名は `<role>.<path>` 形式（`input.*`, `mock.*`, `expect.*`）
- `mock.*` の値は擬似 DSL（`resolves <expr>` / `rejects <code>`）。ジェネレータが正規化する
- 数値・真偽・`null` は JSON リテラル互換、文字列は `"..."` で囲む

### 3.4 ジェネレータ設計

| スクリプト | 入力 | 出力 | 起動 |
|---|---|---|---|
| `frontend/scripts/gen-fixtures/cli.ts` | `openapi/openapi.yaml` | `frontend/src/mocks/generated/*` + `frontend/tests/e2e/fixtures/*` | `npm run gen:fixtures` |
| `frontend/scripts/gen-cases/cli.ts`    | `docs/specs/cases/*.md` | `**/*.cases.generated.ts` (+ `demo-sdk/.../resources/cases/*.json` in P5) | `npm run gen:cases` |

- いずれも**冪等**（出力先を全削除 → 再生成）
- 生成ファイルには `// AUTO-GENERATED – do not edit` ヘッダ
- 生成ファイルは **git 管理**（CI 上で `git diff --exit-code` チェック）

### 3.5 テスト側の使用例

```ts
// useDemoSdk.init.spec.ts
import { describe, it, expect, vi } from 'vitest'
import { useDemoSdkInitCases } from './useDemoSdk.init.cases.generated'

describe('useDemoSdk.init (cases)', () => {
  it.each(useDemoSdkInitCases)('$id', async (c) => {
    /* Arrange */
    /* Act     */
    /* Assert  */
  })
})
```

```kotlin
// useDemoSdk_initTest.kt
@ParameterizedTest
@MethodSource("cases")
fun init(case: Case) { /* … */ }

companion object {
  @JvmStatic fun cases() = readCases("useDemoSdk_init.json")
}
```

### 3.6 plop との関係

| plop コマンド | 用途 |
|---|---|
| `plop case <target>` | 上記 MD の雛形を `docs/specs/cases/<target>.md` に置く |
| `plop spec:composable <name>` | `*.spec.ts` 雛形（`cases.generated.ts` を import 済み） |
| `plop spec:component <view>` | View 用 spec（fixtures import 済み） |
| `plop spec:e2e <flow>` | Cypress spec 雛形 |
| `plop spec:android-unit <class>` | Kotlin JUnit5 雛形（`@MethodSource` 済み） |

---

## 4. VSCode 実行環境

### 4.1 推奨拡張（`.vscode/extensions.json` で配布）

| 用途 | 拡張 ID | 役割 |
|---|---|---|
| Vue | `Vue.volar` | TS/Vue 言語サービス |
| Vitest | `vitest.explorer` | テストエクスプローラー UI + 行頭 Run/Debug lens |
| ESLint | `dbaeumer.vscode-eslint` | テスト含む lint |
| Java | `vscjava.vscode-java-pack` | Java 17 + Gradle + JUnit5 ランナー |
| Gradle | `vscjava.vscode-gradle` | Gradle タスク UI |
| Java Test Runner | `vscjava.vscode-java-test` | Gradle JUnit テストの Run/Debug lens |
| Kotlin（任意） | `fwcd.kotlin` | Kotlin LSP |
| Android（任意） | `adelphes.android-dev-ext` | adb / logcat / install |
| JS デバッガ（同梱） | `ms-vscode.js-debug` | Chrome attach / Node 起動 |
| Cypress スニペット（任意） | `andrew-codes.cypress-snippets` | スニペット |

### 4.2 `.vscode/launch.json`

```jsonc
{
  "configurations": [
    {
      "name": "Vitest: current file",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/frontend/node_modules/vitest/vitest.mjs",
      "args": ["run", "${relativeFile}"],
      "cwd": "${workspaceFolder}/frontend",
      "console": "integratedTerminal"
    },
    {
      "name": "Cypress: run current spec (headed + debug port)",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/frontend/node_modules/cypress/bin/cypress",
      "args": ["run", "--browser", "chrome", "--headed", "--no-exit",
               "--spec", "${relativeFile}"],
      "cwd": "${workspaceFolder}/frontend",
      "env": { "CYPRESS_REMOTE_DEBUGGING_PORT": "9222" },
      "console": "integratedTerminal"
    },
    {
      "name": "Cypress: attach to Chrome (port 9222)",
      "type": "chrome",
      "request": "attach",
      "port": 9222,
      "webRoot": "${workspaceFolder}/frontend",
      "sourceMaps": true,
      "sourceMapPathOverrides": {
        "webpack:///./*": "${webRoot}/*",
        "webpack:///src/*": "${webRoot}/src/*"
      }
    },
    {
      "name": "Cypress: debug plugin/node side",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/frontend/node_modules/cypress/bin/cypress",
      "args": ["open"],
      "cwd": "${workspaceFolder}/frontend",
      "console": "integratedTerminal"
    }
  ],
  "compounds": [
    {
      "name": "Cypress: spec + attach",
      "configurations": [
        "Cypress: run current spec (headed + debug port)",
        "Cypress: attach to Chrome (port 9222)"
      ]
    }
  ]
}
```

> **前提**: Cypress を使うどの構成も、別ターミナルで `npm run dev`（MSW 込みの dev サーバ）が起動している必要がある。compound 起動前に tasks.json の `fe: dev` を別ターミナルで実行しておくこと。preLaunchTask に組み込むと spec ごとに dev サーバが再起動して遅いため、手動起動を推奨。

Gradle/JUnit は Java Test Runner 拡張の Run/Debug lens を使うため、`launch.json` への追加は不要。

### 4.3 `.vscode/tasks.json`

```jsonc
{
  "tasks": [
    { "label": "fe: dev",            "type": "npm", "script": "dev",       "path": "frontend", "isBackground": true },
    { "label": "fe: vitest watch",   "type": "npm", "script": "test:unit", "path": "frontend" },
    { "label": "fe: cypress run",    "type": "npm", "script": "test:e2e",  "path": "frontend" },
    { "label": "fe: gen fixtures",   "type": "npm", "script": "gen:fixtures", "path": "frontend" },
    { "label": "fe: gen cases",      "type": "npm", "script": "gen:cases",    "path": "frontend" },
    { "label": "be: mvnw test",      "type": "shell",
      "command": ".\\mvnw.cmd test", "options": { "cwd": "backend" } },
    { "label": "sdk: gradle test (JVM unit)", "type": "shell",
      "command": ".\\gradlew.bat :demo-sdk:test", "options": { "cwd": "frontend/android" } },
    { "label": "sdk: gradle connectedAndroidTest (Espresso)", "type": "shell",
      "command": ".\\gradlew.bat :app:connectedAndroidTest", "options": { "cwd": "frontend/android" } }
  ]
}
```

### 4.4 層別 VSCode 実行手順

| 層 | VSCode 操作 | 必要拡張 | 補足 |
|---|---|---|---|
| Vitest（composable / component） | エクスプローラー / 行頭の Run / Debug | Vitest | `vitest.explorer` がテスト一覧を自動収集 |
| Cypress E2E（実行のみ） | tasks → `fe: cypress run` | （任意） | dev サーバを別タスクで起動しておく |
| Cypress E2E（spec 内デバッグ） | compound「Cypress: spec + attach」 | JS Debugger（同梱） | spec 内の `debugger` / ブレークポイントで停止 |
| 比較サンプル（Playwright） | `npx playwright test` を tasks.json から | Playwright Test 拡張（任意） | 比較サンプル時のみ |
| Android JVM Unit | Kotlin/Java ファイルの Run/Debug lens | Java Pack + Java Test Runner + Gradle | Gradle import を VSCode が自動実行 |
| Android Instrumented | エミュ起動 → `gradle connectedAndroidTest` タスク | Java Pack + Gradle + Android Dev Ext | Android Studio の既存 AVD を流用 |

### 4.5 Android インストルメンテッドの位置づけ

- 起動コマンド: `adb start-server` → AVD 起動（`emulator -avd Pixel_API_33`）→ `./gradlew :app:connectedAndroidTest`
- ログ: `adb logcat` を Android Dev Ext タブで観察
- スクショ: テスト内で `UiAutomation#takeScreenshot()` を呼び `/sdcard/.../*.png` に保存 → `adb pull` で取得（手順を README に明記）
- **CI には含めない**（学習用、ローカル手動が前提）

---

## 5. エビデンス取得方針 + plop テンプレート

### 5.1 層別エビデンス

| 層 | 生成物 | パス | 形式 | git |
|---|---|---|---|---|
| Vitest | HTML レポート | `frontend/.vitest-report/index.html` | HTML | ignore |
| Vitest | JUnit XML | `frontend/.vitest-report/junit.xml` | JUnit XML | ignore |
| Vitest | カバレッジ HTML | `frontend/coverage/index.html` | Istanbul HTML | ignore |
| Cypress | スクショ（失敗時自動） | `frontend/tests/e2e/screenshots/<spec>/<test>--<retry>.png` | PNG | ignore |
| Cypress | 任意スクショ（`cy.screenshot('name')`） | 同上 | PNG | ignore |
| Cypress | HTML レポート | `frontend/tests/e2e/reports/mochawesome.html` | Mochawesome HTML | ignore |
| Cypress | JUnit XML | `frontend/tests/e2e/reports/junit-*.xml` | JUnit XML | ignore |
| Cypress | 動画 | （無効化）`video: false` を `cypress.config.ts` に設定 | — | — |
| Playwright（比較） | trace + screenshot | `frontend/__samples__/comparison/playwright/test-results/` | PNG/zip | ignore |
| Android JVM Unit | HTML | `frontend/android/demo-sdk/build/reports/tests/test/index.html` | Gradle 標準 | ignore |
| Android JVM Unit | JUnit XML | `frontend/android/demo-sdk/build/test-results/test/*.xml` | JUnit XML | ignore |
| Android Instrumented | スクショ | `frontend/android/app/build/outputs/connected_android_test_additional_output/*/*.png` | PNG | ignore |
| Android Instrumented | screenrecord | `*.mp4`（任意、手順書のみ） | MP4 | ignore |

### 5.2 保存方針

- **ローカル**: 全エビデンスは `.gitignore`。VSCode の「Open in Browser」で HTML レポートを直接見る
- **CI（将来）**: GitHub Actions の `upload-artifact` で `.vitest-report/`, `tests/e2e/screenshots/`, `tests/e2e/reports/`, `android/**/build/reports/`, `android/**/build/test-results/` を 14 日保持
- **PR レビュー**: 失敗時のスクショ + JUnit XML が必須、HTML レポートは任意

### 5.3 ファイル命名規約

- Cypress スクショ: Cypress 既定（`<spec> -- <test title> (failed).png`）に任せる
- 任意スクショ: `cy.screenshot('<step-id>-<state>')`、例 `01-list-loaded`, `02-after-delete`
- Espresso スクショ: `<TestClass>_<testMethod>_<step>.png`

### 5.4 レポーター設定（参考）

```ts
// vite.config.ts → test.reporters
test: {
  globals: true, environment: 'jsdom',
  reporters: ['default',
              ['html', { outputFile: '.vitest-report/index.html' }],
              ['junit', { outputFile: '.vitest-report/junit.xml' }]],
  coverage: { reporter: ['text', 'html'], reportsDirectory: 'coverage' }
}
```

```ts
// cypress.config.ts → reporter
reporter: 'cypress-multi-reporters',
reporterOptions: {
  reporterEnabled: 'mochawesome, mocha-junit-reporter',
  mochawesomeReporterOptions: { reportDir: 'tests/e2e/reports', overwrite: false, html: true },
  mochaJunitReporterOptions:  { mochaFile: 'tests/e2e/reports/junit-[hash].xml' }
}
```

### 5.5 plop テンプレート一覧

| コマンド | プロンプト | 生成物 |
|---|---|---|
| `plop case <target>` | target / case_count / generator(vitest\|junit\|both) | `docs/specs/cases/<target>.md`（front matter + 表雛形） |
| `plop spec:composable <name>` | composable 名 / case ファイル参照 | `src/composables/__tests__/<name>.spec.ts` |
| `plop spec:component <view>` | view 名 / fixture 名 | `src/views/__tests__/<view>.spec.ts` |
| `plop spec:e2e <flow>` | フロー名 / fixture 名 | `tests/e2e/specs/<flow>.cy.ts` |
| `plop spec:android-unit <class>` | クラス名 / package / case json | `frontend/android/demo-sdk/src/test/java/.../<class>Test.kt` |
| `plop sample:comparison <kind>` | kind = playwright \| testing-library \| capacitor-mock | `__samples__/comparison/<kind>/...` |
| `plop view <name>` | view 名 / route path | View + composable + 4 つの spec 雛形を一括生成 |

`plopfile.mjs` 構成:

```
plop/
  plopfile.mjs
  templates/
    case.md.hbs
    spec.composable.ts.hbs
    spec.component.ts.hbs
    spec.e2e.ts.hbs
    spec.android-unit.kt.hbs
    sample.playwright.ts.hbs
    sample.testing-library.ts.hbs
    sample.capacitor-mock.ts.hbs
    view.vue.hbs
    composable.ts.hbs
```

`npm run scaffold` → `plop` の対話 UI を起動。

---

## 6. ディレクトリ構成 + 段階導入計画

### 6.1 ディレクトリ構成（最終形）

```
ionic-sample-orval/
├─ openapi/
│   └─ openapi.yaml                            # examples を多シナリオ化（§3.2）
├─ docs/
│   ├─ superpowers/specs/
│   │   └─ 2026-05-20-test-strategy-design.md  # 本設計書
│   └─ specs/
│       └─ cases/                              # MD 決定表（§3.3）
│           ├─ useDemoSdk.init.md
│           ├─ useDemoSdk.echo.md
│           └─ ...
├─ scripts/                                    # repo-root .cmd orchestration (existing)
└─ frontend/scripts/                           # TS generators live with the FE toolchain
    ├─ gen-fixtures/{lib,cli}.ts               # OpenAPI → fixtures
    └─ gen-cases/{lib,cli}.ts                  # MD → it.each (JUnit JSON branch lands in P5)
├─ plop/
│   ├─ plopfile.mjs
│   └─ templates/                              # §5.5
└─ frontend/
    ├─ .vscode/{extensions,launch,tasks}.json  # §4
    ├─ src/
    │   ├─ composables/
    │   │   └─ __tests__/
    │   │       ├─ useDemoSdk.spec.ts          # 既存（手書き）
    │   │       └─ useDemoSdk.init.cases.generated.ts  # AUTO
    │   ├─ views/
    │   │   └─ __tests__/
    │   │       ├─ ListView.spec.ts
    │   │       └─ BridgeDemoView.spec.ts
    │   └─ mocks/
    │       ├─ handlers.ts                     # 手書き既存
    │       └─ generated/                      # AUTO
    │           ├─ items.fixtures.ts
    │           └─ handlers.ts
    ├─ tests/
    │   └─ e2e/
    │       ├─ fixtures/                       # AUTO（OpenAPI examples）
    │       └─ specs/
    │           ├─ items-flow.cy.ts
    │           └─ bridge-demo.cy.ts
    ├─ __samples__/
    │   └─ comparison/
    │       ├─ playwright/                     # Cypress 同シナリオの Playwright 版
    │       ├─ testing-library/                # VTU 同シナリオの TL 版
    │       └─ capacitor-mock/                 # vi.mock 同シナリオの公式 mock 版
    └─ android/
        ├─ demo-sdk/
        │   └─ src/test/
        │       ├─ java/.../DemoSdkTest.kt
        │       └─ resources/cases/             # AUTO（MD → JSON）
        └─ app/
            └─ src/androidTest/                # Espresso 1 ケース
                └─ java/.../DemoSdkPluginInstrumentedTest.kt
```

### 6.2 段階導入計画

| Phase | スコープ | 受け入れ基準 | 依存 | 状況 (2026-05-22 時点) |
|---|---|---|---|---|
| **P0** 基盤整備 | `.vscode/*.json`、Vitest reporter 拡張、Cypress reporter 設定、`.gitignore` 更新 | VSCode 拡張インストール後、Vitest と Cypress を VSCode から実行可能。HTML レポートが生成される | なし | ✅ 完了 |
| **P1** 設計書連係（API） | OpenAPI examples 拡張、`gen-fixtures.ts`、`npm run gen:fixtures`、`mocks/generated/` 反映 | `npm run gen:fixtures` 冪等。fixture を使った Cypress 1 spec が通る | P0 | ✅ 完了（`cec45a4`, `f22b8fe`, `aa8ef43`, `17751bc`） |
| **P2** 設計書連係（MD） | `docs/specs/cases/*.md`、`gen-cases.ts`、`useDemoSdk.init` を MD 駆動に置換 | MD → `*.cases.generated.ts` → Vitest `it.each` が通る。元の手書き spec を比較として残す | P0 | ✅ 完了（`930125b`, `597eee6`, `672a313`, `5873fca`） |
| **P3** Component / E2E サンプル | `views/__tests__/{ListView,DetailView,CreateView,BridgeDemoView}.spec.ts`、`tests/e2e/specs/items-flow.cy.ts` を List→Detail→Create→Delete 動線まで拡張 | Cypress E2E が dev サーバ＋MSW で動く。失敗時スクショが取れる | P0, P1 | ⏸ 未着手（plan `…-test-strategy-p3.md` 参照） |
| **P4** Android SDK 実行環境 | Gradle JVM unit から VSCode 実行、Java Pack 拡張一覧、`tasks.json` 追記 | VSCode 上で `DemoSdkTest.kt` の lens から Run/Debug 可能 | P0 | ⏸ 未着手 |
| **P5** Android Instrumented サンプル | Espresso 1 ケース、エミュ起動・スクショ取得手順を README に追加 | エミュ起動 → `gradle connectedAndroidTest` 通る。スクショ artifact がローカルで取れる | P4 | ⏸ 未着手 |
| **P6** 比較サンプル | `__samples__/comparison/` に Playwright・TL・Capacitor mock を 1 本ずつ | 各サンプル単独で実行可能。設計書比較表に「採用 vs 比較」のリンク追加 | P3 | ⏸ 未着手 |
| **P7** plop 雛形 | `plopfile.mjs` + 全テンプレ、`npm run scaffold` | `plop view foo` が View+composable+spec×4 を生成し、雛形が即時 pass する（空 spec で OK） | P3, P5 | ⏸ 未着手 |
| **P8**（任意） CI | GitHub Actions：lint + vitest + cypress headless + gradle test、artifact upload | PR で全テスト走る。失敗時 artifact からスクショ取得可能 | P0（必須）+ 各 Phase（追加可） | ⏸ 未着手 |

P0 → P1 → P2 まで進めば「設計書連係 + エビデンス取得」のコア価値が出る。P3-P5 が学習サンプルの本体。P6 と P7 は最後でよく、P8 は別 PR にしてもよい。

#### 6.2.1 依存関係と並行実行可能性

```
                  ┌────────┐
                  │   P0   │ 基盤整備（VSCode + reporter + .gitignore）
                  └────┬───┘
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
   ┌────────┐    ┌────────┐    ┌────────┐
   │   P1   │    │   P2   │    │   P4   │   ← P0 完了後はこの 3 つを並列実行可
   │ API gen│    │ MD gen │    │ Android│
   └────┬───┘    └────────┘    │ JVM env│
        │                       └────┬───┘
        ▼                            ▼
   ┌────────┐                   ┌────────┐
   │   P3   │ ← P1 必須          │   P5   │ ← P4 必須
   │ Comp + │   (E2E は fixtures │ Android│   (エミュ起動が前提)
   │  E2E   │    に依存)         │  Esp   │
   └────┬───┘                   └────┬───┘
        │                            │
        ├────────────┐               │
        ▼            ▼               │
   ┌────────┐   ┌────────┐           │
   │   P6   │   │        │           │
   │ 比較   │   │   P7   │ ← P3 + P5 │
   │ サンプル│   │  plop  │   両方が│
   └────────┘   │  雛形  │   揃ってから（雛形対象が全部出揃う）
                └────┬───┘
                     ▼
                ┌────────┐
                │   P8   │ ← 任意。P0 必須、含めるテストは終わったフェーズ分だけ
                │   CI   │
                └────────┘
```

**並列実行できる組み合わせ**:

- **P0 完了後**: `{P1, P2, P4}` を別ブランチで並列実行可（互いに触るファイルが分離）
- **P3 完了後**: `{P5, P6}` を並列実行可（P5 は Android 単独、P6 は frontend サンプルのみ）
- **P7 / P8**: 並列実行は可能だが、P7 は前段の雛形パターンが揃ってからのほうが学習価値が高い

**逆に直列が必要な箇所**:

- **P3 ← P1**: items-flow.cy.ts が `gen-fixtures` で出力された `tests/e2e/fixtures/items.json` を読むため、P1 完了前に E2E spec は書けない
- **P5 ← P4**: VSCode から Gradle タスクを起動する経路（P4）を確立してから Espresso（P5）に着手しないと、エミュ問題と環境問題の切り分けが困難
- **P6 ← P3**: 比較サンプル（Playwright / TL）は採用品の同シナリオを並置するため、採用品（Cypress / VTU）の実装が先

**現状（2026-05-22）からの最短経路**:

P3 だけ進める場合は別 PR 不要で `feature/test-strategy-p0-p2` から派生可能。P3 と P4 を並列にしたいなら別ブランチを切る。詳細は P3 については `docs/superpowers/plans/2026-05-22-test-strategy-p3.md` 参照（P4 以降はまだ詳細プラン未作成）。

### 6.3 既存資産との関係

- `frontend/src/composables/__tests__/useDemoSdk.spec.ts`: **保持**。P2 で「MD 駆動版」と並べて「同じテストを 2 通り書いた比較」として説明
- `frontend/tests/e2e/specs/test.cy.ts`（雛形のまま）: **削除**。P3 で `items-flow.cy.ts` 等に置換
- `backend/src/test/java/.../ItemServiceTest.java`: BE は今回スコープ外、現状維持
- 既存 Orval パイプライン（MSW handlers 生成）: **残す**。P1 で「シナリオ別 handlers」を別ファイルに分けて差し替え可能に

### 6.4 Open Items（未確定事項）

1. **Vitest コンポーネントテストで Ionic コンポーネントを描画したときのスタイル/イベントの限界**: jsdom では shadow DOM が完全に描画されないため、深い検証は Cypress に寄せる。境界の線引きはサンプル実装時に判明する見込み
2. **MD 決定表のパーサ仕様**: 型情報をどこまで持たせるか（数値・真偽・null の表現）は P2 着手時に確定
3. **Android instrumented の AVD 名**: 固定するか可変かは P5 で決める（README のサンプルに `Pixel_API_33` を例示）
4. **比較サンプル CI 実行の重さ**: Playwright を CI で毎回走らせるかはサンプル実装後にベンチ
5. **`vi.mock` 比較サンプル（Capacitor 公式 mock）の Android 側スコープ**: TS 側で完結する想定だが、Android 側プラグイン実装に踏み込むか P6 で判断

---

## 7. 参考: 既存テストの位置づけ

| 既存ファイル | 種別 | 本戦略での扱い |
|---|---|---|
| `frontend/src/composables/__tests__/useDemoSdk.spec.ts` | Vitest（手書き） | P2 で MD 駆動版と並置 |
| `frontend/tests/e2e/specs/test.cy.ts` | Cypress 雛形（未稼働） | P3 で削除・置換 |
| `backend/src/test/java/.../ItemServiceTest.java` | JUnit | 現状維持。BE 戦略は別途 |
| `backend/src/test/java/.../SampleApplicationTests.java` | JUnit（context load） | 現状維持 |
