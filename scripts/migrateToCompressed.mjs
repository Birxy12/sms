import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, writeBatch, doc } from "firebase/firestore";

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

// Compressed Schema Keys
const MARKS_KEYS = { regNo: 'r', studentName: 'n', className: 'c', session: 's', term: 't', marks: 'm', updatedAt: 'u', average: 'avg', overallTotal: 'ot', cat1: 'c1', cat2: 'c2', exam: 'ex', total: 'to', percent: 'pc', grade: 'gr', remarks: 'rm', position: 'ps', min: 'mi', max: 'ma' };
const STUDENT_KEYS = { regNo: 'r', name: 'n', gender: 'g', className: 'c', dob: 'd', club: 'cl', house: 'h', updatedAt: 'u', photo: 'p' };

async function migrateStudents() {
  console.log("Migrating students...");
  const snap = await getDocs(collection(db, 'students'));
  let batch = writeBatch(db);
  let count = 0;

  for (const d of snap.docs) {
    const data = d.data();
    // Check if it's already compressed (e.g., has 'r' instead of 'regNo')
    if (data.regNo) {
      const compressed = {
        [STUDENT_KEYS.regNo]: data.regNo,
        [STUDENT_KEYS.name]: data.name || 'Unknown',
        [STUDENT_KEYS.gender]: data.gender || '',
        [STUDENT_KEYS.className]: data.className || '',
        [STUDENT_KEYS.dob]: data.dob || '',
        [STUDENT_KEYS.club]: data.club || '',
        [STUDENT_KEYS.house]: data.house || '',
        [STUDENT_KEYS.updatedAt]: data.updatedAt || new Date().toISOString()
      };
      batch.set(doc(db, 'students', d.id), compressed);
      count++;

      if (count % 400 === 0) {
        await batch.commit();
        batch = writeBatch(db);
        console.log(`Migrated ${count} students...`);
      }
    }
  }
  await batch.commit();
  console.log(`Finished migrating ${count} students.`);
}

async function migrateMarks() {
  console.log("Migrating marks...");
  const snap = await getDocs(collection(db, 'marks'));
  let batch = writeBatch(db);
  let count = 0;

  for (const d of snap.docs) {
    const data = d.data();
    // Check if it's already compressed (uses 'r' instead of 'regNo' or 'reg_no')
    if (data.regNo || data.reg_no) {
      const regNo = data.regNo || data.reg_no;
      const compressed = {
        [MARKS_KEYS.regNo]: regNo,
        [MARKS_KEYS.studentName]: data.studentName || data.student_name || 'Unknown',
        [MARKS_KEYS.className]: data.className || data.class_name || '',
        [MARKS_KEYS.session]: data.session || '',
        [MARKS_KEYS.term]: data.term || '',
        [MARKS_KEYS.updatedAt]: data.updatedAt || data.updated_at || new Date().toISOString(),
        [MARKS_KEYS.marks]: {}
      };

      if (data.marks) {
        Object.entries(data.marks).forEach(([subj, m]) => {
          if (subj === '_meta') {
            compressed[MARKS_KEYS.marks]._meta = {
              [MARKS_KEYS.average]: m.average,
              [MARKS_KEYS.overallTotal]: m.overallTotal
            };
          } else {
            compressed[MARKS_KEYS.marks][subj] = {
              [MARKS_KEYS.cat1]: m.cat1 || 0,
              [MARKS_KEYS.cat2]: m.cat2 || 0,
              [MARKS_KEYS.exam]: m.exam || 0,
              [MARKS_KEYS.total]: m.total || 0,
              [MARKS_KEYS.percent]: m.percent || 0,
              [MARKS_KEYS.grade]: m.grade || '',
              [MARKS_KEYS.remarks]: m.remarks || '',
              [MARKS_KEYS.position]: m.position || '',
              [MARKS_KEYS.min]: m.min || '',
              [MARKS_KEYS.max]: m.max || ''
            };
          }
        });
      }

      batch.set(doc(db, 'marks', d.id), compressed);
      count++;

      if (count % 400 === 0) {
        await batch.commit();
        batch = writeBatch(db);
        console.log(`Migrated ${count} marks...`);
      }
    }
  }
  await batch.commit();
  console.log(`Finished migrating ${count} marks.`);
}

async function run() {
  try {
    await migrateStudents();
    await migrateMarks();
    console.log("\n--- MIGRATION COMPLETED SUCCESSFULLY ---");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

run();
