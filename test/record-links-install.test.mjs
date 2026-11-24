import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

test('a headless consumer can install the published record links offline', t => {
  const directory = mkdtempSync(join(tmpdir(), 'base-install-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const root = fileURLToPath(new URL('../', import.meta.url));
  const npm = (args, cwd) => execFileSync('npm', args, { cwd, encoding: 'utf8' });
  const [archive] = JSON.parse(npm(['pack', '--offline', '--ignore-scripts', '--json', '--pack-destination', directory], root));
  const consumer = join(directory, 'consumer');
  mkdirSync(consumer);
  writeFileSync(join(consumer, 'package.json'), JSON.stringify({ private: true }));
  npm(['install', '--offline', '--ignore-scripts', '--no-fund', '--no-audit', join(directory, archive.filename)], consumer);
  const lock = JSON.parse(readFileSync(join(consumer, 'package-lock.json'), 'utf8'));
  assert.deepEqual(Object.keys(lock.packages).sort(), ['', 'node_modules/@agentic-base/views-react']);
  const output = execFileSync(process.execPath, ['--input-type=module', '-e',
    "import {createRecordRelation} from '@agentic-base/views-react/record-links';" +
    "const index=createRecordRelation({sources:['one'],targets:['two'],links:[{source:'one',target:'two'}]});" +
    "console.log(index.to('two')[0].source);"], { cwd: consumer, encoding: 'utf8' });
  assert.equal(output.trim(), 'one');
});
