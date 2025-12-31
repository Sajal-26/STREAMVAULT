// StreamVault Service Worker
const CACHE_NAME = 'streamvault-v1';

self.addEventListener('install', (event) => {
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Claim any clients immediately, so that the page will be controlled by the service worker immediately
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Basic pass-through strategy. 
  // In a production app, we would cache assets here for offline support.
  // This fetch handler is required for the PWA install prompt to trigger.
  event.respondWith(fetch(event.request));
});