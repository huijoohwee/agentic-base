import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pin = JSON.parse(await readFile(resolve(root, 'packages/views-react/src/browser/shared-ui-profile.pin.json'), 'utf8'));
const css = await readFile(resolve(root, 'packages/views-react/src/browser/shared-ui-profile.css'), 'utf8');

test('shared control border projection matches its central pin', () => {
  const profile = pin.profile;
  const digest = createHash('sha256').update(css).digest('hex');
  assert.equal(profile.sourceRevision, '5b568d97dd441c15b8ddef9be75de12394490df8');
  assert.equal(profile.registryRevision, 'b25dcb54572d4af0e5964f69360153da63fc0e96');
  assert.equal(profile.sourceSha256, 'sha256:86998f0f397c49544f4f4726d5b842bee03d02c8d98794d3db8ce34534a67c04');
  assert.equal(profile.projectionSha256, `sha256:${digest}`);
  assert.match(css, new RegExp(`Generated from agentic-design-system@${profile.sourceRevision}; profile sha256 ${profile.sourceSha256.slice(7)}`));
});

test('native form fields and enhanced selects use one shared border declaration', () => {
  assert.match(css, /--agentic-control-border:\s*1px solid var\(--agentic-base-border,/u);
  const start = css.indexOf('.agentic-form-control,');
  const end = css.indexOf('\n}', start);
  assert.ok(start >= 0 && end > start, 'common control rule exists');
  const commonRule = css.slice(start, end);
  assert.match(commonRule, /\.agentic-select-trigger/u);
  assert.match(commonRule, /border:\s*var\(--agentic-control-border\)/u);
  const selectRule = css.match(/\n\.agentic-select-trigger \{[^}]+\}/u)?.[0] ?? '';
  assert.ok(selectRule, 'enhanced select presentation rule exists');
  assert.doesNotMatch(selectRule, /\bborder(?:-color)?\s*:/u);
});
