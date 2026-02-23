import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import { initBlogConnection, initConsultConnection, initLabTestConnection, initOrderConnection, initUserConnection } from './db/connections.js';
import authform from './routes/authform.js';
import blogForm from './routes/blogInteraction.js';
import consult from './routes/consultation.js';
import consultBooking from './routes/consult_booking.js'
import labTestForm from './routes/labTestForm.js';
import orderForm from './routes/orderForm.js';
import passwordResetRoutes from './routes/passwordReset.js';
import paymentRoutes from './routes/paymentRoutes.js'; // ✅ NEW: Import payment routes
import me from './routes/me.js';

dotenv.config();

const startServer = async() => {
  console.log('🚀 Starting MediPlus Backend Server...');
  
  const userConnection = await initUserConnection();
  const consultConnection = await initConsultConnection();
  const labTestConnection = await initLabTestConnection();
  const blogConnection = await initBlogConnection();
  const orderConnection = await initOrderConnection();

  const app = express();

  // CORS Configuration
  const allowedOrigins = [
    'http://localhost:8080',
    'http://localhost:5173',
    'https://medi-plus-ten.vercel.app'
  ];

  app.use(cors({
    origin: function(origin, callback) {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.warn('⚠️ CORS blocked origin:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true
  }));

  // Health check endpoint
  app.get('/check', (req, res) => {
    res.status(200).json({ 
      message: 'Server is up',
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV
    });
  });

  app.get('/api/health', (req, res) => {
    res.json({ 
      status: "ok",
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV
    });
  });

  app.use(express.json());
  app.use(morgan('dev'));
  app.use(cookieParser());
  app.use(passport.initialize());

  console.log('✅ Middleware configured');

  // ============================================
  // ROUTES
  // ============================================

  // Auth routes (login, signup, Google OAuth)
  app.use("/api/auth", (req, res, next) => {
    req.db = userConnection;
    next();
  }, authform);
  console.log('✅ Auth routes registered at /api/auth');

  // User profile route
  app.use("/api/me", (req, res, next) => {
    req.db = userConnection;
    next();
  }, me);
  console.log('✅ User profile routes registered at /api/me');

  // Consultation routes
  app.use("/api/consulting", (req, res, next) => {
    req.db = consultConnection;
    next();
  }, consult);
  console.log('✅ Consultation routes registered at /api/consulting');

  app.use("/api/send-confirmation", (req, res, next) => {
    req.db = consultConnection;
    next();
  }, consultBooking);
  console.log('✅ Consultation booking routes registered at /api/send-confirmation');

  // Lab test routes
  app.use("/api/lab-booking", (req,res,next) => {
    req.db = labTestConnection;
    next();
  },labTestForm);
  console.log('✅ Lab test routes registered at /api/lab-booking');

  // Blog routes
  app.use("/api/blogs",(req,res,next) => {
    req.db = blogConnection;
    next();
  },blogForm);
  console.log('✅ Blog routes registered at /api/blogs');

  // Order routes
  app.use("/api/orders",(req,res,next) => {
    req.db = orderConnection;
    next();
  },orderForm);
  console.log('✅ Order routes registered at /api/orders');

  // Password reset routes
  app.use("/api/password-reset", passwordResetRoutes);
  console.log('✅ Password reset routes registered at /api/password-reset');


  app.use("/api/payments", paymentRoutes);
  console.log('✅ Payment routes registered at /api/payments');

  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error('❌ Error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  });

  // 404 handler
  app.use((req, res) => {
    console.warn('⚠️ 404 Not Found:', req.method, req.path);
    res.status(404).json({ 
      error: 'Route not found',
      path: req.path,
      method: req.method
    });
  });

  // START SERVER
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log('');
    console.log('='.repeat(50));
    console.log(`✅ MediPlus Backend Server Running`);
    console.log(`📍 Port: ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 URL: http://localhost:${PORT}`);
    console.log('='.repeat(50));
    console.log('');
    console.log('Available routes:');
    console.log('  GET  /check - Health check');
    console.log('  GET  /api/health - API health');
    console.log('  POST /api/auth/login - Login');
    console.log('  POST /api/auth/signup - Signup');
    console.log('  GET  /api/auth/google - Google OAuth');
    console.log('  GET  /api/payments/health - Payment health');
    console.log('');
  });
}

startServer().catch(err => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});