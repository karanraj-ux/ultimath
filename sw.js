const CACHE_NAME = 'ultimath-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// 1. Install Event: Save files to phone
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// 2. Fetch Event: Serve from phone if offline
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});