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

async function revertJSS2() {
  console.log("Authenticating anonymously...");
  await signInAnonymously(auth);

  console.log("Fetching students to revert BDS/24/ back to JSS2...");
  const snap = await getDocs(collection(db, "students"));
  
  let batch = writeBatch(db);
  let count = 0;

  for (const sDoc of snap.docs) {
    const data = sDoc.data();
    const regNo = (data.regNo || data.r || "").trim();
    const sRef = doc(db, "students", sDoc.id);

    // Revert BDS/24/ back to JSS2
    if (regNo.toLowerCase().startsWith("bds/24/")) {
      batch.update(sRef, {
        className: "JSS2",
        classId: "JSS2",
        updatedAt: new Date().toISOString()
      });
      count++;
    }
  }

  console.log(`Reverting ${count} students starting with BDS/24/ back to JSS2...`);
  await batch.commit();
  console.log(`\nSUCCESS: Successfully reverted ${count} students back to JSS2!`);
  process.exit(0);
}

revertJSS2().catch(err => {
  console.error("Error reverting students:", err);
  process.exit(1);
});
