// routes/adminRoutes.js
import express from 'express';
import verifyToken from '../utils/verifyToken.js';
import { findUserById, getAllUsers, updateUserRole, countUsers } from '../models/user.js';
import { getAllOrders, updateOrderStatus, deleteOrder, getDashboardStats } from '../models/order.js';

const router = express.Router();

// ─── Admin check middleware ───────────────────────────────────────────────────
const verifyAdmin = async (req, res, next) => {
  try {
    const user = await findUserById(req.userId);
    if (!user)             return res.status(404).json({ error: 'User not found' });
    if (user.role !== 'admin') return res.status(403).json({ error: 'Access denied. Admin only.' });
    req.adminUser = user;
    next();
  } catch (err) {
    console.error('Admin verification error:', err);
    res.status(500).json({ error: 'Failed to verify admin' });
  }
};

// ─── GET /api/admin/dashboard ─────────────────────────────────────────────────
router.get('/dashboard', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const stats      = await getDashboardStats();
    const totalUsers = await countUsers();

    res.json({
      success: true,
      stats: {
        ...stats,
        total: { ...stats.total, users: totalUsers },
      },
    });
  } catch (err) {
    console.error('❌ Dashboard error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// ─── GET /api/admin/orders ────────────────────────────────────────────────────
router.get('/orders', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const { orders, total } = await getAllOrders({ status, search, page: parseInt(page), limit: parseInt(limit) });
    res.json({
      success: true,
      orders,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit), limit: parseInt(limit) },
    });
  } catch (err) {
    console.error('❌ Fetch orders error:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// ─── PUT /api/admin/orders/:orderId/status ────────────────────────────────────
router.put('/orders/:orderId/status', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { status, note } = req.body;
    const order = await updateOrderStatus(req.params.orderId, status, note);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ success: true, message: 'Order status updated', order });
  } catch (err) {
    console.error('❌ Update order error:', err);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// ─── DELETE /api/admin/orders/:orderId ───────────────────────────────────────
router.delete('/orders/:orderId', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const order = await deleteOrder(req.params.orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ success: true, message: 'Order deleted successfully' });
  } catch (err) {
    console.error('❌ Delete order error:', err);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

// ─── GET /api/admin/users ─────────────────────────────────────────────────────
router.get('/users', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const { users, total } = await getAllUsers({ search, page: parseInt(page), limit: parseInt(limit) });
    res.json({
      success: true,
      users,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit), limit: parseInt(limit) },
    });
  } catch (err) {
    console.error('❌ Fetch users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ─── PUT /api/admin/users/:userId/role ───────────────────────────────────────
router.put('/users/:userId/role', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['patient', 'admin', 'doctor'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    const user = await updateUserRole(req.params.userId, role);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, message: 'User role updated', user });
  } catch (err) {
    console.error('❌ Update role error:', err);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

export default router;