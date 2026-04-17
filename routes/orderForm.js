// routes/orderForm.js
import dotenv from 'dotenv';
import express from 'express';
import nodemailer from 'nodemailer';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { createOrder, findOrdersByUser, getAllOrders, findOrderById, updateOrderStatus, deleteOrder } from '../models/order.js';
import { findUserById, findUserByEmail } from '../models/user.js';
import verifyToken from '../utils/verifytoken.js';

dotenv.config();
const router = express.Router();

// ─── Multer for prescription uploads ────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/prescriptions/';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const suffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'prescription-' + suffix + path.extname(file.originalname));
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /jpeg|jpg|png|pdf/.test(path.extname(file.originalname).toLowerCase());
    ok ? cb(null, true) : cb(new Error('Only .png .jpg .jpeg .pdf allowed'));
  },
});

// ─── Email transporter ────────────────────────────────────────────────────────
const createTransporter = () =>
  nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });

// ─── POST /api/orders/create ──────────────────────────────────────────────────
router.post('/create', verifyToken, upload.single('prescription'), async (req, res) => {
  console.log('🛒 Order creation started...');
  try {
    const user = await findUserByUserId(req.userId);\n    if (!user) return res.status(404).json({ error: 'User not found' });

    const {
      deliveryInfo, items, paymentMethod, transactionId,
      subtotal, discount, deliveryCharge, total,
      requiresConsultation, orderNotes,
    } = req.body;

    const parsedItems        = typeof items        === 'string' ? JSON.parse(items)        : items;
    const parsedDeliveryInfo = typeof deliveryInfo === 'string' ? JSON.parse(deliveryInfo) : deliveryInfo;

    if (!parsedDeliveryInfo || !parsedItems?.length) {
      return res.status(400).json({ error: 'Missing required order information' });
    }

    const order = await createOrder({
      userId:       user.userId || user._id,
      userDetails:  { name: user.name, email: user.email, phone: user.phone },
      deliveryInfo: parsedDeliveryInfo,
      items:        parsedItems,
      paymentMethod,
      transactionId: transactionId ?? null,
      subtotal:      parseFloat(subtotal),
      discount:      parseFloat(discount)      || 0,
      deliveryCharge: parseFloat(deliveryCharge) || 0,
      total:         parseFloat(total),
      requiresConsultation: requiresConsultation === 'true' || requiresConsultation === true,
      prescriptionUrl: req.file ? `/uploads/prescriptions/${req.file.filename}` : null,
      orderNotes:    orderNotes ?? '',
    });

    console.log('✅ Order created:', order.orderId);

    // Send confirmation email (non-blocking)
    try {
      const transporter = createTransporter();
      const itemsHTML   = parsedItems.map(
        (item) => `<li>${item.name} × ${item.quantity} — ₹${(item.price * item.quantity).toFixed(2)}</li>`
      ).join('');

      await transporter.sendMail({
        from:    `"MediPlus" <${process.env.EMAIL_USER}>`,
        to:      parsedDeliveryInfo.email,
        subject: `Order Confirmation - ${order.orderId}`,
        html: `
          <h2>🎉 Order Confirmed!</h2>
          <p>Hello <strong>${parsedDeliveryInfo.fullName}</strong>,</p>
          <p>Order ID: <strong>${order.orderId}</strong></p>
          <ul>${itemsHTML}</ul>
          <p><strong>Total: ₹${parseFloat(total).toFixed(2)}</strong></p>
          <p>Estimated Delivery: ${order.estimatedDelivery}</p>
          <p>Thank you for choosing MediPlus!</p>
        `,
      });
      console.log('✅ Order confirmation email sent');
    } catch (emailErr) {
      console.error('❌ Email failed (order still created):', emailErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Order placed successfully!',
      orderId: order.orderId,
      order: {
        _id:               order._id,
        orderId:           order.orderId,
        total:             order.total,
        orderStatus:       order.orderStatus,
        estimatedDelivery: order.estimatedDelivery,
      },
    });
  } catch (err) {
    console.error('❌ Order failed:', err);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: err.message || 'Failed to place order' });
  }
});

// ─── GET /api/orders/my-orders ────────────────────────────────────────────────
router.get('/my-orders', verifyToken, async (req, res) => {
  try {
    const user = await findUserById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Try both userId formats for backwards compatibility
    const orders = await findOrdersByUser(user.userId || user._id);
    res.json({ success: true, orders });
  } catch (err) {
    console.error('❌ Fetch orders error:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// ─── GET /api/orders/admin/all ────────────────────────────────────────────────
router.get('/admin/all', verifyToken, async (req, res) => {
  try {
    const { status, search } = req.query;
    const { orders, total }  = await getAllOrders({ status, search });
    res.json({ success: true, orders, count: total });
  } catch (err) {
    console.error('❌ Admin fetch orders error:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// ─── GET /api/orders/:orderId ─────────────────────────────────────────────────
router.get('/:orderId', verifyToken, async (req, res) => {
  try {
    const order = await findOrderById(req.params.orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// ─── PUT /api/orders/:orderId/status ─────────────────────────────────────────
router.put('/:orderId/status', verifyToken, async (req, res) => {
  try {
    const { status, note } = req.body;
    const order = await updateOrderStatus(req.params.orderId, status, note);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ success: true, message: 'Order status updated', order });
  } catch (err) {
    console.error('❌ Update status error:', err);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// ─── PUT /api/orders/:orderId/cancel ─────────────────────────────────────────
router.put('/:orderId/cancel', verifyToken, async (req, res) => {
  try {
    const order = await findOrderById(req.params.orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (!['pending', 'confirmed'].includes(order.orderStatus)) {
      return res.status(400).json({ error: 'Cannot cancel order at this stage' });
    }
    const updated = await updateOrderStatus(req.params.orderId, 'cancelled', 'Cancelled by user');
    res.json({ success: true, order: updated });
  } catch (err) {
    res.status(500).json({ error: 'Cancellation failed' });
  }
});

export default router;