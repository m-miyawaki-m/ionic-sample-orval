import { describe, it, expect } from 'vitest'
import { parseSpec } from './lib'

const SAMPLE = `---
target: composables/useDemoSdk#init
generator: vitest-cases
out:
  ts: out/file.ts
---

# title

| case_id | input.x | expect.y |
|---------|---------|----------|
| C1      | "a"     | true     |
| C2      | 0       | false    |
`

describe('parseSpec', () => {
  it('returns frontmatter + table rows', () => {
    const spec = parseSpec(SAMPLE)
    expect(spec.frontmatter.target).toBe('composables/useDemoSdk#init')
    expect(spec.frontmatter.out.ts).toBe('out/file.ts')
    expect(spec.columns).toEqual(['case_id', 'input.x', 'expect.y'])
    expect(spec.rows).toEqual([
      { case_id: 'C1', 'input.x': '"a"', 'expect.y': 'true' },
      { case_id: 'C2', 'input.x': '0',   'expect.y': 'false' }
    ])
  })
})

import { parseMockExpr } from './lib'

describe('parseMockExpr', () => {
  it('parses `resolves <json>`', () => {
    expect(parseMockExpr('resolves {"ok":true}')).toEqual({ kind: 'resolves', value: { ok: true } })
  })
  it('parses `rejects E_CODE` (bare identifier code)', () => {
    expect(parseMockExpr('rejects E_INVALID_KEY')).toEqual({ kind: 'rejects', code: 'E_INVALID_KEY' })
  })
  it('throws on unknown form', () => {
    expect(() => parseMockExpr('something else')).toThrow(/unrecognized mock expression/i)
  })
})

import { parseCellValue } from './lib'

describe('parseCellValue', () => {
  it('parses JSON-literal numbers, booleans, null, strings', () => {
    expect(parseCellValue('true')).toBe(true)
    expect(parseCellValue('false')).toBe(false)
    expect(parseCellValue('null')).toBeNull()
    expect(parseCellValue('123')).toBe(123)
    expect(parseCellValue('"hello"')).toBe('hello')
  })
  it('parses JSON objects and arrays', () => {
    expect(parseCellValue('{"x":1}')).toEqual({ x: 1 })
    expect(parseCellValue('[1,2,3]')).toEqual([1, 2, 3])
  })
  it('returns the raw string as fallback', () => {
    expect(parseCellValue('not-json')).toBe('not-json')
  })
})

import { buildCases } from './lib'

describe('buildCases', () => {
  it('nests dotted columns into a typed case object and recognizes mock.* DSL', () => {
    const spec = parseSpec(`---
target: x
generator: vitest-cases
out: { ts: o.ts }
---

| case_id | input.apiKey | mock.init             | expect.initialized | expect.lastError.code |
|---------|--------------|-----------------------|--------------------|------------------------|
| C1      | "valid"      | resolves {"ok":true}  | true               | null                   |
| C2      | ""           | rejects E_INVALID_KEY | false              | E_INVALID_KEY          |
`)
    const cases = buildCases(spec)
    expect(cases).toEqual([
      {
        id: 'C1',
        input: { apiKey: 'valid' },
        mock:  { init: { kind: 'resolves', value: { ok: true } } },
        expect: { initialized: true, lastError: { code: null } }
      },
      {
        id: 'C2',
        input: { apiKey: '' },
        mock:  { init: { kind: 'rejects', code: 'E_INVALID_KEY' } },
        expect: { initialized: false, lastError: { code: 'E_INVALID_KEY' } }
      }
    ])
  })
})
