/**
 * 比較サンプル: Capacitor 公式 mock パターン版 useDemoSdk.echo spec
 *
 * 対応する採用品: frontend/src/composables/__tests__/useDemoSdk.spec.ts
 *   (vi.mock('@/native/demo-sdk-bridge') で全プロパティを vi.fn() で差し替え)
 *
 * 読み比べポイント:
 * - 採用品 (vi.mock + vi.fn): モジュール全体を factory 戻り値で全置換 (粗粒度)
 *   - 学習導線が短い: 既存 spec をコピペで増やせる
 *   - 型推論は失われがち (factory 戻り値の手動キャストが必要)
 *
 * - 公式 mock (本サンプル): WebPlugin 派生クラスでプラグイン実装をすげ替え
 *   - DemoSdkBridgePlugin interface に implements で型補完が効く
 *   - Capacitor 全プラグイン (Geolocation / Camera / Filesystem 等) と
 *     同じパターンが使え、エコシステム横断の学習価値が高い
 *   - registerPlugin の web fallback と同じクラスを「本番 Web fallback」と
 *     「テスト mock」で共有できる (概念整合)
 *
 * 注意: vi.mock は import より前に巻き上げられるため、factory 内から参照する
 * 共有 state は vi.hoisted 経由で先に確保しておく必要がある (採用品 spec と
 * 同じパターン)。クラス定義自体は @capacitor/core の WebPlugin を必要とする
 * ため factory 内で async import する。
 *
 * 採点詳細は docs/superpowers/specs/2026-05-20-test-tool-comparison-design.md §2.6 参照。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'

/**
 * vi.hoisted で「テストから書き換え可能な振る舞いフック」だけを先に確保する。
 * fake クラスのインスタンス本体は vi.mock factory 内で作る (WebPlugin に依存
 * するため hoist 時点では import 不可)。
 */
const hooks = vi.hoisted(() => ({
  initFails: false as false | { code: string; message: string },
  echoImpl: null as null | ((opts: { text: string }) => Promise<{ text: string }>),
  echoCalls: [] as Array<{ text: string }>,
}))

vi.mock('@/native/demo-sdk-bridge', async () => {
  const original = await vi.importActual<typeof import('@/native/demo-sdk-bridge/definitions')>(
    '@/native/demo-sdk-bridge/definitions',
  )
  const { WebPlugin } = await import('@capacitor/core')

  /**
   * Capacitor 公式パターン: WebPlugin を継承して plugin interface を実装する。
   * 採用品 (vi.fn() factory) との違い:
   *   - implements DemoSdkBridgePlugin で interface 整合がコンパイル時に検査される
   *   - this.unimplemented() / this.unavailable() を返す Capacitor 流儀のエラー
   *     パターンに自然に従える
   *   - registerPlugin の web fallback と同じクラスを本番 / テストで共有可能
   */
  class FakeDemoSdkBridgeWeb extends WebPlugin {
    async init(options: { apiKey: string }) {
      if (hooks.initFails) {
        throw Object.assign(new Error(hooks.initFails.message), { code: hooks.initFails.code })
      }
      return { ok: options.apiKey.length > 0 }
    }
    async echo(options: { text: string }) {
      hooks.echoCalls.push(options)
      if (hooks.echoImpl) return await hooks.echoImpl(options)
      return { text: `echo:${options.text}` }
    }
    async getDeviceInfo() {
      return { model: 'FakeModel', sdkVersion: '0.0.0-fake' }
    }
    async performAction() {
      return { output: 'noop' }
    }
    async startCounter() {
      /* noop */
    }
    async stopCounter() {
      /* noop */
    }
    async triggerError() {
      throw Object.assign(new Error('fake'), { code: 'E_FAKE' })
    }
    async addListener(_ev: string, _cb: (ev: { value: number }) => void) {
      return { remove: async () => undefined }
    }
    async removeAllListeners() {
      /* noop */
    }
  }

  return {
    PLUGIN_NAME: original.PLUGIN_NAME,
    DEMO_SDK_EVENTS: original.DEMO_SDK_EVENTS,
    DemoSdkBridge: new FakeDemoSdkBridgeWeb(),
  }
})

import { useDemoSdk } from '@/composables/useDemoSdk'

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
  hooks.initFails = false
  hooks.echoImpl = null
  hooks.echoCalls = []
})

describe('useDemoSdk.echo (Capacitor 公式 mock パターン 比較サンプル)', () => {
  it('echo 正常系: composable が fake.echo を呼び、prefix 付き文字列を返す', async () => {
    const { api } = mountWithComposable()
    const out = await api.echo('hello')

    expect(out).toBe('echo:hello')
    expect(hooks.echoCalls).toEqual([{ text: 'hello' }])
  })

  it('echo 異常系: hooks.echoImpl で例外を投げると composable は null + lastError', async () => {
    // 採用品 (vi.mock) では `echoMock.mockRejectedValueOnce(...)` 相当を、
    // 公式パターンでは「振る舞いフックを差し替える」形で表現する
    hooks.echoImpl = async () => {
      throw Object.assign(new Error('boom'), { code: 'E_ECHO' })
    }

    const { api } = mountWithComposable()
    const out = await api.echo('hello')

    expect(out).toBeNull()
    expect(api.lastError.value).toEqual({ code: 'E_ECHO', message: 'boom' })
  })

  it('echo 戻り値差し替え: hooks.echoImpl で別の値を返せる (mockResolvedValueOnce 相当)', async () => {
    hooks.echoImpl = async () => ({ text: 'overridden' })

    const { api } = mountWithComposable()
    const out = await api.echo('whatever')

    expect(out).toBe('overridden')
    expect(hooks.echoCalls).toEqual([{ text: 'whatever' }])
  })
})
