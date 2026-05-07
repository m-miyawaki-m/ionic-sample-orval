# OpenAPI を中心にしたインターフェース契約

このプロジェクトでは **`openapi/openapi.yaml` が「真実」**で、フロント・バックエンドの両方がそこから派生する。

このドキュメントは、なぜそうなのか、どう運用するのか、Java 側の Swagger 出力との関係はどうあるべきかを **判断できる形でまとめたもの**。

---

## 1. 結論（結論から先に）

| 質問 | 答え |
|------|------|
| 画面の型定義は Java の Swagger 出力で生成するのが正解か？ | **このプロジェクトでは NO**。Java の Swagger 出力は「BE 実装が yaml に追従しているか **確認するためのビューア**」であり、フロントの型生成元ではない。 |
| では正しい源は何か？ | **手書きの `openapi/openapi.yaml`**。これが両者の契約書。 |
| Java 側の Springdoc は何のためにあるのか？ | BE 開発者がエンドポイントの仕様を**目視確認・手動テスト**するためのドキュメント UI。yaml と差分があれば実装を直すサイン。 |
| 「普通は画面から作って次に BE」じゃないの？ | それは **画面-First** の話で、Spec-First とは**別の軸**。両者は組み合わさる。このプロジェクトは「**プロト＝画面-First の上に Spec-First を重ねた hybrid**」（§3）。 |

---

## 2. 「最初に何を固めるか」で分類する 4 アプローチ

開発の最初に何を「真実」とするかで、現場では 4 つのアプローチが語られる。
**実プロジェクトはこれらが混ざる**ので、純粋な分類というより「重心がどこか」で見るとよい。

| アプローチ | 最初に固めるもの | 「真実」の置き場所 |
|----------|--------------|-----------------|
| **Spec-First** | API 契約（OpenAPI yaml） | `openapi/openapi.yaml`（手書き） |
| **Code-First** | Java/コードのアノテーション | `ItemController.java`（コード） |
| **画面-First（UI-First）** | UI 画面・遷移・要素 | Figma / 紙のモック / プロト UI |
| **BE-First** | DB 設計・業務ロジック | DB スキーマ・既存 BE コード |

**この 4 つは排他ではなく、組み合わさる**：

```
画面-First で UI を固める  ──┐
                              ├─→ そこから API を逆算 → Spec-First で yaml を書く → 並行開発
BE-First で DB を固める    ──┘
```

たとえば：

- 「Figma で画面を固めた」**画面-First** の後、「その画面が必要とする API を yaml に起こす」**Spec-First** で本格開発に入る ── これが一番モダンな進め方
- 「既存DBがあるシステムを拡張する」**BE-First** の後、「JPAエンティティから OpenAPI を生成」**Code-First** に乗る ── 業務システムでよく見られる
- 「BE 担当者が yaml を書きたくないので Java アノテーションで済ませる」── 純粋な **Code-First**

### 2.1 Spec-First（このプロジェクトの選択）

```
[ openapi.yaml（手書き） ]   ← 真実
        │
        ├─► フロント：Orval が型・クライアント・モックを生成
        ├─► モック：Prism が yaml から HTTP サーバーを起動
        └─► バックエンド：開発者が yaml を読んで実装（手動）
              ↑
              起動後 /v3/api-docs で BE 実装ベースの spec を確認できる（≒監査ビュー）
```

**特徴**

- yaml を**設計書**として扱う
- フロント・バックエンドの議論が yaml ベースで行える
- バックエンド未実装の段階でフロントを進められる
- BE 言語に依らず（Java でも Python でも Go でも）再利用できる

**弱点**

- yaml を書くスキルが要る
- BE 実装が yaml と乖離するリスク（自動チェックされない）
- BE 側の yaml 出力（Springdoc）と手書き yaml の整合性は人間が確認する必要がある

### 2.2 Code-First

```
[ Java + アノテーション（@Operation 等）]   ← 真実
        │
        └─► Springdoc が起動時に yaml を生成
              │
              └─► /v3/api-docs.json として公開
                    │
                    └─► フロント：このURLを Orval の input に指定
```

**特徴**

- BE 開発者が yaml を直接書かなくてよい
- アノテーションで型・必須・例を表現（Java の型システムで一部担保）
- yaml は「BE 実装の自動生成物」なので**乖離が起きない**

**弱点**

- BE が動いていないとフロントが何もできない
- BE 言語・フレームワークに引きずられた spec になりがち
- フロント先行の議論ができない（yaml が「実装の結果」になる）
- BE の都合で型が変わる（必須フィールドが減る、フィールド名が変わる、等）

### 2.3 画面-First（UI-First）

```
[ Figma / モック / 手書き UI ]   ← UI が真実
        │
        └─► 画面が必要とするデータを洗い出す
              │
              └─► API 契約に落とす（yaml or アノテーション）
                    │
                    └─► FE / BE が実装
```

**特徴**

- ユーザー体験が起点になり、ビジネス要求と直結
- PM・デザイナーが議論を主導しやすい
- 不要な API を作りすぎない（YAGNI）

**弱点**

- 画面に出ない裏側の処理（バッチ・通知・連携）の設計が抜け落ちがち
- 画面が変わる度に API 設計もブレる
- BE 担当者が「画面の都合」に振り回されて不満を持つ

### 2.4 BE-First

```
[ DB スキーマ / 既存ビジネスロジック ]   ← BE が真実
        │
        └─► エンドポイント・型を BE 都合で設計
              │
              └─► FE はそれを消費する
```

**特徴**

- 既存システム拡張・データ駆動型に向く
- DB の正規化を保ちやすい
- 業務ロジックが安定的に蓄積される

**弱点**

- フロントは BE が動くまで何もできない
- 画面 UX が DB 構造に引っ張られて UX が悪化することがある
- 業務要件と UI 要件の調整コストが大きい

---

## 3. このプロジェクトの選択：画面-First → Spec-First の hybrid

このプロジェクトは **「プロトタイプ」の性格**を持つので、純粋な Spec-First ではなく：

```
[1] ふわっとした画面構想（画面-First の入口）
       「一覧・詳細・作成の3画面」「Item は { id, name, price }」
       Figma も詳細 wireframe も無い、頭の中での構想だけ
       │
       ▼
[2] その構想から openapi.yaml を起こす（ここから Spec-First）
       4 endpoints / 2 schemas / examples
       │
       ▼
[3] FE と BE が yaml を契約として並行開発
       FE: Orval で生成 → views 実装
       BE: yaml を見ながら controller/service を手で実装
```

つまり：

- **プロジェクト全体としては「画面-First」**（プロト用途、UI 先行）
- **API レイヤーの真実としては「Spec-First」**（yaml が契約）
- **Code-First は採用しない**（Springdoc は監査ビューに留める）

### なぜこの hybrid なのか

| 動機 | 説明 |
|------|------|
| **プロトタイプだから** | UI から考えるのが速い。詳細 spec を最初に固めても変わる |
| **学習プロジェクトだから** | yaml を手書きする経験を積みたい（Code-First では身につかない） |
| **フロント先行で動かしたい** | BE 未着手でも MSW で UI が動く（Spec-First の利点） |
| **BE 言語に依存しない契約にしたい** | yaml は Java/Go/Python 何でも繋がる |

### 純粋な Spec-First との違い

| 項目 | 純粋 Spec-First | このプロジェクト |
|------|---------------|----------------|
| 何から始まるか | yaml の draft | 画面の構想 |
| 仕様議論の主体 | API設計者・両側エンジニア | PM/UI 担当者 |
| yaml の細密さ | 詳細（バリデーション・ヘッダ等） | 要点のみ（学習に最低限） |
| BE-FE の同期 | yaml が真実、両側追従 | 同左 |

「**画面-First で 0→1 の構想を作り、Spec-First で 1→10 の実装を進める**」がこのプロジェクトの実態。

---

## 3.1 もしこのプロジェクトを「純粋な Spec-First」に近づけたら

学習が進んだ後、より厳密に Spec-First 寄りに振るには：

1. **yaml に詳細を追加**：error responses（400/401/500）、parameter validation（pattern/min/max）、security schemes
2. **CI で yaml 検証**：`@redocly/cli lint` を CI で走らせて構文・規約違反を検出
3. **BE と yaml の自動整合チェック**：`openapi-generator` で Java インタフェースを yaml から生成し、controller がそのインタフェースを `implements` する形にする
4. **break change の検出**：`oasdiff` を CI で走らせ、後方互換性のないスキーマ変更を block する

ここまで揃えると **「yaml が変わった瞬間に BE も型レベルで追従が強制される」**状態になる。プロトを越えて運用する段階で取り組むテーマ。

---

## 4. 真実は yaml — Springdoc は監査ビュー

Spring Boot 起動時、Springdoc は **コードを解析して yaml を自動生成**し、`/v3/api-docs` で公開する。

ここで重要：

> **`/v3/api-docs` の中身は手書きの `openapi.yaml` とは別物**である。Springdoc は Java コードから生成しているだけ。

両者の関係：

```
  openapi/openapi.yaml          ← 真実（手書き）
       │
       │ 開発者が両者を見比べる
       ▼
  http://localhost:8080/v3/api-docs   ← Java から自動生成（実装の結果）
```

**運用ルール**：

1. yaml を編集したら、フロント（`npm run gen`）と BE（手で controller / service を直す）の両方を追従させる
2. BE 起動後、`/v3/api-docs` を開いて手書き yaml と差分が無いか確認
3. 差分がある場合：
   - **yaml が正しい** と判断したら BE 実装を直す
   - **実装が正しい** と判断したら yaml を直す
4. どちらが正しいかは「設計判断」なので、機械的には決まらない

---

## 5. Java の Swagger アノテーションを「真実」にしてしまうケース

明示的にコードを「真実」にする運用もある。アノテーションを書けば、Springdoc が生成する yaml が detailed になる。

```java
@Operation(summary = "List all items", description = "...")
@ApiResponse(responseCode = "200", description = "OK",
  content = @Content(schema = @Schema(implementation = Item.class),
    examples = @ExampleObject(value = "[{\"id\":1,\"name\":\"ペン\",\"price\":200}]")))
@GetMapping
public List<Item> listItems() { ... }
```

これを徹底すると、**手書き yaml は不要**になり Code-First に舵を切れる。

ただし：

- アノテーション地獄になりがち（Java コードの可読性が落ちる）
- フロント先行で開発できなくなる
- BE 言語を変えるとアノテーションごと作り直し

このプロジェクトでは **Spec-First を維持**しているため、アノテーションは最小限（自動付与の `@RestController` `@GetMapping` のみ）。Springdoc が生成する yaml は「ざっくりした BE 実装の summary」で、リッチではない。それで十分。

---

## 6. このプロジェクトの正しい運用手順（決定版）

### 6.1 新しいエンドポイント / フィールドを追加するとき

```
[1] openapi/openapi.yaml を編集
       │
       ├──► swagger-cli で構文検証
       │     npx -y @apidevtools/swagger-cli validate openapi/openapi.yaml
       │
       ├──► フロント側を再生成
       │     cd frontend
       │     npm run gen
       │     npm run build      ← 型エラーが出る箇所を views に追従
       │
       ├──► バックエンド側を手で追従
       │     cd backend
       │     ItemController / ItemService / DTO を編集
       │     mvnw test           ← 既存テストが通ることを確認
       │
       ├──► 整合性確認
       │     mvnw spring-boot:run
       │     ブラウザで /v3/api-docs と yaml を見比べる
       │     差分があれば修正方針を決める
       │
       └──► コミット
             git add .
             git commit -m "feat: <仕様変更の内容>"
```

### 6.2 BE 実装が先に進んでしまったとき（緊急対応）

理想は Spec-First だが、現実には BE 側が先走るケースがある。その時の収束方法：

```
[1] BE を起動 → http://localhost:8080/v3/api-docs.json を取得
[2] その JSON を yaml に変換（or 手で yaml に反映）
       npx -y @redocly/cli bundle http://localhost:8080/v3/api-docs.json -o new-spec.yaml
[3] 既存 openapi.yaml と diff
[4] **差分のうち「望ましい」変更だけ** 手書き yaml に取り込む（BE の偶発的な変更に引きずられない）
[5] フロント側を再生成して整合
[6] BE 側で「望ましくない」変更があれば BE を直す
```

**ポイント**: BE の自動生成 yaml をそのまま yaml に上書きしない。**手書き yaml が「設計判断」を含んでいる**ので、自動生成で潰してはいけない。

### 6.3 仕様の議論段階（実装まだ無し）

```
[1] openapi/openapi.yaml を draft で書く
[2] cd frontend && npm run gen
[3] npm run dev → MSW モードで UI を作りながら違和感を確認
[4] scripts/start-mock-prism.cmd → curl/Postman で外部ツールでも触る
[5] チームレビュー（yaml ベースで議論、Swagger UI に表示して見せても良い）
[6] 確定したら BE 実装に着手
```

---

## 7. 自動同期したいなら：openapi-generator で Spring 雛形を生成

「BE 実装も yaml から自動生成したい（手で書きたくない）」なら、**`openapi-generator-maven-plugin`** でやる方法がある。

```xml
<!-- backend/pom.xml に追加（このプロジェクトでは未採用） -->
<plugin>
  <groupId>org.openapitools</groupId>
  <artifactId>openapi-generator-maven-plugin</artifactId>
  <version>7.x</version>
  <executions>
    <execution>
      <goals><goal>generate</goal></goals>
      <configuration>
        <inputSpec>${project.basedir}/../openapi/openapi.yaml</inputSpec>
        <generatorName>spring</generatorName>
        <apiPackage>jp.co.example.sample.api</apiPackage>
        <modelPackage>jp.co.example.sample.model</modelPackage>
        <configOptions>
          <interfaceOnly>true</interfaceOnly>
          <useSpringBoot3>true</useSpringBoot3>
        </configOptions>
      </configuration>
    </execution>
  </executions>
</plugin>
```

これで `mvn compile` 時に `ItemsApi` インタフェース（メソッドシグネチャを yaml から生成）と DTO クラスが自動生成される。コントローラはこのインタフェースを `implements` するだけ。

### このプロジェクトで採用しなかった理由

- **学習目的**：手で書く方が Spring の構造が頭に入る
- **生成物の品質ばらつき**：openapi-generator のテンプレートは古めかしいコードを吐く時がある
- **ビルド時間**：毎回コード生成するとビルドが遅い
- **Java の record と相性が良くない**：openapi-generator は Java Bean（getter/setter）を生成しがち

将来このプロジェクトを実務化するなら **検討の価値あり**（特に大規模 API になった時）。

---

## 8. 役割分担表（決定版）

| 役割 | 担当 | 動作 |
|------|-----|------|
| **真実の源** | `openapi/openapi.yaml` | 手書き |
| **フロント型** | Orval | yaml から自動生成（`src/api/models/`） |
| **フロントクライアント** | Orval | yaml から自動生成（`src/api/default/default.ts`） |
| **フロントモック** | Orval + MSW | yaml の `example` から自動生成 |
| **モックサーバー** | Prism | yaml を起動時に読み込む |
| **BE エンドポイント実装** | 開発者 | 手書き（yaml を見ながら） |
| **BE 型 (DTO)** | 開発者 | 手書き（yaml の schemas を見ながら） |
| **BE 監査ビュー** | Springdoc | コードから自動生成（yaml と比較するため） |
| **整合性チェック** | 開発者 | yaml と `/v3/api-docs` を見比べる |

---

## 9. よくある質問

### Q1. yaml を変えずに Java で型を変えたら？

→ `npm run gen` を走らせていなければフロントは検知できない。Springdoc 起動後に `/v3/api-docs` を見て、yaml と乖離していることに気づく。**この時点で BE 実装か yaml のどちらが正しいか議論し、片方を直す**。

### Q2. yaml と Java の型がそもそも違っていてビルドが通らない場合は？

→ Java の record 定義（`Item.java`）と yaml の `Item` schema を見比べる。フィールド数・名前・型が一致するかを目視で確認。例：

```yaml
# yaml
Item:
  required: [id, name, price]
  properties:
    id:    { type: integer, format: int64 }
    name:  { type: string }
    price: { type: integer }
```

```java
// Java（同じ構造を手で維持する必要がある）
public record Item(Long id, String name, Integer price) {}
```

### Q3. BE 開発者が「yaml を書きたくない」と言ったら？

→ 選択肢：
1. このまま Spec-First を続け、yaml はフロント担当が書く
2. Code-First に切り替え、Springdoc アノテーションを真実にする
3. ハイブリッド：openapi-generator で Java 雛形を yaml から生成し、BE は中身だけ書く

どれを選ぶかは**チームの能力構成と優先度**で決める。

### Q4. 既に大量に Java コードが書かれている場合 Spec-First への移行は？

→ Springdoc の `/v3/api-docs.json` をエクスポート → 手で yaml に整形 → そこから運用開始。一度移行できれば以降は Spec-First で運用可能。

### Q5. yaml を信じれば BE は正しいの？

→ NO。yaml は **インタフェース契約**であって、**実装の正しさは別途テストで担保**する必要がある。BE の `ItemServiceTest` のようなユニットテスト + 統合テストが yaml の整合性検証とは別の責務として必要。

### Q6. Spec-First と画面-First は同じ意味？「普通は画面から作って次にバックエンド」じゃないの？

→ **違う**。Spec-First は「**API の契約（yaml）を最初に固める**」、画面-First は「**UI を最初に固める**」。両者は別の軸の話で、組み合わさる。

| 軸 | 意味 |
|----|-----|
| Spec-First / Code-First | **API の真実をどこに置くか**（yaml or Java コード） |
| 画面-First / BE-First | **どちら側の開発を先に固めるか**（UI or DB/業務） |

現場でよくあるのは：

```
[画面-First]      Figma で UI を描く
       │
       ▼
[Spec-First]     画面に必要な API を yaml に書き起こす
       │
       ▼
                 FE と BE が yaml を契約に並行開発
```

「**画面 → yaml → 並行開発**」が現代的なモダンWeb 開発の典型例。「画面 → BE → FE」と直列で進む形は古い業務システム的アプローチで、今は減ってきている。

ただし業界に唯一の正解は無く、組織やプロジェクトによる：

- 業務系・既存DB拡張 → **BE-First + Code-First** が依然として主流
- 新規Web/SaaS → **画面-First + Spec-First** が増えている
- 公開API/SDK提供 → **Spec-First** ほぼ一択

このプロジェクトは「**プロト＝画面-First で構想 → Spec-First で yaml を真実に**」という典型的な hybrid を採用している（§3 参照）。

---

## 10. 図でまとめ（依存関係）

```
                  ┌──────────────────┐
                  │ openapi.yaml     │ ← 唯一の真実
                  │ (hand-written)   │
                  └─────────┬────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────────┐
│ Orval        │   │ Prism CLI    │   │ 開発者（人間）     │
│ (codegen)    │   │ (mock)       │   │ Java 実装         │
└───┬──────────┘   └──────┬───────┘   └────────┬─────────┘
    │                     │                    │
    ▼                     ▼                    ▼
TS 型 / クライアント /   HTTPモック :4010    Spring Boot :8080
MSW handlers
                                                │
                                                ▼
                                       ┌────────────────┐
                                       │ Springdoc UI    │
                                       │ /v3/api-docs   │ ← 監査ビュー（真実ではない）
                                       └────────────────┘
                                                │
                                                ▼
                                       開発者が yaml と比較
                                       → 差分あれば修正
```

---

## 11. このドキュメントの位置づけ

| ドキュメント | 何を答える |
|------------|----------|
| `README.md` | プロジェクトの概要 |
| `docs/roadmap.md` | どの順で作るか |
| `docs/getting-started.md` | どう起動するか |
| `docs/orval-and-openapi-guide.md` | Orval と yaml の機械的な仕組み |
| **`docs/openapi-contract.md`（このファイル）** | **どれが真実か・なぜそうしたか・どう運用するか（設計判断の記録）** |
| `docs/architecture/` | 視覚的な構造（PlantUML） |

新メンバーが「このプロジェクトのインタフェースの考え方」を理解するために最初に読むべきドキュメント。
