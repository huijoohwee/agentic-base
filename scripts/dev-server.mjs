import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { realpath } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const demoReportOnlyCsp = [
  "default-src 'self'",
  "script-src 'self'",
  "script-src-attr 'none'",
  "style-src 'self'",
  "style-src-attr 'none'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');
const allowed = ['/demo/', '/src/', '/test-browser/'];
const mimeTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.webmanifest', 'application/manifest+json; charset=utf-8'],
]);

function safePath(urlPath) {
  if (urlPath === '/' || urlPath === '/demo' || urlPath === '/demo/') return resolve(root, 'demo/index.html');
  if (urlPath === '/demo/browser-data-view.js') return resolve(root, 'packages/views-react/dist/browser-data-view.js');
  if (urlPath === '/demo/browser-data-view.css') return resolve(root, 'packages/views-react/dist/browser-data-view.css');
  if (urlPath === '/sw.js') return resolve(root, 'sw.js');
  if (!allowed.some(prefix => urlPath.startsWith(prefix)) || urlPath.includes('..')) return null;
  return resolve(root, `.${urlPath}`);
}

const server = createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { allow: 'GET, HEAD' }).end();
    return;
  }
  let path;
  try {
    path = safePath(decodeURIComponent(new URL(request.url, 'http://localhost').pathname));
    if (!path) throw new Error('path is outside the local demo');
    const actual = await realpath(path);
    if (!actual.startsWith(`${root}${sep}`)) throw new Error('path escapes the repository');
    const body = await readFile(actual);
    const headers = {
      'cache-control': 'no-store',
      'content-type': mimeTypes.get(extname(actual)) ?? 'application/octet-stream',
      'x-content-type-options': 'nosniff',
      'content-length': body.byteLength,
    };
    if (actual === resolve(root, 'demo/index.html')) {
      headers['content-security-policy-report-only'] = demoReportOnlyCsp;
    }
    if (actual.endsWith(`${sep}sw.js`)) headers['service-worker-allowed'] = '/';
    response.writeHead(200, headers);
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
    response.end('Not found');
  }
});

const host = process.env.HOST ?? '127.0.0.1';
const port = Number(process.env.PORT ?? 4173);
if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new TypeError('PORT must be between 1 and 65535');
server.listen(port, host, () => process.stdout.write(`Local demo: http://${host}:${port}/\n`));
server.on('error', error => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
