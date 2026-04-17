// scripts/seedMedicine.js
// Run: node scripts/seedMedicine.js
// Reads medicine_store.xlsx → uploads to Firestore 'medicine_store_new'

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require   = createRequire(import.meta.url);

// ── Init Firebase ──────────────────────────────────────────────────────────
if (getApps().length === 0) {
  const keyPath = join(__dirname, '..', 'serviceAccountKey.json');
  const sa = JSON.parse(readFileSync(keyPath, 'utf8'));
  initializeApp({ credential: cert(sa) });
  console.log('Firebase initialized');
}
const db = getFirestore();

// ── Load xlsx ──────────────────────────────────────────────────────────────
let XLSX;
try {
  XLSX = require('xlsx');
  console.log('xlsx package loaded');
} catch {
  console.error('Run: npm install xlsx   then try again');
  process.exit(1);
}

// ── Find the excel file ────────────────────────────────────────────────────
const NAMES = [
  'medicine_store.xlsx'
];

let filePath = null;
for (const n of NAMES) {
  const p = join(__dirname, '..', n);
  if (existsSync(p)) { filePath = p; console.log(`📄 Using file: ${n}`); break; }
}
if (!filePath) {
  console.error(' No medicine xlsx found in backend root!');
  NAMES.forEach(n => console.error('   Expected:', n));
  process.exit(1);
}

// ── Delete collection ──────────────────────────────────────────────────────
const deleteCol = async (name) => {
  let total = 0;
  while (true) {
    const snap = await db.collection(name).limit(400).get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    total += snap.docs.length;
  }
  if (total > 0) console.log(`🗑️  Deleted ${total} docs from '${name}'`);
  else console.log(`   '${name}' was empty`);
};

// ── Clean row ──────────────────────────────────────────────────────────────
const clean = (row, idx) => {
  const num  = v => { const n = Number(v); return isNaN(n) ? 0 : n; };
  const bool = v => String(v).toUpperCase() === 'TRUE';
  const arr  = v => {
    if (!v) return [];
    if (Array.isArray(v)) return v;
    const s = String(v).trim();
    if (s.startsWith('[')) { try { return JSON.parse(s); } catch {} }
    return s.split(',').map(x => x.trim()).filter(Boolean);
  };

  return {
    id:             num(row.id) || idx + 1,
    name:           String(row.name          || ''),
    generic_name:   String(row.generic_name  || ''),
    category:       String(row.category      || ''),
    price:          num(row.price),
    original_price: num(row.original_price || row.originalPrice || 0),
    rating:         num(row.rating),
    reviews:        num(row.reviews),
    in_stock:       num(row.in_stock),
    manufacturer:   String(row.manufacturer  || ''),
    description:    String(row.description   || ''),
    dosage:         String(row.dosage        || ''),
    prescription:   bool(row.prescription),
    tags:           arr(row.tags),
    image_url:      row.image_url ? String(row.image_url) : null,
  };
};

// ── Main ───────────────────────────────────────────────────────────────────
const seed = async () => {
  // Delete old/corrupt collections
  console.log('\n🧹 Cleaning old data...');
  await deleteCol('medicine_store');
  await deleteCol('medicine_store_new');

  // Parse xlsx
  console.log('\n📊 Parsing Excel...');
  const wb   = XLSX.readFile(filePath, { raw: false });
  const ws   = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: null, raw: false });

  console.log(` ${rows.length} rows found`);
  console.log('   Columns:', Object.keys(rows[0] || {}).slice(0, 8).join(', '));

  // Upload
  console.log('\n⬆ Uploading to medicine_store_new...');
  let count = 0;

  for (let i = 0; i < rows.length; i += 400) {
    const batch = db.batch();
    rows.slice(i, i + 400).forEach((row, ci) => {
      const med = clean(row, i + ci);
      db.collection('medicine_store_new').doc(String(med.id));
      batch.set(
        db.collection('medicine_store_new').doc(String(med.id)),
        med
      );
      count++;
    });
    await batch.commit();
    console.log(`   ${count}/${rows.length}`);
  }

  console.log('\nDONE!');
  console.log(`    ${count} medicines in Firestore 'medicine_store_new'`);
  console.log('    Check Firebase Console → medicine_store_new');
  console.log('    Each doc should show: name, price, category, rating...');
};

seed().catch(err => {
  console.error('\n Error:', err.message);
  process.exit(1);
});