const express = require('express');
const app = express();
const router = express.Router();
const trail = require('../models/trails');
const axios = require('axios');
const mongoose = require('mongoose');
const searchFunction = require('../seeds/search')
const googleApiKey= "AIzaSyBjx9PzKjqTHFaxURdn29SzP-zThiYGq_4";
const bodyParser = require('body-parser');
const geolib = require('geolib');
require('dotenv').config();
const mapbox = process.env.MAPBOX;
const weatherApiKey = process.env.weatherApiKey;






require('../app');
require('../routes/routes');
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
      let j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]]; // ES6 array destructuring syntax to swap elements
  }
  return array;
}
router.use(express.json());
let trailTags = [
  "Dogs",
  "Backpacking",
  "Camping",
  "Hiking",
  "Forest",
  "River",
  "Views",
  "Waterfall",
  "Wildflowers",
  "Wildlife",
  "Rocky",
  "Mountain",
  "Beach",
  "Scenic",
  "Swimming",
  "Biking",
  "Birdwatching",
  "Steep",
  "Historical",
  "Accessible"
];
let trailImages = [
  "../images/trail4.jpeg",
  "../images/trail5.jpg",
  "../images/trail6.jpg",
  "../images/trail7.jpg",
  "../images/trail8.jpg",
  "../images/trail9.jpeg",
  "../images/trail10.jpg",
  "../images/trail12.jpeg",
  "../images/trail13.jpeg",
  "../images/trail14.jpg",
  "../images/trail15.jpg",
]
let authenticated;
const requireAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    // User is authenticated, allow access to the authenticated route
    authenticated=true;
    return next();
  } else {
    // User is not authenticated, redirect to the non-authenticated route
    authenticated=false;
    return next();
  }
};
let closestState;
function findClosestState(latitude, longitude) {
  // Define your states and their corresponding coordinates
  const states = [
    
    { name: 'Alaska', latitude: 61.370716, longitude: -152.404419 },
    { name: 'Arizona', latitude: 33.729759, longitude: -111.431221 },
    { name: 'Arkansas', latitude: 34.969704, longitude: -92.373123 },
    { name: 'California', latitude: 36.116203, longitude: -119.681564 },
    { name: 'Alabama', latitude: 32.806671, longitude: -86.79113 },
    { name: 'Colorado', latitude: 39.059811, longitude: -105.311104 },
    { name: 'Connecticut', latitude: 41.597782, longitude: -72.755371 },
    { name: 'Delaware', latitude: 39.318523, longitude: -75.507141 },
    { name: 'Florida', latitude: 27.766279, longitude: -81.686783 },
    { name: 'Georgia', latitude: 33.040619, longitude: -83.643074 },
    // Add more states and their coordinates
  ];
  // Convert latitude and longitude to numbers
  
  const targetCoords = {
    latitude: Number(latitude),
    longitude: Number(longitude)
  };

  // Calculate the distances between the user's location and the states' coordinates
  const distances = states.map(state => ({
    state: state.name,
    distance: geolib.getDistance(targetCoords, {
      latitude: Number(state.latitude),
      longitude: Number(state.longitude)
    }),
  }));

  // Sort the distances in ascending order
  distances.sort((a, b) => a.distance - b.distance);

  // Return the name of the closest state
  return closestState= distances[0].state;
}
function getRandomFloat(min, max) {
  return Math.floor(Math.random() * (max - min) + min);
}

router.post('/search-trails', async (req, res) => {
  
  const { latitude, longitude } = req.body;
  
  const trails = await trail.find();
// Find the closest state based on the user's location
 closestState = findClosestState(latitude, longitude);

// Filter the trails array to get the matching trails based on the state
const foundTrails = await trail.find({ $text: { $search: closestState } });
const matchingTrails = trails.filter(trail => trail.properties.state === closestState);
  res.json({ foundTrails });
});


router.get('/', async (req, res) => {
  try {
    const trails = await trail.find();
    
    const foundTrails = await trail.find({ $text: { $search: closestState || "California" } });
    
    res.render('home', { trails:trails,foundTrails: foundTrails, authenticated: req.isAuthenticated(), trails: trails, trailImages: trailImages, getRandomFloat: getRandomFloat });
  } catch (error) {
    console.error("Error fetching trails:", error);
    res.status(500).send("An error occurred while fetching trails.");
  }
});


  let totalLat = 0;
  let totalLng = 0;
  let count = 0;
  
  
router.get('/trails', requireAuth, async (req, res) => {
  
    try {
      const trails = await trail.find();
      trails.forEach((trail) => {
        if (trail.geometry.type === 'LineString') {
          trail.geometry.coordinates.forEach((coordinate) => {
            totalLng += coordinate[0];
            totalLat += coordinate[1];
            count++;
          });
        } else if (trail.geometry.type === 'MultiLineString') {
          trail.geometry.coordinates.forEach((subCoordinates) => {
            subCoordinates.forEach((coordinate) => {
              totalLng += coordinate[0];
              totalLat += coordinate[1];
              count++;
            });
          });
        } else if (trail.geometry.type === 'Point') {
          totalLng += trail.geometry.coordinates[0];
          totalLat += trail.geometry.coordinates[1];
          count++;
        }
      });
      
      // calculate average latitude and longitude
      let centerLat = totalLat / count;
      let centerLng = totalLng / count;
      res.render('./trails/search', {authenticated:authenticated,trailImages:trailImages, trails: trails,
        centerLng:centerLng,
        centerLat:centerLat,
        mapbox:mapbox
      });
    } catch (error) {
      console.log(error);
    }
  
});

router.get('/trails/new', (req,res) => {
  res.render('trails/new');
});

router.post('/trails', async (req,res) => {
  res.send(req.body.newTrailLocation);
});


router.get('/trails/:id', requireAuth, async (req,res) => {
  

  const trails = await trail.findById(req.params.id);
  const filteredTrails = await trail.find({}, { 'properties.reviews': 0, 'properties.photos': 0 });
  const reviews = trails.properties.reviews;
  
    let longitude, latitude;
    if (trails.geometry.type === 'LineString') {
        longitude = trails.geometry.coordinates[0][0];
        latitude = trails.geometry.coordinates[0][1];
    } else if (trails.geometry.type === 'MultiLineString') {
        longitude = trails.geometry.coordinates[0][0][0];
        latitude = trails.geometry.coordinates[0][0][1];
    }

    var randomTags = [];
while (randomTags.length < 10) {
  var randomIndex = Math.floor(Math.random() * trailTags.length);
  var randomTag = trailTags[randomIndex];
  if (!randomTags.includes(randomTag)) {
    randomTags.push(randomTag);
  }
}

  const nearbyTrails = filteredTrails.filter(trail => trail.properties.city === trails.properties.city).slice(1,5);
  let shuffledNearbyTrails = shuffleArray(nearbyTrails);
  res.render('./trails/show', {filteredTrails:filteredTrails,
    mapbox:mapbox,
    shuffledNearbyTrails:shuffledNearbyTrails,
    authenticated:req.isAuthenticated(),
    reviews:reviews,
    trailImages:trailImages,
    getRandomFloat: getRandomFloat, 
    nearbyTrails : nearbyTrails, 
    apiKey:weatherApiKey, 
    trails : trails, 
    longitude : longitude, 
    latitude : latitude, 
    randomTags:randomTags,
    googleApiKey:googleApiKey
  });
});


router.get('/trails/:id/edit', requireAuth, async (req,res) => {
  
  const foundTrail = await trail.findById(req.params.id);
  res.render('./trails/edit', {authenticated:req.isAuthenticated(),trailImages:trailImages,
    getRandomFloat: getRandomFloat, trail : foundTrail});
});


router.post('/trails/search', requireAuth, async (req,res) => {
  

  const query = req.body.searchBar;
  const searchItem = query.toLowerCase();
  const foundTrails = await trail.find({ $text: { $search: searchItem } });
  const filteredTrails = await trail.find({}, { 'properties.reviews': 0, 'properties.photos': 0 });
  try {
    
    foundTrails.forEach((trail) => {
      if (trail.geometry.type === 'LineString') {
        trail.geometry.coordinates.forEach((coordinate) => {
          totalLng += coordinate[0];
          totalLat += coordinate[1];
          count++;
        });
      } else if (trail.geometry.type === 'MultiLineString') {
        trail.geometry.coordinates.forEach((subCoordinates) => {
          subCoordinates.forEach((coordinate) => {
            totalLng += coordinate[0];
            totalLat += coordinate[1];
            count++;
          });
        });
      } else if (trail.geometry.type === 'Point') {
        totalLng += trail.geometry.coordinates[0];
        totalLat += trail.geometry.coordinates[1];
        count++;
      }
    });
    
    // calculate average latitude and longitude
    let centerLat = totalLat / count;
    let centerLng = totalLng / count;
  res.render('./trails/search', {authenticated:req.isAuthenticated(),trailImages:trailImages,
   trails: foundTrails, 
   filteredTrails:filteredTrails,
   mapbox:mapbox,
   centerLng:centerLng,
   centerLat:centerLat,
  });
} catch (error) {
  console.log(error);
}
});


router.post('/trails/search/nearby', requireAuth, async (req,res) => {
   const query = req.body.nearbyTrails;
  const searchItem = query.toLowerCase();
  const foundTrails = await trail.find({ $text: { $search: searchItem } });
  const filteredTrails = await trail.find({}, { 'properties.reviews': 0, 'properties.photos': 0 });
 
  res.render('./trails/search', {authenticated:req.isAuthenticated(),trailImages:trailImages,trails: foundTrails, filteredTrails:filteredTrails});
})






module.exports = router;
