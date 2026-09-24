// routes/labTestForm.js
import express from 'express';
import nodemailer from 'nodemailer';
import {
  getAllLabTests, getLabTestById,
  createLabBooking, findBookingsByUser, updateBookingStatus
} from '../models/lab-test.js';
import { findUserById } from '../models/user.js';
import verifyToken from '../utils/verifyToken.js';

const router = express.Router();

const createTransporter = () =>
  nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });

// GET /api/lab-booking/tests — public catalog (no auth needed)
router.get('/tests', async (req, res) => {
  try {
    const tests = await getAllLabTests();
    res.json({ success: true, tests });
  } catch (err) {
    console.error('Fetch lab tests error:', err);
    res.status(500).json({ error: 'Failed to fetch lab tests' });
  }
});

// GET /api/lab-booking/tests/:id
router.get('/tests/:id', async (req, res) => {
  try {
    const test = await getLabTestById(req.params.id);
    if (!test) return res.status(404).json({ error: 'Test not found' });
    res.json({ success: true, test });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch test' });
  }
});

// POST /api/lab-booking/create — book test(s)
router.post('/create', verifyToken, async (req, res) => {
  try {
    const user = await findUserById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { tests, patientInfo, address, preferredDate, preferredTime, paymentMethod } = req.body;

    if (!tests?.length || !patientInfo || !address || !preferredDate || !preferredTime) {
      return res.status(400).json({ error: 'Missing required booking information' });
    }

    const subtotal = tests.reduce((s, t) => s + Number(t.price), 0);
    const total    = subtotal; // add discounts/charges here later if needed

    const booking = await createLabBooking({
      userId:      user.userId,
      userDetails: { name: user.name, email: user.email, phone: user.phone },
      tests, patientInfo, address, preferredDate, preferredTime,
      subtotal, total, paymentMethod,
    });

    // Confirmation email (non-blocking)
    try {
      const transporter = createTransporter();
      const testsHTML = tests.map(t => `<li>${t.name} — ₹${t.price}</li>`).join('');
      await transporter.sendMail({
        from: `"MediPlus" <${process.env.EMAIL_USER}>`,
        to: patientInfo.email || user.email,
        subject: `Lab Test Booking Confirmed - ${booking.bookingId}`,
        html: `
          <h2>🧪 Booking Confirmed!</h2>
          <p>Hello <strong>${patientInfo.fullName}</strong>,</p>
          <p>Booking ID: <strong>${booking.bookingId}</strong></p>
          <ul>${testsHTML}</ul>
          <p><strong>Total: ₹${total.toFixed(2)}</strong></p>
          <p>Sample collection: ${preferredDate} at ${preferredTime}</p>
          <p>Address: ${address.address}, ${address.city}</p>
          <p>Thank you for choosing MediPlus!</p>
        `,
      });
    } catch (emailErr) {
      console.error('Lab booking email failed:', emailErr.message);
    }

    res.status(201).json({ success: true, message: 'Lab test booked successfully!', booking });
  } catch (err) {
    console.error('Lab booking error:', err);
    res.status(500).json({ error: 'Failed to book lab test' });
  }
});

// GET /api/lab-booking/my-bookings
router.get('/my-bookings', verifyToken, async (req, res) => {
  try {
    const user = await findUserById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const bookings = await findBookingsByUser(user.userId);
    res.json({ success: true, bookings });
  } catch (err) {
    console.error('Fetch bookings error:', err);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// PUT /api/lab-booking/:bookingId/status (admin)
router.put('/:bookingId/status', verifyToken, async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await updateBookingStatus(req.params.bookingId, status);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json({ success: true, booking });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

export default router;