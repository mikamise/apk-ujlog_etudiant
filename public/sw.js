// UJLOG Étudiants - Service Worker PWA
const CACHE_VERSION = 'ujlog-etudiants-v3.0.0';
const CACHE_STATIC_NAME = `static-${CACHE_VERSION}`;
const CACHE_PAGES_NAME = `pages-${CACHE_VERSION}`;
const USER_DOWNLOADS_CACHE_NAME = 'ujlog-course-files-v1';

const STATIC_ASSETS_TO_CACHE = [
  '/',
  '/onboarding',
  '/offline',
  '/manifest.json',
  '/LOGO-SITE.png',
  '/logo-ujlog.png',
  '/logo-geographie.jpg',
  '/logo-geographie.png',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-512-maskable.png',
  '/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC_NAME).then(async (cache) => {
      await Promise.allSettled(
        STATIC_ASSETS_TO_CACHE.map(async (asset) => {
          try {
            await cache.add(asset);
          } catch (error) {
            console.debug('[SW] Asset non précaché:', asset, error);
          }
        })
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cacheName) => {
          if (
            cacheName !== CACHE_STATIC_NAME &&
            cacheName !== CACHE_PAGES_NAME &&
            cacheName !== USER_DOWNLOADS_CACHE_NAME
          ) {
            return caches.delete(cacheName);
          }
          return undefined;
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (
    url.pathname.startsWith('/api/auth') ||
    url.pathname.startsWith('/api/admin') ||
    url.pathname.startsWith('/api/delegate') ||
    url.pathname.startsWith('/admin') ||
    url.pathname.startsWith('/super-admin') ||
    url.pathname.startsWith('/auth/') ||
    url.pathname === '/reset-password' ||
    url.pathname === '/invitation/accepter'
  ) {
    return;
  }

  const publicPage =
    url.pathname === '/' ||
    url.pathname === '/onboarding' ||
    url.pathname === '/conditions' ||
    url.pathname === '/offline' ||
    url.pathname === '/login' ||
    url.pathname === '/register' ||
    url.pathname === '/forgot-password' ||
    url.pathname === '/reset-password';

  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (publicPage && response.ok && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE_PAGES_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          if (!publicPage) return caches.match('/offline');
          return caches.match('/offline').then((offline) => offline || caches.match('/'));
        })
    );
    return;
  }

  if (
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'image' ||
    request.destination === 'font' ||
    /\.(?:png|jpg|jpeg|webp|svg|woff2?|ttf|css|js)$/.test(url.pathname)
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const networkResponse = fetch(request)
          .then((response) => {
            if (response.ok && response.type === 'basic') {
              const copy = response.clone();
              caches.open(CACHE_STATIC_NAME).then((cache) => cache.put(request, copy));
            }
            return response;
          })
          .catch(() => cachedResponse);

        return cachedResponse || networkResponse;
      })
    );
    return;
  }

  if (url.pathname.startsWith('/api/')) return;
});
