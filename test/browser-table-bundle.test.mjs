import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

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
    handle.destroy()
    const toolbar = mountRecordViewToolbar(root, { label: 'Record views', layout: 'table', onLayoutChange: value => { selected = value }, actions: [] })
    const select = await until(() => root.querySelector('select'))
    select.value = 'kanban'; select.dispatchEvent(new window.Event('change', { bubbles: true }))
    assert.equal(selected, 'kanban')
    toolbar.destroy()
  } finally {
    globalThis.Element = prevElement; globalThis.window = prevWindow; globalThis.document = prevDocument; dom.window.close()
  }
})
