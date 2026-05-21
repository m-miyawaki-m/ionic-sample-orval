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
