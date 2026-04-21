// routes/labTestForm.js
import dotenv from 'dotenv';
import express from 'express';
import nodemailer from 'nodemailer';
import validator from 'validator';
import { createLabBooking } from '../models/lab-test.js';
import { findUserByEmail } from '../models/user.js';

dotenv.config();
const router = express.Router();

// POST /api/lab-booking
router.post('/', async (req, res) => {
  try {
    const { name, phone, email, address, date, time, instruction, labtest_id, labtest_name, venue } = req.body;

    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    const user   = await findUserByEmail(email.toLowerCase());
    const userId = user?.userId ?? 'GUEST';

    const booking = await createLabBooking({
      userId, name, phone, email, address, date, time,
      instruction, labtest_id, labtest_name, venue,
    });

    console.log('✅ Lab booking created:', booking._id);

    // Send confirmation email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    await transporter.sendMail({
      from:    `"MediPlus" <${process.env.EMAIL_USER}>`,
      to:      email,
      subject: 'Lab Test Booking Confirmation',
      html: `
        <h2>Lab Test Booking Confirmation</h2>
        <p>Hello <b>${name}</b>,</p>
        <p>Your <b>${labtest_name}</b> has been successfully booked.</p>
        <p>
          <b>Venue:</b> ${venue}<br/>
          <b>Date:</b> ${date}<br/>
          <b>Time:</b> ${time}
        </p>
        <p>Thank you for choosing <b>MediPlus</b>!</p>
      `,
    });

    res.status(201).json({ message: 'Booking successful, confirmation email sent!', booking });
  } catch (err) {
    console.error('❌ Lab booking failed:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;