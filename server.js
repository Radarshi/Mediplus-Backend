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
import me from './routes/me.js';
dotenv.config();

const startServer = async() => {
  const userConnection = await initUserConnection();
  const consultConnection = await initConsultConnection();
  const labTestConnection = await initLabTestConnection();
  const blogConnection = await initBlogConnection();
  const orderConnection = await initOrderConnection();

  const app = express();

  // CORS Configuration
  app.use(cors({
    origin: "http://localhost:8080",
    credentials: true
  }));

  app.get('/check', (req, res) => {
    res.status(200).json({ message: 'Server is up' });
  });

  app.use(express.json());
  app.use(morgan('dev'));
  app.use(cookieParser());
  app.use(passport.initialize());

  // Auth routes (login, signup, Google OAuth)
  app.use("/auth", (req, res, next) => {
    req.db = userConnection;
    next();
  }, authform);

  app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
  });

  // User profile route
  app.use("/api/me", (req, res, next) => {
    req.db = userConnection;
    next();
  }, me);

  // Consultation routes
  app.use("/api/consulting", (req, res, next) => {
    req.db = consultConnection;
    next();
  }, consult);

  app.use("/api/send-confirmation", (req, res, next) => {
    req.db = consultConnection;
    next();
  }, consultBooking);

  // Lab test routes
  app.use("/api/lab-booking", (req,res,next) => {
    req.db = labTestConnection;
    next();
  },labTestForm);

  // Blog routes
  app.use("/api/blogs",(req,res,next) => {
    req.db = blogConnection;
    next();
  },blogForm);

  // Order routes
  app.use("/api/orders",(req,res,next) => {
    req.db = orderConnection;
    next();
  },orderForm);

  // PASSWORD RESET ROUTES - MOVED HERE BEFORE app.listen()
  app.use("/api/password-reset", passwordResetRoutes);

  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  });

  // START SERVER (this should be LAST)
  app.listen(process.env.PORT || 3000, () => {
    console.log(`✅ Server running on port ${process.env.PORT}`);
  });
}

startServer();
