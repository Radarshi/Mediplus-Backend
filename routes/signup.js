import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/user.js';
import generateToken from '../utils/generatetoken.js';

const router = express.Router();

// POST /api/auth/signup - Signup
router.post('/', async (req, res) => {
  console.log('Signup attempt:', req.body.email);
  
  const { name, email, password, phone } = req.body;

  // Validate input
  if (!name || !email || !password) {
    console.log('Missing required fields');
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  try {
    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      console.log('Email already exists:', email);
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      phone: phone || '',
      role: 'patient'
    });

    console.log('User created:', email);

    // Generate token
    const token = generateToken(user._id);

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/'
    });

    console.log('Cookie set for new user');

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
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Signup failed. Please try again.' });
  }
});

export default router;