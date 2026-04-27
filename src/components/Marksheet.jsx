import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { Search, Printer, Download, Filter, FileText, UploadCloud, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import marksheetCsv from '../assets/marksheet.csv?raw';
import ss1MarksheetCsv from '../assets/ss1_marksheet.csv?raw';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { CLASS_LIST, getSubjectsForClass } from '../utils/subjectConfig';
import '../assets/Marksheet.css';

const Marksheet = ({ className: propClassName }) => {
  const { primaryColor } = useTheme();
  const [data, setData] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedClass, setSelectedClass] = useState(() => localStorage.getItem('marksheet_class') || propClassName || 'JSS1');
  const [selectedSession, setSelectedSession] = useState(() => localStorage.getItem('marksheet_session') || '2025/2026');
  const [selectedTerm, setSelectedTerm] = useState(() => localStorage.getItem('marksheet_term') || 'Second Term');
  
  const [publishing, setPublishing] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  const classes = CLASS_LIST;
  const sessions = ['2024/2025', '2025/2026', '2026/2027'];
  const terms = ['First Term', 'Second Term', 'Third Term'];

  useEffect(() => { localStorage.setItem('marksheet_class', selectedClass); }, [selectedClass]);
  useEffect(() => { localStorage.setItem('marksheet_session', selectedSession); }, [selectedSession]);
  useEffect(() => { localStorage.setItem('marksheet_term', selectedTerm); }, [selectedTerm]);

  // Keep these aliases for backwards compatibility with processCSVData
  const metaInfo = { term: selectedTerm, academicYear: selectedSession, className: selectedClass };
  const currentClassName = selectedClass;

  const handlePublish = async () => {
    if (!selectedClass || data.length === 0) {
      setStatus({ type: 'error', message: 'No data to publish.' });
      return;
    }

    setPublishing(true);
    setStatus({ type: 'info', message: 'Publishing results to student portals...' });

    try {
      const pubId = `${selectedSession.replace('/', '-')}_${selectedTerm.replace(/\\s/g, '').toLowerCase()}_${selectedClass.replace(/\\s/g, '').toLowerCase()}`;
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

      setStatus({ type: 'success', message: 'Results published successfully!' });
      setTimeout(() => setStatus({ type: '', message: '' }), 5000);
    } catch (error) {
      console.error('Publish error:', error);
      setStatus({ type: 'error', message: 'Error publishing results: ' + error.message });
    } finally {
      setPublishing(false);
    }
  };

  const processCSVData = (rawData) => {
    if (!rawData || rawData.length < 11) {
      setLoading(false);
      return;
    }

    const isSS1File = rawData[0] && rawData[0][0] === 'REG No.';
    
    if (isSS1File) {
      // SS1 Specific structure: Row 1 subjects, Row 3 data

      const subjectList = [];
      const row1 = rawData[0] || [];
      for (let i = 2; i < row1.length; i++) {
        const cellValue = row1[i] || '';
        if (cellValue === 'TOTAL') break;
        // In this sheet, subjects names are every 6 columns, starting at index 3 (we use i-1 to point to CAT)
        if (cellValue && isNaN(cellValue) && !['NAME', 'REG NO.', 'ROLL NO.'].includes(cellValue.toUpperCase())) {
          subjectList.push({ name: cellValue, startIndex: i - 1 });
          i += 5; // Move to next subject block
        }
      }
      setSubjects(subjectList);

      const students = rawData.slice(2)
        .filter(row => row[0] && row[0] !== 'Roll No.' && row[1])
        .map(row => {
          const student = {
            rollNo: row[0],
            name: row[1],
            marks: {}
          };

          subjectList.forEach((subject) => {
            const sIdx = subject.startIndex;
            student.marks[subject.name] = {
              cat1: row[sIdx],
              cat2: row[sIdx + 1],
              exam: row[sIdx + 2],
              total: row[sIdx + 3],
              percent: row[sIdx + 4],
              grade: row[sIdx + 5]
            };
          });

          const lastColIndex = row.length - 1;
          student.totalMarks = row[lastColIndex - 3];
          student.rank = row[lastColIndex - 1];

          return student;
        });

      setData(students);
    } else {
      // Original structure (JSS1 demo)
      const row7 = rawData[6] || [];

      const subjectList = [];
      const row8 = rawData[7] || [];
      for (let i = 5; i < row8.length; i += 6) {
        const cellValue = row8[i] || '';
        if (cellValue.includes('TOTAL')) break;
        if (cellValue && cellValue !== '#REF!' && isNaN(cellValue)) {
          subjectList.push({ name: cellValue, startIndex: i });
        }
      }
      setSubjects(subjectList);

      const students = rawData.slice(10)
        .filter(row => row[0] && row[0] !== 'Roll No.' && row[1])
        .map(row => {
          const student = {
            rollNo: row[0],
            name: row[1],
            sex: row[2],
            marks: {}
          };

          subjectList.forEach((subject) => {
            const sIdx = subject.startIndex;
            student.marks[subject.name] = {
              cat1: row[sIdx],
              cat2: row[sIdx + 1],
              exam: row[sIdx + 2],
              total: row[sIdx + 3],
              percent: row[sIdx + 4],
              grade: row[sIdx + 5]
            };
          });

          const lastColIndex = row.length - 1;
          student.totalMarks = row[lastColIndex - 3];
          student.rank = row[lastColIndex - 1];

          return student;
        });

      setData(students);
    }
    setLoading(false);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Try to fetch from Firestore first
        const studentsQuery = query(collection(db, 'students'), where('className', '==', currentClassName));
        const studentsSnapshot = await getDocs(studentsQuery);
        
        const marksQuery = query(collection(db, 'marks'), where('session', '==', selectedSession));
        const marksSnapshot = await getDocs(marksQuery);
        
        const dbMarks = {};
        marksSnapshot.docs.forEach(doc => {
          const docData = doc.data();
          if (docData.className === selectedClass && docData.term === selectedTerm) {
            dbMarks[docData.regNo] = docData.marks || docData.subjects || {};
          }
        });

        if (!studentsSnapshot.empty) {
          let studentList = studentsSnapshot.docs.map(doc => {
            const sData = doc.data();
            const marks = dbMarks[sData.regNo] || {};
            
            let total = 0;
            Object.values(marks).forEach(m => {
               total += parseFloat(m.total || 0);
            });

            return {
              rollNo: sData.regNo,
              name: sData.name,
              sex: sData.gender || '-',
              marks: marks,
              totalMarks: total,
              rank: ''
            };
          });

          // Calculate rank based on totalMarks
          studentList.sort((a, b) => b.totalMarks - a.totalMarks);
          
          const getOrdinal = (n) => {
            const s = ["th", "st", "nd", "rd"];
            const v = n % 100;
            return n + (s[(v - 20) % 10] || s[v] || s[0]);
          };

          let currentRank = 1;
          for (let i = 0; i < studentList.length; i++) {
            if (i > 0 && studentList[i].totalMarks < studentList[i-1].totalMarks) {
              currentRank = i + 1;
            }
            // Avoid NaN logic if total is 0 and others are 0, just give them rank
            studentList[i].rank = studentList[i].totalMarks > 0 ? getOrdinal(currentRank) : 'N/A';
          }

          // Set subjects based on class configuration (Dynamic Headers)
          const classSubjects = getSubjectsForClass(currentClassName);
          if (classSubjects && classSubjects.length > 0) {
            setSubjects(classSubjects.map(name => ({ name, startIndex: -1 })));
          } else {
            // Extraction fallback if config is missing
            const allSubjects = new Set();
            Object.values(dbMarks).forEach(m => Object.keys(m).forEach(s => allSubjects.add(s)));
            if (allSubjects.size > 0) {
              setSubjects(Array.from(allSubjects).map(name => ({ name, startIndex: -1 })));
            }
          }

          setData(studentList);
          setLoading(false);
          return;
        }

        // 2. Fallback to CSV for JSS1/SS1 if Firestore is empty
        if (currentClassName === 'JSS1') {
          Papa.parse(marksheetCsv, {
            complete: (results) => processCSVData(results.data),
            header: false
          });
        } else if (currentClassName === 'SS1') {
          Papa.parse(ss1MarksheetCsv, {
            complete: (results) => processCSVData(results.data),
            header: false
          });
        } else {
          setData([]);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        // Fallback for demo/startup
        if (currentClassName === 'JSS1') {
          Papa.parse(marksheetCsv, {
            complete: (results) => processCSVData(results.data),
            header: false
          });
        } else if (currentClassName === 'SS1') {
          Papa.parse(ss1MarksheetCsv, {
            complete: (results) => processCSVData(results.data),
            header: false
          });
        } else {
          setLoading(false);
        }
      }
    };

    fetchData();
  }, [selectedClass, selectedSession, selectedTerm]);

  const filteredData = data.filter(student => 
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.rollNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: primaryColor }}></div>
      </div>
    );
  }

  return (
    <div className="marksheet-container">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          >
            {classes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {status.message && (
        <div className={`p-4 rounded-xl flex items-center gap-3 mb-6 animate-in fade-in duration-300 ${
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

      <div className="dashboard-header-stats" style={{ marginBottom: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div className="stat-card">
          <span className="stat-label">Class</span>
          <span className="stat-value">{currentClassName}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Term</span>
          <span className="stat-value">{metaInfo.term || 'N/A'}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Session</span>
          <span className="stat-value">{metaInfo.academicYear || 'N/A'}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Students</span>
          <span className="stat-value">{data.length}</span>
        </div>
      </div>

      <div className="table-actions" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', gap: '16px', flexWrap: 'wrap' }}>
        <div className="search-box" style={{ flex: 1, minWidth: '300px', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
          <input 
            type="text" 
            placeholder="Search student by name or registration number..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '8px', border: '1px solid #ddd' }}
          />
        </div>
        <div className="action-btns" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button className="btn-outline" onClick={handlePublish} disabled={publishing} style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: publishing ? 0.7 : 1 }}>
            {publishing ? <Loader2 size={18} className="animate-spin" /> : <UploadCloud size={18} />}
            Publish Results
          </button>
          <button className="btn-outline" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Printer size={18} /> Print All
          </button>
          <button className="btn-main" style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: primaryColor }}>
            <Download size={18} /> Export Excel
          </button>
        </div>
      </div>

      <div className="marksheet-table-wrapper" style={{ 
        overflow: 'auto', 
        maxHeight: '700px', 
        background: 'white', 
        borderRadius: '12px', 
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' 
      }}>
        <table className="marksheet-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc' }}>
              <th rowSpan="2" style={thStyle}>Roll No.</th>
              <th rowSpan="2" style={thStyle}>Student Name</th>
              {subjects.map((subject, sIdx) => (
                <th key={`${subject.name}-${sIdx}`} colSpan="6" style={{ ...thStyle, textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>
                  {subject.name}
                </th>
              ))}
              <th rowSpan="2" style={thStyle}>Total</th>
              <th rowSpan="2" style={thStyle}>Rank</th>
            </tr>
            <tr style={{ backgroundColor: '#f8fafc' }}>
              {subjects.map((subject, sIdx) => (
                <React.Fragment key={`${subject.name}-${sIdx}-headers`}>
                  <th style={subThStyle}>CAT</th>
                  <th style={subThStyle}>CAT2</th>
                  <th style={subThStyle}>EXAM</th>
                  <th style={subThStyle}>Marks</th>
                  <th style={subThStyle}>%</th>
                  <th style={subThStyle}>Grade</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.map((student, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={tdStyle}>{student.rollNo}</td>
                <td style={{ ...tdStyle, fontWeight: '600' }}>{student.name}</td>
                 {subjects.map((subject, sIdx) => {
                  const sMarks = student.marks[subject.name] || { cat1: 0, cat2: 0, exam: 0, total: 0, percent: 0, grade: 'F' };
                  return (
                    <React.Fragment key={`${student.rollNo}-${subject.name}-${sIdx}`}>
                      <td style={tdStyle}>{sMarks.cat1 || '-'}</td>
                      <td style={tdStyle}>{sMarks.cat2 || '-'}</td>
                      <td style={tdStyle}>{sMarks.exam || '-'}</td>
                      <td style={{ ...tdStyle, fontWeight: '600' }}>{sMarks.total || '-'}</td>
                      <td style={tdStyle}>{sMarks.percent ? `${sMarks.percent}` : (sMarks.total ? `${sMarks.total}%` : '-')}</td>
                      <td style={{ 
                        ...tdStyle, 
                        fontWeight: '700',
                        color: ['A', 'B1', 'B2', 'B3', 'C4', 'C5', 'C6'].includes(sMarks.grade) ? '#10b981' : '#ef4444'
                      }}>
                        {sMarks.grade || '-'}
                      </td>
                    </React.Fragment>
                  );
                })}
                <td style={{ ...tdStyle, fontWeight: '700' }}>{student.totalMarks}</td>
                <td style={tdStyle}>
                  <span style={{ 
                    padding: '4px 8px', 
                    borderRadius: '4px', 
                    backgroundColor: student.rank === '1st' ? '#fef3c7' : '#f1f5f9',
                    color: student.rank === '1st' ? '#92400e' : '#475569',
                    fontWeight: '600'
                  }}>
                    {student.rank}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {filteredData.length === 0 && (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
          No students found matching your search.
        </div>
      )}
    </div>
  );
};

const thStyle = {
  padding: '12px 16px',
  textAlign: 'left',
  fontWeight: '600',
  color: '#475569',
  borderBottom: '2px solid #e2e8f0',
  whiteSpace: 'nowrap'
};

const subThStyle = {
  padding: '8px 16px',
  textAlign: 'center',
  fontWeight: '500',
  color: '#64748b',
  fontSize: '12px',
  borderBottom: '1px solid #e2e8f0'
};

const tdStyle = {
  padding: '12px 16px',
  textAlign: 'center',
  color: '#1e293b',
  whiteSpace: 'nowrap'
};

export default Marksheet;
