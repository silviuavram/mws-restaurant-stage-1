const staticCacheName = 'restaurant-reviews-cache';
const currentCache = `${staticCacheName}v3`;

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(currentCache)
      .then(cache => {
        return cache.addAll([
          '/',
          'restaurant.html',
          'js/dbhelper.js',
          'js/main.js',
          'js/restaurant_info.js',
          'js/idb.js',
          'css/styles.css'
        ]);
      })
      .then(() => {
        _idbPromise = openIndexDB();
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
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request).then(response => {
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
