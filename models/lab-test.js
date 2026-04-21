// models/lab-test.js
// Replaces Mongoose LabBooking model — Firestore 'lab_bookings' collection

import { getDB } from '../db/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';

const LAB_COL = 'lab_bookings';

// ─── CREATE LAB BOOKING ───────────────────────────────────────────────────────
export const createLabBooking = async (data) => {
  const db = getDB();

  const booking = {
    userId:       data.userId       ?? 'GUEST',
    name:         data.name,
    phone:        data.phone,
    email:        data.email        ?? '',
    address:      data.address      ?? '',
    date:         data.date,
    time:         data.time,
    instruction:  data.instruction  ?? '',
    labtest_id:   data.labtest_id   ?? '',
    labtest_name: data.labtest_name ?? '',
    venue:        data.venue        ?? '',
    createdAt:    FieldValue.serverTimestamp(),
    updatedAt:    FieldValue.serverTimestamp(),
  };

  const ref = await db.collection(LAB_COL).add(booking);
  return { _id: ref.id, ...booking };
};

// ─── GET BOOKINGS BY USER ─────────────────────────────────────────────────────
export const findLabBookingsByUser = async (userId) => {
  const db   = getDB();
  const snap = await db
    .collection(LAB_COL)
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .get();

  return snap.docs.map((d) => ({ _id: d.id, ...d.data() }));
};

// ─── GET ALL BOOKINGS (admin) ─────────────────────────────────────────────────
export const getAllLabBookings = async () => {
  const db   = getDB();
  const snap = await db
    .collection(LAB_COL)
    .orderBy('createdAt', 'desc')
    .get();

  return snap.docs.map((d) => ({ _id: d.id, ...d.data() }));
};

// ─── DELETE BOOKING ───────────────────────────────────────────────────────────
export const deleteLabBooking = async (id) => {
  const db = getDB();
  await db.collection(LAB_COL).doc(id).delete();
  return { _id: id };
};