import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, getFirestore } from "firebase/firestore";
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

// Initialize Firestore with settings to support multi-tab persistence and offline access
// If persistence initialization fails (stale lease, unsupported IndexedDB environment, private mode),
// fall back to a plain Firestore instance so the app continues working without repeated console errors.
const initFirestore = () => {
  if (typeof window !== 'undefined' && typeof indexedDB !== 'undefined') {
    try {
      return initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        }),
        experimentalAutoDetectLongPolling: true
      });
    } catch (error) {
      console.warn('Firestore local cache initialization failed; falling back to network-only Firestore.', error?.message || error);
    }
  } else {
    console.warn('Firestore local cache disabled: not running in a browser environment.');
  }

  return getFirestore(app);
};

const db = initFirestore();
const auth = getAuth(app);
const storage = getStorage(app);

export { app, analytics, db, auth, storage };
export default app;
