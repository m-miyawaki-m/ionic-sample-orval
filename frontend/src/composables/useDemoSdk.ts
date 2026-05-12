import { onUnmounted, ref } from 'vue'
import type { PluginListenerHandle } from '@capacitor/core'

import {
  DEMO_SDK_EVENTS,
  DemoSdkBridge,
  type CountChangeEvent,
  type DeviceInfo,
} from '@/native/demo-sdk-bridge'

export interface DemoSdkError {
  code: string
  message: string
}

function toError(e: unknown): DemoSdkError {
  if (e && typeof e === 'object') {
    const err = e as { code?: unknown; message?: unknown }
    return {
      code: typeof err.code === 'string' ? err.code : 'E_UNKNOWN',
      message: typeof err.message === 'string' ? err.message : String(e),
    }
  }
  return { code: 'E_UNKNOWN', message: String(e) }
}

export function useDemoSdk() {
  const initialized = ref(false)
  const count = ref(0)
  const lastError = ref<DemoSdkError | null>(null)

  let counterHandle: PluginListenerHandle | null = null

  async function init(apiKey: string): Promise<boolean> {
    lastError.value = null
    try {
      const { ok } = await DemoSdkBridge.init({ apiKey })
      initialized.value = ok
      return ok
    } catch (e) {
      lastError.value = toError(e)
      return false
    }
  }

  async function getDeviceInfo(): Promise<DeviceInfo | null> {
    lastError.value = null
    try {
      return await DemoSdkBridge.getDeviceInfo()
    } catch (e) {
      lastError.value = toError(e)
      return null
    }
  }

  async function echo(text: string): Promise<string | null> {
    lastError.value = null
    try {
      const res = await DemoSdkBridge.echo({ text })
      return res.text
    } catch (e) {
      lastError.value = toError(e)
      return null
    }
  }

  async function performAction(input: string): Promise<string | null> {
    lastError.value = null
    try {
      const res = await DemoSdkBridge.performAction({ input })
      return res.output
    } catch (e) {
      lastError.value = toError(e)
      return null
    }
  }

  async function triggerError(): Promise<void> {
    lastError.value = null
    try {
      await DemoSdkBridge.triggerError()
    } catch (e) {
      lastError.value = toError(e)
    }
  }

  async function startCounter(intervalMs = 1000): Promise<void> {
    lastError.value = null
    try {
      if (counterHandle) {
        await counterHandle.remove()
        counterHandle = null
      }
      counterHandle = await DemoSdkBridge.addListener(
        DEMO_SDK_EVENTS.countChange,
        (ev: CountChangeEvent) => {
          count.value = ev.value
        },
      )
      await DemoSdkBridge.startCounter({ intervalMs })
    } catch (e) {
      lastError.value = toError(e)
    }
  }

  async function stopCounter(): Promise<void> {
    try {
      await DemoSdkBridge.stopCounter()
    } catch (e) {
      lastError.value = toError(e)
    }
    if (counterHandle) {
      await counterHandle.remove()
      counterHandle = null
    }
  }

  onUnmounted(() => {
    void stopCounter()
  })

  return {
    initialized,
    count,
    lastError,
    init,
    getDeviceInfo,
    echo,
    performAction,
    triggerError,
    startCounter,
    stopCounter,
  }
}
