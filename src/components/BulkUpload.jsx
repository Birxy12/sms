import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { db } from '../lib/firebase';
import { collection, doc, writeBatch, query, where, getDocs } from 'firebase/firestore';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, Download } from 'lucide-react';
import { CLASS_LIST, getAllSubjects, getSubjectsForClass } from '../utils/subjectConfig';

const BulkUpload = ({ onComplete }) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedClass, setSelectedClass] = useState('JSS1');
  const [selectedSession, setSelectedSession] = useState('2025/2026');
  const [selectedTerm, setSelectedTerm] = useState('Second Term');
  
  const classesList = CLASS_LIST;
  const sessionsList = ['2024/2025', '2025/2026', '2026/2027'];
  const termsList = ['First Term', 'Second Term', 'Third Term'];

  const handleDownloadRoster = async () => {
    setLoading(true);
    setStatus({ type: 'info', message: `Fetching roster for ${selectedClass}...` });
    try {
      const q = query(collection(db, 'students'), where('className', '==', selectedClass));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        setStatus({ type: 'error', message: `No students found in ${selectedClass} class.` });
        setLoading(false);
        return;
      }

      const rawData = [];
      snap.forEach(doc => {
        const d = doc.data();
        rawData.push({
          'REG NO': d.regNo,
          'STUDENT NAME': d.name,
          'SEX': d.gender,
          'D.O.B': d.dob || '',
          'CLUB': d.club || '',
          'HOUSE': d.house || ''
        });
      });

      const ws = XLSX.utils.json_to_sheet(rawData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Students");
      XLSX.writeFile(wb, `${selectedClass.replace(/\s+/g, '_')}_Roster.xlsx`);

      setStatus({ type: 'success', message: `Downloaded roster for ${selectedClass}.` });
    } catch (error) {
      console.error('Download error:', error);
      setStatus({ type: 'error', message: 'Failed to download class roster: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    setLoading(true);
    setStatus({ type: 'info', message: `Generating bulk entry template for ${selectedClass}...` });
    try {
      const q = query(collection(db, 'students'), where('className', '==', selectedClass));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        setStatus({ type: 'error', message: `No students found in ${selectedClass} class.` });
        setLoading(false);
        return;
      }

      const subjects = getSubjectsForClass(selectedClass);
      
      const rawData = [];
      snap.forEach(doc => {
        const d = doc.data();
        const row = {
          'REG NO': d.regNo,
          'STUDENT NAME': d.name
        };
        // Add columns for each subject
        subjects.forEach(subject => {
          row[subject] = '';
          row[`${subject}_CAT2`] = '';
          row[`${subject}_EXAM`] = '';
        });
        rawData.push(row);
      });

      const ws = XLSX.utils.json_to_sheet(rawData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Bulk Entry");
      XLSX.writeFile(wb, `${selectedClass.replace(/\s+/g, '_')}_Bulk_Entry_Template.xlsx`);

      setStatus({ type: 'success', message: `Downloaded Bulk Entry Template for ${selectedClass}.` });
    } catch (error) {
      console.error('Download error:', error);
      setStatus({ type: 'error', message: 'Failed to download template: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  const processFile = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setStatus({ type: 'info', message: `Processing ${type} file...` });

    try {
      if (file.name.endsWith('.csv')) {
        Papa.parse(file, {
          complete: (results) => uploadData(results.data, type),
          header: false
        });
      } else {
        const reader = new FileReader();
        reader.onload = (evt) => {
          const bstr = evt.target.result;
          const wb = XLSX.read(bstr, { type: 'binary', cellText: true, cellFormula: false });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
          uploadData(data, type);
        };
        reader.readAsBinaryString(file);
      }
    } catch (error) {
      console.error('File processing error:', error);
      setStatus({ type: 'error', message: 'Failed to process file. Please ensure it is a valid CSV or Excel file.' });
      setLoading(false);
    }
  };

  // Process individual student report card (.xlsb format)
  const processResultSheet = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setLoading(true);
    setStatus({ type: 'info', message: `Reading ${files.length} result sheet(s)...` });

    const readFile = (file) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const wb = XLSX.read(evt.target.result, { type: 'binary', cellText: true, cellFormula: false });
          // Use the second sheet if first is a chart
          const wsName = wb.SheetNames.find(n => n !== 'Chart1') || wb.SheetNames[0];
          const ws = wb.Sheets[wsName];
          const data = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
          resolve(data);
        } catch(err) { reject(err); }
      };
      reader.onerror = reject;
      reader.readAsBinaryString(file);
    });

    try {
      let totalUploaded = 0;
      for (const file of Array.from(files)) {
        const data = await readFile(file);

        // Helper to find data values in irregular header rows across different sheet versions
        const findValueAfterLabel = (rowsArr, labels) => {
          for (const row of rowsArr) {
            if (!row) continue;
            const idx = row.findIndex(c => typeof c === 'string' && labels.some(l => c.toUpperCase().includes(l.toUpperCase())));
            if (idx !== -1) {
              for (let i = idx + 1; i < row.length; i++) {
                if (row[i] !== null && row[i] !== undefined && row[i] !== '') return row[i];
              }
            }
          }
          return '';
        };

        const headerRows = [data[6], data[7], data[8], data[9], data[10], data[11]];
        
        const rawRegNo   = String(findValueAfterLabel(headerRows, ['REG NO'])).trim();
        const studentName = String(findValueAfterLabel(headerRows, ['NAME'])).trim();
        const sex        = String(findValueAfterLabel(headerRows, ['SEX'])).trim();
        const average    = String(findValueAfterLabel(headerRows, ['AVERAGE'])).trim();
        const position   = String(findValueAfterLabel(headerRows, ['POSITION'])).trim();
        const dob        = String(findValueAfterLabel(headerRows, ['DATE OF BIRTH', 'D.O.B'])).trim();
        const club       = String(findValueAfterLabel(headerRows, ['CLUB'])).trim();
        const house      = String(findValueAfterLabel(headerRows, ['HOUSE'])).trim();
        const promoStatus = String(findValueAfterLabel(headerRows, ['PROMOTION STATUS', 'PROMOTION'])).trim();
        const className  = selectedClass; // Force class from explicit UI selection

        if (!rawRegNo) {
          console.warn('Skipped file — no RegNo found:', file.name);
          continue;
        }

        const docId = rawRegNo.replace(/\//g, '-');

        // Dynamically find where subjects start
        let subjectStartIdx = 19;
        for (let i = 12; i < 26; i++) {
          if (data[i] && data[i].some(c => typeof c === 'string' && c.toUpperCase() === 'SUBJECTS')) {
            subjectStartIdx = i + 1;
            break;
          }
        }

        const marks = {};
        for (let i = subjectStartIdx; i < data.length; i++) {
          const row = data[i];
          const rawSubjectName = (row[1] || '').trim();
          if (!rawSubjectName) continue;
          
          let subjectName = rawSubjectName.toUpperCase();
          
          // Skip if it looks like a behaviour/skill label
          if (['ATTENTIVENESS','HONESTY','NEATNESS','POLITENESS','PUNCTUALITY',
               'CONFIDENCE','ATTITUDE','LISTENING SKILLS','READING SKILLS',
               'HOME WORK','HAND WRITING','SPOKEN ENGLISH','OUTDOOR GAMES',
               'SKILLS','BEHAVIOURS','SUBJECTS'].includes(subjectName)) continue;

          // Normalize abbreviations to match global configuration
          if (subjectName === 'ENGLISH LANG.') subjectName = 'ENGLISH LANGUAGE';
          if (subjectName === 'IGBO LANG.') subjectName = 'IGBO LANGUAGE';
          if (subjectName === 'COMP. SCIENCE' || subjectName === 'COMPUTER SCI') subjectName = 'COMPUTER SCIENCE';
          if (subjectName === 'ANIMAL HUS.') subjectName = 'ANIMAL HUSBANDRY';
          if (subjectName === 'CRS' || subjectName === 'C.R.S') subjectName = 'C.R.S';
          if (subjectName === 'CIVIC EDU.' || subjectName === 'CIVIC') subjectName = 'CIVIC EDUCATION';
          if (subjectName === 'PHE' || subjectName === 'P.H.E') subjectName = 'PHYSICAL & HEALTH EDUCATION';

          marks[subjectName] = {
            cat1: row[7] || '0',
            cat2: row[9] || '0',
            exam: row[11] || '0',
            total: row[13] || '0',
            grade: row[15] || '',
            min: row[17] || '',
            max: row[20] || '',
            position: row[22] || '',
            remarks: row[24] || ''
          };
        }

        // Use explicit session and term selected from the UI
        const term = selectedTerm;
        const session = selectedSession;

        // Save result to 'marks' collection
        const marksRef = doc(collection(db, 'marks'), `${docId}_${session.replace('/', '-')}_${term.replace(/\s/g,'').toLowerCase()}`);
        const batch = writeBatch(db);
        batch.set(marksRef, {
          regNo: rawRegNo,
          studentName,
          className,
          term,
          session,
          average,
          position,
          promotionStatus: promoStatus,
          marks,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        // Also update student record with profile info
        const studentRef = doc(collection(db, 'students'), docId);
        batch.set(studentRef, {
          regNo: rawRegNo,
          name: studentName,
          gender: sex,
          dob,
          club,
          house,
          className,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        await batch.commit();
        totalUploaded++;
        setStatus({ type: 'info', message: `Uploaded ${totalUploaded}/${files.length}: ${studentName || rawRegNo}` });
      }
      setStatus({ type: 'success', message: `Successfully uploaded results for ${totalUploaded} student(s)!` });
      
      // Auto-publish result for this class/session/term
      await autoPublish();

      if (onComplete) onComplete();
    } catch (error) {
      console.error('Result upload error:', error);
      setStatus({ type: 'error', message: 'Error uploading results: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  const autoPublish = async () => {
    try {
      const { setDoc, doc } = await import('firebase/firestore');
      const pubId = `${selectedSession.replace('/', '-')}_${selectedTerm.replace(/\s/g, '').toLowerCase()}_${selectedClass.replace(/\s/g, '').toLowerCase()}`;
      const pubRef = doc(db, 'publications', pubId);
      
      await setDoc(pubRef, {
        type: 'Result',
        examName: `${selectedTerm} Examination`,
        session: selectedSession,
        term: selectedTerm,
        targetClass: selectedClass,
        publishedAt: new Date().toISOString(),
        status: 'published'
      }, { merge: true });
      
      console.log('Result auto-published for:', pubId);
    } catch (error) {
      console.error('Auto-publish failed:', error);
    }
  };

  const uploadData = async (rawData, type) => {
    try {
      setStatus({ type: 'info', message: `Uploading ${type} to Firestore...` });
      let batch = writeBatch(db);
      let count = 0;
      let hasPending = false;

      if (type === 'students') {
        const headerRow = rawData[0] || [];
        const normalizedHeaders = headerRow.map(h => typeof h === 'string' ? h.trim().toUpperCase() : '');
        
        const regNoIdx = normalizedHeaders.findIndex(h => h.includes('REG') && h.includes('NO'));
        const nameIdx = normalizedHeaders.findIndex(h => h.includes('NAME'));
        const sexIdx = normalizedHeaders.findIndex(h => h === 'SEX' || h === 'GENDER');
        const dobIdx = normalizedHeaders.findIndex(h => h.includes('D.O.B') || h === 'DOB' || h.includes('DATE OF BIRTH') || h.includes('DATE'));
        const clubIdx = normalizedHeaders.findIndex(h => h === 'CLUB' || h.includes('CLUB'));
        const houseIdx = normalizedHeaders.findIndex(h => h === 'HOUSE' || h.includes('HOUSE') || h === 'COLUMN1');

        if (regNoIdx === -1) {
          throw new Error("Could not find Registration Number column in the spreadsheet header. Please check your file format.");
        }

        for (let i = 1; i < rawData.length; i++) {
          const row = rawData[i];
          const rawRegNo = row[regNoIdx]?.toString().trim();
          if (!rawRegNo || rawRegNo === '0') continue;

          const docId = rawRegNo.replace(/\//g, '-');
          const studentRef = doc(collection(db, 'students'), docId);
          batch.set(studentRef, {
            regNo: rawRegNo,
            name: nameIdx !== -1 ? (row[nameIdx] || 'Unknown') : 'Unknown',
            gender: sexIdx !== -1 ? (row[sexIdx] || '') : '',
            dob: dobIdx !== -1 ? (row[dobIdx] || '') : '',
            club: clubIdx !== -1 ? (row[clubIdx] || '') : '',
            house: houseIdx !== -1 ? (row[houseIdx] || '') : '',
            className: selectedClass,
            updatedAt: new Date().toISOString()
          }, { merge: true });
          hasPending = true;
          
          count++;
          setUploadProgress(Math.round((i / rawData.length) * 100));

          if (count % 400 === 0) {
            await batch.commit();
            batch = writeBatch(db);
            hasPending = false;
          }
        }
      } else if (type === 'marksheet') {
        const validSubjects = getAllSubjects();
        const classSubjects = getSubjectsForClass(selectedClass).map(s => s.toUpperCase());
        
        const studentRef = collection(db, 'students');
        const studentSnap = await getDocs(query(studentRef, where('className', '==', selectedClass)));
        const classStudents = studentSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const matchSubject = (raw) => {
          if (!raw) return null;
          let upper = raw.toString().toUpperCase().trim();
          if (upper === 'ENGLISH LANG.' || upper === 'ENGLIS L.' || upper === 'ENGL') return 'ENGLISH LANGUAGE';
          if (upper === 'IGBO LANG.' || upper === 'IGBO') return 'IGBO LANGUAGE';
          if (upper === 'COMP. SCIENCE' || upper === 'COMPUTER' || upper === 'COMP SCI') return 'COMPUTER SCIENCE';
          if (upper === 'ANIMAL HUS.' || upper === 'ANIMAL H') return 'ANIMAL HUSBANDRY';
          if (upper === 'AGRIC SCIENCE' || upper === 'AGRIC' || upper === 'AGR') return 'AGRIC SCIENCE';
          if (upper === 'CRS' || upper === 'C.R.S.' || upper === 'C.R.S') return 'C.R.S';
          if (upper === 'P.H.E' || upper === 'PHE' || upper === 'P H E') return 'PHYSICAL & HEALTH EDUCATION';
          if (upper === 'CIVIC' || upper === 'CIVIC EDU') return 'CIVIC EDUCATION';
          if (upper === 'BIO' || upper === 'BIOL') return 'BIOLOGY';
          if (upper === 'PHY' || upper === 'PHYS') return 'PHYSICS';
          if (upper === 'CHEM' || upper === 'CHM') return 'CHEMISTRY';
          if (upper === 'MATH' || upper === 'MATHS') return 'MATHEMATICS';
          
          const match = validSubjects.find(s => s === upper || s.includes(upper) || upper.includes(s));
          return match || upper;
        };

        let subjects = [];
        let subjectRowIdx = -1;

        for (let r = 0; r < Math.min(rawData.length, 15); r++) {
          const row = rawData[r];
          if (!row) continue;
          const found = [];
          for (let c = 0; c < row.length; c++) {
            const mapped = matchSubject(row[c]);
            if (mapped && (classSubjects.includes(mapped.toUpperCase()) || validSubjects.includes(mapped.toUpperCase()))) {
              found.push({ name: mapped, startIndex: c });
            }
          }
          if (found.length >= 3) { 
            subjects = found;
            subjectRowIdx = r;
            break;
          }
        }

        if (subjectRowIdx === -1) {
          throw new Error("Could not detect subjects in the spreadsheet. Please ensure subject names match the school config.");
        }

        let matchedByReg = 0;
        let matchedByName = 0;
        let failedMatch = 0;

        for (let i = subjectRowIdx + 1; i < rawData.length; i++) {
          const row = rawData[i];
          if (!row || row.length < 2) continue;

          let rawRegNo = String(row[0] || '').trim();
          let studentName = String(row[1] || '').trim();
          
          if ((!rawRegNo || rawRegNo === '0' || rawRegNo === 'Roll No.') && !studentName) continue;
          if (rawRegNo.toUpperCase().includes('REG NO')) continue;

          let finalRegNo = '';
          let finalName = studentName;
          
          if (rawRegNo && rawRegNo !== '0' && (rawRegNo.includes('/') || rawRegNo.includes('-'))) {
            finalRegNo = rawRegNo;
            matchedByReg++;
          } else if (studentName) {
            const match = classStudents.find(s => s.name.toUpperCase().trim() === studentName.toUpperCase().trim());
            if (match) {
              finalRegNo = match.regNo;
              matchedByName++;
            } else {
              failedMatch++;
              continue; 
            }
          } else {
            continue;
          }

          const docId = finalRegNo.replace(/\//g, '-');
          const updateData = {
            regNo: finalRegNo,
            studentName: finalName,
            className: selectedClass,
            term: selectedTerm,
            session: selectedSession,
            updatedAt: new Date().toISOString()
          };

          subjects.forEach(subject => {
            const sIdx = subject.startIndex;
            let cat1 = parseFloat(row[sIdx] || 0);
            let cat2 = parseFloat(row[sIdx + 1] || 0);
            let exam = parseFloat(row[sIdx + 2] || 0);
            
            if (isNaN(row[sIdx]) || row[sIdx] === subject.name) {
               cat1 = parseFloat(row[sIdx + 1] || 0);
               cat2 = parseFloat(row[sIdx + 2] || 0);
               exam = parseFloat(row[sIdx + 3] || 0);
            }

            const total = cat1 + cat2 + exam;
            let grade = '';
            if (total >= 75) grade = 'A';
            else if (total >= 70) grade = 'B1';
            else if (total >= 65) grade = 'B2';
            else if (total >= 60) grade = 'B3';
            else if (total >= 50) grade = 'C4';
            else if (total >= 45) grade = 'C5';
            else if (total >= 40) grade = 'D7';
            else if (total >= 35) grade = 'E8';
            else grade = 'F9';

            updateData[`marks.${subject.name}`] = {
              cat1, cat2, exam, total, percent: total, grade
            };
          });

          const safeSession = selectedSession.replace('/', '-');
          const safeTerm = selectedTerm.replace(/\s/g, '').toLowerCase();
          const marksRef = doc(collection(db, 'marks'), `${docId}_${safeSession}_${safeTerm}`);
          
          batch.set(marksRef, updateData, { merge: true });
          hasPending = true;

          count++;
          setUploadProgress(Math.round((i / rawData.length) * 100));

          if (count % 200 === 0) {
            await batch.commit();
            batch = writeBatch(db); 
            hasPending = false;
          }
        }
        
        if (hasPending) {
          await batch.commit();
          hasPending = false;
        }

        console.log(`Matching results: Reg=${matchedByReg}, Name=${matchedByName}, Failed=${failedMatch}`);
        if (failedMatch > 0) {
           setStatus({ type: 'info', message: `Matched ${matchedByReg + matchedByName} students. ${failedMatch} could not be matched.` });
        }
      }

      if (hasPending) {
        await batch.commit();
      }
      
      setUploadProgress(100);
      setStatus({ type: 'success', message: `Successfully uploaded ${count} records to Firestore!` });
      await autoPublish();
      if (onComplete) onComplete();
    } catch (error) {
      console.error('Upload error:', error);
      setStatus({ type: 'error', message: 'Error uploading to Firestore: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <Upload className="w-5 h-5 text-indigo-600" />
        Bulk Data Porter
      </h3>

      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mb-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <FileText className="text-indigo-600" size={20} />
          Bulk Actions Configuration
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div>
            <label className="block text-sm font-bold text-slate-600 uppercase tracking-wider mb-2">Academic Session</label>
            <select 
              value={selectedSession} 
              onChange={(e) => setSelectedSession(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium bg-white"
            >
              {sessionsList.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-600 uppercase tracking-wider mb-2">School Term</label>
            <select 
              value={selectedTerm} 
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium bg-white"
            >
              {termsList.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-600 uppercase tracking-wider mb-2">Target Class</label>
            <select 
              value={selectedClass} 
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium bg-white"
            >
              {classesList.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        
        <p className="text-sm text-slate-500 mb-4">
          You are currently processing data for <strong>{selectedClass}</strong> in <strong>{selectedTerm}</strong> of the <strong>{selectedSession}</strong> session. 
          Any bulk results uploaded will be automatically recorded under this exact period.
        </p>
        
        <div className="flex flex-wrap gap-4">
          <button 
            onClick={handleDownloadRoster} 
            disabled={loading}
            className="flex items-center gap-2 bg-indigo-100 text-indigo-700 px-6 py-3 rounded-xl font-bold hover:bg-indigo-200 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Download size={20} />}
            Download {selectedClass} Roster Template
          </button>
          
          <button 
            onClick={handleDownloadTemplate} 
            disabled={loading}
            className="flex items-center gap-2 bg-teal-100 text-teal-700 px-6 py-3 rounded-xl font-bold hover:bg-teal-200 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <FileText size={20} />}
            Download {selectedClass} Bulk Entry Template
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Student List Upload */}
        <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 hover:border-indigo-300 transition-colors text-center">
          <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <h4 className="font-medium text-slate-700">Student List</h4>
          <p className="text-sm text-slate-500 mb-4">Upload student_details.csv or .xlsx</p>
          <input
            type="file"
            id="studentUpload"
            className="hidden"
            accept=".csv, .xlsx, .xls"
            onChange={(e) => processFile(e, 'students')}
            disabled={loading}
          />
          <label
            htmlFor="studentUpload"
            className="inline-block bg-slate-100 px-4 py-2 rounded-lg text-sm font-medium text-slate-700 cursor-pointer hover:bg-slate-200 transition-colors"
          >
            {loading ? 'Processing...' : 'Browse Files'}
          </label>
        </div>

        {/* Marksheet Upload */}
        <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 hover:border-teal-300 transition-colors text-center">
          <Upload className="w-8 h-8 text-teal-500 mx-auto mb-2" />
          <h4 className="font-medium text-slate-700">General Entry Sheet</h4>
          <p className="text-sm text-slate-500 mb-4">Upload entry sheet like ss1e.xlsx</p>
          <input
            type="file"
            id="marksheetUpload"
            className="hidden"
            accept=".csv, .xlsx, .xls"
            onChange={(e) => processFile(e, 'marksheet')}
            disabled={loading}
          />
          <label
            htmlFor="marksheetUpload"
            className="inline-block bg-teal-50 text-teal-700 px-4 py-2 rounded-lg text-sm font-bold cursor-pointer hover:bg-teal-100 transition-colors"
          >
            {loading ? 'Processing...' : 'Upload Entry Sheet'}
          </label>
        </div>

        {/* Individual Result Sheets Upload */}
        <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 hover:border-purple-300 transition-colors text-center md:col-span-2">
          <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <h4 className="font-medium text-slate-700">Student Report Cards</h4>
          <p className="text-sm text-slate-500 mb-1">Upload individual student result sheets (.xlsb / .xlsx)</p>
          <p className="text-xs text-purple-600 font-semibold mb-4">✓ Accepts multiple files at once — select all sheets for a class together!</p>
          <input
            type="file"
            id="resultSheetsUpload"
            className="hidden"
            accept=".xlsb, .xlsx, .xls"
            multiple
            onChange={processResultSheet}
            disabled={loading}
          />
          <label
            htmlFor="resultSheetsUpload"
            className="inline-block bg-purple-100 text-purple-700 px-6 py-2.5 rounded-lg text-sm font-bold cursor-pointer hover:bg-purple-200 transition-colors"
          >
            {loading ? 'Uploading Results...' : 'Select Result Sheet(s)'}
          </label>
        </div>
      </div>

      {(loading || status.message) && (
        <div className={`mt-6 p-4 rounded-xl flex flex-col gap-3 ${
          status.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
          status.type === 'error' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
          'bg-blue-50 text-blue-700 border border-blue-100'
        }`}>
          <div className="flex items-center gap-3">
            {status.type === 'success' ? <CheckCircle className="w-5 h-5" /> : 
             status.type === 'error' ? <AlertCircle className="w-5 h-5" /> : 
             <Loader2 className="w-5 h-5 animate-spin" />}
            <p className="text-sm font-medium">{status.message}</p>
          </div>
          
          {loading && uploadProgress > 0 && uploadProgress < 100 && (
            <div className="w-full mt-2">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest mb-1">
                <span>Upload Progress</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-1.5 w-full bg-blue-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BulkUpload;
