// models/passwordResetToken.js
// Replaces Mongoose PasswordResetToken — Firestore 'password_reset_tokens' collection
// Firestore TTL policy should be set on 'expiresAt' field via console (optional)

import { getDB } from '../db/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';

const TOKENS_COL = 'password_reset_tokens';

// ─── CREATE TOKEN ─────────────────────────────────────────────────────────────
export const createResetToken = async (userId, token) => {
  const db = getDB();

  // Expires 1 hour from now
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  const data = {
    userId,
    token,
    expiresAt: expiresAt.toISOString(),
    createdAt: FieldValue.serverTimestamp(),
  };

  const ref = await db.collection(TOKENS_COL).add(data);
  return { _id: ref.id, ...data };
};

// ─── FIND BY TOKEN ────────────────────────────────────────────────────────────
export const findResetToken = async (token) => {
  const db   = getDB();
  const snap = await db
    .collection(TOKENS_COL)
    .where('token', '==', token)
    .limit(1)
    .get();

  if (snap.empty) return null;

  const doc  = snap.docs[0];
  const data = doc.data();

  // Check expiry manually
  if (new Date(data.expiresAt) < new Date()) {
    // Clean up expired token
    await doc.ref.delete();
    return null;
  }

  return { _id: doc.id, ...data };
};

// ─── DELETE TOKEN ─────────────────────────────────────────────────────────────
export const deleteResetToken = async (id) => {
  const db = getDB();
  await db.collection(TOKENS_COL).doc(id).delete();
};

// ─── DELETE ALL TOKENS FOR USER (cleanup) ────────────────────────────────────
export const deleteUserResetTokens = async (userId) => {
  const db   = getDB();
  const snap = await db
    .collection(TOKENS_COL)
    .where('userId', '==', userId)
    .get();

  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
};