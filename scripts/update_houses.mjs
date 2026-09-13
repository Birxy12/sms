import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, writeBatch } from "firebase/firestore";

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

const updateHouses = async () => {
  const studentsRef = collection(db, 'students');
  const snapshot = await getDocs(studentsRef);
  
  let batch = writeBatch(db);
  let batchCount = 0;
  let updatedCount = 0;
  
  const houseMappings = {
    'yellow house': 'Alamanda',
    'orange house': 'Rose House',
    'red house': 'Cherry House',
    'blue house': 'Blue Bell House'
  };

  for (const studentDoc of snapshot.docs) {
    const data = studentDoc.data();
    // Support standard or compressed key for house
    const currentHouse = data.house || data.h;
    
    if (currentHouse) {
      const lowerHouse = currentHouse.toLowerCase().trim();
      let newHouse = null;

      if (houseMappings[lowerHouse]) {
        newHouse = houseMappings[lowerHouse];
      } else if (lowerHouse.includes('yellow')) {
        newHouse = 'Alamanda';
      } else if (lowerHouse.includes('orange')) {
        newHouse = 'Rose House';
      } else if (lowerHouse.includes('red')) {
        newHouse = 'Cherry House';
      } else if (lowerHouse.includes('blue')) {
        newHouse = 'Blue Bell House';
      }

      if (newHouse && newHouse !== currentHouse) {
        // Update both just in case, or whichever they use
        const updateData = {};
        if (data.house !== undefined) updateData.house = newHouse;
        if (data.h !== undefined) updateData.h = newHouse;
        
        // If neither was explicitly set (e.g., they only had one, we just use that)
        if (Object.keys(updateData).length === 0) {
            updateData.h = newHouse; // default to compressed
        }

        batch.update(studentDoc.ref, updateData);
        batchCount++;
        updatedCount++;
        console.log(`Updating student ${studentDoc.id}: ${currentHouse} -> ${newHouse}`);
        
        if (batchCount === 500) {
          await batch.commit();
          batch = writeBatch(db);
          batchCount = 0;
        }
      }
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }
  
  console.log(`Finished updating ${updatedCount} students.`);
  process.exit(0);
};

updateHouses().catch(console.error);
