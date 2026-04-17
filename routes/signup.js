// routes/signup.js
import express from 'express';
import bcrypt from 'bcryptjs';
import { createUser, findUserByEmail } from '../models/user.js';
import generateToken from '../utils/generatetoken.js';

const router = express.Router();

router.post('/', async (req, res) => {
  console.log('Signup attempt:', req.body.email);

  const { name, email, password, phone, age, gender } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  try {
    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await createUser({
      name,
      email,
      password: hashedPassword,
      phone:    phone   ?? '',
      age:      age     ?? 0,
      gender:   gender  ?? 'other',
      role:     'patient',
    });

    console.log('✅ User created:', email);

    const token = generateToken(user._id);

    res.cookie('token', token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   7 * 24 * 60 * 60 * 1000,
      path:     '/',
    });

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: {
        _id:    user._id,
        userId: user.userId,
        name:   user.name,
        email:  user.email,
        phone:  user.phone,
        role:   user.role,
      },
      token,
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Signup failed. Please try again.' });
  }
});

export default router;