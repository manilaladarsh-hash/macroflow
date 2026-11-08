// MacroFlow service worker (TypeScript -> sw.js): lets the app open and log food without a connection.
// - The app page, compiled TypeScript bundle, and Rust WebAssembly core: network first (updates show up immediately),
//   falling back to the last cached copy when offline.
// - Versioned library files from CDNs (fonts, icons, barcode reader): cache first.
// - Food databases and AI requests are never cached here.

const CACHE = 'macroflow-v2';
const SHELL: string[] = [
    './',
    'index.html',
    'config.js',
    'dist/app.js',
    'pkg/macroflow_core.wasm',
    'manifest.webmanifest',
    'icons/icon.svg',
    'icons/icon-192.png',
    'icons/icon-512.png'
];
const CDN_HOSTS: string[] = [
    'cdn.tailwindcss.com',
    'cdnjs.cloudflare.com',
    'fonts.googleapis.com',
    'fonts.gstatic.com',
    'cdn.jsdelivr.net',
    'fastly.jsdelivr.net'
];

const swSelf = self as unknown as ServiceWorkerGlobalScope;

swSelf.addEventListener('install', (event: ExtendableEvent) => {
    event.waitUntil(
        caches
            .open(CACHE)
            .then(cache => cache.addAll(SHELL))
            .then(() => swSelf.skipWaiting())
    );
});

swSelf.addEventListener('activate', (event: ExtendableEvent) => {
    event.waitUntil(
        caches
            .keys()
            .then(keys =>
                Promise.all(
                    keys
                        .filter(k => k.startsWith('macroflow-') && k !== CACHE)
                        .map(k => caches.delete(k))
                )
            )
            .then(() => swSelf.clients.claim())
    );
});

async function networkFirst(request: Request): Promise<Response> {
    const cache = await caches.open(CACHE);
    try {
        const response = await fetch(request);
        if (response && response.ok) cache.put(request, response.clone());
        return response;
    } catch (err) {
        const cached =
            (await cache.match(request, { ignoreSearch: true })) ||
            (request.mode === 'navigate' ? await cache.match('index.html') : null);
        if (cached) return cached;
        throw err;
    }
}

async function cacheFirst(request: Request): Promise<Response> {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(request, { ignoreVary: true });
    if (cached) return cached;
    const response = await fetch(request);
    // Opaque (no-cors) responses are fine to cache for scripts, styles and fonts.
    if (response && (response.ok || response.type === 'opaque')) {
        cache.put(request, response.clone());
    }
    return response;
}

// On the very first visit the page loads its CDN files before this worker controls
// it, so the page sends their URLs here to be cached for offline use. Font files
// are found inside the cached stylesheets.
async function precacheCdn(urls: string[]): Promise<void> {
    const cache = await caches.open(CACHE);
    const fonts: string[] = [];
    await Promise.all(
        urls.map(async url => {
            try {
                if (
                    !CDN_HOSTS.includes(new URL(url).hostname) ||
                    (await cache.match(url, { ignoreVary: true }))
                ) {
                    return;
                }
                let response: Response;
                try {
                    response = await fetch(url, { mode: 'cors', credentials: 'omit' }); // fonts need a CORS copy
                } catch (_err) {
                    response = await fetch(url, { mode: 'no-cors' });
                }
                if (!response || !(response.ok || response.type === 'opaque')) return;
                if (/text\/css/.test(response.headers.get('content-type') || '')) {
                    const css = await response.clone().text();
                    for (const m of css.matchAll(/url\((['"]?)([^'")]+?\.woff2)\1\)/g)) {
                        fonts.push(new URL(m[2], url).href);
                    }
                }
                await cache.put(url, response);
            } catch (_err) {
                /* skip this file; it is cached the next time it loads */
            }
        })
    );
    if (fonts.length) await precacheCdn([...new Set(fonts)]);
}

swSelf.addEventListener('message', (event: ExtendableMessageEvent) => {
    const data = (event.data || {}) as { type?: string; urls?: string[] };
    if (data.type === 'precache' && Array.isArray(data.urls)) {
        event.waitUntil(precacheCdn(data.urls.slice(0, 100)));
    }
});

swSelf.addEventListener('fetch', (event: FetchEvent) => {
    const { request } = event;
    if (request.method !== 'GET') return;
    const url = new URL(request.url);
    if (url.origin === swSelf.location.origin) {
        event.respondWith(networkFirst(request));
    } else if (CDN_HOSTS.includes(url.hostname)) {
        event.respondWith(cacheFirst(request));
    }
});
