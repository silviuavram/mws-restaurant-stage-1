# Mobile Web Specialist Certification Course
---
#### _Three Stage Course Material Project - Restaurant Reviews_

# Responsiveness and styling

## Restaurants list

### Overall style

I've given minimums on width and height for the website, 320px and 800px. From there I've styled top down by setting some height pixel values for footer and header, while giving the two container elements percentages minus the header and footer sizes. The width is, for start, 100% for everything. The restaurants list is scrollable on Y.

### Breakpoints

First worth mentioning are the two breakpoints that happen on restaurants list. On 410 and 620 width (starting width for each image is 200 px and margin between the items is 10px) I've increased the number of containers on each row to 2 and 3.

On 620 breakpoint I've also modified the styling of header, footer and filter containers to give me more height and make use of the increased witdh. The height I've gained this way I've distributed it back to the map and restaurants containers by updating CSS variables in the calc() functions for their widths.

On 990 I've done the major surjery to the layour, I've split the width for the map and restaurants, giving them half each, minus the margin between them. Also for the restaurant items I've now changed their containers to make better use of the large width. Still scrollable on the Y axis.

At width larger than 1320px I've made the width static 1320px and added auto margins to the whole body.

### Images and srcset

Since the given images are 800 x 600 natural size, I did not bother very much with their resize. I've only created 400 x 300 equivalents, which I serve on 1 DPR devices. The fact that I use the images with width between 200 and 400 and that the natural images were not that much large made my decision to only resize for DPR purposes.

## Restaurant details

### Overall style

At the start of width, 320px, I use 100% width for everything. For height, I've applied the same top-down strategy as before, by giving the header and footer fixed css values, then percentages to the 3 containers, map, restaurant and reviews. The last 2 are scrollable on Y.

### Breakpoints

On 620px breakpoint I've split the restaurant and reviews on width, by giving each of them 50% minus their margins. The map still covers 100% of width.

On 990px breakpoint I've made a slightly more intrusive layout change, changing the order of flex items. The restaurant is first now, I've given it 400px width as it does not need more, while giving 100% height to its container. The rest of width I've given to the map and reviews containers, and also made them split the height available, 50-50, minus margins and borders.

Same story on modifying the height of header/footer as before and also to the auto margin for width greater than 1320px.

### Images and srcset

Same story here, 1 DPR gets 400x300 while 2DPR gets 800x600 images with srcset.

## Additional comments

I've added margins where it was needed, betweem list item tags, containers etc.

# Accessibilty

## Improvements

For images, I've added alt attributes to the tags with the name of the restaurant. I did this from the .js files.

I've added the 'navigation' role to the breadcrumbs header in restaurant details page. Still not a big navigation, but it can be extended.

To the links of each restaurant item, I've added an aria-label to make it more explicit when it gets read by screen reader, like 'view details for the restaurant named blabla'.

# Offline experience

## Service worker

I've added a service worker script sw.js in which I am caching at install the most important resources (js, css, html and the json of restaurants).

At the activate event I've added a check for any cache from my app with different version than the current one and delete those.

At the fetch event I've added cache check for the resource. If there is a resource, I will provide that as response. If not, will fetch for it, update the cache with it and also serve it back to the user. These two events are done independently, as the user does not need to wait for page to get into the cache before receiving any response.

## IndexedDB storing

I updated the Service Worker script to handle the IndexedDB caching as I wanted to keep all the caching feature contained in sw.js for now. I have created the database, objectstore and an index after caching the basic files in the 'install' event. Then I stored the promise variable, and in case the reference gets lost, I created a getter method to return the promise or open a new connection with the database and then return the promise.

I refactored the fetch event to check for /restaurants and /restaurants/$id requests and use the IndexedDB to return results, wrapping them into JSON objects and then pass them as Response content. If I could not find any match in the database, I would normally fetch from the network, clone the response, put the clone into the database and return the response.

I used importScripts built-in function to import the idb.js file into my project. Also added it to the list of js files.

# Lighthouse improvements

## Offscreen Images and lazy loading

After running Lighthouse I got some pretty random scores, especially on Performance. Also for the Progressive Web App score, the tips I got are not really about what I learned in the project.

I have implemented a Performance suggestion by lazy loading images using the IntersectionObserver built in library. I have added the functionality to check if image is in viewport and after that render it. I did so by adding a callback to the intersection observer. If the image got close to the viewport, I would change src and srcset with the values from data.src and data.srcset and by doing this they would load.
