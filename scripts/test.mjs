import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where, limit } from "firebase/firestore";

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

// Simple copy of expandMarks from your schema
export const expandMarks = (compressed) => {
  if (!compressed) return null;
  if (compressed.regNo || compressed.reg_no) {
    const marksObj = { ...(compressed.marks || {}) };
    Object.keys(compressed).forEach(key => {
      if (key.startsWith('marks.')) {
        const subjectName = key.slice('marks.'.length);
        if (!marksObj[subjectName]) marksObj[subjectName] = compressed[key];
      }
    });
    if (compressed.m && typeof compressed.m === 'object') {
      Object.entries(compressed.m).forEach(([subj, m]) => {
        if (!marksObj[subj]) {
          marksObj[subj] = { cat1: m.c1, cat2: m.c2, exam: m.ex, total: m.to, percent: m.pc, grade: m.gr };
        }
      });
    }
    return {
      regNo: compressed.regNo || compressed.reg_no,
      studentName: compressed.studentName || compressed.student_name,
      className: compressed.className || compressed.class_name,
      session: compressed.session,
      term: compressed.term,
      updatedAt: compressed.updatedAt || compressed.updated_at,
      marks: marksObj
    };
  }
  const data = {
    regNo: compressed['r'],
    studentName: compressed['n'],
    className: compressed['c'],
    session: compressed['s'],
    term: compressed['t'],
    updatedAt: compressed['u'],
    marks: {}
  };
  if (compressed['m']) {
    Object.entries(compressed['m']).forEach(([subject, m]) => {
      if (subject === '_meta') {
        data.marks._meta = { average: m['avg'], overallTotal: m['ot'], position: m['ps'] };
      } else if (m) {
        data.marks[subject] = { cat1: m['c1'], cat2: m['c2'], exam: m['ex'], total: m['to'], percent: m['pc'], grade: m['gr'], remarks: m['rm'], position: m['ps'], min: m['mi'], max: m['ma'] };
      }
    });
  }
  return data;
};


async function run() {
  console.log("Fetching marks...");
  const q = query(collection(db, "marks"), limit(1000)); // bump limit
  const snap = await getDocs(q);
  
  const studentMap = {};
  
  snap.forEach(doc => {
    const d = expandMarks(doc.data());
    if (!studentMap[d.regNo]) studentMap[d.regNo] = [];
    studentMap[d.regNo].push({ id: doc.id, term: d.term, session: d.session, marks: Object.keys(d.marks || {}) });
  });

  const studentsWithMultipleTerms = Object.keys(studentMap).filter(reg => studentMap[reg].length > 1);
  console.log(`Found ${studentsWithMultipleTerms.length} students with multiple terms.`);
  
  if (studentsWithMultipleTerms.length > 0) {
    const reg = studentsWithMultipleTerms[0];
    console.log(`Data for ${reg}:`);
    console.log(JSON.stringify(studentMap[reg], null, 2));
    
    // Now fetch full data for this student
    const snap2 = await getDocs(query(collection(db, "marks"), where("r", "==", reg)));
    const snap3 = await getDocs(query(collection(db, "marks"), where("regNo", "==", reg)));
    
    [...snap2.docs, ...snap3.docs].forEach(doc => {
       const d = expandMarks(doc.data());
       console.log(`\nDOC ID: ${doc.id}`);
       console.log(`TERM: ${d.term}`);
       console.log(`SESSION: ${d.session}`);
       Object.keys(d.marks || {}).forEach(k => {
          if (k !== '_meta') {
             console.log(`  SUBJ: ${k}, TOTAL: ${d.marks[k].total}`);
          }
       });
    });
  }
}

run().catch(console.error);
