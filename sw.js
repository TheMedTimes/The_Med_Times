const CACHE_NAME = 'themedtimes-v18';
const ASSETS = [
  '/The_Med_Times/',
  '/The_Med_Times/index.html',
  '/The_Med_Times/manifest.json',
  '/The_Med_Times/icons/icon-192x192.png',
  '/The_Med_Times/icons/icon-512x512.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  // Don't skipWaiting here — we let the app trigger it via postMessage
  // so the reload happens at a controlled point (fix 5)
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fix 5: Listen for SKIP_WAITING from the app so we can activate
// the new SW immediately and let the app reload cleanly
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Always fetch puzzle JSON fresh from network — never serve from cache
  if (url.pathname.includes('/puzzles/')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).catch(() => caches.match(event.request))
    );
    return;
  }

  // For everything else: cache-first, update cache in background
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
