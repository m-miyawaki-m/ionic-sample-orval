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
