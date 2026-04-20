// models/user.js
// Replaces Mongoose User model + Counter — uses Firestore 'users' collection

import { getDB } from '../db/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';

const USERS_COL    = 'users';
const COUNTERS_COL = 'counters';

// ─── Auto-increment userId (USR0001, USR0002, …) ────────────────────────────
const generateUserId = async (db) => {
  const counterRef = db.collection(COUNTERS_COL).doc('userId');

  const newId = await db.runTransaction(async (tx) => {
    const doc = await tx.get(counterRef);
    const seq  = doc.exists ? doc.data().seq + 1 : 1;
    tx.set(counterRef, { seq }, { merge: true });
    return 'USR' + String(seq).padStart(4, '0');
  });

  return newId;
};

// ─── CREATE ─────────────────────────────────────────────────────────────────
export const createUser = async (data) => {
  const db     = getDB();
  const userId = await generateUserId(db);

  const user = {
    userId,
    name:      data.name     ?? '',
    email:     data.email.toLowerCase(),
    password:  data.password ?? '',
    phone:     data.phone    ?? '',
    age:       data.age      ?? 0,
    gender:    data.gender   ?? 'other',
    role:      data.role     ?? 'patient',
    googleId:  data.googleId ?? null,
    picture:   data.picture  ?? null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  const ref = await db.collection(USERS_COL).add(user);
  return { _id: ref.id, ...user };
};

// ─── FIND BY EMAIL ───────────────────────────────────────────────────────────
export const findUserByEmail = async (email) => {
  const db  = getDB();
  const snap = await db
    .collection(USERS_COL)
    .where('email', '==', email.toLowerCase())
    .limit(1)
    .get();

  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { _id: doc.id, ...doc.data() };
};

// ─── FIND BY USERID FIELD (USRxxxx) ──────────────────────────────────────────
export const findUserByUserId = async (userId) => {
  const db  = getDB();
  const snap = await db.collection(USERS_COL).where('userId', '==', userId).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { _id: doc.id, ...doc.data() };
};

// ─── FIND BY ID (Firestore doc id) ───────────────────────────────────────────
export const findUserById = async (id) => {
  const db  = getDB();
  const doc = await db.collection(USERS_COL).doc(id).get();
  if (!doc.exists) return null;
  return { _id: doc.id, ...doc.data() };
};

// ─── FIND BY GOOGLE ID ───────────────────────────────────────────────────────
export const findUserByGoogleId = async (googleId) => {
  const db  = getDB();
  const snap = await db
    .collection(USERS_COL)
    .where('googleId', '==', googleId)
    .limit(1)
    .get();

  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { _id: doc.id, ...doc.data() };
};

// ─── UPDATE ──────────────────────────────────────────────────────────────────
export const updateUser = async (id, data) => {
  const db  = getDB();
  const ref = db.collection(USERS_COL).doc(id);

  const updateData = { ...data, updatedAt: FieldValue.serverTimestamp() };
  // Remove undefined keys
  Object.keys(updateData).forEach(
    (k) => updateData[k] === undefined && delete updateData[k]
  );

  await ref.update(updateData);
  const updated = await ref.get();
  return { _id: updated.id, ...updated.data() };
};

// ─── GET ALL (admin) ─────────────────────────────────────────────────────────
export const getAllUsers = async ({ search, page = 1, limit = 20 } = {}) => {
  const db   = getDB();
  let   query = db.collection(USERS_COL).orderBy('createdAt', 'desc');

  const snap  = await query.get();
  let   users = snap.docs.map((d) => ({ _id: d.id, ...d.data() }));

  // Simple in-memory search (Firestore full-text search requires Algolia / ext)
  if (search) {
    const s = search.toLowerCase();
    users = users.filter(
      (u) =>
        u.name?.toLowerCase().includes(s) ||
        u.email?.toLowerCase().includes(s) ||
        u.userId?.toLowerCase().includes(s)
    );
  }

  const total    = users.length;
  const startIdx = (page - 1) * limit;
  const paged    = users.slice(startIdx, startIdx + limit);

  return { users: paged, total };
};

// ─── COUNT ───────────────────────────────────────────────────────────────────
export const countUsers = async () => {
  const db   = getDB();
  const snap = await db.collection(USERS_COL).count().get();
  return snap.data().count;
};

// ─── UPDATE ROLE ─────────────────────────────────────────────────────────────
export const updateUserRole = async (id, role) => {
  return updateUser(id, { role });
};

// ─── LINK GOOGLE ACCOUNT ─────────────────────────────────────────────────────
export const linkGoogleAccount = async (id, googleId, picture) => {
  return updateUser(id, { googleId, picture });
};

