import dotenv from 'dotenv';
import express from 'express';
import nodemailer from 'nodemailer';
import { createConsultPayment } from '../models/consult.js';
import { findUserByEmail } from '../models/user.js';

dotenv.config();
const router = express.Router();

// POST /api/send-confirmation
router.post('/', async (req, res) => {
  try {
    const { bookingId, name, plan_name, duration, amount, paymentMethod, txnId, email } = req.body;

    if (!email || !bookingId || !plan_name || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const user = await findUserByEmail(email);
    const userId = user?.userId ?? 'GUEST';

    const payment = await createConsultPayment({
      userId, bookingId, name, plan_name, duration, amount, paymentMethod, txnId, email,
    });

    // Send confirmation email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    await transporter.sendMail({
      from: `"MediPlus" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your Booking is Confirmed | MediPlus',
      html: `
  <div style="font-family: Arial, sans-serif; background-color: #f4f8fb; padding: 30px; margin: 0;">
    <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">

      <!-- Header -->
      <div style="background: linear-gradient(90deg, #0d6efd, #00b894); padding: 25px; text-align: center;">
        <img src="https://ibb.co/jkmNW26g" alt="MediPlus Logo" style="height: 60px; margin-bottom: 10px;" />
        <h1 style="color: #ffffff; margin: 0; font-size: 28px;">MediPlus</h1>
        <p style="color: #eaf6ff; margin: 5px 0 0;">Your Trusted Medical Partner</p>
      </div>

      <!-- Body -->
      <div style="padding: 30px; color: #333333;">
        <h2 style="color: #0d6efd; margin-top: 0;">Booking Confirmed</h2>

        <p>Hello <b>${name ?? 'User'}</b>,</p>

        <p>
          We’re pleased to inform you that your booking has been successfully confirmed.
        </p>

        <div style="background: #f8fbff; border: 1px solid #dbeafe; border-radius: 10px; padding: 20px; margin: 20px 0;">
          <p style="margin: 0 0 10px;"><b>Plan:</b> ${plan_name}</p>
          <p style="margin: 0 0 10px;"><b>Duration:</b> ${duration}</p>
          <p style="margin: 0 0 10px;"><b>Amount Paid:</b> ₹${amount}</p>
          <p style="margin: 0 0 10px;"><b>Booking ID:</b> ${bookingId}</p>
          <p style="margin: 0 0 10px;"><b>Payment Method:</b> ${paymentMethod}</p>
          ${txnId ? `<p style="margin: 0;"><b>Transaction ID:</b> ${txnId}</p>` : ''}
        </div>

        <p>
          Your selected healthcare plan is now active. You can manage bookings, track services, and access benefits directly from your account.
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <a href=""
             style="background: #0d6efd; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: bold; display: inline-block;">
             View Booking
          </a>
        </div>

        <p>
          Thank you for choosing <b>MediPlus</b>. We’re committed to delivering reliable and convenient healthcare services for you and your family.
        </p>

        <p style="margin-top: 30px;">Stay Healthy,<br/><b>Team MediPlus</b></p>
      </div>

      <!-- Footer -->
      <div style="background: #f1f5f9; text-align: center; padding: 20px; font-size: 13px; color: #666;">
        <p style="margin: 0;">© 2026 MediPlus. All Rights Reserved.</p>
        <p style="margin: 5px 0 0;">Need help? Contact us at support@mediplus.com</p>
      </div>

    </div>
  </div>
`
    });

    res.status(200).json({ success: true, booking: payment });
  } catch (err) {
    console.error('Consult booking error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;