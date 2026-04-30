import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');
import fs from 'fs';

const firebaseConfig = {
  apiKey: "AIzaSyCBEsjJYSh4mzzAxWTq_bJzmY5toswIHs4",
  authDomain: "schoolpoetal.firebaseapp.com",
  projectId: "schoolpoetal",
  storageBucket: "schoolpoetal.firebasestorage.app",
  messagingSenderId: "166284201380",
  appId: "1:166284201380:web:80ea79ae5ef592885d4531",
  measurementId: "G-LC7N0BTSTE"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function uploadClassList() {
  console.log('--- Uploading JSS2 Class List ---');
  const file = 'src/assets/js2classlist.xlsx';
  if (!fs.existsSync(file)) {
    console.error('File not found:', file);
    return;
  }
  const workbook = XLSX.readFile(file);
  const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
  
  const batch = writeBatch(db);
  let count = 0;
  for (const row of data) {
    const regNo = row['REG NO']?.toString().trim();
    if (!regNo) continue;
    
    const studentRef = doc(collection(db, 'students'), regNo); // Use Reg No as ID to prevent duplicates
    batch.set(studentRef, {
      regNo: regNo,
      name: row['STUDENT NAME']?.toString().trim() || null,
      gender: row['SEX']?.toString().trim() || null,
      dob: row['D.O.B']?.toString().trim() || null,
      club: row['CLUB']?.toString().trim() || null,
      house: row['HOUSE']?.toString().trim() || null,
      className: 'JSS2',
      updatedAt: new Date().toISOString()
    }, { merge: true });
    count++;
  }
  await batch.commit();
  console.log(`Successfully uploaded ${count} students to JSS2.`);
}

async function uploadScores() {
  console.log('--- Uploading JSS2 Scores ---');
  const file = 'src/assets/jss2ful.xlsx';
  if (!fs.existsSync(file)) {
    console.error('File not found:', file);
    return;
  }
  const workbook = XLSX.readFile(file);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  // Header is complex. Row 0 has subject names, Row 1 has CAT/EXAM labels
  const subjectRow = data[0];
  const labelRow = data[1];
  
  const subjects = [];
  for (let i = 2; i < subjectRow.length; i++) {
    if (subjectRow[i]) {
      subjects.push({ name: subjectRow[i].toString().trim(), startIndex: i });
    }
  }
  
  console.log('Detected subjects:', subjects.map(s => s.name));

  const batch = writeBatch(db);
  let count = 0;
  
  // Data starts from row 2
  for (let i = 2; i < data.length; i++) {
    const row = data[i];
    const regNo = row[0]?.toString().trim();
    if (!regNo) continue;
    
    const studentMarks = {};
    subjects.forEach(subj => {
      const cat1 = parseFloat(row[subj.startIndex] || 0);
      const cat2 = parseFloat(row[subj.startIndex + 1] || 0);
      const exam = parseFloat(row[subj.startIndex + 2] || 0);
      const total = parseFloat(row[subj.startIndex + 3] || 0);
      
      studentMarks[subj.name] = {
        cat1,
        cat2,
        exam,
        total,
        updatedAt: new Date().toISOString()
      };
    });
    
    const marksRef = doc(db, 'marks', `${regNo}_2025_2026_SecondTerm`);
    batch.set(marksRef, {
      regNo: regNo,
      className: 'JSS2',
      session: '2025/2026',
      term: 'Second Term',
      marks: studentMarks
    }, { merge: true });
    count++;
    
    // Batch commit every 100 students (Firestore limit is 500)
    if (count % 100 === 0) {
      // await batch.commit(); // Need a new batch object if I do this
    }
  }
  
  await batch.commit();
  console.log(`Successfully uploaded scores for ${count} students in JSS2.`);
}

async function main() {
  try {
    await uploadClassList();
    await uploadScores();
    console.log('--- ALL UPLOADS COMPLETED ---');
    process.exit(0);
  } catch (err) {
    console.error('Upload failed:', err);
    process.exit(1);
  }
}

main();
