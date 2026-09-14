import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc, writeBatch } from 'firebase/firestore';

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

async function migrate() {
  console.log("Starting migration...");
  
  try {
    const studentsSnap = await getDocs(collection(db, 'students'));
    const batch = writeBatch(db);
    let updatedCount = 0;

    for (const studentDoc of studentsSnap.docs) {
      const data = studentDoc.data();
      if (data.registeredSubjects && Array.isArray(data.registeredSubjects)) {
        let needsUpdate = false;
        const newSubjects = data.registeredSubjects.map(sub => {
          if (sub === 'ANIMAL HUSBANDRY') {
            needsUpdate = true;
            return 'LIVESTOCK FARMING';
          }
          return sub;
        });

        if (needsUpdate) {
          batch.update(doc(db, 'students', studentDoc.id), { registeredSubjects: newSubjects });
          updatedCount++;
        }
      }
    }
    
    console.log(`Updating ${updatedCount} students...`);
    if (updatedCount > 0) {
      await batch.commit();
    }
    console.log("Migration complete.");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

migrate();
