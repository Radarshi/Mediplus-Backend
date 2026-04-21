// models/order.js
// Replaces Mongoose Order model + OrderCounter — uses Firestore 'orders' collection

import { getDB } from '../db/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';

const ORDERS_COL   = 'orders';
const COUNTERS_COL = 'counters';

// ─── Auto-increment orderId (MD000001, MD000002 …) ───────────────────────────
export const generateOrderId = async () => {
  const db         = getDB();
  const counterRef = db.collection(COUNTERS_COL).doc('orderId');

  const newId = await db.runTransaction(async (tx) => {
    const doc = await tx.get(counterRef);
    const seq  = doc.exists ? doc.data().seq + 1 : 1;
    tx.set(counterRef, { seq }, { merge: true });
    return 'MD' + String(seq).padStart(6, '0');
  });

  return newId;
};

// ─── CREATE ORDER ─────────────────────────────────────────────────────────────
export const createOrder = async (data) => {
  const db      = getDB();
  const orderId = await generateOrderId();

  const estimatedDelivery = new Date();
  estimatedDelivery.setDate(estimatedDelivery.getDate() + 3);

  const order = {
    orderId,
    userId:         data.userId,
    userDetails:    data.userDetails    ?? {},
    deliveryInfo:   data.deliveryInfo,
    items:          data.items,
    paymentMethod:  data.paymentMethod,
    paymentStatus:  data.paymentMethod === 'cod' ? 'pending' : 'paid',
    transactionId:  data.transactionId  ?? null,
    prescriptionUrl: data.prescriptionUrl ?? null,
    requiresConsultation: data.requiresConsultation ?? false,
    subtotal:       data.subtotal,
    discount:       data.discount       ?? 0,
    deliveryCharge: data.deliveryCharge ?? 0,
    total:          data.total,
    orderStatus:    'confirmed',
    statusHistory: [
      {
        status:    'confirmed',
        timestamp: new Date().toISOString(),
        note:      'Order placed successfully',
      },
    ],
    orderDate:          FieldValue.serverTimestamp(),
    estimatedDelivery:  estimatedDelivery.toISOString(),
    actualDeliveryDate: null,
    orderNotes:         data.orderNotes  ?? '',
    cancelReason:       null,
    createdAt:          FieldValue.serverTimestamp(),
    updatedAt:          FieldValue.serverTimestamp(),
  };

  const ref = await db.collection(ORDERS_COL).add(order);
  return { _id: ref.id, ...order };
};

// ─── FIND ORDERS BY USER ─────────────────────────────────────────────────────
export const findOrdersByUser = async (userId) => {
  const db   = getDB();
  const snap = await db
    .collection(ORDERS_COL)
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .get();

  return snap.docs.map((d) => ({ _id: d.id, ...d.data() }));
};

// ─── FIND SINGLE ORDER ───────────────────────────────────────────────────────
export const findOrderById = async (orderId) => {
  const db   = getDB();
  const snap = await db
    .collection(ORDERS_COL)
    .where('orderId', '==', orderId)
    .limit(1)
    .get();

  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { _id: doc.id, ...doc.data() };
};

// ─── UPDATE ORDER STATUS ─────────────────────────────────────────────────────
export const updateOrderStatus = async (orderId, status, note = '') => {
  const db    = getDB();
  const order = await findOrderById(orderId);
  if (!order) return null;

  const ref         = db.collection(ORDERS_COL).doc(order._id);
  const historyEntry = {
    status,
    timestamp: new Date().toISOString(),
    note:      note || `Status updated to ${status}`,
  };

  const updateData = {
    orderStatus:   status,
    statusHistory: FieldValue.arrayUnion(historyEntry),
    updatedAt:     FieldValue.serverTimestamp(),
  };

  if (status === 'delivered') {
    updateData.paymentStatus      = 'paid';
    updateData.actualDeliveryDate = new Date().toISOString();
  }

  await ref.update(updateData);
  const updated = await ref.get();
  return { _id: updated.id, ...updated.data() };
};

// ─── GET ALL ORDERS (admin) ───────────────────────────────────────────────────
export const getAllOrders = async ({ status, search, page = 1, limit = 20 } = {}) => {
  const db   = getDB();
  let   snap = await db
    .collection(ORDERS_COL)
    .orderBy('createdAt', 'desc')
    .get();

  let orders = snap.docs.map((d) => ({ _id: d.id, ...d.data() }));

  if (status) {
    orders = orders.filter((o) => o.orderStatus === status);
  }

  if (search) {
    const s = search.toLowerCase();
    orders = orders.filter(
      (o) =>
        o.orderId?.toLowerCase().includes(s) ||
        o.userDetails?.name?.toLowerCase().includes(s) ||
        o.userDetails?.email?.toLowerCase().includes(s) ||
        o.deliveryInfo?.phone?.includes(s)
    );
  }

  const total    = orders.length;
  const startIdx = (page - 1) * limit;
  return { orders: orders.slice(startIdx, startIdx + limit), total };
};

// ─── DASHBOARD AGGREGATIONS ───────────────────────────────────────────────────
export const getDashboardStats = async () => {
  const db   = getDB();
  const snap = await db.collection(ORDERS_COL).get();
  const all  = snap.docs.map((d) => ({ _id: d.id, ...d.data() }));

  const now       = new Date();
  const todayStart = new Date(now); todayStart.setHours(0,0,0,0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const isPaid = (o) => o.paymentStatus === 'paid';
  const getDate = (o) => o.orderDate?.toDate ? o.orderDate.toDate() : new Date(o.createdAt?._seconds * 1000 || 0);

  const totalRevenue = all.filter(isPaid).reduce((s, o) => s + (o.total || 0), 0);
  const totalOrders  = all.length;

  const todayOrders  = all.filter((o) => getDate(o) >= todayStart).length;
  const todayRevenue = all.filter((o) => getDate(o) >= todayStart && isPaid(o))
    .reduce((s, o) => s + (o.total || 0), 0);

  const monthOrders  = all.filter((o) => getDate(o) >= monthStart).length;
  const monthRevenue = all.filter((o) => getDate(o) >= monthStart && isPaid(o))
    .reduce((s, o) => s + (o.total || 0), 0);

  const lastMonthRevenue = all
    .filter((o) => { const d = getDate(o); return d >= lastMonthStart && d < monthStart && isPaid(o); })
    .reduce((s, o) => s + (o.total || 0), 0);

  const growth = lastMonthRevenue > 0
    ? (((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100).toFixed(1)
    : 0;

  // Orders by status
  const statusMap = {};
  all.forEach((o) => {
    const s = o.orderStatus || 'pending';
    if (!statusMap[s]) statusMap[s] = { _id: s, count: 0, revenue: 0 };
    statusMap[s].count++;
    statusMap[s].revenue += o.total || 0;
  });
  const ordersByStatus = Object.values(statusMap);

  // Recent orders (last 10)
  const recentOrders = [...all]
    .sort((a, b) => getDate(b) - getDate(a))
    .slice(0, 10);

  // Top customers
  const customerMap = {};
  all.forEach((o) => {
    const uid = o.userId;
    if (!customerMap[uid]) {
      customerMap[uid] = { _id: uid, totalOrders: 0, totalSpent: 0, userDetails: o.userDetails };
    }
    customerMap[uid].totalOrders++;
    customerMap[uid].totalSpent += o.total || 0;
  });
  const topCustomers = Object.values(customerMap)
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 10);

  return {
    total:        { orders: totalOrders, revenue: totalRevenue },
    today:        { orders: todayOrders, revenue: todayRevenue },
    thisMonth:    { orders: monthOrders, revenue: monthRevenue, growth: parseFloat(growth) },
    ordersByStatus,
    recentOrders,
    topCustomers,
  };
};

// ─── DELETE ORDER ─────────────────────────────────────────────────────────────
export const deleteOrder = async (orderId) => {
  const db    = getDB();
  const order = await findOrderById(orderId);
  if (!order) return null;
  await db.collection(ORDERS_COL).doc(order._id).delete();
  return order;
};