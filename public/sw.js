// SMS Portal - Service Worker for Offline CBT Support
// Caches CBT-related pages and assets so students can use CBT offline

const CACHE_NAME = 'sms-cbt-cache-v1';
const OFFLINE_URL = '/offline.html';

// Routes that should be cached for offline CBT use
const CBT_ROUTES = [
  '/cbt',
  '/cbt/',
  '/student/cbt',
  '/student/cbt/',
  '/check-result',
  '/check-result/',
];

// Static assets to always cache
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/index.html',
];

// Install: cache critical assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching offline assets');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Pre-cache failed for some assets:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// Fetch: serve from cache when offline
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle same-origin or Firebase requests
  if (event.request.method !== 'GET') return;

  // For navigation requests (page loads)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache CBT routes for offline use
          const pathname = url.pathname;
          const isCBTRoute = CBT_ROUTES.some(
            (route) => pathname === route || pathname.startsWith(route)
          );

          if (isCBTRoute && response.ok) {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, cloned);
              console.log('[SW] Cached CBT route:', pathname);
            });
          }

          return response;
        })
        .catch(() => {
          // Offline: try to serve from cache
          return caches.match(event.request).then((cached) => {
            if (cached) return cached;
            // For CBT routes, serve cached index
            const pathname = url.pathname;
            const isCBTRoute = CBT_ROUTES.some(
              (route) => pathname === route || pathname.startsWith(route)
            );
            if (isCBTRoute) {
              return caches.match('/') || caches.match('/index.html');
            }
            return caches.match(OFFLINE_URL);
          });
        })
    );
    return;
  }

  // For static assets (JS, CSS, images)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
          }
          return response;
        })
        .catch(() => cached || new Response('Offline', { status: 503 }));
    })
  );
});

// Listen for messages from the app
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();

  // Cache specific CBT exam data on demand
  if (event.data?.type === 'CACHE_CBT_DATA') {
    caches.open(CACHE_NAME).then((cache) => {
      const urls = event.data.urls || [];
      urls.forEach((url) => {
        fetch(url).then((response) => {
          if (response.ok) cache.put(url, response);
        }).catch(() => {});
      });
    });
  }
});
