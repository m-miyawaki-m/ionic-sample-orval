import { defineConfig } from 'orval'

export default defineConfig({
  api: {
    input: '../openapi/openapi.yaml',
    output: {
      target: 'src/api/index.ts',
      schemas: 'src/api/models',
      client: 'axios-functions',
      mode: 'tags-split',
      mock: {
        type: 'msw',
        useExamples: true,
      },
      override: {
        mutator: {
          path: 'src/api/axios.ts',
          name: 'request',
        },
      },
    },
  },
})
