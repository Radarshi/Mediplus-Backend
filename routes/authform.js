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
    callbackURL: "http://localhost:3000/auth/google/callback",
    passReqToCallback: true
  },
  async (req, accessToken, refreshToken, profile, done) => {
    try {
      console.log('🔍 Google OAuth Profile:', profile.displayName);
      
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
          console.log('✅ Linked Google account to existing user');
        } else {
          // Create new user
          user = await User.create({
            googleId: profile.id,
            name: profile.displayName,
            email: profile.emails[0].value,
            picture: profile.photos[0]?.value,
            password: await bcrypt.hash('google-oauth-' + profile.id, 10), // Dummy password
            role: 'patient'
          });
          console.log('✅ New user created via Google OAuth');
        }
      }
      
      return done(null, user);
    } catch (error) {
      console.error('❌ Google OAuth error:', error);
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

// POST /api/auth/login - Regular Login
router.post('/api/auth/login', async (req, res) => {
  console.log('🔐 Login attempt:', req.body.email);
  
  const { email, password } = req.body;

  try {
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.log('❌ Invalid password for:', email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    console.log('✅ Login successful for:', email);

    // Generate JWT token
    const token = generateToken(user._id);
    console.log('✅ Token generated:', token.substring(0, 20) + '...');

    // Set token in HttpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/'
    });
    
    console.log('✅ Cookie set successfully');

    // Send user data (without password)
    res.json({
      success: true,
      message: 'Login successful',
      user: {
        _id: user._id,
        userId: user.userId,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        picture: user.picture
      },
      token
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/logout - Logout
router.post('/api/auth/logout', (req, res) => {
  console.log('👋 Logout request');
  
  // Clear the cookie
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  });

  console.log('✅ Cookie cleared');

  res.json({ 
    success: true, 
    message: 'Logged out successfully' 
  });
});

// POST /api/auth/signup - Signup
router.post('/api/auth/signup', async (req, res) => {
  console.log('📝 Signup attempt:', req.body.email);
  
  const { name, email, password, phone } = req.body;

  try {
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('❌ Email already exists:', email);
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      role: 'patient'
    });

    console.log('✅ User created:', email);

    // Generate token
    const token = generateToken(user._id);
    console.log('✅ Token generated for new user');

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/'
    });

    console.log('✅ Cookie set for new user');

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: {
        _id: user._id,
        userId: user.userId,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      },
      token
    });

  } catch (error) {
    console.error('❌ Signup error:', error);
    res.status(500).json({ error: 'Signup failed' });
  }
});

// GET /auth/google - Initiate Google OAuth
router.get('/auth/google',
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    session: false
  })
);

// GET /auth/google/callback - Google OAuth Callback
router.get('/auth/google/callback', 
  passport.authenticate('google', { 
    session: false,
    failureRedirect: 'http://localhost:8080/login?error=google_auth_failed'
  }),
  (req, res) => {
    console.log('✅ Google OAuth successful for:', req.user.email);
    
    try {
      // Generate token
      const token = generateToken(req.user._id);
      console.log('✅ Token generated for Google user');
      
      // Set cookie
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/'
      });
      
      console.log('✅ Cookie set for Google user');
      
      // Redirect to frontend with token in URL as backup
      const redirectUrl = `http://localhost:8080/?token=${token}&login=success`;
      res.redirect(redirectUrl);
      
    } catch (error) {
      console.error('❌ Google OAuth callback error:', error);
      res.redirect('http://localhost:8080/login?error=auth_failed');
    }
  }
);

export default router;