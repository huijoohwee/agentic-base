import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('Base demo exposes stable annotation targets only on named semantic regions', async () => {
  const [html, app] = await Promise.all([read('demo/index.html'), read('demo/app.mjs')]);
  assert.match(html, /<main(?=[^>]*aria-label="Agentic Base local demo")(?=[^>]*data-selection-target="base-demo")[^>]*>/u);
  assert.match(html, /<section id="workspace"[^>]*aria-label="Task workspace" hidden>/u);
  assert.match(html, /<section id="table-host"[^>]*role="region"[^>]*aria-label="Shared interactive table"><\/section>/u);
  assert.match(app, /dom\.workspace\.hidden = false;\s*dom\.workspace\.dataset\.selectionTarget = 'base-workspace';/u);
  assert.match(app, /state\.tableHandle = mountDataView\(dom\['table-host'\], view\);\s*dom\['table-host'\]\.dataset\.selectionTarget = 'base-data-view';/u);
  assert.doesNotMatch(html, /<(?:div|span)\b[^>]*data-selection-target=/u);
});
