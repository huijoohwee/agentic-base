import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, readdir, rename, rm, writeFile, mkdtemp } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url)), output = join(root, 'sheets/dist');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const manifestName = 'artifact-manifest.json';

// The manifest digest pins the complete upstream inventory, including the offline worker and notices.
async function readProjection(read) {
  const pin = JSON.parse(await readFile(join(root, 'sheets/owner.json'), 'utf8'));
  const bytes = await read(manifestName);
  if (digest(bytes) !== pin.manifestSha256) throw Error('Sheets owner manifest differs from the pinned release');
  const manifest = JSON.parse(bytes), files = new Map();
  for (const entry of manifest.files) {
    const body = await read(entry.path);
    if (body.length !== entry.bytes || digest(body) !== entry.sha256) throw Error('Sheets owner file differs: ' + entry.path);
    files.set(entry.path, body);
  }
  files.set(manifestName, bytes);
  return { files, manifest };
}

export async function buildSheetsArtifact() {
  const artifact = await readProjection(name => readFile(join(output, name)));
  const names = await readdir(output);
  if (names.some(name => !artifact.files.has(name))) throw Error('Unowned file in Sheets projection');
  return artifact;
}

async function restoreProjection() {
  const pin = JSON.parse(await readFile(join(root, 'sheets/owner.json'), 'utf8'));
  const common = execFileSync('git', ['rev-parse','--path-format=absolute','--git-common-dir'], {cwd:root, encoding:'utf8'}).trim();
  const owner = process.env.SHEETS_OWNER_ROOT ?? join(dirname(dirname(common)), 'agentic-sheets');
  const { files } = await readProjection(name => execFileSync('git', ['show', pin.revision + ':sheets/dist/' + name], {cwd:owner, maxBuffer:500000}));
  await mkdir(output, {recursive:true});
  if ((await readdir(output)).some(name => !files.has(name))) throw Error('Unowned file in Sheets projection');
  const stage = await mkdtemp(join(dirname(output), '.sheets-'));
  try {
    for (const [name, bytes] of files) await writeFile(join(stage, name), bytes);
    for (const name of files.keys()) await rename(join(stage, name), join(output, name));
  } finally { await rm(stage, {recursive:true, force:true}); }
}

async function main(mode) {
  if (!['--write', '--check'].includes(mode)) throw Error('Use --write or --check');
  let artifact;
  try { artifact = await buildSheetsArtifact(); }
  catch (error) {
    if (mode !== '--write') throw error;
    await restoreProjection();
    artifact = await buildSheetsArtifact();
  }
  console.log(JSON.stringify({ok:true, mode, bytes:artifact.manifest.totalBytes,
    artifactDigest:artifact.manifest.artifactDigest, files:artifact.files.size}));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv[2]).catch(error => { console.error(error.message); process.exitCode = 1; });
}
