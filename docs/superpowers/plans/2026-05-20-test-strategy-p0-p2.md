# Test Strategy P0+P1+P2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the foundation (VSCode + reporters + .gitignore), the OpenAPI-examples-to-fixtures pipeline, and the Markdown-decision-table-to-`it.each` pipeline from the test strategy spec.

**Architecture:** Three sequential phases. P0 wires VSCode (extensions / launch / tasks), Vitest reporters (HTML + JUnit + coverage), and Cypress reporters (mochawesome + JUnit, video off). P1 adds multi-scenario `examples` to `openapi/openapi.yaml`, builds `gen-fixtures` (parse YAML → emit fixtures + MSW handlers + Cypress JSON), and rewires consumers. P2 adds a Markdown decision table format under `docs/specs/cases/`, builds `gen-cases` (parse frontmatter + table → emit typed `*.cases.generated.ts`), and converts `useDemoSdk.init` to a cases-driven `it.each` spec (keeping the original hand-written spec as a comparison sample).

**Tech Stack:** TypeScript, Vitest 0.34, @vue/test-utils, jsdom, MSW 2, Cypress 13, Vite 5, js-yaml, gray-matter, tsx.

**Deviation from spec §6.1:** TS generator scripts live at `frontend/scripts/gen-fixtures/` and `frontend/scripts/gen-cases/` (not repo root `scripts/`). Reason: keeps generator source under the frontend npm + Vitest toolchain so tests auto-collect and `tsx` is available without a root `package.json`. The `scripts/` at repo root continues to hold `.cmd` orchestration files only. Last task updates the spec to reflect this.

**Reference spec:** `docs/superpowers/specs/2026-05-20-test-strategy-design.md`

---

## Phase 0 — Foundation (Tasks 1–9)

### Task 1: Update frontend/.gitignore to allow tracked VSCode files and ignore evidence directories

**Files:**
- Modify: `frontend/.gitignore`

**Why:** Current rule `/.vscode/*` with single exception `!/.vscode/extensions.json` blocks the `launch.json` / `tasks.json` we will create in Tasks 3–4. Also need to ignore the new evidence directories.

- [ ] **Step 1: Replace VSCode ignore rules and add evidence directory rules**

Open `frontend/.gitignore` and replace this block:

```
/.vscode/*
!/.vscode/extensions.json
/coverage
/dist
```

with:

```
/.vscode/*
!/.vscode/extensions.json
!/.vscode/launch.json
!/.vscode/tasks.json

# Test evidence (HTML reports, JUnit XML, screenshots) — local only
/.vitest-report
/coverage
/tests/e2e/screenshots
/tests/e2e/reports
/tests/e2e/videos

/dist
```

- [ ] **Step 2: Verify the change does not affect existing tracked files**

Run: `git status`
Expected: only `frontend/.gitignore` shown as modified.

- [ ] **Step 3: Commit**

```powershell
git add frontend/.gitignore
git commit -m "chore(frontend): allow tracked .vscode/{launch,tasks}.json and ignore test evidence dirs"
```

---

### Task 2: Expand frontend/.vscode/extensions.json with recommended test extensions

**Files:**
- Modify: `frontend/.vscode/extensions.json`

- [ ] **Step 1: Replace the file**

```json
{
  "recommendations": [
    "Vue.volar",
    "vitest.explorer",
    "dbaeumer.vscode-eslint",
    "vscjava.vscode-java-pack",
    "vscjava.vscode-gradle",
    "vscjava.vscode-java-test",
    "ms-vscode.js-debug"
  ]
}
```

> Removed `Webnative.webnative` (placeholder from scaffold, no longer relevant). The spec also lists `fwcd.kotlin`, `adelphes.android-dev-ext`, and `andrew-codes.cypress-snippets` as optional — they are intentionally omitted from `recommendations` to avoid pop-up fatigue. Future Android-instrumented work (P5) will add `adelphes.android-dev-ext`.

- [ ] **Step 2: Commit**

```powershell
git add frontend/.vscode/extensions.json
git commit -m "chore(vscode): add test/vue/java recommended extensions for the frontend workspace"
```

---

### Task 3: Create frontend/.vscode/launch.json with Vitest and Cypress debug configs

**Files:**
- Create: `frontend/.vscode/launch.json`

- [ ] **Step 1: Create the file**

```jsonc
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Vitest: current file",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/frontend/node_modules/vitest/vitest.mjs",
      "args": ["run", "${relativeFile}"],
      "cwd": "${workspaceFolder}/frontend",
      "console": "integratedTerminal"
    },
    {
      "name": "Cypress: run current spec (headed + debug port)",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/frontend/node_modules/cypress/bin/cypress",
      "args": ["run", "--browser", "chrome", "--headed", "--no-exit",
               "--spec", "${relativeFile}"],
      "cwd": "${workspaceFolder}/frontend",
      "env": { "CYPRESS_REMOTE_DEBUGGING_PORT": "9222" },
      "console": "integratedTerminal"
    },
    {
      "name": "Cypress: attach to Chrome (port 9222)",
      "type": "chrome",
      "request": "attach",
      "port": 9222,
      "webRoot": "${workspaceFolder}/frontend",
      "sourceMaps": true,
      "sourceMapPathOverrides": {
        "webpack:///./*": "${webRoot}/*",
        "webpack:///src/*": "${webRoot}/src/*"
      }
    },
    {
      "name": "Cypress: debug plugin/node side",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/frontend/node_modules/cypress/bin/cypress",
      "args": ["open"],
      "cwd": "${workspaceFolder}/frontend",
      "console": "integratedTerminal"
    }
  ],
  "compounds": [
    {
      "name": "Cypress: spec + attach",
      "configurations": [
        "Cypress: run current spec (headed + debug port)",
        "Cypress: attach to Chrome (port 9222)"
      ]
    }
  ]
}
```

- [ ] **Step 2: Verify file is tracked (not ignored)**

Run: `git status -- frontend/.vscode/launch.json`
Expected: shown as untracked (not ignored).

- [ ] **Step 3: Commit**

```powershell
git add frontend/.vscode/launch.json
git commit -m "chore(vscode): add launch configs for Vitest and Cypress (with Chrome attach)"
```

---

### Task 4: Create frontend/.vscode/tasks.json

**Files:**
- Create: `frontend/.vscode/tasks.json`

- [ ] **Step 1: Create the file**

```jsonc
{
  "version": "2.0.0",
  "tasks": [
    { "label": "fe: dev",            "type": "npm", "script": "dev",          "path": "frontend", "isBackground": true },
    { "label": "fe: vitest watch",   "type": "npm", "script": "test:unit",    "path": "frontend" },
    { "label": "fe: cypress run",    "type": "npm", "script": "test:e2e",     "path": "frontend" },
    { "label": "fe: gen fixtures",   "type": "npm", "script": "gen:fixtures", "path": "frontend" },
    { "label": "fe: gen cases",      "type": "npm", "script": "gen:cases",    "path": "frontend" },
    {
      "label": "be: mvnw test",
      "type": "shell",
      "command": ".\\mvnw.cmd test",
      "options": { "cwd": "${workspaceFolder}/backend" }
    },
    {
      "label": "sdk: gradle test (JVM unit)",
      "type": "shell",
      "command": ".\\gradlew.bat :demo-sdk:test",
      "options": { "cwd": "${workspaceFolder}/frontend/android" }
    },
    {
      "label": "sdk: gradle connectedAndroidTest (Espresso)",
      "type": "shell",
      "command": ".\\gradlew.bat :app:connectedAndroidTest",
      "options": { "cwd": "${workspaceFolder}/frontend/android" }
    }
  ]
}
```

> `gen:fixtures` and `gen:cases` scripts will be added to `package.json` in Tasks 16 and 41. The tasks still resolve from `tasks.json`; running them before those tasks will simply error with "Missing script". That is acceptable for plan order.

- [ ] **Step 2: Commit**

```powershell
git add frontend/.vscode/tasks.json
git commit -m "chore(vscode): add tasks for FE/BE/SDK test and gen scripts"
```

---

### Task 5: Add Vitest reporter & coverage dependencies

**Files:**
- Modify: `frontend/package.json` (via npm install)

- [ ] **Step 1: Install devDeps**

Run (from repo root):

```powershell
cd frontend
npm install --save-dev @vitest/coverage-v8@^0.34.6 @vitest/ui@^0.34.6
cd ..
```

> The two packages must match the installed `vitest@^0.34.6` major.

- [ ] **Step 2: Verify package.json was updated**

Read `frontend/package.json` and confirm `devDependencies` now contains:

```
"@vitest/coverage-v8": "^0.34.6",
"@vitest/ui": "^0.34.6",
```

- [ ] **Step 3: Commit**

```powershell
git add frontend/package.json frontend/package-lock.json
git commit -m "chore(frontend): add @vitest/coverage-v8 and @vitest/ui for HTML reports and coverage"
```

---

### Task 6: Configure Vitest reporters (HTML + JUnit + coverage) in vite.config.ts

**Files:**
- Modify: `frontend/vite.config.ts`

- [ ] **Step 1: Replace the `test` block**

Open `frontend/vite.config.ts`. Replace:

```ts
  test: {
    globals: true,
    environment: 'jsdom'
  }
```

with:

```ts
  test: {
    globals: true,
    environment: 'jsdom',
    reporters: [
      'default',
      ['html', { outputFile: '.vitest-report/index.html' }],
      ['junit', { outputFile: '.vitest-report/junit.xml' }]
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.{ts,vue}'],
      exclude: ['src/**/*.{test,spec}.ts', 'src/api/**', 'src/mocks/generated/**']
    }
  }
```

> The `coverage.include`/`exclude` lists deliberately drop generated and Orval-managed files so they don't bias the coverage number.

- [ ] **Step 2: Smoke-run existing Vitest spec with new reporters**

Run (from repo root):

```powershell
cd frontend
npm run test:unit -- --run
cd ..
```

Expected: existing `useDemoSdk.spec.ts` tests pass (10 tests), and the following files exist:

- `frontend/.vitest-report/index.html`
- `frontend/.vitest-report/junit.xml`

- [ ] **Step 3: Confirm artifacts are ignored**

Run: `git status`
Expected: only `frontend/vite.config.ts` is shown as modified. `.vitest-report/` does not appear (already ignored by Task 1).

- [ ] **Step 4: Commit**

```powershell
git add frontend/vite.config.ts
git commit -m "test(vitest): emit HTML + JUnit reports and enable v8 coverage"
```

---

### Task 7: Add Cypress reporter dependencies

**Files:**
- Modify: `frontend/package.json` (via npm install)

- [ ] **Step 1: Install devDeps**

```powershell
cd frontend
npm install --save-dev cypress-multi-reporters@^2.0.4 mochawesome@^7.1.3 mochawesome-merge@^4.3.0 mochawesome-report-generator@^6.2.0 mocha-junit-reporter@^2.2.1 mocha@^10.7.3
cd ..
```

> `mocha` is required as a peer of `mochawesome`. Pin majors to current stable.

- [ ] **Step 2: Commit**

```powershell
git add frontend/package.json frontend/package-lock.json
git commit -m "chore(frontend): add Cypress reporters (mochawesome + mocha-junit-reporter)"
```

---

### Task 8: Configure Cypress reporters and disable video

**Files:**
- Modify: `frontend/cypress.config.ts`
- Replace placeholder spec: `frontend/tests/e2e/specs/test.cy.ts` → real smoke test

- [ ] **Step 1: Replace `frontend/cypress.config.ts`**

```ts
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    supportFile: 'tests/e2e/support/e2e.{js,jsx,ts,tsx}',
    specPattern: 'tests/e2e/specs/**/*.cy.{js,jsx,ts,tsx}',
    videosFolder: 'tests/e2e/videos',
    screenshotsFolder: 'tests/e2e/screenshots',
    fixturesFolder: 'tests/e2e/fixtures',
    baseUrl: 'http://localhost:5173',
    video: false,
    screenshotOnRunFailure: true,
    reporter: 'cypress-multi-reporters',
    reporterOptions: {
      reporterEnabled: 'mochawesome, mocha-junit-reporter',
      mochawesomeReporterOptions: {
        reportDir: 'tests/e2e/reports',
        overwrite: false,
        html: true,
        json: true
      },
      mochaJunitReporterOptions: {
        mochaFile: 'tests/e2e/reports/junit-[hash].xml'
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
});
```

- [ ] **Step 2: Replace `frontend/tests/e2e/specs/test.cy.ts` with a smoke test of the real app**

Delete the existing content and write:

```ts
describe('smoke: list view loads', () => {
  it('shows the list page title', () => {
    cy.visit('/')
    cy.contains('商品一覧').should('be.visible')
  })
})
```

> The scaffold's `"Ready to create an app?"` text does not exist in this app, so the previous spec always failed. This is a real smoke test against `ListView.vue`. P1 will replace it again with the fixture-driven `items-flow.cy.ts`.

- [ ] **Step 3: Start dev server (MSW mode) in a second terminal**

```powershell
cd frontend
npm run dev
```

Leave it running on `http://localhost:5173`.

- [ ] **Step 4: Run Cypress headless in the first terminal**

```powershell
cd frontend
npm run test:e2e
```

Expected: 1 spec, 1 passing test. The following files exist:

- `frontend/tests/e2e/reports/mochawesome*.json`
- `frontend/tests/e2e/reports/mochawesome.html`
- `frontend/tests/e2e/reports/junit-*.xml`

If a network/Service Worker hiccup makes the title slow, allow `cy.visit('/').then(() => cy.contains('商品一覧', { timeout: 10000 }).should('be.visible'))` — but the default 4 s should suffice once dev is warm.

- [ ] **Step 5: Stop the dev server (Ctrl+C in second terminal)**

- [ ] **Step 6: Commit**

```powershell
git add frontend/cypress.config.ts frontend/tests/e2e/specs/test.cy.ts
git commit -m "test(cypress): enable mochawesome+junit reporters, disable video, replace scaffold smoke spec"
```

---

### Task 9: Phase 0 acceptance check

**Files:** none

- [ ] **Step 1: Verify all tasks listed in spec §6.2 Phase P0 acceptance criteria**

Acceptance criteria (verbatim from spec): "VSCode 拡張インストール後、Vitest と Cypress を VSCode から実行可能。HTML レポートが生成される。"

Walk through manually:

1. Open VSCode at repo root. Confirm: "Recommended Extensions" pop-up offers the list from Task 2.
2. In `useDemoSdk.spec.ts`, click the Vitest explorer Run lens → tests pass.
3. Verify `frontend/.vitest-report/index.html` opens in a browser.
4. Run task `fe: cypress run` (after `fe: dev` is up in a separate terminal) → smoke test passes.
5. Verify `frontend/tests/e2e/reports/mochawesome.html` opens in a browser.

If any of the above fails, fix in place and amend the relevant earlier task before moving on.

- [ ] **Step 2: No commit** — verification only.

---

## Phase 1 — OpenAPI examples → fixtures (Tasks 10–25)

### Task 10: Extend openapi.yaml with scenario examples for `GET /api/items`

**Files:**
- Modify: `openapi/openapi.yaml`

- [ ] **Step 1: Replace the `GET /api/items` `responses` block**

Find the block (lines 18–28):

```yaml
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/Item' }
              example:
                - { id: 1, name: "ペン", price: 200 }
                - { id: 2, name: "ノート", price: 800 }
```

Replace with:

```yaml
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/Item' }
              examples:
                two_items:
                  summary: 通常2件（既定／先頭＝生成 handler のデフォルト）
                  value:
                    - { id: 1, name: "ペン",     price: 200 }
                    - { id: 2, name: "ノート",   price: 800 }
                empty:
                  summary: 空配列
                  value: []
                large_list:
                  summary: スクロール検証用（5件）
                  value:
                    - { id: 1, name: "ペン",       price: 200 }
                    - { id: 2, name: "ノート",     price: 800 }
                    - { id: 3, name: "消しゴム",   price: 100 }
                    - { id: 4, name: "ファイル",   price: 350 }
                    - { id: 5, name: "ハサミ",     price: 600 }
        '500':
          description: Internal Server Error
          content:
            application/json:
              examples:
                server_error:
                  summary: 5xx スタブ
                  value: { code: "E_INTERNAL", message: "internal error" }
```

> Note: This switches from the singular `example:` to plural `examples:`. Orval handles `examples:` (it picks the first one by default for generated MSW mocks). The existing manual handler in `src/mocks/handlers.ts` still wins for the running app because we will compose generated handlers before it in Task 24.

- [ ] **Step 2: Validate YAML**

```powershell
cd frontend
npx --yes @redocly/cli lint ../openapi/openapi.yaml
cd ..
```

Expected: any pre-existing warnings stay the same; no new structural errors. (`@redocly/cli` is already in devDeps.)

- [ ] **Step 3: Re-run Orval to confirm the YAML still parses end-to-end**

```powershell
cd frontend
npm run gen
cd ..
```

Expected: completes without error. Generated MSW handlers may now use the first example (`empty`) — that's fine; Task 24 will route real traffic through our generated handlers.

- [ ] **Step 4: Commit**

```powershell
git add openapi/openapi.yaml frontend/src/api
git commit -m "feat(openapi): add multi-scenario examples for GET /api/items (empty, two_items, large_list, 500)"
```

---

### Task 11: Add tsx and js-yaml devDeps for generator scripts

**Files:**
- Modify: `frontend/package.json` (via npm install)

- [ ] **Step 1: Install**

```powershell
cd frontend
npm install --save-dev tsx@^4.19.0 js-yaml@^4.1.0 @types/js-yaml@^4.0.9
cd ..
```

- [ ] **Step 2: Commit**

```powershell
git add frontend/package.json frontend/package-lock.json
git commit -m "chore(frontend): add tsx + js-yaml for generator scripts"
```

---

### Task 12: Create gen-fixtures directory layout and the failing `parseOpenApi` test

**Files:**
- Create: `frontend/scripts/gen-fixtures/lib.ts` (empty stub)
- Create: `frontend/scripts/gen-fixtures/lib.test.ts`

- [ ] **Step 1: Create the empty stub**

`frontend/scripts/gen-fixtures/lib.ts`:

```ts
export {}
```

- [ ] **Step 2: Write the failing test**

`frontend/scripts/gen-fixtures/lib.test.ts`:

```ts
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
```

- [ ] **Step 3: Run the test and verify it fails**

```powershell
cd frontend
npm run test:unit -- --run scripts/gen-fixtures/lib.test.ts
cd ..
```

Expected: FAIL with "parseOpenApi is not a function" or similar.

- [ ] **Step 4: No commit** — implementation lands in Task 13.

---

### Task 13: Implement `parseOpenApi`

**Files:**
- Modify: `frontend/scripts/gen-fixtures/lib.ts`

- [ ] **Step 1: Implement**

Replace `frontend/scripts/gen-fixtures/lib.ts` with:

```ts
import yaml from 'js-yaml'

export interface Example {
  summary?: string
  value: unknown
  /** non-standard: HTTP status override, e.g. for 5xx examples */
  ['x-status']?: number
}

export interface ResponseObject {
  description?: string
  content?: Record<string, { examples?: Record<string, Example>; example?: unknown }>
}

export interface OperationObject {
  operationId?: string
  responses: Record<string, ResponseObject>
}

export interface OpenApiDoc {
  openapi: string
  paths: Record<string, Partial<Record<'get' | 'post' | 'put' | 'delete' | 'patch', OperationObject>>>
}

export function parseOpenApi(yamlText: string): OpenApiDoc {
  const doc = yaml.load(yamlText)
  if (!doc || typeof doc !== 'object') throw new Error('Invalid OpenAPI YAML: not an object')
  return doc as OpenApiDoc
}
```

- [ ] **Step 2: Run the test and verify it passes**

```powershell
cd frontend
npm run test:unit -- --run scripts/gen-fixtures/lib.test.ts
cd ..
```

Expected: PASS.

- [ ] **Step 3: No commit** — bundle with later gen-fixtures tasks.

---

### Task 14: Add failing test for `extractScenarios`

**Files:**
- Modify: `frontend/scripts/gen-fixtures/lib.test.ts`

- [ ] **Step 1: Append test**

Add at the end of `frontend/scripts/gen-fixtures/lib.test.ts`:

```ts
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
```

- [ ] **Step 2: Run and verify it fails**

Expected: FAIL with "extractScenarios is not a function".

- [ ] **Step 3: No commit.**

---

### Task 15: Implement `extractScenarios`

**Files:**
- Modify: `frontend/scripts/gen-fixtures/lib.ts`

- [ ] **Step 1: Append to lib.ts**

```ts
export interface Scenario {
  key: string
  status: number
  body: unknown
}

export interface OperationScenarios {
  operationId: string
  method: string
  path: string
  scenarios: Scenario[]
}

function defaultOperationId(method: string, path: string): string {
  const camel = path.replace(/\/(\w)/g, (_m, c: string) => c.toUpperCase()).replace(/[^A-Za-z0-9]/g, '')
  return method + camel.charAt(0).toUpperCase() + camel.slice(1)
}

export function extractScenarios(doc: OpenApiDoc): OperationScenarios[] {
  const out: OperationScenarios[] = []
  for (const [pathKey, pathItem] of Object.entries(doc.paths)) {
    for (const method of ['get', 'post', 'put', 'delete', 'patch'] as const) {
      const op = pathItem[method]
      if (!op) continue
      const scenarios: Scenario[] = []
      for (const [statusStr, response] of Object.entries(op.responses)) {
        const examples = response.content?.['application/json']?.examples
        if (!examples) continue
        for (const [key, ex] of Object.entries(examples)) {
          const status = ex['x-status'] ?? Number(statusStr)
          scenarios.push({ key, status, body: ex.value })
        }
      }
      if (scenarios.length === 0) continue
      out.push({
        operationId: op.operationId ?? defaultOperationId(method, pathKey),
        method,
        path: pathKey,
        scenarios
      })
    }
  }
  return out
}
```

- [ ] **Step 2: Run tests and verify they pass**

```powershell
cd frontend
npm run test:unit -- --run scripts/gen-fixtures/lib.test.ts
cd ..
```

Expected: 3 PASS.

- [ ] **Step 3: No commit.**

---

### Task 16: Add failing test for `renderFixturesTs`

**Files:**
- Modify: `frontend/scripts/gen-fixtures/lib.test.ts`

- [ ] **Step 1: Append**

```ts
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
```

- [ ] **Step 2: Run and verify FAIL.**

- [ ] **Step 3: No commit.**

---

### Task 17: Implement `renderFixturesTs`

**Files:**
- Modify: `frontend/scripts/gen-fixtures/lib.ts`

- [ ] **Step 1: Append**

```ts
function camel(s: string): string {
  return s.replace(/[_-](\w)/g, (_m, c: string) => c.toUpperCase())
}

const AUTO_HEADER = '// AUTO-GENERATED – do not edit'

export function renderFixturesTs(op: OperationScenarios): string {
  const entries = op.scenarios
    .map(s => `  ${camel(s.key)}: { status: ${s.status}, body: ${JSON.stringify(s.body)} }`)
    .join(',\n')
  return `${AUTO_HEADER}
// source: ${op.method.toUpperCase()} ${op.path}
export const ${op.operationId}Fixtures = {
${entries}
} as const
`
}
```

- [ ] **Step 2: Run tests and verify PASS.**

- [ ] **Step 3: No commit.**

---

### Task 18: Add failing test for `renderE2EFixtureJson`

**Files:**
- Modify: `frontend/scripts/gen-fixtures/lib.test.ts`

- [ ] **Step 1: Append**

```ts
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
```

- [ ] **Step 2: Run and verify FAIL.**

- [ ] **Step 3: No commit.**

---

### Task 19: Implement `renderE2EFixtureJson`

**Files:**
- Modify: `frontend/scripts/gen-fixtures/lib.ts`

- [ ] **Step 1: Append**

```ts
export function renderE2EFixtureJson(op: OperationScenarios, defaultKey: string): string {
  const chosen = op.scenarios.find(s => s.key === defaultKey) ?? op.scenarios[0]
  return JSON.stringify(chosen.body, null, 2) + '\n'
}
```

- [ ] **Step 2: Run tests and verify PASS.**

- [ ] **Step 3: No commit.**

---

### Task 20: Add failing test for `renderHandlersTs`

**Files:**
- Modify: `frontend/scripts/gen-fixtures/lib.test.ts`

- [ ] **Step 1: Append**

```ts
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
```

- [ ] **Step 2: Run and verify FAIL.**

- [ ] **Step 3: No commit.**

---

### Task 21: Implement `renderHandlersTs`

**Files:**
- Modify: `frontend/scripts/gen-fixtures/lib.ts`

- [ ] **Step 1: Append**

```ts
export function renderHandlersTs(ops: OperationScenarios[]): string {
  const imports = ops.map(op => `import { ${op.operationId}Fixtures } from './${op.operationId}.fixtures'`).join('\n')
  const switches = ops.map(op => {
    const t = op.operationId.charAt(0).toUpperCase() + op.operationId.slice(1)
    const defaultKey = camel(op.scenarios[0].key)
    return `let current${t}Scenario: keyof typeof ${op.operationId}Fixtures = '${defaultKey}'
export function set${t}Scenario(key: keyof typeof ${op.operationId}Fixtures) { current${t}Scenario = key }`
  }).join('\n\n')
  const handlers = ops.map(op => {
    const t = op.operationId.charAt(0).toUpperCase() + op.operationId.slice(1)
    return `  http.${op.method}('${op.path}', () => {
    const s = ${op.operationId}Fixtures[current${t}Scenario]
    return HttpResponse.json(s.body, { status: s.status })
  })`
  }).join(',\n')
  return `${AUTO_HEADER}
import { http, HttpResponse } from 'msw'
${imports}

${switches}

export const generatedHandlers = [
${handlers}
]
`
}
```

- [ ] **Step 2: Run tests and verify PASS.**

- [ ] **Step 3: Commit the whole `gen-fixtures/lib.ts` + tests**

```powershell
git add frontend/scripts/gen-fixtures
git commit -m "feat(gen): add gen-fixtures lib (parseOpenApi, extractScenarios, renderers + tests)"
```

---

### Task 22: Add the CLI wrapper for gen-fixtures

**Files:**
- Create: `frontend/scripts/gen-fixtures/cli.ts`

- [ ] **Step 1: Create the CLI**

```ts
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
```

- [ ] **Step 2: Commit**

```powershell
git add frontend/scripts/gen-fixtures/cli.ts
git commit -m "feat(gen): add gen-fixtures CLI that writes fixtures, handlers, and e2e JSON"
```

---

### Task 23: Wire `gen:fixtures` into npm scripts and run it

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: Edit `frontend/package.json`**

In the `scripts` object, add:

```json
    "gen:fixtures": "tsx scripts/gen-fixtures/cli.ts"
```

(Place it after the existing `"gen": "..."` entry.)

- [ ] **Step 2: Run it**

```powershell
cd frontend
npm run gen:fixtures
cd ..
```

Expected stdout: `[gen-fixtures] wrote 1 operation(s) → ...src/mocks/generated, ...tests/e2e/fixtures`

The following files now exist:

- `frontend/src/mocks/generated/listItems.fixtures.ts`
- `frontend/src/mocks/generated/handlers.ts`
- `frontend/tests/e2e/fixtures/listItems.json`

> If the generator emitted a different operationId (e.g. you renamed it in openapi.yaml), adjust the paths. The default openapi.yaml uses `operationId: listItems`.

- [ ] **Step 3: Inspect outputs**

`frontend/src/mocks/generated/listItems.fixtures.ts` should look like:

```ts
// AUTO-GENERATED – do not edit
// source: GET /api/items
export const listItemsFixtures = {
  twoItems: { status: 200, body: [{"id":1,"name":"ペン","price":200},{"id":2,"name":"ノート","price":800}] },
  empty: { status: 200, body: [] },
  largeList: { status: 200, body: [...] },
  serverError: { status: 500, body: {"code":"E_INTERNAL","message":"internal error"} }
} as const
```

The generated `handlers.ts` defaults `currentListItemsScenario` to `'twoItems'` (the first key), preserving the existing UX of ListView.

- [ ] **Step 4: Commit script registration + generated outputs**

```powershell
git add frontend/package.json frontend/src/mocks/generated frontend/tests/e2e/fixtures
git commit -m "feat(gen): wire gen:fixtures script and commit generated outputs for /api/items"
```

> Generated files are committed so CI can `git diff --exit-code` after regeneration to catch drift.

---

### Task 24: Compose generated handlers into the runtime MSW handler list

**Files:**
- Modify: `frontend/src/mocks/handlers.ts`

- [ ] **Step 1: Replace contents**

```ts
import { getDefaultMock } from '../api/default/default.msw'
import { generatedHandlers } from './generated/handlers'

// generated handlers come first so they win over the Orval-default mocks for
// the operations they cover (currently: GET /api/items)
export const handlers = [...generatedHandlers, ...getDefaultMock()]
```

- [ ] **Step 2: Verify Vitest still passes**

```powershell
cd frontend
npm run test:unit -- --run
cd ..
```

Expected: existing 10 tests still pass.

- [ ] **Step 3: Verify dev server still serves ListView**

Start `npm run dev`, open `http://localhost:5173`, confirm "商品一覧" with two items renders (the `two_items` scenario is the default in `currentListItemsScenario`).

- [ ] **Step 4: Commit**

```powershell
git add frontend/src/mocks/handlers.ts
git commit -m "feat(mocks): prepend generated handlers so OpenAPI examples drive runtime mocks"
```

---

### Task 25: Replace smoke spec with fixture-driven E2E flow

**Files:**
- Delete: `frontend/tests/e2e/specs/test.cy.ts`
- Create: `frontend/tests/e2e/specs/items-flow.cy.ts`

- [ ] **Step 1: Delete the smoke spec**

```powershell
git rm frontend/tests/e2e/specs/test.cy.ts
```

- [ ] **Step 2: Create the new spec**

`frontend/tests/e2e/specs/items-flow.cy.ts`:

```ts
describe('items: list view backed by OpenAPI examples fixture', () => {
  it('renders all items from the fixture', () => {
    cy.fixture<{ id: number; name: string; price: number }[]>('listItems.json').then((items) => {
      cy.visit('/')
      cy.contains('商品一覧').should('be.visible')
      cy.get('ion-item').should('have.length', items.length)
      cy.contains('ion-item', items[0].name).should('be.visible')
      cy.contains('ion-item', `¥${items[0].price}`).should('be.visible')
    })
  })

  it('navigates from list to detail (first item)', () => {
    cy.fixture<{ id: number; name: string }[]>('listItems.json').then((items) => {
      cy.visit('/')
      cy.contains('ion-item', items[0].name).click()
      // DetailView shows the same name
      cy.contains(items[0].name).should('be.visible')
    })
  })
})
```

> The fixture is the same JSON the runtime MSW mock returns by default, so the UI assertions must hold without any per-test scenario switching.

- [ ] **Step 3: Run Cypress (with dev server up in another terminal)**

```powershell
cd frontend
npm run test:e2e
cd ..
```

Expected: 1 spec, 2 passing tests. Report files refresh under `tests/e2e/reports/`.

- [ ] **Step 4: Commit**

```powershell
git add frontend/tests/e2e/specs/items-flow.cy.ts
git commit -m "test(e2e): replace scaffold smoke with fixture-driven items flow (uses generated JSON)"
```

---

## Phase 2 — Markdown decision tables → `it.each` (Tasks 26–42)

### Task 26: Add `gray-matter` for frontmatter parsing

**Files:**
- Modify: `frontend/package.json` (via npm install)

- [ ] **Step 1: Install**

```powershell
cd frontend
npm install --save-dev gray-matter@^4.0.3
cd ..
```

- [ ] **Step 2: Commit**

```powershell
git add frontend/package.json frontend/package-lock.json
git commit -m "chore(frontend): add gray-matter for parsing case-spec frontmatter"
```

---

### Task 27: Author the first decision table

**Files:**
- Create: `docs/specs/cases/useDemoSdk.init.md`

- [ ] **Step 1: Create the file**

```markdown
---
target: composables/useDemoSdk#init
generator: vitest-cases
out:
  ts: frontend/src/composables/__tests__/useDemoSdk.init.cases.generated.ts
---

# useDemoSdk.init 決定表

| case_id | input.apiKey | mock.init               | expect.initialized | expect.lastError.code |
|---------|--------------|-------------------------|--------------------|------------------------|
| C1      | "valid"      | resolves {"ok":true}    | true               | null                   |
| C2      | ""           | rejects E_INVALID_KEY   | false              | E_INVALID_KEY          |
| C3      | "expired"    | rejects E_EXPIRED       | false              | E_EXPIRED              |
```

- [ ] **Step 2: Commit**

```powershell
git add docs/specs/cases/useDemoSdk.init.md
git commit -m "docs(cases): add useDemoSdk.init decision table (3 scenarios)"
```

---

### Task 28: Create gen-cases stub + failing test for `parseSpec`

**Files:**
- Create: `frontend/scripts/gen-cases/lib.ts` (empty stub)
- Create: `frontend/scripts/gen-cases/lib.test.ts`

- [ ] **Step 1: Stub**

`frontend/scripts/gen-cases/lib.ts`:

```ts
export {}
```

- [ ] **Step 2: Failing test**

`frontend/scripts/gen-cases/lib.test.ts`:

```ts
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
```

- [ ] **Step 3: Run and verify FAIL.**

```powershell
cd frontend
npm run test:unit -- --run scripts/gen-cases/lib.test.ts
cd ..
```

- [ ] **Step 4: No commit.**

---

### Task 29: Implement `parseSpec`

**Files:**
- Modify: `frontend/scripts/gen-cases/lib.ts`

- [ ] **Step 1: Implement**

```ts
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
```

- [ ] **Step 2: Run test and verify PASS.**

- [ ] **Step 3: No commit.**

---

### Task 30: Failing test for `parseMockExpr`

**Files:**
- Modify: `frontend/scripts/gen-cases/lib.test.ts`

- [ ] **Step 1: Append**

```ts
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
```

- [ ] **Step 2: Run and verify FAIL.**

- [ ] **Step 3: No commit.**

---

### Task 31: Implement `parseMockExpr`

**Files:**
- Modify: `frontend/scripts/gen-cases/lib.ts`

- [ ] **Step 1: Append**

```ts
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
```

- [ ] **Step 2: Run tests and verify PASS.**

- [ ] **Step 3: No commit.**

---

### Task 32: Failing test for `parseCellValue` (primitive coercion)

**Files:**
- Modify: `frontend/scripts/gen-cases/lib.test.ts`

- [ ] **Step 1: Append**

```ts
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
```

- [ ] **Step 2: Run and verify FAIL.**

- [ ] **Step 3: No commit.**

---

### Task 33: Implement `parseCellValue`

**Files:**
- Modify: `frontend/scripts/gen-cases/lib.ts`

- [ ] **Step 1: Append**

```ts
export function parseCellValue(raw: string): unknown {
  const t = raw.trim()
  try { return JSON.parse(t) } catch { return t }
}
```

- [ ] **Step 2: Run tests and verify PASS.**

- [ ] **Step 3: No commit.**

---

### Task 34: Failing test for `buildCases` (turn rows into nested case objects)

**Files:**
- Modify: `frontend/scripts/gen-cases/lib.test.ts`

- [ ] **Step 1: Append**

```ts
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
```

- [ ] **Step 2: Run and verify FAIL.**

- [ ] **Step 3: No commit.**

---

### Task 35: Implement `buildCases`

**Files:**
- Modify: `frontend/scripts/gen-cases/lib.ts`

- [ ] **Step 1: Append**

```ts
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
```

- [ ] **Step 2: Run tests and verify PASS.**

- [ ] **Step 3: Commit gen-cases lib + tests**

```powershell
git add frontend/scripts/gen-cases
git commit -m "feat(gen): add gen-cases lib (parseSpec, parseMockExpr, parseCellValue, buildCases + tests)"
```

---

### Task 36: Failing test for `renderVitestCasesTs`

**Files:**
- Modify: `frontend/scripts/gen-cases/lib.test.ts`

- [ ] **Step 1: Append**

```ts
import { renderVitestCasesTs } from './lib'

describe('renderVitestCasesTs', () => {
  it('emits a typed array literal named after the target', () => {
    const ts = renderVitestCasesTs('composables/useDemoSdk#init', [
      { id: 'C1', input: { apiKey: 'valid' } } as any
    ])
    expect(ts).toContain('// AUTO-GENERATED – do not edit')
    expect(ts).toContain('export const useDemoSdkInitCases =')
    expect(ts).toContain('"id": "C1"')
  })
})
```

- [ ] **Step 2: Run and verify FAIL.**

- [ ] **Step 3: No commit.**

---

### Task 37: Implement `renderVitestCasesTs`

**Files:**
- Modify: `frontend/scripts/gen-cases/lib.ts`

- [ ] **Step 1: Append**

```ts
function targetToConst(target: string): string {
  // composables/useDemoSdk#init -> useDemoSdkInitCases
  const m = /([A-Za-z0-9_]+)#([A-Za-z0-9_]+)$/.exec(target)
  if (!m) throw new Error(`cannot derive const name from target: ${target}`)
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  return m[1] + cap(m[2]) + 'Cases'
}

const AUTO_HEADER_C = '// AUTO-GENERATED – do not edit'

export function renderVitestCasesTs(target: string, cases: BuiltCase[]): string {
  const name = targetToConst(target)
  return `${AUTO_HEADER_C}
// source target: ${target}
export const ${name} = ${JSON.stringify(cases, null, 2)} as const
export type ${name[0].toUpperCase() + name.slice(1).replace(/Cases$/, 'Case')} = (typeof ${name})[number]
`
}
```

- [ ] **Step 2: Run tests and verify PASS.**

- [ ] **Step 3: No commit.**

---

### Task 38: Add gen-cases CLI

**Files:**
- Create: `frontend/scripts/gen-cases/cli.ts`

- [ ] **Step 1: Create**

```ts
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
```

- [ ] **Step 2: Commit**

```powershell
git add frontend/scripts/gen-cases/cli.ts
git commit -m "feat(gen): add gen-cases CLI that emits Vitest case arrays from MD decision tables"
```

---

### Task 39: Wire `gen:cases` npm script and run it

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: Add the script**

In `frontend/package.json`'s `scripts`, after `"gen:fixtures": "..."` add:

```json
    "gen:cases": "tsx scripts/gen-cases/cli.ts"
```

- [ ] **Step 2: Run it**

```powershell
cd frontend
npm run gen:cases
cd ..
```

Expected stdout: `[gen-cases] useDemoSdk.init.md → .../useDemoSdk.init.cases.generated.ts`

The file now exists at `frontend/src/composables/__tests__/useDemoSdk.init.cases.generated.ts`:

```ts
// AUTO-GENERATED – do not edit
// source target: composables/useDemoSdk#init
export const useDemoSdkInitCases = [
  { "id": "C1", "input": { "apiKey": "valid" }, "mock": { "init": { "kind": "resolves", "value": { "ok": true } } }, "expect": { "initialized": true, "lastError": { "code": null } } },
  ...
] as const
export type UseDemoSdkInitCase = (typeof useDemoSdkInitCases)[number]
```

- [ ] **Step 3: Commit**

```powershell
git add frontend/package.json frontend/src/composables/__tests__/useDemoSdk.init.cases.generated.ts
git commit -m "feat(gen): wire gen:cases script and commit useDemoSdk.init.cases.generated.ts"
```

---

### Task 40: Add the cases-driven `useDemoSdk.init.spec.ts`

**Files:**
- Create: `frontend/src/composables/__tests__/useDemoSdk.init.spec.ts`

- [ ] **Step 1: Create the spec**

```ts
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useDemoSdkInitCases, type UseDemoSdkInitCase } from './useDemoSdk.init.cases.generated'

const initMock = vi.hoisted(() => vi.fn())

vi.mock('@/native/demo-sdk-bridge', () => ({
  DEMO_SDK_EVENTS: { countChange: 'countChange' } as const,
  DemoSdkBridge: {
    init: initMock,
    getDeviceInfo: vi.fn(),
    echo: vi.fn(),
    performAction: vi.fn(),
    startCounter: vi.fn(),
    stopCounter: vi.fn(),
    triggerError: vi.fn(),
    addListener: vi.fn().mockResolvedValue({ remove: vi.fn() }),
  },
}))

import { useDemoSdk } from '../useDemoSdk'

beforeEach(() => { initMock.mockReset() })

describe('useDemoSdk.init (cases-driven, from useDemoSdk.init.md)', () => {
  it.each(useDemoSdkInitCases as readonly UseDemoSdkInitCase[])('$id', async (c) => {
    /* Arrange */
    const m = (c as any).mock.init as { kind: 'resolves' | 'rejects'; value?: unknown; code?: string }
    if (m.kind === 'resolves') {
      initMock.mockResolvedValueOnce(m.value)
    } else {
      const err = Object.assign(new Error(m.code!), { code: m.code })
      initMock.mockRejectedValueOnce(err)
    }
    let api!: ReturnType<typeof useDemoSdk>
    const Comp = defineComponent({ setup() { api = useDemoSdk(); return () => h('div') } })
    mount(Comp)

    /* Act */
    await api.init((c as any).input.apiKey)

    /* Assert */
    const exp = (c as any).expect as { initialized: boolean; lastError: { code: string | null } }
    expect(api.initialized.value).toBe(exp.initialized)
    if (exp.lastError.code === null) {
      expect(api.lastError.value).toBeNull()
    } else {
      expect(api.lastError.value?.code).toBe(exp.lastError.code)
    }
  })
})
```

> The `as any` casts are deliberate and minimal: the generated `as const` literal is fully typed but reading nested unions out of a constant tuple in a generic test makes the types unergonomic. Cast at the boundary, keep assertions strict.

- [ ] **Step 2: Run all unit tests**

```powershell
cd frontend
npm run test:unit -- --run
cd ..
```

Expected: existing 10 tests pass + 3 new `useDemoSdk.init (cases-driven) > C1/C2/C3` tests pass. Total 13.

- [ ] **Step 3: Commit**

```powershell
git add frontend/src/composables/__tests__/useDemoSdk.init.spec.ts
git commit -m "test(composables): add cases-driven useDemoSdk.init spec (it.each from MD-generated cases)"
```

---

### Task 41: Update the spec doc to reflect the script location deviation

**Files:**
- Modify: `docs/superpowers/specs/2026-05-20-test-strategy-design.md`

- [ ] **Step 1: Edit §6.1 directory tree**

Replace:

```
├─ scripts/
│   ├─ gen-fixtures.ts                         # OpenAPI → fixtures
│   └─ gen-cases.ts                            # MD → it.each + JUnit JSON
```

with:

```
├─ scripts/                                    # repo-root .cmd orchestration (existing)
└─ frontend/scripts/                           # TS generators live with the FE toolchain
    ├─ gen-fixtures/{lib,cli}.ts               # OpenAPI → fixtures
    └─ gen-cases/{lib,cli}.ts                  # MD → it.each (JUnit JSON branch lands in P5)
```

Also update §3.4 table — change the "起動" column for both rows to make clear the scripts live under `frontend/scripts/`:

In §3.4, replace the two existing rows with:

```
| `frontend/scripts/gen-fixtures/cli.ts` | `openapi/openapi.yaml` | `frontend/src/mocks/generated/*` + `frontend/tests/e2e/fixtures/*` | `npm run gen:fixtures` |
| `frontend/scripts/gen-cases/cli.ts`    | `docs/specs/cases/*.md` | `**/*.cases.generated.ts` (+ `demo-sdk/.../resources/cases/*.json` in P5) | `npm run gen:cases` |
```

- [ ] **Step 2: Commit**

```powershell
git add docs/superpowers/specs/2026-05-20-test-strategy-design.md
git commit -m "docs(test-strategy): reflect actual generator script location (frontend/scripts/*)"
```

---

### Task 42: Phase 1 + 2 acceptance check

**Files:** none

- [ ] **Step 1: Verify against spec §6.2**

Walk through and confirm:

P1 acceptance: "`npm run gen:fixtures` 冪等。fixture を使った Cypress 1 spec が通る"

- Run `npm run gen:fixtures` twice; diff via `git status` shows no changes the second time. ✓
- `npm run test:e2e` passes the `items-flow.cy.ts` spec. ✓

P2 acceptance: "MD → `*.cases.generated.ts` → Vitest `it.each` が通る。元の手書き spec を比較として残す"

- `useDemoSdk.init.cases.generated.ts` exists and is auto-generated. ✓
- `useDemoSdk.init.spec.ts` runs via `it.each` and passes. ✓
- Original `useDemoSdk.spec.ts` is **still present and still passing**, serving as the hand-written comparison. ✓

- [ ] **Step 2: Final summary commit (optional, only if any small fixes were needed)**

If any of the above checks needed adjustments to earlier work, commit them. Otherwise skip.

---

## End-of-plan checklist

- [ ] `frontend/.vscode/{extensions,launch,tasks}.json` exist and are tracked
- [ ] `npm run test:unit -- --run` from `frontend/` passes 13 tests, emits HTML + JUnit
- [ ] `npm run test:e2e` (with dev server up) passes 2 tests, emits mochawesome HTML + JUnit
- [ ] `npm run gen:fixtures` is idempotent, generated files committed
- [ ] `npm run gen:cases` is idempotent, generated files committed
- [ ] Original `useDemoSdk.spec.ts` still present (comparison sample)
- [ ] Spec doc updated to match actual layout

## What is intentionally NOT in this plan

- P3 component-level tests for views (`views/__tests__/`)
- P4 Android SDK Gradle setup in VSCode
- P5 Android instrumented Espresso sample
- P6 comparison samples (Playwright / Testing Library / Capacitor mock)
- P7 plop scaffolds
- P8 CI workflow

These are independent plans to be written next, each starting from the artifacts produced by this one.
