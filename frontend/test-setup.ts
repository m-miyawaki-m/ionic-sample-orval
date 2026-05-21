// frontend/test-setup.ts
import { afterAll, afterEach, beforeAll } from 'vitest'
import { server } from './src/mocks/node'
import { setListItemsScenario } from './src/mocks/generated/handlers'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

afterEach(() => {
  server.resetHandlers()
  setListItemsScenario('twoItems') // シナリオを既定に戻す
})

afterAll(() => server.close())
