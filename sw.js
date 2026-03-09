// BàsquetStats — Service Worker
const CACHE = 'bqstats-v1';
const ASSETS = [
  '/bqstats/',
  '/bqstats/index.html',
  '/bqstats/manifest.json',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      Promise.allSettled(ASSETS.map(u => c.add(u).catch(() => {})))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Per a Firebase i APIs externes, sempre xarxa
  if (e.request.url.includes('firebase') ||
      e.request.url.includes('google') ||
      e.request.url.includes('gstatic') ||
      e.request.url.includes('fonts')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }
  // Per a la resta: caché primer, xarxa com a fallback
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
