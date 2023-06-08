const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const User = require('./models/user'); //
require('dotenv').config();



// Configure Local Strategy
passport.use('local', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
}, async (email, password, done) => {
    const user = await User.findOne({ 'local.email': email });
    if (!user || !user.validPassword(password)) {
        return done(null, false, { message: 'Invalid username or password' });
    }
    return done(null, user);
}));


