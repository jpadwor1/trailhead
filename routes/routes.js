const router = require('express').Router();
const passport = require('passport');
const bcrypt = require('bcryptjs');
const User = require('../models/user'); // Include your User model here
const bodyParser = require('body-parser');
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
const trail = require('../models/trails');
const mongoose = require('mongoose');


var userProfile;
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

// Local Authentication
router.post('/signup', async (req, res) => {
    const inputEmail = req.body.signupEmail;
    console.log(inputEmail);
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const user = new User({
            local: {
                email: inputEmail,
                password: hashedPassword
            }
        });
        await user.save();
        res.redirect('./home');
    } catch (err){
        console.log(err);
        res.render('./trails/register', { messages: req.flash() });
    }
});

router.get('/signup', (req, res) => {
    res.render('./trails/register', { authenticated:authenticated,messages: req.flash() });
});

router.post('/login', passport.authenticate('local'), (req, res) => {
    // If this function gets called, authentication was successful.
    // `req.user` contains the authenticated user.
    userProfile = req.user;
    res.redirect('/success');
});

router.get('/logout', (req, res) => {
    req.session.destroy(() => {
      res.clearCookie('connect.sid'); // Optional: Clear the session cookie
      res.redirect('/');
    });
  });

  router.post('/trails/:id/reviews', requireAuth, async (req, res) => {
    try {
      const currentTrail = await trail.findById(req.params.id);
      if (!currentTrail) {
        // Handle the case where the trail is not found
        return res.status(404).send('Trail not found');
      }
  
      const { displayName, photos } = req.user;
  
      const newReview = {
        author_name: req.body.authorName,
        author_url: '',
        profile_photo_url: '',
        rating: req.body.rating,
        relative_time_description: '', // You can customize this field as needed
        text: req.body.reviewText,
        time: Math.floor(Date.now() / 1000), // Timestamp in seconds
      };
  
      currentTrail.properties.reviews.push(newReview);
      await currentTrail.save();
  
      res.sendStatus(200); // Send a success status code
    } catch (error) {
      console.log(error);
      res.sendStatus(500); // Send an error status code
    }
  });

module.exports = router;
