import dotenv from "dotenv";
import express from "express";
import { getConsultBookingModel } from "../models/consult_booking.js";
import nodemailer from "nodemailer";
import User from "../models/user.js";

dotenv.config();

const router = express.Router();

// POST /api/consulting
router.post("/", async (req, res) => {
  console.log("The route is hit");
  try {
    const { bookingId, name, plan_name, duration, amount, paymentMethod, txnId, email } = req.body;

    // Validate required fields
    if (!email || !bookingId || !plan_name || !amount) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // ✅ Get the model correctly
    const ConsultBookingModel = await getConsultBookingModel();

    const consultsession = await ConsultBookingModel.create({
      userId: user.userId,
      bookingId,
      name,
      plan_name,
      duration,
      amount,
      paymentMethod,
      txnId,
      email,
    });

    console.log("✅ Booking created:", consultsession);

    // Send confirmation email
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

    res.status(200).json({ success: true, booking: consultsession });
  } catch (err) {
    console.error("❌ Booking error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
