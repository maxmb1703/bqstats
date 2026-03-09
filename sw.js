// BàsquetStats Service Worker — v3
const CACHE_STATIC = 'bqstats-static-v3';
const CACHE_FONTS  = 'bqstats-fonts-v3';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_STATIC).then(cache =>
      Promise.allSettled(STATIC_ASSETS.map(u => cache.add(u).catch(() => {})))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  const keep = [CACHE_STATIC, CACHE_FONTS];
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => !keep.includes(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Firebase — sempre xarxa, mai caché
  if (url.includes('firebase') || url.includes('firestore') ||
      url.includes('identitytoolkit') || url.includes('securetoken') ||
      url.includes('googleapis.com/google.firestore')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Fonts & CDN — caché permanent
  if (url.includes('fonts.googleapis') || url.includes('fonts.gstatic') ||
      url.includes('cdnjs.cloudflare')) {
    e.respondWith(
      caches.open(CACHE_FONTS).then(cache =>
        cache.match(e.request).then(cached => {
          if (cached) return cached;
          return fetch(e.request).then(res => {
            cache.put(e.request, res.clone());
            return res;
          });
        })
      )
    );
    return;
  }

  // App shell — caché primer, actualitza en segon pla
  if (url.includes('bqstats.pages.dev') || url.startsWith(self.location.origin)) {
    e.respondWith(
      caches.open(CACHE_STATIC).then(cache =>
        cache.match(e.request).then(cached => {
          const fetchPromise = fetch(e.request).then(res => {
            if (res.ok) cache.put(e.request, res.clone());
            return res;
          }).catch(() => cached);
          return cached || fetchPromise;
        })
      )
    );
    return;
  }

  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
