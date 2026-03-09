// BàsquetStats Service Worker — v2
const CACHE_STATIC = 'bqstats-static-v2';
const CACHE_FONTS  = 'bqstats-fonts-v2';

const STATIC_ASSETS = [
  '/bqstats/',
  '/bqstats/index.html',
  '/bqstats/manifest.json',
  '/bqstats/icon-192.png',
  '/bqstats/icon-512.png',
];

// Install: pre-cache app shell
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_STATIC).then(cache =>
      Promise.allSettled(STATIC_ASSETS.map(u => cache.add(u).catch(() => {})))
    ).then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', e => {
  const keep = [CACHE_STATIC, CACHE_FONTS];
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => !keep.includes(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Fetch strategy
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Firebase / Google APIs — always network, no cache
  if (url.includes('firebase') || url.includes('firestore') ||
      url.includes('identitytoolkit') || url.includes('securetoken') ||
      url.includes('googleapis.com/google.firestore')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Fonts & CDN — cache first, long-lived
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

  // App shell — cache first, update in background (stale-while-revalidate)
  if (url.includes('maxmb1703.github.io') || url.startsWith(self.location.origin)) {
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

  // Default: network
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
