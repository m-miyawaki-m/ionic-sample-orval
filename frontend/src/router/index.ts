import type { RouteRecordRaw } from 'vue-router'

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'samples-index',
    component: () => import('../views/SamplesIndexView.vue'),
  },

  // Existing CRUD demo (moved from '/' to '/items')
  {
    path: '/items',
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

  // Pattern A: Simple Stack
  {
    path: '/samples/a',
    name: 'sample-a',
    component: () => import('../views/samples/a-stack/AListView.vue'),
  },
  {
    path: '/samples/a/items/:id',
    name: 'sample-a-detail',
    component: () => import('../views/samples/a-stack/ADetailView.vue'),
    props: true,
  },

  // Pattern B: Menu Home (Dashboard)
  {
    path: '/samples/b',
    name: 'sample-b',
    component: () => import('../views/samples/b-menu/BHomeView.vue'),
  },
  {
    path: '/samples/b/items',
    name: 'sample-b-items',
    component: () => import('../views/samples/b-menu/BListView.vue'),
  },
  {
    path: '/samples/b/items/:id',
    name: 'sample-b-detail',
    component: () => import('../views/samples/b-menu/BDetailView.vue'),
    props: true,
  },

  // Pattern C: Bottom Tabs
  {
    path: '/samples/c',
    component: () => import('../views/samples/c-tabs/CTabsLayout.vue'),
    children: [
      { path: '', redirect: '/samples/c/home' },
      {
        path: 'home',
        name: 'sample-c-home',
        component: () => import('../views/samples/c-tabs/CHomeView.vue'),
      },
      {
        path: 'items',
        name: 'sample-c-items',
        component: () => import('../views/samples/c-tabs/CItemsView.vue'),
      },
      {
        path: 'items/:id',
        name: 'sample-c-detail',
        component: () => import('../views/samples/c-tabs/CDetailView.vue'),
        props: true,
      },
      {
        path: 'settings',
        name: 'sample-c-settings',
        component: () => import('../views/samples/c-tabs/CSettingsView.vue'),
      },
    ],
  },

  // Pattern D: Side Drawer
  {
    path: '/samples/d',
    component: () => import('../views/samples/d-drawer/DDrawerLayout.vue'),
    children: [
      { path: '', redirect: '/samples/d/items' },
      {
        path: 'items',
        name: 'sample-d-items',
        component: () => import('../views/samples/d-drawer/DItemsView.vue'),
      },
      {
        path: 'items/:id',
        name: 'sample-d-detail',
        component: () => import('../views/samples/d-drawer/DDetailView.vue'),
        props: true,
      },
      {
        path: 'settings',
        name: 'sample-d-settings',
        component: () => import('../views/samples/d-drawer/DSettingsView.vue'),
      },
    ],
  },

  // Pattern E: Tabs + Drawer Hybrid
  {
    path: '/samples/e',
    component: () => import('../views/samples/e-hybrid/EHybridLayout.vue'),
    children: [
      { path: '', redirect: '/samples/e/home' },
      {
        path: 'home',
        name: 'sample-e-home',
        component: () => import('../views/samples/e-hybrid/EHomeView.vue'),
      },
      {
        path: 'items',
        name: 'sample-e-items',
        component: () => import('../views/samples/e-hybrid/EItemsView.vue'),
      },
      {
        path: 'items/:id',
        name: 'sample-e-detail',
        component: () => import('../views/samples/e-hybrid/EDetailView.vue'),
        props: true,
      },
      {
        path: 'reports',
        name: 'sample-e-reports',
        component: () => import('../views/samples/e-hybrid/EReportsView.vue'),
      },
      {
        path: 'settings',
        name: 'sample-e-settings',
        component: () => import('../views/samples/e-hybrid/ESettingsView.vue'),
      },
    ],
  },
]
