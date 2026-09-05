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
  const snap = await getDocs(query(collection(db, "marks"), where("r", "==", "BDS/22/001")));
  console.log("Documents for BDS/22/001:");
  snap.forEach(doc => {
     const d = expandMarks(doc.data());
     console.log(`\nDOC ID: ${doc.id}`);
     console.log(`Term: ${d.term}, Session: ${d.session}`);
     Object.keys(d.marks || {}).forEach(k => {
        if (k !== '_meta') {
           console.log(`  Subj: ${k}, Total: ${d.marks[k].total}`);
        }
     });
  });
}

run().catch(console.error);
