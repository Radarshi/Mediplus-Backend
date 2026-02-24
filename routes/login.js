import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/user.js';
import generateToken from '../utils/generatetoken.js';

const router = express.Router();

// POST /api/auth/login - Regular Login
router.post('/', async (req, res) => {
  console.log('Login attempt:', req.body.email);
  
  const { email, password } = req.body;

  if (!email || !password) {
    console.log('Missing credentials');
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.log('User not found:', email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.log('Invalid password for:', email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    console.log('Login successful for:', email);

    // Generate JWT token
    const token = generateToken(user._id);

    // Set token in HttpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/'
    });
    
    console.log('Cookie set successfully');

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
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

export default router;