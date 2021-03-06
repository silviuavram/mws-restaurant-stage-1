let restaurant;
var newMap;
var DBHelper = require('./dbhelper');

/**
 * Initialize map as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {  
  initMap();
});

/**
 * Initialize leaflet map
 */
const initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {      
      self.newMap = L.map('map', {
        center: [restaurant.latlng.lat, restaurant.latlng.lng],
        zoom: 16,
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
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.newMap);
    }
  });
}

/**
 * Get current restaurant from page URL.
 */
const fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    const error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant)
    });
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
const fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img'
  image.srcset = DBHelper.imgUrlSetForRestaurant(restaurant);  
  image.src = DBHelper.imageUrlForRestaurant(restaurant);
  image.alt = restaurant.name;

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }

  DBHelper.fetchReviewsForRestaurant(restaurant.id, reviews => {
    // fill reviews
    fillReviewsHTML(reviews);
  });
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
const fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
const fillReviewsHTML = (reviews = self.restaurant.reviews) => {
  const container = document.getElementById('reviews-container');

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    noReviews.id = 'no-reviews-text';
    container.appendChild(noReviews);
  } else {
    const ul = document.getElementById('reviews-list');
    reviews.forEach(review => {
      ul.appendChild(createReviewHTML(review));
    });
    container.appendChild(ul);
  }
  addSendReviewCallback();
}

/**
 * Create review HTML and add it to the webpage.
 */
const createReviewHTML = (review) => {
  const li = document.createElement('li');
  const name = document.createElement('p');
  name.innerHTML = review.name;
  li.appendChild(name);

  const date = document.createElement('p');
  const reviewDate = new Date(review.updatedAt);
  const dateString = `${reviewDate.getUTCFullYear()}/${reviewDate.getUTCMonth() + 1}/${reviewDate.getUTCDate()} ${reviewDate.getUTCHours()}:${reviewDate.getUTCMinutes()}`;
  date.innerHTML = dateString;
  li.appendChild(date);

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  return li;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
const fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  li['aria-current'] = 'page';
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
const getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

const addSendReviewCallback = () => {
  const button = document.getElementById('review-submit-button');
  button.addEventListener('click', event => {
    event.preventDefault();

    const nameElement = document.getElementById('review-submit-name');
    const name = nameElement.value;
    if (name === '') {
      nameElement.classList.add('invalid');
      return;
    } else {
      nameElement.classList.remove('invalid');
    }
    const commentsElement = document.getElementById('review-submit-comment');
    const comments = commentsElement.value;
    if (comments === '') {
      commentsElement.classList.add('invalid');
      return;
    } else {
      nameElement.classList.remove('invalid');
    }
    const ratingElement = document.getElementById('review-submit-rating');

    const ul = document.getElementById('reviews-list');
    nameElement.value = '';
    commentsElement.value = '';
    ratingElement.selectedIndex = ratingElement.options.length - 1;
    const review = {
      name,
      rating: ratingElement.options[ratingElement.selectedIndex].value,
      updatedAt: new Date(),
      comments,
      restaurant_id: self.restaurant.id
    };
    ul.appendChild(createReviewHTML(review));
    const noReviewsText = document.getElementById('no-reviews-text');
    if (noReviewsText) {
      noReviewsText.remove();
    }
    DBHelper.publishReviewForRestaurant(review);
  });
}
