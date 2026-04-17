// routes/consultation.js
import dotenv from 'dotenv';
import express from 'express';
import validator from 'validator';
import { createConsultation } from '../models/consult.js';
import { findUserByEmail } from '../models/user.js';
import { createTransport } from 'nodemailer';

dotenv.config();
const router = express.Router();

// POST /api/consulting
router.post('/', async (req, res) => {
  console.log('📞 Consultation booking received');

  try {
    const {
      name, age, phone, email, symptoms,
      preferred_date, preferred_time,
      doctor_name, doctor_id,
      consultation_type, plan_name, amount,
    } = req.body;

    if (!name || !age || !phone || !email || !symptoms || !preferred_date || !preferred_time || !doctor_name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    // Find user (optional — guests allowed)
    let userId = 'GUEST';
    const user = await findUserByEmail(email);
    if (user) userId = user.userId;

    const consult = await createConsultation({
      userId, name, doctor_name, doctor_id,
      age: parseInt(age), phone, email, symptoms,
      preferred_date, preferred_time,
      consultation_type: consultation_type ?? 'video',
      plan_name:         plan_name         ?? 'Standard',
      amount:            amount            ?? 0,
    });

    console.log('✅ Consultation saved:', consult._id);

    // Send confirmation email
    try {
      const transporter = createTransport({
        service: 'gmail',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      });

      await transporter.sendMail({
        from:    `"MediPlus" <${process.env.EMAIL_USER}>`,
        to:      email,
        subject: '✅ Consultation Booking Confirmation - MediPlus',
        html: `
          <h2>Consultation Confirmed!</h2>
          <p>Hello <strong>${name}</strong>,</p>
          <p>Your consultation has been booked successfully.</p>
          <ul>
            <li><strong>Doctor:</strong> ${doctor_name}</li>
            <li><strong>Plan:</strong> ${plan_name ?? 'Standard'}</li>
            <li><strong>Date:</strong> ${preferred_date}</li>
            <li><strong>Time:</strong> ${preferred_time}</li>
            <li><strong>Amount:</strong> ₹${amount ?? 'TBD'}</li>
          </ul>
          <p>Thank you for choosing MediPlus!</p>
        `,
      });
      console.log('✅ Email sent to', email);
    } catch (emailErr) {
      console.error('❌ Email failed:', emailErr.message);
    }

    res.status(201).json({ success: true, consult });
  } catch (err) {
    console.error('❌ Consultation booking failed:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

export default router;