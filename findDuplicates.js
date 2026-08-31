import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, getDoc } from "firebase/firestore";

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

async function findDuplicates() {
    try {
        const snap = await getDocs(collection(db, "students"));
        
        let all = [];
        snap.forEach(d => {
            all.push({ id: d.id, ...d.data() });
        });

        console.log(`Total students: ${all.length}`);
        
        let createdByScript = all.filter(s => s.createdBy === 'script');
        console.log(`Created by script: ${createdByScript.length}`);

        // Check for duplicates by name
        let byName = {};
        let duplicatesCount = 0;
        for (let s of all) {
            let name = String(s.name || s.NAME || '').trim().toLowerCase();
            if (!name) continue;
            
            if (byName[name]) {
                byName[name].push(s);
                if (byName[name].length === 2) {
                    duplicatesCount++;
                }
            } else {
                byName[name] = [s];
            }
        }
        
        console.log(`Unique names with duplicates: ${duplicatesCount}`);
        let toDelete = 0;
        for (const name in byName) {
            if (byName[name].length > 1) {
                toDelete += (byName[name].length - 1);
            }
        }
        console.log(`Total duplicate records that can be removed: ${toDelete}`);

    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}

findDuplicates();
