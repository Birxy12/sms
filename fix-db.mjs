import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, updateDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCBEsjJYSh4mzzAxWTq_bJzmY5toswIHs4",
  projectId: "schoolpoetal",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function findAndDelete() {
  const collections = ['students', 'payments', 'feePayments', 'transactions', 'receipts', 'payment_history', 'payment_messages'];
  
  for (const coll of collections) {
    console.log("Checking collection:", coll);
    try {
      const snap = await getDocs(collection(db, coll));
      for (const doc of snap.docs) {
        const data = JSON.stringify(doc.data());
        if (data.includes("59000") || data.includes("038")) {
          console.log(`FOUND in ${coll} -> ID: ${doc.id}`);
          if (coll !== 'students') {
             console.log("Deleting:", doc.id);
             await deleteDoc(doc.ref);
          } else {
             // It's a student, reset it.
             const studentData = doc.data();
             if (studentData.paidFee === 59000 || studentData.paidAmount === 59000 || studentData.paidFee === "59000" || data.includes("038")) {
                 console.log("Resetting student:", doc.id);
                 await updateDoc(doc.ref, { paidFee: 0, paidAmount: 0 });
             }
          }
        }
      }
    } catch(e) {
      console.log(`Collection ${coll} might not exist or error:`, e.message);
    }
  }
  console.log("Done");
  process.exit(0);
}

findAndDelete();
