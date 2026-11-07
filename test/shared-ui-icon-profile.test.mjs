import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import test from 'node:test'

const source = new URL('../packages/views-react/src/browser/', import.meta.url)
const pin = JSON.parse(fs.readFileSync(new URL('shared-ui-profile.pin.json', source), 'utf8'))
const profileCss = fs.readFileSync(new URL('shared-ui-profile.css', source))
const viewCss = fs.readFileSync(new URL('browserDataView.css', source), 'utf8')
const artifactCss = fs.readFileSync(new URL('../packages/views-react/dist/browser-data-view.css', import.meta.url), 'utf8')
const sha256 = value => `sha256:${createHash('sha256').update(value).digest('hex')}`

test('Base consumes the Design System icon-size projection through its offline browser artifact', () => {
  assert.equal(pin.schema, 'agentic-design-system/consumer-pin/v1')
  assert.equal(pin.profile.id, 'shared-ui')
  assert.equal(sha256(profileCss), pin.profile.projectionSha256)
  assert.ok(profileCss.toString('utf8').includes(`agentic-design-system@${pin.profile.sourceRevision}`))
  assert.ok(artifactCss.startsWith(profileCss.toString('utf8')))
  assert.match(viewCss, /\.agentic-base-compact-glyph\s*\{[^}]*width:\s*var\(--agentic-icon-size-compact\)/s)
  assert.match(viewCss, /\.agentic-base-data-table svg\s*\{[^}]*width:\s*var\(--agentic-icon-size-default\)/s)
  assert.match(viewCss, /\.agentic-base-row-drag-handle\s*\{[^}]*width:\s*var\(--agentic-icon-size-default\)/s)
  assert.doesNotMatch(viewCss, /agentic-base-compact-glyph\s*\{[^}]*\b(?:12|0\.75)px\b/s)
})

test('row geometry comes from the same responsive shared profile for both density inputs', () => {
  for (const [key, cssName] of [['rowHeight', 'row-height'], ['rowHeightTouch', 'row-height-touch']]) {
    assert.ok(profileCss.toString().includes(`--agentic-${cssName}: ${pin.metrics[key]}px;`))
  }
  assert.match(profileCss.toString(), /@media \(pointer: coarse\), \(max-width: 768px\)/)
  assert.match(viewCss, /height: var\(--agentic-row-height\) !important/)
  assert.doesNotMatch(viewCss, /height: (?:38|44|54)px !important/)
  const density = fs.readFileSync(new URL('../packages/views-react/src/table/dataViewDensity.ts', import.meta.url), 'utf8')
  assert.match(density, /compact: sharedUiPin.metrics.rowHeight/)
  assert.match(density, /comfortable: sharedUiPin.metrics.rowHeight/)
})

test('numeric row metrics use the document view and retain a headless fallback', async () => {
  const { build } = await import('esbuild')
  const result = await build({ entryPoints: [new URL('../packages/views-react/src/table/dataViewDensity.ts', import.meta.url).pathname], bundle: true, write: false, format: 'esm', platform: 'node' })
  const metrics = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`)
  assert.equal(metrics.readBaseDataViewRowHeightPx('compact'), pin.metrics.rowHeight)
  const prior = Object.getOwnPropertyDescriptor(globalThis, 'document')
  try {
    Object.defineProperty(globalThis, 'document', { configurable: true, value: { documentElement: {}, defaultView: { getComputedStyle: () => ({ getPropertyValue: key => key === '--agentic-row-height' ? `${pin.metrics.rowHeightTouch}px` : '' }) } } })
    assert.equal(metrics.readBaseDataViewRowHeightPx('compact'), pin.metrics.rowHeightTouch)
    assert.equal(metrics.readBaseDataViewRowHeightPx('comfortable'), pin.metrics.rowHeightTouch)
    Object.defineProperty(globalThis, 'document', { configurable: true, value: { defaultView: null } })
    assert.equal(metrics.readBaseDataViewRowHeightPx('comfortable'), pin.metrics.rowHeight)
  } finally {
    if (prior) Object.defineProperty(globalThis, 'document', prior)
    else delete globalThis.document
  }
})


test('body and panel typography use the same pinned role without local sizes', () => {
  for (const [key, variable] of [['bodyFontSize', 'font-size-body'], ['bodyLineHeight', 'line-height-body']]) {
    assert.ok(profileCss.toString().includes(`--agentic-${variable}: ${pin.metrics[key] / 16}rem;`))
  }
  assert.match(viewCss, /font: var\(--agentic-font-size-body\)\/var\(--agentic-line-height-body\) var\(--agentic-font-sans\)/)
  assert.doesNotMatch(viewCss, /font-size: (?:13|14)px/)
  const panelCss = fs.readFileSync(new URL('../packages/views-react/src/panels/floatingPanelShell.css', import.meta.url), 'utf8')
  assert.match(panelCss, /@import "\.\.\/browser\/shared-ui-profile\.css"/)
  assert.match(panelCss, /font-size: var\(--agentic-font-size-body\)/)
  assert.match(profileCss.toString(), /--agentic-ktv-columns:/)
  assert.doesNotMatch(viewCss, /--agentic-ktv-columns\s*:/)
})


test('Base inherits centrally projected roles without local registered defaults', () => {
  const basePin = JSON.parse(fs.readFileSync(new URL('base-profile.pin.json', source), 'utf8'))
  const baseCss = fs.readFileSync(new URL('base-profile.css', source), 'utf8')
  assert.equal(sha256(baseCss), basePin.profile.projectionSha256)
  assert.match(baseCss, /:root, :host/)
  for (const variable of baseCss.matchAll(/(--agentic-base-[a-z-]+):/g)) {
    assert.doesNotMatch(viewCss, new RegExp(`${variable[1]}\\s*:`))
  }
  assert.ok(artifactCss.includes(baseCss))
})
