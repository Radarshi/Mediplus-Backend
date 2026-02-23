import dotenv from 'dotenv';
import express from 'express';
import validator from 'validator';
import { getConsultModel } from '../models/consult.js';
import User from '../models/user.js';
import { createTransport } from 'nodemailer';  // ✅ FIXED: Import createTransport directly

dotenv.config();

const router = express.Router();

// ✅ Test email configuration on startup
const testEmailConnection = async () => {
  console.log('📧 Testing email configuration...');
  console.log('   EMAIL_USER:', process.env.EMAIL_USER);
  console.log('   EMAIL_PASS:', process.env.EMAIL_PASS ? '***' + process.env.EMAIL_PASS.slice(-4) : '❌ MISSING');

  try {
    const transporter = createTransport({  // ✅ Use createTransport directly
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.verify();
    console.log('✅ Email server connection successful');
    console.log('   Emails will be sent FROM:', process.env.EMAIL_USER);
  } catch (error) {
    console.error('❌ Email server connection FAILED');
    console.error('   Error:', error.message);
    console.error('   Code:', error.code);
  }
};

// Run email test on module load
testEmailConnection();

// POST /api/consulting - Book consultation appointment
router.post("/", async (req, res) => {
  console.log('📞 Consultation booking request received');
  console.log('📦 Request body:', req.body);
  
  try {
    const { 
      name, 
      age, 
      phone, 
      email, 
      symptoms, 
      preferred_date, 
      preferred_time, 
      doctor_name, 
      doctor_id,
      consultation_type,
      plan_name,
      amount
    } = req.body;

    // Validate required fields
    if (!name || !age || !phone || !email || !symptoms || !preferred_date || !preferred_time || !doctor_name) {
      console.log('❌ Missing required fields');
      return res.status(400).json({ 
        error: "Missing required fields",
        details: "Please fill all fields: name, age, phone, email, symptoms, date, time, doctor"
      });
    }

    // Validate email
    if (!validator.isEmail(email)) {
      console.log('❌ Invalid email:', email);
      return res.status(400).json({ error: "Invalid email address" });
    }

    // Find user
    let user = await User.findOne({ email });
    let userId = 'GUEST';
    
    if (user) {
      userId = user.userId;
      console.log('✅ User found:', email, userId);
    } else {
      console.log('⚠️  User not found in database, booking as guest');
    }

    // Get consultation model
    const ConsultModel = await getConsultModel();

    // Create consultation booking
    const consult = await ConsultModel.create({
      userId: userId,
      name,
      doctor_name,
      doctor_id: doctor_id || 'unknown',
      age: parseInt(age),
      phone,
      email,
      symptoms,
      preferred_date,
      preferred_time
    });

    console.log("✅ Consultation booked:", consult._id);

    // ✅ Send confirmation email
    try {
      console.log('📧 Preparing to send email...');
      console.log('   TO:', email);
      console.log('   FROM:', process.env.EMAIL_USER);

      const transporter = createTransport({  // ✅ Use createTransport directly
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });

      const consultType = consultation_type || 'video';
      const consultPlan = plan_name || 'Standard consultation';
      const consultAmount = amount || 'TBD';

      console.log('   Plan:', consultPlan);
      console.log('   Amount:', consultAmount);

      const mailOptions = {
        from: `"MediPlus" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "✅ Consultation Booking Confirmation - MediPlus",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
              .info-box { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #667eea; }
              .price { font-size: 32px; font-weight: bold; color: #10b981; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">🏥 MediPlus</h1>
                <p style="margin: 5px 0 0 0;">Your health, our priority</p>
              </div>
              <div class="content">
                <h2>✅ Consultation Booked Successfully!</h2>
                <p>Hello <strong>${name}</strong>,</p>
                <p>Your consultation has been confirmed. Here are your booking details:</p>
                
                <div class="info-box">
                  <h3 style="margin-top: 0;">👨‍⚕️ Doctor Details</h3>
                  <p><strong>Doctor:</strong> ${doctor_name}</p>
                  <p><strong>Consultation Type:</strong> ${consultPlan}</p>
                </div>

                <div class="info-box">
                  <h3 style="margin-top: 0;">📅 Appointment Details</h3>
                  <p><strong>Date:</strong> ${preferred_date}</p>
                  <p><strong>Time:</strong> ${preferred_time}</p>
                  <p><strong>Symptoms:</strong> ${symptoms}</p>
                </div>

                <div class="info-box">
                  <h3 style="margin-top: 0;">💰 Payment</h3>
                  <p class="price">₹${consultAmount}</p>
                  <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">Amount to be paid</p>
                </div>

                <div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0;">
                  <p style="margin: 0;"><strong>📱 Important:</strong></p>
                  <p style="margin: 5px 0 0 0;">You will receive a call/message from our team before your scheduled time.</p>
                </div>

                <p>If you have any questions, please contact us at support@mediplus.com</p>
                <p>Thank you for choosing MediPlus!</p>
              </div>
              <div class="footer">
                <p>© 2026 MediPlus - Your Health Partner</p>
                <p>This is an automated email. Please do not reply directly.</p>
              </div>
            </div>
          </body>
          </html>
        `
      };

      console.log('📤 Sending email...');
      const info = await transporter.sendMail(mailOptions);
      
      console.log('✅ Email sent successfully!');
      console.log('   Message ID:', info.messageId);
      console.log('   TO:', email);
      console.log('   Amount in email: ₹' + consultAmount);
      
    } catch (emailError) {
      console.error('❌ Email send FAILED');
      console.error('   Error message:', emailError.message);
      console.error('   Error code:', emailError.code);
      console.error('   Response:', emailError.response);
    }

    res.status(201).json({ 
      success: true, 
      consult: {
        _id: consult._id,
        name: consult.name,
        doctor_name: consult.doctor_name,
        preferred_date: consult.preferred_date,
        preferred_time: consult.preferred_time,
        amount: amount || 'TBD'
      }
    });
    
  } catch (err) {
    console.error("❌ Consultation booking failed:", err);
    console.error("Error details:", err.message);
    
    res.status(500).json({ 
      error: "Server error", 
      details: err.message 
    });
  }
});

export default router;