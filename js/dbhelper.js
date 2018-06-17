var idb = require('idb');

document.addEventListener('DOMContentLoaded', (event) => {
  if (!navigator.serviceWorker) return;

  navigator.serviceWorker.register('sw.js').then(reg => {
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

const getDatabaseURL = id => {
  const port = 1337 // Change this to your server port
  return `http://localhost:${port}/restaurants${id ? `/${id}` : ''}`;
}

function openIndexDB() {
  return idb.open('restaurant-reviews', 1, upgradeDb => {
    var store = upgradeDb.createObjectStore('restaurants', {
      keyPath: 'id'
    });
    store.createIndex('by-date', 'updatedAt');
  });
}

function fetchAllRestaurants() {
  const networkPromise = fetchFromNetwork();

  return fetchFromIdb().then(restaurants => {
    return restaurants || networkPromise;
  });
}

function fetchFromIdb() {
  return getIdbPromise().then(db => {
    if (!db) return null;

    const objectStore = db.transaction('restaurants').objectStore('restaurants');
    return objectStore.index('by-date').getAll();
  });
}

function fetchFromNetwork() {
  return fetch(getDatabaseURL())
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
    .catch(error => {
      console.log(`error in fetchFromNetwork: ${error}`);
    });
}

function fetchRestaurant(id) {
  return fetchItemFromIdb(id).then(restaurant => {
    return restaurant || fetchItemFromNetwork(id);
  });
}

function fetchItemFromIdb(id) {
  return getIdbPromise().then(db => {
    if (!db) return null;

    const objectStore = db.transaction('restaurants').objectStore('restaurants');
    return objectStore.get(id);
  });
}

function fetchItemFromNetwork(id) {
  return fetch(getDatabaseURL(id))
    .then(response => {
      response.clone().json().then(result => {
        getIdbPromise().then(db => {
          if (!db) return null;

          const objectStore = db.transaction('restaurants', 'readwrite').objectStore('restaurants');
          objectStore.put(result);
        });
      });

      return response.json();
    });
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
      {title: restaurant.name,
      alt: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant)
      })
      marker.addTo(map);
    return marker;
  }

}

