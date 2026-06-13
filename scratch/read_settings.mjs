import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, terminate } from "firebase/firestore";

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
  try {
    const docRef = doc(db, 'settings', 'public_content');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      console.log("Current Settings Content:", JSON.stringify(docSnap.data(), null, 2));
    } else {
      console.log("No settings document found.");
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await terminate(db);
    console.log("Firestore terminated.");
    process.exit(0);
  }
}

run();
