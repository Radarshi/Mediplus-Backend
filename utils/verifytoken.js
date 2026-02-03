import jwt from 'jsonwebtoken';

// Middleware to verify JWT token from cookies OR headers
export const verifyToken = (req, res, next) => {
  let token;

  // Try to get token from cookies first (more secure)
  token = req.cookies.token;

  // If no cookie, try Authorization header (for backward compatibility)
  if (!token) {
    const auth = req.headers.authorization || '';
    token = auth.startsWith('Bearer ') ? auth.split(' ')[1] : null;
  }

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export default verifyToken;