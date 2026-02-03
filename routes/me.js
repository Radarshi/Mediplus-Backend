// backend/routes/me.js
import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/user.js';
import verifyToken from '../utils/verifytoken.js';

const router = express.Router();

router.get('/api/me', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.split(' ')[1] : null;

    if (!token) return res.status(401).json({ error: 'No token provided' });

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET missing');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ user });
  } catch (err) {
    console.error('GET /api/me error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
