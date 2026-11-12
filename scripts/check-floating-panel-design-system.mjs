import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sourceRoot = join(root, 'packages/views-react/src')
const demoRoot = join(root, 'demo')
const panelPath = 'packages/views-react/src/panels/floatingPanelShell.css'
const tokenPath = 'packages/views-react/src/browser/shared-ui-profile.css'
const pinPath = 'packages/views-react/src/panels/floatingPanelShell.pin.json'
const panelSelector = /\.agentic-(?:base-floating-panel(?:-[\w-]+)?|floating-panel-(?:tabs?|title|body|dock)|panel-(?:surface|main(?:--(?:open|collapsed))?(?:-dock)?|bottom(?:-dock)?|header|title|body)|editor-workspace(?:-[\w-]+)?)|\[data-agentic-base-floating-panel/iu
const panelToken = /--agentic-(?:panel-[\w-]+|floating-panel-(?:radius|layer|bottom-offset)|menu-edge-gap|row-height(?:-touch)?|control-height(?:-touch)?|control-selected-(?:foreground|background)|control-focus-(?:width|offset))\s*:/u
const fail = message => { throw new Error(`FloatingPanel Design System check failed: ${message}`) }
const digest = bytes => createHash('sha256').update(bytes).digest('hex')

async function cssFiles(directory) {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isSymbolicLink()) fail(`unexpected symbolic link under ${relative(root, directory)}`)
    if (entry.isDirectory()) files.push(...await cssFiles(path))
    else if (entry.isFile() && entry.name.endsWith('.css')) files.push(path)
  }
  return files
}

const pin = JSON.parse(await readFile(join(root, pinPath), 'utf8'))
if (pin.owner !== 'github.com/huijoohwee/agentic-design-system'
  || pin.path !== 'site/floating-panel.css'
  || !/^[a-f0-9]{40}$/u.test(pin.revision ?? '')
  || !/^[a-f0-9]{64}$/u.test(pin.sha256 ?? '')) {
  fail('consumer pin must name the central owner, exact revision, source path, and SHA-256 digest')
}

const panelCss = await readFile(join(root, panelPath))
if (panelCss.length >= 128000 || digest(panelCss) !== pin.sha256) {
  fail('the React adapter stylesheet must remain the byte-exact pinned Design System projection')
}

const files = [...await cssFiles(sourceRoot), ...await cssFiles(demoRoot)]
if (files.length > 256) fail('CSS source inventory exceeds 256 files')
let totalBytes = 0
const violations = []
for (const file of files) {
  const path = relative(root, file).split('\\').join('/')
  const bytes = await readFile(file)
  totalBytes += bytes.length
  if (totalBytes > 1000000) fail('CSS source inventory exceeds 1 MB')
  const css = bytes.toString('utf8')
  if (path !== panelPath && panelSelector.test(css)) violations.push(`${path}: local FloatingPanel shell selector`)
  if (path !== tokenPath && panelToken.test(css)) violations.push(`${path}: local shared panel token definition`)
}

if (violations.length) fail(violations.join('\n- '))
console.log(`PASS FloatingPanel Design System check · ${pin.owner}@${pin.revision.slice(0, 9)} · ${files.length} CSS files scanned.`)
