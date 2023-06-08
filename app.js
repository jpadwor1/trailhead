const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const session = require('express-session');
const passport = require('passport');
const cookieSession = require('cookie-session');
const trailRoutes = require('./routes/trails');
const app = express();
const path = require('path');
const mongoose = require('mongoose');
const Trail = require('./models/trails');
const engine = require('ejs-mate');
const User = require('./models/user');
const flash = require('connect-flash');
require('dotenv').config();
//const { connectToDatabase, closeDatabaseConnection } = require('./db');
const uri = process.env.MONGODB_URI;

require('./passport-setup'); // Make sure passport is configured
//Database Connection

mongoose.connect( uri, { useNewUrlParser: true, useUnifiedTopology: true });

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
  console.log("Database Connected!");
});


async function run() {
const client = new MongoClient(uri, {
  serverApi: {
    version: '1',
  },
});

try {
  await client.connect();
  console.log('Connected to MongoDB Atlas');

  const database = client.db('test');
  const collection = database.collection('trails');
  await collection.createIndex({ city: "text",
  state: "text",
  name: "text"
})
console.log('Successfully created indexes');
} finally {
  await client.close();
  console.log('Disconnected from MongoDB Atlas');
}
}

//run().catch(console.error);











async function createIndex() {
  try {
    // Trail.collection.dropIndex('name_text');
    // Trail.collection.dropIndex('city_text');
    // Trail.collection.dropIndex('state_text');
    
    db.collection.createIndex({
      city: "text",
      state: "text",
      name: "text"
    })
    
    
    console.log('Successfully created indexes')
  } catch (error) {
    console.log('failed to index', error)
  }
}


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

app.use(session({
    secret: process.env.COOKIE_KEY,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Note: Set `secure: true` if your application is running over HTTPS
  }));
app.use(flash());
app.use(passport.initialize()); // Used to initialize passport
app.use(passport.session()); // Used to persist login sessions

// use ejs-locals for all ejs templates:
app.engine('ejs', engine);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true}));
app.use(express.static("public"));
app.use(requireAuth);
app.use('/', trailRoutes);
app.use(require('./routes/routes'));




app.get('/login', (req, res) => {
    res.render('./trails/login', {authenticated:req.isAuthenticated()})
    });

app.get('/success', (req, res) => {
  const userProfile = req.user; // Assuming the user profile is stored in req.user
  res.render('./trails/success', { userProfile, authenticated:req.isAuthenticated()}); // Render the success.ejs template with userProfile as data
});

app.get('/error', (req, res) => res.send("error logging in"));

passport.serializeUser(function(user, cb) {
    cb(null, user);
});

passport.deserializeUser(function(obj, cb) {
    cb(null, obj);
});

/*  Google AUTH  */
 
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/callback"
  },
  function(accessToken, refreshToken, profile, done) {
      userProfile=profile;
      return done(null, userProfile);
  }
));
 
app.get('/auth/google', 
  passport.authenticate('google', { scope : ['profile', 'email'] }));
 
app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/error' }),
  function(req, res) {
    // Successful authentication, redirect success.
    res.redirect('/success');
  });

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Listening on ${port}`);
});
