// routes/consult_booking.js
import dotenv from 'dotenv';
import express from 'express';
import nodemailer from 'nodemailer';
import { createConsultPayment } from '../models/consult.js';
import { findUserByEmail } from '../models/user.js';

dotenv.config();
const router = express.Router();

// POST /api/send-confirmation
router.post('/', async (req, res) => {
  console.log('📋 Consult payment confirmation route hit');

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

    console.log('✅ Consult payment record created:', payment._id);

    // Send confirmation email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    await transporter.sendMail({
      from:    `"MediPlus" <${process.env.EMAIL_USER}>`,
      to:      email,
      subject: 'Booking Confirmation - MediPlus',
      html: `
        <h2>Booking Confirmed</h2>
        <p>Hello ${name ?? 'User'},</p>
        <p>Your booking has been successfully confirmed.</p>
        <ul>
          <li><strong>Plan:</strong> ${plan_name}</li>
          <li><strong>Duration:</strong> ${duration}</li>
          <li><strong>Amount:</strong> ₹${amount}</li>
          <li><strong>Booking ID:</strong> ${bookingId}</li>
          <li><strong>Payment Method:</strong> ${paymentMethod}</li>
          ${txnId ? `<li><strong>Transaction ID:</strong> ${txnId}</li>` : ''}
        </ul>
        <p>Thank you for choosing MediPlus.</p>
      `,
    });

    res.status(200).json({ success: true, booking: payment });
  } catch (err) {
    console.error('❌ Consult booking error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;