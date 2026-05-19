import { describe, it, expect } from 'vitest'
import { parseOpenApi } from './lib'

const SAMPLE = `
openapi: 3.0.3
info: { title: t, version: '1' }
paths:
  /api/items:
    get:
      responses:
        '200':
          content:
            application/json:
              examples:
                empty:     { summary: e, value: [] }
                two_items: { summary: t, value: [{ id: 1, name: a, price: 10 }] }
`

describe('parseOpenApi', () => {
  it('parses a YAML string into a typed OpenAPI-like object', () => {
    const doc = parseOpenApi(SAMPLE)
    expect(doc.paths['/api/items'].get.responses['200'].content['application/json'].examples).toBeDefined()
    expect(Object.keys(doc.paths['/api/items'].get.responses['200'].content['application/json'].examples!)).toEqual(['empty', 'two_items'])
  })
})

import { extractScenarios } from './lib'

describe('extractScenarios', () => {
  it('collects examples per (method, path, status) into named scenarios with status', () => {
    const doc = parseOpenApi(SAMPLE)
    const scenarios = extractScenarios(doc)
    expect(scenarios).toEqual([
      {
        operationId: 'getApiItems',
        method: 'get',
        path: '/api/items',
        scenarios: [
          { key: 'empty',     status: 200, body: [] },
          { key: 'two_items', status: 200, body: [{ id: 1, name: 'a', price: 10 }] }
        ]
      }
    ])
  })

  it('honors x-status for examples without their own status', () => {
    const withErr = `
paths:
  /a:
    get:
      responses:
        '500':
          content:
            application/json:
              examples:
                server_error:
                  summary: s
                  value: { code: E_X, message: m }
`
    const scenarios = extractScenarios(parseOpenApi(withErr))
    expect(scenarios[0].scenarios[0]).toEqual({ key: 'server_error', status: 500, body: { code: 'E_X', message: 'm' } })
  })
})

import { renderFixturesTs } from './lib'

describe('renderFixturesTs', () => {
  it('emits a typed `as const` map keyed by camelCase scenario name', () => {
    const out = renderFixturesTs({
      operationId: 'listItems',
      method: 'get',
      path: '/api/items',
      scenarios: [
        { key: 'empty',     status: 200, body: [] },
        { key: 'two_items', status: 200, body: [{ id: 1 }] }
      ]
    })
    expect(out).toContain('// AUTO-GENERATED – do not edit')
    expect(out).toContain('export const listItemsFixtures = {')
    expect(out).toContain('empty: { status: 200, body: [] }')
    expect(out).toContain('twoItems: { status: 200, body: [')
    expect(out).toContain('} as const')
  })
})

import { renderE2EFixtureJson } from './lib'

describe('renderE2EFixtureJson', () => {
  it('returns the body of the default scenario as pretty JSON', () => {
    const json = renderE2EFixtureJson({
      operationId: 'listItems',
      method: 'get',
      path: '/api/items',
      scenarios: [
        { key: 'empty',     status: 200, body: [] },
        { key: 'two_items', status: 200, body: [{ id: 1 }] }
      ]
    }, 'two_items')
    expect(JSON.parse(json)).toEqual([{ id: 1 }])
  })

  it('falls back to the first scenario when default is missing', () => {
    const json = renderE2EFixtureJson({
      operationId: 'x', method: 'get', path: '/x',
      scenarios: [{ key: 'only', status: 200, body: 'hi' }]
    }, 'missing')
    expect(JSON.parse(json)).toBe('hi')
  })
})

import { renderHandlersTs } from './lib'

describe('renderHandlersTs', () => {
  it('emits an MSW handlers array with a setScenario switch keyed by operationId', () => {
    const out = renderHandlersTs([
      {
        operationId: 'listItems',
        method: 'get',
        path: '/api/items',
        scenarios: [
          { key: 'empty',     status: 200, body: [] },
          { key: 'two_items', status: 200, body: [{ id: 1 }] }
        ]
      }
    ])
    expect(out).toContain("import { http, HttpResponse } from 'msw'")
    expect(out).toContain("import { listItemsFixtures } from './listItems.fixtures'")
    expect(out).toContain("export function setListItemsScenario")
    expect(out).toContain("http.get('/api/items'")
    expect(out).toContain("export const generatedHandlers = [")
  })
})
