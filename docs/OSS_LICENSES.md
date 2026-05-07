# OSS ライセンス管理一覧

本ドキュメントは、本プロジェクト（`ionic-temp-scaffold`）で使用しているオープンソースソフトウェア（OSS）のライセンス情報を管理するためのものです。

- **プロジェクト名**: ionic-temp-scaffold
- **バージョン**: 0.0.1
- **最終更新日**: 2026-05-08
- **対象範囲**: `dependencies` および `devDependencies`、ならびにそれらの推移的依存（transitive dependencies）すべて

---

## 1. 一覧の生成方法（推奨）

推移的依存を含むすべてのパッケージは数百件規模になるため、ツールによる自動生成を推奨します。本ドキュメントの「全パッケージ一覧」セクションは、以下のコマンドで再生成してください。

### 1.1 ツールのインストール

```bash
npm install -g license-checker-rseidelsohn
```

> `license-checker` のメンテナンス継続版です。`npm install --save-dev` でプロジェクトローカルに入れる運用も可能です。

### 1.2 一覧出力（Markdown 表形式）

```bash
# 本番依存のみ
npx license-checker-rseidelsohn --production --csv --out licenses-prod.csv

# devDependencies も含めた全体
npx license-checker-rseidelsohn --csv --out licenses-all.csv

# JSON で取得（プログラム処理向け）
npx license-checker-rseidelsohn --json --out licenses-all.json
```

### 1.3 ライセンステキストを一括取得

第三者への配布が必要な場合は、各パッケージの `LICENSE` 全文を以下で集約できます。

```bash
npx license-checker-rseidelsohn --customPath ./license-format.json --out THIRD_PARTY_NOTICES.txt
```

### 1.4 禁止ライセンスの検出（CIで利用推奨）

GPL/AGPL 系などコピーレフトライセンスの混入を防ぐ場合：

```bash
# GPL系を検知したら exit 1
npx license-checker-rseidelsohn --production --failOn 'GPL;AGPL;LGPL;CPAL;MPL'
```

CI（GitHub Actions等）に組み込むことで、依存追加時の事故を防げます。

---

## 2. 主要な直接依存パッケージ（手動管理）

`package.json` に直接記載されているパッケージの一覧です。**バージョン・ライセンスは本ドキュメント作成時点の参考値**であり、確定情報は前述のツール出力で確認してください。

### 2.1 本番依存（dependencies）

| # | パッケージ名 | バージョン | ライセンス | 用途 | 配布元 |
|---|---|---|---|---|---|
| 1 | @capacitor/android | 5.7.8 | MIT | Capacitor Android プラットフォーム | https://github.com/ionic-team/capacitor |
| 2 | @capacitor/app | 5.0.8 | MIT | アプリ状態・ライフサイクル取得 | https://github.com/ionic-team/capacitor-plugins |
| 3 | @capacitor/cli | 5.7.8 | MIT | Capacitor コマンドラインツール | https://github.com/ionic-team/capacitor |
| 4 | @capacitor/core | 5.7.8 | MIT | Capacitor コアランタイム | https://github.com/ionic-team/capacitor |
| 5 | @capacitor/haptics | 5.0.8 | MIT | 触覚フィードバック（バイブレーション）API | https://github.com/ionic-team/capacitor-plugins |
| 6 | @capacitor/keyboard | 5.0.9 | MIT | ソフトウェアキーボード制御 | https://github.com/ionic-team/capacitor-plugins |
| 7 | @capacitor/status-bar | 5.0.8 | MIT | ステータスバー制御 | https://github.com/ionic-team/capacitor-plugins |
| 8 | @ionic/vue | ^8.0.0 | MIT | Ionic Framework の Vue バインディング | https://github.com/ionic-team/ionic-framework |
| 9 | @ionic/vue-router | ^8.0.0 | MIT | Ionic 用の Vue Router 拡張 | https://github.com/ionic-team/ionic-framework |
| 10 | axios | ^1.16.0 | MIT | HTTP クライアント（API 呼び出し） | https://github.com/axios/axios |
| 11 | ionicons | ^7.0.0 | MIT | Ionic 公式アイコンライブラリ | https://github.com/ionic-team/ionicons |
| 12 | vue | ^3.3.0 | MIT | Vue.js コアフレームワーク | https://github.com/vuejs/core |
| 13 | vue-router | ^4.2.0 | MIT | Vue 公式ルーティングライブラリ | https://github.com/vuejs/router |

### 2.2 開発依存（devDependencies）

| # | パッケージ名 | バージョン | ライセンス | 用途 | 配布元 |
|---|---|---|---|---|---|
| 1 | @faker-js/faker | ^10.4.0 | MIT | テスト用ダミーデータ生成 | https://github.com/faker-js/faker |
| 2 | @vitejs/plugin-legacy | ^5.0.0 | MIT | レガシーブラウザ向けビルド対応 | https://github.com/vitejs/vite |
| 3 | @vitejs/plugin-vue | ^4.0.0 | MIT | Vite 用 Vue プラグイン | https://github.com/vitejs/vite-plugin-vue |
| 4 | @vue/eslint-config-typescript | ^12.0.0 | MIT | Vue + TypeScript 用 ESLint 設定 | https://github.com/vuejs/eslint-config-typescript |
| 5 | @vue/test-utils | ^2.4.10 | MIT | Vue コンポーネントテストユーティリティ | https://github.com/vuejs/test-utils |
| 6 | cypress | ^13.5.0 | MIT | E2E テストフレームワーク | https://github.com/cypress-io/cypress |
| 7 | eslint | ^8.35.0 | MIT | JavaScript/TypeScript リンター | https://github.com/eslint/eslint |
| 8 | eslint-plugin-vue | ^9.9.0 | MIT | Vue 用 ESLint プラグイン | https://github.com/vuejs/eslint-plugin-vue |
| 9 | jsdom | ^22.1.0 | MIT | テスト用 DOM 実装 | https://github.com/jsdom/jsdom |
| 10 | msw | ^2.14.4 | MIT | モック Service Worker（API モック） | https://github.com/mswjs/msw |
| 11 | orval | ^8.9.1 | MIT | OpenAPI → クライアントコード生成 | https://github.com/anymaniax/orval |
| 12 | terser | ^5.4.0 | BSD-2-Clause | JavaScript ミニファイヤ | https://github.com/terser/terser |
| 13 | typescript | ~5.9.0 | Apache-2.0 | TypeScript コンパイラ | https://github.com/microsoft/TypeScript |
| 14 | vite | ^5.0.0 | MIT | フロントエンドビルドツール | https://github.com/vitejs/vite |
| 15 | vitest | ^0.34.6 | MIT | ユニットテストフレームワーク | https://github.com/vitest-dev/vitest |
| 16 | vue-tsc | ^2.1.10 | MIT | Vue 用 TypeScript 型チェッカ | https://github.com/vuejs/language-tools |

---

## 3. ライセンス種別サマリ

直接依存に含まれるライセンスの分布です。推移的依存を含む完全な分布は、`license-checker-rseidelsohn --summary` で取得してください。

| ライセンス | 件数（直接依存） | 商用利用 | 改変時の主な義務 |
|---|---|---|---|
| MIT | 27 | 可 | ライセンス全文・著作権表示の保持 |
| Apache-2.0 | 1 | 可 | ライセンス全文の保持・変更通知・特許条項 |
| BSD-2-Clause | 1 | 可 | ライセンス全文・著作権表示の保持 |

> いずれも**寛容型（permissive）ライセンス**であり、商用配布を含む利用に大きな制約はありません。ただし、**配布物（リリースビルド）に各 OSS の著作権表示およびライセンス全文を同梱する義務**があります（多くの場合、アプリ内の「ライセンス情報」画面や `THIRD_PARTY_NOTICES.txt` で対応）。

---

## 4. 配布物への同梱（実務上の注意）

Capacitor で Android アプリをビルドして配布する場合、以下の対応を推奨します。

1. **アプリ内「ライセンス情報」画面の用意**
   - 設定画面等から `THIRD_PARTY_NOTICES.txt` を表示できるようにする
   - もしくは静的な HTML として同梱

2. **生成スクリプトを CI に組み込む**
   ```bash
   # 例: ビルド前に NOTICES を更新
   npm run gen:licenses && npm run build
   ```

3. **GPL/AGPL 系ライセンスの混入チェック**
   - 1.4 のコマンドを CI で実行し、ビルド失敗させる

---

## 5. 推移的依存の全件一覧（自動生成）

> このセクションは `license-checker-rseidelsohn` の出力で置き換えてください。
> 例: `npx license-checker-rseidelsohn --markdown > deps-section.md`

```text
（ここに自動生成結果を貼り付け）
```

---

## 6. 更新履歴

| 日付 | 更新者 | 内容 |
|---|---|---|
| 2026-05-08 | 宮脇 | 初版作成 |

---

## 付録: 参考リンク

- [SPDX License List](https://spdx.org/licenses/) — ライセンス識別子の標準
- [Choose a License](https://choosealicense.com/) — ライセンス比較
- [tldrlegal](https://www.tldrlegal.com/) — ライセンス概要
