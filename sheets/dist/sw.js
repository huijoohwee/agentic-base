const CACHE = 'agentic-sheets-static-e3ad3819b32283e25bee24a4';
const ASSETS = ["./index.html","./app.mjs","./styles.css","./core.mjs","./schema.mjs","./formula.mjs","./storage.mjs","./manifest.webmanifest","./shared-ui-profile.css","./LICENSE","./LICENSE.design-system","./artifact-manifest.json"];
const scope = new URL(self.registration.scope);
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(names => Promise.all(names.filter(name => name.startsWith('agentic-sheets-static-') && name !== CACHE)
    .map(name => caches.delete(name)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const { request } = event, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  event.respondWith(caches.open(CACHE).then(async cache => {
    const navigation = request.mode === 'navigate' && [scope.pathname, `${scope.pathname}index.html`].includes(url.pathname);
    return (await cache.match(navigation ? new URL('index.html', scope).href : request)) ?? fetch(request);
  }));
});
