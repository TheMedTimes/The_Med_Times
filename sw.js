const CACHE_NAME = 'themedtimes-v23';

// App shell — always cached locally
const ASSETS = [
  '/The_Med_Times/',
  '/The_Med_Times/index.html',
  '/The_Med_Times/manifest.json',
  '/The_Med_Times/icons/icon-192x192.png',
  '/The_Med_Times/icons/icon-512x512.png',
];

// External CDN scripts — cached on first load, served locally after that.
// This is what makes the app load fast on iOS Safari cold starts.
const CDN_SCRIPTS = [
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://unpkg.com/lucide@latest/dist/umd/lucide.min.js',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).then(() => {
        // Cache CDN scripts in background — don't block install if CDN is slow
        CDN_SCRIPTS.forEach(url => {
          fetch(url).then(r => { if(r.ok) cache.put(url, r); }).catch(() => {});
        });
      });
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Puzzle JSON — always fetch fresh, fall back to cache if offline
  if (url.pathname.includes('/puzzles/')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // CDN scripts (external origin) — cache first so they load instantly
  if (url.origin !== self.location.origin) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // App shell — cache first
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
