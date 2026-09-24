// models/labTest.js
// Firestore 'lab_tests' collection (catalog) + 'lab_bookings' collection (bookings)

import { getDB } from '../db/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';

const TESTS_COL    = 'lab_tests';
const BOOKINGS_COL = 'lab_bookings';
const COUNTERS_COL = 'counters';

// ─── GET ALL LAB TESTS (catalog) ─────────────────────────────────────────────
export const getAllLabTests = async () => {
  const db   = getDB();
  const snap = await db.collection(TESTS_COL).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

// ─── GET SINGLE TEST ──────────────────────────────────────────────────────────
export const getLabTestById = async (id) => {
  const db  = getDB();
  const doc = await db.collection(TESTS_COL).doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
};

// ─── Auto-increment bookingId (LAB000001, …) ────────────────────────────────
const generateBookingId = async (db) => {
  const ref = db.collection(COUNTERS_COL).doc('labBookingId');
  return db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    const seq = doc.exists ? doc.data().seq + 1 : 1;
    tx.set(ref, { seq }, { merge: true });
    return 'LAB' + String(seq).padStart(6, '0');
  });
};

// ─── CREATE BOOKING ───────────────────────────────────────────────────────────
export const createLabBooking = async (data) => {
  const db        = getDB();
  const bookingId = await generateBookingId(db);

  const booking = {
    bookingId,
    userId:        data.userId,
    userDetails:   data.userDetails   ?? {},
    tests:         data.tests,        // [{ id, name, price }]
    patientInfo:   data.patientInfo,  // { fullName, age, gender, phone, email }
    address:       data.address,      // { address, city, state, zipCode, landmark }
    preferredDate: data.preferredDate,
    preferredTime: data.preferredTime,
    subtotal:      data.subtotal,
    total:         data.total,
    paymentMethod: data.paymentMethod ?? 'cod',
    paymentStatus: data.paymentMethod === 'cod' ? 'pending' : 'paid',
    bookingStatus: 'confirmed', // confirmed -> sample_collected -> processing -> report_ready -> cancelled
    createdAt:     FieldValue.serverTimestamp(),
    updatedAt:     FieldValue.serverTimestamp(),
  };

  const ref = await db.collection(BOOKINGS_COL).add(booking);
  return { _id: ref.id, ...booking };
};

// ─── GET BOOKINGS BY USER ─────────────────────────────────────────────────────
export const findBookingsByUser = async (userId) => {
  const db   = getDB();
  const snap = await db
    .collection(BOOKINGS_COL)
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .get();
  return snap.docs.map((d) => ({ _id: d.id, ...d.data() }));
};

// ─── UPDATE BOOKING STATUS (admin) ───────────────────────────────────────────
export const updateBookingStatus = async (bookingId, status) => {
  const db   = getDB();
  const snap = await db.collection(BOOKINGS_COL).where('bookingId', '==', bookingId).limit(1).get();
  if (snap.empty) return null;
  const ref = snap.docs[0].ref;
  await ref.update({ bookingStatus: status, updatedAt: FieldValue.serverTimestamp() });
  const updated = await ref.get();
  return { _id: updated.id, ...updated.data() };
};