import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Upload, Download, FileSpreadsheet, CheckCircle2, AlertCircle, 
  Loader2, Users, ArrowRight, RefreshCw, Trash2, Check, UserPlus,
  ShieldCheck, FileText, Search, Sparkles
} from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, doc, writeBatch, getDocs, query, where } from 'firebase/firestore';
import { ensureFirebaseAuth } from '../lib/ensureAuth';
import { useGlobalClasses } from '../utils/classUtils';
import { compressStudent, expandStudent, normalizeGender } from '../utils/firestoreSchema';
import { generateUniqueRegNoSync } from '../utils/regNoGenerator';
import { useGlobalClubsAndHouses } from '../utils/schoolClubsAndHouses';

const BulkStudentEnrollModal = ({
  isOpen,
  onClose,
  initialClass = 'JSS1',
  onEnrolled
}) => {
  const classes = useGlobalClasses();
  const { clubs, houses } = useGlobalClubsAndHouses();
  const [selectedClass, setSelectedClass] = useState(initialClass || 'JSS1');
  const [existingRegNos, setExistingRegNos] = useState(new Set());
  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [parsedStudents, setParsedStudents] = useState([]);
  const [searchPreview, setSearchPreview] = useState('');
  const [enrolling, setEnrolling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [enrollmentSuccess, setEnrollmentSuccess] = useState(false);
  const [enrolledCount, setEnrolledCount] = useState(0);
  const fileInputRef = useRef(null);

  // Sync initial class when prop changes
  useEffect(() => {
    if (initialClass) {
      setSelectedClass(initialClass);
    }
  }, [initialClass]);

  // Load existing student registration numbers from Firestore for collision-free sequential generation
  useEffect(() => {
    if (!isOpen) return;
    const fetchExistingRegNos = async () => {
      try {
        const snap = await getDocs(collection(db, 'students'));
        const regSet = new Set();
        snap.docs.forEach(docSnap => {
          const d = expandStudent(docSnap.data());
          if (d.regNo) regSet.add(d.regNo.trim().toUpperCase());
        });
        setExistingRegNos(regSet);
      } catch (err) {
        console.warn('Could not preload existing RegNos:', err);
      }
    };
    fetchExistingRegNos();
  }, [isOpen]);

  // Reset state on modal open/close
  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setParsedStudents([]);
      setStatus({ type: '', message: '' });
      setEnrollmentSuccess(false);
      setProgress(0);
      setSearchPreview('');
    }
  }, [isOpen]);

  // Download Sample Excel Template (.xlsx)
  const handleDownloadTemplateXlsx = () => {
    const sampleData = [
      {
        'regno': '', // Left blank to demonstrate auto-generation (or input custom e.g. BDS/SS1/2026/001)
        'Names': 'Chukwuma Emmanuel Obi',
        'GENDER': 'Male',
        'PHONE': '08012345678',
        'EMAIL': 'chukwuma.obi@example.com',
        'DATE OF BIRTH': '2012-05-14',
        'HOUSE': 'Blue House',
        'CLUB': 'Jets Club'
      },
      {
        'regno': '',
        'Names': 'Amina Fatima Bello',
        'GENDER': 'Female',
        'PHONE': '08098765432',
        'EMAIL': 'amina.bello@example.com',
        'DATE OF BIRTH': '2012-09-22',
        'HOUSE': 'Red House',
        'CLUB': 'Press Club'
      },
      {
        'regno': '',
        'Names': 'Adeyemi David Olawale',
        'GENDER': 'Male',
        'PHONE': '08134567890',
        'EMAIL': 'adeyemi.david@example.com',
        'DATE OF BIRTH': '2011-11-03',
        'HOUSE': 'Green House',
        'CLUB': 'Drama Club'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData, {
      header: ['regno', 'Names', 'GENDER', 'PHONE', 'EMAIL', 'DATE OF BIRTH', 'HOUSE', 'CLUB']
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, `${selectedClass.replace(/\s+/g, '_')}_Enrollment_Template.xlsx`);
  };

  // Download Sample CSV Template (.csv)
  const handleDownloadTemplateCsv = () => {
    const csvContent = "regno,Names,GENDER,PHONE,EMAIL,DATE OF BIRTH,HOUSE,CLUB\n" +
      ",Chukwuma Emmanuel Obi,Male,08012345678,chukwuma.obi@example.com,2012-05-14,Blue House,Jets Club\n" +
      ",Amina Fatima Bello,Female,08098765432,amina.bello@example.com,2012-09-22,Red House,Press Club\n" +
      ",Adeyemi David Olawale,Male,08134567890,adeyemi.david@example.com,2011-11-03,Green House,Drama Club\n";
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedClass.replace(/\s+/g, '_')}_Enrollment_Template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Clean and parse uploaded spreadsheet rows
  const parseRows = (rows, currentExistingRegNos) => {
    if (!rows || rows.length < 2) {
      throw new Error('Spreadsheet appears to be empty or has no data rows.');
    }

    const headerRow = rows[0] || [];
    const normalizedHeaders = headerRow.map(h => typeof h === 'string' ? h.trim().toUpperCase() : String(h || '').trim().toUpperCase());

    const regNoIdx = normalizedHeaders.findIndex(h => h === 'REGNO' || h.includes('REG NO') || h.includes('REG') || h.includes('ADMISSION') || h === 'ROLL NO' || h === 'ID');
    const nameIdx = normalizedHeaders.findIndex(h => h.includes('NAME') || h === 'NAMES' || h === 'STUDENT' || h === 'FULLNAME');
    const sexIdx = normalizedHeaders.findIndex(h => h === 'SEX' || h === 'GENDER' || h === 'G');
    const phoneIdx = normalizedHeaders.findIndex(h => h.includes('PHONE') || h.includes('MOBILE') || h.includes('CONTACT') || h.includes('TEL'));
    const emailIdx = normalizedHeaders.findIndex(h => h.includes('EMAIL') || h.includes('MAIL'));
    const dobIdx = normalizedHeaders.findIndex(h => h.includes('DATE OF B') || h.includes('DATE OF BIRTH') || h.includes('DOB') || h.includes('D.O.B') || h.includes('BIRTH'));
    const houseIdx = normalizedHeaders.findIndex(h => h.includes('HOUSE'));
    const clubIdx = normalizedHeaders.findIndex(h => h.includes('CLUB') || h.includes('SOCIETY'));

    if (nameIdx === -1 && regNoIdx === -1) {
      throw new Error('Could not find "Names" or "regno" column in the header. Please check template format.');
    }

    const workingRegSet = new Set(currentExistingRegNos);
    const parsedList = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const rawName = nameIdx !== -1 ? String(row[nameIdx] || '').trim() : '';
      let rawRegNo = regNoIdx !== -1 ? String(row[regNoIdx] || '').trim() : '';
      const rawSex = sexIdx !== -1 ? String(row[sexIdx] || '').trim() : '';
      const rawPhone = phoneIdx !== -1 ? String(row[phoneIdx] || '').trim() : '';
      const rawEmail = emailIdx !== -1 ? String(row[emailIdx] || '').trim() : '';
      const rawDob = dobIdx !== -1 ? String(row[dobIdx] || '').trim() : '';
      const rawHouse = houseIdx !== -1 ? String(row[houseIdx] || '').trim() : '';
      const rawClub = clubIdx !== -1 ? String(row[clubIdx] || '').trim() : '';

      // Skip empty lines
      if (!rawName && !rawRegNo) continue;

      // Standardize gender
      let gender = 'Male';
      const gLower = rawSex.toLowerCase();
      if (gLower === 'f' || gLower === 'female' || gLower === 'girl' || gLower === 'woman') {
        gender = 'Female';
      }

      // If RegNo is missing or placeholder, auto-generate sequential unique RegNo
      let wasAutoGenerated = false;
      if (!rawRegNo || rawRegNo.toLowerCase() === 'auto' || rawRegNo === '0' || rawRegNo === 'N/A') {
        rawRegNo = generateUniqueRegNoSync(selectedClass, workingRegSet);
        wasAutoGenerated = true;
      }

      workingRegSet.add(rawRegNo.toUpperCase());

      parsedList.push({
        id: `row_${i}_${Date.now()}`,
        name: rawName || 'Unnamed Student',
        regNo: rawRegNo,
        gender,
        phone: rawPhone,
        email: rawEmail,
        dob: rawDob,
        house: rawHouse,
        club: rawClub,
        className: selectedClass,
        wasAutoGenerated
      });
    }

    return parsedList;
  };

  // Handle file selection
  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setParsing(true);
    setStatus({ type: 'info', message: `Analyzing ${selected.name}...` });

    const reader = new FileReader();

    if (selected.name.endsWith('.csv')) {
      Papa.parse(selected, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            const list = parseRows(results.data, existingRegNos);
            setParsedStudents(list);
            setStatus({ type: 'success', message: `Parsed ${list.length} student record(s) ready for enrollment into ${selectedClass}.` });
          } catch (err) {
            setStatus({ type: 'error', message: err.message || 'Failed to parse CSV file.' });
            setParsedStudents([]);
          } finally {
            setParsing(false);
          }
        },
        error: (err) => {
          setStatus({ type: 'error', message: 'CSV read error: ' + err.message });
          setParsing(false);
        }
      });
    } else {
      reader.onload = (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary', cellText: true, cellFormula: false });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
          const list = parseRows(data, existingRegNos);
          setParsedStudents(list);
          setStatus({ type: 'success', message: `Parsed ${list.length} student record(s) ready for enrollment into ${selectedClass}.` });
        } catch (err) {
          setStatus({ type: 'error', message: err.message || 'Failed to parse Excel file.' });
          setParsedStudents([]);
        } finally {
          setParsing(false);
        }
      };
      reader.onerror = () => {
        setStatus({ type: 'error', message: 'Failed to read Excel file.' });
        setParsing(false);
      };
      reader.readAsBinaryString(selected);
    }
  };

  // Remove a row from the preview table
  const handleRemoveRow = (rowId) => {
    setParsedStudents(prev => prev.filter(s => s.id !== rowId));
  };

  // Execute Bulk Enrollment into Firestore
  const handleConfirmEnrollment = async () => {
    if (parsedStudents.length === 0) return;

    setEnrolling(true);
    setProgress(5);
    setStatus({ type: 'info', message: `Initializing enrollment for ${parsedStudents.length} student(s)...` });

    try {
      await ensureFirebaseAuth();

      let batch = writeBatch(db);
      let count = 0;
      let total = parsedStudents.length;

      for (let i = 0; i < total; i++) {
        const student = parsedStudents[i];
        const docId = student.regNo.replace(/\//g, '-');
        const studentRef = doc(collection(db, 'students'), docId);

        const payload = compressStudent({
          regNo: student.regNo,
          name: student.name,
          gender: student.gender,
          className: selectedClass,
          phone: student.phone || '',
          email: student.email || '',
          dob: student.dob || '',
          house: student.house || '',
          club: student.club || '',
          registeredAt: new Date().toISOString(),
          enrolledVia: 'bulk_upload'
        });

        batch.set(studentRef, payload, { merge: true });
        count++;

        // Commit in chunks of 400 to respect Firestore batch limit (500)
        if (count % 400 === 0) {
          await batch.commit();
          batch = writeBatch(db);
        }

        setProgress(Math.round(((i + 1) / total) * 100));
      }

      // Commit remaining batch
      if (count % 400 !== 0) {
        await batch.commit();
      }

      setEnrolledCount(total);
      setEnrollmentSuccess(true);
      setStatus({ type: 'success', message: `Successfully enrolled ${total} student(s) into ${selectedClass}!` });

      if (onEnrolled) {
        onEnrolled({ count: total, className: selectedClass });
      }
    } catch (err) {
      console.error('Bulk enrollment error:', err);
      setStatus({ type: 'error', message: 'Enrollment failed: ' + (err?.message || 'Database write error') });
    } finally {
      setEnrolling(false);
    }
  };

  const filteredPreview = parsedStudents.filter(s => 
    s.name.toLowerCase().includes(searchPreview.toLowerCase()) || 
    s.regNo.toLowerCase().includes(searchPreview.toLowerCase())
  );

  const maleCount = parsedStudents.filter(s => s.gender === 'Male').length;
  const femaleCount = parsedStudents.filter(s => s.gender === 'Female').length;
  const autoRegCount = parsedStudents.filter(s => s.wasAutoGenerated).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden border border-slate-100"
      >
        {/* Modal Header */}
        <div className="p-6 bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3 text-left">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
              <UserPlus className="w-6 h-6 text-indigo-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black tracking-tight text-white m-0">Bulk Student Enrollment</h3>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full">
                  CSV & Excel
                </span>
              </div>
              <p className="text-indigo-200 text-xs font-medium mt-0.5">
                Quickly register and enroll multiple students into a class at once.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            disabled={enrolling}
            className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white/80 hover:text-white hover:bg-rose-500 transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50 space-y-6 text-left custom-scrollbar">
          {enrollmentSuccess ? (
            /* Success View */
            <div className="bg-white p-8 rounded-3xl border border-emerald-100 shadow-sm text-center space-y-5 animate-in zoom-in-95 duration-300">
              <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-inner border border-emerald-100">
                <CheckCircle2 size={42} />
              </div>
              <div className="space-y-1">
                <h4 className="text-2xl font-black text-slate-800">Enrollment Completed!</h4>
                <p className="text-slate-500 text-sm max-w-md mx-auto">
                  <strong className="text-slate-800 font-bold">{enrolledCount}</strong> students have been successfully registered into <strong className="text-indigo-600 font-bold">{selectedClass}</strong> with database indices and auto-generated registration codes.
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-3 pt-4">
                <button
                  onClick={() => {
                    setEnrollmentSuccess(false);
                    setParsedStudents([]);
                    setFile(null);
                  }}
                  className="px-6 py-3 rounded-xl bg-indigo-50 text-indigo-700 font-bold text-sm hover:bg-indigo-100 transition-all flex items-center gap-2"
                >
                  <RefreshCw size={16} /> Enroll Another Batch
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2"
                >
                  <Check size={16} /> Done
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Step 1: Target Class & Template Download */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1.5">
                      1. Select Target Class
                    </label>
                    <select
                      value={selectedClass}
                      onChange={(e) => {
                        setSelectedClass(e.target.value);
                        setParsedStudents([]);
                        setFile(null);
                      }}
                      className="w-full sm:max-w-xs px-4 py-2.5 rounded-xl border-2 border-slate-200 font-bold text-slate-800 outline-none focus:border-indigo-600 transition-all bg-white"
                    >
                      {classes.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleDownloadTemplateXlsx}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs hover:bg-emerald-100 transition-all"
                    >
                      <Download size={14} /> Excel Template (.xlsx)
                    </button>
                    <button
                      onClick={handleDownloadTemplateCsv}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs hover:bg-slate-200 transition-all"
                    >
                      <FileText size={14} /> CSV Template (.csv)
                    </button>
                  </div>
                </div>

                <div className="bg-indigo-50/60 p-3.5 rounded-xl border border-indigo-100 text-xs text-indigo-800 flex items-start gap-2.5">
                  <Sparkles size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                  <p className="m-0 leading-relaxed">
                    <strong>Smart Auto-Assignment:</strong> If the <code>REG NO</code> column is left blank in your spreadsheet, unique sequential Registration Numbers (e.g. <code>BDS/{selectedClass}/2026/001</code>) will be generated automatically for every student.
                  </p>
                </div>
              </div>

              {/* Step 2: Upload File Dropzone */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`p-8 border-2 border-dashed rounded-3xl transition-all text-center cursor-pointer flex flex-col items-center justify-center gap-3 ${
                  file ? 'border-indigo-500 bg-indigo-50/20' : 'border-slate-300 bg-white hover:border-indigo-400 hover:bg-indigo-50/30'
                }`}
              >
                <input 
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                />
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm">
                  {parsing ? <Loader2 className="animate-spin" size={28} /> : <Upload size={28} />}
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-base">
                    {file ? file.name : 'Click or Drag & Drop Student File Here'}
                  </h4>
                  <p className="text-slate-400 text-xs mt-0.5">
                    {file ? `${(file.size / 1024).toFixed(1)} KB — Click to change file` : 'Supports Excel (.xlsx, .xls) and CSV (.csv)'}
                  </p>
                </div>
              </div>

              {/* Status Alert */}
              {status.message && (
                <div className={`p-4 rounded-2xl flex items-center gap-3 text-sm font-semibold border ${
                  status.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                  status.type === 'error' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                  'bg-blue-50 text-blue-800 border-blue-200'
                }`}>
                  {status.type === 'success' ? <CheckCircle2 size={18} className="text-emerald-600 shrink-0" /> :
                   status.type === 'error' ? <AlertCircle size={18} className="text-rose-600 shrink-0" /> :
                   <Loader2 size={18} className="animate-spin text-blue-600 shrink-0" />}
                  <span>{status.message}</span>
                </div>
              )}

              {/* Step 3: Interactive Preview & Verification */}
              {parsedStudents.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-5 animate-in fade-in duration-300">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                        Preview ({parsedStudents.length} Students)
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                        {maleCount} Male
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-pink-50 text-pink-700 border border-pink-100">
                        {femaleCount} Female
                      </span>
                      {autoRegCount > 0 && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-100">
                          {autoRegCount} Auto-RegNos
                        </span>
                      )}
                    </div>

                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text"
                        placeholder="Search parsed records..."
                        value={searchPreview}
                        onChange={(e) => setSearchPreview(e.target.value)}
                        className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium outline-none focus:border-indigo-600 w-full sm:w-48 bg-slate-50"
                      />
                    </div>
                  </div>

                  <div className="max-h-60 overflow-y-auto border border-slate-100 rounded-xl custom-scrollbar">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider sticky top-0 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-2.5">#</th>
                          <th className="px-4 py-2.5">Student Name</th>
                          <th className="px-4 py-2.5">Reg Number</th>
                          <th className="px-4 py-2.5">Gender</th>
                          <th className="px-4 py-2.5">Phone / Contact</th>
                          <th className="px-4 py-2.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {filteredPreview.map((s, idx) => (
                          <tr key={s.id} className="hover:bg-indigo-50/30 transition-colors">
                            <td className="px-4 py-2.5 text-slate-400">{idx + 1}</td>
                            <td className="px-4 py-2.5 font-bold text-slate-800">{s.name}</td>
                            <td className="px-4 py-2.5">
                              <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                                {s.regNo}
                              </span>
                              {s.wasAutoGenerated && (
                                <span className="ml-1.5 text-[9px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                                  AUTO
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                s.gender === 'Male' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'
                              }`}>
                                {s.gender}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-slate-500">{s.phone || s.email || '—'}</td>
                            <td className="px-4 py-2.5 text-right">
                              <button
                                onClick={() => handleRemoveRow(s.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                title="Remove row"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Progress Bar while enrolling */}
              {enrolling && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-slate-600">
                    <span>Enrolling into {selectedClass}...</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-600 transition-all duration-300 rounded-full" 
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        {!enrollmentSuccess && (
          <div className="p-6 border-t border-slate-100 bg-white flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
            <div className="text-xs text-slate-400 font-medium">
              {parsedStudents.length > 0 ? (
                <span>Ready to enroll <strong>{parsedStudents.length}</strong> students into <strong>{selectedClass}</strong>.</span>
              ) : (
                <span>Select a file to begin preview and enrollment.</span>
              )}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={onClose}
                disabled={enrolling}
                className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmEnrollment}
                disabled={enrolling || parsedStudents.length === 0}
                className="flex-1 sm:flex-none px-8 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {enrolling ? (
                  <>
                    <Loader2 className="animate-spin" size={16} /> Enrolling…
                  </>
                ) : (
                  <>
                    <Check size={16} /> Confirm & Enroll {parsedStudents.length > 0 ? `(${parsedStudents.length})` : ''}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default BulkStudentEnrollModal;
