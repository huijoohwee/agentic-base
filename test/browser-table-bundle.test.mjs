import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { createRecordRelation, createRecordLinkCodec } from '@agentic-base/views-react/record-links'

test('one declared link supplies both directions with exact collection-local identities', () => {
  const sources = ['same', 'A/B', 'unused'], targets = ['same', 'A/B', '__proto__']
  const links = [{ source: 'same', target: 'A/B', label: 'Alias /+' },
    { source: 'A/B', target: 'A/B' }, { source: 'same', target: '__proto__' }]
  const relation = createRecordRelation({ sources, targets, links: [...links, links[0]] })
  assert.deepEqual(relation.from('same'), [links[0], links[2]])
  assert.deepEqual(relation.to('A/B'), links.slice(0, 2))
  assert.equal(relation.from('same')[0], relation.to('A/B')[0])
  links[0].target = 'other'
  assert.equal(relation.to('A/B')[0].target, 'A/B')
  assert.deepEqual(relation.from('unused'), [])
  assert.deepEqual(relation.to('same'), [])
  assert.throws(() => relation.from('unknown'), /endpoint/)
  assert.throws(() => relation.to('A/B').pop(), TypeError)
  assert.throws(() => createRecordRelation({ sources, targets, links }), /endpoint/)
  assert.throws(() => createRecordRelation({ sources: [...sources, 'same'], targets, links: [] }), /Duplicate/)
})

test('record bookmarks round-trip host keys and reject ambiguous or malformed destinations', () => {
  const codec = createRecordLinkCodec({ fragment: 'records', views: [{ view: 'entry' }, { view: 'cell', group: 'sheet' }] })
  for (const dest of [{ view: 'entry', record: 'x/# +&?%=Ω' }, { view: 'cell', group: '甲' }, { view: 'cell', group: '甲', record: '__proto__' }]) {
    assert.deepEqual(codec.parse(new URL(codec.href(dest), 'https://example.test/').hash), dest)
  }
  for (const hash of ['#else?entry=x', '#records?', '#records?sheet=', '#records?entry=a&entry=b',
    '#records?cell=x&entry=y', '#records?missing=a', '#records?cell=%ff', '#records?cell=%']) assert.equal(codec.parse(hash), null)
  assert.throws(() => codec.href({ view: 'entry', group: 'other' }), /destination/)
  assert.throws(() => createRecordLinkCodec({ fragment: 'records', views: [{ view: 'entry', group: 'entry' }] }), /Ambiguous/)
})

test('a table-only browser consumer retains responsive styles and omits the chart runtime', async () => {
  const root = fileURLToPath(new URL('..', import.meta.url))
  const result = await build({
    stdin: { contents: "export { mountDataView } from '@agentic-base/views-react/browser'", resolveDir: root },
    bundle: true, format: 'esm', jsx: 'automatic', outdir: 'out', write: false, metafile: true,
  })
  const js = Object.values(result.metafile.outputs).find(output => output.exports.includes('mountDataView'))
  assert.ok(js)
  const retained = Object.entries(js.inputs).filter(([, input]) => input.bytesInOutput > 0).map(([file]) => file)
  assert.ok(retained.some(file => file.endsWith('/table/TableCore.tsx')))
  assert.ok(!retained.some(file => file.endsWith('/DashboardChartBrowser.tsx') || /node_modules\/d3(?:-|\/)/u.test(file)))
  const css = result.outputFiles.find(file => file.path.endsWith('.css'))
  assert.match(css.text, /data-agentic-table-fit/u)
})

test('the offline board and layout toolbar use the shared owners', async () => {
  const { readFile } = await import('node:fs/promises')
  const manifest = JSON.parse(await readFile(new URL('../packages/views-react/dist/browser-data-view.manifest.json', import.meta.url)))
  for (const source of ['kanban/KanbanView.tsx', 'kanban/KanbanCard.tsx', 'browser/RecordViewToolbar.tsx']) {
    assert.ok(manifest.inputs.some(entry => entry.path.endsWith(source)))
  }
  const { JSDOM } = await import('jsdom')
  const dom = new JSDOM('<main></main>', { pretendToBeVisual: true })
  const prevWindow = globalThis.window, prevDocument = globalThis.document, prevElement = globalThis.Element
  globalThis.Element = dom.window.Element
  globalThis.window = dom.window
  globalThis.document = dom.window.document
  try {
    const { mountDataView, mountRecordViewToolbar } = await import('../packages/views-react/dist/browser-data-view.js')
    dom.window.matchMedia = () => ({ matches: true })
    const shadow = document.querySelector('main').attachShadow({ mode: 'open' })
    const root = document.createElement('div'); shadow.append(root)
    const columns = ['Route', 'Status', 'Source'].map(name => ({ id: name, name }))
    const rows = Array.from({ length: 15 }, (_, i) => ({ id: String(i), cells: [`Item ${i}`, 'Mapped', 'https://example.invalid/'] }))
    const board = { layout: 'kanban', groupByColumnId: 'Status', columns, rows }
    assert.throws(() => mountDataView(root, { ...board, groupByColumnId: 'Missing' }), /grouping column/)
    let selected
    const handle = mountDataView(root, { ...board, onActivateRow: id => { selected = id } })
    async function until(fn) {
      for (let i = 0; i < 100; i++) {
        const result = fn(); if (result) return result
        await new Promise(resolve => setTimeout(resolve, 10))
      }
      assert.fail('Expected browser state')
    }
    const sample = document.createElement('div'); shadow.append(sample)
    const value = 'read.account-history, '.repeat(8)
    const grid = mountDataView(sample, { columns: [{ id: 'ops', name: 'Operations' }, { id: 'total', name: 'Reads', kind: 'number' }],
      rows: [{ id: 'family', cells: [value, '12'] }], wrapText: true })
    await until(() => sample.querySelector('tbody td .agentic-base-data-field-wrap')?.textContent === value)
    assert.equal(sample.querySelectorAll('tbody td')[1].textContent, '12')
    const literals = 'read.catalog, read.candles, <field>'
    const codeState = {
      columns: [{ id: 'family', name: 'Family' }, { id: 'status', name: 'Status' }, { id: 'ops', name: 'Operations', format: 'code-list' }],
      rows: [{ id: 'example', cells: ['Quotes', 'Mapped', literals] }], wrapText: true,
    }
    for (const mode of [{ layout: 'table' }, { layout: 'multiDimensional', orientation: 'columns' }, { layout: 'kanban', groupByColumnId: 'status' }]) {
      grid.update({ ...codeState, ...mode })
      const target = mode.layout === 'kanban' ? '[data-base-card] code' : 'tbody td code'
      await until(() => sample.querySelectorAll(target).length === 3)
      const tokens = [...sample.querySelectorAll(target)]
      assert.deepEqual(tokens.map(token => token.textContent), ['read.catalog', 'read.candles', '<field>'])
      assert.equal(tokens[0].parentElement.textContent, literals)
      assert.equal(sample.querySelector('field'), null)
      grid.update({ columns, rows: [] })
      await until(() => !sample.querySelector('code'))
    }
    assert.throws(() => grid.update({ ...codeState, columns: [{ id: 'n', name: 'Count', kind: 'number', format: 'code-list' }] }), /text format/)
    grid.destroy()
    await until(() => root.querySelector('[data-base-card]'))
    assert.equal(root.querySelectorAll('[data-base-card]').length, 12)
    assert.equal(root.querySelector('a'), null)
    root.querySelector('[aria-label="Show more Mapped records"]').click()
    await until(() => root.querySelectorAll('[data-base-card]').length === 15)
    root.querySelector('[data-base-card]').click()
    assert.equal(selected, '0', 'one tap opens a read-only card inside the consumer shadow root')
    selected = undefined
    root.querySelector('[data-base-card]').dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    assert.equal(selected, '0')
    handle.update({ layout: 'table', columns, rows })
    const heading = await until(() => root.querySelector('th button'))
    assert.equal(heading.style.color, 'inherit', 'column controls inherit the table header contrast')
    handle.update({ layout: 'table', columns, rows, selectedRowId: rows.at(-1).id, revealSelection: true, onActivateRow() {} })
    await until(() => shadow.activeElement?.matches('tr[aria-selected="true"]'))
    assert.equal(shadow.activeElement, root.querySelector('tbody tr:last-child'))
    handle.destroy()
    const toolbar = mountRecordViewToolbar(root, { label: 'Record views', layout: 'table', onLayoutChange: value => { selected = value }, actions: [] })
    const select = await until(() => root.querySelector('select'))
    select.value = 'kanban'; select.dispatchEvent(new window.Event('change', { bubbles: true }))
    assert.equal(selected, 'kanban')
    assert.equal(root.querySelector('[aria-label="Export view"]'), null)
    const changed = { label: 'Records', layout: 'table', onLayoutChange() {}, actions: [],
      exports: [{ id: 'csv', label: 'CSV', invoke() { selected = 'download' } }] }
    toolbar.update(changed)
    const trigger = await until(() => root.querySelector('[aria-label="Export view"]'))
    trigger.click()
    const format = await until(() => root.querySelector('[aria-label="Export format"] button'))
    format.click()
    assert.equal(selected, 'download')
    assert.throws(() => toolbar.update({ ...changed, exports: [...changed.exports, ...changed.exports] }), /export action/i)
    toolbar.destroy()
  } finally {
    globalThis.Element = prevElement; globalThis.window = prevWindow; globalThis.document = prevDocument; dom.window.close()
  }
})
