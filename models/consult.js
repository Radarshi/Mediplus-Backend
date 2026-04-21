// models/consult.js
// Replaces Mongoose Consult + ConsultBooking models — Firestore collections:
//   'consultations'  → individual appointment bookings
//   'consult_payments' → payment/confirmation records

import { getDB } from '../db/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';

const CONSULT_COL  = 'consultations';
const PAYMENT_COL  = 'consult_payments';

// ─── CREATE CONSULTATION BOOKING ─────────────────────────────────────────────
export const createConsultation = async (data) => {
  const db = getDB();

  const consult = {
    userId:         data.userId       ?? 'GUEST',
    name:           data.name,
    doctor_name:    data.doctor_name  ?? '',
    doctor_id:      data.doctor_id    ?? 'unknown',
    age:            Number(data.age),
    phone:          data.phone,
    email:          data.email        ?? '',
    symptoms:       data.symptoms     ?? '',
    preferred_date: data.preferred_date ?? '',
    preferred_time: data.preferred_time ?? '',
    consultation_type: data.consultation_type ?? 'video',
    plan_name:      data.plan_name    ?? 'Standard',
    amount:         data.amount       ?? 0,
    createdAt:      FieldValue.serverTimestamp(),
    updatedAt:      FieldValue.serverTimestamp(),
  };

  const ref = await db.collection(CONSULT_COL).add(consult);
  return { _id: ref.id, ...consult };
};

// ─── GET CONSULTATIONS BY USER ────────────────────────────────────────────────
export const findConsultationsByUser = async (userId) => {
  const db   = getDB();
  const snap = await db
    .collection(CONSULT_COL)
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .get();

  return snap.docs.map((d) => ({ _id: d.id, ...d.data() }));
};

// ─── CREATE CONSULT PAYMENT RECORD ───────────────────────────────────────────
// (Called from /api/send-confirmation after UPI payment success)
export const createConsultPayment = async (data) => {
  const db = getDB();

  const payment = {
    userId:        data.userId    ?? 'GUEST',
    bookingId:     data.bookingId ?? '',
    name:          data.name      ?? '',
    plan_name:     data.plan_name ?? '',
    duration:      data.duration  ?? '',
    amount:        data.amount    ?? '',
    paymentMethod: data.paymentMethod ?? 'upi',
    txnId:         data.txnId     ?? null,
    email:         data.email     ?? '',
    createdAt:     FieldValue.serverTimestamp(),
  };

  const ref = await db.collection(PAYMENT_COL).add(payment);
  return { _id: ref.id, ...payment };
};

// ─── GET ALL CONSULTATIONS (admin) ───────────────────────────────────────────
export const getAllConsultations = async () => {
  const db   = getDB();
  const snap = await db
    .collection(CONSULT_COL)
    .orderBy('createdAt', 'desc')
    .get();

  return snap.docs.map((d) => ({ _id: d.id, ...d.data() }));
};