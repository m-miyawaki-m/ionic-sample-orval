/**
 * 比較サンプル: @testing-library/vue 版 ListView spec
 *
 * 対応する採用品: frontend/src/views/__tests__/ListView.spec.ts (VTU 版)
 *
 * 読み比べポイント:
 * - VTU: mount() → wrapper.find('ion-item') / wrapper.text() の Vue 寄り API
 * - TL : render() → screen.findByText() / screen.getAllByRole() の DOM 寄り API
 * - TL は「ユーザがどう見えるか」を中心に書く設計思想（getByRole, getByLabelText 等）
 * - VTU は「コンポーネントツリーを覗く」設計思想（findComponent, props 等）
 *
 * MSW セットアップは frontend/test-setup.ts が全 spec で共通なので、TL でも
 * そのまま MSW Node 経由で /api/items が intercept される。
 *
 * 注意: __samples__/comparison/ は比較教材のため最小ケースに絞っている。
 * 全網羅は採用品 (ListView.spec.ts) を参照。
 */
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/vue'
import { afterEach } from 'vitest'
import { IonicVue } from '@ionic/vue'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'
import { routes } from '@/router'
import ListView from '@/views/ListView.vue'
import { setListItemsScenario } from '@/mocks/generated/handlers'

// @testing-library/vue は自動クリーンアップが効くが、明示しておくと安心
afterEach(() => {
  cleanup()
})

async function renderListView(): Promise<{ router: Router }> {
  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push('/')
  await router.isReady()
  render(ListView, {
    global: { plugins: [IonicVue, router] },
  })
  return { router }
}

describe('ListView (Testing Library 比較サンプル)', () => {
  it('renders items from MSW (twoItems シナリオ)', async () => {
    await renderListView()

    // findByText は要素が現れるまで待つ (onMounted の async fetch を吸収)
    await screen.findByText('ペン')

    // getByText は同期。既に DOM に居る要素を取る
    expect(screen.getByText('ペン')).toBeTruthy()
    expect(screen.getByText('¥200')).toBeTruthy()
    expect(screen.getByText('ノート')).toBeTruthy()
    expect(screen.getByText('¥800')).toBeTruthy()
  })

  it('empty シナリオでは商品が描画されない', async () => {
    setListItemsScenario('empty')
    await renderListView()

    // queryByText は「居なければ null」を返す。getByText は throw するので不可
    await new Promise((r) => setTimeout(r, 50)) // MSW レスポンス待ち (軽量)
    expect(screen.queryByText('ペン')).toBeNull()
    expect(screen.queryByText('ノート')).toBeNull()
  })

  it('追加ボタンを押すと create ルートへ遷移する', async () => {
    const { router } = await renderListView()
    await screen.findByText('ペン') // 初期描画完了を待つ

    const pushSpy = vi.spyOn(router, 'push')

    // TL では querySelector + fireEvent が VTU の trigger より素直
    // ion-button のテキストノードを含む要素を探してクリック
    const addBtn = screen.getByText('追加')
    await fireEvent.click(addBtn)

    expect(pushSpy).toHaveBeenCalledWith({ name: 'create' })
  })
})
