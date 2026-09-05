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
  console.log("3rd Term Documents with AGRIC SCIENCE or IGBO LANGUAGE:");
  snap.forEach(doc => {
     const d = expandMarks(doc.data());
     let hasAgric = false;
     let hasIgbo = false;
     Object.keys(d.marks || {}).forEach(k => {
        if (k.toUpperCase().trim() === 'AGRIC SCIENCE') hasAgric = true;
        if (k.toUpperCase().trim() === 'IGBO LANGUAGE') hasIgbo = true;
     });
     
     if (hasAgric || hasIgbo) {
        console.log(`\nDOC ID: ${doc.id}`);
        console.log(`Term: ${d.term}, Session: ${d.session}, Class: ${d.className || d.class_name}`);
        if (d.marks['AGRIC SCIENCE']) console.log(`  AGRIC SCIENCE: ${d.marks['AGRIC SCIENCE'].total}`);
        if (d.marks['IGBO LANGUAGE']) console.log(`  IGBO LANGUAGE: ${d.marks['IGBO LANGUAGE'].total}`);
        if (d.marks['MATHEMATICS']) console.log(`  MATHEMATICS: ${d.marks['MATHEMATICS'].total}`);
     }
  });
}

run().catch(console.error);
