// backend/routes/me.js
import express from 'express';
import User from '../models/user.js';
import verifyToken from '../utils/verifyToken.js';

const router = express.Router();

// ✅ GET /api/me - fetch current user profile
router.get('/', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');

    if (!user) {
      console.log('❌ User not found:', req.userId);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('✅ User found:', user.email);

    res.json({
      _id: user._id,
      userId: user.userId,
      name: user.name,
      email: user.email,
      phone: user.phone,
      age: user.age,
      gender: user.gender,
      role: user.role,
      picture: user.picture
    });
  } catch (err) {
    console.error('❌ Error in GET /api/me:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ PUT /api/me - update current user profile
router.put('/', verifyToken, async (req, res) => {
  try {
    const { name, phone, age, gender } = req.body;

    const user = await User.findById(req.userId);
    if (!user) {
      console.log('❌ User not found:', req.userId);
      return res.status(404).json({ error: 'User not found' });
    }

    // Update fields if provided
    user.name = name ?? user.name;
    user.phone = phone ?? user.phone;
    user.age = age ?? user.age;
    user.gender = gender ?? user.gender;

    await user.save();

    console.log('✅ User profile updated:', user.email);

    res.json({
      _id: user._id,
      userId: user.userId,
      name: user.name,
      email: user.email,
      phone: user.phone,
      age: user.age,
      gender: user.gender,
      role: user.role,
      picture: user.picture
    });
  } catch (err) {
    console.error('❌ Error in PUT /api/me:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;
