import React, { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { Download, Loader2, Printer, CheckCircle2 } from 'lucide-react';
import BulkStudentResults from './BulkStudentResults';
import { expandMarks, MARKS_KEYS } from '../utils/firestoreSchema';
import { normalizeClassName } from '../utils/classUtils';
import { getAverageDivisor } from '../utils/averageDivisor';
import { ensureFirebaseAuth } from '../lib/ensureAuth';

const AdminBulkPrint = () => {
  const [publications, setPublications] = useState([]);
  const [loadingPubs, setLoadingPubs] = useState(true);

  // Form State
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');

  // Print State
  const [isPreparingPrint, setIsPreparingPrint] = useState(false);
  const [bulkPrintData, setBulkPrintData] = useState([]);
  const bulkPrintRef = useRef(null);

  useEffect(() => {
    const fetchPubs = async () => {
      try {
        await ensureFirebaseAuth();
        const pubQuery = query(collection(db, 'publications'), where('type', '==', 'Result'));
        const pubSnap = await getDocs(pubQuery);
        const terms = pubSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        terms.sort((a, b) => b.session.localeCompare(a.session));
        setPublications(terms);
        
        if (terms.length > 0) {
           setSelectedSession(terms[0].session);
           setSelectedTerm(terms[0].term);
        }
      } catch (err) {
        console.error('Error fetching publications:', err);
      } finally {
        setLoadingPubs(false);
      }
    };
    fetchPubs();
  }, []);

  const uniqueSessions = [...new Set(publications.map(p => p.session))];
  const termsForSession = [...new Set(publications.filter(p => p.session === selectedSession).map(p => p.term))];
  
  // Hardcoded standard classes as fallback, but ideally should come from globalClasses
  const standardClasses = ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3', 'PRIMARY1', 'PRIMARY2', 'PRIMARY3', 'PRIMARY4', 'PRIMARY5', 'PRIMARY6', 'NURSERY1', 'NURSERY2', 'CRECHE'];

  const handleBulkPrint = async () => {
    if (!selectedSession || !selectedTerm || !selectedClass) {
      alert("Please select session, term, and class.");
      return;
    }
    
    setIsPreparingPrint(true);
    try {
      const normClass = normalizeClassName(selectedClass);
      const normTerm = (t = '') => t.toLowerCase().replace(/\s+/g, '');

      // 1. Fetch marks for this specific class
      const [snapC, snapClassName, snapClass_Name] = await Promise.all([
        getDocs(query(collection(db, 'marks'), where(MARKS_KEYS.className, '==', normClass))),
        getDocs(query(collection(db, 'marks'), where('className', '==', normClass))),
        getDocs(query(collection(db, 'marks'), where('class_name', '==', normClass)))
      ]);

      const allDocMap = new Map();
      [...snapC.docs, ...snapClassName.docs, ...snapClass_Name.docs].forEach(doc => {
        allDocMap.set(doc.id, doc.data());
      });
      let allMarksData = Array.from(allDocMap.values()).map(data => expandMarks(data));
      
      // Filter marks by session and term
      allMarksData = allMarksData.filter(d => {
         const sessionMatch = d.session === selectedSession;
         const termMatch = normTerm(d.term) === normTerm(selectedTerm) || selectedTerm.toLowerCase().includes((d.term || '').toLowerCase());
         return sessionMatch && termMatch;
      });

      if (allMarksData.length === 0) {
         // Maybe class was saved with a space (e.g. "JSS 1")
         const [snapC2, snapClassName2, snapClass_Name2] = await Promise.all([
            getDocs(query(collection(db, 'marks'), where(MARKS_KEYS.className, '==', selectedClass))),
            getDocs(query(collection(db, 'marks'), where('className', '==', selectedClass))),
            getDocs(query(collection(db, 'marks'), where('class_name', '==', selectedClass)))
          ]);
          [...snapC2.docs, ...snapClassName2.docs, ...snapClass_Name2.docs].forEach(doc => {
            allDocMap.set(doc.id, doc.data());
          });
          allMarksData = Array.from(allDocMap.values()).map(data => expandMarks(data));
          allMarksData = allMarksData.filter(d => {
            const sessionMatch = d.session === selectedSession;
            const termMatch = normTerm(d.term) === normTerm(selectedTerm) || selectedTerm.toLowerCase().includes((d.term || '').toLowerCase());
            return sessionMatch && termMatch;
         });
      }

      if (allMarksData.length === 0) {
         alert(`No marks found for ${selectedClass} in ${selectedTerm}, ${selectedSession}.`);
         setIsPreparingPrint(false);
         return;
      }

      // Reconstruct students from their marks
      const uniqueStudentRegs = [...new Set(allMarksData.map(m => m.regNo).filter(Boolean))];
      
      // We could fetch actual student docs for names and photos
      const studentsMap = new Map();
      const chunkSize = 10;
      for (let i = 0; i < uniqueStudentRegs.length; i += chunkSize) {
        const chunk = uniqueStudentRegs.slice(i, i + chunkSize);
        const sSnap = await getDocs(query(collection(db, 'students'), where('regNo', 'in', chunk)));
        sSnap.docs.forEach(doc => studentsMap.set(doc.data().regNo, doc.data()));
      }

      // Compute total to find position
      const studentTotals = {};
      allMarksData.forEach(d => {
        const reg = d.regNo;
        const marksDataObj = d.marks || {};
        let sum = 0;
        if (marksDataObj._meta && marksDataObj._meta.overallTotal) {
          sum = marksDataObj._meta.overallTotal;
        } else {
          Object.keys(marksDataObj).forEach(k => {
            if (k !== '_meta' && marksDataObj[k] && marksDataObj[k].total) {
              sum += parseFloat(marksDataObj[k].total || 0);
            }
          });
        }
        studentTotals[reg] = (studentTotals[reg] || 0) + sum;
      });

      const sortedStudents = Object.entries(studentTotals).sort((a, b) => b[1] - a[1]);
      
      // Fetch subjects for this class
      const subjectsQuery = query(collection(db, 'subjects'), where('class', '==', normClass));
      const subjectsSnap = await getDocs(subjectsQuery);
      const classSubjects = subjectsSnap.docs.map(d => d.data().name);

      const divisor = Math.max(getAverageDivisor(normClass, null), 1);
      const classPopSnap = uniqueStudentRegs.length;

      const printData = [];

      uniqueStudentRegs.forEach(regNum => {
        const foundMarksDoc = allMarksData.find(d => d.regNo === regNum);
        if (!foundMarksDoc) return;

        let posStr = foundMarksDoc?.marks?._meta?.position || '';
        if (!posStr || posStr === '0' || posStr === 'N/A') {
          const getOrdinal = (n) => {
            if (isNaN(n) || n <= 0) return 'N/A';
            const s = ["th", "st", "nd", "rd"];
            const v = n % 100;
            return n + (s[(v - 20) % 10] || s[v] || s[0]);
          };
          let rank = 1;
          posStr = 'N/A';
          for (let i = 0; i < sortedStudents.length; i++) {
            if (i > 0 && sortedStudents[i][1] < sortedStudents[i - 1][1]) rank = i + 1;
            if (sortedStudents[i][0] === regNum) {
              posStr = sortedStudents[i][1] > 0 ? getOrdinal(rank) : 'N/A';
              break;
            }
          }
        }

        const rawMarks = foundMarksDoc?.marks || {};
        let subjectList = classSubjects.length > 0 ? classSubjects : Object.keys(rawMarks).filter(k => k !== '_meta');
        const seen = new Set();
        subjectList = subjectList.filter(subj => {
          const upper = subj.toUpperCase().trim();
          if (seen.has(upper)) return false;
          seen.add(upper);
          return true;
        });

        let totalScore = 0;
        const processedMarks = subjectList.map(subjectName => {
          const dbKey = Object.keys(rawMarks).find(k => k.toUpperCase() === subjectName.toUpperCase()) || subjectName;
          const isOffered = rawMarks[dbKey] !== undefined;
          const sm = rawMarks[dbKey] || {};
          const cat1 = parseFloat(sm.cat1 ?? sm.ca1 ?? 0);
          const cat2 = parseFloat(sm.cat2 ?? sm.ca2 ?? 0);
          const exam = parseFloat(sm.exam ?? 0);
          const total = parseFloat(sm.total ?? (cat1 + cat2 + exam));
          if (isOffered) totalScore += total;
          let grade = sm.grade;
          if (!grade && isOffered) {
            if (total >= 75) grade = 'A';
            else if (total >= 70) grade = 'B1';
            else if (total >= 65) grade = 'B2';
            else if (total >= 60) grade = 'B3';
            else if (total >= 50) grade = 'C4';
            else if (total >= 45) grade = 'C5';
            else if (total >= 40) grade = 'D7';
            else if (total >= 35) grade = 'E8';
            else grade = 'F9';
          }
          return { subject: subjectName, cat1, cat2, exam, total, grade: grade || (isOffered ? 'F9' : '-'), isOffered };
        });

        const displaySubjects = processedMarks.filter(s => s.isOffered);
        const studentObj = studentsMap.get(regNum) || { 
            name: foundMarksDoc.studentName || 'Student', 
            regNo: regNum, 
            className: normClass 
        };

        printData.push({
          student: studentObj,
          marks: {
            subjects: displaySubjects.sort((a, b) => a.subject.localeCompare(b.subject)),
            overallTotal: totalScore,
            average: (totalScore / divisor).toFixed(1),
            raw: foundMarksDoc
          },
          classStats: {
            position: posStr,
            population: classPopSnap,
            historicalClass: normClass
          }
        });
      });

      setBulkPrintData(printData);
      
      setTimeout(async () => {
        if (bulkPrintRef.current) {
          const success = await bulkPrintRef.current.generatePDF(); 
          if (!success) alert('Failed to generate bulk PDF.');
        }
        setIsPreparingPrint(false);
        setBulkPrintData([]); 
      }, 1500);

    } catch (err) {
      console.error('Error preparing historical bulk print:', err);
      alert('An error occurred during print preparation.');
      setIsPreparingPrint(false);
    }
  };

  if (loadingPubs) {
      return <div className="flex items-center justify-center p-12 text-indigo-600"><Loader2 className="animate-spin" size={32} /></div>;
  }

  return (
    <div className="card-white p-6 md:p-8 relative">
      <div className="flex items-start gap-4 mb-8">
        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center shrink-0">
          <Printer className="text-indigo-600" size={24} />
        </div>
        <div>
          <h3 className="text-xl font-black text-slate-800">Historical Bulk Printing</h3>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Print report cards for a specific class from a past or present session.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div>
          <label className="block text-xs font-black text-slate-600 uppercase mb-2">Select Session</label>
          <select 
            className="w-full input-premium text-sm"
            value={selectedSession}
            onChange={(e) => {
               setSelectedSession(e.target.value);
               const relatedTerms = [...new Set(publications.filter(p => p.session === e.target.value).map(p => p.term))];
               if (relatedTerms.length > 0) setSelectedTerm(relatedTerms[0]);
            }}
          >
            {uniqueSessions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-black text-slate-600 uppercase mb-2">Select Term</label>
          <select 
            className="w-full input-premium text-sm"
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
          >
            {termsForSession.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-black text-slate-600 uppercase mb-2">Select Class</label>
          <select 
            className="w-full input-premium text-sm"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            <option value="">-- Choose Class --</option>
            {standardClasses.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-slate-100">
        <button 
          onClick={handleBulkPrint}
          disabled={isPreparingPrint || !selectedClass}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-8 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-200"
        >
          {isPreparingPrint ? <><Loader2 size={18} className="animate-spin" /> Preparing Document...</> : <><Download size={18} /> Generate PDF</>}
        </button>
      </div>

      {bulkPrintData.length > 0 && (
         <div style={{ position: 'absolute', left: 0, top: 0, zIndex: -9999, opacity: 0, pointerEvents: 'none', width: '100%', height: '0px', overflow: 'hidden' }}>
             <BulkStudentResults 
                ref={bulkPrintRef} 
                studentsData={bulkPrintData} 
                selectedPub={{ session: selectedSession, term: selectedTerm, targetClass: selectedClass }} 
             />
         </div>
      )}
    </div>
  );
};

export default AdminBulkPrint;
