// routes/me.js
import express from 'express';
import { findUserById, updateUser } from '../models/user.js';
import verifyToken from '../utils/verifyToken.js';

const router = express.Router();

// GET /api/me
router.get('/', verifyToken, async (req, res) => {
  try {
    const user = await findUserById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { password, ...safeUser } = user;
    res.json({ ...safeUser, _id: user._id });
  } catch (err) {
    console.error('GET /api/me error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/me
router.put('/', verifyToken, async (req, res) => {
  try {
    const { name, phone, age, gender } = req.body;

    const user = await findUserById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const updated = await updateUser(req.userId, {
      name:   name   ?? user.name,
      phone:  phone  ?? user.phone,
      age:    age    ?? user.age,
      gender: gender ?? user.gender,
    });

    const { password, ...safeUser } = updated;
    res.json(safeUser);
  } catch (err) {
    console.error('PUT /api/me error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;