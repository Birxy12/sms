import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, writeBatch, doc } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCBEsjJYSh4mzzAxWTq_bJzmY5toswIHs4",
  authDomain: "schoolpoetal.firebaseapp.com",
  projectId: "schoolpoetal",
  storageBucket: "schoolpoetal.firebasestorage.app",
  messagingSenderId: "166284201380",
  appId: "1:166284201380:web:80ea79ae5ef592885d4531"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function clearAllStudentPayments() {
  console.log("Authenticating anonymously...");
  await signInAnonymously(auth);
  console.log("Authenticated as:", auth.currentUser.uid);

  console.log("Fetching all student records from Firestore...");
  const studentsSnap = await getDocs(collection(db, "students"));
  console.log(`Found ${studentsSnap.size} total student documents.`);

  let batch = writeBatch(db);
  let count = 0;
  let batchCount = 0;

  for (const studentDoc of studentsSnap.docs) {
    const sRef = doc(db, "students", studentDoc.id);
    const expected = studentDoc.data().expectedFee || 0;
    batch.update(sRef, {
      paidFee: 0,
      paidAmount: 0,
      lastPaymentDate: "N/A",
      lastPaymentTerm: "N/A",
      lastPaymentSession: "N/A",
      txnId: "",
      serialNo: "",
      paymentStatus: "Pending",
      balance: expected
    });
    count++;

    if (count % 300 === 0) {
      console.log(`Committing batch ${++batchCount} (${count}/${studentsSnap.size} students)...`);
      await batch.commit();
      batch = writeBatch(db);
    }
  }

  if (count % 300 !== 0) {
    console.log(`Committing final batch ${++batchCount}...`);
    await batch.commit();
  }

  console.log(`\nSUCCESS: Cleared and set payments to zero for all ${count} students in Firestore!`);
  process.exit(0);
}

clearAllStudentPayments().catch((err) => {
  console.error("Error clearing student payments:", err);
  process.exit(1);
});
