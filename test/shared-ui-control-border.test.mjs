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
  assert.equal(profile.sourceRevision, '30e403a55bd9f5b6c7e58a7cc7de632e1b2714ae');
  assert.equal(profile.registryRevision, '058c56f18f2dab16b46a20ac12cdc4243612bf28');
  assert.equal(profile.sourceSha256, 'sha256:26e70f6d765e97d4dae02175d312c50b9038b1448d5710b8c78102ae4493bba3');
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
