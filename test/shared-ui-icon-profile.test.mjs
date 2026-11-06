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
