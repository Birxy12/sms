import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where, limit } from "firebase/firestore";
import { expandMarks } from './test.mjs';

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

async function run() {
  console.log("Searching for 3rd term marks...");
  const snap = await getDocs(query(collection(db, "marks"), where("t", "==", "Third Term")));
  const snap2 = await getDocs(query(collection(db, "marks"), where("term", "==", "Third Term")));
  const snap3 = await getDocs(query(collection(db, "marks"), where("term", "==", "3rd Term")));

  const allDocs = [...snap.docs, ...snap2.docs, ...snap3.docs];
  console.log(`Found ${allDocs.length} documents for 3rd term.`);
  
  let mathCount = 0;
  for (const doc of allDocs) {
    const d = expandMarks(doc.data());
    let hasMaths = false;
    Object.keys(d.marks || {}).forEach(k => {
       if (k.toUpperCase().includes("MATH")) {
          hasMaths = true;
          console.log(`Reg: ${d.regNo}, Class: ${d.className}, Subj: ${k}, Total: ${d.marks[k].total}`);
       }
    });
    if (hasMaths) mathCount++;
  }
  
  console.log(`Found ${mathCount} 3rd term documents with Maths.`);
}

run().catch(console.error);
