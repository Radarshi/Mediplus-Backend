// routes/googleAuth.js
import express from 'express';
import bcrypt from 'bcryptjs';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import {
  findUserByGoogleId,
  findUserByEmail,
  createUser,
  linkGoogleAccount,
} from '../models/user.js';
import generateToken from '../utils/generatetoken.js';

const router = express.Router();

passport.use(
  new GoogleStrategy(
    {
      clientID:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback',
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        console.log('Google OAuth Profile:', profile.displayName);

        // 1. Check if googleId already linked
        let user = await findUserByGoogleId(profile.id);

        if (!user) {
          // 2. Check by email
          user = await findUserByEmail(profile.emails[0].value);

          if (user) {
            // Link Google to existing account
            user = await linkGoogleAccount(user._id, profile.id, profile.photos[0]?.value);
            console.log('✅ Linked Google to existing user');
          } else {
            // 3. Create brand new user
            user = await createUser({
              googleId: profile.id,
              name:     profile.displayName,
              email:    profile.emails[0].value,
              picture:  profile.photos[0]?.value,
              password: await bcrypt.hash('google-oauth-' + profile.id, 10),
              role:     'patient',
            });
            console.log('✅ New Google user created');
          }
        }

        return done(null, user);
      } catch (error) {
        console.error('Google OAuth error:', error);
        return done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
  const { findUserById } = await import('../models/user.js');
  try {
    const user = await findUserById(id);
    done(null, user);
  } catch (e) {
    done(e, null);
  }
});

// GET /api/auth/google
router.get('/', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

// GET /api/auth/google/callback
router.get(
  '/callback',
  passport.authenticate('google', {
    session:         false,
    failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:8080'}/login?error=google_auth_failed`,
  }),
  (req, res) => {
    try {
      const token = generateToken(req.user._id);

      res.cookie('token', token, {
        httpOnly: true,
        secure:   process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge:   7 * 24 * 60 * 60 * 1000,
        path:     '/',
      });

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
      res.redirect(`${frontendUrl}/auth/success?token=${token}`);
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
      res.redirect(`${frontendUrl}/login?error=auth_failed`);
    }
  }
);

export default router;