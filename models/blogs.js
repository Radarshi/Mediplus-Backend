// models/blogs.js
// Replaces Mongoose Blog model — Firestore 'blogs' collection

import { getDB } from '../db/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';

const BLOGS_COL = 'blogs';

// ─── CREATE BLOG ─────────────────────────────────────────────────────────────
export const createBlog = async (data) => {
  const db = getDB();

  const blog = {
    userId:   data.userId   ?? 'GUEST',
    featured: data.featured ?? false,
    author:   data.author,
    title:    data.title,
    email:    data.email,
    excerpt:  data.excerpt  ?? (data.content?.slice(0, 120) + '...'),
    content:  data.content,
    tags:     data.tags     ?? [],
    date:     new Date().toLocaleDateString(),
    category: data.category ?? 'Others',
    image:    data.image    ?? '📰',
    readTime: data.readTime ?? '5 min read',
    views:    0,
    likes:    0,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  const ref = await db.collection(BLOGS_COL).add(blog);
  return { _id: ref.id, ...blog };
};

// ─── GET ALL BLOGS ────────────────────────────────────────────────────────────
export const getAllBlogs = async () => {
  const db   = getDB();
  const snap = await db
    .collection(BLOGS_COL)
    .orderBy('createdAt', 'desc')
    .get();

  return snap.docs.map((d) => ({ _id: d.id, ...d.data() }));
};

// ─── GET BLOG BY ID ───────────────────────────────────────────────────────────
export const getBlogById = async (id) => {
  const db  = getDB();
  const doc = await db.collection(BLOGS_COL).doc(id).get();
  if (!doc.exists) return null;
  return { _id: doc.id, ...doc.data() };
};

// ─── UPDATE BLOG ─────────────────────────────────────────────────────────────
export const updateBlog = async (id, data) => {
  const db  = getDB();
  const ref = db.collection(BLOGS_COL).doc(id);
  await ref.update({ ...data, updatedAt: FieldValue.serverTimestamp() });
  const updated = await ref.get();
  return { _id: updated.id, ...updated.data() };
};

// ─── DELETE BLOG ─────────────────────────────────────────────────────────────
export const deleteBlog = async (id) => {
  const db = getDB();
  await db.collection(BLOGS_COL).doc(id).delete();
  return { _id: id };
};