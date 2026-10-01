const CACHE_NAME = 'macroflow-v4-__BUILD__';
const PRECACHE = __PRECACHE_ASSETS__;

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE)));
});

self.addEventListener('message', event => {
  if (event.data?.type === 'MACROFLOW_ACTIVATE_UPDATE') event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith('macroflow-') && key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.search) return;
  const isNavigation = request.mode === 'navigate';
  const isStaticAsset = /\.(?:html|js|css|woff2?|png|webp|jpe?g|ico|webmanifest)$/i.test(url.pathname);
  if (!isNavigation && !isStaticAsset) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cacheKey = isNavigation ? '/index.html' : url.pathname;
    const cached = await cache.match(cacheKey);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response.ok && response.type === 'basic' && isStaticAsset) {
        await cache.put(url.pathname, response.clone());
      }
      return response;
    } catch (_) {
      if (isNavigation) return (await cache.match('/index.html')) || Response.error();
      return Response.error();
    }
  })());
});
