import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { build, version } from 'esbuild'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourceRoot = 'packages/views-react/src'
const outputRoot = path.join(root, 'packages/views-react/dist')
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
const digest = value => createHash('sha256').update(value).digest('hex')
const built = await build({
  absWorkingDir: root,
  entryPoints: [`${sourceRoot}/browser/index.ts`],
  outfile: 'browser-data-view.js',
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  jsx: 'automatic',
  minify: true,
  alias: {
    react: path.join(root, 'node_modules/react'),
    'react-dom': path.join(root, 'node_modules/react-dom'),
  },
  legalComments: 'inline',
  treeShaking: true,
  define: { 'process.env.NODE_ENV': '"production"' },
  metafile: true,
})
if (built.outputFiles.length !== 1) throw new Error('Expected one browser JavaScript bundle.')
const outputMetadata = Object.values(built.metafile.outputs).find(output => output.entryPoint === `${sourceRoot}/browser/index.ts`)
if (!outputMetadata || outputMetadata.imports.length) throw new Error('Browser artifact must contain no external imports.')
const inputRows = Object.keys(built.metafile.inputs)
  .filter(relative => relative.startsWith(`${sourceRoot}/`))
  .concat(`${sourceRoot}/browser/browserDataView.css`)
  .filter((relative, index, inputs) => inputs.indexOf(relative) === index)
  .sort()
  .map(relative => {
    const bytes = fs.readFileSync(path.join(root, relative))
    return { path: relative, bytes: bytes.length, sha256: digest(bytes) }
  })
const files = new Map([
  ['browser-data-view.js', built.outputFiles[0].contents],
  ['browser-data-view.css', fs.readFileSync(path.join(root, `${sourceRoot}/browser/browserDataView.css`))],
])
for (const [name, bytes] of files) {
  if (!bytes.length || bytes.length >= 500000) throw new Error(`${name} exceeds the 500 kB artifact cap.`)
}
const manifest = {
  schema: 'agentic-base/browser-data-view-artifact/v1',
  package: '@agentic-base/views-react',
  sourceContract: 'agentic-base/browser-data-view/v1',
  bundle: {
    esbuild: version,
    react: packageJson.devDependencies.react,
    reactDom: packageJson.devDependencies['react-dom'],
    format: 'esm',
    target: 'es2022',
    offline: true,
  },
  inputs: inputRows,
  outputs: [...files].map(([name, bytes]) => ({ path: name, bytes: bytes.length, sha256: digest(bytes) })),
}
files.set('browser-data-view.manifest.json', Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`))
const check = process.argv.includes('--check')
if (!check && !process.argv.includes('--write')) throw new Error('Use --write or --check.')
if (check) {
  for (const [name, expected] of files) {
    const target = path.join(outputRoot, name)
    const actual = fs.existsSync(target) ? fs.readFileSync(target) : Buffer.alloc(0)
    if (!actual.equals(expected)) {
      let offset = 0
      while (offset < actual.length && offset < expected.length && actual[offset] === expected[offset]) offset += 1
      throw new Error(`${name} is stale at byte ${offset}; tracked sha256=${digest(actual)}; generated sha256=${digest(expected)}; run npm run build:browser-data-view.`)
    }
  }
} else {
  fs.mkdirSync(outputRoot, { recursive: true })
  for (const [name, bytes] of files) fs.writeFileSync(path.join(outputRoot, name), bytes)
}
console.log(JSON.stringify({ ok: true, mode: check ? 'check' : 'write', files: [...files].map(([name, bytes]) => ({ name, bytes: bytes.length })) }))
