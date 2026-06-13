import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, terminate } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

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
const auth = getAuth(app);

async function run() {
  try {
    // Authenticate as Super Admin to satisfy firestore security rules
    console.log("Authenticating as Super Admin...");
    await signInWithEmailAndPassword(auth, "globixtechinc@gmail.com", "J123456@@");
    console.log("Authenticated successfully.");

    const docRef = doc(db, 'settings', 'public_content');
    const principalData = {
      name: "MRS. ETUZU ANITA",
      image: "/principal.png",
      message: "Our mission transcends traditional teaching. We engineer environments where intellectual curiosity meets unwavering discipline, fostering a global elite prepared for the challenges of tomorrow."
    };
    
    await setDoc(docRef, { principalData }, { merge: true });
    console.log("Successfully updated settings/public_content in Firestore with MRS. ETUZU ANITA.");
  } catch (err) {
    console.error("Error during settings update:", err);
  } finally {
    await terminate(db);
    console.log("Firestore terminated.");
    process.exit(0);
  }
}

run();
