import { registerPlugin } from '@capacitor/core'

import type { DemoSdkBridgePlugin } from './definitions'
import { PLUGIN_NAME } from './definitions'

export const DemoSdkBridge = registerPlugin<DemoSdkBridgePlugin>(PLUGIN_NAME)

export * from './definitions'
