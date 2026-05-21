# Test Strategy P3: Component / E2E Sample Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 4 View（List / Detail / Create / BridgeDemo）の Component テスト（Vitest + VTU + jsdom + MSW Node）を新規作成し、既存の `items-flow.cy.ts` E2E を List→Detail→Create→Delete 動線まで拡張する。親戦略書 §6.2 の P3 受け入れ基準「Cypress E2E が dev サーバ＋MSW で動く。失敗時スクショが取れる」+ §2.1 ピラミッドの Component 層を全て満たす。

**Architecture:** Component テストは MSW（`msw/node` の `setupServer`）で HTTP を介入し、Ionic / Router は `IonicVue` プラグイン + `createMemoryHistory` で実プラグイン構成のまま jsdom に乗せる。BridgeDemoView だけは Capacitor ブリッジに依存するため `vi.mock('@/native/demo-sdk-bridge')` で差し替え（親戦略書 §2.4 / 既存 `useDemoSdk.spec.ts` と同パターン）。E2E は MSW Service Worker（既存 `frontend/public/mockServiceWorker.js`）+ dev サーバ + Orval default mock で Create/Delete のレスポンスを得る（OpenAPI 変更不要）。

**Tech Stack:** Vitest 0.34, @vue/test-utils 2.4, jsdom 22, MSW 2 (`msw/node`), Vue Router 4 (memory history), @ionic/vue 8, Cypress 13, vi.mock。

**Reference spec:**
- 親戦略書: `docs/superpowers/specs/2026-05-20-test-strategy-design.md`（特に §2.1 / §2.2 / §2.4 / §2.5 / §6.2）
- 比較設計書: `docs/superpowers/specs/2026-05-20-test-tool-comparison-design.md` §2.5（E2E 評価）

---

## 前提

- ブランチ: `feature/test-strategy-p0-p2` の上で作業（新ブランチを切るかは Task 0 で判断）
- P0 / P1 / P2 は完了済み。`gen-fixtures` / `gen-cases` パイプライン、`mocks/generated/handlers.ts`、`tests/e2e/fixtures/listItems.json` は稼働中
- 既存 `items-flow.cy.ts` は 2 ケース（list 描画 + first item クリックで detail 遷移）まで実装済み。本計画で Create/Delete を追加し full CRUD 動線にする
- POST `/api/items` / DELETE `/api/items/{id}` は OpenAPI で定義済みだが `examples:` 拡張なし。E2E では Orval default mock（`default.msw.ts`、faker 生成）に任せる方針 — OpenAPI 変更は本 P3 では行わない

---

## ファイル構造

このプランで触るファイル:

**Create**:

- `frontend/src/mocks/node.ts` — `setupServer(...handlers)` を export（Vitest 用 MSW サーバ）
- `frontend/test-setup.ts` — Vitest 全体の `beforeAll` / `afterEach` / `afterAll` フック
- `frontend/src/test-utils/mount-view.ts` — `IonicVue` プラグイン + memory router を組んだ mount ヘルパー
- `frontend/src/views/__tests__/ListView.spec.ts`
- `frontend/src/views/__tests__/DetailView.spec.ts`
- `frontend/src/views/__tests__/CreateView.spec.ts`
- `frontend/src/views/__tests__/BridgeDemoView.spec.ts`

**Modify**:

- `frontend/vite.config.ts` — `test.setupFiles` 追加、coverage.exclude に `src/test-utils/**` 追加
- `frontend/tests/e2e/specs/items-flow.cy.ts` — Create / Delete 動線を追加
- `docs/superpowers/specs/2026-05-20-test-strategy-design.md` §6.2 — P3 状況を `✅ 完了` に更新、§6.4 Open Item #1（jsdom Shadow DOM 限界）に Component テスト実装時の知見を反映

新規依存追加なし（MSW・Vitest・VTU・IonicVue は P0 で導入済み）。

---

## Task 0: ブランチ判断と前提確認

**Files:** なし（読み取りのみ）

**目的**: 作業ブランチを決め、P0-P2 完了状態を再確認する。

- [ ] **Step 1: 現在のブランチと未コミット変更を確認**

```powershell
git status
git branch --show-current
```

Expected: branch = `feature/test-strategy-p0-p2`、working tree clean。

- [ ] **Step 2: P0-P2 完了の根拠コミットを確認**

```powershell
git log --oneline | Select-String -Pattern "feat\(gen\)|feat\(mocks\)|test\(e2e\)|test\(composables\)" | Select-Object -First 10
```

Expected: 以下が含まれる（順不同）:
- `cec45a4 feat(gen): add gen-fixtures CLI`
- `f22b8fe feat(gen): wire gen:fixtures script`
- `aa8ef43 feat(mocks): prepend generated handlers`
- `17751bc test(e2e): replace scaffold smoke with fixture-driven items flow`
- `930125b feat(gen): add gen-cases lib`
- `672a313 feat(gen): wire gen:cases script`
- `5873fca test(composables): add cases-driven useDemoSdk.init spec`

- [ ] **Step 3: 新ブランチを切るかの判断**

P3 を P0-P2 と同じブランチに積むか、別ブランチにするかをユーザに確認:
- 同じブランチ（`feature/test-strategy-p0-p2`）に積む: PR が太るが文脈が連続
- 新ブランチ（例 `feature/test-strategy-p3`）を切る: PR を分割できる

本プランは**同ブランチ前提**で書く（ユーザが新ブランチを希望すれば切り替え）。

---

## Task 1: MSW Node setup for Vitest

**Files:**
- Create: `frontend/src/mocks/node.ts`
- Create: `frontend/test-setup.ts`
- Modify: `frontend/vite.config.ts`

**目的**: Component テストから HTTP コールを発火させた際に、`msw/node` の `setupServer` で intercept できるようにする。既存の generated handlers と Orval default mocks をそのまま再利用する。

- [ ] **Step 1: `frontend/src/mocks/node.ts` を作成**

```ts
// frontend/src/mocks/node.ts
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)
```

- [ ] **Step 2: `frontend/test-setup.ts` を作成**

```ts
// frontend/test-setup.ts
import { afterAll, afterEach, beforeAll } from 'vitest'
import { server } from './src/mocks/node'
import { setListItemsScenario } from './src/mocks/generated/handlers'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

afterEach(() => {
  server.resetHandlers()
  setListItemsScenario('twoItems') // シナリオを既定に戻す
})

afterAll(() => server.close())
```

- [ ] **Step 3: `frontend/vite.config.ts` の `test` ブロックを更新**

`test` の中で以下を変更:
- `setupFiles: ['./test-setup.ts']` を追加
- 既存 `coverage.exclude` に `'src/test-utils/**'` を追加

変更後の `test` ブロック全体:

```ts
test: {
  globals: true,
  environment: 'jsdom',
  setupFiles: ['./test-setup.ts'],
  reporters: ['default', 'html', 'junit'],
  outputFile: {
    html: '.vitest-report/index.html',
    junit: '.vitest-report/junit.xml'
  },
  coverage: {
    provider: 'v8',
    reporter: ['text', 'html'],
    reportsDirectory: 'coverage',
    include: ['src/**/*.{ts,vue}'],
    exclude: ['src/**/*.{test,spec}.ts', 'src/api/**', 'src/mocks/generated/**', 'src/test-utils/**']
  }
}
```

- [ ] **Step 4: 既存の Vitest spec が依然 pass することを確認（回帰チェック）**

```powershell
cd frontend
npm run test:unit -- --run
```

Expected: 既存 `useDemoSdk.spec.ts` と `useDemoSdk.init.cases.generated.spec.ts`（あれば）が pass、failures 0、unhandled request エラーなし。

- [ ] **Step 5: コミット**

```powershell
git add frontend/src/mocks/node.ts frontend/test-setup.ts frontend/vite.config.ts
git commit -m "test(setup): wire msw/node server for vitest component tests

setupServer(...handlers) と test-setup.ts のグローバルフック
(beforeAll listen / afterEach resetHandlers + scenario reset / afterAll close)
を追加。vite.config.ts に setupFiles を登録、test-utils をカバレッジ
除外に追加。既存 useDemoSdk.spec.ts は影響なし。

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: mountView ヘルパーを作成

**Files:**
- Create: `frontend/src/test-utils/mount-view.ts`

**目的**: 4 つの Component spec で繰り返し書くことになる `IonicVue` プラグイン + memory router の組み立てを 1 関数にまとめる。

- [ ] **Step 1: `frontend/src/test-utils/mount-view.ts` を作成**

```ts
// frontend/src/test-utils/mount-view.ts
import { mount } from '@vue/test-utils'
import { IonicVue } from '@ionic/vue'
import { createRouter, createMemoryHistory } from 'vue-router'
import { routes } from '@/router'

/**
 * Component テスト用の標準 mount。
 * - IonicVue プラグインを install
 * - memory router を初期化し initialRoute へ push
 * - 必要なら props を渡す
 *
 * 使い方:
 *   const { wrapper, router } = await mountView(ListView)
 *   const { wrapper, router } = await mountView(DetailView, {
 *     initialRoute: '/items/1',
 *     props: { id: '1' },
 *   })
 */
export async function mountView(
  component: any,
  options: { initialRoute?: string; props?: Record<string, unknown> } = {},
): Promise<{
  wrapper: ReturnType<typeof mount>
  router: ReturnType<typeof createRouter>
}> {
  const router = createRouter({
    history: createMemoryHistory(),
    routes,
  })
  await router.push(options.initialRoute ?? '/')
  await router.isReady()

  const wrapper = mount(component, {
    global: {
      plugins: [IonicVue, router],
    },
    props: options.props,
  })

  return { wrapper, router }
}
```

- [ ] **Step 2: コミット**

```powershell
git add frontend/src/test-utils/mount-view.ts
git commit -m "test(utils): add mountView helper (IonicVue + memory router)

4 つの View spec で共通する IonicVue install と memory router 初期化を
1 関数に集約。initialRoute / props を任意で受け取る。

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: ListView Component test

**Files:**
- Create: `frontend/src/views/__tests__/ListView.spec.ts`

**目的**: ListView の `onMounted` 時の `listItems()` 呼び出し、レンダリング、クリック→ナビゲーションを検証。MSW シナリオ切替で empty / serverError も確認。

- [ ] **Step 1: spec ファイルを作成**

```ts
// frontend/src/views/__tests__/ListView.spec.ts
import { describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import ListView from '../ListView.vue'
import { mountView } from '@/test-utils/mount-view'
import { setListItemsScenario } from '@/mocks/generated/handlers'

describe('ListView', () => {
  it('shows Loading... initially, then renders items from MSW two_items fixture', async () => {
    const { wrapper } = await mountView(ListView)

    // Arrange + initial render
    expect(wrapper.text()).toContain('Loading...')

    // Wait for onMounted async fetch
    await flushPromises()

    // Assert: 2 items rendered from twoItems scenario
    const items = wrapper.findAll('ion-item')
    expect(items).toHaveLength(2)
    expect(wrapper.text()).toContain('ペン')
    expect(wrapper.text()).toContain('¥200')
    expect(wrapper.text()).toContain('ノート')
    expect(wrapper.text()).toContain('¥800')
  })

  it('shows empty list when scenario=empty', async () => {
    setListItemsScenario('empty')
    const { wrapper } = await mountView(ListView)
    await flushPromises()

    expect(wrapper.findAll('ion-item')).toHaveLength(0)
    // Loading... should be gone (items is [] not null)
    expect(wrapper.text()).not.toContain('Loading...')
  })

  it('clicking an item pushes router to detail with the item id', async () => {
    const { wrapper, router } = await mountView(ListView)
    await flushPromises()
    const pushSpy = vi.spyOn(router, 'push')

    await wrapper.find('ion-item').trigger('click')

    expect(pushSpy).toHaveBeenCalledWith({ name: 'detail', params: { id: 1 } })
  })

  it('clicking the 追加 toolbar button pushes router to create', async () => {
    const { wrapper, router } = await mountView(ListView)
    await flushPromises()
    const pushSpy = vi.spyOn(router, 'push')

    const buttons = wrapper.findAll('ion-button')
    const createBtn = buttons.find((b) => b.text() === '追加')
    expect(createBtn).toBeDefined()
    await createBtn!.trigger('click')

    expect(pushSpy).toHaveBeenCalledWith({ name: 'create' })
  })

  it('clicking the Bridge toolbar button pushes router to bridge-demo', async () => {
    const { wrapper, router } = await mountView(ListView)
    await flushPromises()
    const pushSpy = vi.spyOn(router, 'push')

    const buttons = wrapper.findAll('ion-button')
    const bridgeBtn = buttons.find((b) => b.text() === 'Bridge')
    expect(bridgeBtn).toBeDefined()
    await bridgeBtn!.trigger('click')

    expect(pushSpy).toHaveBeenCalledWith({ name: 'bridge-demo' })
  })
})
```

- [ ] **Step 2: 実行**

```powershell
cd frontend
npm run test:unit -- --run src/views/__tests__/ListView.spec.ts
```

Expected: 5 tests passing。

- [ ] **Step 3: コミット**

```powershell
git add frontend/src/views/__tests__/ListView.spec.ts
git commit -m "test(views): add ListView component spec (5 cases)

MSW Node 経由で twoItems / empty シナリオを切替、ion-item 描画と
ナビゲーション 3 経路 (detail / create / bridge-demo) を検証。

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: DetailView Component test

**Files:**
- Create: `frontend/src/views/__tests__/DetailView.spec.ts`

**目的**: DetailView の `getItem(id)` 呼び出し、レンダリング、削除ボタン→`deleteItem(id)` + router.replace を検証。

- [ ] **Step 1: spec ファイルを作成**

```ts
// frontend/src/views/__tests__/DetailView.spec.ts
import { describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { http, HttpResponse } from 'msw'
import DetailView from '../DetailView.vue'
import { mountView } from '@/test-utils/mount-view'
import { server } from '@/mocks/node'

describe('DetailView', () => {
  it('shows Loading... initially, then renders item details fetched from MSW', async () => {
    // OpenAPI example の値（{ id:1, name:"ペン", price:200 }）を返す Orval default mock を上書き
    server.use(
      http.get('/api/items/1', () => HttpResponse.json({ id: 1, name: 'ペン', price: 200 })),
    )
    const { wrapper } = await mountView(DetailView, {
      initialRoute: '/items/1',
      props: { id: '1' },
    })

    expect(wrapper.text()).toContain('Loading...')
    await flushPromises()

    expect(wrapper.text()).toContain('ペン')
    expect(wrapper.text()).toContain('ID: 1')
    expect(wrapper.text()).toContain('¥200')
  })

  it('clicking 削除 calls DELETE /api/items/:id then router.replace to list', async () => {
    const deleteSpy = vi.fn(() => new HttpResponse(null, { status: 204 }))
    server.use(
      http.get('/api/items/1', () => HttpResponse.json({ id: 1, name: 'ペン', price: 200 })),
      http.delete('/api/items/1', deleteSpy),
    )
    const { wrapper, router } = await mountView(DetailView, {
      initialRoute: '/items/1',
      props: { id: '1' },
    })
    await flushPromises()
    const replaceSpy = vi.spyOn(router, 'replace')

    const buttons = wrapper.findAll('ion-button')
    const deleteBtn = buttons.find((b) => b.text() === '削除')
    expect(deleteBtn).toBeDefined()
    await deleteBtn!.trigger('click')
    await flushPromises()

    expect(deleteSpy).toHaveBeenCalled()
    expect(replaceSpy).toHaveBeenCalledWith({ name: 'list' })
  })
})
```

- [ ] **Step 2: 実行**

```powershell
cd frontend
npm run test:unit -- --run src/views/__tests__/DetailView.spec.ts
```

Expected: 2 tests passing。

- [ ] **Step 3: コミット**

```powershell
git add frontend/src/views/__tests__/DetailView.spec.ts
git commit -m "test(views): add DetailView component spec (2 cases)

server.use で GET/DELETE /api/items/1 を上書きし、レンダリングと
削除→router.replace 遷移を検証。

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: CreateView Component test

**Files:**
- Create: `frontend/src/views/__tests__/CreateView.spec.ts`

**目的**: CreateView の `canSubmit` 計算、フォーム入力、登録ボタン → `createItem(body)` + router.replace を検証。

- [ ] **Step 1: spec ファイルを作成**

```ts
// frontend/src/views/__tests__/CreateView.spec.ts
import { describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { http, HttpResponse } from 'msw'
import CreateView from '../CreateView.vue'
import { mountView } from '@/test-utils/mount-view'
import { server } from '@/mocks/node'

describe('CreateView', () => {
  it('登録 button is disabled when name and price are both empty', async () => {
    const { wrapper } = await mountView(CreateView, { initialRoute: '/create' })

    const btn = wrapper.findAll('ion-button').find((b) => b.text() === '登録')!
    expect(btn.attributes('disabled')).toBeDefined()
  })

  it('登録 button enables when both name and price are filled', async () => {
    const { wrapper } = await mountView(CreateView, { initialRoute: '/create' })

    // ion-input は内部に input を持つ。v-model を書き換えるため
    // setValue 互換のため直接コンポーネントに値をセット
    const inputs = wrapper.findAllComponents({ name: 'IonInput' })
    inputs[0].vm.$emit('update:modelValue', 'ボールペン')
    inputs[1].vm.$emit('update:modelValue', 150)
    await flushPromises()

    const btn = wrapper.findAll('ion-button').find((b) => b.text() === '登録')!
    expect(btn.attributes('disabled')).toBeUndefined()
  })

  it('submitting calls POST /api/items with the filled body then router.replace to list', async () => {
    const postSpy = vi.fn(async ({ request }) => {
      const body = await request.json()
      return HttpResponse.json({ id: 99, ...body }, { status: 201 })
    })
    server.use(http.post('/api/items', postSpy))

    const { wrapper, router } = await mountView(CreateView, { initialRoute: '/create' })
    const replaceSpy = vi.spyOn(router, 'replace')

    const inputs = wrapper.findAllComponents({ name: 'IonInput' })
    inputs[0].vm.$emit('update:modelValue', 'ボールペン')
    inputs[1].vm.$emit('update:modelValue', 150)
    await flushPromises()

    const btn = wrapper.findAll('ion-button').find((b) => b.text() === '登録')!
    await btn.trigger('click')
    await flushPromises()

    expect(postSpy).toHaveBeenCalled()
    expect(replaceSpy).toHaveBeenCalledWith({ name: 'list' })
  })
})
```

- [ ] **Step 2: 実行**

```powershell
cd frontend
npm run test:unit -- --run src/views/__tests__/CreateView.spec.ts
```

Expected: 3 tests passing。`ion-input` の v-model 経路で苦戦する可能性あり — fail したら次の Troubleshooting 節を参照。

- [ ] **Step 3: Troubleshooting**: `ion-input` で v-model が反映されない場合

`ion-input` は内部で `update:modelValue` を emit するが、jsdom 上では非同期で発火しないことがある。対処:

```ts
// option A: コンポーネント直下に props を直接書き換える（推奨）
inputs[0].setValue('ボールペン')  // VTU 2.4 で対応

// option B: 内部の actual <input> 要素に値をセット
const nativeInput = inputs[0].find('input').element as HTMLInputElement
nativeInput.value = 'ボールペン'
nativeInput.dispatchEvent(new Event('input'))
```

どちらかで pass すれば OK。

- [ ] **Step 4: コミット**

```powershell
git add frontend/src/views/__tests__/CreateView.spec.ts
git commit -m "test(views): add CreateView component spec (3 cases)

canSubmit の disabled 状態、フォーム入力、POST /api/items 送信と
router.replace 遷移を検証。

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: BridgeDemoView Component test

**Files:**
- Create: `frontend/src/views/__tests__/BridgeDemoView.spec.ts`

**目的**: BridgeDemoView の UI 操作が `useDemoSdk` composable 経由でブリッジ API を正しく呼び出し、結果を画面に反映することを検証。既存 `useDemoSdk.spec.ts` と同じ `vi.mock('@/native/demo-sdk-bridge')` パターンを踏襲（親戦略書 §2.4）。

- [ ] **Step 1: spec ファイルを作成**

```ts
// frontend/src/views/__tests__/BridgeDemoView.spec.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'

const mocks = vi.hoisted(() => {
  const initMock = vi.fn()
  const getDeviceInfoMock = vi.fn()
  const echoMock = vi.fn()
  const performActionMock = vi.fn()
  const startCounterMock = vi.fn()
  const stopCounterMock = vi.fn()
  const triggerErrorMock = vi.fn()
  const removeMock = vi.fn()
  const state: { listener: ((ev: { value: number }) => void) | null } = { listener: null }
  const addListenerMock = vi.fn(async (_ev: string, cb: (ev: { value: number }) => void) => {
    state.listener = cb
    return { remove: removeMock }
  })
  return {
    initMock, getDeviceInfoMock, echoMock, performActionMock,
    startCounterMock, stopCounterMock, triggerErrorMock,
    removeMock, addListenerMock, state,
  }
})

vi.mock('@/native/demo-sdk-bridge', () => ({
  DEMO_SDK_EVENTS: { countChange: 'countChange' } as const,
  DemoSdkBridge: {
    init: mocks.initMock,
    getDeviceInfo: mocks.getDeviceInfoMock,
    echo: mocks.echoMock,
    performAction: mocks.performActionMock,
    startCounter: mocks.startCounterMock,
    stopCounter: mocks.stopCounterMock,
    triggerError: mocks.triggerErrorMock,
    addListener: mocks.addListenerMock,
  },
}))

import BridgeDemoView from '../BridgeDemoView.vue'
import { mountView } from '@/test-utils/mount-view'

beforeEach(() => {
  mocks.initMock.mockReset()
  mocks.getDeviceInfoMock.mockReset()
  mocks.echoMock.mockReset()
  mocks.performActionMock.mockReset()
  mocks.startCounterMock.mockReset()
  mocks.stopCounterMock.mockReset()
  mocks.triggerErrorMock.mockReset()
  mocks.removeMock.mockReset()
  mocks.addListenerMock.mockClear()
  mocks.state.listener = null
})

afterEach(() => { mocks.state.listener = null })

describe('BridgeDemoView', () => {
  it('init: clicking init button calls bridge.init with current apiKey and toggles state', async () => {
    mocks.initMock.mockResolvedValueOnce({ ok: true })
    const { wrapper } = await mountView(BridgeDemoView, { initialRoute: '/bridge-demo' })

    // initial apiKey = 'dummy-key' (default in setup)
    expect(wrapper.text()).toContain('state: not initialized')

    const initBtn = wrapper.findAll('ion-button').find((b) => b.text().includes('init('))!
    await initBtn.trigger('click')
    await flushPromises()

    expect(mocks.initMock).toHaveBeenCalledWith({ apiKey: 'dummy-key' })
    expect(wrapper.text()).toContain('state: initialized')
  })

  it('echo: clicking echo button calls bridge.echo with text and shows result', async () => {
    mocks.echoMock.mockResolvedValueOnce({ text: 'hello' })
    const { wrapper } = await mountView(BridgeDemoView, { initialRoute: '/bridge-demo' })

    const echoBtn = wrapper.findAll('ion-button').find((b) => b.text() === 'echo()')!
    await echoBtn.trigger('click')
    await flushPromises()

    expect(mocks.echoMock).toHaveBeenCalledWith({ text: 'hello' })
    expect(wrapper.text()).toContain('hello')
  })

  it('getDeviceInfo: clicking the button calls bridge and renders model/version', async () => {
    mocks.getDeviceInfoMock.mockResolvedValueOnce({ model: 'Pixel 7', sdkVersion: '1.2.3' })
    const { wrapper } = await mountView(BridgeDemoView, { initialRoute: '/bridge-demo' })

    const btn = wrapper.findAll('ion-button').find((b) => b.text() === 'getDeviceInfo()')!
    await btn.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('model=Pixel 7')
    expect(wrapper.text()).toContain('version=1.2.3')
  })

  it('performAction: shows ...running while pending then output on resolve', async () => {
    let resolveFn!: (v: { output: string }) => void
    mocks.performActionMock.mockReturnValueOnce(
      new Promise((res) => { resolveFn = res }),
    )
    const { wrapper } = await mountView(BridgeDemoView, { initialRoute: '/bridge-demo' })

    const btn = wrapper.findAll('ion-button').find((b) => b.text() === 'performAction()')!
    await btn.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('...running')

    resolveFn({ output: 'DONE' })
    await flushPromises()

    expect(wrapper.text()).toContain('output: DONE')
  })

  it('startCounter: registers listener and renders count when event fires', async () => {
    mocks.startCounterMock.mockResolvedValueOnce(undefined)
    const { wrapper } = await mountView(BridgeDemoView, { initialRoute: '/bridge-demo' })

    const startBtn = wrapper.findAll('ion-button').find((b) => b.text().includes('startCounter'))!
    await startBtn.trigger('click')
    await flushPromises()

    expect(mocks.startCounterMock).toHaveBeenCalledWith({ intervalMs: 1000 })
    expect(mocks.state.listener).not.toBeNull()

    mocks.state.listener!({ value: 3 })
    await flushPromises()
    expect(wrapper.text()).toContain('count: 3')
  })

  it('stopCounter: calls bridge.stopCounter and removes the listener', async () => {
    mocks.startCounterMock.mockResolvedValueOnce(undefined)
    mocks.stopCounterMock.mockResolvedValueOnce(undefined)
    const { wrapper } = await mountView(BridgeDemoView, { initialRoute: '/bridge-demo' })

    await wrapper.findAll('ion-button').find((b) => b.text().includes('startCounter'))!.trigger('click')
    await flushPromises()
    await wrapper.findAll('ion-button').find((b) => b.text() === 'stopCounter()')!.trigger('click')
    await flushPromises()

    expect(mocks.stopCounterMock).toHaveBeenCalled()
    expect(mocks.removeMock).toHaveBeenCalled()
  })

  it('triggerError: clicking the button captures lastError and renders error card', async () => {
    mocks.triggerErrorMock.mockRejectedValueOnce(
      Object.assign(new Error('boom'), { code: 'E_FAKE' }),
    )
    const { wrapper } = await mountView(BridgeDemoView, { initialRoute: '/bridge-demo' })

    const btn = wrapper.findAll('ion-button').find((b) => b.text() === 'triggerError()')!
    await btn.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('code: E_FAKE')
    expect(wrapper.text()).toContain('message: boom')
  })
})
```

- [ ] **Step 2: 実行**

```powershell
cd frontend
npm run test:unit -- --run src/views/__tests__/BridgeDemoView.spec.ts
```

Expected: 7 tests passing。

- [ ] **Step 3: コミット**

```powershell
git add frontend/src/views/__tests__/BridgeDemoView.spec.ts
git commit -m "test(views): add BridgeDemoView component spec (7 cases)

vi.mock('@/native/demo-sdk-bridge') で既存 useDemoSdk.spec.ts と同じ
パターンを採用。init / echo / getDeviceInfo / performAction (pending→resolve) /
startCounter (listener 経由の count 更新) / stopCounter / triggerError
の 7 UI 操作を検証。

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: items-flow.cy.ts を full CRUD に拡張

**Files:**
- Modify: `frontend/tests/e2e/specs/items-flow.cy.ts`

**目的**: 既存 2 ケース（list 描画、first item クリックで detail）に Create / Delete 動線を追加し、§6.2 P3 受け入れ基準「List→Detail→Create→Delete」の full フロー E2E を完成させる。

- [ ] **Step 1: 既存ファイルを読み、現状を把握**

```powershell
cat frontend/tests/e2e/specs/items-flow.cy.ts
```

Expected: 2 つの `it` ブロック（list 描画 + first item → detail 遷移）。

- [ ] **Step 2: spec を全面書き換え（既存 2 ケース + 新規 2 ケース）**

```ts
// frontend/tests/e2e/specs/items-flow.cy.ts
describe('items flow: list → detail → delete / list → create', () => {
  beforeEach(() => {
    cy.fixture<{ id: number; name: string; price: number }[]>('listItems.json').as('items')
  })

  it('renders all items from the fixture', function () {
    cy.visit('/')
    cy.contains('商品一覧').should('be.visible')
    cy.get('ion-item').should('have.length', this.items.length)
    cy.contains('ion-item', this.items[0].name).should('be.visible')
    cy.contains('ion-item', `¥${this.items[0].price}`).should('be.visible')
  })

  it('navigates from list to detail (first item) and back', function () {
    cy.visit('/')
    cy.contains('ion-item', this.items[0].name).click()
    cy.contains(this.items[0].name).should('be.visible')
    cy.contains('ID:').should('be.visible')
    // 戻るボタンで一覧へ
    cy.get('ion-back-button').click()
    cy.contains('商品一覧').should('be.visible')
  })

  it('navigates from list to create, fills the form, and returns to list', function () {
    cy.visit('/')
    cy.contains('ion-button', '追加').click()
    cy.contains('商品作成').should('be.visible')

    // フォーム入力（ion-input 内の native input にタイプ）
    cy.get('ion-input').eq(0).find('input').type('テスト商品')
    cy.get('ion-input').eq(1).find('input').type('999')

    cy.contains('ion-button', '登録').should('not.have.attr', 'disabled').click()

    // POST /api/items は Orval default mock が成功レスポンスを返す → router.replace で list へ
    cy.contains('商品一覧').should('be.visible')
  })

  it('deletes the first item from detail view and returns to list', function () {
    cy.visit('/')
    cy.contains('ion-item', this.items[0].name).click()
    cy.contains('商品詳細').should('be.visible')

    cy.contains('ion-button', '削除').click()

    // DELETE /api/items/:id 後 router.replace で list へ
    cy.contains('商品一覧').should('be.visible')
  })
})
```

- [ ] **Step 3: dev サーバを別ターミナルで起動**

別 PowerShell ウィンドウ（または VSCode の別 terminal）で:

```powershell
cd frontend
npm run dev
```

`http://localhost:5173` で起動するまで待つ（MSW Service Worker も自動起動）。

- [ ] **Step 4: Cypress を headless モードで実行**

元のターミナルで:

```powershell
cd frontend
npm run test:e2e -- --spec tests/e2e/specs/items-flow.cy.ts
```

Expected: 4 tests passing。失敗時のスクショは `tests/e2e/screenshots/items-flow.cy.ts/` に出力される。HTML レポートは `tests/e2e/reports/mochawesome.html`。

- [ ] **Step 5: dev サーバを停止**

`npm run dev` を起動した terminal で `Ctrl+C`。

- [ ] **Step 6: コミット**

```powershell
git add frontend/tests/e2e/specs/items-flow.cy.ts
git commit -m "test(e2e): expand items-flow to full CRUD (list → detail → delete / create)

既存の 2 ケース (list 描画 / first item → detail) に
detail → back / list → create → submit / detail → delete の 2 ケースを追加。
P3 受け入れ基準 (Cypress E2E が dev サーバ＋MSW で動く。失敗時スクショが取れる)
を満たす full CRUD 動線。

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: 親戦略書 §6.2 / §6.4 を更新

**Files:**
- Modify: `docs/superpowers/specs/2026-05-20-test-strategy-design.md`

**目的**: §6.2 表で P3 を `⏸ 未着手` から `✅ 完了` に。§6.4 Open Item #1（jsdom Shadow DOM 限界）を Component テスト実装時の知見で更新。

- [ ] **Step 1: §6.2 P3 行を更新**

`docs/superpowers/specs/2026-05-20-test-strategy-design.md` を開き、P3 行の状況列を変更:

old:
```
| **P3** Component / E2E サンプル | `views/__tests__/{ListView,DetailView,CreateView,BridgeDemoView}.spec.ts`、`tests/e2e/specs/items-flow.cy.ts` を List→Detail→Create→Delete 動線まで拡張 | Cypress E2E が dev サーバ＋MSW で動く。失敗時スクショが取れる | P0, P1 | ⏸ 未着手（plan `…-test-strategy-p3.md` 参照） |
```

new:
```
| **P3** Component / E2E サンプル | `views/__tests__/{ListView,DetailView,CreateView,BridgeDemoView}.spec.ts`、`tests/e2e/specs/items-flow.cy.ts` を List→Detail→Create→Delete 動線まで拡張 | Cypress E2E が dev サーバ＋MSW で動く。失敗時スクショが取れる | P0, P1 | ✅ 完了 |
```

- [ ] **Step 2: §6.4 Open Item #1 を更新**

`### 6.4 Open Items（未確定事項）` セクションの #1 を、実装で得た知見で更新:

old:
```
1. **Vitest コンポーネントテストで Ionic コンポーネントを描画したときのスタイル/イベントの限界**: jsdom では shadow DOM が完全に描画されないため、深い検証は Cypress に寄せる。境界の線引きはサンプル実装時に判明する見込み
```

new（**実装時の所見を簡潔に記入**。雛形 — 実際に Task 3-6 で出た問題に応じて書き換える）:
```
1. **Vitest コンポーネントテストで Ionic コンポーネントを描画したときのスタイル/イベントの限界**（P3 で検証）: `IonicVue` プラグイン install + jsdom で `ion-item` / `ion-button` / `ion-card` / `ion-text` / `ion-input` の構造的検証（テキスト・属性・クリック）は可能。ion-input の v-model 経路は `update:modelValue` emit またはネイティブ `input` 要素への dispatchEvent で動作（Task 5 Troubleshooting 参照）。動的アニメーションや Shadow DOM 内スタイル検証は Cypress に寄せる方針を維持
```

- [ ] **Step 3: コミット**

```powershell
git add docs/superpowers/specs/2026-05-20-test-strategy-design.md
git commit -m "docs(test-strategy): mark P3 as complete and update jsdom/Ionic open item

§6.2 P3 行を ⏸ 未着手 → ✅ 完了 に更新。
§6.4 Open Item #1 を P3 実装時の知見 (IonicVue plugin install で
ion-* の構造的検証 OK、ion-input は emit / dispatchEvent 経路で v-model 動作)
で書き換え。

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: 完了確認とレポート

**Files:** なし（読み取りのみ）

- [ ] **Step 1: 全 Vitest を 1 回実行して回帰チェック**

```powershell
cd frontend
npm run test:unit -- --run
```

Expected: 既存 + 新規すべて pass。failures 0。

- [ ] **Step 2: E2E を 1 回実行**

dev サーバ起動後（Task 7 Step 3 と同じ手順）:

```powershell
cd frontend
npm run test:e2e
```

Expected: 全 spec pass。`tests/e2e/reports/mochawesome.html` と `tests/e2e/screenshots/` が更新される。

- [ ] **Step 3: コミットログを確認**

```powershell
git log --oneline | Select-Object -First 10
```

Expected: 直近 8 コミット（Task 1-8）が並ぶ。

- [ ] **Step 4: 完了報告**

ユーザに以下を伝える:
- Task 1-8 完了、§6.2 P3 = ✅
- Component spec 4 ファイル × 計 17 ケース、E2E 4 ケース全 pass
- 次の候補: P4 (Android JVM 実行環境) / P6 (比較サンプル) / 既存 P3 spec の `__samples__/comparison/` 展開

---

## 自己レビュー（プラン作成後の確認、実行時は無視可）

- [x] **Spec coverage**: 親戦略書 §6.2 P3 受け入れ基準（Cypress E2E + dev サーバ + MSW、失敗時スクショ）を Task 7 が満たし、§2.1 ピラミッドの Component 層（ListView / BridgeDemoView 明示）を Task 3-6 が満たす（DetailView / CreateView は §2.2 各層責務表「Component (View): テンプレート描画・v-model・イベント」の自然な拡張として追加）
- [x] **Placeholder scan**: TBD / TODO / 「fill in later」なし。全コードブロックに完全なコードを記載
- [x] **Type consistency**: `mountView` の戻り値型は Task 2 で定義し Task 3-6 で同じ shape（`{ wrapper, router }`）を使用。`mocks` shape は Task 6 で定義し既存 `useDemoSdk.spec.ts` の構造を踏襲
- [x] **依存関係**: P0（vite/vitest config、reporters）と P1（MSW handlers、Cypress fixtures）に依存。本計画内では Task 1 (MSW Node setup) → Task 2 (mount helper) → Task 3-6 (Component specs、Task 2 のヘルパーを使用) → Task 7 (E2E、Task 1-6 と独立) → Task 8 (doc 更新、最後)
- [x] **OpenAPI 変更なし**: POST/DELETE の Orval default mock で E2E は動く。決定的 fixture が欲しくなった場合は別途 §3.2 examples 拡張タスクとして P3 の外で扱う
