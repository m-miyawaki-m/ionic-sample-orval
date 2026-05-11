# Architecture Diagrams

PlantUML 形式のアーキテクチャ図一式。

## ファイル一覧

| ファイル | 内容 | 想定読者 |
|---------|------|---------|
| [`01-component-overview.puml`](./01-component-overview.puml) | システム全体の構成要素と依存関係 | 全員（最初に見る） |
| [`02-codegen-pipeline.puml`](./02-codegen-pipeline.puml) | `npm run gen` の処理フロー（Orval が何を生成するか） | フロント開発者 |
| [`03-sequence-msw.puml`](./03-sequence-msw.puml) | MSW モードでボタン押下時に何が起きるか | フロント開発者 |
| [`04-sequence-real-be.puml`](./04-sequence-real-be.puml) | 実 BE モードでボタン押下時に何が起きるか | フロント+BE 開発者 |
| [`05-deployment-modes.puml`](./05-deployment-modes.puml) | 4 つの運用モード（MSW/実BE/Prism/Android）の差分 | DevOps・運用担当 |
| [`06-app-architecture.puml`](./06-app-architecture.puml) | Android アーキテクチャ参考のレイヤー責務図（UI / Domain / Data）を FE+BE フルスタックで | アプリ設計者 |

## 表示方法

### A. VS Code で見る

PlantUML 拡張機能をインストール：

```
code --install-extension jebbs.plantuml
```

`.puml` ファイルを開いて `Alt+D`（Preview Current Diagram）。

### B. ブラウザで見る（`plantuml.com`）

各 `.puml` の中身をコピーして以下に貼り付け：

- https://www.plantuml.com/plantuml/uml/

### C. PNG/SVG に書き出す

```powershell
# plantuml.jar を持っている場合
java -jar plantuml.jar docs/architecture/*.puml -o ../images
# → docs/images/ に PNG が出力される
```

VS Code の PlantUML 拡張機能なら、プレビュー画面の右上から PNG/SVG エクスポート可能。

## 図を更新したとき

仕様や実装を変えたら、この `architecture/` ディレクトリの該当 `.puml` も追従させる。特に：

- エンドポイント追加 → `01` と `03`/`04` のシーケンスに reflect
- モードを増やした（OAuth, Docker等） → `05` に追加
- ビルド構成を変えた → `02` を更新
