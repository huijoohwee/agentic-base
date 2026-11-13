import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pin = JSON.parse(await readFile(resolve(root, 'packages/views-react/src/browser/shared-ui-profile.pin.json'), 'utf8'));
const css = await readFile(resolve(root, 'packages/views-react/src/browser/shared-ui-profile.css'), 'utf8');
const panelCss = await readFile(resolve(root, 'packages/views-react/src/panels/floatingPanelShell.css'), 'utf8');
const panelPin = JSON.parse(await readFile(resolve(root, 'packages/views-react/src/panels/floatingPanelShell.pin.json'), 'utf8'));

test('shared control border projection matches its central pin', () => {
  const profile = pin.profile;
  const digest = createHash('sha256').update(css).digest('hex');
  assert.match(profile.sourceRevision, /^[a-f0-9]{40}$/u);
  assert.match(profile.registryRevision, /^[a-f0-9]{40}$/u);
  assert.match(profile.sourceSha256, /^sha256:[a-f0-9]{64}$/u);
  assert.equal(profile.projectionSha256, `sha256:${digest}`);
  assert.match(css, new RegExp(`Generated from agentic-design-system@${profile.sourceRevision}; profile sha256 ${profile.sourceSha256.slice(7)}`));
});

test('shared panel radius is read only from the Design System shared profile', () => {
  assert.equal(pin.metrics.floatingPanelRadius, 8);
  assert.match(css, /--agentic-floating-panel-radius: var\(--agentic-panel-radius\);/u);
  assert.match(css, /--agentic-panel-radius: 8px;/u);
  assert.match(css, /--agentic-control-hover-background: light-dark\(#fffbeb, rgb\(251 191 36 \/ 0\.16\)\);/u);
  assert.equal((css.match(/--agentic-floating-panel-radius\s*:/gu) ?? []).length, 1);
  const panelRule = panelCss.match(/\.agentic-panel-surface,\s*\.agentic-base-floating-panel\s*\{[^}]+\}/u)?.[0] ?? '';
  assert.match(panelRule, /border-radius:\s*var\(--agentic-panel-radius\)/u);
  assert.doesNotMatch(panelRule, /--island-radius|--agentic-control-radius|--agentic-floating-panel-radius/u);
  assert.doesNotMatch(panelCss, /--agentic-floating-panel-radius\s*:/u);
  assert.match(panelPin.revision, /^[a-f0-9]{40}$/u);
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
