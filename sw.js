const CACHE_NAME = 'holding-v21';
const APP_FILES = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './js/state.js',
  './js/calc.js',
  './js/api.js',
  './js/render.js',
  './js/chart.js',
  './js/i18n.js',
  './manifest.json',
];

// Same-origin app files plus the CDNs the app depends on to work offline.
const CACHED_ORIGINS = new Set([
  self.location.origin,
  'https://cdn.jsdelivr.net',
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com',
]);

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.allSettled(APP_FILES.map(url => cache.add(new Request(url)))))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (!CACHED_ORIGINS.has(new URL(event.request.url).origin)) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      const fresh = fetch(event.request)
        .then(response => {
          if (response.ok) {
            // Clone before the page consumes the body, otherwise clone() races against the reader and fails intermittently.
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)).catch(() => {});
          }
          return response;
        })
        .catch(() => cached);

      return cached || fresh;
    })
  );
});
