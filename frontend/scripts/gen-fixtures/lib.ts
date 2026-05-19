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
  const parts = path.split('/').filter(Boolean)
  let id = method
  for (const part of parts) {
    const paramMatch = /^\{(.+)\}$/.exec(part)
    if (paramMatch) {
      const name = paramMatch[1]
      id += 'By' + name.charAt(0).toUpperCase() + name.slice(1)
    } else {
      id += part.charAt(0).toUpperCase() + part.slice(1)
    }
  }
  return id
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

export function renderE2EFixtureJson(op: OperationScenarios, defaultKey: string): string {
  const chosen = op.scenarios.find(s => s.key === defaultKey) ?? op.scenarios[0]
  return JSON.stringify(chosen.body, null, 2) + '\n'
}

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
