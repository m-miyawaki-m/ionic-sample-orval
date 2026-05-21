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
