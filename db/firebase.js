// db/firebase.js
// Uses serviceAccountKey.json directly — most reliable on Windows

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));

let db;

export const initFirebase = () => {
  if (getApps().length === 0) {
    try {
      // METHOD 1: Use serviceAccountKey.json directly (most reliable on Windows)
      const keyPath = join(__dirname, '..', 'serviceAccountKey.json');
      const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'));

      initializeApp({ credential: cert(serviceAccount) });
      console.log('Firebase Admin SDK initialized via serviceAccountKey.json');

    } catch (fileError) {
      // METHOD 2: Fallback to env vars
      console.log('serviceAccountKey.json not found, trying env vars...');

      const privateKey = process.env.FIREBASE_PRIVATE_KEY
        ?.replace(/\\n/g, '\n')
        ?.replace(/^"+|"+$/g, '');

      initializeApp({
        credential: cert({
          projectId:   process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey,
        }),
      });
      console.log('Firebase Admin SDK initialized via env vars');
    }
  }

  db = getFirestore();
  return db;
};

export const getDB = () => {
  if (!db) return initFirebase();
  return db;
};

export default getDB;