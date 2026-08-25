import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { initializeFirestore, persistentLocalCache, getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCBEsjJYSh4mzzAxWTq_bJzmY5toswIHs4",
  authDomain: "schoolpoetal.firebaseapp.com",
  projectId: "schoolpoetal",
  storageBucket: "schoolpoetal.firebasestorage.app",
  messagingSenderId: "166284201380",
  appId: "1:166284201380:web:80ea79ae5ef592885d4531",
  measurementId: "G-LC7N0BTSTE"
};

// Initialize Firebase (safely for HMR)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

let analytics = null;
if (typeof window !== 'undefined') {
  try {
    if (window.navigator?.onLine) {
      analytics = getAnalytics(app);
    } else {
      console.warn('Firebase analytics disabled: offline mode detected.');
    }
  } catch (error) {
    console.warn('Firebase analytics initialization failed:', error?.message || error);
  }
}

// Initialize Firestore with clean localCache persistence
const initFirestore = () => {
  if (typeof window !== 'undefined' && typeof indexedDB !== 'undefined') {
    try {
      return initializeFirestore(app, {
        localCache: persistentLocalCache({}),
        experimentalForceLongPolling: true,
        useFetchStreams: false
      });
    } catch (error) {
      console.warn('Firestore local cache initialization failed; falling back to default Firestore.', error?.message || error);
    }
  }

  return getFirestore(app);
};

const db = initFirestore();
const auth = getAuth(app);
const storage = getStorage(app);

export { app, analytics, db, auth, storage };
export default app;
