import fs from 'node:fs/promises'
import path from 'node:path'
import url from 'node:url'
import { parseSpec, buildCases, renderVitestCasesTs } from './lib'

const FRONTEND_DIR = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '../..')
const REPO_ROOT   = path.resolve(FRONTEND_DIR, '..')
const SPECS_DIR   = path.join(REPO_ROOT, 'docs/specs/cases')

async function listSpecFiles(): Promise<string[]> {
  const entries = await fs.readdir(SPECS_DIR, { withFileTypes: true })
  return entries.filter(e => e.isFile() && e.name.endsWith('.md')).map(e => path.join(SPECS_DIR, e.name))
}

function resolveOut(p: string): string {
  return path.isAbsolute(p) ? p : path.join(REPO_ROOT, p)
}

async function main() {
  const files = await listSpecFiles()
  if (files.length === 0) {
    console.error(`[gen-cases] no .md specs found in ${SPECS_DIR}`)
    process.exit(1)
  }

  for (const f of files) {
    const md = await fs.readFile(f, 'utf8')
    const spec = parseSpec(md)
    const cases = buildCases(spec)

    if ((spec.frontmatter.generator === 'vitest-cases' || spec.frontmatter.generator === 'both') && spec.frontmatter.out.ts) {
      const out = resolveOut(spec.frontmatter.out.ts)
      await fs.mkdir(path.dirname(out), { recursive: true })
      await fs.writeFile(out, renderVitestCasesTs(spec.frontmatter.target, cases))
      console.log(`[gen-cases] ${path.basename(f)} → ${out}`)
    }
    // JUnit JSON branch lands in P5 (Android instrumented), not here.
  }
}

main().catch(e => { console.error(e); process.exit(1) })
