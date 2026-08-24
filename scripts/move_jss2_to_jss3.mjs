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

async function moveJSS2ToJSS3() {
  console.log("Authenticating anonymously...");
  await signInAnonymously(auth);
  console.log("Authenticated as:", auth.currentUser.uid);

  console.log("Fetching all student records from Firestore...");
  const studentsSnap = await getDocs(collection(db, "students"));
  console.log(`Found ${studentsSnap.size} total student documents.`);

  const matched = [];

  for (const studentDoc of studentsSnap.docs) {
    const data = studentDoc.data();
    const regNo = (data.regNo || data.r || "").trim();
    const className = (data.className || data.c || data.class || data.classId || "").trim();

    // Check if regNo starts with bds/24/ or BDS/24/ or if className is JSS 2 / JSS2
    const regMatches = regNo.toLowerCase().startsWith("bds/24/");
    const classMatches = className.toLowerCase().replace(/\s+/g, '').includes("jss2");

    if (regMatches || classMatches) {
      matched.push({
        id: studentDoc.id,
        name: data.name || data.n || data["STUDENT NAME"] || "N/A",
        regNo,
        className,
        regMatches,
        classMatches
      });
    }
  }

  console.log(`\nMatched ${matched.length} students:`);
  matched.forEach((s, idx) => {
    console.log(`${idx + 1}. [${s.regNo}] ${s.name} - Current: "${s.className}" (regMatch: ${s.regMatches}, classMatch: ${s.classMatches})`);
  });

  // Target updating
  let batch = writeBatch(db);
  let updatedCount = 0;

  for (const s of matched) {
    const sRef = doc(db, "students", s.id);
    // Determine new class name: replace JSS 2 / JSS2 with JSS 3 / JSS3, or default to "JSS 3"
    let targetClass = "JSS 3";
    if (s.className.includes("JSS 2")) {
      targetClass = s.className.replace("JSS 2", "JSS 3");
    } else if (s.className.includes("JSS2")) {
      targetClass = s.className.replace("JSS2", "JSS 3");
    }

    const updates = {
      className: targetClass,
      classId: targetClass,
      updatedAt: new Date().toISOString()
    };

    // If using compressed schema
    batch.update(sRef, updates);
    updatedCount++;
  }

  if (updatedCount > 0) {
    console.log(`\nWriting batch updates for ${updatedCount} students to move them to JSS 3...`);
    await batch.commit();
    console.log(`\nSUCCESS: Successfully moved ${updatedCount} students to JSS 3!`);
  } else {
    console.log("\nNo students needed moving.");
  }

  process.exit(0);
}

moveJSS2ToJSS3().catch(err => {
  console.error("Error moving students:", err);
  process.exit(1);
});
