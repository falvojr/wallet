const CACHE_NAME = 'holding-v4';
const APP_FILES = [
  './index.html',
  './style.css',
  './app.js',
  './js/state.js',
  './js/calc.js',
  './js/api.js',
  './js/render.js',
  './js/i18n.js',
  './manifest.json',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(cache => Promise.allSettled(APP_FILES.map(url => cache.add(new Request(url))))),
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const freshResponse = fetch(event.request)
        .then(response => {
          if (response.ok) {
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
          }
          return response;
        })
        .catch(() => cachedResponse);

      return cachedResponse || freshResponse;
    }),
  );
});
