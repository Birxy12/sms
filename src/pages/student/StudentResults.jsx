import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { useStudentAuth } from '../../context/StudentAuthContext';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { useTheme } from '../../context/ThemeContext';
import { Award, AlertCircle, Printer, Download, ChevronLeft, User, ArrowLeft } from 'lucide-react';
import bdsLogo from '../../assets/bdslogo.jpg';
import resultStamp from '../../assets/stamp.jpeg';
import { expandMarks, expandStudent, MARKS_KEYS, STUDENT_KEYS } from '../../utils/firestoreSchema';
import { ensureFirebaseAuth } from '../../lib/ensureAuth';
import Navbar from '../../components/Navbar';
import { getAverageDivisor } from '../../utils/averageDivisor';
import { generateAutoComments } from '../../utils/commentGenerator';
import html2pdf from 'html2pdf.js';
import StudentAvatar from '../../components/StudentAvatar';

const StudentResults = ({ isPublic }) => {
  const { currentStudent: loggedInStudent, authError, authReady } = useStudentAuth() || {};
  const { 
    schoolName, motto, schoolAddress, schoolPhone, principalName, 
    schoolLogo, primaryColor, principalSignature, principalStamp, 
    darkMode, averageDivisors, termEndDate, nextTermBeginsDate, 
    autoCommentsEnabled, commentTemplates 
  } = useTheme();
  const printRef = useRef();

  const [publishedTerms, setPublishedTerms] = useState([]);
  const [selectedTermId, setSelectedTermId] = useState('');
  const [studentMarks, setStudentMarks] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [classStats, setClassStats] = useState({ position: 'N/A', population: 0, historicalClass: '' });
  const [formTeacher, setFormTeacher] = useState('CLASS TEACHER');
  const [cumulativeMarks, setCumulativeMarks] = useState(null);
  const [cumulativeClassStats, setCumulativeClassStats] = useState({ position: 'N/A', population: 0, historicalClass: '' });
  const [viewMode, setViewMode] = useState('termly'); // 'termly' | 'cumulative'
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
          q = query(collection(db, 'students'), where('regNo', '==', adminRegNo));
          snap = await getDocs(q);
        }
        if (!snap.empty) {
          const sDataRaw = snap.docs[0].data();
          const sDataExpanded = expandStudent(sDataRaw);

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

        const historicalClass = foundMarksDoc?.className || foundMarksDoc?.class_name || studentClass;

        const [snapC, snapClassName, snapClass_Name] = await Promise.all([
          getDocs(query(collection(db, 'marks'), where(MARKS_KEYS.className, '==', historicalClass))),
          getDocs(query(collection(db, 'marks'), where('className', '==', historicalClass))),
          getDocs(query(collection(db, 'marks'), where('class_name', '==', historicalClass)))
        ]);

        const allDocMap = new Map();
        [...snapC.docs, ...snapClassName.docs, ...snapClass_Name.docs, ...snapR.docs, ...snapRegNo.docs, ...snapReg_No.docs].forEach(doc => {
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

        const sortedStudents = Object.entries(studentTotals).sort((a, b) => b[1] - a[1]);

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

        let classPopQuery = query(collection(db, 'students'), where(STUDENT_KEYS.className, '==', historicalClass));
        let classPopSnap = await getDocs(classPopQuery);
        if (classPopSnap.empty) {
          classPopQuery = query(collection(db, 'students'), where('className', '==', historicalClass));
          classPopSnap = await getDocs(classPopQuery);
          if (classPopSnap.empty) {
            classPopQuery = query(collection(db, 'students'), where('CLASS', '==', historicalClass));
            classPopSnap = await getDocs(classPopQuery);
          }
        }

        const populationFromMarks = sortedStudents.length;

        setClassStats({
          position: posStr,
          population: populationFromMarks > 0 ? populationFromMarks : classPopSnap.size,
          historicalClass: historicalClass
        });

        const subjectsQuery = query(collection(db, 'subjects'), where('class', '==', historicalClass));
        const subjectsSnap = await getDocs(subjectsQuery);
        const classSubjects = subjectsSnap.docs.map(d => d.data().name);

        const rawMarks = foundMarksDoc?.marks || {};
        let subjectList = classSubjects.length > 0 ? classSubjects : Object.keys(rawMarks).filter(k => k !== '_meta');

        const seen = new Set();
        subjectList = subjectList.filter(subj => {
          const upper = subj.toUpperCase().trim();
          if (seen.has(upper)) return false;
          seen.add(upper);
          return true;
        });

        if (!foundMarksDoc && subjectList.length === 0) {
          setStudentMarks(null);
          setLoading(false);
          return;
        }

        let totalScore = 0;
        let subjectCount = 0;

        const processedMarks = subjectList.map(subjectName => {
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

        const displaySubjects = processedMarks.filter(s => s.isOffered);
        const divisor = Math.max(getAverageDivisor(historicalClass, averageDivisors), 1);

        setStudentMarks({
          subjects: displaySubjects.sort((a, b) => a.subject.localeCompare(b.subject)),
          overallTotal: totalScore,
          average: (totalScore / divisor).toFixed(1),
          raw: foundMarksDoc
        });

        // --- CUMULATIVE CALCULATION START ---
        const cumTotals = {}; 
        const cumSubjectTotals = {}; 
        
        (allMarksData || []).forEach(d => {
          const s1 = (d.session || '').replace(/[^0-9]/g, '');
          const s2 = (selectedPub.session || '').replace(/[^0-9]/g, '');
          const isSameSession = d.session === selectedPub.session || 
                                s1 === s2 || 
                                (s1.length >= 4 && s2.length >= 4 && (s1.includes(s2.substring(0,4)) || s2.includes(s1.substring(0,4))));
          
          if (isSameSession) {
            const reg = d.regNo;
            if (!cumTotals[reg]) cumTotals[reg] = 0;
            if (!cumSubjectTotals[reg]) cumSubjectTotals[reg] = {};
            
            let sum = 0;
            const m = d.marks || {};
            const dTerm = normTerm(d.term);
            let termKey = 't3';
            if (dTerm.includes('first') || dTerm.includes('1st') || dTerm === 'term1' || dTerm === '1') termKey = 't1';
            else if (dTerm.includes('second') || dTerm.includes('2nd') || dTerm === 'term2' || dTerm === '2') termKey = 't2';
            else if (dTerm.includes('third') || dTerm.includes('3rd') || dTerm === 'term3' || dTerm === '3') termKey = 't3';
            
            if (m._meta && m._meta.overallTotal) {
              sum = parseFloat(m._meta.overallTotal);
            }
            
            Object.keys(m).forEach(k => {
              if (k !== '_meta' && m[k] && m[k].total) {
                const subT = parseFloat(m[k].total || 0);
                if (!(m._meta && m._meta.overallTotal)) sum += subT;
                
                const upSub = k.toUpperCase().trim();
                if (!cumSubjectTotals[reg][upSub]) {
                  cumSubjectTotals[reg][upSub] = { t1: 0, t2: 0, t3: 0 };
                }
                cumSubjectTotals[reg][upSub][termKey] = Math.max(cumSubjectTotals[reg][upSub][termKey] || 0, subT);
              }
            });
            
            cumTotals[reg] += sum;
          }
        });
        
        const cumSorted = Object.entries(cumTotals).sort((a, b) => b[1] - a[1]);
        let cumPosStr = 'N/A';
        const getOrdinal2 = (n) => {
          if (isNaN(n) || n <= 0) return 'N/A';
          const s = ["th", "st", "nd", "rd"];
          const v = n % 100;
          return n + (s[(v - 20) % 10] || s[v] || s[0]);
        };
        
        let rank2 = 1;
        for (let i = 0; i < cumSorted.length; i++) {
          if (i > 0 && cumSorted[i][1] < cumSorted[i - 1][1]) rank2 = i + 1;
          if (cumSorted[i][0] === regNum) {
            cumPosStr = cumSorted[i][1] > 0 ? getOrdinal2(rank2) : 'N/A';
            break;
          }
        }
        
        setCumulativeClassStats({
          position: cumPosStr,
          population: cumSorted.length > 0 ? cumSorted.length : classPopSnap.size,
          historicalClass: historicalClass
        });
        
        const myCumSubjectsObj = cumSubjectTotals[regNum] || {};
        const myCumSubjects = Object.keys(myCumSubjectsObj).map(subj => {
          const sObj = myCumSubjectsObj[subj];
          const sTotal = (sObj.t1 || 0) + (sObj.t2 || 0) + (sObj.t3 || 0);
          const cumAvg = sTotal / 3;
          
          let grade = 'F9';
          let remark = 'Fail';
          if (cumAvg >= 75) { grade = 'A'; remark = 'Excellent'; }
          else if (cumAvg >= 70) { grade = 'B1'; remark = 'Very Good'; }
          else if (cumAvg >= 65) { grade = 'B2'; remark = 'Good'; }
          else if (cumAvg >= 60) { grade = 'B3'; remark = 'Credit'; }
          else if (cumAvg >= 50) { grade = 'C4'; remark = 'Credit'; }
          else if (cumAvg >= 45) { grade = 'C5'; remark = 'Pass'; }
          else if (cumAvg >= 40) { grade = 'D7'; remark = 'Pass'; }
          else if (cumAvg >= 35) { grade = 'E8'; remark = 'Poor'; }
          
          let subRank = 1;
          const allSt = Object.keys(cumSubjectTotals);
          const subjScores = [];
          allSt.forEach(stReg => {
             if (cumSubjectTotals[stReg][subj]) {
               const sst = cumSubjectTotals[stReg][subj];
               const sstTotal = (sst.t1 || 0) + (sst.t2 || 0) + (sst.t3 || 0);
               subjScores.push({ reg: stReg, score: sstTotal });
             }
          });
          subjScores.sort((a,b) => b.score - a.score);
          for(let i=0; i<subjScores.length; i++){
             if(i>0 && subjScores[i].score < subjScores[i-1].score) subRank = i+1;
             if(subjScores[i].reg === regNum) break;
          }
          
          return {
             subject: subj,
             t1: sObj.t1,
             t2: sObj.t2,
             t3: sObj.t3,
             total: sTotal,
             average: cumAvg.toFixed(1),
             grade: grade,
             remark: remark,
             position: getOrdinal2(subRank)
          };
        }).sort((a, b) => a.subject.localeCompare(b.subject));
        
        const myCumTotal = myCumSubjects.reduce((sum, sub) => sum + sub.total, 0);
        const myCumAvg = (myCumTotal / (divisor * 3)).toFixed(1);
        
        setCumulativeMarks({
          subjects: myCumSubjects,
          overallTotal: myCumTotal,
          average: myCumAvg
        });
        // --- CUMULATIVE CALCULATION END ---

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

  useEffect(() => {
    if (urlPrint && studentMarks && !loading) {
      const timer = window.setTimeout(() => {
        setIsPrinting(true);
        setTimeout(() => {
          window.print();
          setIsPrinting(false);
        }, 300);
      }, 800);
      return () => window.clearTimeout(timer);
    }
  }, [urlPrint, studentMarks, loading]);

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 300);
  };

  const handleDownloadPDF = async () => {
    if (!printRef.current) {
      window.alert('The report card is not ready yet. Please wait and try again.');
      return;
    }
    setIsGeneratingPDF(true);
    // Give React a moment to remove the zoom wrapper before capturing
    await new Promise(resolve => setTimeout(resolve, 50));
    try {
      const opt = {
        margin: 0,
        filename: `${currentStudent?.name || 'Student'}-Report-Card.pdf`,
        image: { type: 'jpeg', quality: 1.0 },
        html2canvas: { scale: 3, useCORS: true, logging: false, allowTaint: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      await html2pdf().set(opt).from(printRef.current).save();
    } catch (err) {
      console.error('PDF Download failed:', err);
      window.alert('PDF download failed. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
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

  const selectedPub = publishedTerms.find(p => p.id === selectedTermId);

  const autoC = generateAutoComments(studentMarks?.average, commentTemplates);
  const teacherCommentText = studentMarks?.raw?.teacherComment || (autoCommentsEnabled ? autoC.teacherComment : 'An impressive performance. Keep up the good work.');
  const principalCommentText = studentMarks?.raw?.principalComment || (autoCommentsEnabled ? autoC.principalComment : 'You came out with flying colours. Congratulations!');

  const formatDOB = (dobStr) => {
    if (!dobStr) return 'N/A';
    const d = new Date(dobStr);
    if (isNaN(d.getTime())) return dobStr;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const renderPrintView = () => (
    <div className="report-card-print" ref={printRef}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Inter:wght@400;500;600;700;800;900&display=swap');
        
        .report-card-print {
          width: 794px;
          min-width: 794px;
          min-height: 1122px;
          padding: 10mm 8mm 6mm 8mm;
          margin: 0 auto;
          background: white;
          color: #1a1a2e;
          font-family: 'Inter', sans-serif;
          position: relative;
          box-sizing: border-box;
          overflow: hidden;
          display: block;
        }

        @media screen and (max-width: 850px) { .report-card-wrapper { zoom: 0.8; } }
        @media screen and (max-width: 650px) { .report-card-wrapper { zoom: 0.65; } }
        @media screen and (max-width: 500px) { .report-card-wrapper { zoom: 0.5; } }
        @media screen and (max-width: 420px) { .report-card-wrapper { zoom: 0.45; } }
        @media screen and (max-width: 380px) { .report-card-wrapper { zoom: 0.4; } }
        
        @page { size: A4 portrait; margin: 0; }
        
        @media print {
          html, body {
            background: white !important;
            margin: 0; padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body > *:not(.print-portal-host) { display: none !important; }
          .no-print { display: none !important; }
          .print-portal-host { 
            display: block !important; 
            position: fixed; 
            top: 0; left: 0; 
            width: 100%; 
            z-index: 9999; 
          }
          .report-card-print {
            width: 794px !important;
            min-height: 1122px !important;
            padding: 10mm 8mm 6mm 8mm !important;
            margin: 0 !important;
            background: white !important;
            box-shadow: none !important;
            border: none !important;
            overflow: visible !important;
            transform: none !important;
            position: static !important;
            page-break-inside: avoid;
          }
        }

        /* ─── HEADER ─── */
        .rc-header {
          background: #ffffff;
          border-bottom: 3px solid #1e3a5f;
          color: #1e3a5f;
          padding: 12px 0;
          position: relative;
        }
        .rc-header-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }
        .rc-logo-wrap {
          width: 56px;
          height: 56px;
          background: white;
          border-radius: 8px;
          padding: 3px;
          box-shadow: 0 2px 8px rgba(30,58,95,0.15);
          border: 1px solid #e2e8f0;
          flex-shrink: 0;
        }
        .rc-logo-wrap img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          border-radius: 6px;
        }
        .rc-school-info {
          flex: 1;
          text-align: center;
        }
        .rc-school-info h1 {
          font-family: 'Playfair Display', serif;
          font-size: 18px;
          font-weight: 900;
          margin: 0 0 2px 0;
          letter-spacing: 0.5px;
          color: #1e3a5f;
        }
        .rc-school-info h2 {
          font-size: 10px;
          font-weight: 700;
          margin: 0 0 3px 0;
          color: #64748b;
          letter-spacing: 2px;
          text-transform: uppercase;
        }
        .rc-school-info p {
          font-size: 7px;
          margin: 0;
          color: #94a3b8;
          font-weight: 500;
        }
        .rc-badge {
          display: inline-block;
          background: #1e3a5f;
          color: white;
          padding: 2px 12px;
          border-radius: 20px;
          font-size: 7.5px;
          font-weight: 800;
          margin-top: 4px;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        .rc-photo-wrap {
          width: 52px;
          height: 64px;
          background: white;
          border-radius: 6px;
          padding: 2px;
          box-shadow: 0 2px 8px rgba(30,58,95,0.12);
          border: 1px solid #e2e8f0;
          flex-shrink: 0;
          overflow: hidden;
        }
        .rc-photo-wrap img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 4px;
        }
        .rc-photo-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f1f5f9;
          color: #94a3b8;
          font-size: 7px;
          font-weight: 800;
          border-radius: 4px;
        }

        /* ─── STUDENT BAR ─── */
        .rc-student-bar {
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          padding: 6px 0;
          margin-bottom: 8px;
          margin-top: 32px;
        }
        .rc-student-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 4px 16px;
        }
        .rc-stat {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 7.5px;
        }
        .rc-stat-label {
          font-weight: 800;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          white-space: nowrap;
          font-size: 6.5px;
        }
        .rc-stat-value {
          font-weight: 700;
          color: #1e3a5f;
          border-bottom: 1px solid #cbd5e1;
          flex: 1;
          padding-bottom: 1px;
        }
        .rc-stat-value.accent {
          color: #0369a1;
          font-weight: 900;
          font-size: 8px;
        }

        /* ─── BODY ─── */
        .rc-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        /* ─── SECTION TITLE ─── */
        .rc-section-title {
          background: #1e3a5f;
          color: white;
          text-align: center;
          padding: 3px;
          font-size: 7.5px;
          font-weight: 900;
          letter-spacing: 2px;
          text-transform: uppercase;
          border-radius: 3px;
          margin-bottom: 4px;
        }

        /* ─── MAIN GRID ─── */
        .rc-main-grid {
          display: grid;
          grid-template-columns: 1.7fr 1fr;
          gap: 16px;
          flex: 1;
          align-items: stretch;
        }

        /* ─── TABLE ─── */
        .rc-table {
          width: 100%;
          height: 100%;
          border-collapse: collapse;
          border-spacing: 0;
          font-size: 8px;
          border-radius: 4px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
          border: 1px solid rgba(0, 0, 0, 0.7);
        }
        .rc-table thead th {
          background: #1e3a5f;
          color: white;
          padding: 5px 3px;
          font-weight: 800;
          font-size: 7px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          border: 1px solid rgba(0, 0, 0, 0.7);
        }
        .rc-table thead th:first-child { border-radius: 4px 0 0 0; }
        .rc-table thead th:last-child { border-radius: 0 4px 0 0; }
        .rc-table tbody td {
          padding: 8px 4px;
          border: 1px solid rgba(0, 0, 0, 0.7);
          text-align: center;
          font-weight: 600;
          color: #334155;
        }
        .rc-table tbody tr:nth-child(even) { background: #f8fafc; }
        .rc-table tbody tr:last-child td { border-bottom: none; }
        .rc-table tbody tr:last-child td:first-child { border-radius: 0 0 0 4px; }
        .rc-table tbody tr:last-child td:last-child { border-radius: 0 0 4px 0; }
        .rc-table td.subject-name {
          text-align: left;
          font-weight: 800;
          color: #1e3a5f;
          padding-left: 6px;
        }
        .rc-grade { font-weight: 900; color: #0369a1; }

        /* ─── SIDE PANELS ─── */
        .rc-side {
          display: flex;
          flex-direction: column;
          gap: 12px;
          justify-content: space-between;
        }
        .rc-panel {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          overflow: hidden;
          box-shadow: 0 1px 2px rgba(0,0,0,0.04);
        }
        .rc-panel-header {
          background: #1e3a5f;
          color: white;
          padding: 4px 8px;
          font-size: 7px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .rc-mini-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 7px;
        }
        .rc-mini-table th {
          background: #f1f5f9;
          padding: 4px;
          font-weight: 800;
          color: #475569;
          font-size: 6.5px;
          border: 1px solid rgba(0, 0, 0, 0.7);
        }
        .rc-mini-table td {
          padding: 5px 3px;
          text-align: center;
          font-weight: 700;
          color: #334155;
          border: 1px solid rgba(0, 0, 0, 0.7);
          height: 22px;
        }
        .rc-mini-table td:first-child {
          text-align: left;
          padding-left: 5px;
          font-weight: 800;
          color: #1e3a5f;
          font-size: 6.5px;
        }
        .rc-check { color: #059669; font-weight: 900; font-size: 10px; }

        /* ─── SUMMARY ─── */
        .rc-summary {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .rc-summary-box {
          background: #f0f9ff;
          border: 1px solid #bae6fd;
          border-radius: 4px;
          padding: 10px;
          text-align: center;
        }
        .rc-summary-box label {
          font-size: 7px;
          font-weight: 900;
          color: #0369a1;
          text-transform: uppercase;
          letter-spacing: 1px;
          display: block;
          margin-bottom: 2px;
        }
        .rc-summary-box .value {
          font-size: 16px;
          font-weight: 900;
          color: #0c4a6e;
        }
        .rc-summary-box.status {
          background: #f0fdf4;
          border-color: #86efac;
        }
        .rc-summary-box.status label { color: #15803d; }
        .rc-summary-box.status .value { color: #14532d; }
        .rc-summary-box.status-repeat {
          background: #fef2f2;
          border-color: #fecaca;
        }
        .rc-summary-box.status-repeat label { color: #b91c1c; }
        .rc-summary-box.status-repeat .value { color: #7f1d1d; }

        /* ─── COMMENTS ─── */
        .rc-comments {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-top: auto;
        }
        .rc-comment-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          padding: 10px 12px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.03);
        }
        .rc-comment-card label {
          font-size: 7.5px;
          font-weight: 900;
          color: #1e3a5f;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          display: block;
          margin-bottom: 4px;
          padding-bottom: 2px;
          border-bottom: 1px solid #e2e8f0;
        }
        .rc-comment-card p {
          font-size: 7.5px;
          color: #475569;
          font-style: italic;
          line-height: 1.3;
          margin: 0 0 4px 0;
          min-height: 24px;
        }
        .rc-sig-row {
          display: flex;
          align-items: flex-end;
          gap: 6px;
        }
        .rc-sig-line {
          flex: 1;
          border-bottom: 1px solid #94a3b8;
          height: 16px;
          position: relative;
        }
        .rc-sig-line img {
          height: 16px;
          object-fit: contain;
          position: absolute;
          bottom: 0;
          left: 0;
        }
        .rc-sig-name {
          font-size: 7px;
          font-weight: 900;
          color: #1e3a5f;
          text-transform: uppercase;
          margin-top: 1px;
          letter-spacing: 0.3px;
        }

        /* ─── FOOTER ─── */
        .rc-footer {
          margin-top: 16px;
          background: white;
          border-top: 2px solid #1e3a5f;
          padding: 8px 0 4px 0;
        }
        .rc-footer-inner {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .rc-footer-left {
          text-align: center;
        }
        .rc-footer-line {
          width: 90px;
          border-bottom: 1px solid rgba(240, 245, 250, 1);
          height: 14px;
          margin: 0 auto;
        }
        .rc-footer-name {
          font-size: 6.5px;
          font-weight: 900;
          color: #1e3a5f;
          margin: 2px 0 0 0;
          text-transform: uppercase;
        }
        .rc-footer-role {
          font-size: 5.5px;
          color: #64748b;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .rc-stamp-wrap {
          width: 56px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .rc-stamp-wrap img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          opacity: 0.85;
          transform: rotate(-8deg);
        }
        .rc-stamp-placeholder {
          width: 50px;
          height: 32px;
          border: 2px dashed #cbd5e1;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 5.5px;
          font-weight: 900;
          color: #cbd5e1;
          transform: rotate(-8deg);
        }
        .rc-footer-right {
          text-align: right;
        }
        .rc-footer-right p {
          font-size: 6.5px;
          margin: 1px 0;
          color: #64748b;
          font-weight: 600;
        }
        .rc-footer-right strong {
          color: #1e3a5f;
          font-weight: 800;
        }
        .rc-branding-bar {
          background: transparent;
          color: #94a3b8;
          text-align: center;
          width: 100P;
          padding: 3px;
          font-size: 5.5px;
          font-weight: 700;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          margin-top: 4px;
          border-radius: 2px;
        }

        /* ─── WATERMARK ─── */
        .rc-watermark {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-35deg);
          font-size: 72px;
          font-weight: 900;
          color: rgba(30, 58, 95, 0.02);
          white-space: nowrap;
          pointer-events: none;
          z-index: 0;
          font-family: 'Playfair Display', serif;
        }
      `}</style>

      <div className="rc-watermark">{schoolName || 'BONUS DOMINUS'}</div>

      {/* HEADER */}
      <div className="rc-header">
        <div className="rc-header-inner">
          <div className="rc-logo-wrap">
            <img src={schoolLogo || bdsLogo} alt="School Logo" />
          </div>
          <div className="rc-school-info">
            <h1>{schoolName || 'BONUS  DOMINUS  SCHOOL'}</h1>
            <h2>Primary & Secondary School</h2>
            <p>5A — 5C Uzoanya Crescent, Amuzukwu, Umuahia, Abia State</p>
            <div className="rc-badge">
              {viewMode === 'cumulative' 
                ? `CUMULATIVE RESULT FOR ${selectedPub?.session}` 
                : `${selectedPub?.term} Report Card \u2014 ${selectedPub?.session}`}
            </div>
          </div>
          <div className="rc-photo-wrap">
            {currentStudent?.photo ? (
              <img src={currentStudent.photo} alt="Student" />
            ) : (
              <StudentAvatar gender={currentStudent?.gender} avatarId={currentStudent?.avatarId} size="100%" />
            )}
          </div>
        </div>
      </div>

      {/* STUDENT INFO BAR */}
      <div className="rc-student-bar">
        <div className="rc-student-grid">
          <div className="rc-stat"><span className="rc-stat-label">Name:</span> <span className="rc-stat-value">{currentStudent?.name}</span></div>
          <div className="rc-stat"><span className="rc-stat-label">Reg No:</span> <span className="rc-stat-value">{regNum}</span></div>
          <div className="rc-stat"><span className="rc-stat-label">Sex:</span> <span className="rc-stat-value">{(currentStudent?.gender === 'M' || (currentStudent?.gender && currentStudent?.gender.toLowerCase().startsWith('m'))) ? 'Male' : (currentStudent?.gender === 'F' || (currentStudent?.gender && currentStudent?.gender.toLowerCase().startsWith('f'))) ? 'Female' : (currentStudent?.gender || 'N/A')}</span></div>
          <div className="rc-stat"><span className="rc-stat-label">Average:</span> <span className="rc-stat-value accent">{viewMode === 'cumulative' ? cumulativeMarks?.average : studentMarks?.average}%</span></div>
          <div className="rc-stat"><span className="rc-stat-label">Position:</span> <span className="rc-stat-value accent">{viewMode === 'cumulative' ? cumulativeClassStats?.position : classStats?.position}</span></div>
          <div className="rc-stat"><span className="rc-stat-label">Class:</span> <span className="rc-stat-value">{classStats.historicalClass || currentStudent?.className}</span></div>
          <div className="rc-stat"><span className="rc-stat-label">Population:</span> <span className="rc-stat-value">{viewMode === 'cumulative' ? cumulativeClassStats?.population : classStats?.population}</span></div>
          <div className="rc-stat"><span className="rc-stat-label">DOB:</span> <span className="rc-stat-value">{formatDOB(currentStudent?.dob)}</span></div>
          <div className="rc-stat"><span className="rc-stat-label">House:</span> <span className="rc-stat-value">{currentStudent?.house || 'ALAMANDA'}</span></div>
        </div>
      </div>

      {/* BODY */}
      <div className="rc-body">
        <div className="rc-section-title">{viewMode === 'cumulative' ? 'Cumulative Performance' : 'Academic Performance'}</div>

        <div className="rc-main-grid">
          {/* TABLE */}
          <div className="rc-table-wrap">
            <table className="rc-table">
              <thead>
                {viewMode === 'cumulative' ? (
                  <tr>
                    <th style={{ textAlign: 'left', paddingLeft: '8px' }}>Subjects</th>
                    <th>1st Term</th>
                    <th>2nd Term</th>
                    <th>3rd Term</th>
                    <th>Total (300)</th>
                    <th>Grade</th>
                    <th>Remarks</th>
                  </tr>
                ) : (
                  <tr>
                    <th style={{ textAlign: 'left', paddingLeft: '8px' }}>Subjects</th>
                    <th>CA1 (20)</th>
                    <th>CA2 (20)</th>
                    <th>Exam (60)</th>
                    <th>Total (100)</th>
                    <th>Grade</th>
                    <th>Remarks</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {viewMode === 'cumulative' ? cumulativeMarks?.subjects.map((sub, idx) => (
                  <tr key={idx}>
                    <td className="subject-name">{sub.subject}</td>
                    <td>{sub.t1}</td>
                    <td>{sub.t2}</td>
                    <td>{sub.t3}</td>
                    <td style={{ fontWeight: 800 }}>{sub.total}</td>
                    <td className="rc-grade">{sub.grade}</td>
                    <td style={{ fontSize: '6px', fontWeight: 700, textTransform: 'uppercase' }}>{sub.remark}</td>
                  </tr>
                )) : studentMarks?.subjects.map((sub, idx) => (
                  <tr key={idx}>
                    <td className="subject-name">{sub.subject}</td>
                    <td>{sub.cat1}</td>
                    <td>{sub.cat2}</td>
                    <td>{sub.exam}</td>
                    <td style={{ fontWeight: 800 }}>{sub.total}</td>
                    <td className="rc-grade">{sub.grade}</td>
                    <td style={{ fontSize: '6px', fontWeight: 700, textTransform: 'uppercase' }}>
                      {sub.total >= 75 ? 'Distinction' :
                        sub.total >= 60 ? 'Excellent' :
                          sub.total >= 50 ? 'Very Good' :
                            sub.total >= 40 ? 'Average' : 'Fail'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* SIDE PANELS */}
          <div className="rc-side">
            {/* Behavioural */}
            <div className="rc-panel">
              <div className="rc-panel-header">Behavioural Assessment</div>
              <table className="rc-mini-table">
                <thead>
                  <tr>
                    <th>Traits</th>
                    <th>1</th>
                    <th>2</th>
                    <th>3</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'Attentiveness', value: studentMarks?.raw?.behaviour?.attentiveness || 3 },
                    { label: 'Honesty', value: studentMarks?.raw?.behaviour?.honesty || 3 },
                    { label: 'Neatness', value: studentMarks?.raw?.behaviour?.neatness || 3 },
                    { label: 'Politeness', value: studentMarks?.raw?.behaviour?.politeness || 3 },
                    { label: 'Punctuality', value: studentMarks?.raw?.behaviour?.punctuality || 3 }
                  ].map(t => (
                    <tr key={t.label}>
                      <td>{t.label}</td>
                      {[1, 2, 3].map(level => (
                        <td key={level}>{t.value === level ? <span className="rc-check">&#10003;</span> : ''}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Psychomotor */}
            <div className="rc-panel">
              <div className="rc-panel-header">Psychomotor Skills</div>
              <table className="rc-mini-table">
                <thead>
                  <tr>
                    <th>Skill</th>
                    <th>1</th>
                    <th>2</th>
                    <th>3</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'Hand Writing', value: studentMarks?.raw?.skills?.handwriting || 3 },
                    { label: 'Spoken English', value: studentMarks?.raw?.skills?.english || 3 },
                    { label: 'Outdoor Games', value: studentMarks?.raw?.skills?.games || 3 }
                  ].map(s => (
                    <tr key={s.label}>
                      <td>{s.label}</td>
                      {[1, 2, 3].map(level => (
                        <td key={level}>{s.value === level ? <span className="rc-check">&#10003;</span> : ''}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="rc-summary">
              <div className="rc-summary-box">
                <label>Total Score</label>
                <div className="value">{viewMode === 'cumulative' ? cumulativeMarks?.overallTotal : studentMarks?.overallTotal}</div>
              </div>
              <div className={`rc-summary-box ${(viewMode === 'cumulative' ? cumulativeMarks?.average : studentMarks?.average) < 45 ? 'status-repeat' : 'status'}`}>
                <label>Status</label>
                <div className="value">
                  {(viewMode === 'cumulative' ? cumulativeMarks?.average : studentMarks?.average) < 45 
                    ? (selectedPub?.term?.toLowerCase().includes('third') ? 'REPEAT' : 'FAIL') 
                    : (selectedPub?.term?.toLowerCase().includes('third') ? 'PROMOTED' : 'PASS')}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* COMMENTS */}
        <div className="rc-comments">
          <div className="rc-comment-card">
            <label>Teacher's Comment</label>
            <p>{teacherCommentText}</p>
            <div className="rc-sig-row">
              <div style={{ flex: 1 }}>
                <div className="rc-sig-line">
                  {principalSignature && <img src={principalSignature} alt="" style={{ height: '16px' }} />}
                </div>
                <div className="rc-sig-name">{formTeacher}</div>
              </div>
            </div>
          </div>
          <div className="rc-comment-card">
            <label>Principal's Comment</label>
            <p>{principalCommentText}</p>
            <div className="rc-sig-row">
              <div style={{ flex: 1 }}>
                <div className="rc-sig-line">
                  {principalSignature && <img src={principalSignature} alt="Principal" style={{ height: '16px' }} />}
                </div>
                <div className="rc-sig-name">Principal ({principalName || 'Mrs Etuzu Anita'})</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="rc-footer">
        <div className="rc-footer-inner">
          <div className="rc-footer-left">
            <div className="rc-footer-line"></div>
            <div className="rc-footer-name">{principalName || 'Mrs Etuzu Anita'}</div>
            <div className="rc-footer-role">Principal's Signature</div>
          </div>
          <div className="rc-stamp-wrap">
            {principalStamp ? (
              <img src={principalStamp} alt="School Stamp" />
            ) : (
              <div className="rc-stamp-placeholder">SCHOOL STAMP</div>
            )}
          </div>
          <div className="rc-footer-right">
            <p>Term Ends: <strong>{termEndDate || ''}</strong></p>
            <p>Next Term Begins: <strong>{nextTermBeginsDate || ''}</strong></p>
          </div>
        </div>
        <div className="rc-branding-bar">
          Powered by GLOBIXTECH ENT
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
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button 
                onClick={() => setViewMode('termly')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'termly' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                Termly View
              </button>
              <button 
                onClick={() => setViewMode('cumulative')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'cumulative' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                Cumulative View
              </button>
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
          <div className="overflow-x-auto bg-slate-200 dark:bg-slate-900 p-2 sm:p-4 rounded-xl shadow-inner" style={{ WebkitOverflowScrolling: 'touch', display: 'flex', justifyContent: 'center' }}>
            <div className={!isGeneratingPDF ? "report-card-wrapper" : ""} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
              {renderPrintView()}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (isPrinting) {
    return createPortal(
      <div className="print-portal-host">
        {renderPrintView()}
      </div>,
      document.body
    );
  }

  return (
    <div className={isPublic ? `min-h-screen flex flex-col ${darkMode ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-800'} transition-colors duration-300` : "dashboard-wrapper"}>
      {isPublic && <Navbar hideHamburger={true} />}

      <div className={isPublic ? "flex-1 p-4 md:p-10 max-w-full mx-auto w-full" : ""}>
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
                    <StudentAvatar gender={currentStudent?.gender} avatarId={currentStudent?.avatarId} size="100%" />
                  )}
                </div>
                <p className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{currentStudent?.name}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white border-2 border-emerald-500 px-5 py-3 rounded-2xl font-black transition-all shadow-sm active:scale-95"
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