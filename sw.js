const CACHE_NAME = 'nicaflasher-mojoroto-v7';
const OFFLINE_URL = new URL('./halaman-offline.html', self.location).href;
const APP_SHELL = [
  new URL('./', self.location).href,
  new URL('./index.html', self.location).href,
  new URL('./ai-diagnostic.html', self.location).href,
  new URL('./admin-ai.html', self.location).href,
  new URL('./price-list.html', self.location).href,
  new URL('./hubungi-kami.html', self.location).href,
  OFFLINE_URL,
  new URL('./manifest.json', self.location).href,
  new URL('./img/icon-192.svg', self.location).href,
  new URL('./img/icon-512.svg', self.location).href,
  new URL('./img/Qris.jpg', self.location).href
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      await Promise.all(APP_SHELL.map(async url => {
        try {
          await cache.add(url);
        } catch (error) {
          console.warn('Precache gagal:', url, error);
        }
      }));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request).then(cached => cached || caches.match(OFFLINE_URL)))
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
      return response;
    }).catch(() => new Response('', { status: 503, statusText: 'Offline' })))
  );
});
