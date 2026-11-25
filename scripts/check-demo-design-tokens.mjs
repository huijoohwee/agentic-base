import { readFile, readdir } from 'node:fs/promises'

const [css, html, manifestSource, serviceWorker] = await Promise.all([
  readFile(new URL('../demo/styles.css', import.meta.url), 'utf8'),
  readFile(new URL('../demo/index.html', import.meta.url), 'utf8'),
  readFile(new URL('../demo/manifest.webmanifest', import.meta.url), 'utf8'),
  readFile(new URL('../sw.js', import.meta.url), 'utf8'),
])
const manifest = JSON.parse(manifestSource)
const failures = []
const require = (condition, message) => { if (!condition) failures.push(message) }

for (const [pattern, message] of [
  [/--(?:ink|border|surface|muted|accent)\s*:/u, 'demo defines a competing local color token'],
  [/--agentic-[a-z0-9-]+\s*:/u, 'demo redeclares a Design System token'],
  [/#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})\b/iu, 'demo contains a literal color value'],
  [/\b(?:rgb|hsl|oklch)\s*\(/iu, 'demo contains a literal color function'],
]) require(!pattern.test(css), message)

for (const [, value] of css.matchAll(/(?:font-size|border-radius)\s*:\s*([^;\s]+)/gu)) {
  require(value.startsWith('var('), 'demo defines a local font-size or radius variant')
}

for (const token of [
  '--agentic-base-text-primary', '--agentic-base-text-secondary', '--agentic-base-border',
  '--agentic-dashboard-primary', '--agentic-dashboard-card-gap', '--agentic-dashboard-max-width',
  '--agentic-control-height', '--agentic-control-radius', '--agentic-control-focus-width',
]) require(css.includes(`var(${token}`), `demo does not consume ${token}`)

require(html.includes('<body data-agentic-typography') && html.includes('view-picker-label agentic-fact-label'), 'demo must consume shared body and fact label typography')
require(!/\b(?:font(?:-size|-family)?|line-height)\s*:/u.test(css.match(/:root\s*\{([^}]*)/u)?.[1] ?? ''), 'root font sizing would rescale the shared rem tokens')
const viewSheet = html.match(/href="(\/demo\/browser-data-view\.css\?v=\d+)"/u)?.[1]
require(viewSheet && serviceWorker.includes(viewSheet), 'shared offline projection stylesheet is not loaded')
require(html.includes('class="shell agentic-dashboard-layout"'), 'demo shell does not use the shared dashboard layout')
require((html.match(/class="panel agentic-dashboard-card"/gu) ?? []).length >= 3, 'demo panels do not use the shared dashboard card')
require(!Object.hasOwn(manifest, 'background_color') && !Object.hasOwn(manifest, 'theme_color'), 'PWA manifest duplicates shell colors')

const styleVersion = html.match(/styles\.css\?v=(\d+)/u)?.[1]
require(styleVersion !== undefined && serviceWorker.includes(`/demo/styles.css?v=${styleVersion}`), 'offline cache does not precache the current shared-token stylesheet')
require(/const CACHE = 'agentic-base-app-v\d+';/u.test(serviceWorker), 'offline cache name is not versioned')

require(html.includes('<meta name="color-scheme" content="light dark">'), 'demo must declare the shared light dark color-scheme')
require(!/color-scheme\s*:/u.test(css), 'demo must not pin a local color-scheme')

const srcRoot = new URL('../packages/views-react/src/', import.meta.url)
const pinnedProjections = new Set([
  'browser/base-profile.css', 'browser/shared-ui-profile.css', 'controls/toolbar.css', 'panels/floatingPanelShell.css',
])
const cssInventory = async (directory, prefix = '') => {
  const rows = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) rows.push(...await cssInventory(new URL(`${entry.name}/`, directory), rel))
    else if (entry.isFile() && entry.name.endsWith('.css')) rows.push(rel)
  }
  return rows
}
for (const rel of await cssInventory(srcRoot)) {
  if (pinnedProjections.has(rel)) continue
  const source = await readFile(new URL(rel, srcRoot), 'utf8')
  if (/#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})\b/iu.test(source)) failures.push(`${rel} contains a literal color value`)
  if (/\b(?:rgb|hsl|oklch)\s*\(/iu.test(source)) failures.push(`${rel} contains a literal color function`)
}

if (failures.length) throw new Error(`Demo design token check failed:\n- ${failures.join('\n- ')}`)
console.log('PASS demo design token check · the shell and view sources use shared dashboard/control tokens and have no local color or token overrides.')
