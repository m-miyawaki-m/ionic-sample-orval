/**
 * scripts/_build-html.js
 *
 * Reads openapi/openapi.yaml and renders static HTML for offline viewing.
 *   - "redoc"    : single self-contained HTML produced by @redocly/cli build-docs
 *   - "swagger"  : Swagger UI HTML with assets copied to docs/vendor/swagger-ui
 *   - "elements" : Stoplight Elements HTML with assets copied to docs/vendor/stoplight-elements
 *   - "all"      : all three
 *
 * All dependencies (@redocly/cli, swagger-ui-dist, @stoplight/elements) are
 * resolved from frontend/node_modules, so this script works fully offline
 * once `cd frontend && npm install` has been run once.
 *
 * Usage (called from .cmd wrappers):
 *   node scripts/_build-html.js redoc
 *   node scripts/_build-html.js swagger
 *   node scripts/_build-html.js elements
 *   node scripts/_build-html.js all
 */

'use strict'

const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const YAML_PATH = path.join(ROOT, 'openapi', 'openapi.yaml')
const DOCS_DIR = path.join(ROOT, 'docs')
const VENDOR_DIR = path.join(DOCS_DIR, 'vendor')
const FRONTEND_DIR = path.join(ROOT, 'frontend')
const RESOLVE_PATHS = [FRONTEND_DIR]

function resolvePkgDir (pkgName) {
  // Some packages (e.g. @stoplight/elements) restrict `exports` so
  // require.resolve(`<pkg>/package.json`) fails. Fall back to walking
  // candidate node_modules directories directly.
  try {
    const pkgJson = require.resolve(`${pkgName}/package.json`, { paths: RESOLVE_PATHS })
    return path.dirname(pkgJson)
  } catch (_) {
    // fall through
  }
  for (const base of RESOLVE_PATHS) {
    const candidate = path.join(base, 'node_modules', ...pkgName.split('/'))
    if (fs.existsSync(path.join(candidate, 'package.json'))) return candidate
  }
  throw new Error(
    `Package "${pkgName}" not found under frontend/node_modules. ` +
    `Run \`cd frontend && npm install\` first.`
  )
}

function resolveBin (pkgName, binName) {
  const pkgDir = resolvePkgDir(pkgName)
  const pkg = JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf-8'))
  let rel
  if (typeof pkg.bin === 'string') rel = pkg.bin
  else if (pkg.bin && binName && pkg.bin[binName]) rel = pkg.bin[binName]
  else {
    const keys = Object.keys(pkg.bin || {})
    if (keys.length === 1) rel = pkg.bin[keys[0]]
    else throw new Error(`Cannot locate bin "${binName}" in ${pkgName}`)
  }
  return path.join(pkgDir, rel)
}

function ensureDir (dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function copyAssets (pkgName, files, destSubdir) {
  const src = resolvePkgDir(pkgName)
  const dest = path.join(VENDOR_DIR, destSubdir)
  ensureDir(dest)
  for (const f of files) {
    const srcFile = path.join(src, f)
    if (!fs.existsSync(srcFile)) {
      throw new Error(`Expected asset missing: ${srcFile}`)
    }
    fs.copyFileSync(srcFile, path.join(dest, path.basename(f)))
  }
  return path.relative(DOCS_DIR, dest).split(path.sep).join('/')
}

function loadSpecAsJson () {
  process.stderr.write('Bundling openapi.yaml -> JSON via local @redocly/cli ...\n')
  const cli = resolveBin('@redocly/cli', 'redocly')
  const json = execFileSync(
    process.execPath,
    [cli, 'bundle', YAML_PATH, '--ext', 'json'],
    { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'inherit'] }
  ).trim()
  JSON.parse(json) // validate
  return json
}

function writeHtml (filename, html) {
  ensureDir(DOCS_DIR)
  const out = path.join(DOCS_DIR, filename)
  fs.writeFileSync(out, html, 'utf-8')
  const sizeKiB = (Buffer.byteLength(html, 'utf-8') / 1024).toFixed(1)
  console.log(`Wrote ${out} (${sizeKiB} KiB)`)
}

function buildRedoc (json) {
  const vendorRel = copyAssets(
    'redoc',
    [path.join('bundles', 'redoc.standalone.js')],
    'redoc'
  )
  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Ionic Sample API - Redoc</title>
  <style>body { margin: 0; padding: 0; }</style>
</head>
<body>
  <div id="redoc-container"></div>
  <script src="${vendorRel}/redoc.standalone.js"></script>
  <script>
    Redoc.init(${json}, {}, document.getElementById('redoc-container'))
  </script>
</body>
</html>
`
  writeHtml('api-reference.html', html)
}

function buildSwaggerUi (json) {
  const vendorRel = copyAssets(
    'swagger-ui-dist',
    ['swagger-ui.css', 'swagger-ui-bundle.js', 'swagger-ui-standalone-preset.js'],
    'swagger-ui'
  )
  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Ionic Sample API - Swagger UI</title>
  <link rel="stylesheet" href="${vendorRel}/swagger-ui.css" />
  <style>html, body { margin: 0; padding: 0; }</style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="${vendorRel}/swagger-ui-bundle.js" charset="UTF-8"></script>
  <script src="${vendorRel}/swagger-ui-standalone-preset.js" charset="UTF-8"></script>
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
  const vendorRel = copyAssets(
    '@stoplight/elements',
    ['web-components.min.js', 'styles.min.css'],
    'stoplight-elements'
  )
  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Ionic Sample API - Stoplight Elements</title>
  <script src="${vendorRel}/web-components.min.js"></script>
  <link rel="stylesheet" href="${vendorRel}/styles.min.css" />
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
    console.error('Usage: node scripts/_build-html.js [redoc|swagger|elements|all]')
    process.exit(1)
  }
  if (target === 'redoc') {
    buildRedoc(loadSpecAsJson())
    return
  }
  if (target === 'all') {
    const json = loadSpecAsJson()
    buildRedoc(json)
    buildSwaggerUi(json)
    buildElements(json)
    return
  }
  if (target === 'swagger') {
    buildSwaggerUi(loadSpecAsJson())
    return
  }
  if (target === 'elements') {
    buildElements(loadSpecAsJson())
    return
  }
  console.error(`Unknown target: ${target}`)
  process.exit(1)
}

main()
