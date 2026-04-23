import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require   = createRequire(import.meta.url);

let XLSX;
try {
  XLSX = require('xlsx');
} catch {
  console.error('❌ Please run: npm install xlsx');
  process.exit(1);
}

// ── Init Firebase ─────────────────────────────────────────────────────────────
if (getApps().length === 0) {
  const keyPath      = join(__dirname, '..', 'serviceAccountKey.json');
  const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'));
  initializeApp({ credential: cert(serviceAccount) });
  console.log('✅ Firebase initialized');
}
const db = getFirestore();

// ── Parse xlsx → array of objects ────────────────────────────────────────────
const parseXlsx = (filePath) => {
  const workbook  = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet     = workbook.Sheets[sheetName];
  const rows      = XLSX.utils.sheet_to_json(sheet, { defval: null });
  return rows;
};

// ── Clean a row for Firestore ─────────────────────────────────────────────────
const cleanDoctor = (row) => {
  // Parse JSON strings like '["English","Hindi"]'
  const parseJsonField = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    try { return JSON.parse(val); }
    catch { return [val]; }
  };

  return {
    id:             row.id            ?? null,
    name:           row.name          ?? '',
    specialty:      row.specialty     ?? '',
    experience:     row.experience    ?? '',
    rating:         Number(row.rating ?? 0),
    reviews:        Number(row.reviews ?? 0),
    consultations:  Number(row.consultations ?? 0),
    languages:      parseJsonField(row.languages),
    education:      row.education     ?? '',
    video_price:    Number(row.video_price  ?? 0),
    phone_price:    Number(row.phone_price  ?? 0),
    chat_price:     Number(row.chat_price   ?? 0),
    availability:   row.availability  ?? 'Available Now',
    // Use emoji based on name since image column is empty
    image:          row.image ?? (row.name?.includes('Dr.') ? '👨‍⚕️' : '👩‍⚕️'),
    specializations: parseJsonField(row.specializations),
    about:          row.about         ?? '',
  };
};

// ── Main seed function ────────────────────────────────────────────────────────
const seed = async () => {
  console.log('Reading Excel file...');

  const xlsxPath = join(__dirname, '..', 'indian_doctors.csv.xlsx');
  const rows     = parseXlsx(xlsxPath);

  console.log(`Found ${rows.length} doctors`);

  // Upload in batches of 400 (Firestore batch limit is 500)
  let uploaded = 0;

  for (let i = 0; i < rows.length; i += 400) {
    const batch = db.batch();
    const chunk = rows.slice(i, i + 400);

    chunk.forEach((row) => {
      const doctor  = cleanDoctor(row);
      // Use doctor id as document ID so it's consistent and won't duplicate
      const docRef  = db.collection('consult').doc(String(doctor.id));
      batch.set(docRef, doctor, { merge: true });
      uploaded++;
    });

    await batch.commit();
    console.log(`Uploaded ${uploaded}/${rows.length} doctors`);
  }

  console.log('');
  console.log('Done! Check Firestore Console → consult collection');
  console.log(`   Total doctors uploaded: ${uploaded}`);
};

seed().catch((err) => {
  console.error(' Seed failed:', err.message);
  process.exit(1);
});