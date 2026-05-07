/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USE_MOCK: 'msw' | 'none' | undefined
  readonly VITE_API_BASE_URL: string | undefined
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
