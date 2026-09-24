import { initFirebase, getDB } from './db/firebase.js';

const labTests = [
  { id: 'LAB001', name: 'Complete Blood Count (CBC)', category: 'Blood Tests', price: 299, sampleType: 'Blood', reportTime: '6 hrs', fasting: false },
  { id: 'LAB002', name: 'Blood Sugar (Fasting)',       category: 'Blood Tests', price: 149, sampleType: 'Blood', reportTime: '4 hrs', fasting: true  },
  { id: 'LAB003', name: 'HbA1c',                       category: 'Blood Tests', price: 499, sampleType: 'Blood', reportTime: '24 hrs', fasting: false },
  { id: 'LAB004', name: 'Lipid Profile',                category: 'Blood Tests', price: 599, sampleType: 'Blood', reportTime: '24 hrs', fasting: true  },
  { id: 'LAB005', name: 'Liver Function Test (LFT)',    category: 'Blood Tests', price: 699, sampleType: 'Blood', reportTime: '24 hrs', fasting: true  },
  { id: 'LAB006', name: 'Kidney Function Test (KFT)',   category: 'Blood Tests', price: 649, sampleType: 'Blood', reportTime: '24 hrs', fasting: false },
  { id: 'LAB007', name: 'Thyroid Profile (T3 T4 TSH)',  category: 'Blood Tests', price: 549, sampleType: 'Blood', reportTime: '24 hrs', fasting: false },
  { id: 'LAB008', name: 'Vitamin D Test',                category: 'Blood Tests', price: 899, sampleType: 'Blood', reportTime: '24 hrs', fasting: false },
  { id: 'LAB009', name: 'Vitamin B12 Test',              category: 'Blood Tests', price: 799, sampleType: 'Blood', reportTime: '24 hrs', fasting: false },
  { id: 'LAB010', name: 'Urine Routine Examination',     category: 'Urine Tests', price: 199, sampleType: 'Urine', reportTime: '6 hrs', fasting: false },
  { id: 'LAB011', name: 'Urine Culture',                 category: 'Urine Tests', price: 449, sampleType: 'Urine', reportTime: '48 hrs', fasting: false },
  { id: 'LAB012', name: 'COVID-19 RT-PCR',               category: 'Others',      price: 799, sampleType: 'Swab',  reportTime: '24 hrs', fasting: false },
  { id: 'LAB013', name: 'Dengue NS1',                    category: 'Others',      price: 599, sampleType: 'Blood', reportTime: '24 hrs', fasting: false },
  { id: 'LAB014', name: 'Widal Test (Typhoid)',          category: 'Others',      price: 299, sampleType: 'Blood', reportTime: '12 hrs', fasting: false },
  { id: 'LAB015', name: 'ECG',                           category: 'Cardiac',     price: 399, sampleType: '-',     reportTime: '1 hr',   fasting: false },
];

const seed = async () => {
  initFirebase();
  const db = getDB();
  const batch = db.batch();

  labTests.forEach((test) => {
    const ref = db.collection('lab_tests').doc(test.id); // use fixed id as doc id
    batch.set(ref, test);
  });

  await batch.commit();
  console.log(`Seeded ${labTests.length} lab tests into Firestore`);
  process.exit(0);
};

seed().catch((err) => {
  console.error(' Seeding failed:', err);
  process.exit(1);
});