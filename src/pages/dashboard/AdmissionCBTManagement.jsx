import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { ensureFirebaseAuth } from '../../lib/ensureAuth';
import {
  collection, addDoc, getDocs, deleteDoc, doc, updateDoc, serverTimestamp, getDoc, setDoc, writeBatch
} from 'firebase/firestore';
import {
  Plus, Trash2, Edit3, Save, X, Loader2, BookOpen,
  CheckCircle2, AlertCircle, Wand2, ChevronDown, ChevronUp, Clock, Calendar, Filter, Upload, Download, FileSpreadsheet
} from 'lucide-react';
import Papa from 'papaparse';
import { parseQuestionsCsv } from '../../utils/csvQuestionParser';

// ─── 20 default seed questions ────────────────────────────────────────────────
const DEFAULT_QUESTIONS = [
  { prompt: 'What is the capital city of Nigeria?', options: ['Lagos', 'Abuja', 'Kano', 'Port Harcourt'], correctIndex: 1, targetClass: 'All' },
  { prompt: 'Which of these numbers is a prime number?', options: ['4', '6', '7', '9'], correctIndex: 2, targetClass: 'All' },
  { prompt: 'Who wrote the novel "Things Fall Apart"?', options: ['Wole Soyinka', 'Chinua Achebe', 'Chimamanda Ngozi Adichie', 'Ben Okri'], correctIndex: 1, targetClass: 'All' },
  { prompt: 'What is 15 × 8?', options: ['100', '110', '120', '130'], correctIndex: 2, targetClass: 'All' },
  { prompt: 'Which planet is closest to the Sun?', options: ['Venus', 'Earth', 'Mars', 'Mercury'], correctIndex: 3, targetClass: 'All' },
  { prompt: 'Complete the proverb: "A stitch in time saves ___"', options: ['seven', 'eight', 'nine', 'ten'], correctIndex: 2, targetClass: 'All' },
  { prompt: 'What is the square root of 144?', options: ['10', '11', '12', '13'], correctIndex: 2, targetClass: 'All' },
  { prompt: 'How many states are in Nigeria?', options: ['34', '36', '38', '40'], correctIndex: 1, targetClass: 'All' },
  { prompt: 'Which of these is a renewable energy source?', options: ['Coal', 'Petroleum', 'Solar Energy', 'Natural Gas'], correctIndex: 2, targetClass: 'All' },
  { prompt: 'What is the plural of the word "child"?', options: ['Childs', 'Childrens', 'Children', 'Childes'], correctIndex: 2, targetClass: 'All' },
  { prompt: 'Which river is the longest in Africa?', options: ['Congo River', 'Niger River', 'Nile River', 'Zambezi River'], correctIndex: 2, targetClass: 'All' },
  { prompt: 'What is 25% of 400?', options: ['50', '75', '100', '125'], correctIndex: 2, targetClass: 'All' },
  { prompt: 'Which of these animals is a mammal?', options: ['Eagle', 'Dolphin', 'Crocodile', 'Tilapia'], correctIndex: 1, targetClass: 'All' },
  { prompt: 'Identify the verb in the sentence: "The girl sings beautifully."', options: ['girl', 'The', 'sings', 'beautifully'], correctIndex: 2, targetClass: 'All' },
  { prompt: 'What is the chemical formula for water?', options: ['CO₂', 'O₂', 'H₂O', 'NaCl'], correctIndex: 2, targetClass: 'All' },
  { prompt: 'How many minutes are in 3 hours?', options: ['150', '180', '200', '210'], correctIndex: 1, targetClass: 'All' },
  { prompt: 'Which of these is the largest continent on Earth?', options: ['Africa', 'Europe', 'Asia', 'South America'], correctIndex: 2, targetClass: 'All' },
  { prompt: 'A trader buys goods for ₦600 and sells for ₦750. What is the profit?', options: ['₦100', '₦150', '₦200', '₦250'], correctIndex: 1, targetClass: 'All' },
  { prompt: 'Which of these is NOT a primary colour in art?', options: ['Red', 'Blue', 'Green', 'Yellow'], correctIndex: 2, targetClass: 'All' },
  { prompt: 'What is the next number in the sequence: 2, 4, 8, 16, ___?', options: ['24', '28', '30', '32'], correctIndex: 3, targetClass: 'All' },
];

const AVAILABLE_CLASSES = [
  { id: 'All', name: 'All Classes (General)' },
  { id: 'JSS 1', name: 'JSS 1' },
  { id: 'JSS 2', name: 'JSS 2' },
  { id: 'JSS 3', name: 'JSS 3' },
  { id: 'SS 1', name: 'SS 1' },
  { id: 'SS 2 Science', name: 'SS 2 Science' },
  { id: 'SS 2 Art', name: 'SS 2 Art' },
  { id: 'SS 3 Science', name: 'SS 3 Science' },
  { id: 'SS 3 Art', name: 'SS 3 Art' },
];

const blankQ = () => ({ prompt: '', options: ['', '', '', ''], correctIndex: 0, targetClass: 'All' });

const AdmissionCBTManagement = () => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Settings state
  const [examDuration, setExamDuration] = useState(30);
  const [examScheduleActive, setExamScheduleActive] = useState(false);
  const [examStartDate, setExamStartDate] = useState('');
  const [examEndDate, setExamEndDate] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  // Filters & Status
  const [classFilter, setClassFilter] = useState('All');
  const [status, setStatus] = useState({ type: '', msg: '' });

  // Edit modal
  const [editQ, setEditQ] = useState(null);   // null = closed, or question object
  const [editId, setEditId] = useState('');    // Firestore doc id when editing existing
  const [expandedId, setExpandedId] = useState('');

  const showStatus = (type, msg) => {
    setStatus({ type, msg });
    setTimeout(() => setStatus({ type: '', msg: '' }), 3500);
  };

  // ─── Load ────────────────────────────────────────────────────────────────
  const load = async () => {
    setLoading(true);
    try {
      await ensureFirebaseAuth();
    } catch (e) {
      console.warn('Auth warning:', e);
    }

    try {
      const snap = await getDocs(collection(db, 'admissionQuestions'));
      setQuestions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Error fetching questions:', err);
    }

    try {
      const settingsSnap = await getDoc(doc(db, 'settings', 'student_permissions'));
      if (settingsSnap.exists()) {
        const data = settingsSnap.data();
        if (data.examDurationMinutes) setExamDuration(data.examDurationMinutes);
        if (data.examScheduleActive !== undefined) setExamScheduleActive(!!data.examScheduleActive);
        if (data.examStartDate) setExamStartDate(data.examStartDate);
        if (data.examEndDate) setExamEndDate(data.examEndDate);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // ─── Seed defaults ────────────────────────────────────────────────────────
  const seedDefaults = async () => {
    if (!window.confirm(`This will add ${DEFAULT_QUESTIONS.length} default questions. Continue?`)) return;
    setSeeding(true);
    try {
      await ensureFirebaseAuth();
      for (const q of DEFAULT_QUESTIONS) {
        await addDoc(collection(db, 'admissionQuestions'), { ...q, createdAt: serverTimestamp() });
      }
      showStatus('success', `${DEFAULT_QUESTIONS.length} default questions added.`);
      load();
    } catch { showStatus('error', 'Failed to seed questions.'); }
    finally { setSeeding(false); }
  };

  // ─── Save question ────────────────────────────────────────────────────────
  const saveQuestion = async () => {
    if (!editQ.prompt.trim()) { showStatus('error', 'Question text is required.'); return; }
    if (editQ.options.some((o) => !o.trim())) { showStatus('error', 'All 4 options are required.'); return; }
    setSaving(true);
    try {
      await ensureFirebaseAuth();
      const payload = {
        prompt: editQ.prompt.trim(),
        options: editQ.options.map((o) => o.trim()),
        correctIndex: Number(editQ.correctIndex),
        targetClass: editQ.targetClass || 'All',
      };
      if (editId) {
        await updateDoc(doc(db, 'admissionQuestions', editId), payload);
        showStatus('success', 'Question updated.');
      } else {
        await addDoc(collection(db, 'admissionQuestions'), { ...payload, createdAt: serverTimestamp() });
        showStatus('success', 'Question added.');
      }
      setEditQ(null);
      setEditId('');
      load();
    } catch (err) {
      console.error(err);
      showStatus('error', 'Failed to save question: ' + (err.message || 'Permission error'));
    }
    finally { setSaving(false); }
  };

  // ─── Save settings ────────────────────────────────────────────────────────
  const saveSettings = async () => {
    if (examScheduleActive && examStartDate && examEndDate && new Date(examStartDate) >= new Date(examEndDate)) {
      showStatus('error', 'Schedule start date must be before end date.');
      return;
    }
    setSavingSettings(true);
    try {
      await ensureFirebaseAuth();
      await setDoc(doc(db, 'settings', 'student_permissions'), {
        examDurationMinutes: Number(examDuration),
        examScheduleActive: !!examScheduleActive,
        examStartDate: examStartDate || null,
        examEndDate: examEndDate || null,
      }, { merge: true });
      showStatus('success', 'Exam duration and schedule settings updated.');
    } catch (err) {
      console.error(err);
      showStatus('error', 'Failed to update settings: ' + (err.message || 'Permission error'));
    }
    finally { setSavingSettings(false); }
  };

  // ─── Delete question ──────────────────────────────────────────────────────
  // ─── CSV Download Template ────────────────────────────────────────────────
  const downloadCsvTemplate = () => {
    const csvContent = 'Question,Option A,Option B,Option C,Option D,Correct Answer,Target Class\n' +
      '"What is the capital of Nigeria?","Lagos","Abuja","Kano","Port Harcourt","B","All"\n' +
      '"How many states are in Nigeria?","34","36","38","40","B","All"\n' +
      '"What is 15 multiplied by 8?","100","110","120","130","C","All"\n' +
      '"Which river is the longest in Africa?","Niger River","Nile River","Congo River","Zambezi River","B","All"\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'admission_questions_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ─── CSV Import Questions ────────────────────────────────────────────────
  const handleImportCSV = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setSaving(true);
      const parsedQuestions = await parseQuestionsCsv(file, classFilter !== 'All' ? classFilter : 'All');

      if (!parsedQuestions || parsedQuestions.length === 0) {
        showStatus('error', 'No valid questions found in CSV. Please verify your file format or use the CSV template.');
        return;
      }

      await ensureFirebaseAuth();
      const batch = writeBatch(db);

      parsedQuestions.forEach(q => {
        const docRef = doc(collection(db, 'admissionQuestions'));
        batch.set(docRef, {
          ...q,
          createdAt: serverTimestamp()
        });
      });

      await batch.commit();
      showStatus('success', `Successfully imported ${parsedQuestions.length} admission questions from CSV!`);
      load();
    } catch (err) {
      console.error('CSV import error:', err);
      showStatus('error', 'Failed to import CSV: ' + (err.message || 'Error occurred during parsing'));
    } finally {
      setSaving(false);
      event.target.value = '';
    }
  };

  const deleteQuestion = async (id) => {
    if (!window.confirm('Delete this question?')) return;
    try {
      await ensureFirebaseAuth();
      await deleteDoc(doc(db, 'admissionQuestions', id));
      showStatus('success', 'Question deleted.');
      setQuestions((p) => p.filter((q) => q.id !== id));
    } catch { showStatus('error', 'Failed to delete question.'); }
  };

  const openAdd = () => { setEditQ({ ...blankQ(), targetClass: classFilter !== 'All' ? classFilter : 'All' }); setEditId(''); };
  const openEdit = (q) => { setEditQ({ prompt: q.prompt, options: [...q.options], correctIndex: q.correctIndex, targetClass: q.targetClass || 'All' }); setEditId(q.id); };
  const updateOption = (i, val) => setEditQ((p) => { const o = [...p.options]; o[i] = val; return { ...p, options: o }; });

  const optionLabels = ['A', 'B', 'C', 'D'];

  const filteredQuestions = questions.filter(q => {
    if (classFilter === 'All') return true;
    return (q.targetClass || 'All') === classFilter || q.targetClass === 'All';
  });

  const cardStyle = {
    background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0',
    boxShadow: '0 2px 12px rgba(0,0,0,0.05)', overflow: 'hidden',
    transition: 'box-shadow 0.2s',
  };

  return (
    <div style={{ padding: '28px 24px', maxWidth: 880, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #6366f1, #4f46e5)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(99,102,241,0.35)' }}>
            <BookOpen size={22} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontWeight: 900, fontSize: 22, color: '#0f172a', margin: 0 }}>Admission CBT Management</h1>
            <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>
              {questions.length} question{questions.length !== 1 ? 's' : ''} total · Filter: {classFilter}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button 
            type="button"
            onClick={downloadCsvTemplate}
            title="Download Sample CSV Template for Admission Questions"
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 12, border: '1.5px solid #cbd5e1', background: '#fff', color: '#334155', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
          >
            <Download size={16} color="#6366f1" /> Download CSV Template
          </button>

          <label
            title="Upload CSV containing multiple admission questions"
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 12, border: '1.5px solid #6366f1', background: '#eef2ff', color: '#4f46e5', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}
          >
            <Upload size={16} /> Upload CSV
            <input 
              type="file" 
              accept=".csv" 
              onChange={handleImportCSV} 
              style={{ display: 'none' }} 
            />
          </label>

          {questions.length === 0 && (
            <button onClick={seedDefaults} disabled={seeding}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 12, border: '2px solid #e2e8f0', background: '#fff', color: '#475569', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              {seeding ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Wand2 size={16} />}
              Load Defaults
            </button>
          )}
          <button onClick={openAdd}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: '0 4px 14px rgba(99,102,241,0.3)' }}>
            <Plus size={16} /> Add Question
          </button>
        </div>
      </div>

      {/* ─── Settings Card (Duration & Schedule) ─── */}
      <div style={{ padding: '20px 24px', background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', marginBottom: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <Clock size={18} color="#6366f1" />
          <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0, color: '#0f172a' }}>Exam Schedule & Duration Settings</h3>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, alignItems: 'center' }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>
              Allowed Exam Duration
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="number" min="5" max="180" value={examDuration} onChange={e => setExamDuration(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', width: 90, fontWeight: 700, fontSize: 14 }} />
              <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>minutes</span>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>
              Exam Schedule Window
            </label>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: examScheduleActive ? '#059669' : '#64748b' }}>
              <input type="checkbox" checked={examScheduleActive} onChange={e => setExamScheduleActive(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: '#10b981', cursor: 'pointer' }} />
              Enforce Schedule Window
            </label>
          </div>
        </div>

        {examScheduleActive && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16, paddingTop: 16, borderTop: '1px dashed #e2e8f0' }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: 6 }}>
                Schedule Start (Date & Time)
              </label>
              <input type="datetime-local" value={examStartDate} onChange={e => setExamStartDate(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontWeight: 600, fontSize: 13, color: '#0f172a', boxSizing: 'border-box' }} />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: 6 }}>
                Schedule End (Date & Time)
              </label>
              <input type="datetime-local" value={examEndDate} onChange={e => setExamEndDate(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontWeight: 600, fontSize: 13, color: '#0f172a', boxSizing: 'border-box' }} />
            </div>
          </div>
        )}

        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={saveSettings} disabled={savingSettings}
            style={{ padding: '9px 20px', borderRadius: 10, border: 'none', background: '#10b981', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 8px rgba(16,185,129,0.25)' }}>
            {savingSettings ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />}
            {savingSettings ? 'Saving Settings...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Status toast */}
      {status.msg && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', borderRadius: 12, marginBottom: 20,
          background: status.type === 'success' ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${status.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
          color: status.type === 'success' ? '#15803d' : '#dc2626',
        }}>
          {status.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span style={{ fontWeight: 700, fontSize: 13 }}>{status.msg}</span>
        </div>
      )}

      {/* Class filter bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Filter size={16} color="#64748b" />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>Filter Questions by Class:</span>
        </div>
        <select value={classFilter} onChange={e => setClassFilter(e.target.value)}
          style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid #cbd5e1', fontWeight: 700, fontSize: 13, color: '#0f172a', background: '#fff', cursor: 'pointer' }}>
          {AVAILABLE_CLASSES.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Warn if < 20 for filter */}
      {!loading && filteredQuestions.length > 0 && filteredQuestions.length < 20 && (
        <div style={{ display: 'flex', gap: 10, padding: '12px 18px', background: '#fffbeb', border: '1px solid #fef08a', borderRadius: 12, marginBottom: 20 }}>
          <AlertCircle size={16} style={{ color: '#d97706', flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 13, color: '#92400e', margin: 0 }}>
            You have <strong>{filteredQuestions.length}</strong> question{filteredQuestions.length !== 1 ? 's' : ''} for {classFilter}. The exam requires 20 questions (will supplement with General questions if available).
          </p>
        </div>
      )}

      {/* Questions list */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
          <Loader2 size={32} style={{ color: '#6366f1', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : filteredQuestions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '54px 24px', background: '#fff', borderRadius: 20, border: '2px dashed #e2e8f0' }}>
          <div style={{ width: 64, height: 64, background: '#f1f5f9', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <BookOpen size={28} style={{ color: '#94a3b8' }} />
          </div>
          <h2 style={{ fontWeight: 900, fontSize: 18, color: '#0f172a', marginBottom: 8 }}>No Questions Found for {classFilter}</h2>
          <p style={{ color: '#64748b', fontSize: 14, marginBottom: 24 }}>
            Add questions specifically for this class or select <strong>All Classes</strong>.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={openAdd}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 22px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              <Plus size={16} /> Add Question for {classFilter}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredQuestions.map((q, idx) => (
            <div key={q.id} style={cardStyle}>
              {/* Question row */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', gap: 14, cursor: 'pointer' }}
                onClick={() => setExpandedId(expandedId === q.id ? '' : q.id)}>
                <span style={{ width: 32, height: 32, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: '#6366f1', flexShrink: 0 }}>
                  {idx + 1}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ background: q.targetClass && q.targetClass !== 'All' ? '#e0e7ff' : '#f1f5f9', color: q.targetClass && q.targetClass !== 'All' ? '#4338ca' : '#64748b', fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 6, textTransform: 'uppercase' }}>
                      {q.targetClass || 'All Classes'}
                    </span>
                  </div>
                  <p style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', margin: 0, lineHeight: 1.5 }}>
                    {q.prompt}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span style={{ background: '#dcfce7', color: '#15803d', fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 100 }}>
                    Ans: {optionLabels[q.correctIndex]}
                  </span>
                  <button onClick={(e) => { e.stopPropagation(); openEdit(q); }}
                    style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
                    <Edit3 size={15} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); deleteQuestion(q.id); }}
                    style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid #fecaca', background: '#fef2f2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                    <Trash2 size={15} />
                  </button>
                  {expandedId === q.id ? <ChevronUp size={16} style={{ color: '#94a3b8' }} /> : <ChevronDown size={16} style={{ color: '#94a3b8' }} />}
                </div>
              </div>

              {/* Expanded options */}
              {expandedId === q.id && (
                <div style={{ padding: '0 20px 16px 66px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {q.options.map((opt, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10,
                      background: i === q.correctIndex ? '#f0fdf4' : '#f8fafc',
                      border: `1px solid ${i === q.correctIndex ? '#86efac' : '#f1f5f9'}`,
                    }}>
                      <span style={{ width: 22, height: 22, borderRadius: '50%', background: i === q.correctIndex ? '#10b981' : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: i === q.correctIndex ? '#fff' : '#64748b', flexShrink: 0 }}>
                        {optionLabels[i]}
                      </span>
                      <span style={{ fontSize: 13, color: i === q.correctIndex ? '#15803d' : '#374151', fontWeight: i === q.correctIndex ? 800 : 600 }}>
                        {opt}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Add/Edit Modal ─────────────────────────────────────────────────── */}
      {editQ && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: 580, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 40px 100px rgba(0,0,0,0.25)' }}>
            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 28px', borderBottom: '1px solid #f1f5f9' }}>
              <h2 style={{ fontWeight: 900, fontSize: 18, color: '#0f172a', margin: 0 }}>
                {editId ? 'Edit Question' : 'Add New Question'}
              </h2>
              <button onClick={() => { setEditQ(null); setEditId(''); }}
                style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '24px 28px' }}>
              {/* Target Class dropdown */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', letterSpacing: '2px', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                  Target Class
                </label>
                <select value={editQ.targetClass || 'All'} onChange={e => setEditQ(p => ({ ...p, targetClass: e.target.value }))}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '2px solid #e2e8f0', background: '#f8fafc', fontWeight: 700, fontSize: 14, color: '#0f172a', outline: 'none', boxSizing: 'border-box' }}>
                  {AVAILABLE_CLASSES.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Question text */}
              <label style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', letterSpacing: '2px', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                Question Text
              </label>
              <textarea value={editQ.prompt} onChange={(e) => setEditQ((p) => ({ ...p, prompt: e.target.value }))}
                placeholder="Enter the question here..." rows={3}
                style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '2px solid #e2e8f0', background: '#f8fafc', fontWeight: 600, fontSize: 14, color: '#0f172a', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: 24 }}
                onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />

              {/* Options */}
              <label style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', letterSpacing: '2px', textTransform: 'uppercase', display: 'block', marginBottom: 12 }}>
                Answer Options (select correct answer)
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                {editQ.options.map((opt, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button onClick={() => setEditQ((p) => ({ ...p, correctIndex: i }))}
                      style={{
                        width: 36, height: 36, borderRadius: 10, border: `2px solid ${editQ.correctIndex === i ? '#10b981' : '#e2e8f0'}`,
                        background: editQ.correctIndex === i ? '#10b981' : '#fff',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 900, fontSize: 13, color: editQ.correctIndex === i ? '#fff' : '#64748b',
                        flexShrink: 0, transition: 'all 0.15s',
                      }}
                      title="Set as correct answer"
                    >
                      {optionLabels[i]}
                    </button>
                    <input value={opt} onChange={(e) => updateOption(i, e.target.value)}
                      placeholder={`Option ${optionLabels[i]}...`}
                      style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: `2px solid ${editQ.correctIndex === i ? '#86efac' : '#e2e8f0'}`, background: editQ.correctIndex === i ? '#f0fdf4' : '#f8fafc', fontWeight: 600, fontSize: 14, color: '#0f172a', outline: 'none', boxSizing: 'border-box' }}
                      onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                      onBlur={(e) => e.target.style.borderColor = editQ.correctIndex === i ? '#86efac' : '#e2e8f0'}
                    />
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 20 }}>
                💡 Click the letter button (A, B, C, D) to mark the correct answer.
              </p>

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => { setEditQ(null); setEditId(''); }}
                  style={{ flex: 1, padding: '13px', borderRadius: 12, border: '2px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button onClick={saveQuestion} disabled={saving}
                  style={{ flex: 2, padding: '13px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 14px rgba(99,102,241,0.3)' }}>
                  {saving ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</> : <><Save size={16} /> {editId ? 'Update Question' : 'Save Question'}</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default AdmissionCBTManagement;
