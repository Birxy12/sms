import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc } from 'firebase/firestore';

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

async function createStaff() {
  try {
    console.log('Creating/Updating staff member bds/staff/001...');
    // We use a specific ID to avoid duplicates, or just add to collection
    const staffRef = doc(collection(db, 'staff'), 'staff_001');
    await setDoc(staffRef, {
      staffId: 'BDS/STAFF/001',
      name: 'Teacher One',
      email: 'teacher1@bonusdominus.edu',
      password: '134',
      role: 'teacher',
      status: 'active',
      createdAt: new Date().toISOString()
    }, { merge: true });
    
    console.log('Successfully created staff member.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

createStaff();
