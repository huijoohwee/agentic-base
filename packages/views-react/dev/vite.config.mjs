import path from 'node:path'
import os from 'node:os'
import { createRequire } from 'node:module'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const baseRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const graphCandidates = [
  path.resolve(baseRoot, '../../agentic-graph', path.basename(baseRoot)),
  path.resolve(baseRoot, '../agentic-graph'),
  path.resolve(baseRoot, '../../../agentic-graph'),
]
const graphRoot = process.env.AGENTIC_GRAPH_ROOT
  || graphCandidates.find(candidate => existsSync(path.join(candidate, 'canvas/src/index.css')))
if (!graphRoot) throw new Error('Set AGENTIC_GRAPH_ROOT to an adjacent agentic-graph checkout.')
const requireFromGraph = createRequire(path.join(graphRoot, 'package.json'))
const { defineConfig } = requireFromGraph('vite')
const tailwindcss = requireFromGraph('@tailwindcss/vite').default

const sourcePathPlugin = {
  name: 'agentic-base-local-graph-host-sources',
  enforce: 'pre',
  transform(source, id) {
    if (!id.split('?')[0].endsWith('/packages/views-react/dev/styles.css')) return null
    return source.replaceAll('__AGENTIC_GRAPH_ROOT__', graphRoot.replaceAll('\\', '/'))
  },
}

export default defineConfig({
  root: path.resolve(baseRoot, 'packages/views-react/dev'),
  cacheDir: path.join(os.tmpdir(), 'agentic-base-views-react-vite'),
  plugins: [sourcePathPlugin, tailwindcss()],
  esbuild: { jsx: 'automatic' },
  optimizeDeps: { entries: [path.resolve(baseRoot, 'packages/views-react/dev/index.html')] },
  resolve: {
    alias: {
      '@': path.join(graphRoot, 'canvas/src'),
      'grph-shared': path.join(graphRoot, 'grph-shared/src'),
      react: path.join(graphRoot, 'node_modules/react'),
      'react-dom': path.join(graphRoot, 'node_modules/react-dom'),
      'lucide-react': path.join(graphRoot, 'node_modules/lucide-react'),
      d3: path.join(graphRoot, 'node_modules/d3'),
      tailwindcss: path.join(graphRoot, 'node_modules/tailwindcss'),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5176,
    strictPort: true,
    fs: { allow: [baseRoot, graphRoot] },
  },
})
