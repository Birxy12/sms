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
  const snap = await getDocs(query(collection(db, "marks"), where("t", "==", "Third Term")));
  snap.forEach(doc => {
     const d = expandMarks(doc.data());
     Object.keys(d.marks || {}).forEach(k => {
        if (k.toUpperCase().trim() === 'AGRIC SCIENCE') {
           if (d.marks[k].total === 0 || d.marks[k].total === "0" || !d.marks[k].total) {
              console.log(`Student ${d.regNo} has 0 for AGRIC SCIENCE in 3rd term!`);
           }
        }
     });
  });
}

run().catch(console.error);
