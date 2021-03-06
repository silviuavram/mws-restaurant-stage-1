let restaurants,
  neighborhoods,
  cuisines;
var newMap;
var markers = [];

var DBHelper = require('./dbhelper');

const observerOptions = {
  root: document.querySelector('#restaurants-list'),
  rootMargin: '10px 0px',
  threshold: 0.25
};

const handleIntersection = entries => {
  entries.forEach(entry => {
    if (entry.intersectionRatio > 0) {
      const image = entry.target;

      image.srcset = image.dataset.srcset;
      image.src = image.dataset.src;
    }
  })
}
const observer = new IntersectionObserver(handleIntersection, observerOptions);

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  initMap(); // added 
  fetchNeighborhoods();
  fetchCuisines();
});

/**
 * Fetch all neighborhoods and set their HTML.
 */
const fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) { // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
}

/**
 * Set neighborhoods HTML.
 */
const fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
}

/**
 * Fetch all cuisines and set their HTML.
 */
const fetchCuisines = () => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
}

/**
 * Set cuisines HTML.
 */
const fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
}

/**
 * Initialize leaflet map, called from HTML.
 */
const initMap = () => {
  self.newMap = L.map('map', {
        center: [40.722216, -73.987501],
        zoom: 12,
        scrollWheelZoom: false
      });
  L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token=pk.eyJ1Ijoic2lsdml1YXZyYW0iLCJhIjoiY2ppaG8zMjg2MTdvajNxdXBwaWg5ZG1meSJ9.rh3wHVDy1SzEifsBL27MHw', {
    mapboxToken: 'pk.eyJ1Ijoic2lsdml1YXZyYW0iLCJhIjoiY2ppaG8zMjg2MTdvajNxdXBwaWg5ZG1meSJ9.rh3wHVDy1SzEifsBL27MHw',
    maxZoom: 18,
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
      '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
      'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    id: 'mapbox.streets'
  }).addTo(self.newMap);

  updateRestaurants();
}

/**
 * Update page and map for current restaurants.
 */
const updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
    }
  })
}

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
const resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  if (self.markers) {
    self.markers.forEach(marker => marker.remove());
  }
  self.markers = [];
  self.restaurants = restaurants;
}

/**
 * Create all restaurants HTML and add them to the webpage.
 */
const fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
  addMarkersToMap();
}

/**
 * Create restaurant HTML.
 */
const createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li');

  const image = document.createElement('img');
  image.className = 'restaurant-img';
  image.dataset.srcset = DBHelper.imgUrlSetForRestaurant(restaurant);
  image.dataset.src = DBHelper.imageUrlForRestaurant(restaurant);
  image.alt = `An image of ${restaurant.name}`;
  observer.observe(image);
  li.append(image);

  const div = document.createElement('div');
  div.className = 'restaurant-info';

  const name = document.createElement('h2');
  name.innerHTML = restaurant.name;
  div.append(name);

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  div.append(neighborhood);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  div.append(address);

  const moreAndFavContainer = document.createElement('div');
  moreAndFavContainer.classList.add('more-fav-container');
  const more = document.createElement('a');
  more.innerHTML = 'View Details';
  more.href = DBHelper.urlForRestaurant(restaurant);
  more.setAttribute('aria-label', `View details of ${restaurant.name}`);
  moreAndFavContainer.append(more);
  const favIcon = document.createElement('span');
  favIcon.classList.add('glyphicon', `glyphicon-heart${restaurant.is_favorite === 'true' ? '' : '-empty'}`, 'fav-icon');
  favIcon.setAttribute('tabindex', '0');
  favIcon.addEventListener('click', event => {
    if (restaurant.is_favorite === 'true') {
      restaurant.is_favorite = 'false';
      favIcon.classList.remove('glyphicon-heart');
      favIcon.classList.add('glyphicon-heart-empty');
    } else {
      restaurant.is_favorite = 'true';
      favIcon.classList.remove('glyphicon-heart-empty');
      favIcon.classList.add('glyphicon-heart');
    }
    DBHelper.setRestaurantFavoriteStatus(restaurant);
  });
  moreAndFavContainer.append(favIcon);
  div.append(moreAndFavContainer);

  li.append(div);

  return li;
}

/**
 * Add markers for current restaurants to the map.
 */
const addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.newMap);
    marker.on("click", onClick);
    function onClick() {
      window.location.href = marker.options.url;
    }
    self.markers.push(marker);
  });
}
