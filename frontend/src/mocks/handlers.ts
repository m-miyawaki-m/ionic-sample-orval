import { getDefaultMock } from '../api/default/default.msw'
import { generatedHandlers } from './generated/handlers'

// generated handlers come first so they win over the Orval-default mocks for
// the operations they cover (currently: GET /api/items)
export const handlers = [...generatedHandlers, ...getDefaultMock()]
