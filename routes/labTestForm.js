import dotenv from 'dotenv';
import express from 'express';
import nodemailer from 'nodemailer';
import validator from 'validator';
import generateToken from '../utils/generatetoken.js';
import verifyToken from '../utils/verifytoken.js';
import LabBooking from '../models/lab-test.js';
import User from '../models/user.js';
dotenv.config();

const router = express.Router();

router.post('/', async (req, res) => {
    try {
      const { name, phone, email, address, date, time,instruction, labtest_id, labtest_name, venue } = req.body;

      if (!validator.isEmail(email))
        return res.status(400).json({ error: "Invalid email address" });
    
      const user = await User.findOne({ email:email.toLowerCase() });
      
      if (!user)
        return res.status(400).json({ error: 'User not found' });
    
    const lab_test = await LabBooking.create({
      userId: user.userId,
      name,
      phone,
      email,
      address,
      date: new Date(date),
      time,
      instruction,
      labtest_id,
      labtest_name,
      venue
    });
      
    const token = generateToken(lab_test._id);
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const mailOptions = {
      from: `"MediPlus" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Lab Test Booking Confirmation",
      text: `Hello ${name},\n\nYour ${labtest_name} has been successfully booked.\n\n📅 Date: ${date}\n⏰ Time: ${time}\n\nThank you for choosing MediPlus!`,
      html: `
        <h2>Lab Test Booking Confirmation</h2>
        <p>Hello <b>${name}</b>,</p>
        <p>Your lab test has been successfully booked.</p>
        <p><b>Venue:</b> ${venue}<br/>
        <b>Date:</b> ${date}<br/>
        <b>Time:</b> ${time}</p>
        <p>Thank you for choosing <b>MediPlus</b>!</p>
      `
    };

    await transporter.sendMail(mailOptions);

    res.status(201).json({ message: "Booking successful, confirmation email sent!" });
  } catch (err) {
    console.error("Lab Test booking failed:", err)
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;