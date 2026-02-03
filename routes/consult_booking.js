import dotenv from "dotenv"
import express from "express";
import { ConsultBookingModel } from '../models/consult_booking.js'
import nodemailer from "nodemailer"
import User from '../models/user.js'
dotenv.config();

const router = express.Router();
router.post('/', async (req, res) => {
  console.log("The route is hit");
  try{
    const { bookingId, name, plan_name, duration, amount, paymentMethod, txnId, email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }
    const ConsultBooking = await ConsultBookingModel();
    const consultsession = await ConsultBooking.create({
      userId: user.userId,
      bookingId,
      name,
      plan_name,
      duration,
      amount,
      paymentMethod,
      txnId,
      email });
      console.log(consultsession);

  const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      }); 
  
      const mailOptions = {
        from: `"MediPlus" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Booking Confirmation",
        html: `
          <h2>Booking Confirmed</h2>
          <p>Hello ${name ?? "User"},</p>
          <p>Your booking has been successfully confirmed.</p>
          <ul>
            <li><strong>Plan:</strong> ${plan_name}</li>
            <li><strong>Duration:</strong> ${duration}</li>
            <li><strong>Amount:</strong> ₹${amount}</li>
            <li><strong>Booking ID:</strong> ${bookingId}</li>
            <li><strong>Payment Method:</strong> ${paymentMethod}</li>
            ${txnId ? `<li><strong>Transaction ID:</strong> ${txnId}</li>` : ""}
          </ul>
          <p>Thank you for choosing MediPlus.</p>
        `,
      };
  
      await transporter.sendMail(mailOptions);
      res.status(200).json({ success: true });
      } catch (err) {
    console.error("Email send error:", err);
    res.status(500).json({ error: "Failed to send email" });
  }
});

export default router;