import express from 'express';
import login from './login.js';
import signup from './signup.js';
import googleAuth from './googleAuth.js';

const router = express.Router();

// POST /api/auth/login
router.use('/login', login);
console.log(' /login route loaded');

// POST /api/auth/signup  
router.use('/signup', signup);
console.log(' /signup route loaded');

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  console.log('Logout request');
  
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  });

  console.log('Cookie cleared');

  res.json({ 
    success: true, 
    message: 'Logged out successfully' 
  });
});
console.log(' /logout route loaded');

// GET /api/auth/google & /api/auth/google/callback
router.use('/google', googleAuth);
console.log(' /google OAuth routes loaded');

export default router;