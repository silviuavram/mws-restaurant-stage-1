const staticCacheName = 'restaurant-reviews-cache';
const currentCache = `${staticCacheName}v2`;

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(currentCache)
      .then(cache => {
        return cache.addAll([
          '/',
          'restaurant.html',
          'dist/js/dbhelper.js',
          'dist/js/main.js',
          'dist/js/restaurant_info.js',
          'css/styles.css'
        ]);
      })
      .catch(err => {
        console.log(`install failed with error: ${err}`);
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(cacheName => cacheName.startsWith(staticCacheName) && cacheName != currentCache)
          .map(cacheName => caches.delete(cacheName))
      );
    })
  );
});

self.addEventListener('fetch', event => {
  const requestIsGet = event.request.method === 'GET';
  event.respondWith(!requestIsGet ? fetch(event.request) :
    caches.match(event.request).then(response => {
      const networkFetch = fetch(event.request).then(response => {
        const clone = response.clone();
        caches.open(currentCache).then(cache => {
          cache.put(event.request, clone).catch(err => {
            console.log(`error caching ${event.request.url} with err: ${err}`);
          });
        });
        return response;
      });

      return response || networkFetch;
    })
  );
});
