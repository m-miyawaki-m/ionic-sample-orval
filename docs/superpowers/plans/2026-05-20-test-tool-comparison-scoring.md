# テストツール比較スコアリング 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 設計書 `docs/superpowers/specs/2026-05-20-test-tool-comparison-design.md` の §2.2-§2.11 採点表と採否解説、§3.1-§3.3 集計、§3.4 所見を埋めて「テストツール選定の根拠付き比較資料」を完成させる。

**Architecture:** 既存設計書を逐次編集するドキュメント作業。1 カテゴリ = 1 タスクで独立して進められる構造（§2 各節は他節と相互参照しない）。最後に §3 集計 / §3.4 所見 / 親戦略書フィードバックを行う。

**Tech Stack:** Markdown、ローカル計算（電卓 / `node -e`）、`git`、必要に応じて `npm trends` / GitHub releases ページの参照（オフライン環境ならスキップ可、根拠に「執筆者体感」と明示）

---

## 前提

- 親仕様: `docs/superpowers/specs/2026-05-20-test-tool-comparison-design.md`
- 参照される親戦略書: `docs/superpowers/specs/2026-05-20-test-strategy-design.md`
- ブランチ: `feature/test-strategy-p0-p2`（既存）。本計画では新ブランチを切らずそのまま続ける
- 編集対象は本書の §2.2-§2.11 / §3 のみ。§1（フレームワーク）と §2.1（見本）は本計画の入力であり改変しない
- ※ 1 タスク = 1 カテゴリ = 1 コミット。各コミットは独立に取り消し可能

---

## 採点ルール（全タスク共通の前提）

すべての §2.x タスクは以下を満たすこと。タスク内の検証ステップでチェックリストとして使う。

- **8 軸**: L1 学習コスト / L2 ドキュメント・サンプル / L3 既存親和性 / L4 デバッグ体験 / L5 VSCode 統合 / L6 保守性 / L7 実行速度 / L8 エコシステム
- **重み**: L1=L2=L3=1.5、L4=L5=1.2、L6=L7=L8=1.0（重み合計 9.9）
- **採点**: 各軸 1-5 の整数。NA は採点外（分母から除外）
- **根拠**: 各セルの根拠を 1 行で併記。情報源は「公式 / npm trends / GitHub release / 既存コード / 体感」のいずれかを明示
- **計算式**: `weighted_score = Σ(score_i × weight_i) / Σ(weight_i where score_i ≠ NA)`
- **判定区分**: ≥4.5 優秀 / 3.5-4.4 良好 / 2.5-3.4 要注意 / <2.5 不適
- **客観評価と実採否は別軸**: 客観評価が「良好」でも本プロジェクトでは不採用となる場合あり。採否解説で必ずその理由を書く

採点表の列構成は必ず以下の順とする（既存 §2.1 と統一）:

```
| 軸 | 候補A | 根拠 | 候補B | 根拠 | (候補C ...) |
| L1 学習コスト | 5 | ... | 4 | ... |
...
| **総合（加重平均）** | **X.XX** | — | **Y.YY** | — |
```

採否解説の節構造は必ず以下の 4 サブ項目を含める:

- **合意点**: どの候補も最低限満たすこと
- **差分**: 軸ごとに何が分かれたか（L# を明示）
- **本プロジェクトでの選択理由**: 親戦略書 §1 の決定との対応
- **学習者向けメモ**: この候補に切り替えるならどんな場面か

---

## ファイル構造

このプランで触るファイル:

- **Modify**: `docs/superpowers/specs/2026-05-20-test-tool-comparison-design.md`
  - §2.2-§2.11 の採点表・採否解説・(該当のみ) プロトタイプ設計の確認
  - §3.1-§3.3 集計サマリ
  - §3.4 観察された傾向と学習者向けガイド
- **(任意) Modify**: `docs/superpowers/specs/2026-05-20-test-strategy-design.md`
  - §3.4 で改訂提案が出た場合のみ §1 決定表 / §1.1 不採用候補メモを更新

新規ファイルなし。

---

## Task 0: 採点環境の準備と §2.1 見本ケースの計算再検証

**Files:**
- Read: `docs/superpowers/specs/2026-05-20-test-tool-comparison-design.md` 全文
- Read: `docs/superpowers/specs/2026-05-20-test-strategy-design.md` §1

**目的**: 採点の前提（重み・計算式・判定区分・採点表フォーマット）を読み手の頭に入れ、§2.1 見本の計算を独立に再検証する。これ以降のタスクで毎回ゼロから前提を読み直す手間を省く。

- [ ] **Step 1: 設計書全文を読む**

```bash
cat docs/superpowers/specs/2026-05-20-test-tool-comparison-design.md
```

§1.1 ルーブリック、§1.3 重み、§2.0 共通フォーマット、§2.1 見本ケースを特に注視する。

- [ ] **Step 2: §2.1 Vitest の総合スコアを独立計算**

```bash
node -e "
const w = {L1:1.5,L2:1.5,L3:1.5,L4:1.2,L5:1.2,L6:1.0,L7:1.0,L8:1.0};
const s = {L1:5, L2:4, L3:5, L4:5, L5:5, L6:5, L7:5, L8:4};  // Vitest
let num = 0, den = 0;
for (const k of Object.keys(w)) {
  if (s[k] !== null) { num += s[k] * w[k]; den += w[k]; }
}
console.log('Vitest:', (num/den).toFixed(2));
"
```

Expected: `Vitest: 4.75`

- [ ] **Step 3: §2.1 Jest の総合スコアを独立計算**

```bash
node -e "
const w = {L1:1.5,L2:1.5,L3:1.5,L4:1.2,L5:1.2,L6:1.0,L7:1.0,L8:1.0};
const s = {L1:4, L2:5, L3:2, L4:4, L5:4, L6:4, L7:3, L8:5};  // Jest
let num = 0, den = 0;
for (const k of Object.keys(w)) {
  if (s[k] !== null) { num += s[k] * w[k]; den += w[k]; }
}
console.log('Jest:', (num/den).toFixed(2));
"
```

Expected: `Jest: 3.85`

- [ ] **Step 4: 採点ヘルパースクリプトを保存（任意）**

毎回ワンライナーで書くのが面倒なら、以下を `scripts/score.mjs` に保存。後続タスクで使う場合のみ。

```js
// scripts/score.mjs
// Usage: node scripts/score.mjs '{"L1":5,"L2":4,"L3":5,"L4":5,"L5":5,"L6":5,"L7":5,"L8":4}'
const w = {L1:1.5,L2:1.5,L3:1.5,L4:1.2,L5:1.2,L6:1.0,L7:1.0,L8:1.0};
const s = JSON.parse(process.argv[2] || '{}');
let num = 0, den = 0;
for (const k of Object.keys(w)) {
  if (s[k] !== undefined && s[k] !== null) { num += s[k] * w[k]; den += w[k]; }
}
const score = num / den;
const verdict = score >= 4.5 ? '優秀' : score >= 3.5 ? '良好' : score >= 2.5 ? '要注意' : '不適';
console.log(`総合: ${score.toFixed(2)} (${verdict})`);
console.log(`分子: ${num.toFixed(1)} / 分母: ${den.toFixed(1)}`);
```

このファイルは本計画完了時に削除する（プロジェクト本体のスクリプトとは別物）。

- [ ] **Step 5: コミット（任意のスクリプトを保存した場合のみ）**

```bash
git add scripts/score.mjs
git commit -m "chore(test-tool-comparison): add weighted-score helper

採点タスクで加重平均と判定区分を再計算するためのワンライナー支援。
本計画完了時に削除する一時スクリプト。

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

スクリプトを保存しないならこのタスク自体はコミットなしで完了（読み込み + 再計算のみ）。

---

## Task 1: §2.2 コンポーネント API (VTU vs Testing Library)

**Files:**
- Modify: `docs/superpowers/specs/2026-05-20-test-tool-comparison-design.md` §2.2.1 / §2.2.2

**前提整理**:
- 採用品: `@vue/test-utils` (VTU)
- 比較サンプル: `@testing-library/vue` (TL)
- 既存利用箇所: `frontend/package.json` の devDependencies に `@vue/test-utils ^2.4.10`、TL は未導入
- 親戦略書 §1 の決定理由: 「Testing Library で同一テスト 1 本」を比較サンプルとして残す
- §2.2.3 プロトタイプ設計は既に埋まっている（編集不要）

- [ ] **Step 1: 候補の公式ドキュメントと既存利用箇所を確認**

参照リスト（オフライン環境なら体感ベースで可、その場合根拠に「体感」と明示）:
- VTU: https://test-utils.vuejs.org/
- TL: https://testing-library.com/docs/vue-testing-library/intro
- 既存 spec: `frontend/src/composables/__tests__/useDemoSdk.spec.ts` で VTU API の使用感を確認

```bash
cat frontend/src/composables/__tests__/useDemoSdk.spec.ts
```

- [ ] **Step 2: 8 軸を採点（採点表のドラフト）**

紙またはスクラッチパッドに以下のテンプレで採点をまとめる:

```
VTU: L1=?, L2=?, L3=?, L4=?, L5=?, L6=?, L7=?, L8=?
TL : L1=?, L2=?, L3=?, L4=?, L5=?, L6=?, L7=?, L8=?
```

採点根拠の方針（必ずチェック）:
- L3 既存親和性: VTU は Vue 公式 / Ionic 描画との実績多数 / 既存 dep にあり → 高得点傾向。TL は別 dep 追加 + Ionic 描画の事例が VTU より薄い
- L1 学習コスト: TL の `getByRole` 系はアクセシビリティ志向で初心者に直感的との評価が広い
- L4 デバッグ体験: TL は失敗時のセレクタヒント（"unable to find an element with the role"）が手厚い
- L6 保守性: VTU は Vue 公式追従、TL も活発

- [ ] **Step 3: 加重平均を計算（明示）**

```bash
node -e "/* VTU の採点 */"
node -e "/* TL の採点 */"
```

または `scripts/score.mjs` を使う。両者の総合スコアと判定区分（優秀/良好/要注意/不適）をメモする。

- [ ] **Step 4: §2.2.1 採点表を埋める**

`docs/superpowers/specs/2026-05-20-test-tool-comparison-design.md` の §2.2.1 を以下のフォーマットで上書き:

```markdown
#### 2.2.1 採点表

| 軸 | @vue/test-utils | 根拠 | Testing Library (Vue) | 根拠 |
|---|---|---|---|---|
| L1 学習コスト | <score> | <1 行根拠> | <score> | <1 行根拠> |
| L2 ドキュメント | <score> | ... | <score> | ... |
| L3 既存親和性 | <score> | ... | <score> | ... |
| L4 デバッグ体験 | <score> | ... | <score> | ... |
| L5 VSCode 統合 | <score> | ... | <score> | ... |
| L6 保守性 | <score> | ... | <score> | ... |
| L7 実行速度 | <score> | ... | <score> | ... |
| L8 エコシステム | <score> | ... | <score> | ... |
| **総合（加重平均）** | **<X.XX>** | — | **<Y.YY>** | — |

> 計算例 (VTU): 分子 = <展開式> = **<num>**、分母 = **9.9**、<num> / 9.9 ≈ **<X.XX>**（判定: <優秀/良好/要注意/不適>）
> 計算例 (TL):  分子 = <展開式> = **<num>**、分母 = **9.9**、<num> / 9.9 ≈ **<Y.YY>**（判定: <...>）
```

**置換対象の現在の文字列**: `#### 2.2.1 採点表\n\n\`(後続 plan で埋める。VTU と Testing Library を 8 軸で採点)\``

- [ ] **Step 5: §2.2.2 採否解説を埋める**

§2.2.2 を以下フォーマットで埋める:

```markdown
#### 2.2.2 採否解説

- **合意点**: 両者とも Vue SFC の `mount` / `render`、`@testing-library/jest-dom` 系のマッチャ、ユーザイベント API（VTU は trigger、TL は `userEvent`）を備える
- **差分**:
  - L1 学習コスト: TL の <差分内容>。VTU の <差分内容>
  - L3 既存親和性: <差分内容>
  - L4 デバッグ体験: <差分内容>
  - L8 エコシステム: <差分内容>
- **本プロジェクトでの選択理由**: <親戦略書 §1 の決定との対応 + L3 / L1 の差から VTU を採用 / TL を比較サンプルに残す根拠>
- **学習者向けメモ**: <a11y セレクタを優先したい / 既存 React テストから合流したい場合は TL に切り替える、など実用ヒント 1-2 行>
```

**置換対象の現在の文字列**: `#### 2.2.2 採否解説\n\n\`(後続 plan で埋める)\``

- [ ] **Step 6: §1.1 ルーブリック照合**

埋め終わったら以下を順にチェック:

- [ ] 各セルの根拠が「公式 / npm trends / 既存コード / 体感」のいずれかとして読めるか
- [ ] L3 既存親和性で「既存 `useDemoSdk.spec.ts` での使用感」を VTU 根拠に含めたか
- [ ] §1.3 の重み（1.5 / 1.2 / 1.0）を使った計算式を明示したか
- [ ] 採否解説 4 項目（合意点 / 差分 / 選択理由 / 学習者向けメモ）が全て埋まっているか
- [ ] 判定区分（優秀/良好/要注意/不適）を明記したか

- [ ] **Step 7: コミット**

```bash
git add docs/superpowers/specs/2026-05-20-test-tool-comparison-design.md
git commit -m "docs(test-tool-comparison): score §2.2 component API (VTU vs Testing Library)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: §2.3 DOM 環境 (jsdom vs happy-dom)

**Files:**
- Modify: `docs/superpowers/specs/2026-05-20-test-tool-comparison-design.md` §2.3.1 / §2.3.2

**前提整理**:
- 採用品: jsdom（親戦略書 §1）
- 不採用候補: happy-dom
- 比較サンプル列は `—`、§2.3.3 はプロトタイプ設計なし
- 親戦略書 §1.1 の不採用理由: 「速度メリットはあるが、Ionic / Vue 描画の検証で jsdom より不安定なケースがある」

- [ ] **Step 1: 候補の公式情報を確認**

- jsdom: https://github.com/jsdom/jsdom（リリース履歴 / Issue / 主要 dep）
- happy-dom: https://github.com/capricorn86/happy-dom（速度ベンチ / 互換性表）
- 既存利用: `frontend/package.json` devDependencies に `jsdom ^22.1.0`、Vitest 設定で `environment: 'jsdom'`

- [ ] **Step 2: 8 軸を採点（NA セルの判断を含む）**

採点方針:
- L7 実行速度: 公開ベンチで happy-dom 優位（数字を根拠に書く）
- L3 既存親和性: jsdom は Vitest デフォルトで採用例豊富、Ionic Shadow DOM 対応の言及あり
- L5 VSCode 統合: 両者とも DOM 環境であり Vitest 拡張の挙動に違いはほぼなし → 同点
- L8 エコシステム: jsdom はライブラリ依存の前提として広く採用、happy-dom は新興
- NA セルの判断: 8 軸すべて意味があるので NA は出にくい

- [ ] **Step 3: 加重平均を計算**

```bash
node scripts/score.mjs '{"L1":?,"L2":?,"L3":?,"L4":?,"L5":?,"L6":?,"L7":?,"L8":?}'
```

または ワンライナーで両者。

- [ ] **Step 4: §2.3.1 採点表を埋める**

```markdown
#### 2.3.1 採点表

| 軸 | jsdom | 根拠 | happy-dom | 根拠 |
|---|---|---|---|---|
| L1 学習コスト | <score> | ... | <score> | ... |
| L2 ドキュメント | <score> | ... | <score> | ... |
| L3 既存親和性 | <score> | ... | <score> | ... |
| L4 デバッグ体験 | <score> | ... | <score> | ... |
| L5 VSCode 統合 | <score> | ... | <score> | ... |
| L6 保守性 | <score> | ... | <score> | ... |
| L7 実行速度 | <score> | ... | <score> | ... |
| L8 エコシステム | <score> | ... | <score> | ... |
| **総合（加重平均）** | **<X.XX>** | — | **<Y.YY>** | — |

> 計算例 (jsdom): ...
> 計算例 (happy-dom): ...
```

**置換対象**: `#### 2.3.1 採点表\n\n\`(後続 plan で埋める)\``

- [ ] **Step 5: §2.3.2 採否解説を埋める**

特に「Ionic の Shadow DOM 描画」が両者で挙動差を出すという親戦略書 §1.1 の理由を、L3 / L4 の根拠と整合させる。

**置換対象**: `#### 2.3.2 採否解説\n\n\`(後続 plan で埋める)\``

- [ ] **Step 6: §1.1 ルーブリック照合** — Task 1 の Step 6 と同じチェックリストを実行

- [ ] **Step 7: コミット**

```bash
git add docs/superpowers/specs/2026-05-20-test-tool-comparison-design.md
git commit -m "docs(test-tool-comparison): score §2.3 DOM env (jsdom vs happy-dom)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: §2.4 HTTP モック (MSW vs nock vs axios-mock-adapter)

**Files:**
- Modify: `docs/superpowers/specs/2026-05-20-test-tool-comparison-design.md` §2.4.1 / §2.4.2

**前提整理**:
- 採用品: MSW（親戦略書 §1）
- 不採用候補: nock、axios-mock-adapter（2 つ）
- 比較サンプルなし、§2.4.3 はなし
- 採点表は 3 候補 × 8 軸の列数になる

- [ ] **Step 1: 候補の公式情報を確認**

- MSW: https://mswjs.io/ + 既存 `frontend/src/mocks/handlers.ts`
- nock: https://github.com/nock/nock
- axios-mock-adapter: https://github.com/ctimmerm/axios-mock-adapter

```bash
cat frontend/src/mocks/handlers.ts
ls frontend/src/mocks/
```

- [ ] **Step 2: 8 軸 × 3 候補を採点**

採点方針:
- L3 既存親和性: MSW は Orval が直接対応 / 既存 handler あり → 5 点圏。nock は Node 限定で fetch 化された axios 経路の Service Worker 介入なし → 3 点以下。axios-mock-adapter は axios 専用で fetch コードからは使えない → 親プロジェクトでは限定的
- L7 実行速度: 3 者とも軽量、大差はないはず → 4-5 点で同等
- L8 エコシステム: MSW のレポータ・GraphQL 対応・Service Worker 統合は強力

- [ ] **Step 3: 加重平均を 3 候補それぞれ計算**

```bash
node scripts/score.mjs '<MSW>'
node scripts/score.mjs '<nock>'
node scripts/score.mjs '<axios-mock-adapter>'
```

- [ ] **Step 4: §2.4.1 採点表を埋める（5 列構成）**

```markdown
#### 2.4.1 採点表

| 軸 | MSW | 根拠 | nock | 根拠 | axios-mock-adapter | 根拠 |
|---|---|---|---|---|---|---|
| L1 学習コスト | <s> | ... | <s> | ... | <s> | ... |
| ... |
| **総合（加重平均）** | **<X.XX>** | — | **<Y.YY>** | — | **<Z.ZZ>** | — |

> 計算例 (MSW): ...
> 計算例 (nock): ...
> 計算例 (axios-mock-adapter): ...
```

**置換対象**: `#### 2.4.1 採点表\n\n\`(後続 plan で埋める。3 候補をそれぞれ 8 軸で採点)\``

- [ ] **Step 5: §2.4.2 採否解説を埋める**

特に介入レイヤ（Service Worker / Node HTTP / axios アダプタ）の差を「L3 既存親和性」と「L8 エコシステム」の根拠で説明する。

**置換対象**: `#### 2.4.2 採否解説\n\n\`(後続 plan で埋める。Service Worker / Node interceptor / axios アダプタ の介入レイヤ差を中心に)\``

- [ ] **Step 6: §1.1 ルーブリック照合** — Task 1 の Step 6 と同じ

- [ ] **Step 7: コミット**

```bash
git add docs/superpowers/specs/2026-05-20-test-tool-comparison-design.md
git commit -m "docs(test-tool-comparison): score §2.4 HTTP mock (MSW vs nock vs axios-mock-adapter)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: §2.5 E2E (Cypress vs Playwright vs WebdriverIO)

**Files:**
- Modify: `docs/superpowers/specs/2026-05-20-test-tool-comparison-design.md` §2.5.1 / §2.5.2

**前提整理**:
- 採用品: Cypress（既存 dep）
- 比較サンプル: Playwright
- 不採用: WebdriverIO
- §2.5.3 プロトタイプ設計（Cypress vs Playwright）は既に埋まっている（編集不要）
- 採点表は 3 候補

- [ ] **Step 1: 候補の公式情報を確認**

- Cypress: https://docs.cypress.io/ + `frontend/cypress.config.ts`（既存）
- Playwright: https://playwright.dev/
- WebdriverIO: https://webdriver.io/

```bash
cat frontend/cypress.config.ts
ls frontend/tests/e2e/
```

- [ ] **Step 2: 8 軸 × 3 候補を採点**

採点方針:
- L1 学習コスト: Cypress chain API は読みやすい。Playwright は async/await で慣れが必要だが Promise を理解していれば速い。WebdriverIO は WebDriver 仕様学習が必要
- L4 デバッグ体験: Cypress Test Runner の time-travel、Playwright Trace Viewer は強力。WebdriverIO はやや弱い
- L7 実行速度: Playwright が並列実行で優位、Cypress は単一ブラウザ
- L8 エコシステム: Cypress の dashboard / plugin、Playwright の codegen / trace、WebdriverIO のサービス機構

- [ ] **Step 3: 加重平均を 3 候補計算**

- [ ] **Step 4: §2.5.1 採点表を埋める（5 列構成）**

**置換対象**: `#### 2.5.1 採点表\n\n\`(後続 plan で埋める)\``

- [ ] **Step 5: §2.5.2 採否解説を埋める**

選択理由には親戦略書 §1.1 の「E2E は Cypress + Playwright 比較で十分。学習サンプルとしての差別化が薄い（WebdriverIO 不採用理由）」を引用する。

**置換対象**: `#### 2.5.2 採否解説\n\n\`(後続 plan で埋める)\``

- [ ] **Step 6: §1.1 ルーブリック照合**

- [ ] **Step 7: コミット**

```bash
git add docs/superpowers/specs/2026-05-20-test-tool-comparison-design.md
git commit -m "docs(test-tool-comparison): score §2.5 E2E (Cypress vs Playwright vs WebdriverIO)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: §2.6 ブリッジモック (vi.mock vs Capacitor 公式 mock)

**Files:**
- Modify: `docs/superpowers/specs/2026-05-20-test-tool-comparison-design.md` §2.6.1 / §2.6.2

**前提整理**:
- 採用品: vi.mock パターン
- 比較サンプル: Capacitor 公式 mock パターン
- §2.6.3 プロトタイプ設計は既に埋まっている
- 既存利用: `frontend/src/composables/__tests__/useDemoSdk.spec.ts` で `vi.mock('@/native/demo-sdk-bridge')` 使用

- [ ] **Step 1: 候補の公式情報を確認**

- Vitest vi.mock: https://vitest.dev/api/vi.html#vi-mock
- Capacitor mock: https://capacitorjs.com/docs/plugins/web (WebPlugin 派生での mock)
- 既存 spec: `frontend/src/composables/__tests__/useDemoSdk.spec.ts`

```bash
cat frontend/src/composables/__tests__/useDemoSdk.spec.ts
cat frontend/src/native/demo-sdk-bridge.ts  # ブリッジ実装の確認
```

- [ ] **Step 2: 8 軸を採点**

採点方針:
- L1 学習コスト: vi.mock は Vitest が分かれば即使える。公式 mock は WebPlugin の継承と registerPlugin 知識が必要
- L3 既存親和性: vi.mock は既存 spec で使用済み。公式 mock は Capacitor の流儀に整合
- L4 デバッグ体験: vi.mock は型推論で躓きがち、公式 mock は型補完が効きやすい
- L8 エコシステム: vi.mock は Vitest 公式、公式 mock は Capacitor 全プラグインに展開可能

- [ ] **Step 3: 加重平均を計算**

- [ ] **Step 4: §2.6.1 採点表を埋める**

**置換対象**: `#### 2.6.1 採点表\n\n\`(後続 plan で埋める)\``

- [ ] **Step 5: §2.6.2 採否解説を埋める**

選択理由には「学習導線が短い（既存 spec のパターンを踏襲）」を vi.mock 採用の主要因として書き、「公式手法との対比を学べる」を比較サンプル残置の理由とする。

**置換対象**: `#### 2.6.2 採否解説\n\n\`(後続 plan で埋める)\``

- [ ] **Step 6: §1.1 ルーブリック照合**

- [ ] **Step 7: コミット**

```bash
git add docs/superpowers/specs/2026-05-20-test-tool-comparison-design.md
git commit -m "docs(test-tool-comparison): score §2.6 bridge mock (vi.mock vs Capacitor official)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: §2.7 Android SDK ランナー (Gradle JVM unit + Espresso)

**Files:**
- Modify: `docs/superpowers/specs/2026-05-20-test-tool-comparison-design.md` §2.7.1 / §2.7.2

**前提整理**:
- 採用品は「Gradle wrapper (JVM unit) + Espresso (instrumented)」の複合
- 比較サンプルなし、不採用候補なし
- §2.7.3 プロトタイプ設計はなし
- 採点は「Gradle JVM unit」「Espresso instrumented」を別個に行い、複合採用の根拠を採否解説で示す
- L7 実行速度は Espresso のみ「実機/エミュレータ起動コスト」を含めた採点に注記する

- [ ] **Step 1: 既存 Android プロジェクトを確認**

```bash
ls frontend/android/
cat frontend/android/demo-sdk/build.gradle 2>/dev/null || echo "(not present)"
cat frontend/android/app/build.gradle 2>/dev/null || echo "(not present)"
```

- [ ] **Step 2: 8 軸を採点（2 候補）**

採点方針:
- Gradle JVM unit: L1=低い（Java/Kotlin 開発者前提）、L7=高速（JVM のみ）、L5=Java Test Runner 拡張で良好
- Espresso instrumented: L7 はエミュ起動コスト含めると低い、L4 デバッグ体験は実機で限定的
- L3 既存親和性: AAR 採用方針（親戦略書 §1）と整合
- NA を使うべき軸があるか検討（例: 両者の Gradle 統合は L5 で同等なので個別採点）

- [ ] **Step 3: 加重平均を計算**

- [ ] **Step 4: §2.7.1 採点表を埋める（2 候補、L7 に注記）**

```markdown
#### 2.7.1 採点表

| 軸 | Gradle JVM unit | 根拠 | Espresso instrumented | 根拠 |
|---|---|---|---|---|
| L1 学習コスト | <s> | ... | <s> | ... |
| ... |
| L7 実行速度 | <s> | JVM のみ秒オーダー | <s> | エミュ起動 30-60s 含むと分オーダー（注記: 起動コスト除けば数十秒） |
| ... |
| **総合（加重平均）** | **<X.XX>** | — | **<Y.YY>** | — |
```

**置換対象**: `#### 2.7.1 採点表\n\n\`(後続 plan で埋める。AAR 内 JVM unit と Espresso instrumented をそれぞれ 8 軸で採点。L7 実行速度は Espresso のみ「実機/エミュレータ起動コスト」を含めた採点に注記する)\``

- [ ] **Step 5: §2.7.2 採否解説を埋める**

「両者は補完関係で、JVM unit は数を稼ぎ、Espresso は実機検証の 1 ケースに限定する」という複合採用の根拠を本プロジェクトでの選択理由に書く。

**置換対象**: `#### 2.7.2 採否解説\n\n\`(後続 plan で埋める)\``

- [ ] **Step 6: §1.1 ルーブリック照合**

- [ ] **Step 7: コミット**

```bash
git add docs/superpowers/specs/2026-05-20-test-tool-comparison-design.md
git commit -m "docs(test-tool-comparison): score §2.7 Android SDK runner (Gradle JVM + Espresso)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: §2.8 エビデンス (各種レポーター比較)

**Files:**
- Modify: `docs/superpowers/specs/2026-05-20-test-tool-comparison-design.md` §2.8.1 / §2.8.2

**前提整理**:
- 採用品は複合: Vitest HTML / mochawesome / Gradle HTML / Espresso screenrecord
- 不採用候補: Cypress 動画録画（親戦略書 §1）
- §2.8.3 プロトタイプ設計なし
- 採点表は採用品要素を 1 候補にまとめるか、要素ごとに採点するかを Step 2 で判断

- [ ] **Step 1: 既存レポータ設定を確認**

```bash
grep -n "reporters\|reporter" frontend/vite.config.ts frontend/cypress.config.ts 2>/dev/null
ls frontend/.vitest-report frontend/tests/e2e/reports 2>/dev/null
```

親戦略書 §5.1（エビデンス表）と §5.4（レポータ設定例）を読み返す。

- [ ] **Step 2: 採点単位を決める**

判断:
- (A) 採用品 4 要素を 1 候補としてまとめ、Cypress 動画と 2 候補比較にする
- (B) 採用品 4 要素を別個に採点し、Cypress 動画を加えた 5 候補にする
- **推奨: (A)**。「Cypress 動画は重く保守しにくいので不採用」という親戦略書の決定を 1 軸の比較で表現できる

- [ ] **Step 3: 採点（採用品セット vs Cypress 動画録画）**

採点方針（採用品セット）:
- L4 デバッグ体験: スクショ + HTML + JUnit XML の 3 点セットで失敗時の文脈が読める → 高
- L8 エコシステム: 各レポータの選択肢が広い → 高
- L7 実行速度: ファイル書き出しのみで軽い → 高

採点方針（Cypress 動画録画）:
- L7 実行速度: 録画コスト大、CI で 1 spec あたり数十秒～分の増加
- L4 デバッグ体験: 動画は便利だが PR レビューで再生コストが高い
- L8 エコシステム: 動画は標準機能だが artifact サイズが大きく artifact 保持期間を圧迫

- [ ] **Step 4: 加重平均を計算**

- [ ] **Step 5: §2.8.1 採点表を埋める**

**置換対象**: `#### 2.8.1 採点表\n\n\`(後続 plan で埋める。「Cypress 動画録画（不採用）」を比較対象に含めること)\``

- [ ] **Step 6: §2.8.2 採否解説を埋める**

「PR レビュー実用度」を L4 / L8 の根拠に含める。動画録画は「学習サンプル集としては artifact サイズと再生コストが見合わない」を選択理由に書く。

**置換対象**: `#### 2.8.2 採否解説\n\n\`(後続 plan で埋める。L8 エコシステムは「PR レビュー実用度」を根拠に含める)\``

- [ ] **Step 7: §1.1 ルーブリック照合**

- [ ] **Step 8: コミット**

```bash
git add docs/superpowers/specs/2026-05-20-test-tool-comparison-design.md
git commit -m "docs(test-tool-comparison): score §2.8 evidence (reporter stack vs cypress video)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: §2.9 設計書連係（API）: OpenAPI examples vs 独立 YAML/JSON

**Files:**
- Modify: `docs/superpowers/specs/2026-05-20-test-tool-comparison-design.md` §2.9.1 / §2.9.2

**前提整理**:
- 採用品: OpenAPI `examples` 拡張
- 不採用候補: 独立 YAML / JSON データシート
- 親戦略書 §1.1 不採用理由: 「OpenAPI と二重管理になり仕様とずれるリスクが高い」
- §2.9.3 プロトタイプ設計なし

- [ ] **Step 1: 既存 OpenAPI と Orval 設定を確認**

```bash
cat openapi/openapi.yaml | head -100
cat frontend/orval.config.ts
ls frontend/src/mocks/
```

- [ ] **Step 2: 8 軸を採点**

採点方針:
- L3 既存親和性: OpenAPI は Orval 直接対応 + 既存 MSW handler が examples を読む方針 → 5 点圏。独立 YAML/JSON は別パイプ
- L1 学習コスト: OpenAPI examples は spec を学んだ人にはほぼ追加コストなし
- L6 保守性: 独立 YAML/JSON は仕様変更時の追従が手動

- [ ] **Step 3: 加重平均を計算**

- [ ] **Step 4: §2.9.1 採点表を埋める**

**置換対象**: `#### 2.9.1 採点表\n\n\`(後続 plan で埋める)\``

- [ ] **Step 5: §2.9.2 採否解説を埋める**

L3 既存親和性の根拠に「Orval / MSW パイプとの整合」を含める。

**置換対象**: `#### 2.9.2 採否解説\n\n\`(後続 plan で埋める。L3 既存親和性は Orval / MSW パイプとの整合を根拠に含める)\``

- [ ] **Step 6: §1.1 ルーブリック照合**

- [ ] **Step 7: コミット**

```bash
git add docs/superpowers/specs/2026-05-20-test-tool-comparison-design.md
git commit -m "docs(test-tool-comparison): score §2.9 spec-API linkage (OpenAPI examples vs standalone YAML/JSON)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: §2.10 設計書連係（UI/SDK）: Markdown 決定表 vs Gherkin

**Files:**
- Modify: `docs/superpowers/specs/2026-05-20-test-tool-comparison-design.md` §2.10.1 / §2.10.2

**前提整理**:
- 採用品: Markdown 決定表 → `it.each`
- 不採用候補: Gherkin (.feature)
- 親戦略書 §1.1 不採用理由: 「step 実装が別ファイルになるため、Markdown 決定表のほうがテストとの距離が近い」
- §2.10.3 プロトタイプ設計なし

- [ ] **Step 1: 親戦略書の決定表サンプルを確認**

親戦略書 §3.3「Markdown 決定表スキーマ」と §3.5「テスト側の使用例」を読む。

- [ ] **Step 2: 8 軸を採点**

採点方針:
- L1 学習コスト: Markdown は学習者全員が読める。Gherkin は Given/When/Then 学習 + step 定義の概念が要る
- L3 既存親和性: 本プロジェクトに BDD ツール（Cucumber 等）導入歴なし。Markdown のみで完結
- L4 デバッグ体験: Markdown 決定表 → `it.each` は失敗時に case_id で特定可能。Gherkin は step マッチング失敗時の情報が薄い
- L8 エコシステム: Gherkin は BDD ツール一式が必要

- [ ] **Step 3: 加重平均を計算**

- [ ] **Step 4: §2.10.1 採点表を埋める**

**置換対象**: `#### 2.10.1 採点表\n\n\`(後続 plan で埋める)\``

- [ ] **Step 5: §2.10.2 採否解説を埋める**

L1 学習コストの根拠に「step 実装ファイルの分離」と「テーブル直接記述」の比較を含める。

**置換対象**: `#### 2.10.2 採否解説\n\n\`(後続 plan で埋める。L1 学習コストには「step 実装ファイルの分離」と「テーブル直接記述」の比較を含める)\``

- [ ] **Step 6: §1.1 ルーブリック照合**

- [ ] **Step 7: コミット**

```bash
git add docs/superpowers/specs/2026-05-20-test-tool-comparison-design.md
git commit -m "docs(test-tool-comparison): score §2.10 spec-UI/SDK linkage (Markdown DT vs Gherkin)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: §2.11 雛形生成: plop vs hygen

**Files:**
- Modify: `docs/superpowers/specs/2026-05-20-test-tool-comparison-design.md` §2.11.1 / §2.11.2

**前提整理**:
- 採用品: plop
- 不採用候補: hygen
- §2.11.3 プロトタイプ設計なし

- [ ] **Step 1: 候補の公式情報を確認**

- plop: https://plopjs.com/
- hygen: https://www.hygen.io/

```bash
ls plop/ 2>/dev/null || echo "(plopfile 未作成、親戦略書 P7 で実装予定)"
```

- [ ] **Step 2: 8 軸を採点**

採点方針:
- L1 学習コスト: plop は Handlebars + inquirer.js で対話 UI が標準、hygen は EJS + シェル風
- L8 エコシステム: plop は Node 系で広く採用、hygen は新興
- L3 既存親和性: 両者とも JS/TS プロジェクトに合流可能、差は小さい
- L6 保守性: 両者ともメンテナンスは継続中だが、plop の方がリリース頻度高い

- [ ] **Step 3: 加重平均を計算**

- [ ] **Step 4: §2.11.1 採点表を埋める**

**置換対象**: `#### 2.11.1 採点表\n\n\`(後続 plan で埋める)\``

- [ ] **Step 5: §2.11.2 採否解説を埋める**

「Vue / Vite プロジェクトでの採用事例の多さ」を plop 採用の主要因として書く。

**置換対象**: `#### 2.11.2 採否解説\n\n\`(後続 plan で埋める)\``

- [ ] **Step 6: §1.1 ルーブリック照合**

- [ ] **Step 7: コミット**

```bash
git add docs/superpowers/specs/2026-05-20-test-tool-comparison-design.md
git commit -m "docs(test-tool-comparison): score §2.11 scaffold (plop vs hygen)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: §3.1 / §3.2 / §3.3 サマリ集計

**Files:**
- Modify: `docs/superpowers/specs/2026-05-20-test-tool-comparison-design.md` §3.1 / §3.2 / §3.3

**前提整理**:
- §2.1-§2.11 の採点表から各候補の総合スコアと判定区分を転記
- §3.1 採用品 / §3.2 比較サンプル品 / §3.3 不採用候補の 3 表に振り分け
- §2.1 Vitest と Jest はすでに計算済み（4.75 / 3.85）

- [ ] **Step 1: §2.1-§2.11 から総合スコアを抽出**

```bash
grep -nE "^\| \*\*総合" docs/superpowers/specs/2026-05-20-test-tool-comparison-design.md
```

候補名・総合スコア・判定区分を一覧化する（手元メモまたは一時ファイル）。

- [ ] **Step 2: §3.1 採用品サマリを更新**

採用品列に対応する候補（11 行）のスコアと判定を埋める。

**置換対象**:

```
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
```

カテゴリ 7（複合採用）は Gradle JVM unit と Espresso の平均、またはどちらか代表値を採用するかを Task 6 で決めたルールに従う。

カテゴリ 8（複合エビデンス）は Task 7 で決めた採点単位に従う。

- [ ] **Step 3: §3.2 比較サンプル品サマリを更新**

`Testing Library` / `Playwright` / `Capacitor 公式 mock` の 3 行を埋める。

- [ ] **Step 4: §3.3 不採用候補サマリを更新**

`Jest`（3.85 / 良好 / §2.1.2 のとおり不採用）/ `happy-dom` / `nock` / `axios-mock-adapter` / `WebdriverIO` / `Cypress 動画録画` / `独立 YAML/JSON` / `Gherkin` / `hygen` の 9 行を埋める。

- [ ] **Step 5: 検証**

- [ ] §3.1 の 11 行全て埋まったか
- [ ] §3.2 の 3 行全て埋まったか
- [ ] §3.3 の 9 行全て埋まったか
- [ ] 判定区分の文言（優秀/良好/要注意/不適）が §1.3 と一致するか
- [ ] §3.1-§3.3 のスコアが §2 各節の採点表と一致するか（転記ミスがないか）

```bash
grep -nE "(TBD|tbd)" docs/superpowers/specs/2026-05-20-test-tool-comparison-design.md
```

Expected: 出力なし（§3.4 を除く）

- [ ] **Step 6: コミット**

```bash
git add docs/superpowers/specs/2026-05-20-test-tool-comparison-design.md
git commit -m "docs(test-tool-comparison): aggregate §3.1-§3.3 summary tables

§2 各節の採点結果を §3.1 採用品 / §3.2 比較サンプル / §3.3 不採用候補
の 3 サマリに集約。全 23 行のスコアと判定区分を確定。

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: §3.4 観察された傾向と学習者向けガイド執筆

**Files:**
- Modify: `docs/superpowers/specs/2026-05-20-test-tool-comparison-design.md` §3.4

**前提整理**:
- §3.4 は本書で唯一「執筆者の観察」を書く節
- §3.4 の指示は本書 §3.4 自体に箇条書きされている
- 量は 200-400 字（4 観点 × 50-100 字程度）

- [ ] **Step 1: §3.1-§3.3 サマリを再読**

```bash
sed -n '/^### 3.1/,/^### 3.4/p' docs/superpowers/specs/2026-05-20-test-tool-comparison-design.md
```

- [ ] **Step 2: 4 観点を書く**

§3.4 の指示に従い、以下の 4 観点を書く:

1. **学習導線軸と成熟度軸の相関**: L1/L2/L3 と L7/L8 の高低に相関があるか（例: 新興ツールは L1 が高くて L8 が低い傾向、など）
2. **比較サンプル枠に達した不採用候補の数**: §3.3 で「要注意」以上に判定された不採用候補が何個か。多ければ §6.4 Open Item #4「比較サンプル CI 実行」の判断材料に
3. **学習者の次の手**: §3.3 の不採用候補のうち最高得点のものを「学習サンプル拡張の次候補」として提示
4. **改訂提案**: 採点中に親戦略書の決定を覆す候補が出たか（例: もし jsdom 採用なのに happy-dom が 4.5 を超えたら改訂提案を §3.4 に書く）

§3.4 の節を上書き:

```markdown
### 3.4 観察された傾向と学習者向けガイド

#### 学習導線軸と成熟度軸の相関
<50-100 字>

#### 客観評価が「良好」以上に達した不採用候補
<50-100 字。具体的にどのカテゴリの何が該当するか>

#### 学習者の次の手（学習サンプル拡張の優先順位）
<50-100 字。§3.3 のうち最高得点の候補名と、それを学ぶと何が広がるか>

#### 改訂提案
<該当なしの場合は「該当なし。本書の採点結果は親戦略書 §1 の決定と整合する」。改訂提案がある場合は親戦略書 §1 / §1.1 の該当行を明示>
```

**置換対象**:

```markdown
### 3.4 観察された傾向と学習者向けガイド

採点完了後、以下の観点で 200-400 字程度の所見を書き加える。

1. L1 / L2 / L3（学習導線軸）と L7 / L8（成熟度軸）の相関の有無
2. 「採用品の総合スコア」と「不採用候補のうち判定が比較サンプル枠に達したもの」の数 — 親戦略書 §6.4 Open Items #4 への材料
3. 学習者が次に手を伸ばすなら「不採用候補のうち最も高得点のもの」 — 学習サンプル拡張の優先順位
4. 採点中に親戦略書の決定を覆す候補が出た場合の改訂提案
```

- [ ] **Step 3: 文字数チェック**

```bash
sed -n '/^### 3.4/,/^---$/p' docs/superpowers/specs/2026-05-20-test-tool-comparison-design.md | wc -c
```

Expected: 4 観点合計で日本語 200-400 字相当（バイト数換算で 600-1200 程度）

- [ ] **Step 4: 改訂提案の有無を確認**

- [ ] §3.3 の不採用候補で「優秀」判定（≥4.5）になったものがあるか
- [ ] あれば §3.4「改訂提案」サブ節にその候補名と提案内容を明記
- [ ] なければ「該当なし」と書く

- [ ] **Step 5: コミット**

```bash
git add docs/superpowers/specs/2026-05-20-test-tool-comparison-design.md
git commit -m "docs(test-tool-comparison): write §3.4 observations and learner guide

4 観点（学習導線×成熟度の相関、客観評価良好以上の不採用候補、学習者の次の手、
改訂提案の有無）を 200-400 字で執筆。

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 13 (任意): 親戦略書への反映

**Files:**
- Modify: `docs/superpowers/specs/2026-05-20-test-strategy-design.md` §1 / §1.1（改訂提案がある場合のみ）

**実行条件**: Task 12 Step 4 で改訂提案が記載された場合のみ実施。改訂提案がなければスキップ。

- [ ] **Step 1: §3.4 の改訂提案を読み返す**

- [ ] **Step 2: 親戦略書 §1 決定表と §1.1 不採用候補メモの該当行を更新**

例: もし happy-dom が「優秀」判定で改訂提案が出たら、§1.1 の「happy-dom 不採用理由」に「客観評価では優秀だが、本プロジェクトでは Ionic Shadow DOM 検証で jsdom 優位を維持」のような追記を行う。

- [ ] **Step 3: コミット**

```bash
git add docs/superpowers/specs/2026-05-20-test-strategy-design.md
git commit -m "docs(test-strategy): reflect findings from test-tool-comparison §3.4

比較検討書 §3.4 改訂提案に基づき親戦略書 §1 / §1.1 を更新。

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 14: 後片付け

**Files:**
- Delete: `scripts/score.mjs`（Task 0 で作成した場合のみ）

- [ ] **Step 1: 一時スクリプトの削除**

```bash
test -f scripts/score.mjs && git rm scripts/score.mjs
```

ファイルが存在しなければスキップ。

- [ ] **Step 2: 仕上げのファイル全体チェック**

```bash
grep -nE "TBD|tbd|後続 plan で埋める|`\(.*\)`" docs/superpowers/specs/2026-05-20-test-tool-comparison-design.md
```

Expected: 出力なし（全プレースホルダが埋まったことの確認）

- [ ] **Step 3: 加重平均の整合性をスポットチェック**

任意の §2.x 採点表から 1 つ選び、Step 2 と同じ式で総合スコアを再計算 → 表記値と一致するか確認。

- [ ] **Step 4: コミット（削除があった場合のみ）**

```bash
git commit -m "chore(test-tool-comparison): remove temporary scoring helper

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 5: 完了報告**

ユーザーに完了を報告し、最終的なコミット履歴と本書 §3.1-§3.4 のサマリを示す。

```bash
git log --oneline -20
```

---

## 自己レビュー（プラン作成後の確認用、実行時は無視可）

- [x] Spec coverage: 設計書 §2.2-§2.11 / §3.1-§3.4 を Task 1-12 がカバー。§2.1 と §1 は変更対象外
- [x] Type consistency: 「採用品」「比較サンプル」「不採用候補」「優秀/良好/要注意/不適」を全タスクで統一
- [x] Placeholder scan: スコア値そのものはタスク実行時に埋まる前提（リサーチ作業）。プレースホルダではなく作業指示として書いている。表構造・採点ルール・置換対象文字列は完全に明示済み
- [x] §2.1 見本ケースとの整合: Task 0 で計算式を再検証することで残りのタスクの計算精度を担保
