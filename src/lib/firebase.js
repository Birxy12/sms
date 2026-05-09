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
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

// Initialize Firestore with settings to mitigate common errors and support multi-tab persistence
// Initialize Firestore with settings to support multi-tab persistence
let db;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    }),
    experimentalForceLongPolling: true,
    useFetchStreams: false,
  });
} catch (e) {
  console.warn("Firestore initialization with persistence failed. Falling back to default instance.", e);
  // If persistence fails (common after version upgrades or manual cache clears), 
  // we use the default Firestore instance which typically uses memory cache as fallback.
  db = getFirestore(app);
}
const auth = getAuth(app);
const storage = getStorage(app);

export { app, analytics, db, auth, storage };
export default app;
