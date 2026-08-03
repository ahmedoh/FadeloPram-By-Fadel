const CACHE_NAME = 'fadelopram-cache-v2';
const ASSETS = [
  'index.html',
  'admin.html',
  'dashboard.html',
  'config.js',
  'style.css',
  'fadelopram_logo.jpg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Use try/catch because if any asset fails to fetch, the installation won't break
      return cache.addAll(ASSETS).catch(err => console.log("SW Install cache error:", err));
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  // Let the browser handle standard non-GET requests or external API calls normally
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) {
    return;
  }
  e.respondWith(
    fetch(e.request).catch(() => {
      return caches.match(e.request);
    })
  );
});
