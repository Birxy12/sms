import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc, writeBatch, query, where } from 'firebase/firestore';

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

const RENAMES = {
  'ANIMAL HUSBANDRY': 'LIVESTOCK FARMING',
  'BASIC SC & TECH': 'INTERMEDIATE SCIENCE',
};

async function migrate() {
  console.log("Starting migration...");
  
  try {
    const batch = writeBatch(db);
    let totalUpdated = 0;

    // --- 1. Rename in the 'subjects' collection ---
    console.log("Scanning 'subjects' collection...");
    const subjectsSnap = await getDocs(collection(db, 'subjects'));
    let subjectUpdates = 0;
    for (const subDoc of subjectsSnap.docs) {
      const data = subDoc.data();
      const upperName = (data.name || '').trim().toUpperCase();
      const newName = RENAMES[upperName];
      if (newName) {
        batch.update(doc(db, 'subjects', subDoc.id), { name: newName });
        console.log(`  subjects: "${upperName}" → "${newName}" (${subDoc.id})`);
        subjectUpdates++;
        totalUpdated++;
      }
    }
    console.log(`Found ${subjectUpdates} subject doc(s) to rename.`);

    // --- 2. Rename in student registeredSubjects arrays ---
    console.log("Scanning 'students' collection...");
    const studentsSnap = await getDocs(collection(db, 'students'));
    let studentUpdates = 0;
    for (const studentDoc of studentsSnap.docs) {
      const data = studentDoc.data();
      if (data.registeredSubjects && Array.isArray(data.registeredSubjects)) {
        let needsUpdate = false;
        const newSubjects = data.registeredSubjects.map(sub => {
          const upper = (sub || '').trim().toUpperCase();
          if (RENAMES[upper]) {
            needsUpdate = true;
            return RENAMES[upper];
          }
          return sub;
        });
        if (needsUpdate) {
          batch.update(doc(db, 'students', studentDoc.id), { registeredSubjects: newSubjects });
          studentUpdates++;
          totalUpdated++;
        }
      }
    }
    console.log(`Found ${studentUpdates} student(s) to update.`);

    if (totalUpdated > 0) {
      await batch.commit();
      console.log(`✅ Migration complete. Updated ${totalUpdated} record(s).`);
    } else {
      console.log("✅ Nothing to update — already up to date.");
    }
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

migrate();
