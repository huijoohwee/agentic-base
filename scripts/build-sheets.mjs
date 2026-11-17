import { createHash } from 'node:crypto';
import { readFile, readdir, mkdir, writeFile, rename } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url)), output = resolve(root, 'sheets/dist');
const digest = value => createHash('sha256').update(value).digest('hex');
const entries = ['index.html', 'app.mjs', 'styles.css', 'core.mjs', 'schema.mjs', 'formula.mjs', 'storage.mjs', 'manifest.webmanifest'];
export async function buildSheetsArtifact() {
  const files = new Map(), inputs = [];
  async function input(path) {
    const bytes = await readFile(join(root, path));
    inputs.push({ path, bytes: bytes.length, sha256: digest(bytes) }); return bytes;
  }
  for (const name of entries) files.set(name, await input(`sheets/${name}`));
  const profilePath = 'packages/views-react/src/browser/shared-ui-profile.css';
  const pin = JSON.parse(await input('packages/views-react/src/browser/shared-ui-profile.pin.json'));
  const profile = await input(profilePath);
  if (`sha256:${digest(profile)}` !== pin.profile.projectionSha256) throw new Error('Design System profile digest mismatch');
  const manifest = JSON.parse(await input('package.json'));
  if (!manifest.devDependencies['agentic-design-system'].endsWith(`#${pin.profile.registryRevision}`)) throw new Error('Design System registry revision mismatch');
  files.set('shared-ui-profile.css', profile);
  files.set('LICENSE', await input('LICENSE'));
  const designLicense = await input('sheets/LICENSE.design-system');
  files.set('LICENSE.design-system', designLicense);
  const worker = await input('sheets/sw.js');
  inputs.sort((a, b) => a.path.localeCompare(b.path));
  const sourceDigest = digest(JSON.stringify(inputs));
  const assets = [...files.keys(), 'artifact-manifest.json'].map(name => `./${name}`);
  files.set('sw.js', Buffer.from(worker.toString().replace('__CACHE_REVISION__', sourceDigest.slice(0, 24)).replace('__ASSETS__', JSON.stringify(assets))));
  const inventory = [...files].sort(([a], [b]) => a.localeCompare(b)).map(([path, bytes]) => ({ path, bytes: bytes.length, sha256: digest(bytes) }));
  for (const entry of inventory) if (!entry.bytes || entry.bytes >= 500000) throw new Error(`Artifact chunk cap: ${entry.path}`);
  const totalBytes = inventory.reduce((sum, entry) => sum + entry.bytes, 0);
  if (totalBytes > 400000) throw new Error('Initial app exceeds 400,000 raw bytes');
  const artifact = { schema: 'sheets/artifact/v1', contract: 'sheets/workbook/v1', sourceDigest,
    designSystem: { revision: pin.profile.registryRevision, profileSource: pin.profile.sourceRevision, profileSha256: digest(profile), licenseSha256: digest(designLicense) },
    artifactDigest: digest(JSON.stringify(inventory)), totalBytes, inputs, files: inventory };
  files.set('artifact-manifest.json', Buffer.from(`${JSON.stringify(artifact, null, 2)}\n`));
  return { files, manifest: artifact };
}
async function main() {
  const mode = process.argv[2]; if (!['--write', '--check'].includes(mode)) throw new Error('Use --write or --check');
  const artifact = await buildSheetsArtifact();
  let names = [];
  try { names = await readdir(output); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (names.some(name => !artifact.files.has(name))) throw new Error('Unowned file in Sheets artifact directory');
  if (mode === '--write') await mkdir(output, { recursive: true });
  for (const [name, expected] of artifact.files) {
    const path = join(output, name);
    if (mode === '--write') { await writeFile(`${path}.tmp`, expected, { flag: 'wx' }); await rename(`${path}.tmp`, path); }
    else { const actual = await readFile(path); if (!actual.equals(expected)) throw new Error(`Sheets artifact drift: ${name}`); }
  }
  process.stdout.write(`${JSON.stringify({ ok: true, mode, bytes: artifact.manifest.totalBytes, artifactDigest: artifact.manifest.artifactDigest, files: artifact.files.size })}\n`);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
