const mongoose = require('mongoose');
const Trail = require('../models/trails');
const axios = require('axios');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
mongoose.connect(uri);

// const db = mongoose.connection;
// db.on("error", console.error.bind(console,"connection error:"));
// db.once("open", () => {
//     console.log('Database Connected!');
// });


async function addReviews() {
  const trails = await Trail.find();
const modelTrail = await Trail.findById("relation/6475534");

Trail.updateMany(
  { 'properties.reviews': { $exists: false } },
  { $set: { 'properties.reviews': [modelTrail.properties.reviews] } },
  (err, result) => {
    if (err) {
      console.error('Error updating trails:', err);
    } else {
      console.log('Trails updated successfully:', result);
    }
  }
);
}

addReviews();

async function getPlaceData() {
  const foundTrails = await Trail.find();
  
  for (let i = 0; i < foundTrails.length; i++) {
      let trail = foundTrails[i];

      const apiKey = 'AIzaSyBjx9PzKjqTHFaxURdn29SzP-zThiYGq_4'; // replace with your actual API key

      // First use the Find Place request to get the place_id
      let findPlaceUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${trail.properties.name}&inputtype=textquery&fields=place_id&key=${apiKey}`;
      try {
          let response = await axios.get(findPlaceUrl);
          if (response.data.candidates.length > 0) {
              let place_id = response.data.candidates[0].place_id;

              // Then use the Place Details request to get detailed data
              let placeDetailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=name,rating,review,photo&key=${apiKey}`;
              response = await axios.get(placeDetailsUrl);

              // If response is successful and contains result
              if (response.data && response.data.result) {
                  let placeData = response.data.result;

                  // Process reviews
                  if (placeData.reviews) {
                      trail.properties.reviews = placeData.reviews.map(reviewData => {
                          // Create a Review model instance with the data and return it
                          return new Review(reviewData);
                      });
                  }

                  // Process photos
                  if (placeData.photos) {
                      trail.properties.photos = placeData.photos.map(photoData => {
                          // Return the photo reference
                          return photoData.photo_reference;
                      });
                  }

                  // Save the updated trail
                  try {
                      await trail.save();
                  } catch (saveError) {
                      console.error(saveError);
                  }
              }
          }
      } catch (error) {
          console.error(error);
      }
  }
}




getPlaceData();


const seedDB = async () => {
    try {
      // Retrieve all place IDs from the Google Places API
      const response = await axios.get('https://maps.googleapis.com/maps/api/place/nearbysearch/json', {
        params: {
          location: '37.002499,-95.675278',
          type: 'park',
          keyword: 'trail',
          radius: 1804672,
          key: 'AIzaSyBjx9PzKjqTHFaxURdn29SzP-zThiYGq_4'
        }
      });
      const googlePlaceIds = response.data.results.map(result => result.place_id);
  
      // Find and delete documents with matching place IDs in the MongoDB database
      const deletedTrails = await Trail.deleteMany({ place_id: { $in: googlePlaceIds } });
      
      console.log(`Deleted ${deletedTrails.deletedCount} duplicate trails from the database.`);
    } catch (error) {
      console.error('Error while seeding the database:', error);
    }
  };

// seedDB();

let forwardGeocoding = async (latitude, longitude) => {
    if (!latitude || !longitude || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      console.log('Invalid coordinates:', latitude, longitude);
      return;
    }
    try {
      const openCageAPI = '615ec2f445f64f88942d408fde3c7baa';
      const url = `https://api.opencagedata.com/geocode/v1/json?q=${latitude},${longitude}&key=${openCageAPI}`;
  
     
      const response = await axios.get(url);
  
      // Handle response
      
      const result = response.data.results[0];
      if (!result || !result.components) {
        console.log('No results from the OpenCage Geocoding API for these coordinates:', latitude, longitude);
        return;
      }
      const city = result.components.city;
      const state = result.components.state;
  
      console.log(city, state);
      return { city, state };
    } catch (error) {
      console.log(error.response.data);
    }
  };
  
  async function updateLocations() {
    try {
      const trails = await Trail.find({});
  
      for (let trail of trails) {
        let latitude, longitude;
        try {
          if (trail.geometry && trail.geometry.coordinates) {
            if (trail.geometry.type === 'LineString') {
                if (trail.geometry.coordinates.length > 0 && trail.geometry.coordinates[0].length > 0) {
                    longitude = trail.geometry.coordinates[0][0];
                    latitude = trail.geometry.coordinates[0][1];
                }
            } else if (trail.geometry.type === 'MultiLineString') {
                // If the first element of the coordinates array is an array
                if (trail.geometry.coordinates.length > 0 && trail.geometry.coordinates[0].length > 0 && Array.isArray(trail.geometry.coordinates[0][0])) {
                    if (trail.geometry.coordinates[0][0].length > 0) {
                        longitude = trail.geometry.coordinates[0][0][0];
                        latitude = trail.geometry.coordinates[0][0][1];
                    }
                } else {
                    if (trail.geometry.coordinates.length > 0 && trail.geometry.coordinates[0].length > 0) {
                        longitude = trail.geometry.coordinates[0][0];
                        latitude = trail.geometry.coordinates[0][1];
                    }
                }
            }
        }
          // Log latitude and longitude if they're undefined
          if (latitude === undefined || longitude === undefined) {
            console.log('Invalid coordinates: ', latitude, longitude);
            console.log('Problematic entry: ', trail);
          }
        } catch (err) {
          console.log('Error when processing entry: ', trail);
          console.log('Error message: ', err);
        }
  
        
  
        if (!latitude || !longitude || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
          console.log('Invalid coordinates:', latitude, longitude);
          continue;
        }
  
        const { city, state } = await forwardGeocoding(latitude, longitude);
  
        await Trail.updateOne(
          { _id: trail._id },
          { $set: { "properties.city": city, "properties.state": state } }
        );
      }
    } catch (error) {
      console.log(error);
    }
  }
  
  
  
  
  updateLocations();
  
  
  async function importGeoJSON() {
    
    try {
      const db = mongoose.connection;
      const collection = db.collection("trails");
      const geojsonData = {
        "type": "FeatureCollection",
      //NEED TO ADD FEATURES FROM GEOJSON HERE
      
      };
      const result = await collection.insertMany(geojsonData.features);
      console.log(`${result.insertedCount} documents inserted.`);
    } catch (err) {
      console.error('Error importing GeoJSON:', err);
    } 
  }
  
  // importGeoJSON();
  
  async function findTrail() {
    try {
        const trail = await Trail.findOne({ 'properties.@id': 'relation/6475534' });
        
        if (!trail) {
            console.log("No trail found with the provided id");
        } else if (!trail.geometry || !trail.geometry.coordinates) {
            console.log("The found trail does not have coordinates");
        } else {
            console.log(trail.city);
        }
    } catch (err) {
        console.error(err);
    }
  }
  
  // findTrail();


 async function createIndex() {
  try {
    // Trail.collection.dropIndex('name_text');
    // Trail.collection.dropIndex('city_text');
    // Trail.collection.dropIndex('state_text');
    
    Trail.collection.createIndex({
      city: "text",
      state: "text",
      name: "text"
    })
    
    
    console.log('Successfully created indexes')
  } catch (error) {
    console.log('failed to index')
  }
}

createIndex();

async function importGeoJSON() {
  
  try {
    const db = mongoose.connection;
    const collection = db.collection("trails");
    const geojsonData = {
      "type": "FeatureCollection",
    //NEED TO ADD FEATURES FROM GEOJSON HERE

    };
    const result = await collection.insertMany(geojsonData.features);
    console.log(`${result.insertedCount} documents inserted.`);
  } catch (err) {
    console.error('Error importing GeoJSON:', err);
  } 
}

// importGeoJSON();

const updatedReviews = [
  {
    author_name: "Jessica Darland",
    author_url: "https://www.google.com/maps/contrib/100122506667515047307/reviews",
    profile_photo_url: "https://lh3.googleusercontent.com/a-/AD_cMMTw80bWjhcxtamGQURAks442GN941_4JiUjZt8gNiI=s128-c0x00000000-cc-rp-mo-ba3",
    rating: 5,
    relative_time_description: "a year ago",
    text: "This is my favorite place! I go at least once a week. The steep climb starts pretty much right away and gets steeper and more difficult as you go. The last bit is pretty serious, but it's doable if you're up for it. You get beautiful views long before that so it's still worth it even if you don't make the whole climb.",
    time: 1649480234
  },
  {
    author_name: "Edan Alva",
    author_url: "https://www.google.com/maps/contrib/106607728441368632751/reviews",
    profile_photo_url: "https://lh3.googleusercontent.com/a/AAcHTtcf0P42eCseW9SWUI_nToGU8aE5by0vyB9xFgWE=s128-c0x00000000-cc-rp-mo-ba2",
    rating: 5,
    relative_time_description: "a month ago",
    text: "Great hike with gorgeous views of the mountains and Phoenix. I always find new interesting things on the way to the top. Flowers, animals, cool people…🙂",
    time: 1681110163
  },
  {
    author_name: "Mike Moyer",
    author_url: "https://www.google.com/maps/contrib/115481609607463611973/reviews",
    profile_photo_url: "https://lh3.googleusercontent.com/a-/AD_cMMTK7nyKQAl_pX405YX4Kyt6E5hHZaXPfbhBzlWYxQ=s128-c0x00000000-cc-rp-mo-ba6",
    rating: 5,
    relative_time_description: "5 months ago",
    text: "Great trail with sturdy rocks so you definitely felt safe even though it was difficult.",
    time: 1670872431
  },
  {
    author_name: "Jenny Christian",
    author_url: "https://www.google.com/maps/contrib/105217387154651900942/reviews",
    profile_photo_url: "https://lh3.googleusercontent.com/a/AAcHTtdg6MrS6nL8x4lCgvzpUbebDooqPsVjL1aGpLBr=s128-c0x00000000-cc-rp-mo-ba5",
    rating: 5,
    relative_time_description: "2 years ago",
    text: "Super strenuous home- switchback stairs all the way up! Only about 25/30% of the hikers masked, difficult to social distance most of the trail. Beautiful trail and amazing views",
    time: 1609773171
  },
  {
    author_name: "Matt Peppes",
    author_url: "https://www.google.com/maps/contrib/102276534510339426955/reviews",
    profile_photo_url: "https://lh3.googleusercontent.com/a-/AD_cMMTTgbIbzUAXq6iU2aq7yfUfJECTdNUtPAvO5u6LTdQ=s128-c0x00000000-cc-rp-mo-ba6",
    rating: 5,
    relative_time_description: "3 years ago",
    text: "Great hike, but very challenging! The Summit #300 hike is 2.2 miles out and back and tends to be fairly high trafficked. We started the trail around 7:45am and the trail wasn’t too busy. The trail is pretty much an incline from the start so it will certainly get your heart pumping. We took a bunch of breaks on the way up to hydrate, be sure to bring plenty of water, but the views from the top were awesome!",
    time: 1567981516
  },
  {
    author_name: 'J Sauls',
    author_url: 'https://www.google.com/maps/contrib/117789523504007722784/reviews',
    profile_photo_url: 'https://lh3.googleusercontent.com/a-/AD_cMMR1_DhIPkLx0gJJzMyMMN2FiQP29kRJgZ49kwZl2XA=s128-c0x00000000-cc-rp-mo-ba5',
    rating: 5,
    relative_time_description: '6 months ago',
    text: "Great trail, easy to follow, a little steep in some areas. Not a lot of people on the trail, that may be because there's very little parking- just a pull off area big enough for 2 cars max. We started just before sunrise and it was so worth it. Gorgeous views and it was a short hike-just 40 minutes.",
    time: 1667084762
  },
  {
    author_name: 'J Maq (Mister.Mac)',
    author_url: 'https://www.google.com/maps/contrib/101370216072139805503/reviews',
    profile_photo_url: 'https://lh3.googleusercontent.com/a-/AD_cMMQIJ5mD-H1z5eL-e1k6dnTBdUGNedInSrzwPGa4rYc=s128-c0x00000000-cc-rp-mo-ba5',
    rating: 5,
    relative_time_description: '2 months ago',
    text: 'I had not hiked much before hitting this peak. I struggled a bit due to my poor fitness. I managed to reach summit. Although, I had to rest a few times along the way. Trail has lots loose rocks and dirt and it gets fairly steep towards the top. Wear proper shoes and bring plenty of water to be on safe side.',
    time: 1679780114
  },
  {
    author_name: 'Keith Naber',
    author_url: 'https://www.google.com/maps/contrib/115062369033776806273/reviews',
    profile_photo_url: 'https://lh3.googleusercontent.com/a-/AD_cMMRJPKLV2TK-FzoNBKTE1XsPntVDd204KGfZpD1vmNs=s128-c0x00000000-cc-rp-mo-ba4',
    rating: 5,
    relative_time_description: '2 years ago',
    text: 'As the other reviews say, this is a challenging hike. Loose rock and some steep stretches greet you. Bring water and start early AM or in early evening to avoid the hottest parts of the day in full sun. We loved the views and the experience. Highly recommended if you come prepared.',
    time: 1620014242
  },
  {
    author_name: 'yatharth chowdhary (yeti)',
    author_url: 'https://www.google.com/maps/contrib/101029690268243076756/reviews',
    profile_photo_url: 'https://lh3.googleusercontent.com/a-/AD_cMMQsGe9xhoup-tNQ6hZdjJUUX8cJ-9kfTVSAIHoQ5mc=s128-c0x00000000-cc-rp-mo-ba4',
    rating: 4,
    relative_time_description: '5 months ago',
    text: 'If you are looking for a hike with less people do this. Between Piestawa and camelback this is a good climb with good views.',
    time: 1669950105
  },
  {
    author_name: 'Kim L',
    author_url: 'https://www.google.com/maps/contrib/110340497331003758570/reviews',
    profile_photo_url: 'https://lh3.googleusercontent.com/a/AAcHTte24i0RcO6G4lyPijSdR_teEDS8Dzv-blkHaLk=s128-c0x00000000-cc-rp-mo-ba4',
    rating: 4,
    relative_time_description: 'a year ago',
    text: 'A little rocky as you ascend. Not for a novice. Loose rocks. Careful steps. Beautiful view!',
    time: 1641080662
  }
];

const updatedReviewsInSeconds = updatedReviews.map(review => {
  return { ...review, time: Math.floor(review.time / 1000) };
});

async function updateTrails() {
  try {
    const result = await Trail.updateMany(
      { },
      { $push: { 'properties.reviews': {$each: updatedReviewsInSeconds } } }
    );
    console.log('Trails updated successfully:', result);
  } catch (err) {
    console.error('Error updating trails:', err);
  }
}

let forwardGeocoding = async (latitude, longitude) => {
  if (!latitude || !longitude || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    console.log('Invalid coordinates:', latitude, longitude);
    return;
  }
  try {
    const openCageAPI = '615ec2f445f64f88942d408fde3c7baa';
    const url = `https://api.opencagedata.com/geocode/v1/json?q=${latitude},${longitude}&key=${openCageAPI}`;

   
    const response = await axios.get(url);

    // Handle response
    
    const result = response.data.results[0];
    if (!result || !result.components) {
      console.log('No results from the OpenCage Geocoding API for these coordinates:', latitude, longitude);
      return;
    }
    const city = result.components.city;
    const state = result.components.state;

    console.log(city, state);
    return { city, state };
  } catch (error) {
    console.log(error.response.data);
  }
};


async function updateLocations() {
  try {
    const trails = await Trail.find({});

    for (let trail of trails) {
      let latitude, longitude;
      try {
        if (trail.geometry && trail.geometry.coordinates) {
          switch (trail.geometry.type) {
            case 'Point':
              longitude = trail.geometry.coordinates[0];
              latitude = trail.geometry.coordinates[1];
              break;
            case 'LineString':
              if (trail.geometry.coordinates.length > 0) {
                longitude = trail.geometry.coordinates[0][0];
                latitude = trail.geometry.coordinates[0][1];
              }
              break;
            case 'MultiLineString':
              if (trail.geometry.coordinates.length > 0 && Array.isArray(trail.geometry.coordinates[0][0])) {
                if (trail.geometry.coordinates[0][0].length > 0) {
                  longitude = trail.geometry.coordinates[0][0][0];
                  latitude = trail.geometry.coordinates[0][0][1];
                }
              } else {
                if (trail.geometry.coordinates.length > 0) {
                  longitude = trail.geometry.coordinates[0][0];
                  latitude = trail.geometry.coordinates[0][1];
                }
              }
              break;
            default:
              console.log(`Unsupported geometry type: ${trail.geometry.type} for trail ID: ${trail._id}`);
          }
        }
        // Log latitude and longitude if they're undefined
        if (latitude === undefined || longitude === undefined) {
          console.log('Invalid coordinates: ', latitude, longitude);
          console.log('Problematic entry: ', trail);
        }
      } catch (err) {
        console.log('Error when processing entry: ', trail);
        console.log('Error message: ', err);
      }

      

      if (!latitude || !longitude || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        console.log('Invalid coordinates:', latitude, longitude);
        continue;
      }
      
      let { city, state } = await forwardGeocoding(latitude, longitude);
      
      // Handle specific cases where city is undefined
      if (!city && state === 'Arizona') {
        city = 'Phoenix';
      } else if (!city && state === 'California') {
        city = 'Santa Clara';
      }
      
      // If city or state doesn't exist, then update the database entry
      if (!trail.properties || !trail.properties.city || !trail.properties.state) {
        console.log('Updating database entry for trail: ', trail._id);
        
        // Note the capital T in Trail
        const updateResult = await Trail.updateOne(
          { _id: trail._id },
          { $set: { "properties.city": city, "properties.state": state } }
        );
      
        console.log('Database entry update result for trail: ', trail._id, updateResult);
      }
    }
  }
  catch (err) {
    console.log('Error when updating locations: ', err);
  }
}



// updateLocations();
