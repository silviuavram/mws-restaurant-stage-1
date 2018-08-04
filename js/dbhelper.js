var idb = require('idb');

const port = 1337 // Change this to your server port

let swReg;

document.addEventListener('DOMContentLoaded', (event) => {
  if (!navigator.serviceWorker) return;

  navigator.serviceWorker.register('sw.js').then(reg => {
    swReg = reg;
    console.log('service worker registered successfully');
  }).catch(reason => {
    console.log(`service worker failed to register because of ${reason}.`);
  })
});

let _idbPromise;

const getIdbPromise = () => {
  if (!_idbPromise) {
    _idbPromise = openIndexDB();
  }

  return _idbPromise;
}

const getRestaurantsDatabaseURL = id => {
  return `http://localhost:${port}/restaurants${id ? `/${id}` : ''}`;
}

const getReviewsDatabaseURL = id => {
  return `http://localhost:${port}/reviews${id ? `/?restaurant_id=${id}` : ''}`;
}

const getFavoriteDatabaseURL = (id, isFavorite) => {
  return `http://localhost:1337/restaurants/${id}/?is_favorite=${isFavorite}`;
}

function openIndexDB() {
  const objectStores = ['restaurants', 'reviews', 'pending-reviews'];

  return idb.open('restaurant-reviews', 1, upgradeDb => {
    objectStores.forEach(objectStore => {
      var store = upgradeDb.createObjectStore(objectStore, {
        keyPath: 'id'
      });
      store.createIndex('by-date', 'updatedAt');
    });
  });
}

function setRestaurantFavoriteStatus(restaurant) {
  const isFavorite = restaurant.is_favorite;
  const id = restaurant.id;

  return fetch(getFavoriteDatabaseURL(id, isFavorite), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json; charset=utf-8'
    }
  })
    .then(() => getIdbPromise())
    .then(db => {
      if (!db) return null;

      const objectStore = db.transaction('restaurants', 'readwrite').objectStore('restaurants');
      return objectStore.put(restaurant);
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
    return savePendingReview(review);
  });
}

function savePendingReview(review) {
  return getIdbPromise().then(db => {
    if (!db) return null;

    const objectStore = db.transaction('pending-reviews', 'readwrite').objectStore('pending-reviews');
    return objectStore.count().then(count => {
      review.id = count;
      return objectStore.put(review);
    });
  });
}

function fetchPendingReviews(id) {
  return getIdbPromise().then(db => {
    if (!db) return null;

    const objectStore = db.transaction('pending-reviews', 'readwrite').objectStore('pending-reviews');
    return objectStore.getAll().then(reviews => {
      return reviews.filter(review => review.restaurant_id === id);
    });
  });
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

function fetchReviews(id) {
  const networkPromise = fetchReviewsFromNetwork(id);

  return fetchReviewsFromIdb(id).then(reviews => {
    return reviews.length > 0 ? reviews : networkPromise;
  });
}

function fetchReviewsFromIdb(id) {
  return getIdbPromise().then(db => {
    if (!db) return null;

    const objectStore = db.transaction('reviews').objectStore('reviews');
    return objectStore.index('by-date').getAll().then(reviews => {
      return reviews.filter(review => review.restaurant_id === id);
    });
  });
}

function fetchReviewsFromNetwork(id) {
  return fetch(getReviewsDatabaseURL(id))
    .then(response => {
      response.clone().json().then(result => {
        getIdbPromise().then(db => {
          if (!db) return null;

          const objectStore = db.transaction('reviews', 'readwrite').objectStore('reviews');
          result.forEach(review => {
            objectStore.put(review);
          });
        });
      });

      return response.json();
    })
    .catch(error => console.error(`Failed to fetch reviews for restaurant ${id} with error ${error}`));
}

function fetchAllRestaurants() {
  const networkPromise = fetchAllRestaurantsFromNetwork();

  return fetchAllRestaurantsFromIdb().then(restaurants => {
    return restaurants.length > 0 ? restaurants : networkPromise;
  });
}

function fetchAllRestaurantsFromIdb() {
  return getIdbPromise().then(db => {
    if (!db) return null;

    const objectStore = db.transaction('restaurants').objectStore('restaurants');
    return objectStore.index('by-date').getAll();
  });
}

function fetchAllRestaurantsFromNetwork() {
  return fetch(getRestaurantsDatabaseURL())
    .then(response => {
      response.clone().json().then(result => {
        getIdbPromise().then(db => {
          if (!db) {
            return;
          }
          const objectStore = db.transaction('restaurants', 'readwrite').objectStore('restaurants');
          result.forEach(restaurant => {
            objectStore.put(restaurant);
          });
        });;
      });
      return response.json();
    })
    .catch(error => console.error(`Failed to fetch all restaurants with error ${error}`));
}

function fetchRestaurant(id) {
  const networkPromise = fetchRestaurantFromNetwork(id);

  return fetchRestaurantFromIdb(id).then(restaurant => {
    return restaurant || networkPromise;
  });
}

function fetchRestaurantFromIdb(id) {
  return getIdbPromise().then(db => {
    if (!db) return null;

    const objectStore = db.transaction('restaurants').objectStore('restaurants');
    return objectStore.get(parseInt(id));
  });
}

function fetchRestaurantFromNetwork(id) {
  return fetch(getRestaurantsDatabaseURL(id))
    .then(response => {
      response.clone().json().then(result => {
        getIdbPromise().then(db => {
          if (!db) return null;

          const objectStore = db.transaction('restaurants', 'readwrite').objectStore('restaurants');
          objectStore.put(result);
        });
      });

      return response.json();
    })
    .catch(error => console.error(`Failed to fetch restaurant id ${id} with error ${error}`));
}

/**
 * Common database helper functions.
 */
module.exports = class DBHelper {

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback, id) {
    (id ? fetchRestaurant(id) : fetchAllRestaurants())
      // .then(response => response.json())
      .then(result => {
        callback(null, result);
      }).catch(error => {
        callback(error, null);
      });
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    DBHelper.fetchRestaurants(callback, id);
  }

  /**
   * Fetch reviews by the restaurant's ID.
   */
  static fetchReviewsForRestaurant(id, callback) {
    fetchReviews(id).then(result => {
      // in case we have offline reviews saved, show them too and try to publish them.
      fetchPendingReviews(id).then(result2 => {
        callback(result.concat(result2));
      });
    });
  }

  static setRestaurantFavoriteStatus(restaurant) {
    setRestaurantFavoriteStatus(restaurant);
  }

  /**
   * Publishes a review on the server.
   */
  static publishReviewForRestaurant(review) {
    savePendingReview(review)
      .then(() => navigator.serviceWorker ? swReg.sync.register('publishReviews') : publishPendingReviews());
  }
  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    return (`/img/${restaurant.photograph}`);
  }

  /**
   * Restaurant responsive image URL
   */
  static imgUrlSetForRestaurant(restaurant) {
    // workaround for images that have no photograph property.
    const fileName = restaurant.photograph || restaurant.id;
    const fileExtension = 'jpg';
    return `/img/responsive/${fileName}-800-large.${fileExtension} 2x, /img/responsive/${fileName}-400-small.${fileExtension} 1x`;
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    // https://leafletjs.com/reference-1.3.0.html#marker  
    const marker = new L.marker([restaurant.latlng.lat, restaurant.latlng.lng],
      {
        title: restaurant.name,
        alt: restaurant.name,
        url: DBHelper.urlForRestaurant(restaurant)
      })
    marker.addTo(map);
    return marker;
  }

}

