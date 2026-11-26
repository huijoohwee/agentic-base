import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { assertAnnotationTargets } from 'agentic-design-system/annotation-targets';

const probe = createServer();
await new Promise((resolve, reject) => probe.once('error', reject).listen(0, '127.0.0.1', resolve));
const port = probe.address().port;
await new Promise((resolve, reject) => probe.close(error => error ? reject(error) : resolve()));
const server = spawn(process.execPath, ['scripts/dev-server.mjs'], {
  cwd: process.cwd(), env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'inherit'],
});
let output = '';
const origin = `http://127.0.0.1:${port}/`;
await new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error(`Base server did not start: ${output}`)), 10_000);
  server.once('error', reject);
  server.stdout.on('data', chunk => {
    output += chunk.toString();
    if (output.includes(origin)) { clearTimeout(timeout); resolve(); }
  });
  server.once('exit', code => reject(new Error(`Base server exited (${code}): ${output}`)));
}).catch(error => { server.kill('SIGTERM'); throw error; });

let browser;
try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto(origin, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Create local sample' }).click();
  await page.locator('[data-selection-target="base-data-view"]').waitFor({ state: 'visible' });
  const report = await page.evaluate(assertAnnotationTargets, { minTargets: 3, scrollIntoView: true });
  assert.deepEqual(pageErrors, []);
  process.stdout.write(`Rendered annotation targets passed: ${report.targetCount}\n`);
} finally {
  await browser?.close();
  server.kill('SIGTERM');
  await once(server, 'exit').catch(() => {});
}
