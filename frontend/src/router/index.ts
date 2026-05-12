import type { RouteRecordRaw } from 'vue-router'

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'list',
    component: () => import('../views/ListView.vue'),
  },
  {
    path: '/items/:id',
    name: 'detail',
    component: () => import('../views/DetailView.vue'),
    props: true,
  },
  {
    path: '/create',
    name: 'create',
    component: () => import('../views/CreateView.vue'),
  },
  {
    path: '/bridge-demo',
    name: 'bridge-demo',
    component: () => import('../views/BridgeDemoView.vue'),
  },
]
