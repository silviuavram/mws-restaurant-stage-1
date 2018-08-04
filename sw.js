const staticCacheName = 'restaurant-reviews-cache';
const currentCache = `${staticCacheName}v1`;
const port = 1337 // Change this to your server port

self.importScripts('./node_modules/idb/lib/idb.js');

const getIdbPromise = () => {
  return idb.open('restaurant-reviews', 1);
}

const getReviewsDatabaseURL = id => {
  return `http://localhost:${port}/reviews${id ? `/?restaurant_id=${id}` : ''}`;
}

function publishPendingReviews() {
  return getIdbPromise().then(db => {
    if (!db) return null;

    const objectStore = db.transaction('pending-reviews', 'readwrite').objectStore('pending-reviews');
    return objectStore.getAll().then(reviews => {
      reviews.forEach(review => {
        review.id = undefined; // needed id for idb, removing it when sending to server.
        publishReview(review);
      })
      return objectStore.clear();
    });
  });
}

function publishReview(review) {
  return fetch(getReviewsDatabaseURL(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8'
    },
    body: JSON.stringify(review)
  }).catch(error => {
    console.error(`Failed to publish review with error: ${error}`);
  });
}

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

self.addEventListener('sync', event => {
  if (event.tag == 'publishReviews') {
    event.waitUntil(publishPendingReviews());
  }
});