import dotenv from 'dotenv';
import express from 'express';
import nodemailerPkg from 'nodemailer';
const nodemailer = nodemailerPkg.default || nodemailerPkg;
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getOrderModel } from '../models/order.js';
import getOrderCounter from '../models/orderCounter.js';
import User from '../models/user.js';
import verifyToken from '../utils/verifytoken.js';
dotenv.config();

const router = express.Router();

// Configure multer for prescription uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/prescriptions/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
    cb(null, 'prescription-' + uniqueSuffix + path.extname(sanitizedFilename));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only .png, .jpg, .jpeg and .pdf files are allowed!'));
  }
});

// Configure nodemailer with better error handling
const createTransporter = () => {
  console.log('Email User:', process.env.EMAIL_USER);  
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
  async function generateOrderId() {
  const OrderCounter = await getOrderCounter();
  const counter = await OrderCounter.findByIdAndUpdate(
    { _id: "orderId" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return "MD" + counter.seq.toString().padStart(6, "0");
  }
}

// POST /api/orders/create - Place Order
router.post('/create', verifyToken, upload.single('prescription'), async (req, res) => {
  console.log('🛒 Order creation started...');
  try {
    // Find user
    const user = await User.findById(req.userId);
    if (!user) {
      console.error('❌ User not found:', req.userId);
      return res.status(404).json({ error: 'User not found' });
    }
    console.log('✅ User found:', user.email);

    const {
      deliveryInfo,
      items,
      paymentMethod,
      subtotal,
      discount,
      deliveryCharge,
      total,
      requiresConsultation
    } = req.body;

    // Parse JSON strings if needed
    const parsedItems = typeof items === 'string' ? JSON.parse(items) : items;
    const parsedDeliveryInfo = typeof deliveryInfo === 'string' ? JSON.parse(deliveryInfo) : deliveryInfo;

    console.log('📦 Parsed items:', parsedItems);
    console.log('📍 Parsed delivery info:', parsedDeliveryInfo);

    // Validation
    if (!parsedDeliveryInfo || !parsedItems || parsedItems.length === 0)
      return res.status(400).json({ error: 'Missing required order information' });

    // Get OrderCounter model
    console.log('🔢 Generating order ID...');
    const OrderCounter = await getOrderCounter();
    const counter = await OrderCounter.findByIdAndUpdate(
      { _id: "orderId" },
      { $inc: { seq: 23 } },
      { new: true, upsert: true }
    );
    const orderId = "MD" + counter.seq.toString().padStart(6, "0");
    console.log('✅ Order ID generated:', orderId);

    // Calculate estimated delivery
    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(estimatedDelivery.getDate() + 3);

    // Get Order model and create order
    console.log('💾 Creating order in database...');
    const Order = await getOrderModel();
    
    const orderData = {
      orderId,
      userId: user.userId || user._id.toString(),
      userDetails: {
        name: user.name,
        email: user.email,
        phone: user.phone
      },
      deliveryInfo: parsedDeliveryInfo,
      items: parsedItems,
      paymentMethod,
      paymentStatus: paymentMethod === 'cod' ? 'pending' : 'paid',
      subtotal: parseFloat(subtotal),
      discount: parseFloat(discount) || 0,
      deliveryCharge: parseFloat(deliveryCharge) || 0,
      total: parseFloat(total),
      orderStatus: 'confirmed',
      estimatedDelivery,
      prescriptionUrl: req.file ? `/uploads/prescriptions/${req.file.filename}` : null,
      requiresConsultation: requiresConsultation === 'true',
      statusHistory: [{
        status: 'confirmed',
        timestamp: new Date(),
        note: 'Order placed successfully'
      }]
    };

    console.log('Order data to save:', JSON.stringify(orderData, null, 2));

    const order = await Order.create(orderData);
    console.log('✅ Order saved to database:', order._id);

    // Send confirmation email
    console.log('📧 Attempting to send confirmation email...');
    try {
      const transporter = createTransporter();
      
      // Verify transporter configuration
      await transporter.verify();
      console.log('✅ Email transporter verified successfully');

      const itemsHTML = parsedItems.map(item => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">
            <strong>${item.name}</strong><br/>
            <small style="color: #666;">${item.generic_name || ''}</small>
            ${item.prescription ? '<br/><span style="color: #f59e0b; font-size: 12px;">⚕️ Prescription Required</span>' : ''}
          </td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">
            ${item.quantity}
          </td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">
            ₹${(item.price * item.quantity).toFixed(2)}
          </td>
        </tr>
      `).join('');

      const prescriptionSection = req.file ? `
        <div class="section">
          <h3 class="section-title">📋 Prescription</h3>
          <p style="color: #10b981;">✅ Prescription uploaded successfully</p>
          <p style="color: #6b7280; font-size: 14px;">Our pharmacist will verify your prescription before processing the order.</p>
        </div>
      ` : requiresConsultation === 'true' ? `
        <div class="section">
          <h3 class="section-title">👨‍⚕️ Doctor Consultation</h3>
          <p style="color: #3b82f6;">📞 Consultation requested</p>
          <p style="color: #6b7280; font-size: 14px;">Our doctor will contact you within 24 hours.</p>
        </div>
      ` : '';

      const mailOptions = {
        from: `"MediPlus" <${process.env.EMAIL_USER}>`,
        to: parsedDeliveryInfo.email,
        subject: `Order Confirmation - ${orderId}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #3b82f6 0%, #10b981 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
              .order-id { background: white; padding: 15px; border-left: 4px solid #3b82f6; margin: 20px 0; }
              .section { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
              .section-title { color: #3b82f6; font-size: 18px; margin-bottom: 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
              table { width: 100%; border-collapse: collapse; }
              .total-row { font-weight: bold; background: #f3f4f6; }
              .button { background: linear-gradient(135deg, #3b82f6 0%, #10b981 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
              .footer { text-align: center; color: #6b7280; padding: 20px; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎉 Order Confirmed!</h1>
                <p>Thank you for your order</p>
              </div>
              
              <div class="content">
                <div class="order-id">
                  <p style="margin: 0; color: #6b7280; font-size: 14px;">Order ID</p>
                  <h2 style="margin: 5px 0; color: #3b82f6;">${orderId}</h2>
                </div>

                <p>Hello <strong>${parsedDeliveryInfo.fullName}</strong>,</p>
                <p>Your order has been successfully placed and confirmed!</p>

                ${prescriptionSection}

                <div class="section">
                  <h3 class="section-title">📦 Order Items</h3>
                  <table>
                    <thead>
                      <tr style="background: #f3f4f6;">
                        <th style="padding: 10px; text-align: left;">Item</th>
                        <th style="padding: 10px; text-align: center;">Qty</th>
                        <th style="padding: 10px; text-align: right;">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${itemsHTML}
                      <tr>
                        <td colspan="2" style="padding: 10px; text-align: right;"><strong>Subtotal:</strong></td>
                        <td style="padding: 10px; text-align: right;">₹${parseFloat(subtotal).toFixed(2)}</td>
                      </tr>
                      ${parseFloat(discount) > 0 ? `
                      <tr>
                        <td colspan="2" style="padding: 10px; text-align: right; color: #10b981;"><strong>Discount:</strong></td>
                        <td style="padding: 10px; text-align: right; color: #10b981;">-₹${parseFloat(discount).toFixed(2)}</td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td colspan="2" style="padding: 10px; text-align: right;"><strong>Delivery:</strong></td>
                        <td style="padding: 10px; text-align: right;">${parseFloat(deliveryCharge) === 0 ? '<span style="color: #10b981;">FREE</span>' : '₹' + parseFloat(deliveryCharge).toFixed(2)}</td>
                      </tr>
                      <tr class="total-row">
                        <td colspan="2" style="padding: 15px; text-align: right; font-size: 18px;">Total:</td>
                        <td style="padding: 15px; text-align: right; font-size: 18px; color: #10b981;">₹${parseFloat(total).toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div class="section">
                  <h3 class="section-title">🚚 Delivery Address</h3>
                  <p style="margin: 5px 0;"><strong>${parsedDeliveryInfo.fullName}</strong></p>
                  <p style="margin: 5px 0;">${parsedDeliveryInfo.address}</p>
                  <p style="margin: 5px 0;">${parsedDeliveryInfo.city}, ${parsedDeliveryInfo.state} ${parsedDeliveryInfo.zipCode}</p>
                  ${parsedDeliveryInfo.landmark ? `<p style="margin: 5px 0; color: #6b7280;">Landmark: ${parsedDeliveryInfo.landmark}</p>` : ''}
                  <p style="margin: 5px 0;">📞 ${parsedDeliveryInfo.phone}</p>
                </div>

                <div style="background: #ecfdf5; border: 2px solid #10b981; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
                  <p style="margin: 0; color: #10b981; font-size: 16px;">
                    <strong>📅 Estimated Delivery: ${estimatedDelivery.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>
                  </p>
                </div>

                <div style="text-align: center;">
                  <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/orders" class="button">
                    Track Your Order
                  </a>
                </div>
              </div>

              <div class="footer">
                <p>Thank you for choosing <strong>MediPlus</strong>!</p>
                <p>Questions? Contact us at support@mediplus.com</p>
              </div>
            </div>
          </body>
          </html> `
      };

      console.log('📧 Sending email to:', parsedDeliveryInfo.email);
      const emailResult = await transporter.sendMail(mailOptions);
      console.log('✅ Order confirmation email sent successfully');
      console.log('Email result:', emailResult);
      
    } catch (emailError) {
      console.error('❌ Email failed:', emailError);
      console.error('Email error details:', {
        message: emailError.message,
        code: emailError.code,
        command: emailError.command
      });
      // Don't fail the order if email fails
    }

    res.status(201).json({
      success: true,
      message: "Order placed successfully!",
      orderId: orderId,
      order: {
        _id: order._id,
        orderId: order.orderId,
        total: order.total,
        orderStatus: order.orderStatus,
        estimatedDelivery: order.estimatedDelivery
      }
    });
    console.log('✅ Order creation completed successfully');
  } catch (err) {
    console.error("❌ Order placement failed:", err);
    console.error('Error stack:', err.stack);
    
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ 
      error: err.message || 'Failed to place order',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// GET /api/orders/my-orders - Get User Orders
router.get("/my-orders", verifyToken, async (req, res) => {
  try {
    const Order = await getOrderModel();
    const orders = await Order.find({ userId: req.userId }).sort({
      orderDate: -1
    });

    res.json({ success: true, orders });
  } catch {
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// GET /api/orders/admin/all - Get All Orders (Admin)
router.get('/admin/all', verifyToken, async (req, res) => {
  try {
    const Order = await getOrderModel();
    const { status, startDate, endDate, search } = req.query;

    let query = {};

    if (status) query.orderStatus = status;
    if (startDate && endDate) {
      query.orderDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    if (search) {
      query.$or = [
        { orderId: new RegExp(search, 'i') },
        { 'deliveryInfo.fullName': new RegExp(search, 'i') },
        { 'deliveryInfo.email': new RegExp(search, 'i') }
      ];
    }

    const orders = await Order.find(query)
      .sort({ orderDate: -1 })
      .limit(100);

    const stats = await Order.aggregate([
      {
        $group: {
          _id: '$orderStatus',
          count: { $sum: 1 },
          totalAmount: { $sum: '$total' }
        }
      }
    ]);

    res.json({
      success: true,
      orders,
      count: orders.length,
      stats
    });

  } catch (err) {
    console.error('Admin fetch orders error:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// GET /api/orders/:orderId - Get Single Order
router.get("/:orderId", verifyToken, async (req, res) => {
  try {
    const Order = await getOrderModel();
    const order = await Order.findOne({
      orderId: req.params.orderId,
      userId: req.userId
    });

    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json({ success: true, order });
  } catch {
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

// PUT /api/orders/:orderId/status - Update Order Status (Admin)
router.put('/:orderId/status', verifyToken, async (req, res) => {
  try {
    const { status, note } = req.body;
    const Order = await getOrderModel();
    
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    order.orderStatus = status;
    order.statusHistory.push({
      status,
      timestamp: new Date(),
      note: note || `Status updated to ${status}`
    });

    if (status === 'delivered') {
      order.actualDeliveryDate = new Date();
      order.paymentStatus = 'paid';
    }

    await order.save();

    res.json({
      success: true,
      message: 'Order status updated',
      order
    });

  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// PUT /api/orders/:orderId/cancel - Cancel Order
router.put("/:orderId/cancel", verifyToken, async (req, res) => {
  try {
    const Order = await getOrderModel();
    const order = await Order.findOne({
      orderId: req.params.orderId,
      userId: req.userId
    });

    if (!order) return res.status(404).json({ error: "Order not found" });
    if (!["pending", "confirmed"].includes(order.orderStatus))
      return res.status(400).json({ error: "Cannot cancel order" });

    order.orderStatus = "cancelled";
    order.statusHistory.push({
      status: "cancelled",
      timestamp: new Date(),
      note: "Cancelled by user"
    });

    await order.save();
    res.json({ success: true, order });
  } catch {
    res.status(500).json({ error: "Cancellation failed" });
  }
});

// POST /api/orders/request-consultation
router.post('/request-consultation', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { medicineNames, symptoms, reason } = req.body;

    if (!medicineNames) {
      return res.status(400).json({ error: 'Medicine names are required' });
    }

    try {
      const transporter = createTransporter();

      const doctorMailOptions = {
        from: `"MediPlus" <${process.env.EMAIL_USER}>`,
        to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
        subject: `🩺 Consultation Request - ${user.name}`,
        html: `
          <h2>🩺 New Consultation Request</h2>
          <p><strong>Patient:</strong> ${user.name}</p>
          <p><strong>Email:</strong> ${user.email}</p>
          <p><strong>Phone:</strong> ${user.phone || 'Not provided'}</p>
          <p><strong>Medicines:</strong> ${medicineNames}</p>
          ${symptoms ? `<p><strong>Symptoms:</strong> ${symptoms}</p>` : ''}
          ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
        `
      };

      await transporter.sendMail(doctorMailOptions);
      console.log('✅ Consultation request sent');

    } catch (emailError) {
      console.error('❌ Consultation email failed:', emailError);
    }

    res.json({
      success: true,
      message: 'Consultation request submitted. A doctor will contact you within 24 hours.'
    });

  } catch (err) {
    console.error('Consultation request error:', err);
    res.status(500).json({ error: 'Failed to submit consultation request' });
  }
});

export default router;