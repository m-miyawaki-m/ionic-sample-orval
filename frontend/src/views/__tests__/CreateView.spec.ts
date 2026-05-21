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
    // Ionic sets disabled as a DOM property, not an HTML attribute
    expect((btn.element as HTMLElement & { disabled: boolean }).disabled).toBe(true)
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
    // Ionic sets disabled as a DOM property, not an HTML attribute
    expect((btn.element as HTMLElement & { disabled: boolean }).disabled).toBe(false)
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
