import matter from 'gray-matter'

export interface CaseSpecFrontmatter {
  target: string
  generator: 'vitest-cases' | 'junit-cases' | 'both'
  out: { ts?: string; json?: string }
}

export interface CaseSpec {
  frontmatter: CaseSpecFrontmatter
  columns: string[]
  rows: Record<string, string>[]
}

function parseTable(body: string): { columns: string[]; rows: Record<string, string>[] } {
  const lines = body.split(/\r?\n/).filter(l => l.trim().startsWith('|'))
  if (lines.length < 2) throw new Error('no markdown table found in spec body')
  const splitRow = (l: string) => l.split('|').slice(1, -1).map(c => c.trim())
  const columns = splitRow(lines[0])
  // line 1 is the separator (---), drop it; remaining lines are data
  const rows = lines.slice(2).map(l => {
    const cells = splitRow(l)
    return Object.fromEntries(columns.map((c, i) => [c, cells[i] ?? '']))
  })
  return { columns, rows }
}

export function parseSpec(markdown: string): CaseSpec {
  const { data, content } = matter(markdown)
  const fm = data as CaseSpecFrontmatter
  if (!fm.target || !fm.generator || !fm.out) {
    throw new Error('spec frontmatter must contain target, generator, out')
  }
  const { columns, rows } = parseTable(content)
  return { frontmatter: fm, columns, rows }
}

export type MockExpr =
  | { kind: 'resolves'; value: unknown }
  | { kind: 'rejects'; code: string }

export function parseMockExpr(s: string): MockExpr {
  const t = s.trim()
  const resolves = /^resolves\s+(.+)$/.exec(t)
  if (resolves) {
    try { return { kind: 'resolves', value: JSON.parse(resolves[1]) } }
    catch { throw new Error(`resolves value is not valid JSON: ${resolves[1]}`) }
  }
  const rejects = /^rejects\s+([A-Z][A-Z0-9_]*)$/.exec(t)
  if (rejects) return { kind: 'rejects', code: rejects[1] }
  throw new Error(`unrecognized mock expression: ${s}`)
}

export function parseCellValue(raw: string): unknown {
  const t = raw.trim()
  try { return JSON.parse(t) } catch { return t }
}

function setDeep(target: Record<string, unknown>, dottedKey: string, value: unknown): void {
  const parts = dottedKey.split('.')
  let cur: Record<string, unknown> = target
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i]
    if (cur[k] === undefined) cur[k] = {}
    cur = cur[k] as Record<string, unknown>
  }
  cur[parts[parts.length - 1]] = value
}

export interface BuiltCase {
  id: string
  [k: string]: unknown
}

export function buildCases(spec: CaseSpec): BuiltCase[] {
  return spec.rows.map(row => {
    const out: BuiltCase = { id: row['case_id'] ?? '' }
    for (const col of spec.columns) {
      if (col === 'case_id') continue
      const cell = row[col]
      if (col.startsWith('mock.')) {
        setDeep(out, col, parseMockExpr(cell))
      } else {
        setDeep(out, col, parseCellValue(cell))
      }
    }
    return out
  })
}
