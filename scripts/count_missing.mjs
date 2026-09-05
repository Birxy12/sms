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
  const snap2 = await getDocs(query(collection(db, "marks"), where("t", "==", "Second Term")));
  const snap3 = await getDocs(query(collection(db, "marks"), where("t", "==", "Third Term")));
  
  let agric2 = 0;
  let agric3 = 0;
  let igbo2 = 0;
  let igbo3 = 0;

  snap2.forEach(doc => {
     const d = expandMarks(doc.data());
     if (d.marks['AGRIC SCIENCE']) agric2++;
     if (d.marks['IGBO LANGUAGE']) igbo2++;
  });

  snap3.forEach(doc => {
     const d = expandMarks(doc.data());
     if (d.marks['AGRIC SCIENCE']) agric3++;
     if (d.marks['IGBO LANGUAGE']) igbo3++;
  });

  console.log(`AGRIC SCIENCE -> 2nd Term: ${agric2}, 3rd Term: ${agric3}`);
  console.log(`IGBO LANGUAGE -> 2nd Term: ${igbo2}, 3rd Term: ${igbo3}`);
}

run().catch(console.error);
