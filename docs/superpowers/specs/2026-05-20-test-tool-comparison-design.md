# テストツール比較検討 設計書（8軸スコアリング + プロトタイプ仕様）

- 日付: 2026-05-20
- 親文書: [`docs/superpowers/specs/2026-05-20-test-strategy-design.md`](./2026-05-20-test-strategy-design.md)（以下「親戦略書」）
- 目的: 親戦略書 §1「採用スタック（決定表）」で扱った 11 カテゴリ × 各候補について、定量ルーブリックで再評価し、比較サンプルがある軸（VTU vs TL / Cypress vs Playwright / vi.mock vs Capacitor 公式 mock）はプロトタイプ仕様まで設計する
- 非目的:
  - 親戦略書の採用決定の差し替え（既存決定はベース。新発見があれば §3.4 で改訂提案として記載）
  - ベンチマーク数値の厳密測定（実行速度は体感と公開ベンチの参照で足りる範囲）
  - 採点本体の作業（採点根拠の埋め込みは本書 §2 のテンプレに従い、後続 plan で 1 節ずつ進める）

---

## 1. 評価フレームワーク

### 1.1 評価軸（8軸）の定義

各軸を 1-5 点で採点する。各軸の意味と 1 / 3 / 5 点の代表例（ルーブリック）を以下に示す。

| #  | 軸 | 定義 | 1 点 | 3 点 | 5 点 |
|----|---|---|---|---|---|
| L1 | **学習コスト** | 初学者が「最初の 1 本のテストを書ける」までに要する時間と概念量 | 公式 Getting Started を読み終えるのに数日／専門用語が多い | 半日で雛形理解 / API がやや独特 | 30 分で書き始められる / 直感的 API |
| L2 | **ドキュメント・サンプル** | 公式ドキュメントの整理度 + 日本語/英語コミュニティのチュートリアル / StackOverflow 解答の厚み | 公式 README のみ / 日本語ほぼなし | 公式は充実 / コミュニティ記事は中程度 | 公式 + 日本語含む多数のチュートリアル / StackOverflow 即解決 |
| L3 | **既存親和性** | 本リポジトリの既存資産（Vite / Vue 3 / Ionic / Capacitor / TypeScript / Orval / MSW / Gradle）への適合度 | 設定が二重化したり既存ビルドと衝突する | 既存と共存可能だが追加設定が要る | ゼロコンフィグまたは既存パイプにそのまま乗る |
| L4 | **デバッグ体験** | ブレークポイント / source map / エラー位置の精度 / 失敗時の出力 | console.log 頼み / source map なし | ブレークポイント OK だが UI 弱 | テストエクスプローラ + ステップ実行 + 構造化スタック |
| L5 | **VSCode 統合** | 公式または定番拡張、Run/Debug lens、テストエクスプローラ統合 | 公式拡張なし / コマンドラインのみ | サードパーティ拡張あり / 一部機能 | 公式または事実上標準の拡張が Run/Debug/Watch 完備 |
| L6 | **保守性** | 直近 12 ヶ月のリリース頻度 + 主要 dep（Vite / Vue 3 / Node）への追従速度 + メジャーバージョンの破壊度 | 直近 6 ヶ月リリースなし / メジャー追従遅い | 四半期に 1 回程度 / 移行ガイドあり | 月次マイナー / メジャーは年 1 回程度で移行容易 |
| L7 | **実行速度** | 同一テスト n 本の体感実行時間（cold + watch） | 1 spec で数秒 / watch 遅い | 中位 | HMR 級の即時実行 / 並列実行が標準 |
| L8 | **エコシステム** | プラグイン / レポータ / 連携ツールの選択肢 | 主要レポータのみ | 数種類の拡張あり | 公式 + サードパーティ多数 / カバレッジ・JUnit XML 等 1st-class |

### 1.2 採点の運用ルール

- **採点者**: 一次採点は本書の執筆エージェント、最終確定はユーザーレビューで上書き可
- **根拠**: 各セルの採点には 1 行根拠を併記（例: `4 (公式 + npm trends 上位、ただし日本語記事は中位)`）
- **情報源の許容**: 公式ドキュメント、GitHub の star / issue / release ページ、npm trends、本リポジトリの既存コード、執筆者の体感の混在を認める。出典が「体感」の場合はその旨を明示する
- **NA**: 比較対象が概念的に揃わない軸は `NA` で空欄（例: Android SDK ランナー軸の L5 VSCode 統合は Java Test Runner 拡張前提なので比較が成立する一方、L7 実行速度は他 TS 系候補と比較不可能）。総合スコアは NA を除外した加重平均で算出
- **同点扱い**: 軸スコアは整数のみ。0.5 刻みは避ける（読みやすさ優先）

### 1.3 重み付けと総合スコアの計算式

学習サンプル集としての目的に合わせ、学習導線に直結する 3 軸（L1 学習コスト / L2 ドキュメント / L3 既存親和性）を重く扱う。

| 軸 | 重み | 重み付け理由 |
|---|---|---|
| L1 学習コスト | 1.5 | 「学習用テストパターン集」という本リポジトリの主目的に直結 |
| L2 ドキュメント・サンプル | 1.5 | 自習導線。日本語/英語チュートリアルの厚みが学習継続性を決める |
| L3 既存親和性 | 1.5 | 既存パイプ（Vite / Orval / MSW / Gradle）への接続コストを避ける |
| L4 デバッグ体験 | 1.2 | VSCode 完結方針との整合上、欠かせないが学習目的そのものではない |
| L5 VSCode 統合 | 1.2 | 同上 |
| L6 保守性 | 1.0 | 学習用途では必須ではないが、サンプルが陳腐化するのは避けたい |
| L7 実行速度 | 1.0 | 体感は重要だが学習目的の主軸ではない |
| L8 エコシステム | 1.0 | レポータ/プラグイン拡張余地 |

**計算式**:

```
weighted_score = Σ(score_i × weight_i) / Σ(weight_i where score_i ≠ NA)
                  i ∈ scored_axes
```

**判定区分**:

| 区分 | 範囲 | 意味 |
|---|---|---|
| 優秀 | ≥ 4.5 | 学習サンプル集の目的に対し非常に適合 |
| 良好 | 3.5 – 4.4 | 学習サンプル集の目的に対し適合 |
| 要注意 | 2.5 – 3.4 | 単独採用には弱いが、教材として「これと比較して採用品の良さを示す」用途で残せる |
| 不適 | < 2.5 | 採用品との差が大きく、教材としても残す学習価値が薄い |

> **判定はあくまで本書 §1.3 ルーブリックに対する客観評価**であり、本プロジェクトでの実際の採否（親戦略書 §1 決定表）とは別軸である。例えば客観評価「良好」でも、本プロジェクトでは「不採用」になりうる（カテゴリ内に上位候補があるため）。

### 1.4 対象候補一覧

親戦略書 §1 の決定表をベースに、本書で採点する候補を以下に列挙する。

| カテゴリ | 採用（A） | 比較サンプル（B） | 不採用（C） |
|---|---|---|---|
| 1. ランナー | Vitest | — | Jest |
| 2. コンポーネント API | @vue/test-utils | Testing Library | — |
| 3. DOM 環境 | jsdom | — | happy-dom |
| 4. HTTP モック | MSW | — | nock / axios-mock-adapter |
| 5. E2E | Cypress | Playwright | WebdriverIO |
| 6. ブリッジモック | vi.mock パターン | Capacitor 公式 mock パターン | — |
| 7. Android SDK ランナー | Gradle wrapper (JVM unit) + Espresso (instrumented) | — | — |
| 8. エビデンス | Vitest HTML / Cypress + mochawesome / Gradle HTML / Espresso screenrecord | — | Cypress 動画録画 |
| 9. 設計書連係（API） | OpenAPI examples 拡張 | — | 独立 YAML / JSON データシート |
| 10. 設計書連係（UI/SDK） | Markdown 決定表 → it.each | — | Gherkin (.feature) |
| 11. 雛形生成 | plop | — | hygen |

採点は各カテゴリで A / B / C 全てに対して行い、A 不在のカテゴリは存在しない（カテゴリ 7 のように複合採用となる場合は要素ごとに採点する）。

---

## 2. カテゴリ別評価

### 2.0 各節の共通フォーマット

すべてのカテゴリ節は以下の構造を持つ。

```
### 2.x カテゴリ名: 候補A vs 候補B vs ...

#### 2.x.1 採点表

| 軸 | 候補A | 根拠A | 候補B | 根拠B | (候補C ...) |
|---|---|---|---|---|---|
| L1 学習コスト | 5 | 公式ドキュ短く API 直感的 | 4 | ... | ... |
| L2 ドキュメント | ... |
| ...
| 総合 (加重平均) | 4.7 | — | 3.9 | — |

#### 2.x.2 採否解説

- 合意点（どの候補も最低限満たすこと）
- 差分（軸ごとに何が分かれたか）
- 本プロジェクトでの選択理由
- 学習者向けメモ（「この候補に切り替えるならどんな場面か」）

#### 2.x.3 プロトタイプ設計（該当軸のみ）

- 対象シナリオ
- 配置パス（frontend/__samples__/comparison/<kind>/...）
- 採用品 spec とのペアリング方針
- 評価観点（何を読み取ってほしいか）
```

プロトタイプ設計節は §2.2 / §2.5 / §2.6 のみに置く。他の節では `（プロトタイプ設計: 該当なし。採否は §2.x.2 まで）` と明示する。

### 2.1 ランナー: Vitest vs Jest（見本ケース：完全採点）

本節は採点を完全に埋めた「見本」。§2.2 以降は本書のフォーマットに従い、後続 plan で各節ずつ採点を埋める。

#### 2.1.1 採点表

| 軸 | Vitest | 根拠 | Jest | 根拠 |
|---|---|---|---|---|
| L1 学習コスト | 5 | Jest API 互換、Vite を知っていれば設定がほぼゼロ | 4 | API 自体は枯れていて学びやすいが、TS + ESM の設定が現代的でない |
| L2 ドキュメント | 4 | 公式 + 多数の Vue/Vite 系記事。日本語記事も増加傾向 | 5 | 業界標準の蓄積。日本語 Q&A の量は最大級 |
| L3 既存親和性 | 5 | 既存 Vite + Vue 3 + TS 構成にそのまま乗る。`vite.config.ts` を共有可 | 2 | ESM / TS / Vue SFC 取り込みで `babel-jest` + `vue-jest` + `ts-jest` の重ね合わせが必要 |
| L4 デバッグ体験 | 5 | source map 完備、テストエクスプローラから 1 クリック Debug | 4 | VSCode で Debug 可能だが、ESM/SFC 経由ではブレーク不安定 |
| L5 VSCode 統合 | 5 | 公式 `vitest.explorer` 拡張で Run/Debug/Watch lens 完備 | 4 | `Orta.vscode-jest` あり。インライン結果は良いが Vue 構成では設定要 |
| L6 保守性 | 5 | 月次マイナーリリース、Vite 追従が即時 | 4 | Meta から OpenJS 移管後も活発だが、Vue 3 + Vite 構成へのレシピは少ない |
| L7 実行速度 | 5 | Vite の HMR と同じ転送経路で watch が秒以下 | 3 | 並列実行はあるが cold start で数秒 |
| L8 エコシステム | 4 | UI / coverage v8 / Browser Mode 等。レポータは公式 + サードパーティで充足 | 5 | プラグイン・レポータ・モック生態は依然最大 |
| **総合（加重平均）** | **4.75** | — | **3.85** | — |

> 計算例 (Vitest): 分子 = 5×1.5 + 4×1.5 + 5×1.5 + 5×1.2 + 5×1.2 + 5×1.0 + 5×1.0 + 4×1.0 = 7.5 + 6.0 + 7.5 + 6.0 + 6.0 + 5.0 + 5.0 + 4.0 = **47.0**、分母 = 1.5×3 + 1.2×2 + 1.0×3 = **9.9**、47.0 / 9.9 ≈ **4.75**
> 計算例 (Jest): 分子 = 4×1.5 + 5×1.5 + 2×1.5 + 4×1.2 + 4×1.2 + 4×1.0 + 3×1.0 + 5×1.0 = 6.0 + 7.5 + 3.0 + 4.8 + 4.8 + 4.0 + 3.0 + 5.0 = **38.1**、38.1 / 9.9 ≈ **3.85**

> ※ 上の総合スコア（4.75 / 3.85）は採点根拠を「公開資料 + 体感」で記述した暫定値。最終確定はユーザーレビュー時に L2 / L6 / L8 を中心に再評価する。
> ※ 判定: Vitest = 優秀、Jest = 良好（客観評価）。本プロジェクトでは Jest を不採用としており、これは「客観評価が低いから」ではなく「カテゴリ 1 内に Vitest が存在し、L3 既存親和性で 2 点と Vitest 5 点の差が決定的だから」である。

#### 2.1.2 採否解説

- **合意点**: どちらも describe/it/expect の Jest スタイル API、モック・スパイ・カバレッジ・スナップショットを備える
- **差分**:
  - L3 既存親和性: Vitest は Vite 設定をテストランナーがそのまま使う構造のため設定二重化が起きない。Jest はトランスフォーマー多重化が避けられない
  - L7 実行速度: Vite の dev サーバと同等の即時性を Vitest は持つ。Jest は cold start に弱い
  - L2 ドキュメント: Jest が依然優位（記事数）。ただし Vue 3 + Vite 文脈に絞ると Vitest 優位
- **本プロジェクトでの選択理由**: Vite ベースの既存資産に Jest を後付けする学習価値が薄く、設定二重化が学習者の躓きポイントになりやすい。Vitest 採用で迷う余地は小さい
- **学習者向けメモ**: 既存 Jest プロジェクトに合流するときの参考として、本書 §2.1.1 採点表の差分を読めば「なぜ Vitest が選ばれたか」を 1 ページで掴める

#### 2.1.3 プロトタイプ設計

該当なし（比較サンプル列が `—` のため、Jest 版 spec は作らない）。

### 2.2 コンポーネント API: @vue/test-utils vs Testing Library

#### 2.2.1 採点表

| 軸 | @vue/test-utils | 根拠 | Testing Library (Vue) | 根拠 |
|---|---|---|---|---|
| L1 学習コスト | 5 | 公式 (test-utils.vuejs.org) が Vue 公式で `mount` / `find` / `trigger` の 3 概念から入れる。既存 `useDemoSdk.spec.ts` でも初学者向け雛形が完成済み | 4 | 公式 (testing-library.com) は短いが `getByRole` 等の a11y セレクタ思想に慣れる学習コストが乗る（公式 + 体感） |
| L2 ドキュメント | 4 | Vue 公式 + 日本語含む Vue/Vite 記事が多数。Migration / Cookbook 完備（公式） | 4 | DOM Testing Library から派生で記事資産は厚いが、Vue 版 (testing-library/vue) の日本語記事は VTU より少なめ（公式 + 体感） |
| L3 既存親和性 | 5 | 既存 devDependencies に `@vue/test-utils ^2.4.10` あり、`frontend/src/composables/__tests__/useDemoSdk.spec.ts` で `mount` / `flushPromises` を実利用中 | 3 | 別 dep 追加 (`@testing-library/vue` + `@testing-library/jest-dom`) が必要。内部的に VTU を使うため二重採用となる（公式: "built on top of @vue/test-utils"） |
| L4 デバッグ体験 | 3 | 失敗時のセレクタヒントは Vue インスタンス志向で薄い。`wrapper.html()` で DOM ダンプは可能だが手動（体感） | 5 | 失敗時に "Unable to find element with role" 等の構造化ヒントと候補 DOM ダンプを自動表示（公式 + 体感） | 
| L5 VSCode 統合 | 5 | Vitest Explorer / Debug Lens 経由で Run/Debug 完備。VTU 固有設定なし（既存設定で動作） | 5 | 同上。テストランナー側に依存するため VTU と同点（体感） |
| L6 保守性 | 5 | Vue 公式が直接メンテ、Vue 3 系列マイナー追従が即時。v2.4.x が現行で月次パッチ（公式 GitHub） | 4 | testing-library 組織下で活発だが、Vue 版は内部の VTU メジャー追従に 1 拍遅れる傾向（体感 + GitHub release） |
| L7 実行速度 | 5 | Vitest + jsdom 上で Vue 描画のみ、watch 即時。既存 spec 9 ケースが秒以下で完了（体感） | 5 | 同一の Vitest + jsdom レイヤで動作するため実測差はほぼなし（体感） |
| L8 エコシステム | 4 | Vue 公式 + Vitest Browser Mode / coverage 等と直接統合。レポータは Vitest 側に依存（公式） | 4 | `@testing-library/jest-dom` の豊富なマッチャ、`@testing-library/user-event` 等の周辺が厚い（公式） |
| **総合（加重平均）** | **4.51** | — | **4.19** | — |

> 計算例 (VTU): 分子 = 5×1.5 + 4×1.5 + 5×1.5 + 3×1.2 + 5×1.2 + 5×1.0 + 5×1.0 + 4×1.0 = 7.5 + 6.0 + 7.5 + 3.6 + 6.0 + 5.0 + 5.0 + 4.0 = **44.6**、分母 = 1.5×3 + 1.2×2 + 1.0×3 = **9.9**、44.6 / 9.9 ≈ **4.51**（判定: 優秀）
> 計算例 (TL):  分子 = 4×1.5 + 4×1.5 + 3×1.5 + 5×1.2 + 5×1.2 + 4×1.0 + 5×1.0 + 4×1.0 = 6.0 + 6.0 + 4.5 + 6.0 + 6.0 + 4.0 + 5.0 + 4.0 = **41.5**、分母 = **9.9**、41.5 / 9.9 ≈ **4.19**（判定: 良好）

> ※ 上の総合スコア（4.51 / 4.19）は「公開資料 + 既存 spec 体感」を根拠とする暫定値。判定はそれぞれ「優秀」「良好」で、両者とも本書 §1.3 判定区分の上位帯に入る — 本プロジェクトでの実採否（VTU 採用 / TL は §2.2.3 の比較サンプル）は L3 既存親和性の差（5 対 3）に由来し、客観評価の優劣だけで決まったわけではない。

#### 2.2.2 採否解説

- **合意点**: 両者とも Vue 3 SFC の `mount` / `render`、ユーザイベント発火（VTU は `wrapper.trigger`、TL は `@testing-library/user-event`）、`@testing-library/jest-dom` 互換マッチャ、`flushPromises` / `findBy*` による非同期待機を備える。公式ドキュメントでも明記されているとおり、TL は内部的に VTU を呼び出すため両者の最終的な描画レイヤは同一
- **差分**:
  - L1 学習コスト: VTU は Vue インスタンス志向の API（`findComponent` / `vm`）が直感的で本リポジトリの既存 spec と同型。TL は a11y 志向で `getByRole` / `getByLabelText` の選定指針を別途学ぶ必要があるが、ブラウザ UA 視点でテストが書ける
  - L3 既存親和性: VTU は既存 `frontend/package.json` の devDependencies (`@vue/test-utils ^2.4.10`) と既存 spec (`useDemoSdk.spec.ts`) でそのまま使える。TL は別 dep を追加し、内部で VTU を呼ぶ二重採用となる
  - L4 デバッグ体験: TL は失敗時に「ロールで見つからない / 候補は X 個」など構造化された a11y ツリーを自動でダンプする点で優位。VTU は `wrapper.html()` を手動で出す必要がある
  - L6 保守性: VTU は Vue 公式（vuejs.org 直下リポジトリ）でメジャーバージョンの追従が早い。TL の Vue 版は VTU を依存に持つため、VTU のメジャー差分を待ってから追従する分だけ 1 拍遅れる
  - L7 / L8: 実行速度・エコシステム拡張は実質同等（同じ Vitest + jsdom 上で動くため）
- **本プロジェクトでの選択理由**: 親戦略書 §1 で VTU を採用、TL は `__samples__/comparison/testing-library/` 配下に 1 本だけ比較サンプルとして残す方針。決定の根拠は (1) L3 既存親和性の差 5 vs 3（既存 dep / 既存 spec 雛形をそのまま流用できる）、(2) TL の優位軸である L4 デバッグ体験は §2.2.3 プロトタイプ仕様で「同一シナリオを 2 種類のセレクタで書き比べる」サンプルとして残せば学習効果が得られる、の 2 点。客観評価では VTU 4.51 (優秀) / TL 4.19 (良好) と両者とも上位帯のため、TL を「学習サンプル枠で残す」判断は妥当
- **学習者向けメモ**: 以下のいずれかに該当する場合は TL への切り替えを検討する余地がある: (a) アクセシビリティ要件（WAI-ARIA ロール / ラベル）をテストで担保したい、(b) React Testing Library から合流した開発者がチームに加わる、(c) E2E（Cypress / Playwright）と同じ「ユーザ視点セレクタ」をユニットテストでも揃えたい。本プロジェクトでは §2.2.3 の比較サンプル 1 本でこれらの感触を体験できるよう設計してある

#### 2.2.3 プロトタイプ設計

- **対象シナリオ**: `BridgeDemoView` または `ListView` の「初期描画 → ボタンクリック → 一覧件数の増加」を 1 シナリオで揃える（既存 `useDemoSdk` ペアと整合）
- **採用品ペア**: `frontend/src/views/__tests__/BridgeDemoView.spec.ts`（VTU 版、親戦略書 P3 で実装予定）
- **比較サンプル配置**: `frontend/__samples__/comparison/testing-library/BridgeDemoView.tl.spec.ts`
- **ペアリング方針**:
  - 同じシナリオ（initialState / firstAction / finalState）を Arrange-Act-Assert で揃える
  - セレクタは VTU 版 `findComponent` / `find('[data-testid]')`、TL 版 `getByRole` / `getByText` で揃える
  - 失敗時の出力差を「セレクタ可視性」「render の差分」として §2.2.2 採否解説に書き戻す
- **評価観点**:
  1. アクセシビリティ志向セレクタ（TL）と DOM 直接セレクタ（VTU）の読みやすさの差
  2. Vue リアクティビティ更新を待つ書き方（`await nextTick()` vs `findByText`）
  3. Ionic Web Components の Shadow DOM 越境の取り扱い差

### 2.3 DOM 環境: jsdom vs happy-dom

#### 2.3.1 採点表

| 軸 | jsdom | 根拠 | happy-dom | 根拠 |
|---|---|---|---|---|
| L1 学習コスト | 5 | Vitest デフォルトの `environment: 'jsdom'` 1 行で導入完了。新概念ゼロ（既存 `frontend/vite.config.ts` でも適用済み） | 4 | `environment: 'happy-dom'` への切替自体は易しいが、jsdom にしかない API を踏んだ際の差分把握が要る（公式 Wiki + 体感） |
| L2 ドキュメント | 5 | 10 年超の蓄積で StackOverflow 解答・日本語記事ともに豊富。公式 README + 328 リリースのチェンジログ（GitHub） | 3 | 公式 Wiki と GitHub Discussion が主、日本語記事は jsdom より少ない（公式 + 体感） |
| L3 既存親和性 | 5 | 既存 devDep に `jsdom ^22.1.0`、Vitest 設定で `environment: 'jsdom'`。Ionic Web Components / Shadow DOM を含む Vue 描画で実績多数（既存コード） | 3 | 別 dep 追加 + 設定差し替えが要る。親戦略書 §1.1 のとおり Ionic / Vue 描画で jsdom より不安定なケースが報告されている（GitHub Issues + 体感） |
| L4 デバッグ体験 | 4 | DOM API のエラー出力が仕様に近く、Shadow DOM の挙動も標準準拠で読み解きやすい（公式 + 体感） | 3 | 速度優先でエッジケース実装を省くため、未実装 API を踏むと "is not a function" 等で失敗位置が分かりにくい（GitHub Discussion #1438 + 体感） |
| L5 VSCode 統合 | 4 | DOM 環境自体に VSCode 拡張はなく、Vitest Explorer 経由で Run/Debug 完備（体感） | 4 | 同上。Vitest 拡張が環境名を吸収するため jsdom と同点（体感） |
| L6 保守性 | 5 | 2026/04 に v29 系をリリース、328 リリースの実績で月次マイナー級の追従（GitHub releases） | 4 | 活発に更新され Vitest 公式が「将来のデフォルト候補」として言及するほどだが、メジャー破壊が jsdom より頻繁（GitHub releases） |
| L7 実行速度 | 3 | 完全実装のオーバーヘッドで happy-dom 比 2-4 倍遅い（公開ベンチ: pkgpulse 2026 / Vitest Discussion #1607） | 5 | 公開ベンチで jsdom 比 2-4x、シナリオによっては 5-10x の高速性。Vitest Discussion #1607 でも採用理由のトップ |
| L8 エコシステム | 5 | Vue / React / Jest / Vitest など主要テストツール群のデフォルト DOM 環境。`canvas` / `tough-cookie` 等の周辺 dep も成熟（公式） | 4 | Vitest / Bun / Lit Element と直接統合、レポータは Vitest 側に依存。新興だが採用例は急増中（公式 + 体感） |
| **総合（加重平均）** | **4.56** | — | **3.68** | — |

> 計算例 (jsdom): 分子 = 5×1.5 + 5×1.5 + 5×1.5 + 4×1.2 + 4×1.2 + 5×1.0 + 3×1.0 + 5×1.0 = 7.5 + 7.5 + 7.5 + 4.8 + 4.8 + 5.0 + 3.0 + 5.0 = **45.1**、分母 = 1.5×3 + 1.2×2 + 1.0×3 = **9.9**、45.1 / 9.9 ≈ **4.56**（判定: 優秀）
> 計算例 (happy-dom): 分子 = 4×1.5 + 3×1.5 + 3×1.5 + 3×1.2 + 4×1.2 + 4×1.0 + 5×1.0 + 4×1.0 = 6.0 + 4.5 + 4.5 + 3.6 + 4.8 + 4.0 + 5.0 + 4.0 = **36.4**、分母 = **9.9**、36.4 / 9.9 ≈ **3.68**（判定: 良好）

> ※ 上の総合スコア（4.56 / 3.68）は「公開ベンチ + 公式ドキュメント + 既存 spec 体感」を根拠とする暫定値。本プロジェクトでの実採否（jsdom 採用 / happy-dom 不採用）は L3 既存親和性の差（5 対 3）と L7 速度優位を相殺する L4 デバッグ安定性の差（4 対 3）に由来し、客観評価では happy-dom も「良好」帯に届く。

#### 2.3.2 採否解説

- **合意点**: 両者とも Vitest の `environment` 切替で導入でき、Document / Window / Element / Event の基本 DOM API を実装する。Vue 3 SFC の描画と `@vue/test-utils` の `mount` / `flushPromises` の挙動は基本シナリオでは差が出ない。Shadow DOM・Custom Elements・MutationObserver も両者がサポートを謳う（公式）
- **差分**:
  - L3 既存親和性: jsdom は既存 `frontend/package.json` devDep + `frontend/vite.config.ts` の `environment: 'jsdom'` でゼロ手数。happy-dom は別 dep 追加 + 設定差し替えが必要で、Ionic Shadow DOM 検証では未実装 API を踏みやすいという既知の不安定さがある（親戦略書 §1.1）
  - L4 デバッグ体験: jsdom は仕様準拠の実装で「なぜ失敗したか」が DOM 標準仕様にひもづいて読める。happy-dom は速度優先で省略された API に当たると失敗箇所が分かりにくく、未実装かバグかの切り分けに時間を要する（GitHub Discussion #1438 + 体感）
  - L7 実行速度: 公開ベンチ（pkgpulse 2026 / Vitest Discussion #1607）で happy-dom が jsdom 比 2-4x、シナリオによっては 5-10x 高速。テストスイートが大規模化するほど効果が顕著
  - L2 ドキュメント / L8 エコシステム: 10 年超の蓄積を持つ jsdom がいまだ優位。日本語記事と StackOverflow 解答の厚みで学習導線が短い
- **本プロジェクトでの選択理由**: 親戦略書 §1.1 のとおり「速度メリットはあるが、Ionic / Vue 描画の検証で jsdom より不安定なケースがある」を最優先で採用判断。本リポジトリの主目的は「学習用テストパターン集」であり、既存 `useDemoSdk.spec.ts` を含む Ionic / Vue 描画シナリオで安定したパスを学習者に提供することが速度より重要。L3 既存親和性の差（5 対 3）と L4 デバッグ体験の差（4 対 3）が決定打。happy-dom は客観評価では「良好」帯（3.68）に届くものの、本プロジェクトのカテゴリ 3 では採用しない
- **学習者向けメモ**: 以下のいずれかに該当する場合は happy-dom への切り替えを検討する余地がある: (a) テスト本数が数百本規模に膨らみ Vitest watch のフィードバックループ短縮が学習速度に直結する、(b) Shadow DOM / Web Components を使わない素の Vue / React コンポーネントのみをテストする、(c) CI コスト削減が学習継続性より優先度高くなった場合。Vitest は `// @vitest-environment happy-dom` のファイル単位コメントで部分採用が可能なので、L7 速度メリットを Ionic 非依存スペックだけに限って取り込む「混在運用」も選択肢になる

#### 2.3.3 プロトタイプ設計

該当なし（比較サンプル列が `—` のため、happy-dom 版 spec は作らない）。採否は §2.3.2 まで。

### 2.4 HTTP モック: MSW vs nock vs axios-mock-adapter

#### 2.4.1 採点表

| 軸 | MSW | 根拠 | nock | 根拠 | axios-mock-adapter | 根拠 |
|---|---|---|---|---|---|---|
| L1 学習コスト | 4 | `http.get('/api/items', () => HttpResponse.json(...))` の handler 概念は直感的だが、Service Worker 登録 (`browser.ts` + `public/mockServiceWorker.js`) と Node setup の二経路を理解する必要あり（公式 + 既存 `frontend/src/mocks/browser.ts`） | 4 | `nock(host).get(path).reply(status, body)` のチェーン API は短く、Node 開発者には馴染みが深い。ただし `nock.restore()` / `nock.cleanAll()` 等のライフサイクル管理を別途学ぶ必要あり（公式 README + GitHub Issues） | 5 | `mock.onGet('/api/items').reply(200, data)` の 1 行で完結。axios を知っていれば即書ける最小 API（公式 README） |
| L2 ドキュメント | 5 | mswjs.io が章立てされ、Vitest / Jest / Playwright / Storybook 個別のレシピが網羅。日本語記事も Vue/Vite 文脈で充実（公式 + 体感） | 4 | 13 年級の蓄積で StackOverflow 解答多数、200+ リリース。ただし fetch / ESM 周りの落とし穴は GitHub Issues 散在で公式 README からは追いにくい（公式 + GitHub） | 3 | README 単一ページ中心で詳細は型定義に頼る。日本語記事は axios 利用者向けに一定数あるが MSW / nock より薄い（公式 + 体感） |
| L3 既存親和性 | 5 | 既存 `frontend/package.json` に `msw ^2.14.4`、`frontend/src/mocks/handlers.ts` で Orval 生成 handler (`generatedHandlers`) と Orval-default mock (`getDefaultMock()`) を合成済み。Vitest setup と Cypress dev サーバ双方から同一 handler を再利用できる（既存コード） | 2 | Node の `http` モジュールを横取りする方式のため、ブラウザ実行（Cypress / Storybook / `npm run dev`）では機能しない。本プロジェクトでは Vitest（jsdom）と Cypress dev 両方を覆う MSW のリプレースになり得ず、用途が Vitest 専用へ縮退する（公式 + 体感） | 3 | `axiosInstance` (`frontend/src/api/axios.ts`) には適用可能だが、Orval は `fetch` 化された generator にも対応しており現状の axios 経路 1 本に縛られる。Cypress 経路や fetch 直叩きコードからは無効（公式 + 既存コード） |
| L4 デバッグ体験 | 5 | DevTools の Network タブに `[MSW]` プレフィックス付きでリクエストが可視化され、ハンドラ未マッチ時の警告が一覧で出る。Service Worker ログは Chrome の Application パネルでも追跡可能（公式 + 体感） | 3 | unmatched request の警告は console に出るが Node 側のみ。`nock.recorder` で再現は取れるものの、失敗時に「どの handler に当たらなかったか」を辿るのが MSW より煩雑（公式 + GitHub Discussions） | 3 | `mock.history.get` でリクエスト履歴を取得できる程度。失敗時の出力は axios の `AdapterError` 経由で、Vue/Vitest のスタックトレースとの結びつきが弱い（公式 + 体感） |
| L5 VSCode 統合 | 4 | Vitest Explorer / Cypress 拡張経由で MSW 利用テストを Run/Debug 可能。MSW 固有の拡張はないが Service Worker レイヤを意識する必要はない（体感） | 4 | Vitest Explorer 経由で動作。nock 固有の拡張はなく、テストランナー側に統合は依存（体感） | 4 | 同上。axios-mock-adapter 固有の拡張はなく、Vitest Explorer 経由で動作（体感） |
| L6 保守性 | 5 | mswjs/msw は月次マイナーリリース、`^2.14.4` が現行。v2 系で fetch API ベースに刷新済みで Node 20+ / Vitest との追従が早い（公式 GitHub releases） | 5 | v14.0.15 (2026/05) で 200+ リリース、約 13.1k stars。アクティブメンテで Node マイナー追従も継続（公式 GitHub） | 3 | v2.1.0 (2024/10) を最後にリリース間隔が伸び、axios v1 系の API 変更追従はあるが、release cadence は MSW / nock より遅い（公式 GitHub） |
| L7 実行速度 | 5 | Vitest + jsdom 上の handler 実行は同期に近い軽量パスで、既存 `useDemoSdk.spec.ts` 周辺の spec が秒以下で完了（体感） | 5 | Node `http.request` を直接差し替えるため極めて軽量。Vitest との組み合わせでも体感差は出ない（体感 + GitHub README） | 5 | axios adapter 差し替えのみでネットワーク往復ゼロ。3 者中もっとも単純な経路で実速度は同等（体感） |
| L8 エコシステム | 5 | REST + GraphQL の両対応、Orval / OpenAPI 連携、Playwright / Storybook 公式レシピ、`workerDirectory` で SW ファイルを自動配置するなど周辺ツール群が厚い（公式 + 既存 `package.json` の `msw.workerDirectory`） | 3 | `nockBack` の record/replay、event hooks 等の専用機能はあるが、対象が Node HTTP に限定されエコシステムの広がりは MSW 比で限定的（公式 README） | 2 | axios 専用のため fetch / GraphQL / Service Worker / E2E ランナー連携いずれも対象外。ブラウザ + Node 双方で動くが、現代の Web スタックでは選択肢が axios 完結 SPA に限定される（公式） |
| **総合（加重平均）** | **4.73** | — | **3.68** | — | **3.53** | — |

> 計算例 (MSW): 分子 = 4×1.5 + 5×1.5 + 5×1.5 + 5×1.2 + 4×1.2 + 5×1.0 + 5×1.0 + 5×1.0 = 6.0 + 7.5 + 7.5 + 6.0 + 4.8 + 5.0 + 5.0 + 5.0 = **46.8**、分母 = 1.5×3 + 1.2×2 + 1.0×3 = **9.9**、46.8 / 9.9 ≈ **4.73**（判定: 優秀）
> 計算例 (nock): 分子 = 4×1.5 + 4×1.5 + 2×1.5 + 3×1.2 + 4×1.2 + 5×1.0 + 5×1.0 + 3×1.0 = 6.0 + 6.0 + 3.0 + 3.6 + 4.8 + 5.0 + 5.0 + 3.0 = **36.4**、分母 = **9.9**、36.4 / 9.9 ≈ **3.68**（判定: 良好）
> 計算例 (axios-mock-adapter): 分子 = 5×1.5 + 3×1.5 + 3×1.5 + 3×1.2 + 4×1.2 + 3×1.0 + 5×1.0 + 2×1.0 = 7.5 + 4.5 + 4.5 + 3.6 + 4.8 + 3.0 + 5.0 + 2.0 = **34.9**、分母 = **9.9**、34.9 / 9.9 ≈ **3.53**（判定: 良好）

> ※ 上の総合スコア（4.73 / 3.68 / 3.53）は「公開資料（mswjs.io / nock README / axios-mock-adapter README）+ 既存 `frontend/src/mocks/handlers.ts` 体感」を根拠とする暫定値。本プロジェクトでの実採否（MSW 採用 / nock・axios-mock-adapter 不採用）は L3 既存親和性の差（5 / 2 / 3）と L8 エコシステムの差（5 / 3 / 2）に由来し、nock・axios-mock-adapter とも客観評価では「良好」帯（≥3.5）に届く — つまり「学習サンプル集としての客観評価」と「本プロジェクトで採用すべきか」が別軸である §1.3 の原則どおりの結果になっている。

#### 2.4.2 採否解説

- **合意点**: 3 者とも REST API のリクエスト/レスポンスを差し替えるためのインターセプト機構を提供し、status / body / headers の制御、エラーレスポンス模倣、リクエスト履歴の検証が可能。TypeScript 型定義を同梱し、Vitest / Jest 等のテストランナーから利用できる
- **差分**:
  - L3 既存親和性: 介入レイヤの差が決定的。**MSW** は Service Worker（ブラウザ）+ Node interceptor（テスト）の二刀流で、本プロジェクトの Vitest（jsdom）/ `npm run dev` / Cypress dev サーバの 3 経路を単一 handler で覆える。**nock** は Node の `http.request` 差し替え専用でブラウザ実行（Cypress / dev サーバ）からは見えない。**axios-mock-adapter** は `axiosInstance` のアダプタ層に依存するため、Orval が将来 fetch 経路に切り替わったり、E2E から実 fetch を叩いたりすると素通りする
  - L4 デバッグ体験: MSW は DevTools Network タブに `[MSW]` プレフィックスで可視化され、未マッチハンドラの警告が一覧化される（公式 + 体感）。nock / axios-mock-adapter は console ログとリクエスト履歴 API に頼り、Vue 描画失敗との結びつけに 1 段追加情報が要る
  - L8 エコシステム: MSW は REST + GraphQL + Orval + OpenAPI + Playwright + Storybook の連携が公式レシピ化。nock は Node HTTP record/replay（`nockBack`）に特化、axios-mock-adapter は axios の上にしか展開せず周辺ツールがほぼない
  - L1 学習コスト: 単純な API という観点では axios-mock-adapter（5）> MSW（4）= nock（4）。ただし「複数経路を 1 handler で覆える」という構造的な学習価値は MSW のみが提供する
  - L6 保守性: MSW（月次マイナー、Node 20+/Vitest 追従が即時）と nock（v14、200+ release）はともに活発。axios-mock-adapter は v2.1.0 (2024/10) でリリース間隔が伸び気味
- **本プロジェクトでの選択理由**: (1) 既存 `frontend/src/mocks/handlers.ts` が Orval 生成 handler (`generatedHandlers`) と Orval-default mock (`getDefaultMock()`) を合成する MSW パイプを採用済みで、Vitest（jsdom）+ Cypress dev サーバ + `npm run dev` の 3 経路を単一 handler で覆える L3 既存親和性が圧倒的（MSW=5 / nock=2 / axios-mock-adapter=3）。(2) 親戦略書 §1 の Orval + OpenAPI examples パイプ（§2.9）との接続点が公式レシピとして提供されており、L8 エコシステムも MSW 優位（5 vs 3 vs 2）。(3) Service Worker レイヤでの可視化が PR レビュー時の「どの API が叩かれたか」を追いやすく、学習サンプル集としての教材価値が高い
- **学習者向けメモ**: 以下の場合は nock / axios-mock-adapter への切り替えが選択肢になる: (a) **nock**: Node CLI ツール（SSR / バッチ / npm script）から外部 API を叩くテストを書きたく、ブラウザ実行を一切伴わない場合。`nockBack` の record/replay で実 API レスポンスをスナップショット化する学習にも適する。(b) **axios-mock-adapter**: axios で完結する SPA で Service Worker を導入したくない（GitHub Pages 等で `mockServiceWorker.js` の配置が難しい）か、テスト内で `mock.history.post` を使った詳細なリクエストアサーションを最短コードで書きたい場合。どちらも「介入レイヤを 1 つに絞る単純さ」が学習の入口に向くが、Cypress dev / Storybook / GraphQL に拡張する局面で MSW へ戻す前提で採用する

#### 2.4.3 プロトタイプ設計

該当なし（比較サンプル列が `—` のため、nock 版 / axios-mock-adapter 版 spec は作らない）。採否は §2.4.2 まで。

### 2.5 E2E: Cypress vs Playwright vs WebdriverIO

#### 2.5.1 採点表

| 軸 | Cypress | 根拠 | Playwright | 根拠 | WebdriverIO | 根拠 |
|---|---|---|---|---|---|---|
| L1 学習コスト | 5 | `cy.visit` → `cy.contains` → `cy.click` の chain API で同期的に読める。既存 `tests/e2e/specs/items-flow.cy.ts` が 21 行で完結し、自動ウェイトのおかげで `await` 不要（公式 + 既存コード） | 4 | `page.goto` / `page.locator` は直感的だが、すべて `await` 必須で Promise を理解していないと躓く。代わりに `codegen` で操作を録画してコード生成できる学習導線あり（公式 + 体感） | 3 | WebDriver プロトコル + service / capabilities / Mocha 連携の概念を順に学ぶ必要があり、「最初の 1 本」までの距離が長い。sync/async モードの歴史的経緯も学習者を混乱させる（公式 + 体感） |
| L2 ドキュメント | 5 | docs.cypress.io は章立て + Recipes + 公式ブログ + Discord が厚く、日本語記事と StackOverflow 解答は E2E 系最多（公式 + 体感） | 5 | playwright.dev は API リファレンス・Best Practices・Trace Viewer ガイドが章立てで揃い、Microsoft 公式ブログ + YouTube + 日本語記事も急増中（公式 + 体感） | 4 | webdriver.io 公式は完成度が高く Mocha / Jasmine / Cucumber 連携も網羅。ただし日本語記事は Cypress / Playwright と比べて 1 段薄い（公式 + 体感） |
| L3 既存親和性 | 5 | 既存 devDep に `cypress ^13.5.0` + `cypress-multi-reporters ^2.0.5` + `mochawesome` + `mocha-junit-reporter`、`frontend/cypress.config.ts` で mochawesome / junit 出力が稼働中、`tests/e2e/specs/items-flow.cy.ts` も実装済み（既存コード） | 3 | 別 dep（`@playwright/test` + ブラウザバイナリ ~300MB）追加と独立 config が必要。Vite dev サーバとは共存可能で MSW handler を再利用できる（公式 + 体感） | 2 | 既存 dep 未導入。`@wdio/cli` + `wdio.conf.ts` + services + reporters を独自構成で立てる必要があり、本リポジトリの Cypress 既存パイプとは完全に別系統になる（公式 + 体感） |
| L4 デバッグ体験 | 5 | Test Runner の time-travel snapshot で各コマンドの DOM 状態を遡れる、`cypress open` の対話モードで失敗箇所の DOM / Network が即可視化、`cy.pause()` / `.debug()` の介入も容易（公式 + 体感） | 5 | Trace Viewer がタイムライン + DOM スナップ + Network + Console + Source を 1 枚で見せ、`--ui` mode の watch + filter + step、`codegen` の逆方向利用で再現コードを生成できる（公式 + 体感） | 3 | `browser.debug()` で REPL を開ける程度。time-travel / Trace Viewer 相当の DOM タイムライン UI はなく、失敗時のスクショとログ + DevTools 接続に頼る（公式 + 体感） |
| L5 VSCode 統合 | 4 | 公式 `cypress.vscode-cypress` 拡張で Run/Debug 可能。Vitest Explorer ほど Watch lens は強くないが、`cypress open` がプロセス常駐するため tasks.json + 外部 launcher の運用が標準（公式 + 体感） | 4 | 公式 `ms-playwright.playwright` 拡張で Run/Debug/Record/Pick Locator が揃う。テストエクスプローラ統合は Cypress と同等か少し上だが、Vue 開発者の利用例は Cypress より少ない（公式 + 体感） | 3 | `wdio-vscode-service` 等のサードパーティ拡張はあるが普及度が低く、Run/Debug の事実上標準は確立していない（公式 + 体感） |
| L6 保守性 | 4 | 月次マイナーリリース、Chrome / Firefox / Edge 追従は速い。ただし v13 から v14 で WebDriver BiDi 移行を含む破壊変更があり、移行時に config / plugin の書き換えが要る（公式 GitHub releases） | 5 | Microsoft メンテで月次マイナー、ブラウザバージョン追従が即時、メジャーリリースの移行ガイドも丁寧。release cadence は 3 候補で最も予測可能（公式 GitHub releases） | 4 | OpenJS 配下で活発、v9 系で ESM/TS 対応が前進。メジャー移行（v7→v8→v9）は破壊が大きく、services 系プラグインの追従が 1 拍遅れる傾向（公式 GitHub releases） |
| L7 実行速度 | 3 | 既定は単一ブラウザの逐次実行で、`cypress run` の cold start に数秒、フル動作で spec あたり 10-30 秒。並列実行は Cypress Cloud / `--parallel` の sharding が前提（公式 + 体感） | 5 | worker 並列実行と複数ブラウザ並走が標準、`fullyParallel: true` で 1 spec 内の test も並列化可能。公開ベンチで Cypress 比 2-3 倍高速の報告多数（公式 + 体感） | 4 | parallel runner で複数 capability 並走が可能だが、WebDriver プロトコル経由のオーバーヘッドで Playwright の CDP 直叩きには劣る。Cypress の単一ブラウザよりは速い（公式 + 体感） |
| L8 エコシステム | 5 | mochawesome / mocha-junit-reporter / Cypress Cloud / Percy / Applitools 等のプラグイン市場が成熟、既存 `cypress.config.ts` でも `cypress-multi-reporters` 経由で 2 レポータを併用済み（既存コード + 公式） | 5 | HTML report / JUnit / JSON / allure / GitHub Actions 公式アクション、`trace` / `codegen` / `Pick Locator` / Component Testing / API Testing と機能群が広い（公式） | 4 | service 機構（Sauce Labs / BrowserStack / Appium / Electron / Visual Regression）が広大で、モバイル / デスクトップ込みの統合テストに強い。Web E2E 単独だと過剰機能（公式） |
| **総合（加重平均）** | **4.58** | — | **4.42** | — | **3.30** | — |

> 計算例 (Cypress): 分子 = 5×1.5 + 5×1.5 + 5×1.5 + 5×1.2 + 4×1.2 + 4×1.0 + 3×1.0 + 5×1.0 = 7.5 + 7.5 + 7.5 + 6.0 + 4.8 + 4.0 + 3.0 + 5.0 = **45.3**、分母 = 1.5×3 + 1.2×2 + 1.0×3 = **9.9**、45.3 / 9.9 ≈ **4.58**（判定: 優秀）
> 計算例 (Playwright): 分子 = 4×1.5 + 5×1.5 + 3×1.5 + 5×1.2 + 4×1.2 + 5×1.0 + 5×1.0 + 5×1.0 = 6.0 + 7.5 + 4.5 + 6.0 + 4.8 + 5.0 + 5.0 + 5.0 = **43.8**、分母 = **9.9**、43.8 / 9.9 ≈ **4.42**（判定: 良好）
> 計算例 (WebdriverIO): 分子 = 3×1.5 + 4×1.5 + 2×1.5 + 3×1.2 + 3×1.2 + 4×1.0 + 4×1.0 + 4×1.0 = 4.5 + 6.0 + 3.0 + 3.6 + 3.6 + 4.0 + 4.0 + 4.0 = **32.7**、分母 = **9.9**、32.7 / 9.9 ≈ **3.30**（判定: 要注意）

> ※ 上の総合スコア（4.58 / 4.42 / 3.30）は「公開資料（docs.cypress.io / playwright.dev / webdriver.io）+ 既存 `frontend/cypress.config.ts` / `tests/e2e/specs/items-flow.cy.ts` 体感」を根拠とする暫定値。Cypress は判定「優秀」、Playwright は「良好」帯の上位で両者の差は L3 既存親和性（5 対 3）と L7 実行速度（3 対 5）が相殺し、僅差で Cypress が上回る。WebdriverIO は判定「要注意」で、本プロジェクトの「学習サンプル集」目的では Cypress vs Playwright の対比で十分に学習導線が確保できるため不採用 — §1.3 の判定区分どおり「単独採用には弱いが、教材として比較対象にする価値はあるか」を §2.5.2 で検討する。

#### 2.5.2 採否解説

- **合意点**: 3 者とも実ブラウザ（または Chromium / Firefox / WebKit）に対するエンドツーエンド操作（visit / click / type / assertion）、ネットワークインターセプト、スクリーンショット、レポーター出力（JUnit / HTML）、CI 連携を提供する。TypeScript 型定義を同梱し、Vue / Ionic を含む SPA の「ユーザ視点シナリオ」を 1 ファイルで完結させられる
- **差分**:
  - L1 学習コスト: **Cypress** の chain API は自動ウェイト付きで同期的に読め、初学者の「await を忘れて flaky」事故が起きない。**Playwright** はすべて `await` 必須で Promise 理解が前提だが `codegen` で操作録画 → コード生成の学習導線あり。**WebdriverIO** は WebDriver 仕様 + service / capability 概念が積層し、「最初の 1 本」まで距離が長い
  - L3 既存親和性: 差が決定的。**Cypress** は既存 `cypress.config.ts` + `cypress-multi-reporters` + mochawesome / junit パイプが稼働中で、`tests/e2e/specs/items-flow.cy.ts` も実装済み（5 点）。**Playwright** は別 dep + ブラウザバイナリ ~300MB + 独立 config が必要（3 点）。**WebdriverIO** は既存パイプから完全に別系統で学習価値の対比が薄い（2 点）
  - L4 デバッグ体験: Cypress の time-travel snapshot と Playwright の Trace Viewer はそれぞれ別方向に強力で同点（5 / 5）。WebdriverIO は `browser.debug()` REPL に留まり 1 段見劣りする（3）
  - L7 実行速度: **Playwright** の worker 並列 + 複数ブラウザ並走（5 点）が **Cypress** の単一ブラウザ逐次（3 点）を明確に上回り、テストスイートが大規模化した際に効いてくる。**WebdriverIO** はその中間（4 点）
  - L8 エコシステム: Cypress / Playwright は機能群の方向性が異なるが両者とも 5 点圏（Cypress=プラグイン市場 / Cloud、Playwright=codegen / trace / Component Testing）。WebdriverIO は service 機構（Appium / BrowserStack 連携）に強みがあるが Web E2E 単独だと過剰機能
- **本プロジェクトでの選択理由**: 親戦略書 §1.1「**E2E は Cypress + Playwright 比較で十分。学習サンプルとしての差別化が薄い（WebdriverIO 不採用理由）**」を直接の根拠とし、(1) L3 既存親和性の差（Cypress=5 / Playwright=3 / WebdriverIO=2）が決定打、(2) Cypress の time-travel と Playwright の Trace Viewer は「同シナリオを 2 手法で比較する」教材として読み合わせ価値が高く §2.5.3 プロトタイプ設計で `items-flow` 動線を両者で揃える方針、(3) WebdriverIO は L1 / L3 / L4 すべてで Cypress・Playwright に対して劣後し、客観評価でも「要注意」帯のため学習サンプルとしての残置も見送る、の 3 点。客観評価では Cypress=4.58（優秀）/ Playwright=4.42（良好）と両者が上位帯のため、Playwright を比較サンプル枠で残す判断は妥当
- **学習者向けメモ**: 以下のいずれかに該当する場合は Playwright / WebdriverIO への切り替えを検討する余地がある: (a) **Playwright**: テストスイートが数百本規模に膨らみ CI 実行時間が学習継続性を下げ始めた場合（L7 並列実行のメリットが顕在化）、Vue/Vite と独立した「フレームワーク非依存の E2E」を学びたい場合、API テスト + Component Testing + Visual Regression を 1 ツールで統合したい場合。本書 §2.5.3 のプロトタイプサンプル 1 本で書き心地を体感できる。(b) **WebdriverIO**: モバイル（Appium）+ デスクトップ（Electron）+ Web を同一テストランナーで束ねたい場合、Sauce Labs / BrowserStack のクラウド実行を主目的にする場合、Cucumber BDD と E2E を統合したい場合。Web 単独の SPA テストで採用するメリットは薄いため、本プロジェクトの教材枠では §2.5.1 採点表で「不採用判断の客観根拠」を学ぶ材料として残す

#### 2.5.3 プロトタイプ設計（Cypress vs Playwright）

- **対象シナリオ**: `items-flow`（List → Detail → Create → Delete）を 1 動線で揃える。MSW シナリオは `two_items` 固定
- **採用品ペア**: `frontend/tests/e2e/specs/items-flow.cy.ts`（親戦略書 P3 で実装予定）
- **比較サンプル配置**: `frontend/__samples__/comparison/playwright/items-flow.spec.ts`
- **ペアリング方針**:
  - dev サーバは共通（別ターミナルで `npm run dev`、MSW 込み）
  - fixture 参照パスを揃える（`tests/e2e/fixtures/items.json` を両者から参照）
  - スクショは Cypress 既定 / Playwright trace の両方を取得して `__samples__/comparison/playwright/test-results/` に出す
- **評価観点**:
  1. 同期 API（Cypress chain）vs 非同期 await（Playwright）の読みやすさ
  2. ネットワークインターセプト（`cy.intercept` vs `page.route`）の制御性
  3. デバッグ体験（Cypress Test Runner の time-travel vs Playwright Trace Viewer）
  4. CI 実行時間（Phase 8 採用時の参考データ）

WebdriverIO は比較サンプル枠外（採点のみ）。

### 2.6 ブリッジモック: vi.mock パターン vs Capacitor 公式 mock パターン

#### 2.6.1 採点表

| 軸 | vi.mock パターン | 根拠 | Capacitor 公式 mock パターン | 根拠 |
|---|---|---|---|---|
| L1 学習コスト | 5 | `vi.mock('@/native/demo-sdk-bridge', () => ({...}))` + 必要なら `vi.hoisted` の 2 概念で書き始められる。既存 `useDemoSdk.spec.ts` がそのまま雛形になる（公式 vitest.dev/api/vi.html + 既存コード） | 3 | `WebPlugin` 継承 + `DemoSdkBridgePlugin` interface 実装 + `registerPlugin` 再呼び出しの 3 概念を学ぶ必要あり。公式の "EchoPlugin" サンプルから派生させる手順を踏む（公式 capacitorjs.com/docs/plugins/web + 体感） |
| L2 ドキュメント | 4 | Vitest 公式 `vi.mock` 章が hoisting / factory / `importOriginal` / `spy: true` まで網羅、Jest 互換で日本語記事資産も流用可能。ただし `vi.hoisted` の落とし穴説明はやや難（公式 + 体感） | 3 | Capacitor 公式 `Plugin > Web` ガイドは Web 実装の書き方を示すが「テスト用 mock」の節は薄く、`registerPlugin` をテスト内で呼び直す具体例は Discord / GitHub Discussion 散在（公式 + 体感） |
| L3 既存親和性 | 5 | 既存 `frontend/src/composables/__tests__/useDemoSdk.spec.ts` で `vi.mock('@/native/demo-sdk-bridge') + vi.hoisted` パターンが稼働中。9 ケースが既にこの形式で書かれており追加学習コストゼロ（既存コード） | 4 | 既存 `frontend/src/native/demo-sdk-bridge/{index,definitions}.ts` の `DemoSdkBridgePlugin` interface + `registerPlugin` 構成にそのまま乗る。Capacitor 流儀との整合は良いが、テスト spec 側の雛形は新規作成（既存コード + 公式） |
| L4 デバッグ体験 | 3 | hoisting で書き順を直感に反して読まされる、`tsconfig.json` の `paths` エイリアスが factory 内で解決されない、factory の返り値は型推論されず手動キャスト必要 — 失敗時の原因切り分けに 1 段追加情報が要る（公式 caveat + 体感） | 4 | `DemoSdkBridgePlugin` interface 実装側で型補完が効き、未実装メソッドは `this.unimplemented()` で明示的に落とせる。`Unavailable` / `Unimplemented` の標準エラーパターンが Capacitor 全体で揃う（公式） |
| L5 VSCode 統合 | 5 | Vitest Explorer / Debug Lens 経由で Run/Debug 完備、vi.mock 固有設定なし（体感） | 5 | 同上。Vitest ランナー側に依存するため vi.mock と同点（体感） |
| L6 保守性 | 5 | Vitest は月次マイナーで `vi.mock` API は v0.x→v1.x→v3.x を通じて後方互換を維持、`vi.hoisted` / `spy: true` 等の機能追加も非破壊（公式 GitHub releases） | 5 | `@capacitor/core` の `WebPlugin` / `registerPlugin` API は v3→v6 で安定継続、月次追従に乗る（公式 GitHub releases） |
| L7 実行速度 | 5 | モジュール解決時に factory を実行して差し替えるだけで実行コスト極小、Vitest watch のフィードバックは秒以下（体感） | 5 | `registerPlugin` の戻り値オブジェクト差し替えだけで同じく軽量、vi.mock との実速度差はほぼなし（体感） |
| L8 エコシステム | 4 | Vitest 公式 API として位置付け、Jest `jest.mock` 互換で Stack Overflow 解答多数。ただし Capacitor / Web Components 固有レシピは vi.mock 公式ドキュメント外（公式 + 体感） | 5 | Capacitor 全プラグイン（Geolocation / Camera / Filesystem 等）共通の Web fallback パターンで、実機 / Web / テストの 3 経路を同一の `WebPlugin` 派生クラスで統一できる。エコシステム横断の学習価値が高い（公式） |
| **総合（加重平均）** | **4.51** | — | **4.12** | — |

> 計算例 (vi.mock): 分子 = 5×1.5 + 4×1.5 + 5×1.5 + 3×1.2 + 5×1.2 + 5×1.0 + 5×1.0 + 4×1.0 = 7.5 + 6.0 + 7.5 + 3.6 + 6.0 + 5.0 + 5.0 + 4.0 = **44.6**、分母 = 1.5×3 + 1.2×2 + 1.0×3 = **9.9**、44.6 / 9.9 ≈ **4.51**（判定: 優秀）
> 計算例 (Capacitor 公式 mock): 分子 = 3×1.5 + 3×1.5 + 4×1.5 + 4×1.2 + 5×1.2 + 5×1.0 + 5×1.0 + 5×1.0 = 4.5 + 4.5 + 6.0 + 4.8 + 6.0 + 5.0 + 5.0 + 5.0 = **40.8**、分母 = **9.9**、40.8 / 9.9 ≈ **4.12**（判定: 良好）

> ※ 上の総合スコア（4.51 / 4.12）は「公開資料（vitest.dev/api/vi.html / capacitorjs.com/docs/plugins/web）+ 既存 `useDemoSdk.spec.ts` 体感」を根拠とする暫定値。本プロジェクトでの実採否（vi.mock 採用 / Capacitor 公式 mock を比較サンプルで残置）は L1 学習コスト（5 対 3）と L3 既存親和性（5 対 4）の差に由来し、Capacitor 公式 mock も客観評価では「良好」帯（4.12）の上位に届く — §1.3 の原則どおり「採用」と「比較サンプル枠で残す」の差は学習導線の短さで決まる。

#### 2.6.2 採否解説

- **合意点**: 両者とも `DemoSdkBridge.echo` / `init` / `addListener` 等のプラグイン API をテストから差し替えてシナリオを制御でき、`vi.fn()` ベースの呼び出し回数 / 引数アサーション、`mockResolvedValueOnce` / `mockRejectedValueOnce` での正常系/異常系の切り替え、`addListener` 経由のイベントコールバック発火、TypeScript 型定義の維持を備える。`@capacitor/core` の `PluginListenerHandle` 構造（`{ remove() }`）を返す挙動も両者で再現できる
- **差分**:
  - L1 学習コスト: **vi.mock** は `vi.mock('@/native/demo-sdk-bridge', () => ({...}))` の 1 関数呼び出しで書け、既存 spec の雛形をコピーすれば即動く（5）。**Capacitor 公式 mock** は `class FakeDemoSdkBridgeWeb extends WebPlugin implements DemoSdkBridgePlugin { ... }` の継承 + `registerPlugin(PLUGIN_NAME, { web: () => new FakeDemoSdkBridgeWeb() })` の再登録の 2 段階で、Capacitor のプラグイン仕組み全体を学ぶ必要がある（3）
  - L3 既存親和性: vi.mock は既存 `useDemoSdk.spec.ts` で `vi.mock + vi.hoisted` パターンが稼働中（5）。Capacitor 公式 mock は既存 `frontend/src/native/demo-sdk-bridge/{index,definitions}.ts` の `registerPlugin<DemoSdkBridgePlugin>(PLUGIN_NAME)` 構成と整合するが、テスト spec 側の雛形は新規作成（4）
  - L4 デバッグ体験: vi.mock は hoisting で書き順が直感に反する / `tsconfig` の `paths` エイリアスが factory 内で解決されない / factory の返り値が型推論されず手動キャストになる、という 3 つの落とし穴がある（3）。Capacitor 公式 mock は `DemoSdkBridgePlugin` interface 実装側で型補完が効き、未実装メソッドは `this.unimplemented()` で `Unimplemented` エラーとして明示的に落とせるため失敗位置が読みやすい（4）
  - L8 エコシステム: vi.mock は Vitest 公式 API 内に閉じる（4）。Capacitor 公式 mock は Geolocation / Camera / Filesystem など全プラグインで同じ `WebPlugin` 派生パターンが使えるため、本プロジェクト以外の Capacitor プロジェクトへ学習が横展開できる（5）
  - **モック粒度の差**: vi.mock は「モジュール全体を factory の戻り値で全置換」する粗粒度。Capacitor 公式 mock は「`registerPlugin` の `web` ファクトリを差し替えてプラグイン実装クラスをすげ替える」細粒度で、`@capacitor/core` の他 API（`Capacitor.isNativePlatform()` など）はそのまま動く。テストでブリッジ以外の Capacitor API を併用したい場合に差が出る
- **本プロジェクトでの選択理由**: (1) **学習導線が短い**ことを最優先。既存 `useDemoSdk.spec.ts` が `vi.mock + vi.hoisted` パターンの完成形雛形になっており、新しい spec を書く学習者は「コピーして mockResolvedValueOnce を書き換える」だけで開始できる。L1 学習コスト（5 対 3）と L3 既存親和性（5 対 4）の差がここに集約される。(2) 本プロジェクトの `DemoSdkBridge` はダメージ少なく単一プラグインで済み、Capacitor の他 API と組み合わせる複雑シナリオは現状のテスト範囲外のため、モジュール全置換の粗粒度で十分。(3) **公式手法との対比を学べる**ことを比較サンプル残置の理由とし、§2.6.3 プロトタイプ設計どおり `frontend/__samples__/comparison/capacitor-mock/useDemoSdk.echo.capmock.spec.ts` を 1 本だけ並走させて「同じ echo シナリオが 2 種類の mock パターンで書き分けられる」読み合わせ価値を確保する。客観評価では vi.mock=4.51（優秀）/ Capacitor 公式=4.12（良好）と両者とも上位帯のため、Capacitor 公式 mock を比較サンプル枠で残す判断は妥当
- **学習者向けメモ**: 以下のいずれかに該当する場合は Capacitor 公式 mock パターンへの切り替えを検討する余地がある: (a) **型補完を最優先**したい — `DemoSdkBridgePlugin` interface 実装側で IDE のメソッド補完 / 引数型チェックを効かせ、vi.mock の factory 戻り値の手動キャストを避けたい場合、(b) **Web fallback と概念整合**させたい — 同一の `WebPlugin` 派生クラスを「実機未対応時の Web fallback」と「テストの mock」の両方に流用し、`registerPlugin(name, { web: () => new Impl() })` で 1 つの実装を二度使う運用にしたい場合、(c) **Capacitor 全プラグインで統一**したい — 将来 Geolocation / Camera / Filesystem 等の複数プラグインをテストし、それぞれ別の vi.mock factory を書くより `WebPlugin` 派生クラス群で揃えたほうがチーム内学習コストが下がる場合。本プロジェクトでは §2.6.3 の比較サンプル 1 本でこれらの感触を体験できるよう設計してある

#### 2.6.3 プロトタイプ設計（vi.mock vs Capacitor 公式 mock）

- **対象シナリオ**: `useDemoSdk.echo`（echo メソッドが正常系/異常系で正しい値を返すこと）
- **採用品ペア**: `frontend/src/composables/__tests__/useDemoSdk.spec.ts`（既存）
- **比較サンプル配置**: `frontend/__samples__/comparison/capacitor-mock/useDemoSdk.echo.capmock.spec.ts`
- **ペアリング方針**:
  - 採用品（vi.mock）は `@/native/demo-sdk-bridge` 全体を `vi.mock` で差し替え
  - 比較サンプル（公式 mock）は `@capacitor/core` の `WebPlugin` を継承したダミー実装をテスト内で `registerPlugin` し直す
  - 同じケース ID（C1 / C2 / C3 - 親戦略書 §3.3 のサンプル）を `it.each` で揃える
- **評価観点**:
  1. モック粒度（モジュール全置換 vs プラグイン実装差し替え）
  2. 実機/Web 切り替えとの整合（公式 mock は Web fallback と概念上整合）
  3. 型情報の保たれ方（vi.mock の型推論失敗 vs 公式パターンの型補完）

### 2.7 Android SDK ランナー: Gradle JVM unit + Espresso

本節は単独カテゴリ内で「Gradle wrapper (JVM unit) + Espresso (instrumented)」の**複合採用**を扱う特殊節。比較サンプル列・不採用候補列はともに `—` のため、2 候補（Gradle JVM unit / Espresso instrumented）をそれぞれ 8 軸で採点し、補完関係としての採用根拠を §2.7.2 で示す。

#### 2.7.1 採点表

| 軸 | Gradle JVM unit | 根拠 | Espresso instrumented | 根拠 |
|---|---|---|---|---|
| L1 学習コスト | 4 | `testImplementation "junit:junit:$junitVersion"` 1 行で導入、`@Test` / `assertEquals` の純 JUnit4 概念だけで書き始められる。Java/Kotlin 開発者前提だが Android 固有 API は不要（公式 developer.android.com/training/testing/local-tests + 既存 `frontend/android/demo-sdk/build.gradle`） | 2 | ViewMatchers / ViewActions / ViewAssertions の DSL に加え、AVD 構築・`testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"`・IdlingResource の同期制御を学ぶ必要があり「最初の 1 本」まで距離が長い（公式 developer.android.com/training/testing/espresso + 体感） |
| L2 ドキュメント | 4 | Android Developers `local-unit-tests` ガイドが章立てで揃い、JUnit4 自体は 15 年級の蓄積で日本語記事・StackOverflow 解答が豊富。ただし AAR ライブラリモジュール（`com.android.library`）固有のレシピは Application モジュール比でやや薄い（公式 + 体感） | 4 | developer.android.com の Espresso チートシート + cookbook + samples リポジトリが公式メンテで、日本語記事も Android アプリ開発文脈で一定数蓄積。AndroidX Test 移行ガイドも整備済み（公式 + 体感） |
| L3 既存親和性 | 5 | 既存 `frontend/android/demo-sdk/build.gradle` に `testImplementation "junit:junit:$junitVersion"` が既に記載済み、`src/test/` ディレクトリも存在。親戦略書 §1 の AAR 採用方針（`com.android.library` プラグイン + `copyAarToApp` タスク）とそのまま整合し、ゼロ手数で `DemoSdkTest.kt` を追加できる（既存コード） | 4 | 既存 `frontend/android/app/build.gradle` に `androidTestImplementation "androidx.test.espresso:espresso-core:$androidxEspressoCoreVersion"` + `testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"` が記載済み、`src/androidTest/` も存在。親戦略書 §1 / §4.5 の「Espresso 1 ケース限定」運用方針と整合するが、AVD 構築（Open Items #3）と `connectedAndroidTest` タスク経路は別途整備が必要（既存コード + 親戦略書 §4.5） |
| L4 デバッグ体験 | 4 | 通常 JVM デバッガでブレークポイント / ステップ実行 / 変数監視が完備、スタックトレースが標準 Java で読みやすい。失敗時は `ComparisonFailure` の expected/actual 表示が直感的（体感） | 3 | 実機/エミュ越しのブレークポイントは付けられるが、UI 描画の確認は UiAutomation 経由のスクショ + logcat が中心。`onView(...).check(matches(...))` 失敗時の DOM ダンプ相当が「View hierarchy」テキストで出るが Vue/jsdom ほど読みやすくはない（公式 + 体感） |
| L5 VSCode 統合 | 4 | `vscjava.vscode-java-test` の Run/Debug lens が Gradle JUnit テストに対応、`vscjava.vscode-gradle` で個別タスク起動も可能。親戦略書 §3.1 / §4.3 で導入予定の Java Pack 拡張群でカバー（親戦略書 §3.1） | 3 | `vscjava.vscode-gradle` から `:app:connectedAndroidTest` タスクを起動可能だが、Run/Debug lens の密度は JVM unit より低い。Espresso 専用の VSCode 拡張は事実上なく、Android Studio 側に最適化されている（親戦略書 §4.4 + 体感） |
| L6 保守性 | 5 | JUnit4 は枯れた安定 API でメジャー破壊なし、Gradle / Android Gradle Plugin (AGP) の追従も継続。`com.android.library` プラグイン側で AGP マイナー追従に乗れば JUnit テストは原則そのまま動作する（公式 GitHub releases） | 4 | AndroidX Test (`androidx.test.espresso`) は Google が active メンテで月次〜四半期マイナー、`espresso-core` v3.x で API 安定。Compose UI Test との棲み分け移行はあるが View ベース Espresso は引き続きサポート対象（公式 GitHub releases） |
| L7 実行速度 | 5 | 純 JVM 実行で外部 SDK / エミュ不要、`./gradlew :demo-sdk:test` の cold start は数秒、watch 相当は IDE の incremental compile に依存して秒オーダー。既存 `demo-sdk` モジュールは依存が `androidx.core:core-ktx` + JUnit のみで軽量（体感） | 2 | **起動コスト含む**: AVD cold boot 30-60 秒 + APK インストール 5-15 秒 + テスト実行で 1 ケースでも分オーダー（公式 + 親戦略書 §4.5）。**起動コスト除く**: Espresso 自体は IdlingResource ベースで同期化されており、エミュ常駐後の 1 ケース実行は数秒〜十数秒で安定（体感）。本プロジェクトは「1 ケース限定」運用のため CI / ローカルとも起動コストが支配的 |
| L8 エコシステム | 4 | Gradle 標準の HTML レポート (`build/reports/tests/test/index.html`) と JUnit XML (`build/test-results/test/*.xml`) が 1st-class、JaCoCo カバレッジ・Mockito / MockK / Robolectric などの周辺ツールが厚い（親戦略書 §5.1 + 公式） | 4 | `connectedAndroidTest` の HTML レポート、`additional_output/*.png` の自動スクショ、`screenrecord` の MP4 取得、Firebase Test Lab / Sauce Labs / BrowserStack のクラウド実行連携が公式提供。Vitest HTML / Cypress mochawesome と並ぶエビデンスチャネルとして親戦略書 §5.1 で位置付け済み（親戦略書 §5.1 + 公式） |
| **総合（加重平均）** | **4.35** | — | **3.25** | — |

> 計算例 (Gradle JVM unit): 分子 = 4×1.5 + 4×1.5 + 5×1.5 + 4×1.2 + 4×1.2 + 5×1.0 + 5×1.0 + 4×1.0 = 6.0 + 6.0 + 7.5 + 4.8 + 4.8 + 5.0 + 5.0 + 4.0 = **43.1**、分母 = 1.5×3 + 1.2×2 + 1.0×3 = **9.9**、43.1 / 9.9 ≈ **4.35**（判定: 良好）
> 計算例 (Espresso instrumented): 分子 = 2×1.5 + 4×1.5 + 4×1.5 + 3×1.2 + 3×1.2 + 4×1.0 + 2×1.0 + 4×1.0 = 3.0 + 6.0 + 6.0 + 3.6 + 3.6 + 4.0 + 2.0 + 4.0 = **32.2**、分母 = **9.9**、32.2 / 9.9 ≈ **3.25**（判定: 要注意）

> ※ 上の総合スコア（4.35 / 3.25）は「公開資料（developer.android.com / AndroidX Test GitHub）+ 既存 `frontend/android/demo-sdk/build.gradle` + 既存 `frontend/android/app/build.gradle` 体感」を根拠とする暫定値。本カテゴリは比較サンプル / 不採用候補がなく「両者ともプロジェクトで採用」する複合採用枠のため、客観スコアの高低で採否は決まらない — 親戦略書 §1 / §4.5 の「JVM unit で数を稼ぎ、Espresso は実機ブリッジ往復の検証 1 ケースに限定する」補完関係を §2.7.2 で解説する。Espresso の判定「要注意」は L1（2）と L7 起動コスト（2）に引きずられた結果であり、「単独採用には弱いが、補完運用なら最適」という §1.3 判定区分どおりの位置付け。

#### 2.7.2 採否解説

- **合意点**: 両者とも Gradle + JUnit4 系で統一されており、`./gradlew test` (JVM unit) / `./gradlew connectedAndroidTest` (Espresso) のタスク経路を共有する。`@Test` / `@Before` / `@After` / `assertEquals` / `assertThrows` の JUnit4 API が同型で、テストクラスのファイル配置（`src/test/` vs `src/androidTest/`）と `testInstrumentationRunner` 設定の差以外は学習者にとって「同じ JUnit を書く」体験になる。HTML レポート出力（`build/reports/...`）と JUnit XML 出力（`build/test-results/.../*.xml`）も Gradle 標準として揃い、親戦略書 §5.1 のエビデンス表で 1 行ずつ独立してリストされる
- **差分** (L# 明示):
  - **L1 学習コスト**: Gradle JVM unit（4）は JUnit4 の `@Test` / `assertEquals` の 2 概念で書き始められるのに対し、Espresso instrumented（2）は ViewMatchers / ViewActions / ViewAssertions の DSL 3 概念 + AVD 構築 + `testInstrumentationRunner` 設定 + IdlingResource 同期制御まで含めて学ぶ必要があり、最初の 1 本までの距離が大きく異なる
  - **L7 実行速度**: Gradle JVM unit（5）は純 JVM で秒オーダー、テスト本数を増やしても線形で済む。Espresso instrumented は **起動コスト含む採点で 2**（AVD cold boot 30-60s + APK install + 実行で分オーダー）、起動コスト除けば 4 相当（1 ケース実行は十数秒）。本プロジェクトは「1 ケース限定」運用のため起動コストが支配的になり、含む採点を採用
  - **L4 デバッグ体験**: JVM unit（4）は通常 JVM デバッガでブレークポイント / ステップ実行が完備、スタックトレースが標準 Java で読みやすい。Espresso（3）は実機越しのブレークポイントは付けられるが、UI 確認が UiAutomation 経由スクショ + logcat 中心で 1 段見劣りする
  - **L5 VSCode 統合**: JVM unit（4）は Java Test Runner 拡張の Run/Debug lens が密に統合される一方、Espresso（3）は Gradle タスク経由起動が中心で lens 密度は低い。Android Studio 側に最適化されている分 VSCode 完結方針（親戦略書 §3.1）と僅かに齟齬が出る
  - **L3 既存親和性**: 両者とも既存 `build.gradle` に必要な dep が記載済みで 4-5 点圏。`demo-sdk` モジュール（JVM unit=5）は `com.android.library` プラグイン + AAR 採用方針と完全整合、`app` モジュール（Espresso=4）も `androidTestImplementation` + `testInstrumentationRunner` が整備済みで、残るは AVD 設定（§5 Open Items #3）のみ
- **本プロジェクトでの選択理由**: 親戦略書 §1 / §4.5 の「Gradle JVM unit で AAR 内ロジックの数を稼ぎ、Espresso は実機ブリッジ往復の検証 1 ケースに限定する」**補完関係**による複合採用。(1) JVM unit は L1 / L7 / L5 で軽量・高速・VSCode 完結のため Markdown 決定表 → `@MethodSource` の it.each 展開（親戦略書 §3.3）と相性が良く、ケース数を増やしてもコストが線形に収まる。(2) Espresso は L7 が分オーダーで重いが「実機/エミュで Capacitor プラグイン経由のブリッジ往復が本当に動くか」を担保する唯一の経路で、客観評価「要注意」帯でも 1 ケースに限定すれば学習サンプル集としての必要十分性を確保できる。(3) 両者とも JUnit4 + Gradle で API が揃うため、学習者が「JVM unit のテストを Espresso instrumented にコピーして書き換える」横展開が容易で、教材構成上も自然。客観評価では JVM unit=4.35（良好）/ Espresso=3.25（要注意）と単独スコアには差があるが、補完運用前提で両者採用は妥当
- **学習者向けメモ**:
  - **JVM unit を使う場面**: AAR 内ロジック（純 Java/Kotlin の関数・データ変換・状態遷移）を Markdown 決定表ベースで網羅したいとき。Android Framework に依存しない単体テストで、VSCode の Run/Debug lens から 1 クリック実行できる短いフィードバックループを学習に活かす。本プロジェクトでは `demo-sdk` モジュール内の振る舞いがここに集約される
  - **Espresso を使う場面**: Capacitor プラグイン経由で `DemoSdkBridge.init` / `echo` がアプリ側 UI から呼び出され、結果が画面に表示されるまでの**ブリッジ往復**を実機/エミュで担保したいとき。本プロジェクトでは 1 ケースのみ（親戦略書 §4.5）で、L7 起動コストを払ってまで実機確認する価値があるシナリオに限定する
  - **どちらを選ぶか迷ったら**: 「Android Framework / View / Activity / Intent / Service / Context.getResources()」のいずれかが必要なら Espresso、そうでなければ JVM unit。Android Framework 依存があるが実機が要らない中間ケースは Robolectric が選択肢になるが、本プロジェクトでは採用しない（親戦略書 §1 で言及なし、L1 学習コストを抑えるため）

#### 2.7.3 プロトタイプ設計

該当なし（比較サンプル列が `—`、不採用候補列も `—` のため、別実装の spec を作る対象がない）。採否は §2.7.2 まで。

### 2.8 エビデンス: Vitest HTML / Cypress mochawesome / Gradle HTML / Espresso screenrecord

#### 2.8.1 採点表

`(後続 plan で埋める。「Cypress 動画録画（不採用）」を比較対象に含めること)`

#### 2.8.2 採否解説

`(後続 plan で埋める。L8 エコシステムは「PR レビュー実用度」を根拠に含める)`

#### 2.8.3 プロトタイプ設計

該当なし。

### 2.9 設計書連係（API）: OpenAPI examples 拡張 vs 独立 YAML/JSON データシート

#### 2.9.1 採点表

`(後続 plan で埋める)`

#### 2.9.2 採否解説

`(後続 plan で埋める。L3 既存親和性は Orval / MSW パイプとの整合を根拠に含める)`

#### 2.9.3 プロトタイプ設計

該当なし。

### 2.10 設計書連係（UI/SDK）: Markdown 決定表 → it.each vs Gherkin (.feature)

#### 2.10.1 採点表

`(後続 plan で埋める)`

#### 2.10.2 採否解説

`(後続 plan で埋める。L1 学習コストには「step 実装ファイルの分離」と「テーブル直接記述」の比較を含める)`

#### 2.10.3 プロトタイプ設計

該当なし。

### 2.11 雛形生成: plop vs hygen

#### 2.11.1 採点表

`(後続 plan で埋める)`

#### 2.11.2 採否解説

`(後続 plan で埋める)`

#### 2.11.3 プロトタイプ設計

該当なし。

---

## 3. 総合スコアサマリ

採点完了時点で以下 4 表が埋まる。本書時点では §2.1 のみ採点済み（見本）であり、§2.2-§2.11 の埋め込みは後続 plan の作業。

### 3.1 採用品の総合スコア

| カテゴリ | 採用 | 総合スコア | 判定 |
|---|---|---|---|
| 1. ランナー | Vitest | 4.75 | 優秀 |
| 2. コンポーネント API | @vue/test-utils | TBD | TBD |
| 3. DOM 環境 | jsdom | TBD | TBD |
| 4. HTTP モック | MSW | TBD | TBD |
| 5. E2E | Cypress | TBD | TBD |
| 6. ブリッジモック | vi.mock | TBD | TBD |
| 7. Android SDK | Gradle + Espresso | TBD | TBD |
| 8. エビデンス | （複合） | TBD | TBD |
| 9. 設計書連係（API） | OpenAPI examples | TBD | TBD |
| 10. 設計書連係（UI/SDK） | Markdown 決定表 | TBD | TBD |
| 11. 雛形生成 | plop | TBD | TBD |

### 3.2 比較サンプル品の総合スコア

| カテゴリ | 比較サンプル | 総合スコア | 判定 |
|---|---|---|---|
| 2. コンポーネント API | Testing Library | TBD | TBD |
| 5. E2E | Playwright | TBD | TBD |
| 6. ブリッジモック | Capacitor 公式 mock | TBD | TBD |

### 3.3 不採用候補の総合スコア

| カテゴリ | 不採用候補 | 総合スコア | 判定 |
|---|---|---|---|
| 1. ランナー | Jest | 3.85 | 良好（本プロジェクトでは §2.1.2 のとおり不採用） |
| 3. DOM 環境 | happy-dom | TBD | TBD |
| 4. HTTP モック | nock | TBD | TBD |
| 4. HTTP モック | axios-mock-adapter | TBD | TBD |
| 5. E2E | WebdriverIO | TBD | TBD |
| 8. エビデンス | Cypress 動画録画 | TBD | TBD |
| 9. 設計書連係（API） | 独立 YAML/JSON | TBD | TBD |
| 10. 設計書連係（UI/SDK） | Gherkin | TBD | TBD |
| 11. 雛形生成 | hygen | TBD | TBD |

### 3.4 観察された傾向と学習者向けガイド

採点完了後、以下の観点で 200-400 字程度の所見を書き加える。

1. L1 / L2 / L3（学習導線軸）と L7 / L8（成熟度軸）の相関の有無
2. 「採用品の総合スコア」と「不採用候補のうち判定が比較サンプル枠に達したもの」の数 — 親戦略書 §6.4 Open Items #4 への材料
3. 学習者が次に手を伸ばすなら「不採用候補のうち最も高得点のもの」 — 学習サンプル拡張の優先順位
4. 採点中に親戦略書の決定を覆す候補が出た場合の改訂提案

---

## 4. 既存設計書との接続

### 4.1 §1 決定表との対応

本書は親戦略書 §1「採用スタック（決定表）」を以下のように補強する。

| 親戦略書 §1 の列 | 本書での扱い |
|---|---|
| 「採用」列 | §2 採点表の A 列、§3.1 サマリに集約 |
| 「比較サンプル」列 | §2 採点表の B 列、§3.2 サマリ + §2.x.3 プロトタイプ設計 |
| 「不採用」列 | §2 採点表の C 列、§3.3 サマリ |
| §1.1「不採用候補の評価メモ」 | §2 採否解説で 8 軸の根拠付き解説に格上げ |

### 4.2 P6 への引き渡し方

親戦略書 §6.2 Phase 6「比較サンプル」では `__samples__/comparison/` 下に Playwright / Testing Library / Capacitor mock を 1 本ずつ実装する計画。本書は P6 への入力として以下を提供する。

| P6 実装対象 | 入力となる本書の節 | 採用品ペア（既存 or P3 で実装） |
|---|---|---|
| `__samples__/comparison/testing-library/BridgeDemoView.tl.spec.ts` | §2.2.3 プロトタイプ設計 | `src/views/__tests__/BridgeDemoView.spec.ts`（P3） |
| `__samples__/comparison/playwright/items-flow.spec.ts` | §2.5.3 プロトタイプ設計 | `tests/e2e/specs/items-flow.cy.ts`（P3） |
| `__samples__/comparison/capacitor-mock/useDemoSdk.echo.capmock.spec.ts` | §2.6.3 プロトタイプ設計 | `src/composables/__tests__/useDemoSdk.spec.ts`（既存） |

writing-plans 側のタスク分割は、本書 §2 の節順（§2.1 → §2.11）に「採点埋め」→「採否解説執筆」→「(該当軸のみ) P6 ペアの spec 仕様確定」を 1 ループとして並べる。

---

## 5. Open Items（未確定事項）

1. **採点根拠の出典フォーマット**: 「npm trends 上位」「GitHub star 数」「日本語記事の数」を採点根拠に書くとき、URL を併記するかは §2.1 見本では省略。後続 plan で出典必須化するか判断
2. **L7 実行速度の測定方法**: 親戦略書 §6.4 Open Items #4 と連動。同一マシン同一テストでの cold/watch 時間を測るかは P6 着手時に決める
3. **Android SDK 軸（カテゴリ 7）の比較対象**: 候補が `Gradle + Espresso` の組のみ。他 JVM テストランナー（Spek / Kotest）を比較対象に加えるかは §2.7 採点時に判断
4. **重みの妥当性レビュー**: §1.3 の 1.5 / 1.2 / 1.0 のレンジは初期設定。§2 採点完了後、結果が直感と乖離したら重みを見直す（学習導線軸の重みを上下させた感度分析を §3.4 に追加する選択肢）
5. **採点者の独立性**: §1.2 で「執筆エージェントが一次採点」としたが、§2.1 見本の採点に対するユーザーレビューで採点傾向の偏り（例: 「Vitest 偏重」）が判明したら、後続節の採点ルールを補強する

---

## 6. 後続作業の引き渡し

本書承認後の writing-plans では、以下の単位で実装計画化する。

1. **採点埋め**: §2.2 から §2.11 の各節を 1 タスクとし、それぞれ「採点表埋め → 採否解説執筆」を 1 まとまりで進める（10 タスク）
2. **総合スコア集計**: §3.1 / §3.2 / §3.3 の表を機械的に埋める（1 タスク）
3. **傾向と学習者ガイド執筆**: §3.4 を 200-400 字で書く（1 タスク）
4. **親戦略書への反映**: §3.4 で改訂提案が出た場合のみ、親戦略書 §1 / §1.1 を更新する（1 タスク・任意）

P6 のプロトタイプ実装コード（3 spec）は本書のスコープ外。本書 §2.2.3 / §2.5.3 / §2.6.3 を入力として P6 の plan に渡す。
