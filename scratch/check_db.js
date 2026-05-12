import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, limit } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "dummy",
    projectId: "school-portal-cbb94", // just putting a project id for local test or using admin sdk? No, the user has firebase config in src/lib/firebase.js
};
