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
  const panelPin = JSON.parse(fs.readFileSync(new URL('../panels/floatingPanelShell.pin.json', source), 'utf8'))
  assert.equal(panelPin.owner, pin.profile.owner)
  assert.match(panelPin.revision, /^[a-f0-9]{40}$/)
  assert.equal(panelPin.path, 'site/floating-panel.css')
  assert.equal(sha256(panelCss), `sha256:${panelPin.sha256}`, 'FloatingPanel must be the unmodified Design System asset')
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


test('KTV and icons render one semantic row with a visible named Type glyph', async () => {
  const { build } = await import('esbuild')
  const result = await build({ stdin: { contents: `import React from 'react'; import { renderToStaticMarkup } from 'react-dom/server'; import { KeyTypeValueRow, DesignIcon } from './packages/views-react/src/controls/MenuControls'; export const html=renderToStaticMarkup(React.createElement(KeyTypeValueRow,{keyNode:'Limit',typeNode:React.createElement(DesignIcon,{name:'Hash',label:'Number'}),valueNode:React.createElement('input',{type:'number',value:8,readOnly:true})}));`, resolveDir: new URL('..', import.meta.url).pathname, loader: 'tsx' }, bundle: true, write: false, format: 'esm', platform: 'node', packages: 'external' })
  const compiled = new URL('../node_modules/.cache/ktv-render-test.mjs', import.meta.url)
  fs.mkdirSync(new URL('.', compiled), { recursive: true }); fs.writeFileSync(compiled, result.outputFiles[0].contents)
  const { html } = await import(compiled.href)
  assert.equal((html.match(/<dl\b/g) || []).length, 1)
  assert.match(html, /<dt[^>]*>Limit<\/dt>/)
  assert.match(html, /<dd[^>]*agentic-ktv-type[^>]*><svg[^>]*role="img"[^>]*aria-label="Number"/)
  assert.doesNotMatch(html, /aria-hidden|<div|stroke-width=/)
  assert.match(profileCss.toString(), /stroke-width: var\(--agentic-icon-stroke-width\)/)
  assert.match(profileCss.toString(), /\.agentic-icon-pill, \.agentic-icon-badge/)
  assert.match(html, /<dd[^>]*agentic-ktv-value[^>]*><input/)
  const library = JSON.parse(fs.readFileSync(new URL('../packages/views-react/src/controls/icons.json', import.meta.url)))
  const iconPin = JSON.parse(fs.readFileSync(new URL('../packages/views-react/src/controls/icons.pin.json', import.meta.url)))
  assert.equal(Object.keys(library.icons).length, 61)
  assert.equal(createHash('sha256').update(fs.readFileSync(new URL('../packages/views-react/src/controls/icons.json', import.meta.url))).digest('hex'), iconPin.sha256)
})

test('dashboard checkboxes reuse the pinned responsive group layout', () => {
  const dashboard = new URL('../packages/views-react/src/dashboard/', import.meta.url)
  const editor = fs.readFileSync(new URL('DashboardWidgetEditor.tsx', dashboard), 'utf8')
  const controls = fs.readFileSync(new URL('../controls/CheckboxGroup.tsx', dashboard), 'utf8')
  assert.match(editor, /type === 'checkbox-list' \? <CheckboxGroup>/)
  assert.ok(editor.includes('<CheckboxOption key={option.value}'))
  assert.ok(controls.includes('className="agentic-checkbox-group"'))
  assert.match(profileCss.toString(), /\.agentic-checkbox-group > label \{[^}]*min-block-size: var\(--agentic-control-height\)/)
  for (const file of fs.readdirSync(dashboard).filter(file => file.endsWith('.css'))) {
    assert.doesNotMatch(fs.readFileSync(new URL(file, dashboard), 'utf8'), /\.agentic-checkbox-group\b/)
  }
})
