import fs from 'node:fs/promises'
import path from 'node:path'
import url from 'node:url'
import {
  parseOpenApi, extractScenarios,
  renderFixturesTs, renderHandlersTs, renderE2EFixtureJson
} from './lib'

const FRONTEND_DIR = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '../..')
const REPO_ROOT   = path.resolve(FRONTEND_DIR, '..')
const OPENAPI     = path.join(REPO_ROOT, 'openapi/openapi.yaml')

const OUT_FIXTURES = path.join(FRONTEND_DIR, 'src/mocks/generated')
const OUT_E2E      = path.join(FRONTEND_DIR, 'tests/e2e/fixtures')

const DEFAULT_SCENARIO_KEY = 'two_items'

async function rimrafContents(dir: string) {
  await fs.mkdir(dir, { recursive: true })
  for (const name of await fs.readdir(dir)) {
    if (name === '.gitkeep') continue
    await fs.rm(path.join(dir, name), { recursive: true, force: true })
  }
}

async function main() {
  const yamlText = await fs.readFile(OPENAPI, 'utf8')
  const doc = parseOpenApi(yamlText)
  const ops = extractScenarios(doc)
  if (ops.length === 0) {
    console.error('[gen-fixtures] no operations with examples found in openapi.yaml')
    process.exit(1)
  }

  await rimrafContents(OUT_FIXTURES)
  await fs.mkdir(OUT_E2E, { recursive: true })

  for (const op of ops) {
    const fixtureFile = path.join(OUT_FIXTURES, `${op.operationId}.fixtures.ts`)
    await fs.writeFile(fixtureFile, renderFixturesTs(op))
    const jsonFile = path.join(OUT_E2E, `${op.operationId}.json`)
    await fs.writeFile(jsonFile, renderE2EFixtureJson(op, DEFAULT_SCENARIO_KEY))
  }

  const handlersFile = path.join(OUT_FIXTURES, 'handlers.ts')
  await fs.writeFile(handlersFile, renderHandlersTs(ops))

  console.log(`[gen-fixtures] wrote ${ops.length} operation(s) → ${OUT_FIXTURES}, ${OUT_E2E}`)
}

main().catch(e => { console.error(e); process.exit(1) })
