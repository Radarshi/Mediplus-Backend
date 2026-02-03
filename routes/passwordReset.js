// backend/routes/passwordReset.js
import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import User from '../models/user.js';
import getPasswordResetTokenModel from '../models/passwordResetToken.js';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();

// Email transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// ============================================
// POST /api/password-reset/request
// Request password reset
// ============================================
router.post('/request', async (req, res) => {
  const { email } = req.body;
  console.log('🔑 Password reset request for:', email);

  try {
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if user exists (security)
      return res.json({
        success: true,
        message: 'If that email exists, you will receive a reset link'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    console.log('✅ Reset token generated');

    // Save token to database
    const PasswordResetToken = await getPasswordResetTokenModel();
    await PasswordResetToken.create({
      userId: user._id,
      token: resetToken
    });

    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:8080'}/reset-password?token=${resetToken}`;

    // Send email
    try {
      const transporter = createTransporter();
      
      const mailOptions = {
        from: `"MediPlus" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Password Reset Request - MediPlus',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #3b82f6 0%, #9333ea 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { background: linear-gradient(135deg, #3b82f6 0%, #9333ea 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
              .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🔐 Password Reset</h1>
              </div>
              
              <div class="content">
                <p>Hello <strong>${user.name}</strong>,</p>
                <p>We received a request to reset your password for your MediPlus account.</p>
                
                <p>Click the button below to reset your password:</p>
                
                <div style="text-align: center;">
                  <a href="${resetUrl}" class="button">Reset Password</a>
                </div>
                
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #3b82f6;">${resetUrl}</p>
                
                <div class="warning">
                  <p style="margin: 0;"><strong>⚠️ Important:</strong></p>
                  <ul style="margin: 10px 0;">
                    <li>This link will expire in 1 hour</li>
                    <li>If you didn't request this, please ignore this email</li>
                    <li>Your password won't change until you create a new one</li>
                  </ul>
                </div>
                
                <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                  For security reasons, we don't include your password in this email.
                </p>
              </div>
            </div>
          </body>
          </html>
        `
      };

      await transporter.sendMail(mailOptions);
      console.log('✅ Password reset email sent');
      
    } catch (emailError) {
      console.error('❌ Email failed:', emailError);
      return res.status(500).json({
        error: 'Failed to send reset email. Please try again.'
      });
    }

    res.json({
      success: true,
      message: 'Password reset link sent to your email'
    });

  } catch (error) {
    console.error('❌ Password reset error:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

// ============================================
// POST /api/password-reset/verify
// Verify reset token
// ============================================
router.post('/verify', async (req, res) => {
  const { token } = req.body;
  console.log('🔍 Verifying reset token');

  try {
    const PasswordResetToken = await getPasswordResetTokenModel();
    const resetToken = await PasswordResetToken.findOne({ token });

    if (!resetToken) {
      return res.status(400).json({
        error: 'Invalid or expired reset token'
      });
    }

    res.json({
      success: true,
      message: 'Token is valid'
    });

  } catch (error) {
    console.error('❌ Token verification error:', error);
    res.status(500).json({ error: 'Failed to verify token' });
  }
});

// ============================================
// POST /api/password-reset/reset
// Reset password with token
// ============================================
router.post('/reset', async (req, res) => {
  const { token, newPassword } = req.body;
  console.log('🔄 Processing password reset');

  try {
    // Find token
    const PasswordResetToken = await getPasswordResetTokenModel();
    const resetToken = await PasswordResetToken.findOne({ token });

    if (!resetToken) {
      return res.status(400).json({
        error: 'Invalid or expired reset token'
      });
    }

    // Find user
    const user = await User.findById(resetToken.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password
    user.password = hashedPassword;
    await user.save();

    // Delete used token
    await PasswordResetToken.deleteOne({ _id: resetToken._id });

    console.log('✅ Password reset successful for:', user.email);

    // Send confirmation email
    try {
      const transporter = createTransporter();
      
      const mailOptions = {
        from: `"MediPlus" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: 'Password Changed Successfully - MediPlus',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>✅ Password Changed</h1>
              </div>
              
              <div class="content">
                <p>Hello <strong>${user.name}</strong>,</p>
                <p>Your password has been successfully changed.</p>
                
                <p>If you did not make this change, please contact us immediately at support@mediplus.com</p>
                
                <p style="margin-top: 30px;">
                  <strong>Thank you,</strong><br>
                  The MediPlus Team
                </p>
              </div>
            </div>
          </body>
          </html>
        `
      };

      await transporter.sendMail(mailOptions);
      console.log('✅ Password change confirmation email sent');
      
    } catch (emailError) {
      console.error('❌ Confirmation email failed:', emailError);
    }

    res.json({
      success: true,
      message: 'Password reset successful. You can now login with your new password.'
    });

  } catch (error) {
    console.error('❌ Password reset error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

export default router;