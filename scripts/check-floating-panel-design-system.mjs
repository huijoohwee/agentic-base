import { createHash } from 'node:crypto'
import { access, readdir, readFile } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sourceRoot = join(root, 'packages/views-react/src')
const designSystemRoot = join(root, 'node_modules/agentic-design-system')
const panelPath = 'packages/views-react/src/panels/floatingPanelShell.css'
const tokenPath = 'packages/views-react/src/browser/shared-ui-profile.css'
const tokenPinPath = 'packages/views-react/src/browser/shared-ui-profile.pin.json'
const toolbarCssPath = 'packages/views-react/src/controls/toolbar.css'
const iconPath = 'packages/views-react/src/controls/icons.json'
const iconPinPath = 'packages/views-react/src/controls/icons.pin.json'
const fail = message => { throw new Error(`FloatingPanel Design System check failed: ${message}`) }
const digest = bytes => createHash('sha256').update(bytes).digest('hex')
const sameBytes = (left, right) => Buffer.compare(left, right) === 0
const read = path => readFile(join(root, path))

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

const packageJson = JSON.parse(await read('package.json'))
const lock = JSON.parse(await read('package-lock.json'))
const designSystemSpec = packageJson.devDependencies?.['agentic-design-system']
const designSystemCommit = String(designSystemSpec ?? '').match(/#([a-f0-9]{40})$/u)?.[1]
const lockedDesignSystem = lock.packages?.['node_modules/agentic-design-system']
if (!designSystemCommit || !lockedDesignSystem?.resolved?.endsWith(`#${designSystemCommit}`)
  || packageJson.exports?.['./panels']
  || packageJson.exports?.['./panel-controls']) {
  fail('Base must pin Design System directly to one exact Git commit and expose no local panel package entry')
}

const panelPin = JSON.parse(await read('packages/views-react/src/panels/floatingPanelShell.pin.json'))
const toolbarPin = JSON.parse(await read('packages/views-react/src/controls/toolbar.pin.json'))
const iconPin = JSON.parse(await read(iconPinPath))
const tokenPin = JSON.parse(await read(tokenPinPath))
const centralPanelCss = await readFile(join(designSystemRoot, 'site/floating-panel.css'))
const centralToolbarCss = await readFile(join(designSystemRoot, 'site/toolbar.css'))
const centralToolbarRuntime = await readFile(join(designSystemRoot, 'site/toolbar-icons.js'))
const centralIcons = await readFile(join(designSystemRoot, 'site/icons.json'))
const centralSharedTokens = await readFile(join(designSystemRoot, 'site/vendor/shared-ui-profile.css'))
const panelCss = await read(panelPath)
const toolbarCss = await read(toolbarCssPath)
const icons = await read(iconPath)
const sharedTokens = await read(tokenPath)

if (panelPin.owner !== 'github.com/huijoohwee/agentic-design-system'
  || panelPin.path !== 'site/floating-panel.css'
  || panelPin.revision !== designSystemCommit
  || panelPin.sha256 !== digest(centralPanelCss)
  || !sameBytes(panelCss, centralPanelCss)) {
  fail('the retained panel CSS projection must exactly match the direct Design System pin')
}
if (toolbarPin.owner !== 'github.com/huijoohwee/agentic-design-system'
  || toolbarPin.path !== 'site/toolbar.css'
  || toolbarPin.revision !== designSystemCommit
  || toolbarPin.sha256 !== digest(centralToolbarCss)
  || toolbarPin.runtimePath !== 'site/toolbar-icons.js'
  || toolbarPin.iconsSha256 !== digest(centralToolbarRuntime)
  || !sameBytes(toolbarCss, centralToolbarCss)) {
  fail('the retained toolbar CSS projection must exactly match the direct Design System pin')
}
if (iconPin.schema !== 'agentic-design-system/icon-library-pin/v1'
  || iconPin.owner !== 'github.com/huijoohwee/agentic-design-system'
  || iconPin.path !== 'site/icons.json'
  || iconPin.revision !== designSystemCommit
  || iconPin.sha256 !== digest(centralIcons)
  || !sameBytes(icons, centralIcons)) {
  fail('the icon glyph projection must exactly match the direct Design System pin')
}
if (tokenPin.schema !== 'agentic-design-system/consumer-pin/v1'
  || tokenPin.profile?.owner !== 'github.com/huijoohwee/agentic-design-system'
  || tokenPin.profile?.id !== 'shared-ui'
  || tokenPin.profile?.registryRevision !== designSystemCommit
  || tokenPin.profile?.projectionPath !== 'site/vendor/shared-ui-profile.css'
  || tokenPin.profile?.projectionSha256 !== `sha256:${digest(centralSharedTokens)}`
  || !sameBytes(sharedTokens, centralSharedTokens)) {
  fail('the shared token projection must exactly match the direct Design System pin')
}

const controlIndex = (await read('packages/views-react/src/controls/index.ts')).toString('utf8')
const panelDemo = (await read('packages/views-react/dev/main.tsx')).toString('utf8')
const iconRuntime = await read('packages/views-react/src/controls/toolbar-icons.js')
const menuRuntime = (await read('packages/views-react/src/controls/dropdownMenu.ts')).toString('utf8')
const reactPanelIndex = (await readFile(join(designSystemRoot, 'packages/react-panels/src/index.ts'))).toString('utf8')
const removedAdapters = [
  'packages/views-react/src/panels/FloatingPanelShell.tsx',
  'packages/views-react/src/panels/FloatingPanelCloseButton.tsx',
  'packages/views-react/src/panels/FloatingPanelTabs.tsx',
  'packages/views-react/src/panels/floatingPanelContract.d.ts',
  'packages/views-react/src/controls/PanelControlButton.tsx',
  'packages/views-react/src/controls/PanelControlGroup.tsx',
]
for (const path of removedAdapters) {
  try { await access(join(root, path)); fail(`duplicate or forwarding adapter remains: ${path}`) } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }
}
if (/PanelControl(Button|Group|Name)|PANEL_CONTROL_DEFINITIONS/u.test(controlIndex)
  || /PanelControlName|PANEL_CONTROL_DEFINITIONS/u.test(menuRuntime)
  || !sameBytes(iconRuntime, centralToolbarRuntime)
  || !panelDemo.includes("from 'agentic-design-system/react/panels'")
  || !reactPanelIndex.includes("export { FloatingPanelShell }")
  || !reactPanelIndex.includes("export { PanelControlButton }")
  || !reactPanelIndex.includes("export { PanelControlGroup }")) {
  fail('Base must consume the canonical React panel APIs directly and keep no local control map, adapter, or re-export')
}

const panelSelector = /\.agentic-(?:base-floating-panel(?:-[\w-]+)?|floating-panel-(?:tabs?|title|body|dock)|panel-(?:surface|main(?:--(?:open|collapsed))?(?:-dock)?|bottom(?:-dock)?|header|title|body)|editor-workspace(?:-[\w-]+)?)|\[data-agentic-base-floating-panel/iu
const panelToken = /--agentic-(?:panel-[\w-]+|floating-panel-(?:radius|layer|bottom-offset)|menu-edge-gap|row-height(?:-touch)?|control-height(?:-touch)?|control-(?:hover|selected)-(?:background|foreground)|control-focus-(?:width|offset))\s*:/u
const files = [...await cssFiles(sourceRoot), ...await cssFiles(join(root, 'demo'))]
if (files.length > 256) fail('CSS source inventory exceeds 256 files')
let totalBytes = 0
const violations = []
for (const file of files) {
  const path = relative(root, file).split('\\').join('/')
  const bytes = await readFile(file)
  totalBytes += bytes.length
  if (totalBytes > 1000000) fail('CSS source inventory exceeds 1 MB')
  const css = bytes.toString('utf8')
  if (![panelPath, toolbarCssPath].includes(path) && panelSelector.test(css)) violations.push(`${path}: local shared panel selector`)
  if (![panelPath, tokenPath].includes(path) && panelToken.test(css)) violations.push(`${path}: local shared panel token definition`)
}
if (violations.length) fail(violations.join('\n- '))
console.log(`PASS direct Design System panel consumer · ${designSystemCommit.slice(0, 9)} · ${files.length} CSS files scanned.`)
