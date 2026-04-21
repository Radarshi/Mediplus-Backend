// routes/passwordReset.js
import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { findUserByEmail, findUserById, updateUser } from '../models/user.js';
import { createResetToken, findResetToken, deleteResetToken, deleteUserResetTokens } from '../models/passwordResetToken.js';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();

const createTransporter = () =>
  nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });

// ─── POST /api/password-reset/request ────────────────────────────────────────
router.post('/request', async (req, res) => {
  const { email } = req.body;
  console.log('🔑 Password reset request for:', email);

  try {
    const user = await findUserByEmail(email);
    // Don't reveal existence
    if (!user) {
      return res.json({ success: true, message: 'If that email exists, you will receive a reset link' });
    }

    // Delete any old tokens for this user first
    await deleteUserResetTokens(user._id);

    const resetToken = crypto.randomBytes(32).toString('hex');
    await createResetToken(user._id, resetToken);

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:8080'}/reset-password?token=${resetToken}`;

    try {
      const transporter = createTransporter();
      await transporter.sendMail({
        from:    `"MediPlus" <${process.env.EMAIL_USER}>`,
        to:      email,
        subject: 'Password Reset Request - MediPlus',
        html: `
          <h2>🔐 Password Reset</h2>
          <p>Hello <strong>${user.name}</strong>,</p>
          <p>Click the link below to reset your password. This link expires in 1 hour.</p>
          <p><a href="${resetUrl}" style="background:#3b82f6;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;">Reset Password</a></p>
          <p style="color:#999;font-size:13px;">If you didn't request this, ignore this email.</p>
        `,
      });
      console.log('✅ Reset email sent');
    } catch (emailErr) {
      console.error('❌ Reset email failed:', emailErr.message);
      return res.status(500).json({ error: 'Failed to send reset email. Please try again.' });
    }

    res.json({ success: true, message: 'Password reset link sent to your email' });
  } catch (err) {
    console.error('❌ Password reset error:', err);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

// ─── POST /api/password-reset/verify ─────────────────────────────────────────
router.post('/verify', async (req, res) => {
  try {
    const record = await findResetToken(req.body.token);
    if (!record) return res.status(400).json({ error: 'Invalid or expired reset token' });
    res.json({ success: true, message: 'Token is valid' });
  } catch (err) {
    console.error('❌ Token verify error:', err);
    res.status(500).json({ error: 'Failed to verify token' });
  }
});

// ─── POST /api/password-reset/reset ──────────────────────────────────────────
router.post('/reset', async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    const record = await findResetToken(token);
    if (!record) return res.status(400).json({ error: 'Invalid or expired reset token' });

    const user = await findUserById(record.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await updateUser(user._id, { password: hashed });
    await deleteResetToken(record._id);

    console.log('✅ Password reset for:', user.email);

    // Send confirmation email (non-blocking)
    try {
      const transporter = createTransporter();
      await transporter.sendMail({
        from:    `"MediPlus" <${process.env.EMAIL_USER}>`,
        to:      user.email,
        subject: 'Password Changed Successfully - MediPlus',
        html: `<p>Hello <strong>${user.name}</strong>, your password has been changed successfully. If you didn't do this, contact us immediately.</p>`,
      });
    } catch (_) {}

    res.json({ success: true, message: 'Password reset successful. You can now login with your new password.' });
  } catch (err) {
    console.error('❌ Password reset error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

export default router;