// StreamVault Service Worker
const CACHE_NAME = 'streamvault-static-v2';
const IMAGE_CACHE = 'streamvault-images-v1';

self.addEventListener('install', (event) => {
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Claim any clients immediately
  event.waitUntil(
      Promise.all([
          clients.claim(),
          // Cleanup old caches
          caches.keys().then((cacheNames) => {
              return Promise.all(
                  cacheNames.map((cacheName) => {
                      if (cacheName !== CACHE_NAME && cacheName !== IMAGE_CACHE) {
                          return caches.delete(cacheName);
                      }
                  })
              );
          })
      ])
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Cache First for TMDB Images (Huge performance boost for lists)
  if (url.hostname === 'image.tmdb.org') {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async (cache) => {
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        try {
            const networkResponse = await fetch(event.request);
            // Only cache valid responses
            if (networkResponse.ok) {
                cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
        } catch (error) {
            // Return placeholder or nothing on offline/error
            return new Response('', { status: 404 });
        }
      })
    );
    return;
  }

  // 2. Stale-While-Revalidate for JS/CSS (App Shell)
  if (event.request.destination === 'script' || event.request.destination === 'style' || event.request.destination === 'document') {
      event.respondWith(
          caches.match(event.request).then((cachedResponse) => {
              const fetchPromise = fetch(event.request).then((networkResponse) => {
                  caches.open(CACHE_NAME).then((cache) => {
                      cache.put(event.request, networkResponse.clone());
                  });
                  return networkResponse;
              });
              return cachedResponse || fetchPromise;
          })
      );
      return;
  }

  // 3. Network First for API Calls (Proxies)
  // We want fresh data, but we rely on the in-app retry logic for failures.
  event.respondWith(fetch(event.request));
});