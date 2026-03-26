const CACHE_NAME = 'holding-v10';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled([
        cache.add(new Request('./index.html')),
        cache.add(new Request('./style.css')),
        cache.add(new Request('./app.js')),
        cache.add(new Request('./js/state.js')),
        cache.add(new Request('./js/calc.js')),
        cache.add(new Request('./js/api.js')),
        cache.add(new Request('./js/render.js')),
        cache.add(new Request('./manifest.json')),
      ])
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = e.request.url;
  if (url.includes('brapi.dev') || url.includes('finnhub.io') || url.includes('awesomeapi')) return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
