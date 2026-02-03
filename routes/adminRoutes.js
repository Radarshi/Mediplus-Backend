// backend/routes/adminRoutes.js
import express from 'express';
import verifyToken from '../utils/verifyToken.js';
import User from '../models/user.js';
import { getOrderModel } from '../models/order.js';

const router = express.Router();

// Middleware to verify admin
const verifyAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    req.adminUser = user;
    next();
  } catch (error) {
    console.error('Admin verification error:', error);
    res.status(500).json({ error: 'Failed to verify admin' });
  }
};

// ============================================
// GET /api/admin/dashboard - Dashboard Stats
// ============================================
router.get('/dashboard', verifyToken, verifyAdmin, async (req, res) => {
  console.log('📊 Admin dashboard request from:', req.adminUser.email);

  try {
    const Order = await getOrderModel();

    // Get date ranges
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

    // Total stats
    const totalOrders = await Order.countDocuments();
    const totalRevenue = await Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    const totalUsers = await User.countDocuments();

    // Today's stats
    const todayOrders = await Order.countDocuments({
      orderDate: { $gte: today }
    });

    const todayRevenue = await Order.aggregate([
      { 
        $match: { 
          orderDate: { $gte: today },
          paymentStatus: 'paid'
        } 
      },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    // This month stats
    const monthOrders = await Order.countDocuments({
      orderDate: { $gte: thisMonth }
    });

    const monthRevenue = await Order.aggregate([
      { 
        $match: { 
          orderDate: { $gte: thisMonth },
          paymentStatus: 'paid'
        } 
      },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    // Last month stats for growth calculation
    const lastMonthRevenue = await Order.aggregate([
      { 
        $match: { 
          orderDate: { $gte: lastMonth, $lt: thisMonth },
          paymentStatus: 'paid'
        } 
      },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    // Order status breakdown
    const ordersByStatus = await Order.aggregate([
      { 
        $group: { 
          _id: '$orderStatus', 
          count: { $sum: 1 },
          revenue: { $sum: '$total' }
        } 
      }
    ]);

    // Recent orders
    const recentOrders = await Order.find()
      .sort({ orderDate: -1 })
      .limit(10);

    // Top customers
    const topCustomers = await Order.aggregate([
      {
        $group: {
          _id: '$userId',
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$total' },
          userDetails: { $first: '$userDetails' }
        }
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 10 }
    ]);

    // Revenue trend (last 7 days)
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const revenueTrend = await Order.aggregate([
      {
        $match: {
          orderDate: { $gte: sevenDaysAgo },
          paymentStatus: 'paid'
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$orderDate' } },
          revenue: { $sum: '$total' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Calculate growth
    const currentMonthRev = monthRevenue[0]?.total || 0;
    const lastMonthRev = lastMonthRevenue[0]?.total || 0;
    const revenueGrowth = lastMonthRev > 0 
      ? ((currentMonthRev - lastMonthRev) / lastMonthRev * 100).toFixed(1)
      : 0;

    res.json({
      success: true,
      stats: {
        total: {
          orders: totalOrders,
          revenue: totalRevenue[0]?.total || 0,
          users: totalUsers
        },
        today: {
          orders: todayOrders,
          revenue: todayRevenue[0]?.total || 0
        },
        thisMonth: {
          orders: monthOrders,
          revenue: currentMonthRev,
          growth: parseFloat(revenueGrowth)
        },
        ordersByStatus,
        recentOrders,
        topCustomers,
        revenueTrend
      }
    });

  } catch (error) {
    console.error('❌ Dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// ============================================
// GET /api/admin/orders - Get All Orders
// ============================================
router.get('/orders', verifyToken, verifyAdmin, async (req, res) => {
  console.log('📋 Admin fetching all orders');

  try {
    const Order = await getOrderModel();
    const { status, search, page = 1, limit = 20 } = req.query;

    let query = {};

    if (status) {
      query.orderStatus = status;
    }

    if (search) {
      query.$or = [
        { orderId: new RegExp(search, 'i') },
        { 'userDetails.name': new RegExp(search, 'i') },
        { 'userDetails.email': new RegExp(search, 'i') },
        { 'deliveryInfo.phone': new RegExp(search, 'i') }
      ];
    }

    const skip = (page - 1) * limit;

    const orders = await Order.find(query)
      .sort({ orderDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      orders,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('❌ Fetch orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// ============================================
// PUT /api/admin/orders/:orderId/status
// Update Order Status
// ============================================
router.put('/orders/:orderId/status', verifyToken, verifyAdmin, async (req, res) => {
  console.log('🔄 Admin updating order status:', req.params.orderId);

  try {
    const { status, note } = req.body;
    const Order = await getOrderModel();

    const order = await Order.findOne({ orderId: req.params.orderId });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Update status
    order.orderStatus = status;
    order.statusHistory.push({
      status,
      timestamp: new Date(),
      note: note || `Status updated to ${status} by admin`
    });

    // If delivered, mark payment as paid and set delivery date
    if (status === 'delivered') {
      order.paymentStatus = 'paid';
      order.actualDeliveryDate = new Date();
    }

    await order.save();

    console.log('✅ Order status updated');

    res.json({
      success: true,
      message: 'Order status updated successfully',
      order
    });

  } catch (error) {
    console.error('❌ Update order error:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// ============================================
// GET /api/admin/users - Get All Users
// ============================================
router.get('/users', verifyToken, verifyAdmin, async (req, res) => {
  console.log('👥 Admin fetching all users');

  try {
    const { search, page = 1, limit = 20 } = req.query;

    let query = {};

    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { userId: new RegExp(search, 'i') }
      ];
    }

    const skip = (page - 1) * limit;

    const users = await User.find(query)
      .select('-password') // Don't send passwords
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      users,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('❌ Fetch users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ============================================
// PUT /api/admin/users/:userId/role
// Update User Role
// ============================================
router.put('/users/:userId/role', verifyToken, verifyAdmin, async (req, res) => {
  console.log('🔄 Admin updating user role:', req.params.userId);

  try {
    const { role } = req.body;

    if (!['patient', 'admin', 'doctor'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.role = role;
    await user.save();

    console.log('✅ User role updated');

    res.json({
      success: true,
      message: 'User role updated successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('❌ Update user role error:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// ============================================
// DELETE /api/admin/orders/:orderId
// Delete Order (Admin only)
// ============================================
router.delete('/orders/:orderId', verifyToken, verifyAdmin, async (req, res) => {
  console.log('🗑️ Admin deleting order:', req.params.orderId);

  try {
    const Order = await getOrderModel();
    const order = await Order.findOneAndDelete({ orderId: req.params.orderId });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    console.log('✅ Order deleted');

    res.json({
      success: true,
      message: 'Order deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete order error:', error);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

export default router;