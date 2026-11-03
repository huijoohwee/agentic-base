const CACHE = 'agentic-base-app-v10';
const ASSETS = [
  '/?v=9', '/demo/?v=9', '/demo/index.html?v=9', '/demo/app.mjs?v=9', '/demo/styles.css?v=9',
  '/demo/browser-data-view.js?v=9', '/demo/browser-data-view.css?v=9', '/demo/manifest.webmanifest?v=9',
  '/src/index.mjs', '/src/errors.mjs', '/src/schema.mjs', '/src/query.mjs',
  '/src/projectors.mjs', '/src/engine.mjs', '/src/adapters/memory.mjs',
  '/src/adapters/indexeddb.mjs',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('agentic-base-') && key !== CACHE)
    .map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(caches.open(CACHE).then(async cache => {
    const url = new URL(request.url);
    const cached = await cache.match(request) ?? (request.mode === 'navigate'
      ? await cache.match(url.pathname, { ignoreSearch: true }) : null);
    return cached ?? fetch(request);
  }));
});
