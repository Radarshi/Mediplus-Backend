// server.js
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import passport from 'passport';

import { initFirebase } from './db/firebase.js';

// Routes
import authform       from './routes/authform.js';
import blogForm       from './routes/blogInteraction.js';
import consult        from './routes/consultation.js';
import consultBooking from './routes/consult_booking.js';
import labTestForm    from './routes/labTestForm.js';
import orderForm      from './routes/orderForm.js';
import passwordReset  from './routes/passwordReset.js';
import paymentRoutes  from './routes/paymentRoutes.js';
import me             from './routes/me.js';
import adminRoutes    from './routes/adminRoutes.js';

dotenv.config();

const startServer = async () => {
  console.log('Starting MediPlus Backend Server...');
  initFirebase();

  const app = express();

  //cors
  const allowedOrigins = [
    'http://localhost:8080',
    'http://localhost:8081',
    'http://localhost:5173',
    'https://medi-plus-ten.vercel.app',
  ];

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        console.warn('CORS blocked:', origin);
        callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
    })
  );

  //Middleware
  app.use(express.json());
  app.use(morgan('dev'));
  app.use(cookieParser());
  app.use(passport.initialize());

  //Health 
  app.get('/check',      (_, res) => res.json({ message: 'Server is up', timestamp: new Date().toISOString() }));
  app.get('/api/health', (_, res) => res.json({ status: 'ok',  timestamp: new Date().toISOString() }));

  //Routes
  app.use('/api/auth',             authform);
  app.use('/api/me',               me);
  app.use('/api/consulting',       consult);
  app.use('/api/send-confirmation', consultBooking);
  app.use('/api/lab-booking',      labTestForm);
  app.use('/api/blogs',            blogForm);
  app.use('/api/orders',           orderForm);
  app.use('/api/password-reset',   passwordReset);
  app.use('/api/payments',         paymentRoutes);
  app.use('/api/admin',            adminRoutes);

  console.log('All routes registered');

  //Error handler
  app.use((err, req, res, next) => {
    console.error('Unhandled error:', err.message);
    res.status(500).json({ error: err.message || 'Internal server error' });
  });

  //404
  app.use((req, res) => {
    console.warn('404:', req.method, req.path);
    res.status(404).json({ error: 'Route not found', path: req.path, method: req.method });
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log('');
    console.log('='.repeat(50));
    console.log(`MediPlus Backend Running on port ${PORT}`);
    console.log(`Database: Firebase Firestore`);
    console.log('='.repeat(50));
  });
};

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});