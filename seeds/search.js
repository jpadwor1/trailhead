const mongoose = require('mongoose');
const Trail = require('../models/trails');


const search = async (query) => {
    const searchItem = query.toLowerCase();
    
    const trails = await Trail.find({ $text: { $search: query } });
   
    return trails;
  };


module.exports = search;
  
  