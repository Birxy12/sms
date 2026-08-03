import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useStudentAuth } from '../../context/StudentAuthContext';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { useTheme } from '../../context/ThemeContext';
import { Award, AlertCircle, Printer, Download, ChevronLeft, User, ArrowLeft } from 'lucide-react';
import bdsLogo from '../../assets/bdslogo.jpg';
import resultStamp from '../../assets/stamp.jpeg';
import { expandMarks, expandStudent, MARKS_KEYS, STUDENT_KEYS } from '../../utils/firestoreSchema';
import { ensureFirebaseAuth } from '../../lib/ensureAuth';
import Navbar from '../../components/Navbar';
import { getAverageDivisor } from '../../utils/averageDivisor';

const StudentResults = ({ isPublic }) => {
const { currentStudent: loggedInStudent, authError, authReady } = useStudentAuth();
const { schoolName, schoolLogo, primaryColor, principalSignature, principalStamp, darkMode, averageDivisors } = useTheme();
const printRef = useRef();

const [publishedTerms, setPublishedTerms] = useState([]);
const [selectedTermId, setSelectedTermId] = useState('');
const [studentMarks, setStudentMarks] = useState(null);
const [loading, setLoading] = useState(true);
const [isPrinting, setIsPrinting] = useState(false);
const [classStats, setClassStats] = useState({ position: 'N/A', population: 0 });
const [schoolDates, setSchoolDates] = useState({
termEnds: '12/12/2025',
nextTermBegins: '12/01/2026'
});
const [formTeacher, setFormTeacher] = useState('CLASS TEACHER');
const [resultsError, setResultsError] = useState('');

const location = useLocation();
const searchParams = new URLSearchParams(location.search);
const adminRegNo = searchParams.get('regNo');
const publicPin = searchParams.get('pin');
const urlPubId = searchParams.get('pubId');
const urlPrint = searchParams.get('print') === '1';

const [adminFetchedStudent, setAdminFetchedStudent] = useState(null);
const currentStudent = adminFetchedStudent || loggedInStudent;
const [pinVerified, setPinVerified] = useState(false);

useEffect(() => {
if (adminRegNo) {
const fetchAdminStudent = async () => {
  let q = query(collection(db, 'students'), where(STUDENT_KEYS.regNo, '==', adminRegNo));
  let snap = await getDocs(q);
  if (snap.empty) {
    // fallback to legacy
    q = query(collection(db, 'students'), where('regNo', '==', adminRegNo));
    snap = await getDocs(q);
  }
  if (!snap.empty) {
    const sDataRaw = snap.docs[0].data();
    const sDataExpanded = expandStudent(sDataRaw);
    
    // If it's a public access, we MUST verify the PIN here too for security
    if (isPublic) {
      const isAdminBypass = publicPin === '@@@@@@' || publicPin === '001100' || publicPin === '260796';
      const storedPin = sDataExpanded.pin || sDataRaw.pin || '';
      if (!isAdminBypass && storedPin !== publicPin) {
        setResultsError('Unauthorized access. Invalid PIN.');
        setLoading(false);
        return;
      }
      setPinVerified(true);
    }
    
    setAdminFetchedStudent(sDataExpanded);
  }
};
fetchAdminStudent();
} else if (isPublic && !loggedInStudent) {
  // If public but no regNo or logged in student, it's invalid
  setResultsError('Please use the Result Checker to access this page.');
  setLoading(false);
}
}, [adminRegNo, isPublic, publicPin, loggedInStudent]);

const regNum = currentStudent?.regNo || currentStudent?.['REG NO'] || currentStudent?.REGNO || '';
const studentClass = currentStudent?.className || currentStudent?.classId || '';
const studentName = currentStudent?.name || currentStudent?.['STUDENT NAME'] || 'Student';

useEffect(() => {
const fetchPublications = async () => {
try {
const pubQuery = query(collection(db, 'publications'), where('type', '==', 'Result'));
const pubSnap = await getDocs(pubQuery);

const terms = pubSnap.docs.map(doc => {
const data = doc.data();
return {
id: doc.id,
examName: data.examName,
session: data.session,
term: data.term,
targetClass: data.targetClass || 'All Classes',
publishedAt: data.publishedAt
};
}).filter(pub => {
return pub.targetClass === 'All Classes' || pub.targetClass === studentClass;
});

terms.sort((a, b) => b.session.localeCompare(a.session));

setPublishedTerms(terms);
if (terms.length > 0) {
// If a specific pubId was passed in the URL (from CheckResult page), use it
const preSelected = urlPubId ? terms.find(t => t.id === urlPubId) : null;
setSelectedTermId(preSelected ? preSelected.id : terms[0].id);
} else {
setLoading(false);
}
} catch (error) {
console.error('Error fetching publications:', error);
setLoading(false);
}
};

if (regNum) {
fetchPublications();
} else {
setLoading(false);
}
}, [regNum]);

useEffect(() => {
const fetchResults = async () => {
// Allow admin bypass (adminRegNo set) OR logged-in student flow
if (!selectedTermId || !regNum) return;
if (!adminRegNo && authError) {
  setResultsError(authError);
  setStudentMarks(null);
  setLoading(false);
  return;
}

setLoading(true);
try {
  setResultsError('');
  await ensureFirebaseAuth();
  const selectedPub = publishedTerms.find(p => p.id === selectedTermId);
  if (!selectedPub) return;

        // ── 1. Fetch ALL marks for this student by regNo from Firestore (compressed and legacy uncompressed)
        const [snapR, snapRegNo, snapReg_No] = await Promise.all([
          getDocs(query(collection(db, 'marks'), where(MARKS_KEYS.regNo, '==', regNum))),
          getDocs(query(collection(db, 'marks'), where('regNo', '==', regNum))),
          getDocs(query(collection(db, 'marks'), where('reg_no', '==', regNum)))
        ]);

        const docMap = new Map();
        [...snapR.docs, ...snapRegNo.docs, ...snapReg_No.docs].forEach(doc => {
          docMap.set(doc.id, doc.data());
        });
        const marksData = Array.from(docMap.values()).map(data => expandMarks(data));

        // Normalise term string for comparison (e.g. 'Second Term' === 'secondterm')
        const normTerm = (t = '') => t.toLowerCase().replace(/\s+/g, '');

        let foundMarksDoc = null;
        (marksData || []).forEach(d => {
          const sessionMatch = d.session === selectedPub.session;
          const termMatch =
            normTerm(d.term) === normTerm(selectedPub.term) ||
            selectedPub.term.toLowerCase().includes((d.term || '').toLowerCase());
          if (sessionMatch && termMatch) {
            foundMarksDoc = d;
          }
        });

        // ── 2. Compute class standing: fetch all marks for class/session from Firestore
        const [snapC, snapClassName, snapClass_Name] = await Promise.all([
          getDocs(query(collection(db, 'marks'), where(MARKS_KEYS.className, '==', studentClass))),
          getDocs(query(collection(db, 'marks'), where('className', '==', studentClass))),
          getDocs(query(collection(db, 'marks'), where('class_name', '==', studentClass)))
        ]);

        const allDocMap = new Map();
        [...snapC.docs, ...snapClassName.docs, ...snapClass_Name.docs].forEach(doc => {
          allDocMap.set(doc.id, doc.data());
        });
        const allMarksData = Array.from(allDocMap.values()).map(data => expandMarks(data));

        const studentTotals = {};
        (allMarksData || []).forEach(d => {
          const sessionMatch = d.session === selectedPub.session;
          const termMatch =
            normTerm(d.term) === normTerm(selectedPub.term) ||
            selectedPub.term.toLowerCase().includes((d.term || '').toLowerCase());
          if (sessionMatch && termMatch) {
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
          }
        });

        // Tie-aware standard competition (skip) ranking
        const sortedStudents = Object.entries(studentTotals)
          .sort((a, b) => b[1] - a[1]);

        // Position: use stored value if present, else calculate dynamically
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
            if (i > 0 && sortedStudents[i][1] < sortedStudents[i - 1][1]) {
              rank = i + 1;
            }
            if (sortedStudents[i][0] === regNum) {
              posStr = sortedStudents[i][1] > 0 ? getOrdinal(rank) : 'N/A';
              break;
            }
          }
        }

        // ── 3. Class population
        let classPopQuery = query(collection(db, 'students'), where(STUDENT_KEYS.className, '==', studentClass));
        let classPopSnap = await getDocs(classPopQuery);
        // Fallback to legacy key
        if (classPopSnap.empty) {
          classPopQuery = query(collection(db, 'students'), where('className', '==', studentClass));
          classPopSnap = await getDocs(classPopQuery);
          if (classPopSnap.empty) {
            classPopQuery = query(collection(db, 'students'), where('CLASS', '==', studentClass));
            classPopSnap = await getDocs(classPopQuery);
          }
        }

        setClassStats({
          position: posStr,
          population: classPopSnap.size
        });

        // ── 4. Build subject list for this class
        const subjectsQuery = query(collection(db, 'subjects'), where('class', '==', studentClass));
        const subjectsSnap = await getDocs(subjectsQuery);
        const classSubjects = subjectsSnap.docs.map(d => d.data().name);

        const rawMarks = foundMarksDoc?.marks || {};
        let subjectList = classSubjects.length > 0 ? classSubjects : Object.keys(rawMarks).filter(k => k !== '_meta');

        // Deduplicate subject list (case-insensitive)
        const seen = new Set();
        subjectList = subjectList.filter(subj => {
          const upper = subj.toUpperCase().trim();
          if (seen.has(upper)) return false;
          seen.add(upper);
          return true;
        });

        if (!foundMarksDoc && subjectList.length === 0) {
          // No marks found at all – show empty state rather than all-zero rows
          setStudentMarks(null);
          setLoading(false);
          return;
        }

        let totalScore = 0;
        let subjectCount = 0;

        const processedMarks = subjectList.map(subjectName => {
          // Case-insensitive lookup
          const dbKey = Object.keys(rawMarks).find(
            k => k.toUpperCase() === subjectName.toUpperCase()
          ) || subjectName;
          const isOffered = rawMarks[dbKey] !== undefined;

          const sm = rawMarks[dbKey] || {};
          const cat1 = parseFloat(sm.cat1 ?? sm.ca1 ?? 0);
          const cat2 = parseFloat(sm.cat2 ?? sm.ca2 ?? 0);
          const exam = parseFloat(sm.exam ?? 0);
          const total = parseFloat(sm.total ?? (cat1 + cat2 + exam));

          if (isOffered) {
            totalScore += total;
            subjectCount++;
          }

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

          return {
            subject: subjectName,
            cat1,
            cat2,
            exam,
            total,
            grade: grade || (isOffered ? 'F9' : '-'),
            isOffered
          };
        });

        // Only show subjects that have been offered
        const displaySubjects = processedMarks.filter(s => s.isOffered);

        // Calculate average based on configured divisors
        const divisor = Math.max(getAverageDivisor(currentStudent?.className || studentClass, averageDivisors), 1);

        setStudentMarks({
          subjects: displaySubjects.sort((a, b) => a.subject.localeCompare(b.subject)),
          overallTotal: totalScore,
          average: (totalScore / divisor).toFixed(1),
          raw: foundMarksDoc
        });

      } catch (error) {
if (error?.code === 'permission-denied') {
setResultsError('Results are currently blocked by Firebase permissions. Please ask the administrator to enable Anonymous sign-in or update Firestore rules for student result access.');
} else {
console.error('Error fetching marks:', error);
setResultsError('Unable to load your results right now.');
}
} finally {
setLoading(false);
}
};

fetchResults();
}, [selectedTermId, publishedTerms, regNum, currentStudent, authError, authReady]);

useEffect(() => {
const fetchSchoolDates = async () => {
try {
const docSnap = await getDoc(doc(db, 'settings', 'school_dates'));
if (docSnap.exists()) {
const data = docSnap.data();
setSchoolDates({
termEnds: data.termEnds || '12/12/2025',
nextTermBegins: data.nextTermBegins || '12/01/2026'
});
}
} catch (error) {
console.error("Error fetching school dates:", error);
}
};
fetchSchoolDates();
}, []);

useEffect(() => {
const fetchFormTeacher = async () => {
if (studentClass) {
try {
const docSnap = await getDoc(doc(db, 'classes', studentClass));
if (docSnap.exists() && docSnap.data().formTeacherName) {
setFormTeacher(docSnap.data().formTeacherName.toUpperCase());
}
} catch (e) {
console.error("Error fetching form teacher", e);
}
}
};
fetchFormTeacher();
}, [studentClass]);

// Auto-trigger print when opened from admin with print=1 param
useEffect(() => {
  if (urlPrint && studentMarks && !loading) {
    const timer = window.setTimeout(() => {
      setIsPrinting(true);
  clone.style.width = '794px';
  clone.style.maxWidth = '794px';
  clone.style.minHeight = 'auto';
  clone.style.margin = '0 auto';
  clone.style.background = '#ffffff';
  clone.style.padding = '0';
  clone.style.boxSizing = 'border-box';
  clone.style.overflow = 'visible';
  clone.style.transform = 'none';

  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.left = '-9999px';
  wrapper.style.top = '0';
  wrapper.style.width = '794px';
  wrapper.style.background = '#ffffff';
  wrapper.style.zIndex = '-1';
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);
  return wrapper;
};

const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  const handleDownloadPDF = async () => {
    if (!printRef.current) {
      window.alert('The report card is not ready yet. Please wait and try again.');
      return;
    }

    try {
      setIsPrinting(true);
      const html2pdf = (await import('html2pdf.js')).default;
      
      const opt = {
        margin: 0,
        filename: `${currentStudent?.name || 'Student'}-Report-Card.pdf`,
        image: { type: 'jpeg', quality: 1.0 },
        html2canvas: { scale: 3, useCORS: true, logging: false, allowTaint: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      setTimeout(async () => {
        try {
          await html2pdf().set(opt).from(printRef.current).save();
        } finally {
          setIsPrinting(false);
        }
      }, 500);
    } catch (err) {
      console.error('PDF Download failed:', err);
      window.alert('PDF download failed. Please try again.');
      setIsPrinting(false);
    }
  };

if (loading && publishedTerms.length === 0) {
return (
<div className="flex items-center justify-center p-20">
<div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: primaryColor }}></div>
</div>
);
}

const renderPrintView = () => (
<div className="report-card-print" ref={printRef}>
<style>{`
.report-card-print {
width: 794px;
max-width: 100%;
min-height: auto;
padding: 8mm 10mm;
margin: 0 auto;
background: white;
color: #0f172a;
font-family: 'Outfit', 'Inter', sans-serif;
position: relative;
box-sizing: border-box;
overflow: hidden;
display: flex;
flex-direction: column;
}
@page { size: A4 portrait; margin: 0; }
@media print {
  html, body {
    background: white !important;
    margin: 0; padding: 0;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  /* Hide everything on the page except the report card */
  body > *:not(.print-portal-host) { display: none !important; }
  .no-print { display: none !important; }
  .print-portal-host { display: block !important; position: fixed; top: 0; left: 0; width: 100%; z-index: 9999; }
  .report-card-print {
    width: 794px !important;
    padding: 8mm 10mm !important;
    margin: 0 !important;
    background: white !important;
    box-shadow: none !important;
    border: none !important;
    overflow: visible !important;
    transform: none !important;
    position: static !important;
  }
}
@media (max-width: 1024px) {
  .report-card-print {
    width: 100%;
    min-height: auto;
    padding: 6mm;
    transform: none;
    zoom: normal;
    overflow-x: hidden;
  }
}
@media (max-width: 768px) {
  .report-card-print {
    padding: 4mm;
  }
  .print-header {
    flex-direction: column;
    gap: 4px;
    align-items: center;
  }
  .print-school-info h1 {
    font-size: 11px;
  }
  .print-school-info h2 {
    font-size: 8px;
  }
  .print-school-info p {
    font-size: 6.2px;
  }
  .print-stats-grid {
    grid-template-columns: 1fr 1fr;
  }
  .print-main-content {
    grid-template-columns: 1fr;
  }
  .commentary-section {
    grid-template-columns: 1fr;
  }
  .print-logo {
    width: 40px;
    height: 40px;
  }
}
.print-branding-top { font-size: 6.5px; text-transform: uppercase; font-weight: 800; color: #94a3b8; margin-bottom: 3px; display: flex; justify-content: space-between; }
.print-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 4px; margin-bottom: 6px; gap: 8px; }
.print-logo-box { flex-shrink: 0; }
.print-logo { width: 54px; height: 54px; object-fit: contain; display: block; }
.print-school-info { text-align: center; flex: 1; }
.print-school-info h1 { font-size: 13px; font-weight: 900; margin: 0; line-height: 1.1; color: #1e293b; }
.print-school-info h2 { font-size: 10px; font-weight: 700; margin: 0; color: #475569; }
.print-school-info p { font-size: 7px; margin: 2px 0; font-weight: 600; color: #64748b; }
.print-term-badge { display: inline-block; background: #1e293b; color: white; padding: 1px 8px; border-radius: 12px; font-size: 8px; font-weight: 900; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.5px; }
.print-photo-box { flex-shrink: 0; }
.student-photo-frame { width: 56px; height: 68px; border: 1.5px solid #334155; background: #f8fafc; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.student-photo-frame img { width: 100%; height: 100%; object-fit: cover; }
.photo-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #334155; color: #f8fafc; font-size: 7px; font-weight: 900; letter-spacing: 1px; }
.print-stats-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 4px; margin-bottom: 6px; border: 1px solid #0f172a; padding: 4px; background: #f8fafc; }
.stat-item { font-size: 7px; display: flex; align-items: center; }
.stat-item label { font-weight: 800; color: #475569; width: 42px; font-size: 6.5px; }
.stat-item span { font-weight: 700; color: #0f172a; flex: 1; border-bottom: 1px dashed #cbd5e1; padding-bottom: 1px; }
.stat-item .highlight { color: #2563eb; font-weight: 900; }
.academic-performance-title { background: #f1f5f9; color: #0f172a; text-align: center; font-weight: 900; padding: 2px; font-size: 8px; letter-spacing: 1px; margin-bottom: 4px; border: 1px solid #0f172a; text-transform: uppercase; }
.print-main-content { display: grid; grid-template-columns: 1.6fr 0.9fr; gap: 8px; margin-bottom: 6px; align-items: start; }
.print-table-wrapper { min-width: 0; }
.print-table { width: 100%; border-collapse: collapse; font-size: 6.8px; }
.print-table th { background: #1e293b; color: white; padding: 2px; border: 1px solid #0f172a; font-weight: 900; text-transform: uppercase; font-size: 6.4px; }
.print-table td { padding: 2px; border: 1px solid #0f172a; text-align: center; font-weight: 700; }
.print-table td.subject-name { text-align: left; font-weight: 900; padding-left: 4px; background: #f8fafc; }
.print-side-panels { display: flex; flex-direction: column; gap: 4px; }
.mini-table { width: 100%; border-collapse: collapse; font-size: 6.3px; }
.mini-table th { background: #e2e8f0; border: 1px solid #0f172a; padding: 1px; font-weight: 900; }
.mini-table td { border: 1px solid #0f172a; padding: 1px; text-align: center; font-weight: 700; }
.mini-table td:first-child { text-align: left; font-weight: 800; background: #f8fafc; font-size: 6px; }
.section-title { font-size: 7px; font-weight: 900; margin-bottom: 2px; padding: 1px 3px; background: #0f172a; color: white; text-transform: uppercase; }
.summary-box { border: 1px solid #0f172a; padding: 2px; text-align: center; background: #f8fafc; margin-bottom: 2px; }
.summary-box label { font-size: 6px; font-weight: 900; color: #475569; display: block; text-transform: uppercase; }
.summary-box .value { font-size: 9px; font-weight: 900; }
.status-pass { color: #059669; }
.commentary-section { border: 1px solid #0f172a; padding: 4px; margin-bottom: 6px; background: #fdfdfd; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.comment-box { margin-bottom: 2px; }
.comment-box:last-child { margin-bottom: 0; }
.comment-box label { font-size: 7px; font-weight: 900; text-decoration: underline; color: #1e293b; }
.comment-box p { font-size: 7px; margin: 1px 0; font-style: italic; color: #334155; line-height: 1.18; min-height: 20px; }
.print-footer { margin-top: auto; border-top: 1px solid #0f172a; padding-top: 4px; }
.footer-cols { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.footer-sign { text-align: center; width: 140px; }
.sign-line { border-bottom: 1px dashed #0f172a; margin-bottom: 2px; height: 18px; }
.footer-sign p { font-size: 6.8px; font-weight: 900; margin: 0; text-transform: uppercase; }
.stamp-box { width: 90px; height: 40px; border: 2px dashed #cbd5e1; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 6px; font-weight: 900; color: #cbd5e1; text-transform: uppercase; transform: rotate(-8deg); }
.footer-dates { text-align: right; }
.footer-dates p { font-size: 6.8px; margin: 1px 0; font-weight: 600; color: #475569; }
.footer-dates strong { color: #0f172a; font-weight: 800; }
.print-final-branding { text-align: center; font-size: 6.8px; font-weight: 900; color: #1e293b; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 3px; border-top: 1px solid #e2e8f0; padding-top: 3px; }
.print-watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 72px; font-weight: 900; color: rgba(15, 23, 42, 0.035); white-space: nowrap; pointer-events: none; z-index: -1; }
`}</style>
<div className="print-branding-top">Academic Session: {selectedPub?.session}</div>
<div className="print-header">
<div className="print-logo-box">
<img src={schoolLogo || bdsLogo} alt="Logo" className="print-logo" />
</div>
<div className="print-school-info">
<h1>{schoolName || 'BONUS DOMINUS NURSERY, PRIMARY'}</h1>
<h2>& SECONDARY SCHOOL</h2>
<p>5A - 5C UZOANYA CRESCENT, AMUZUKWU, UMUAHIA, ABIA STATE</p>
<div className="print-term-badge">{selectedPub?.term} Report Card for {selectedPub?.session}</div>
</div>
<div className="print-photo-box">
<div className="student-photo-frame">
{currentStudent?.photo ? <img src={currentStudent.photo} alt="Student" /> : <div className="photo-placeholder">PHOTO</div>}
</div>
</div>
</div>
<div className="print-stats-grid">
<div className="stat-item"><label>NAME:</label> <span>{currentStudent?.name}</span></div>
<div className="stat-item"><label>REG NO:</label> <span>{regNum}</span></div>
<div className="stat-item"><label>SEX:</label> <span>{currentStudent?.gender || 'N/A'}</span></div>
<div className="stat-item"><label>AVERAGE:</label> <span className="highlight">{studentMarks?.average}%</span></div>
<div className="stat-item"><label>POSITION:</label> <span className="highlight">{classStats.position}</span></div>
<div className="stat-item"><label>CLASS:</label> <span>{currentStudent?.className}</span></div>
<div className="stat-item"><label>POPULATION:</label> <span>{classStats.population}</span></div>
<div className="stat-item"><label>DOB:</label> <span>{currentStudent?.dob || 'N/A'}</span></div>
<div className="stat-item"><label>HOUSE:</label> <span>{currentStudent?.house || 'ALAMANDA'}</span></div>
</div>
<div className="academic-performance-title">ACADEMIC PERFORMANCE</div>
<div className="print-main-content">
<div className="print-table-wrapper">
<table className="print-table">
<thead>
<tr>
<th>SUBJECTS</th>
<th>CA1(20)</th>
<th>CA2(20)</th>
<th>EXAM(60)</th>
<th>TOTAL(100)</th>
<th>GRADE</th>
<th>REMARKS</th>
</tr>
</thead>
<tbody>
{studentMarks?.subjects.map((sub, idx) => (
<tr key={idx}>
<td className="subject-name">{sub.subject}</td>
<td>{sub.cat1}</td>
<td>{sub.cat2}</td>
<td>{sub.exam}</td>
<td className="font-bold">{sub.total}</td>
<td className="font-bold">{sub.grade}</td>
<td className="text-[9px] font-medium uppercase">
{sub.total >= 75 ? 'Excellent' :
sub.total >= 60 ? 'Very Good' :
sub.total >= 50 ? 'Good' :
sub.total >= 40 ? 'Average' : 'Below Average'}
</td>
</tr>
))}
</tbody>
</table>
</div>
<div className="print-side-panels">
<div className="behaviour-section">
<div className="section-title">BEHAVIOURAL ASSESSMENT</div>
<table className="mini-table">
<thead><tr><th>TRAITS</th><th>1</th><th>2</th><th>3</th><th>4</th></tr></thead>
<tbody>
{[
{ label: 'ATTENTIVENESS', value: studentMarks?.raw?.behaviour?.attentiveness || 4 },
{ label: 'HONESTY', value: studentMarks?.raw?.behaviour?.honesty || 4 },
{ label: 'NEATNESS', value: studentMarks?.raw?.behaviour?.neatness || 4 },
{ label: 'POLITENESS', value: studentMarks?.raw?.behaviour?.politeness || 4 },
{ label: 'PUNCTUALITY', value: studentMarks?.raw?.behaviour?.punctuality || 4 }
].map(t => (
<tr key={t.label}>
<td>{t.label}</td>
{[1, 2, 3, 4, 5].slice(0, 4).map(level => (
<td key={level}>{t.value === level ? '√' : ''}</td>
))}
</tr>
))}
</tbody>
</table>
</div>
<div className="skills-section">
<div className="section-title">PSYCHOMOTOR SKILLS</div>
<table className="mini-table">
<thead><tr><th>SKILL</th><th>1</th><th>2</th><th>3</th><th>4</th></tr></thead>
<tbody>
{[
{ label: 'HAND WRITING', value: studentMarks?.raw?.skills?.handwriting || 3 },
{ label: 'SPOKEN ENGLISH', value: studentMarks?.raw?.skills?.english || 3 },
{ label: 'OUTDOOR GAMES', value: studentMarks?.raw?.skills?.games || 3 }
].map(s => (
<tr key={s.label}>
<td>{s.label}</td>
{[1, 2, 3, 4, 5].slice(0, 4).map(level => (
<td key={level}>{s.value === level ? '√' : ''}</td>
))}
</tr>
))}
</tbody>
</table>
</div>
<div className="summary-section">
<div className="summary-box">
<label>TOTAL SCORE</label>
<div className="value">{studentMarks?.overallTotal}</div>
</div>
<div className="summary-box">
<label>PERFORMANCE STATUS</label>
<div className="value status-pass">PROMOTED</div>
</div>
</div>
</div>
</div>
<div className="commentary-section" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
<div className="comment-box">
<label>TEACHER'S COMMENT:</label>
<p style={{ minHeight: '40px' }}>{studentMarks?.raw?.teacherComment || 'An impressive performance. Keep up the good work.'}</p>
<div style={{ marginTop: '10px', borderBottom: '1px solid #000', width: '100px' }}></div>
<span style={{ fontSize: '7px', fontWeight: 'bold' }}>{formTeacher}</span>
</div>
<div className="comment-box">
<label>PRINCIPAL'S COMMENT:</label>
<p style={{ minHeight: '40px' }}>{studentMarks?.raw?.principalComment || 'You came out with flying colours. Congratulations!'}</p>
<div style={{ marginTop: '10px', borderBottom: '1px solid #000', width: '100px' }}></div>
<span style={{ fontSize: '7px', fontWeight: 'bold' }}>PRINCIPAL (MRS ETUZU ANITA)</span>
</div>
</div>
</div>
);

const renderScreenView = () => {
if (resultsError) {
return (
<div className="card-white no-print" style={{ padding: '48px 32px', textAlign: 'center' }}>
<div className="w-16 h-16 mx-auto mb-4 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center">
<AlertCircle size={32} />
</div>
<h3 className="text-xl font-bold text-slate-800 mb-2">Results Unavailable</h3>
<p className="text-slate-500">{resultsError}</p>
</div>
);
}

if (publishedTerms.length === 0) {
return (
<div className="card-white no-print" style={{ padding: '60px 40px', textAlign: 'center' }}>
<div className="w-16 h-16 mx-auto mb-4 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center">
<AlertCircle size={32} />
</div>
<h3 className="text-xl font-bold text-slate-800 mb-2">No Results Found</h3>
<p className="text-slate-600">Academic results for this session have not been published by the management.</p>
</div>
);
}

  return (
    <div className="space-y-6">
      <div className="card-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
        <div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white m-0">Term Reports</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Select a published session to view your report card.</p>
        </div>
        <select
          value={selectedTermId}
          onChange={(e) => setSelectedTermId(e.target.value)}
          className="w-full sm:w-auto px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 outline-none bg-slate-50 dark:bg-slate-800 font-black text-slate-700 dark:text-slate-200 focus:border-indigo-500 transition-all"
        >
          {publishedTerms.map(pub => (
            <option key={pub.id} value={pub.id}>{pub.examName} ({pub.session})</option>
          ))}
        </select>
      </div>

      {!studentMarks ? (
        <div className="card-white no-print" style={{ padding: '40px', textAlign: 'center' }}>
          <div className="w-16 h-16 mx-auto mb-4 bg-amber-50 dark:bg-amber-950/20 text-amber-400 rounded-full flex items-center justify-center">
            <AlertCircle size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Scores Not Yet Available</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Your subject scores have not been entered for this term yet. Please check back later or contact your class teacher.</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-slate-200 dark:bg-slate-900 p-4 rounded-xl flex justify-center shadow-inner">
          {renderPrintView()}
        </div>
      )}
    </div>
  );
};

const selectedPub = publishedTerms.find(p => p.id === selectedTermId);

if (isPrinting) {
  return (
    <div className="w-full bg-white print-container">
      {renderPrintView()}
    </div>
  );
}

return (
  <div className={isPublic ? `min-h-screen flex flex-col ${darkMode ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-800'} transition-colors duration-300` : "dashboard-wrapper"}>
    {isPublic && <Navbar />}

    <div className={isPublic ? "flex-1 p-4 md:p-10 max-w-7xl mx-auto w-full" : ""}>
      <>
        {isPublic && (
          <div className="mb-8 flex items-center justify-between no-print">
            <button
              onClick={() => window.history.back()}
              className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-black text-xs uppercase tracking-widest transition-colors animate-in fade-in"
            >
              <ArrowLeft size={16} /> Back to Search
            </button>
          </div>
        )}

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-6 no-print">
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white mb-2">Report Card</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Official termly academic performance summary.</p>
          </div>
          <div className="flex flex-wrap items-center gap-4 md:gap-8">
            <div className="flex flex-col items-end">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white dark:border-slate-800 shadow-xl bg-slate-50 dark:bg-slate-800 mb-1">
                {currentStudent?.photo || currentStudent?.photoURL ? (
                  <img src={currentStudent.photo || currentStudent.photoURL} alt="Student" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
                    <User size={24} />
                  </div>
                )}
              </div>
              <p className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{currentStudent?.name}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 px-5 py-3 rounded-2xl font-black text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-all shadow-sm active:scale-95"
              >
                <Printer size={18} /> Print Report Card
              </button>
              <button
                onClick={handleDownloadPDF}
                className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-3 rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95"
              >
                <Download size={18} /> Download PDF
              </button>
            </div>
          </div>
        </div>
        {renderScreenView()}
      </>
    </div>
  </div>
);
};

export default StudentResults;
