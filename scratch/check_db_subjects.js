import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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

const check = async () => {
  const snap = await getDocs(collection(db, 'subjects'));
  const subjects = [];
  snap.forEach(doc => {
    subjects.push({ id: doc.id, ...doc.data() });
  });
  console.log("Subjects list in Firestore:", subjects);
  process.exit(0);
};

check().catch(console.error);
