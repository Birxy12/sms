import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, doc, writeBatch } from 'firebase/firestore';
import * as XLSX from 'xlsx';
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

async function uploadScores() {
  try {
    console.log('Reading Excel file...');
    const buf = fs.readFileSync('c:/Users/birxy/sms/src/assets/ss1 english.xlsx');
    const wb = XLSX.read(buf, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws);
    
    console.log(`Parsed ${data.length} rows.`);
    
    const className = 'SS1';
    const subject = 'English';
    const session = '2025/2026';
    const term = 'Second Term';
    
    console.log('Fetching students...');
    const studentQuery = query(collection(db, 'students'), where('className', '==', className));
    const studentSnap = await getDocs(studentQuery);
    const students = studentSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    console.log(`Found ${students.length} students in ${className}.`);
    
    const batch = writeBatch(db);
    const safeSession = session.replace('/', '-');
    const safeTerm = term.replace(/\s/g, '').toLowerCase();
    
    let matched = 0;
    
    for (const row of data) {
      const rawRegNo = String(row['REG. No.'] || '').trim();
      const rawName = String(row['Name'] || '').trim();
      
      const student = students.find(s => 
        (rawRegNo && s.regNo.toUpperCase().trim() === rawRegNo.toUpperCase()) ||
        (rawName && s.name.toUpperCase().trim() === rawName.toUpperCase())
      );
      
      if (student) {
        const cat1 = parseFloat(row['CAT'] || 0);
        const cat2 = parseFloat(row['CAT2'] || 0);
        const exam = parseFloat(row['EXAM'] || 0);
        const total = cat1 + cat2 + exam;
        
        let grade = 'F9';
        if (total >= 75) grade = 'A';
        else if (total >= 70) grade = 'B1';
        else if (total >= 65) grade = 'B2';
        else if (total >= 60) grade = 'B3';
        else if (total >= 50) grade = 'C4';
        else if (total >= 45) grade = 'C5';
        else if (total >= 40) grade = 'D7';
        else if (total >= 35) grade = 'E8';

        const sanitizedRegNo = student.regNo.replace(/\//g, '-');
        const marksRef = doc(collection(db, 'marks'), `${sanitizedRegNo}_${safeSession}_${safeTerm}`);
        
        batch.set(marksRef, {
          regNo: student.regNo,
          studentName: student.name,
          className: className,
          session: session,
          term: term,
          marks: {
            [subject]: {
              cat1, cat2, exam, total,
              percent: total,
              grade,
              updatedAt: new Date().toISOString()
            }
          }
        }, { merge: true });
        
        matched++;
      }
    }
    
    if (matched > 0) {
      console.log('Committing batch...');
      await batch.commit();
      console.log(`Successfully uploaded ${matched} scores.`);
    } else {
      console.log('No matching students found.');
    }
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

uploadScores();
