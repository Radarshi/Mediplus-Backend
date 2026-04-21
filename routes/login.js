// routes/login.js
import express from 'express';
import bcrypt from 'bcryptjs';
import { findUserByEmail } from '../models/user.js';
import generateToken from '../utils/generatetoken.js';

const router = express.Router();

router.post('/', async (req, res) => {
  console.log('Login attempt:', req.body.email);

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    console.log('✅ Login successful:', email);

    const token = generateToken(user._id);

    res.cookie('token', token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   7 * 24 * 60 * 60 * 1000,
      path:     '/',
    });

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        _id:     user._id,
        userId:  user.userId,
        name:    user.name,
        email:   user.email,
        phone:   user.phone,
        role:    user.role,
        picture: user.picture,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

export default router;