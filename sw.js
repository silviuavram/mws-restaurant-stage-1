const staticCacheName = 'restaurant-reviews-cache';
const currentCache = `${staticCacheName}v1`;

const getIdbPromise = () => {
  if (!_idbPromise) {
    _idbPromise = idb.open('restaurant-reviews', 1);
  }

  return _idbPromise;
}

let _idbPromise;

importScripts('./js/idb.js');

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(currentCache)
      .then(cache => {
        return cache.addAll([
          '/',
          'js/dbhelper.js',
          'js/main.js',
          'js/restaurant_info.js',
          'js/idb.js',
          'index.html',
          'restaurant.html',
          'css/styles.css',
          'data/restaurants.json'
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
  const url = new URL(event.request.url);
  if (url.pathname.match(/\/restaurants$/)) {
    event.respondWith(fetchAllRestaurants(url));
  } else if (url.pathname.match(/\/restaurants\/\d+$/)) {
    event.respondWith(fetchRestaurant(url));
  } else {
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
  }
});

function openIndexDB() {
  return idb.open('restaurant-reviews', 1, upgradeDb => {
    var store = upgradeDb.createObjectStore('restaurants', {
      keyPath: 'id'
    });
    store.createIndex('by-date', 'updatedAt');
  });
}

function fetchAllRestaurants(url) {
  return fetchFromIdb().then(restaurants => {
    return (restaurants && restaurants.length > 0) ? new Response(JSON.stringify(restaurants)) : fetchFromNetwork(url);
  });
}

function fetchFromIdb() {
  return getIdbPromise().then(db => {
    if (!db) return null;

    const objectStore = db.transaction('restaurants').objectStore('restaurants');
    return objectStore.index('by-date').getAll();
  });
}

function fetchFromNetwork(url) {
  return fetch(url)
    .then(response => {
      response.clone().json().then(result => {
        getIdbPromise().then(db => {
          if (!db) return null;

          const objectStore = db.transaction('restaurants', 'readwrite').objectStore('restaurants');
          result.forEach(restaurant => {
            objectStore.put(restaurant);
          });
        });;
      });

      return response;
    });
}

function fetchRestaurant(url) {
  const urlTokens = url.pathname.split('/');
  const id = parseInt(urlTokens[urlTokens.length - 1]);

  return fetchItemFromIdb(id).then(restaurant => {
    return restaurant ? new Response(JSON.stringify(restaurant)) : fetchItemFromNetwork(url);
  });
}

function fetchItemFromIdb(id) {
  return getIdbPromise().then(db => {
    if (!db) return null;

    const objectStore = db.transaction('restaurants').objectStore('restaurants');
    return objectStore.get(id);
  });
}

function fetchItemFromNetwork(url) {
  return fetch(url)
    .then(response => {
      response.clone().json().then(result => {
        getIdbPromise().then(db => {
          if (!db) return null;

          const objectStore = db.transaction('restaurants', 'readwrite').objectStore('restaurants');
          objectStore.put(result);
        });
      });

      return response;
    });
}
