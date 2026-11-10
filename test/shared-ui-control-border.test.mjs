import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pin = JSON.parse(await readFile(resolve(root, 'packages/views-react/src/browser/shared-ui-profile.pin.json'), 'utf8'));
const migration = JSON.parse(await readFile(resolve(root, 'packages/views-react/migration-source.json'), 'utf8'));
const css = await readFile(resolve(root, 'packages/views-react/src/browser/shared-ui-profile.css'), 'utf8');
const panelCss = await readFile(resolve(root, 'packages/views-react/src/panels/floatingPanelShell.css'), 'utf8');
const panelPin = JSON.parse(await readFile(resolve(root, 'packages/views-react/src/panels/floatingPanelShell.pin.json'), 'utf8'));

test('shared control border projection matches its central pin', () => {
  const profile = pin.profile;
  const digest = createHash('sha256').update(css).digest('hex');
  assert.equal(profile.sourceRevision, '267cdb31047b02d4f54ea6708fb2518a8a2a57f4');
  assert.equal(profile.registryRevision, 'f9e058d7b3be3acc411634ad84695d6d642f1cd2');
  assert.equal(profile.sourceSha256, 'sha256:6bc322f50d5c6cdfb82dc8b472e0ea3a440cb51d1379aadd0a204738c615d2c5');
  assert.equal(profile.projectionSha256, `sha256:${digest}`);
  assert.match(css, new RegExp(`Generated from agentic-design-system@${profile.sourceRevision}; profile sha256 ${profile.sourceSha256.slice(7)}`));
});

test('FloatingPanel radius is read only from the Design System shared profile', () => {
  assert.equal(pin.metrics.floatingPanelRadius, 8);
  assert.match(css, /--agentic-floating-panel-radius: 8px;/u);
  assert.equal((css.match(/--agentic-floating-panel-radius\s*:/gu) ?? []).length, 1);
  const panelRule = panelCss.match(/\.agentic-base-floating-panel\s*\{[^}]+\}/u)?.[0] ?? '';
  assert.match(panelRule, /border-radius:\s*var\(--agentic-floating-panel-radius\)/u);
  assert.doesNotMatch(panelRule, /--island-radius|--agentic-control-radius/u);
  assert.doesNotMatch(panelCss, /--agentic-floating-panel-radius\s*:/u);
  assert.equal(panelPin.revision, migration.sourceSnapshots['src/panels/floatingPanelShell.css'].commit);
  assert.equal(createHash('sha256').update(panelCss).digest('hex'), panelPin.sha256);
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
