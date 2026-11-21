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
