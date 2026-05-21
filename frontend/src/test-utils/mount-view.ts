// frontend/src/test-utils/mount-view.ts
import { mount } from '@vue/test-utils'
import { IonicVue } from '@ionic/vue'
import { createRouter, createMemoryHistory } from 'vue-router'
import { routes } from '@/router'

/**
 * Component テスト用の標準 mount。
 * - IonicVue プラグインを install
 * - memory router を初期化し initialRoute へ push
 * - 必要なら props を渡す
 *
 * 使い方:
 *   const { wrapper, router } = await mountView(ListView)
 *   const { wrapper, router } = await mountView(DetailView, {
 *     initialRoute: '/items/1',
 *     props: { id: '1' },
 *   })
 */
export async function mountView(
  component: any,
  options: { initialRoute?: string; props?: Record<string, unknown> } = {},
): Promise<{
  wrapper: ReturnType<typeof mount>
  router: ReturnType<typeof createRouter>
}> {
  const router = createRouter({
    history: createMemoryHistory(),
    routes,
  })
  await router.push(options.initialRoute ?? '/')
  await router.isReady()

  const wrapper = mount(component, {
    global: {
      plugins: [IonicVue, router],
    },
    props: options.props,
  })

  return { wrapper, router }
}
