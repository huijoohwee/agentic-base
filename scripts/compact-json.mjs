import fs from 'node:fs'

const target = 'packages/views-react/migration-source.json'
const compactManifest = input => {
  const manifest = JSON.parse(input)
  const rows = Object.entries(manifest).map(([key, value]) => {
    const label = JSON.stringify(key)
    if (Array.isArray(value) && value.some(item => item && typeof item === 'object')) {
      return `${label}: [\n${value.map(item => `  ${JSON.stringify(item)}`).join(',\n')}\n]`
    }
    if (value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 4) {
      const entries = Object.entries(value).map(([entryKey, entryValue]) => `  ${JSON.stringify(entryKey)}: ${JSON.stringify(entryValue)}`)
      return `${label}: {\n${entries.join(',\n')}\n}`
    }
    return `${label}: ${JSON.stringify(value)}`
  })
  return `{\n${rows.map(row => `  ${row}`).join(',\n')}\n}\n`
}

const outputs = new Map([[target, compactManifest(fs.readFileSync(target, 'utf8'))]])
for (const [file, output] of outputs) {
  const lineCount = output.trimEnd().split('\n').length
  if (lineCount >= 600) throw new Error(`${file} exceeds the <600-line repository budget (${lineCount})`)
  const current = fs.readFileSync(file, 'utf8')
  if (process.argv.includes('--write')) fs.writeFileSync(file, output)
  else if (current !== output) throw new Error(`${file} needs deterministic compact formatting; run node scripts/compact-json.mjs --write`)
  process.stdout.write(`ok ${file}: ${lineCount} lines\n`)
}
