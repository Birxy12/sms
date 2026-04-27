import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useStudentAuth } from '../../context/StudentAuthContext';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { useTheme } from '../../context/ThemeContext';
import { Award, AlertCircle, Printer, Download, ChevronLeft, User } from 'lucide-react';
import bdsLogo from '../../assets/bdslogo.jpg';
import resultStamp from '../../assets/stamp.jpeg';

const StudentResults = () => {
  const { currentStudent: loggedInStudent } = useStudentAuth();
  const { schoolName, schoolLogo, primaryColor, principalSignature, principalStamp } = useTheme();
  const printRef = useRef();
  
  const [publishedTerms, setPublishedTerms] = useState([]);
  const [selectedTermId, setSelectedTermId] = useState('');
  const [studentMarks, setStudentMarks] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const [classStats, setClassStats] = useState({ position: 'N/A', population: 0 });

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const adminRegNo = searchParams.get('regNo');

  const [adminFetchedStudent, setAdminFetchedStudent] = useState(null);
  const currentStudent = adminFetchedStudent || loggedInStudent;

  useEffect(() => {
    if (adminRegNo) {
      const fetchAdminStudent = async () => {
        const q = query(collection(db, 'students'), where('regNo', '==', adminRegNo));
        const snap = await getDocs(q);
        if (!snap.empty) {
          setAdminFetchedStudent(snap.docs[0].data());
        }
      };
      fetchAdminStudent();
    }
  }, [adminRegNo]);

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
          setSelectedTermId(terms[0].id);
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
      
      setLoading(true);
      try {
        const selectedPub = publishedTerms.find(p => p.id === selectedTermId);
        if (!selectedPub) return;
        
        // ── 1. Fetch ALL marks for this student by regNo only (no composite index needed)
        const marksQuery = query(
          collection(db, 'marks'),
          where('regNo', '==', regNum)
        );
        const marksSnap = await getDocs(marksQuery);

        // Normalise term string for comparison (e.g. 'Second Term' === 'secondterm')
        const normTerm = (t = '') => t.toLowerCase().replace(/\s+/g, '');
        
        let foundMarksDoc = null;
        marksSnap.forEach(docSnap => {
          const d = docSnap.data();
          const sessionMatch = d.session === selectedPub.session;
          const termMatch =
            normTerm(d.term) === normTerm(selectedPub.term) ||
            selectedPub.term.toLowerCase().includes((d.term || '').toLowerCase());
          if (sessionMatch && termMatch) {
            foundMarksDoc = d;
          }
        });

        // ── 2. Compute class standing: fetch all marks for class/session (single field index)
        const allMarksQuery = query(
          collection(db, 'marks'),
          where('className', '==', studentClass)
        );
        const allMarksSnap = await getDocs(allMarksQuery);
        
        const studentTotals = {};
        allMarksSnap.forEach(docSnap => {
          const d = docSnap.data();
          const sessionMatch = d.session === selectedPub.session;
          const termMatch =
            normTerm(d.term) === normTerm(selectedPub.term) ||
            selectedPub.term.toLowerCase().includes((d.term || '').toLowerCase());
          if (sessionMatch && termMatch) {
            const reg = d.regNo;
            const marksData = d.marks || d.subjects || {};
            let sum = 0;
            Object.values(marksData).forEach(m => { sum += parseFloat(m.total || 0); });
            studentTotals[reg] = (studentTotals[reg] || 0) + sum;
          }
        });

        const sortedStudents = Object.entries(studentTotals)
          .sort((a, b) => b[1] - a[1])
          .map(entry => entry[0]);
        
        // Position: use stored value if present, else calculate
        let posStr = foundMarksDoc?.position || '';
        if (!posStr || posStr === '0' || posStr === 'N/A') {
          const pos = sortedStudents.indexOf(regNum) + 1;
          const suffixes = ["th", "st", "nd", "rd"];
          const v = pos % 100;
          posStr = pos > 0 ? pos + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]) : 'N/A';
        }
        
        // ── 3. Class population
        const classPopQuery = query(collection(db, 'students'), where('className', '==', studentClass));
        const classPopSnap = await getDocs(classPopQuery);
        
        setClassStats({
          position: posStr,
          population: foundMarksDoc?.classPopulation || classPopSnap.size
        });

        // ── 4. Build subject list for this class
        const subjectsQuery = query(collection(db, 'subjects'), where('class', '==', studentClass));
        const subjectsSnap = await getDocs(subjectsQuery);
        const classSubjects = subjectsSnap.docs.map(d => d.data().name);

        const rawMarks = foundMarksDoc?.marks || foundMarksDoc?.subjects || {};
        const subjectList = classSubjects.length > 0 ? classSubjects : Object.keys(rawMarks);

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
          const sm = rawMarks[dbKey] || {};
          const cat1 = parseFloat(sm.cat1 || sm.ca1 || 0);
          const cat2 = parseFloat(sm.cat2 || sm.ca2 || 0);
          const exam = parseFloat(sm.exam || 0);
          const total = parseFloat(sm.total || (cat1 + cat2 + exam));
          
          if (total > 0) {
            totalScore += total;
            subjectCount++;
          }
          
          let grade = sm.grade;
          if (!grade && total > 0) {
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
            grade: grade || (total > 0 ? 'F9' : '-')
          };
        });

        // Only show subjects that have been offered (total > 0)
        const displaySubjects = processedMarks.filter(s => s.total > 0);

        // Calculate average based on school policy: SS2/3 (9 subjects), SS1 & JSS (16 subjects)
        const className = (currentStudent?.className || '').toUpperCase();
        let divisor = 16; // default for SS1 and JSS
        
        if (className.includes('SS2') || className.includes('SS3')) {
          divisor = 9;
        } else if (className.includes('JSS') || className.includes('SS1')) {
          divisor = 16;
        }

        setStudentMarks({
          subjects: displaySubjects.sort((a, b) => a.subject.localeCompare(b.subject)),
          overallTotal: totalScore,
          average: foundMarksDoc?.average || (totalScore / divisor).toFixed(1),
          raw: foundMarksDoc
        });

      } catch (error) {
        console.error('Error fetching marks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [selectedTermId, publishedTerms, regNum, currentStudent]);


  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 1000);
  };

  const handleDownloadPDF = async () => {
    setIsPrinting(true);
    // Give time for the print view to render
    setTimeout(async () => {
      try {
        const element = printRef.current;
        if (!element) {
           setIsPrinting(false);
           return;
        }

        // Dynamic import to handle potential install lag
        const html2pdf = (await import('html2pdf.js')).default;
        
        const opt = {
          margin: 0,
          filename: `${currentStudent?.name || 'Student'}-Result-${selectedPub?.term || ''}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 3, useCORS: true, logging: false, letterRendering: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        
        await html2pdf().set(opt).from(element).save();
      } catch (err) {
        console.error("PDF Download failed, falling back to print:", err);
        window.print();
      } finally {
        setIsPrinting(false);
      }
    }, 1000);
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
        @media print {
          @page { size: A4; margin: 0; }
          body { background: white !important; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body > * { visibility: hidden !important; }
          .report-card-print, .report-card-print * { visibility: visible !important; }
          .report-card-print { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 210mm; 
            min-height: 297mm;
            padding: 10mm 15mm;
            background: white !important;
          }
        }
        .report-card-print {
          width: 210mm;
          min-height: 297mm;
          padding: 10mm 15mm;
          margin: 0 auto;
          background: white;
          color: #0f172a;
          font-family: 'Outfit', 'Inter', sans-serif;
          position: relative;
          box-sizing: border-box;
          overflow: hidden;
        }
        .print-branding-top { font-size: 8px; text-transform: uppercase; font-weight: 800; color: #94a3b8; margin-bottom: 5px; display: flex; justify-content: space-between; }
        .print-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px double #0f172a; padding-bottom: 8px; margin-bottom: 15px; }
        .print-logo { width: 75px; height: 75px; object-fit: contain; }
        .print-school-info { text-align: center; flex: 1; }
        .print-school-info h1 { font-size: 18px; font-weight: 900; margin: 0; line-height: 1.2; color: #1e293b; }
        .print-school-info h2 { font-size: 14px; font-weight: 700; margin: 0; color: #475569; }
        .print-school-info p { font-size: 9px; margin: 3px 0; font-weight: 600; color: #64748b; }
        .print-term-badge { display: inline-block; background: #1e293b; color: white; padding: 3px 15px; border-radius: 20px; font-size: 10px; font-weight: 900; margin-top: 5px; text-transform: uppercase; letter-spacing: 1px; }
        .student-photo-frame { width: 75px; height: 85px; border: 1px solid #e2e8f0; background: #f8fafc; display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .student-photo-frame img { width: 100%; height: 100%; object-fit: cover; }
        .photo-placeholder { font-size: 8px; font-weight: 900; color: #cbd5e1; }
        .print-stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 15px; border: 1px solid #0f172a; padding: 8px; background: #f8fafc; }
        .stat-item { font-size: 10px; display: flex; align-items: center; }
        .stat-item label { font-weight: 800; color: #475569; width: 85px; font-size: 9px; }
        .stat-item span { font-weight: 700; color: #0f172a; flex: 1; border-bottom: 1px dashed #cbd5e1; padding-bottom: 1px; }
        .stat-item .highlight { color: #2563eb; font-weight: 900; }
        .academic-performance-title { background: #f1f5f9; color: #0f172a; text-align: center; font-weight: 900; padding: 4px; font-size: 11px; letter-spacing: 3px; margin-bottom: 8px; border: 1px solid #0f172a; text-transform: uppercase; }
        .print-main-content { display: flex; gap: 15px; margin-bottom: 15px; }
        .print-table-wrapper { flex: 2.8; }
        .print-table { width: 100%; border-collapse: collapse; font-size: 9px; }
        .print-table th { background: #1e293b; color: white; padding: 5px; border: 1px solid #0f172a; font-weight: 900; text-transform: uppercase; font-size: 8px; }
        .print-table td { padding: 4px; border: 1px solid #0f172a; text-align: center; font-weight: 700; }
        .print-table td.subject-name { text-align: left; font-weight: 900; padding-left: 8px; background: #f8fafc; }
        .print-side-panels { flex: 1; display: flex; flex-direction: column; gap: 10px; }
        .mini-table { width: 100%; border-collapse: collapse; font-size: 8px; }
        .mini-table th { background: #e2e8f0; border: 1px solid #0f172a; padding: 3px; font-weight: 900; }
        .mini-table td { border: 1px solid #0f172a; padding: 3px; text-align: center; font-weight: 700; }
        .mini-table td:first-child { text-align: left; font-weight: 800; background: #f8fafc; font-size: 7px; }
        .section-title { font-size: 9px; font-weight: 900; margin-bottom: 3px; padding: 2px 5px; background: #0f172a; color: white; text-transform: uppercase; }
        .summary-box { border: 1px solid #0f172a; padding: 5px; text-align: center; background: #f8fafc; margin-bottom: 4px; }
        .summary-box label { font-size: 7px; font-weight: 900; color: #475569; display: block; text-transform: uppercase; }
        .summary-box .value { font-size: 12px; font-weight: 900; }
        .status-pass { color: #059669; }
        .commentary-section { border: 1px solid #0f172a; padding: 8px; margin-bottom: 15px; background: #fdfdfd; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .comment-box { margin-bottom: 8px; }
        .comment-box:last-child { margin-bottom: 0; }
        .comment-box label { font-size: 9px; font-weight: 900; text-decoration: underline; color: #1e293b; }
        .comment-box p { font-size: 9px; margin: 2px 0; font-style: italic; color: #334155; line-height: 1.3; min-height: 40px; }
        .print-footer { margin-top: auto; border-top: 1px solid #0f172a; padding-top: 10px; }
        .footer-cols { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .footer-sign { text-align: center; width: 180px; }
        .sign-line { border-bottom: 1px dashed #0f172a; margin-bottom: 3px; height: 25px; }
        .footer-sign p { font-size: 8px; font-weight: 900; margin: 0; text-transform: uppercase; }
        .stamp-box { width: 140px; height: 70px; border: 2px dashed #cbd5e1; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 7px; font-weight: 900; color: #cbd5e1; text-transform: uppercase; transform: rotate(-10deg); }
        .footer-dates { text-align: right; }
        .footer-dates p { font-size: 8px; margin: 3px 0; font-weight: 600; color: #475569; }
        .footer-dates strong { color: #0f172a; font-weight: 800; }
        .print-final-branding { text-align: center; font-size: 9px; font-weight: 900; color: #1e293b; text-transform: uppercase; letter-spacing: 1px; margin-top: 5px; border-top: 1px solid #e2e8f0; padding-top: 5px; }
        .print-watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 100px; font-weight: 900; color: rgba(15, 23, 42, 0.03); white-space: nowrap; pointer-events: none; z-index: -1; }
      `}</style>
      <div className="print-branding-top">Prepared by GLOBIXTECH ENT {new Date().toLocaleDateString()}</div>
      <div className="print-header">
        <div className="print-logo-box">
           <img src={schoolLogo || bdsLogo} alt="Logo" className="print-logo" />
        </div>
        <div className="print-school-info">
          <h1>{schoolName || 'BONUS DOMINUS NURSERY, PRIMARY'}</h1>
          <h2>& SECONDARY SCHOOL</h2>
          <p>5A - 5C UZOANYA CRESCENT, AMUZUKWU, UMUAHIA, ABIA STATE</p>
          <div className="print-term-badge">{selectedPub?.term} Report Sheet for {selectedPub?.session}</div>
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
                     sub.total >= 40 ? 'Average' : 'Fail'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="print-side-panels">
           <div className="behaviour-section">
              <div className="section-title">BEHAVIOUR</div>
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
              <div className="section-title">SKILLS</div>
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
                <label>RESULT STATUS</label>
                <div className="value status-pass">PASSED</div>
              </div>
           </div>
        </div>
      </div>
      <div className="commentary-section" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div className="comment-box">
          <label>TEACHER'S COMMENT:</label>
          <p style={{ minHeight: '40px' }}>{studentMarks?.raw?.teacherComment || 'An impressive performance. Keep up the good work.'}</p>
          <div style={{ marginTop: '10px', borderBottom: '1px solid #000', width: '100px' }}></div>
          <span style={{ fontSize: '7px', fontWeight: 'bold' }}>CLASS TEACHER</span>
        </div>
        <div className="comment-box">
          <label>PRINCIPAL'S COMMENT:</label>
          <p style={{ minHeight: '40px' }}>{studentMarks?.raw?.principalComment || 'You came out with flying colours. Congratulations!'}</p>
          <div style={{ marginTop: '10px', borderBottom: '1px solid #000', width: '100px' }}></div>
          <span style={{ fontSize: '7px', fontWeight: 'bold' }}>PRINCIPAL</span>
        </div>
      </div>
      <div className="print-footer">
         <div className="footer-cols">
             <div className="footer-sign">
               <div className="sign-line">
                 {principalSignature && <img src={principalSignature} alt="Principal Signature" style={{ height: '100%', objectFit: 'contain' }} />}
               </div>
               <p>PRINCIPAL'S SIGNATURE</p>
             </div>
             <div className="footer-stamp">
               <div className="stamp-box">
                 {principalStamp ? (
                   <img src={principalStamp} alt="Stamp" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                 ) : (
                   <img src={resultStamp} alt="Stamp" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                 )}
               </div>
             </div>
            <div className="footer-dates">
               <p>Term Ends: <strong>12/12/2025</strong></p>
               <p>Next Term Begins: <strong>12/01/2026</strong></p>
            </div>
         </div>
         <div className="print-final-branding">Powered by GLOBIXTECH ENT - satisfaction is our drive</div>
      </div>
      <div className="print-watermark">{schoolName || 'BONUS DOMINUS'}</div>
    </div>
  );

  const renderScreenView = () => {
    if (publishedTerms.length === 0) {
      return (
        <div className="card-white no-print" style={{ padding: '60px 40px', textAlign: 'center' }}>
          <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center">
            <AlertCircle size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">No Results Found</h3>
          <p className="text-slate-500">Academic results for this session have not been published by the management.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6 no-print">
        <div className="card-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
             <h3 className="text-lg font-bold text-slate-800 m-0">Term Reports</h3>
             <p className="text-xs text-slate-400 font-medium">Select a published session to view your report card.</p>
          </div>
          <select 
            value={selectedTermId} 
            onChange={(e) => setSelectedTermId(e.target.value)}
            className="w-full sm:w-auto px-4 py-3 rounded-xl border-2 border-slate-100 outline-none bg-slate-50 font-black text-slate-700 focus:border-indigo-500 transition-all"
          >
            {publishedTerms.map(pub => (
              <option key={pub.id} value={pub.id}>{pub.examName} ({pub.session})</option>
            ))}
          </select>
        </div>

        {!studentMarks ? (
          <div className="card-white" style={{ padding: '40px', textAlign: 'center' }}>
            <div className="w-16 h-16 mx-auto mb-4 bg-amber-50 text-amber-400 rounded-full flex items-center justify-center">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Scores Not Yet Available</h3>
            <p className="text-slate-500 text-sm">Your subject scores have not been entered for this term yet. Please check back later or contact your class teacher.</p>
          </div>
        ) : (
          <div className="card-white overflow-hidden p-0 shadow-lg border-indigo-100 border-t-4">
            <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center bg-slate-50/50 gap-4">
              <div className="text-center md:text-left">
                <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight">Performance Summary</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedPub?.examName}</p>
              </div>
              <div className="flex gap-4">
                <div className="bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase">Grand Total</p>
                  <p className="text-lg font-black text-indigo-600">{studentMarks.overallTotal}</p>
                </div>
                <div className="bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase">Average</p>
                  <p className="text-lg font-black text-emerald-600">{studentMarks.average}%</p>
                </div>
                <div className="bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase">Position</p>
                  <p className="text-lg font-black text-amber-600">{classStats.position}</p>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[750px]">
                <thead>
                  <tr className="bg-white border-b border-slate-200">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Subject</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">CAT 1 (20)</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">CAT 2 (20)</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Exam (60)</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Total (100)</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {studentMarks.subjects.map((sub, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 text-sm font-black text-slate-800">{sub.subject}</td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-500 text-center">{sub.cat1}</td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-500 text-center">{sub.cat2}</td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-500 text-center">{sub.exam}</td>
                      <td className="px-6 py-4 text-sm font-black text-slate-900 text-center">
                         <div className={`inline-block px-3 py-1 rounded-lg ${sub.total < 40 ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'}`}>
                           {sub.total}
                         </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center justify-center w-10 h-10 rounded-2xl text-sm font-black shadow-sm ${
                          sub.grade.startsWith('A') ? 'bg-emerald-500 text-white shadow-emerald-200' :
                          sub.grade.startsWith('B') ? 'bg-indigo-500 text-white shadow-indigo-200' :
                          sub.grade.startsWith('C') ? 'bg-amber-500 text-white shadow-amber-200' :
                          'bg-rose-500 text-white shadow-rose-200'
                        }`}>
                          {sub.grade}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const selectedPub = publishedTerms.find(p => p.id === selectedTermId);

  return (
    <div className="dashboard-wrapper">
      {isPrinting ? (
        renderPrintView()
      ) : (
        <>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4 no-print">
            <div>
              <h2 style={{ fontWeight: '900', fontSize: '28px', marginBottom: '8px', color: '#1e293b' }}>Academic Report</h2>
              <p style={{ color: '#64748b', fontSize: '14px' }}>Official term results and subject performance summary.</p>
            </div>
            <div className="flex items-center gap-4 md:gap-8">
              <div className="flex flex-col items-end">
                 <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white shadow-xl bg-slate-50 mb-1">
                    {currentStudent?.photo || currentStudent?.photoURL ? (
                      <img src={currentStudent.photo || currentStudent.photoURL} alt="Student" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <User size={24} />
                      </div>
                    )}
                 </div>
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{currentStudent?.name}</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={handlePrint}
                  className="flex items-center gap-2 bg-white border-2 border-slate-200 px-5 py-3 rounded-2xl font-black text-slate-700 hover:bg-slate-50 transition-all shadow-sm active:scale-95"
                >
                  <Printer size={18} /> Print Result
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
      )}
    </div>
  );
};

export default StudentResults;
