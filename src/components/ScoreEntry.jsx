import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, setDoc, writeBatch, orderBy } from 'firebase/firestore';
import { Save, Search, User, BookOpen, AlertCircle, CheckCircle, Loader2, Download, Upload, Trash2, FileText } from 'lucide-react';
import { CLASS_LIST, getSubjectsForClass } from '../utils/subjectConfig';
import { useAdminAuth } from '../context/AdminAuthContext';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { compressMarks, expandMarks, expandStudent, MARKS_KEYS, STUDENT_KEYS } from '../utils/firestoreSchema';
import { useTheme } from '../context/ThemeContext';

const ScoreEntry = () => {
  const { currentAdmin } = useAdminAuth();
  const { currentSession } = useTheme();
  const [selectedClass, setSelectedClass] = useState(() => localStorage.getItem('scoreEntry_class') || '');
  const [selectedSubject, setSelectedSubject] = useState(() => localStorage.getItem('scoreEntry_subject') || '');
  const [selectedSession, setSelectedSession] = useState(() => localStorage.getItem('scoreEntry_session') || currentSession || '2025/2026');
  const [selectedTerm, setSelectedTerm] = useState(() => localStorage.getItem('scoreEntry_term') || 'Second Term');
  const [selectedFile, setSelectedFile] = useState(null);
  const [students, setStudents] = useState([]);
  const [scores, setScores] = useState({});
  const [currentDbMarks, setCurrentDbMarks] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [subjects, setSubjects] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { localStorage.setItem('scoreEntry_class', selectedClass); }, [selectedClass]);
  useEffect(() => { localStorage.setItem('scoreEntry_subject', selectedSubject); }, [selectedSubject]);
  useEffect(() => { localStorage.setItem('scoreEntry_session', selectedSession); }, [selectedSession]);
  useEffect(() => { localStorage.setItem('scoreEntry_term', selectedTerm); }, [selectedTerm]);

  const classes = CLASS_LIST;
  const sessions = ['2024/2025', '2025/2026', '2026/2027'];
  const terms = ['First Term', 'Second Term', 'Third Term'];

  // Fetch subjects from Firestore for the selected class, fallback to config defaults
  const fetchSubjects = async (cls) => {
    if (!cls) { setSubjects([]); return; }
    try {
      let q;
      // If user is a teacher, only show their assigned subjects
      if (currentAdmin?.role === 'teacher') {
        q = query(
          collection(db, 'subjects'), 
          where('class', '==', cls),
          where('teacherId', '==', currentAdmin.id)
        );
      } else {
        q = query(collection(db, 'subjects'), where('class', '==', cls));
      }

      const snap = await getDocs(q);
      if (!snap.empty) {
        const firestoreSubjects = snap.docs.map(d => d.data().name).sort((a, b) => a.localeCompare(b));
        setSubjects(firestoreSubjects);
      } else {
        // Only fallback to config for admins, teachers must be assigned in DB
        if (currentAdmin?.role !== 'teacher') {
          setSubjects(getSubjectsForClass(cls));
        } else {
          setSubjects([]);
        }
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
      if (currentAdmin?.role !== 'teacher') {
        setSubjects(getSubjectsForClass(cls));
      }
    }
  };

  const fetchStudents = async () => {
    if (!selectedClass) return;
    setLoading(true);
    setStatus({ type: '', message: '' });
    try {
      let q = query(collection(db, 'students'), where(STUDENT_KEYS.className, '==', selectedClass));
      let querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        q = query(collection(db, 'students'), where('className', '==', selectedClass));
        querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
          q = query(collection(db, 'students'), where('CLASS', '==', selectedClass));
          querySnapshot = await getDocs(q);
        }
      }
      const studentList = querySnapshot.docs.map(doc => {
        const data = expandStudent(doc.data());
        return {
          id: doc.id,
          ...data
        };
      }).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      
      setStudents(studentList);
      
      // Fetch existing scores for this class/period/subject from Firestore
      let marksQuery = query(
        collection(db, 'marks'),
        where(MARKS_KEYS.className, '==', selectedClass),
        where(MARKS_KEYS.session, '==', selectedSession),
        where(MARKS_KEYS.term, '==', selectedTerm)
      );
      let marksSnap = await getDocs(marksQuery);
      if (marksSnap.empty) {
        marksQuery = query(
          collection(db, 'marks'),
          where('class_name', '==', selectedClass),
          where('session', '==', selectedSession),
          where('term', '==', selectedTerm)
        );
        marksSnap = await getDocs(marksQuery);
        if (marksSnap.empty) {
          marksQuery = query(
            collection(db, 'marks'),
            where('className', '==', selectedClass),
            where('session', '==', selectedSession),
            where('term', '==', selectedTerm)
          );
          marksSnap = await getDocs(marksQuery);
        }
      }
      
      const newScores = {};
      const newDbMarks = {};
      
      marksSnap.forEach(doc => {
        const data = expandMarks(doc.data());
        newDbMarks[data.regNo] = data.marks || {};
        
        // Case-insensitive subject key matching
        const upperSubj = selectedSubject.toUpperCase().trim();
        const mKey = Object.keys(data.marks || {}).find(k => k.toUpperCase().trim() === upperSubj);
        
        const subjectMarks = mKey ? data.marks[mKey] : null;
        if (subjectMarks) {
          newScores[data.regNo] = {
            cat1: subjectMarks.cat1 !== undefined ? String(subjectMarks.cat1) : '0',
            cat2: subjectMarks.cat2 !== undefined ? String(subjectMarks.cat2) : '0',
            exam: subjectMarks.exam !== undefined ? String(subjectMarks.exam) : '0'
          };
        }
      });
      
      // Merge with localized draft cache if it exists
      const cacheKey = `unsaved_${selectedClass}_${selectedSubject}_${selectedSession}_${selectedTerm}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsedCached = JSON.parse(cached);
          if (parsedCached && typeof parsedCached === 'object') {
            Object.assign(newScores, parsedCached);
          }
        } catch (e) {
          console.error("Error parsing cached scores:", e);
        }
      }
      
      setScores(newScores);
      setCurrentDbMarks(newDbMarks);
    } catch (error) {
      console.error('Error fetching students and scores:', error);
      setStatus({ type: 'error', message: 'Failed to load student list and scores.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedClass) {
      fetchStudents();
      fetchSubjects(selectedClass);
    } else {
      setStudents([]);
      setSubjects([]);
    }
  }, [selectedClass, selectedSubject, selectedSession, selectedTerm]);

  const handleClassChange = (e) => {
    setSelectedClass(e.target.value);
    setSelectedSubject('');
  };

  const handleScoreChange = (regNo, field, value) => {
    setScores(prev => {
      const updated = {
        ...prev,
        [regNo]: {
          ...prev[regNo],
          [field]: value
        }
      };
      const cacheKey = `unsaved_${selectedClass}_${selectedSubject}_${selectedSession}_${selectedTerm}`;
      localStorage.setItem(cacheKey, JSON.stringify(updated));
      return updated;
    });
  };

  const handleSave = async () => {
    if (!selectedClass || !selectedSubject || students.length === 0) return;
    
    setSaving(true);
    setStatus({ type: 'info', message: 'Saving scores to Firestore...' });

    try {
      const safeSession = selectedSession.replace('/', '-');
      const safeTerm = selectedTerm.replace(/\s/g, '').toLowerCase();
      const safeClass = selectedClass.replace(/\s/g, '_').toLowerCase();
      
      const batches = [];
      let currentBatch = writeBatch(db);
      let opCount = 0;

      for (const student of students) {
        const studentScores = scores[student.regNo] || {};
        // Skip only if truly nothing was entered (all three fields absent)
        const hasAnyScore = studentScores.cat1 !== undefined || studentScores.cat2 !== undefined || studentScores.exam !== undefined;
        if (!hasAnyScore) continue;

        const cat1 = parseFloat(studentScores.cat1 || 0);
        const cat2 = parseFloat(studentScores.cat2 || 0);
        const exam = parseFloat(studentScores.exam || 0);
        const total = cat1 + cat2 + exam;

        // Include className in doc ID to prevent cross-class collision (e.g. JSS1 vs JSS2 same regNo)
        const sanitizedRegNo = student.regNo.replace(/\//g, '-');
        const id = `${sanitizedRegNo}_${safeClass}_${safeSession}_${safeTerm}`;
        const markRef = doc(collection(db, 'marks'), id);
        
        let grade = 'F9';
        if (total >= 75) grade = 'A';
        else if (total >= 70) grade = 'B1';
        else if (total >= 65) grade = 'B2';
        else if (total >= 60) grade = 'B3';
        else if (total >= 50) grade = 'C4';
        else if (total >= 45) grade = 'C5';
        else if (total >= 40) grade = 'D7';
        else if (total >= 35) grade = 'E8';

        // Fetch existing marks map
        const existingMarks = { ...(currentDbMarks[student.regNo] || {}) };
        
        // Find if there is an existing subject key with a different case, and remove it to avoid duplicates
        const upperSubj = selectedSubject.toUpperCase().trim();
        const existingKey = Object.keys(existingMarks).find(k => k.toUpperCase().trim() === upperSubj);
        if (existingKey) {
          delete existingMarks[existingKey];
        }

        // Merge the current subject's marks into the full marks object
        const updatedMarksObj = {
          ...existingMarks,
          [selectedSubject]: {
            cat1,
            cat2,
            exam,
            total,
            percent: total,
            grade
          }
        };

        // Recalculate average and overallTotal based on class level policy
        const clsUpper = selectedClass.toUpperCase();
        let divisor = 0;
        if (clsUpper.includes('JSS') || clsUpper.includes('SS1') || clsUpper.includes('SS 1')) {
          divisor = 16;
        } else if ((clsUpper.includes('SS2') || clsUpper.includes('SS3') || clsUpper.includes('SS 2') || clsUpper.includes('SS 3')) && 
                   (clsUpper.includes('ART') || clsUpper.includes('SCIENCE'))) {
          divisor = 9;
        }

        let totalScore = 0;
        let activeSubjectsCount = 0;
        Object.keys(updatedMarksObj).forEach(key => {
          if (key !== '_meta' && updatedMarksObj[key] && updatedMarksObj[key].total !== undefined) {
            totalScore += parseFloat(updatedMarksObj[key].total || 0);
            activeSubjectsCount++;
          }
        });

        const finalDivisor = divisor || activeSubjectsCount || 1;
        const average = (totalScore / finalDivisor).toFixed(1);

        updatedMarksObj._meta = {
          average: parseFloat(average),
          overallTotal: totalScore
        };

        // Compress and save (merge: true handles creating/updating seamlessly)
        const firestoreRecord = compressMarks({
          regNo: student.regNo,
          studentName: student.name,
          className: selectedClass,
          session: selectedSession,
          term: selectedTerm,
          marks: updatedMarksObj
        });

        currentBatch.set(markRef, firestoreRecord, { merge: true });
        opCount++;
        
        if (opCount === 450) {
          batches.push(currentBatch.commit());
          currentBatch = writeBatch(db);
          opCount = 0;
        }
        
        // Optimistically update local state cache to avoid double sets or outdated meta
        currentDbMarks[student.regNo] = updatedMarksObj;
      }

      if (opCount > 0) {
        batches.push(currentBatch.commit());
      }

      if (batches.length > 0) {
        await Promise.all(batches);
      }

      setStatus({ type: 'success', message: 'All scores saved successfully!' });
      window.dispatchEvent(new Event('scoresUpdated'));
      fetchStudents();
      const cacheKey = `unsaved_${selectedClass}_${selectedSubject}_${selectedSession}_${selectedTerm}`;
      localStorage.removeItem(cacheKey);
    } catch (error) {
      console.error('Save error:', error);
      setStatus({ type: 'error', message: 'Error saving scores: ' + error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadTemplate = () => {
    if (!selectedClass || !selectedSubject || students.length === 0) {
      alert("Please select a class and subject first.");
      return;
    }

    const templateData = students.map(s => ({
      'REG NO': s.regNo,
      'STUDENT NAME': s.name,
      'CAT 1 (20)': '',
      'CAT 2 (20)': '',
      'EXAM (60)': ''
    }));

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Scores");
    XLSX.writeFile(wb, `${selectedClass}_${selectedSubject}_Template.xlsx`);
  };

  const handleUploadClick = () => {
    document.getElementById('scoreFileUpload').click();
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const processUploadedFile = () => {
    if (!selectedFile) return;

    setUploading(true);
    setStatus({ type: 'info', message: 'Processing entry sheet...' });

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const data = XLSX.utils.sheet_to_json(ws);

        const newScores = { ...scores };
        let matched = 0;
        let unmatched = [];

        data.forEach(row => {
          // Normalize column matching
          const rawRegNo = String(row['REG. No.'] || row['REG NO'] || row['Reg No'] || row['Registration Number'] || row['regNo'] || '').trim();
          const rawName = String(row['Name'] || row['STUDENT NAME'] || row['Student Name'] || row['name'] || '').trim();
          
          let student = null;
          
          // 1. Match by Reg No (High Priority)
          if (rawRegNo) {
            student = students.find(s => 
              s.regNo.toUpperCase().trim() === rawRegNo.toUpperCase() ||
              s.regNo.replace(/\//g, '-').toUpperCase() === rawRegNo.toUpperCase() ||
              s.regNo.replace(/\//g, '').toUpperCase() === rawRegNo.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
            );
          }
          
          // 2. Match by Name if Reg No failed or wasn't provided
          if (!student && rawName) {
            student = students.find(s => s.name.toUpperCase().trim() === rawName.toUpperCase());
          }

          if (student) {
            newScores[student.regNo] = {
              cat1: row['CAT'] || row['CAT 1'] || row['CAT 1 (20)'] || row['CAT1'] || row['cat1'] || '0',
              cat2: row['CAT2'] || row['CAT 2'] || row['CAT 2 (20)'] || row['CAT2'] || row['cat2'] || '0',
              exam: row['EXAM'] || row['EXAM (60)'] || row['EXAM'] || row['exam'] || '0'
            };
            matched++;
          } else {
            unmatched.push(rawName || rawRegNo);
          }
        });

        setScores(newScores);
        const cacheKey = `unsaved_${selectedClass}_${selectedSubject}_${selectedSession}_${selectedTerm}`;
        localStorage.setItem(cacheKey, JSON.stringify(newScores));
        setSelectedFile(null); // Clear file after successful process
        setStatus({ 
          type: unmatched.length === 0 ? 'success' : 'info', 
          message: `Successfully matched ${matched} students. ${unmatched.length > 0 ? `Could not find: ${unmatched.slice(0,3).join(', ')}${unmatched.length > 3 ? '...' : ''}` : ''}` 
        });
      } catch (error) {
        console.error('Upload processing error:', error);
        setStatus({ type: 'error', message: 'Failed to process file. Ensure columns match the template.' });
      } finally {
        setUploading(false);
      }
    };
    reader.readAsBinaryString(selectedFile);
  };

  const handleClearScores = () => {
    if (window.confirm("Are you sure you want to clear all unsaved scores for the current view?")) {
      setScores({});
      const cacheKey = `unsaved_${selectedClass}_${selectedSubject}_${selectedSession}_${selectedTerm}`;
      localStorage.removeItem(cacheKey);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-600" />
            Subject Score Entry
          </h3>
          
          {selectedClass && selectedSubject && students.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={handleDownloadTemplate}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-200 transition-all"
              >
                <Download size={16} />
                Template
              </button>
              <button 
                onClick={handleUploadClick}
                disabled={uploading}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-bold hover:bg-indigo-100 transition-all"
              >
                <Upload size={16} />
                {selectedFile ? 'Change File' : 'Upload Sheet'}
              </button>

              {selectedFile && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-500 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100 flex items-center gap-2">
                    <FileText size={14} className="text-emerald-600" />
                    {selectedFile.name}
                  </span>
                  <button 
                    onClick={processUploadedFile}
                    disabled={uploading}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-all shadow-md shadow-emerald-100"
                  >
                    {uploading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                    Import Scores
                  </button>
                </div>
              )}

              <button 
                onClick={handleClearScores}
                className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-700 rounded-lg text-sm font-bold hover:bg-rose-100 transition-all"
              >
                <Trash2 size={16} />
                Clear All
              </button>
              <input 
                type="file" 
                id="scoreFileUpload" 
                className="hidden" 
                accept=".xlsx, .xls, .csv" 
                onChange={handleFileUpload}
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Session</label>
            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            >
              {sessions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Term</label>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            >
              {terms.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Class</label>
            <select
              value={selectedClass}
              onChange={handleClassChange}
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            >
              <option value="">Select Class</option>
              {classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Subject</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            >
              <option value="">Select Subject</option>
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {selectedClass && subjects.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">
                {currentAdmin?.role === 'teacher' ? 'No assigned subjects found.' : 'No subjects found.'}
              </p>
            )}
          </div>
        </div>

        {selectedClass && selectedSubject && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {loading ? (
              <div className="py-12 text-center text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                <p>Loading students...</p>
              </div>
            ) : students.length > 0 ? (
              <div>
                {/* ── Desktop Table ── */}
                <div className="score-table-wrap">
                  <table className="w-full border-collapse score-table">
                    <thead>
                      <tr className="bg-slate-50 border-y border-slate-200">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Reg No.</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Student Name</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">CAT 1 (20)</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">CAT 2 (20)</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Exam (60)</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Total (100)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student) => {
                        const studentScores = scores[student.regNo] || {};
                        const total = (parseFloat(studentScores.cat1 || 0)) + 
                                     (parseFloat(studentScores.cat2 || 0)) + 
                                     (parseFloat(studentScores.exam || 0));

                        return (
                          <tr key={student.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 text-sm text-slate-600 font-mono">{student.regNo}</td>
                            <td className="px-4 py-3 text-sm font-medium text-slate-800">{student.name}</td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                max="20"
                                min="0"
                                placeholder="0"
                                value={studentScores.cat1 ?? ''}
                                className="score-input"
                                onChange={(e) => handleScoreChange(student.regNo, 'cat1', e.target.value)}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                max="20"
                                min="0"
                                placeholder="0"
                                value={studentScores.cat2 ?? ''}
                                className="score-input"
                                onChange={(e) => handleScoreChange(student.regNo, 'cat2', e.target.value)}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                max="60"
                                min="0"
                                placeholder="0"
                                value={studentScores.exam ?? ''}
                                className="score-input"
                                onChange={(e) => handleScoreChange(student.regNo, 'exam', e.target.value)}
                              />
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`font-bold ${total < 40 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                {total}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* ── Mobile Cards ── */}
                <div className="score-cards-mobile">
                  {students.map((student, idx) => {
                    const studentScores = scores[student.regNo] || {};
                    const total = (parseFloat(studentScores.cat1 || 0)) + 
                                 (parseFloat(studentScores.cat2 || 0)) + 
                                 (parseFloat(studentScores.exam || 0));
                    return (
                      <div key={student.id} className="score-card-mobile">
                        <div className="score-card-header">
                          <span className="score-card-num">{idx + 1}</span>
                          <div>
                            <p className="score-card-name">{student.name}</p>
                            <p className="score-card-regno">{student.regNo}</p>
                          </div>
                          <span className={`score-card-total ${total < 40 ? 'fail' : 'pass'}`}>{total}</span>
                        </div>
                        <div className="score-card-inputs">
                          <div className="score-card-field">
                            <label>CAT 1 <span>/20</span></label>
                            <input
                              type="number"
                              max="20"
                              min="0"
                              placeholder="0"
                              value={studentScores.cat1 ?? ''}
                              onChange={(e) => handleScoreChange(student.regNo, 'cat1', e.target.value)}
                            />
                          </div>
                          <div className="score-card-field">
                            <label>CAT 2 <span>/20</span></label>
                            <input
                              type="number"
                              max="20"
                              min="0"
                              placeholder="0"
                              value={studentScores.cat2 ?? ''}
                              onChange={(e) => handleScoreChange(student.regNo, 'cat2', e.target.value)}
                            />
                          </div>
                          <div className="score-card-field">
                            <label>Exam <span>/60</span></label>
                            <input
                              type="number"
                              max="60"
                              min="0"
                              placeholder="0"
                              value={studentScores.exam ?? ''}
                              onChange={(e) => handleScoreChange(student.regNo, 'exam', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-8 flex justify-end">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 bg-slate-900 text-white px-8 py-3 rounded-xl font-semibold hover:bg-black transition-all disabled:opacity-50 save-scores-btn"
                    style={{ backgroundColor: '#000000', color: '#ffffff' }}
                  >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Save Scores
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-600 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <AlertCircle className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                <p className="text-lg font-bold">No students found for {selectedClass}.</p>
                <p className="text-sm font-semibold">Please register students first or check the spelling.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {status.message && (
        <div className={`p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${
          status.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
          status.type === 'error' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
          'bg-indigo-50 text-indigo-700 border border-indigo-100'
        }`}>
          {status.type === 'success' ? <CheckCircle className="w-5 h-5" /> : 
           status.type === 'error' ? <AlertCircle className="w-5 h-5" /> : 
           <Loader2 className="w-5 h-5 animate-spin" />}
          <p className="font-medium">{status.message}</p>
        </div>
      )}
    </div>
  );
};

export default ScoreEntry;

