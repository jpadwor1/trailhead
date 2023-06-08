const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const reviewSchema = new mongoose.Schema({
  author_name: String,
  author_url: String,
  profile_photo_url: String,
  rating: Number,
  relative_time_description: String,
  text: String,
  time: Number
}, 
{_id: false}); // used _id: false to prevent automatic generation of id for subdocuments


const trailSchema = new mongoose.Schema({
    type: {
      type: String,
      default: 'Feature'
    },
    properties: {
      "@id": {
        type: String
      },
      name: {
        type: String
      },
      network: {
        type: String
      },
      route: {
        type: String
      },
      type: {
        type: String
      },
      city: {
        type: String
      },
      state: {
        type: String
      },
      photos: {
        type: [String]
      },
      reviews: {
        type: [reviewSchema]
      },
      description: {
        type: String
      }
    },
    geometry: {
      type: {
        type: String,
        default: 'LineString'
      },
      coordinates: {
        type: [], // Array of arrays of numbers ([ [lon, lat], [lon, lat], ... ])
        required: true
      }
    }
  });

  trailSchema.statics.getAverageRating = async function(trailId) {
    const obj = await this.aggregate([
        { $match: { _id: trailId } },
        { $unwind: '$properties.reviews' },
        {
            $group: {
                _id: '$_id',
                averageRating: { $avg: '$properties.reviews.rating' },
            },
        },
    ]);
  
    try {
        if (obj.length > 0) {
            await this.model('trail').findByIdAndUpdate(trailId, {
                averageRating: obj[0].averageRating,
            });
            return obj[0].averageRating;
        }
        return null;
    } catch (err) {
        console.error(err);
    }
  };
  
  module.exports = mongoose.model('trail', trailSchema);
 