/**
 * scripts/_build-html.js
 *
 * Reads openapi/openapi.yaml, bundles it to JSON via @redocly/cli,
 * and inlines that JSON into a static HTML template for either
 * Swagger UI or Stoplight Elements.
 *
 * Usage (called from .cmd wrappers):
 *   node scripts/_build-html.js swagger
 *   node scripts/_build-html.js elements
 *   node scripts/_build-html.js all
 */

'use strict'

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const YAML_PATH = path.join(ROOT, 'openapi', 'openapi.yaml')
const DOCS_DIR = path.join(ROOT, 'docs')

function loadSpecAsJson () {
  process.stderr.write('Bundling openapi.yaml -> JSON via @redocly/cli ...\n')
  const json = execSync(
    `npx -y @redocly/cli@^1 bundle "${YAML_PATH}" --ext json`,
    { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'inherit'] }
  ).trim()
  JSON.parse(json) // validate
  return json
}

function writeHtml (filename, html) {
  if (!fs.existsSync(DOCS_DIR)) fs.mkdirSync(DOCS_DIR, { recursive: true })
  const out = path.join(DOCS_DIR, filename)
  fs.writeFileSync(out, html, 'utf-8')
  const sizeKiB = (Buffer.byteLength(html, 'utf-8') / 1024).toFixed(1)
  console.log(`Wrote ${out} (${sizeKiB} KiB)`)
}

function buildSwaggerUi (json) {
  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Ionic Sample API - Swagger UI</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <style>html, body { margin: 0; padding: 0; }</style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js" charset="UTF-8"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js" charset="UTF-8"></script>
  <script>
    window.onload = function () {
      window.ui = SwaggerUIBundle({
        spec: ${json},
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        layout: 'StandaloneLayout'
      })
    }
  </script>
</body>
</html>
`
  writeHtml('api-reference-swagger.html', html)
}

function buildElements (json) {
  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Ionic Sample API - Stoplight Elements</title>
  <script src="https://unpkg.com/@stoplight/elements/web-components.min.js"></script>
  <link rel="stylesheet" href="https://unpkg.com/@stoplight/elements/styles.min.css" />
  <style>
    html, body { margin: 0; padding: 0; height: 100%; }
    elements-api { display: block; height: 100vh; }
  </style>
</head>
<body>
  <elements-api id="api" router="hash" layout="sidebar"></elements-api>
  <script>
    document.getElementById('api').apiDescriptionDocument = ${json};
  </script>
</body>
</html>
`
  writeHtml('api-reference-elements.html', html)
}

function main () {
  const target = process.argv[2]
  if (!target) {
    console.error('Usage: node scripts/_build-html.js [swagger|elements|all]')
    process.exit(1)
  }
  const json = loadSpecAsJson()
  if (target === 'swagger') buildSwaggerUi(json)
  else if (target === 'elements') buildElements(json)
  else if (target === 'all') { buildSwaggerUi(json); buildElements(json) }
  else {
    console.error(`Unknown target: ${target}`)
    process.exit(1)
  }
}

main()
