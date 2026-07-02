import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCBEsjJYSh4mzzAxWTq_bJzmY5toswIHs4",
  authDomain: "schoolpoetal.firebaseapp.com",
  projectId: "schoolpoetal",
  storageBucket: "schoolpoetal.firebasestorage.app",
  messagingSenderId: "166284201380",
  appId: "1:166284201380:web:80ea79ae5ef592885d4531"
};

import { signInAnonymously, getAuth } from "firebase/auth";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const regNo = "BDS/25/014";

async function inspect() {
  console.log("Signing in anonymously...");
  await signInAnonymously(auth);
  console.log("=== INSPECTING STUDENT ===");
  // Try doc fetch first
  const docId = regNo.replace(/\//g, "-");
  const docRef = doc(db, "students", docId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    console.log("Student Doc by ID:", docSnap.data());
  } else {
    console.log("No student doc found by ID");
  }

  // Try query
  const q = query(collection(db, "students"), where("r", "==", regNo));
  const qSnap = await getDocs(q);
  console.log("Student Query matching count:", qSnap.size);
  qSnap.forEach(d => console.log("Student Query match:", d.id, d.data()));

  console.log("\n=== INSPECTING MARKS ===");
  const marksQ = query(collection(db, "marks"), where("r", "==", regNo));
  const marksSnap = await getDocs(marksQ);
  console.log("Marks Query matching count (r):", marksSnap.size);
  marksSnap.forEach(d => console.log("Marks Query match (r):", d.id, d.data()));

  const marksQ2 = query(collection(db, "marks"), where("regNo", "==", regNo));
  const marksSnap2 = await getDocs(marksQ2);
  console.log("Marks Query matching count (regNo):", marksSnap2.size);
  marksSnap2.forEach(d => console.log("Marks Query match (regNo):", d.id, d.data()));

  console.log("\n=== INSPECTING PUBLICATIONS ===");
  const pubQ = query(collection(db, "publications"));
  const pubSnap = await getDocs(pubQ);
  console.log("Publications count:", pubSnap.size);
  pubSnap.forEach(d => console.log("Publication:", d.id, d.data()));
}

inspect().catch(console.error);
