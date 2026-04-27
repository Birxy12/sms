import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, collection, writeBatch } from "firebase/firestore";
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const firebaseConfig = {
  apiKey: "AIzaSyCBEsjJYSh4mzzAxWTq_bJzmY5toswIHs4",
  authDomain: "schoolpoetal.firebaseapp.com",
  projectId: "schoolpoetal",
  storageBucket: "schoolpoetal.firebasestorage.app",
  messagingSenderId: "166284201380",
  appId: "1:166284201380:web:80ea79ae5ef592885d4531"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function pushStudents(filePath, className) {
  console.log(`Processing students for ${className} from ${filePath}...`);
  const workbook = XLSX.readFile(filePath);
  const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
  
  const batch = writeBatch(db);
  let count = 0;
  
  const headers = data[0].map(h => String(h).toUpperCase().trim());
  const regIdx = headers.findIndex(h => h.includes('REG') && h.includes('NO'));
  const nameIdx = headers.findIndex(h => h.includes('NAME'));
  const sexIdx = headers.findIndex(h => h === 'SEX' || h === 'GENDER');
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const regNo = row[regIdx];
    if (!regNo || regNo === '0' || String(regNo).trim() === '') continue;
    
    const docId = String(regNo).replace(/\//g, '-');
    const studentRef = doc(collection(db, 'students'), docId);
    
    batch.set(studentRef, {
      regNo: String(regNo),
      name: row[nameIdx] || 'Unknown',
      gender: row[sexIdx] || '',
      className: className,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    
    count++;
    if (count % 400 === 0) {
       await batch.commit();
       console.log(`Committed ${count} students...`);
    }
  }
  
  await batch.commit();
  console.log(`Finished pushing ${count} students for ${className}.`);
}

async function pushMarksheet(filePath, className, session, term) {
  console.log(`Processing marksheet for ${className} from ${filePath}...`);
  const workbook = XLSX.readFile(filePath);
  const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
  
  const batch = writeBatch(db);
  let count = 0;
  
  // Logic matches BulkUpload.jsx
  const row8 = rawData[7] || rawData[0]; // Try Row 8 or Row 0
  const subjects = [];
  
  // Simple subject extraction
  for (let i = 2; i < row8.length; i += 6) {
    if (row8[i] && !String(row8[i]).includes('TOTAL')) {
      subjects.push({ name: String(row8[i]).toUpperCase().trim(), startIndex: i });
    }
  }

  const safeSession = session.replace('/', '-');
  const safeTerm = term.replace(/\s/g, '').toLowerCase();

  for (let i = 2; i < rawData.length; i++) {
    const row = rawData[i];
    const regNo = row[0];
    if (!regNo || regNo === '0' || String(regNo).trim() === '') continue;

    const docId = String(regNo).replace(/\//g, '-');
    const marks = {};
    
    subjects.forEach(subject => {
      const sIdx = subject.startIndex;
      marks[subject.name] = {
        cat1: row[sIdx] || 0,
        cat2: row[sIdx + 1] || 0,
        exam: row[sIdx + 2] || 0,
        total: row[sIdx + 3] || 0,
        percent: row[sIdx + 4] || 0,
        grade: row[sIdx + 5] || ''
      };
    });

    const marksRef = doc(collection(db, 'marks'), `${docId}_${safeSession}_${safeTerm}`);
    batch.set(marksRef, {
      regNo: String(regNo),
      studentName: row[1] || 'Unknown',
      className: className,
      marks,
      term: term,
      session: session,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    count++;
    if (count % 400 === 0) {
      await batch.commit();
      console.log(`Committed ${count} marks...`);
    }
  }
  
  await batch.commit();
  
  // Auto-publish
  const pubId = `${safeSession}_${safeTerm}_${className.replace(/\s/g, '').toLowerCase()}`;
  await setDoc(doc(db, 'publications', pubId), {
    type: 'Result',
    examName: `${term} Examination`,
    session: session,
    term: term,
    targetClass: className,
    publishedAt: new Date().toISOString(),
    status: 'published'
  }, { merge: true });
  
  console.log(`Finished pushing marksheet and published for ${className}.`);
}

async function run() {
  try {
    // Push SS1
    if (fs.existsSync('src/assets/SS1STUDENTDETAILS.xlsx')) {
      await pushStudents('src/assets/SS1STUDENTDETAILS.xlsx', 'SS1');
    }
    if (fs.existsSync('src/assets/SS1MARKSHHET.xlsx')) {
      await pushMarksheet('src/assets/SS1MARKSHHET.xlsx', 'SS1', '2025/2026', 'Second Term');
    }

    // Push JSS1
    if (fs.existsSync('src/assets/jss1studentdetails.xlsx')) {
      await pushStudents('src/assets/jss1studentdetails.xlsx', 'JSS1');
    }
    
    // Push JSS2
    if (fs.existsSync('src/assets/jss2studentdetails.xlsx')) {
      await pushStudents('src/assets/jss2studentdetails.xlsx', 'JSS2');
    }

    // Push JSS3
    if (fs.existsSync('src/assets/jss3studentdetail.xlsx')) {
      await pushStudents('src/assets/jss3studentdetail.xlsx', 'JSS3');
    }

    // Push SS2
    if (fs.existsSync('src/assets/ss2art.xlsx')) {
      await pushStudents('src/assets/ss2art.xlsx', 'SS2 ART');
    }
    if (fs.existsSync('src/assets/ss2science.xlsx')) {
      await pushStudents('src/assets/ss2science.xlsx', 'SS2 SCIENCE');
    }

    console.log('\n--- ALL DATA PUSHED SUCCESSFULLY ---');
    process.exit(0);
  } catch (err) {
    console.error('Error during data push:', err);
    process.exit(1);
  }
}

run();
