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

async function fixCohorts() {
  console.log("Authenticating anonymously...");
  await signInAnonymously(auth);

  console.log("Fetching students...");
  const snap = await getDocs(collection(db, "students"));
  
  let batch = writeBatch(db);
  let count24 = 0;
  let count25 = 0;

  for (const sDoc of snap.docs) {
    const data = sDoc.data();
    const regNo = (data.regNo || data.r || "").trim();
    const sRef = doc(db, "students", sDoc.id);

    // If regNo starts with BDS/24/ -> MUST BE JSS 3
    if (regNo.toLowerCase().startsWith("bds/24/")) {
      batch.update(sRef, {
        className: "JSS 3",
        classId: "JSS 3",
        updatedAt: new Date().toISOString()
      });
      count24++;
    }

    // If regNo starts with BDS/25/ and was mistakenly changed from JSS2 to JSS3 -> restore to JSS 2
    if (regNo.toLowerCase().startsWith("bds/25/")) {
      // Check if they are JSS cohort (not SS1/SS2/etc)
      const currentClass = (data.className || "").trim();
      if (currentClass === "JSS 3" || currentClass === "JSS 2" || currentClass === "JSS2") {
        batch.update(sRef, {
          className: "JSS 2",
          classId: "JSS 2",
          updatedAt: new Date().toISOString()
        });
        count25++;
      }
    }
  }

  console.log(`Setting ${count24} students starting with BDS/24/ to JSS 3...`);
  console.log(`Setting ${count25} students starting with BDS/25/ to JSS 2...`);

  await batch.commit();
  console.log("\nSUCCESS: All student cohorts accurately positioned!");
  process.exit(0);
}

fixCohorts().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
