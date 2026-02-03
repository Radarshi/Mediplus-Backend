// backend/models/passwordResetToken.js
import mongoose from 'mongoose';

const passwordResetTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  token: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 3600 // Token expires after 1 hour
  }
});

// Create model using the user connection
let PasswordResetToken;

export const getPasswordResetTokenModel = async () => {
  if (!PasswordResetToken) {
    const { initUserConnection } = await import('../db/connections.js');
    const connection = await initUserConnection();
    PasswordResetToken = connection.model('PasswordResetToken', passwordResetTokenSchema);
  }
  return PasswordResetToken;
};

export default getPasswordResetTokenModel;