// AUTO-GENERATED – do not edit
// source: GET /api/items
export const listItemsFixtures = {
  twoItems: { status: 200, body: [{"id":1,"name":"ペン","price":200},{"id":2,"name":"ノート","price":800}] },
  empty: { status: 200, body: [] },
  largeList: { status: 200, body: [{"id":1,"name":"ペン","price":200},{"id":2,"name":"ノート","price":800},{"id":3,"name":"消しゴム","price":100},{"id":4,"name":"ファイル","price":350},{"id":5,"name":"ハサミ","price":600}] },
  serverError: { status: 500, body: {"code":"E_INTERNAL","message":"internal error"} }
} as const
