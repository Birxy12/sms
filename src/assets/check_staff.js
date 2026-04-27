import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

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

async function checkStaff() {
  try {
    console.log('Checking staff collection...');
    const staffRef = collection(db, 'staff');
    const q = query(staffRef);
    const snap = await getDocs(q);
    
    console.log(`Found ${snap.size} staff members.`);
    snap.forEach(doc => {
      console.log(`ID: ${doc.id} | StaffID: ${doc.data().staffId} | Email: ${doc.data().email} | Name: ${doc.data().name} | Password: ${doc.data().password}`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkStaff();
