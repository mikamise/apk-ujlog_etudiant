// UJLOG Étudiants - Service Worker PWA Production Ready
const CACHE_VERSION = 'ujlog-etudiants-v1.0.1';
const CACHE_STATIC_NAME = `static-${CACHE_VERSION}`;
const CACHE_PAGES_NAME = `pages-${CACHE_VERSION}`;

// Pre-cache core static assets
const STATIC_ASSETS_TO_CACHE = [
  '/',
  '/dashboard',
  '/manifest.json',
  '/LOGO-SITE.png',
  '/logo-ujlog.png',
  '/logo-geographie.jpg',
  '/logo-geographie.png',
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS_TO_CACHE).catch((err) => {
        console.debug('[SW] Pre-cache skip non-critical asset:', err);
      });
    })
  );
  self.skipWaiting();
});

// Nom du cache Cache Storage utilisé par lib/offline-downloads.ts pour les
// fichiers explicitement téléchargés par l'utilisateur — protégé du
// nettoyage automatique ci-dessous, qui ne concerne que les caches internes
// de l'application (assets statiques, pages), jamais les fichiers de
// l'utilisateur.
const USER_DOWNLOADS_CACHE_NAME = 'ujlog-course-files-v1';

// Activate Event - Purge obsolete cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (
            cacheName !== CACHE_STATIC_NAME &&
            cacheName !== CACHE_PAGES_NAME &&
            cacheName !== USER_DOWNLOADS_CACHE_NAME
          ) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Message Listener for SW Skip Waiting
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch Event - Smart Partitioning & Cache Security
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle GET requests only
  if (request.method !== 'GET') return;

  // 1. SECURITY & PRIVACY RULE: NEVER CACHE AUTHENTICATED OR ADMIN ENDPOINTS
  if (
    url.pathname.startsWith('/api/auth') ||
    url.pathname.startsWith('/api/admin') ||
    url.pathname.startsWith('/api/delegate') ||
    url.pathname.startsWith('/admin') ||
    url.pathname.startsWith('/super-admin')
  ) {
    // Direct network pass-through for sensitive/admin routes
    return;
  }

  // 2. HTML Page Navigation (Network First with Cache Fallback)
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE_PAGES_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            return cachedResponse || caches.match('/dashboard') || caches.match('/');
          });
        })
    );
    return;
  }

  // 3. Static Assets (Scripts, Styles, Images, Fonts) - Stale-While-Revalidate
  if (
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'image' ||
    request.destination === 'font' ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.json')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse.ok && networkResponse.type === 'basic') {
              const copy = networkResponse.clone();
              caches.open(CACHE_STATIC_NAME).then((cache) => cache.put(request, copy));
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 4. Public API Read Requests (Network First)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match(request);
      })
    );
    return;
  }
});

