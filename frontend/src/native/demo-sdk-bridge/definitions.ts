import type { PluginListenerHandle } from '@capacitor/core'

export const PLUGIN_NAME = 'DemoSdkBridge'

export const DEMO_SDK_EVENTS = {
  countChange: 'countChange',
} as const

export type DemoSdkEventName = (typeof DEMO_SDK_EVENTS)[keyof typeof DEMO_SDK_EVENTS]

export interface DeviceInfo {
  model: string
  sdkVersion: string
}

export interface CountChangeEvent {
  value: number
}

export interface DemoSdkBridgePlugin {
  init(options: { apiKey: string }): Promise<{ ok: boolean }>
  getDeviceInfo(): Promise<DeviceInfo>
  echo(options: { text: string }): Promise<{ text: string }>
  performAction(options: { input: string }): Promise<{ output: string }>
  startCounter(options: { intervalMs: number }): Promise<void>
  stopCounter(): Promise<void>
  triggerError(): Promise<void>

  addListener(
    eventName: typeof DEMO_SDK_EVENTS.countChange,
    listener: (ev: CountChangeEvent) => void,
  ): Promise<PluginListenerHandle>
  removeAllListeners(): Promise<void>
}
