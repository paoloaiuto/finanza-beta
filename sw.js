
const CACHE = 'finanza-beta-v06';

const FILES = [
  './',
  './index.html',
  './manifest.webmanifest'
];

const INDEX_URL = new URL('./index.html', self.registration.scope).href;

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key =>
            key.startsWith('finanza-beta-') &&
            key !== CACHE
          )
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  // Per le pagine HTML: prima Internet, poi cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();

            caches.open(CACHE).then(cache =>
              cache.put(INDEX_URL, copy)
            );
          }

          return response;
        })
        .catch(() =>
          caches.match(request)
            .then(cached =>
              cached || caches.match(INDEX_URL)
            )
        )
    );

    return;
  }

  // Per gli altri file: cache prima, rete dopo
  event.respondWith(
    caches.match(request)
      .then(cached =>
        cached || fetch(request).then(response => {
          if (response.ok) {
            const copy = response.clone();

            caches.open(CACHE).then(cache =>
              cache.put(request, copy)
            );
          }

          return response;
        })
      )
  );
});
