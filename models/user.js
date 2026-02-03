import mongoose from 'mongoose';
import { initUserConnection } from '../db/connections.js';

// IMPORTANT: We need to ensure Counter model is available
const CounterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 }
});

// Define the User Schema
const UserSchema = new mongoose.Schema({
  userId: {
    type: String,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  // --- Google Auth Fields ---
  googleId: {
    type: String, 
    unique: true, 
    sparse: true
  },
  picture: {
    type: String
  },
  // --- Optional Fields ---
  age: { type: Number, default: 0 },
  gender: { type: String, default: 'other' },
  phone: { type: String, default: '' },
  password: { type: String, required: true }, 
  role: {
    type: String,
    default: 'patient'
  }
}, { timestamps: true });

// Middleware: Auto-generate UserId (e.g., USR0005)
UserSchema.pre("save", async function (next) {
  if (this.isNew && !this.userId) {
    try {
      // Get the connection for this model
      const connection = this.constructor.db;
      
      // Get or create Counter model on the same connection
      let Counter;
      try {
        Counter = connection.model('Counter');
      } catch (e) {
        Counter = connection.model('Counter', CounterSchema);
      }

      const counter = await Counter.findByIdAndUpdate(
        { _id: "userId" },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      
      // Generate ID: USR + padded number (e.g., USR0005)
      this.userId = "USR" + counter.seq.toString().padStart(4, "0");
    } catch (err) {
      console.error("Error generating userId:", err);
      return next(err);
    }
  }
  next();
});

// Initialize connection and create model
let User;
const userConnection = await initUserConnection();

// Ensure Counter model exists on this connection
try {
  userConnection.model('Counter');
} catch (e) {
  userConnection.model('Counter', CounterSchema);
}

User = userConnection.model('User', UserSchema);

export default User;