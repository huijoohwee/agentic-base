const CACHE = 'agentic-base-app-v5';
const ASSETS = [
  '/', '/demo/', '/demo/index.html', '/demo/app.mjs?v=5', '/demo/styles.css?v=5', '/demo/manifest.webmanifest',
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
  event.respondWith(caches.match(request).then(cached => cached ?? fetch(request)));
});
