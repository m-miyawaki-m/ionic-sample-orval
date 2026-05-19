import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useDemoSdkInitCases, type UseDemoSdkInitCase } from './useDemoSdk.init.cases.generated'

const initMock = vi.hoisted(() => vi.fn())

vi.mock('@/native/demo-sdk-bridge', () => ({
  DEMO_SDK_EVENTS: { countChange: 'countChange' } as const,
  DemoSdkBridge: {
    init: initMock,
    getDeviceInfo: vi.fn(),
    echo: vi.fn(),
    performAction: vi.fn(),
    startCounter: vi.fn(),
    stopCounter: vi.fn(),
    triggerError: vi.fn(),
    addListener: vi.fn().mockResolvedValue({ remove: vi.fn() }),
  },
}))

import { useDemoSdk } from '../useDemoSdk'

beforeEach(() => { initMock.mockReset() })

describe('useDemoSdk.init (cases-driven, from useDemoSdk.init.md)', () => {
  it.each(useDemoSdkInitCases as readonly UseDemoSdkInitCase[])('$id', async (c) => {
    /* Arrange */
    const m = (c as any).mock.init as { kind: 'resolves' | 'rejects'; value?: unknown; code?: string }
    if (m.kind === 'resolves') {
      initMock.mockResolvedValueOnce(m.value)
    } else {
      const err = Object.assign(new Error(m.code!), { code: m.code })
      initMock.mockRejectedValueOnce(err)
    }
    let api!: ReturnType<typeof useDemoSdk>
    const Comp = defineComponent({ setup() { api = useDemoSdk(); return () => h('div') } })
    mount(Comp)

    /* Act */
    await api.init((c as any).input.apiKey)

    /* Assert */
    const exp = (c as any).expect as { initialized: boolean; lastError: { code: string | null } }
    expect(api.initialized.value).toBe(exp.initialized)
    if (exp.lastError.code === null) {
      expect(api.lastError.value).toBeNull()
    } else {
      expect(api.lastError.value?.code).toBe(exp.lastError.code)
    }
  })
})
