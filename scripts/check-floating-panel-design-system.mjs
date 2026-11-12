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
const controlPath = 'packages/views-react/src/controls/PanelControlButton.tsx'
const groupPath = 'packages/views-react/src/controls/PanelControlGroup.tsx'
const runtimePath = 'packages/views-react/src/controls/toolbar-icons.js'
const closePath = 'packages/views-react/src/panels/FloatingPanelCloseButton.tsx'
const controlIconsPath = 'packages/views-react/src/controls/icons.json'
const panelSelector = /\.agentic-(?:base-floating-panel(?:-[\w-]+)?|floating-panel-(?:tabs?|title|body|dock)|panel-(?:surface|main(?:--(?:open|collapsed))?(?:-dock)?|bottom(?:-dock)?|header|title|body)|editor-workspace(?:-[\w-]+)?)|\[data-agentic-base-floating-panel/iu
const panelToken = /--agentic-(?:panel-[\w-]+|floating-panel-(?:radius|layer|bottom-offset)|menu-edge-gap|row-height(?:-touch)?|control-height(?:-touch)?|control-(?:hover|selected)-(?:background|foreground)|control-focus-(?:width|offset))\s*:/u
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
const toolbarPin = JSON.parse(await readFile(join(sourceRoot, 'controls/toolbar.pin.json'), 'utf8'))
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
if (toolbarPin.owner !== 'github.com/huijoohwee/agentic-design-system'
  || toolbarPin.runtimePath !== 'site/toolbar-icons.js'
  || !/^[a-f0-9]{64}$/u.test(toolbarPin.iconsSha256 ?? '')) {
  fail('the panel-control runtime must name the central owner, source path, and exact digest')
}

const controls = JSON.parse(await readFile(join(root, controlIconsPath), 'utf8'))
const controlButton = await readFile(join(root, controlPath), 'utf8')
const controlGroup = await readFile(join(root, groupPath), 'utf8')
const controlRuntime = await readFile(join(root, runtimePath), 'utf8')
const closeButton = await readFile(join(root, closePath), 'utf8')
const roleNames = ['search', 'pin', 'apply', 'reset', 'minimize', 'restore', 'close']
if (JSON.stringify(Object.keys(controls.panelControls ?? {}).sort()) !== JSON.stringify([...roleNames].sort())
  || digest(controlRuntime) !== toolbarPin.iconsSha256
  || !controlRuntime.toString('utf8').includes('export function resolvePanelControlRoles')
  || !controlRuntime.toString('utf8').includes('export function updatePanelControlGroup')
  || !controlRuntime.toString('utf8').includes("if (typeof actions[control] !== 'function') return false")
  || !controlRuntime.toString('utf8').includes('cache.get(currentRoles[index]) !== child')
  || !controlButton.includes('updatePanelControlButton(buttonRef.current, control')
  || controlButton.includes('PANEL_CONTROL_ICONS')
  || controlButton.includes('PANEL_CONTROL_LABELS')
  || !controlGroup.includes('updatePanelControlGroup(groupRef.current')
  || controlGroup.includes('PANEL_CONTROL_ORDER')
  || controlGroup.includes("control === 'minimize'")
  || controlGroup.includes("control === 'restore'")
  || !controlGroup.includes('className="agentic-panel-control-group"')
  || controlGroup.includes('className?: string')
  || !panelCss.toString('utf8').includes('.agentic-panel-control-group')
  || !panelCss.toString('utf8').includes('[data-agentic-floating-panel-avoid-bottom="true"]')
  || !panelCss.toString('utf8').includes('--agentic-floating-panel-available-height')
  || !await readFile(join(sourceRoot, 'panels/FloatingPanelShell.tsx'), 'utf8').then(source => source.includes('avoidBottomPanel') && source.includes('--agentic-floating-panel-available-height') && source.includes("'[data-agentic-panel-kind=\"bottom\"]'"))
  || !closeButton.includes('<PanelControlButton control="close"')
  || /export interface FloatingPanelCloseButtonProps\s*\{[^}]*\blabel\s*:/su.test(await readFile(join(sourceRoot, 'panels/floatingPanelContract.d.ts'), 'utf8'))) {
  fail('panel controls must use the canonical semantic role map, one shared order/visibility adapter, and reject per-consumer labels')
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
