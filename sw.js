const staticCacheName = 'restaurant-reviews-cache';
const currentCache = `${staticCacheName}v1`;

self.addEventListener("install", event => {
  event.waitUntil(
    caches
      .open(staticCacheName)
      .then(cache => {
        return cache.addAll([
          '/',
          'js/dbhelper.js',
          'js/main.js',
          'js/restaurant_info.js',
          'index.html',
          'restaurant.html',
          'css/styles.css',
          'data/restaurants.json'
        ]);
      })
      .catch(err => {
        console.log(`install failed with error: ${err}`);
      })
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(cacheName => {
            return (
              cacheName.startsWith(staticCacheName) && cacheName != currentCache
            );
          })
          .map(function(cacheName) {
            return caches.delete(cacheName);
          })
      );
    })
  );
});

self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request)
      .then(response => {
        const clone = response.clone();        
        caches.open(currentCache).then(cache => {
          cache.put(event.request, clone).catch(err => {
            console.log(`error caching ${event.request.url} with err: ${err}`);
          });
        });
        return response;
      });
    })
  );
});
