import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import { readFileSync } from 'fs';

// Load .env
const env = readFileSync('./functions/.env', 'utf-8');
const config = {};
env.split('\n').forEach(line => {
  if (line.includes('=')) {
    const [k, v] = line.split('=');
    config[k.trim()] = v.trim();
  }
});

const app = initializeApp({
  apiKey: config.VITE_FIREBASE_API_KEY,
  authDomain: config.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: config.VITE_FIREBASE_PROJECT_ID,
  storageBucket: config.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: config.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: config.VITE_FIREBASE_APP_ID
});

const db = getFirestore(app);

async function checkAdmissions() {
  const adms = await getDocs(collection(db, 'admissions'));
  console.log('Admissions total:', adms.docs.length);
  for (const doc of adms.docs) {
    const d = doc.data();
    if (d.admissionStatus === 'granted' || d.status === 'Admitted') {
      console.log('Admitted applicant:', d.fullName || d.applicantName, 'RegNo:', d.regNo);
      // Check students collection
      const q = query(collection(db, 'students'), where('appNo', '==', d.appNo));
      const s = await getDocs(q);
      if (!s.empty) {
        console.log('  -> Found in students collection! RegNo:', s.docs[0].data().regNo, 'Status:', s.docs[0].data().status, 'Class:', s.docs[0].data().className);
      } else {
        console.log('  -> NOT FOUND in students collection!');
      }
    }
  }
}

checkAdmissions().then(() => process.exit(0)).catch(console.error);
