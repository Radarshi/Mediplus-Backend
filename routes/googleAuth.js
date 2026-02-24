import express from 'express';
import bcrypt from 'bcryptjs';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/user.js';
import generateToken from '../utils/generatetoken.js';

const router = express.Router();

// GOOGLE OAUTH CONFIGURATION
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/auth/google/callback",
    passReqToCallback: true
  },
  async (req, accessToken, refreshToken, profile, done) => {
    try {
      console.log('Google OAuth Profile:', profile.displayName);
      
      // Find or create user
      let user = await User.findOne({ googleId: profile.id });
      
      if (!user) {
        // Check if email already exists
        user = await User.findOne({ email: profile.emails[0].value });
        
        if (user) {
          // User exists with this email, link Google account
          user.googleId = profile.id;
          user.picture = profile.photos[0]?.value;
          await user.save();
          console.log('Linked Google account to existing user');
        } else {
          // Create new user
          user = await User.create({
            googleId: profile.id,
            name: profile.displayName,
            email: profile.emails[0].value,
            picture: profile.photos[0]?.value,
            password: await bcrypt.hash('google-oauth-' + profile.id, 10),
            role: 'patient'
          });
          console.log('New user created via Google OAuth');
        }
      }
      
      return done(null, user);
    } catch (error) {
      console.error('Google OAuth error:', error);
      return done(error, null);
    }
  }
));

// Serialize user for passport
passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// GET /api/auth/google - Initiate Google OAuth
router.get('/',
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    session: false
  })
);

// GET /api/auth/google/callback - Google OAuth Callback
router.get('/callback', 
  passport.authenticate('google', { 
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:8080'}/login?error=google_auth_failed`
  }),
  (req, res) => {
    console.log('Google OAuth successful for:', req.user.email);
    
    try {
      // Generate token
      const token = generateToken(req.user._id);
      console.log('Token generated for Google user');
      
      // Set cookie
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/'
      });
      
      console.log('Cookie set for Google user');
      
      // Redirect to /auth/success
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
      const redirectUrl = `${frontendUrl}/auth/success?token=${token}`;
      
      console.log(' Redirecting to:', redirectUrl);
      res.redirect(redirectUrl);
      
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
      res.redirect(`${frontendUrl}/login?error=auth_failed`);
    }
  }
);

export default router;