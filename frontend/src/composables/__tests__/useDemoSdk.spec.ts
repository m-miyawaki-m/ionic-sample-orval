import { defineComponent, h, nextTick } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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
  const addListenerMock = vi.fn(async (_evName: string, cb: (ev: { value: number }) => void) => {
    state.listener = cb
    return { remove: removeMock }
  })
  return {
    initMock,
    getDeviceInfoMock,
    echoMock,
    performActionMock,
    startCounterMock,
    stopCounterMock,
    triggerErrorMock,
    removeMock,
    addListenerMock,
    state,
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

import { useDemoSdk } from '../useDemoSdk'

type Api = ReturnType<typeof useDemoSdk>

function mountWithComposable(): { api: Api; wrapper: ReturnType<typeof mount> } {
  let captured!: Api
  const Comp = defineComponent({
    setup() {
      captured = useDemoSdk()
      return () => h('div')
    },
  })
  const wrapper = mount(Comp)
  return { api: captured, wrapper }
}

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

afterEach(() => {
  mocks.state.listener = null
})

describe('useDemoSdk', () => {
  it('init: sets initialized=true on success', async () => {
    mocks.initMock.mockResolvedValueOnce({ ok: true })
    const { api } = mountWithComposable()
    const ok = await api.init('key')
    expect(ok).toBe(true)
    expect(api.initialized.value).toBe(true)
    expect(api.lastError.value).toBeNull()
    expect(mocks.initMock).toHaveBeenCalledWith({ apiKey: 'key' })
  })

  it('init: captures error code and message on failure', async () => {
    mocks.initMock.mockRejectedValueOnce(Object.assign(new Error('bad'), { code: 'E_INVALID_KEY' }))
    const { api } = mountWithComposable()
    const ok = await api.init('')
    expect(ok).toBe(false)
    expect(api.lastError.value).toEqual({ code: 'E_INVALID_KEY', message: 'bad' })
  })

  it('echo: returns text on success', async () => {
    mocks.echoMock.mockResolvedValueOnce({ text: 'hi' })
    const { api } = mountWithComposable()
    const out = await api.echo('hi')
    expect(out).toBe('hi')
    expect(mocks.echoMock).toHaveBeenCalledWith({ text: 'hi' })
  })

  it('performAction: returns output on success', async () => {
    mocks.performActionMock.mockResolvedValueOnce({ output: 'HELLO' })
    const { api } = mountWithComposable()
    const out = await api.performAction('hello')
    expect(out).toBe('HELLO')
  })

  it('getDeviceInfo: returns null and sets lastError on failure', async () => {
    mocks.getDeviceInfoMock.mockRejectedValueOnce(
      Object.assign(new Error('nope'), { code: 'E_NOT_INIT' }),
    )
    const { api } = mountWithComposable()
    const info = await api.getDeviceInfo()
    expect(info).toBeNull()
    expect(api.lastError.value).toEqual({ code: 'E_NOT_INIT', message: 'nope' })
  })

  it('triggerError: captures code and message', async () => {
    mocks.triggerErrorMock.mockRejectedValueOnce(
      Object.assign(new Error('fake error'), { code: 'E_FAKE' }),
    )
    const { api } = mountWithComposable()
    await api.triggerError()
    expect(api.lastError.value).toEqual({ code: 'E_FAKE', message: 'fake error' })
  })

  it('startCounter: registers a listener and updates count when invoked', async () => {
    mocks.startCounterMock.mockResolvedValueOnce(undefined)
    const { api } = mountWithComposable()
    await api.startCounter(50)
    expect(mocks.addListenerMock).toHaveBeenCalledWith('countChange', expect.any(Function))
    expect(mocks.startCounterMock).toHaveBeenCalledWith({ intervalMs: 50 })
    expect(mocks.state.listener).not.toBeNull()
    mocks.state.listener!({ value: 7 })
    await nextTick()
    expect(api.count.value).toBe(7)
  })

  it('stopCounter: calls native stop and removes the listener', async () => {
    mocks.startCounterMock.mockResolvedValueOnce(undefined)
    mocks.stopCounterMock.mockResolvedValueOnce(undefined)
    const { api } = mountWithComposable()
    await api.startCounter(50)
    await api.stopCounter()
    expect(mocks.stopCounterMock).toHaveBeenCalled()
    expect(mocks.removeMock).toHaveBeenCalled()
  })

  it('unmount: cleans up listener even without explicit stopCounter', async () => {
    mocks.startCounterMock.mockResolvedValueOnce(undefined)
    mocks.stopCounterMock.mockResolvedValueOnce(undefined)
    const { api, wrapper } = mountWithComposable()
    await api.startCounter(50)
    wrapper.unmount()
    await flushPromises()
    expect(mocks.stopCounterMock).toHaveBeenCalled()
    expect(mocks.removeMock).toHaveBeenCalled()
  })
})
