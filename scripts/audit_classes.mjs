import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
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

async function audit() {
  await signInAnonymously(auth);
  const snap = await getDocs(collection(db, "students"));
  const classBreakdown = {};
  const regBreakdown = {};

  snap.forEach(d => {
    const data = d.data();
    const c = data.className || "Unknown";
    const reg = (data.regNo || "").substring(0, 7) || "None";
    classBreakdown[c] = (classBreakdown[c] || 0) + 1;
    regBreakdown[`${reg} -> ${c}`] = (regBreakdown[`${reg} -> ${c}`] || 0) + 1;
  });

  console.log("Class distribution in database:", classBreakdown);
  console.log("\nCohort mapping:", regBreakdown);
  process.exit(0);
}

audit();
