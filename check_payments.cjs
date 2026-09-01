const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, updateDoc, doc } = require("firebase/firestore");

const firebaseConfig = {
  apiKey: "AIzaSyCBEsjJYSh4mzzAxWTq_bJzmY5toswIHs4",
  authDomain: "schoolpoetal.firebaseapp.com",
  projectId: "schoolpoetal",
  storageBucket: "schoolpoetal.firebasestorage.app",
  messagingSenderId: "166284201380",
  appId: "1:166284201380:web:80ea79ae5ef592885d4531"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  console.log("Fetching students...");
  const snap = await getDocs(collection(db, "students"));
  
  for (const studentDoc of snap.docs) {
    const data = studentDoc.data();
    const paidFee = parseFloat(data.paidFee) || parseFloat(data.paidAmount) || 0;
    
    if (paidFee > 0) {
      const cls = data.className || data.CLASS || 'Unknown';
      const isNew = data.studentType === 'new_intake' || data.isNewIntake === true;
      console.log(`Paid: ${paidFee} | Class: ${cls} | New Intake: ${isNew} | Name: ${data.name || data['STUDENT NAME']}`);
    }
  }
  
  process.exit(0);
}

run().catch(console.error);
