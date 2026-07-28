import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import Navbar from '../../components/Navbar';
import Footer from '../../components/MainFooter';
import {
  ClipboardSignature, Loader2, CheckCircle, AlertTriangle, XCircle,
  GraduationCap, Printer, ChevronRight, ChevronLeft, Timer,
  User, BookOpen, FileText, Search, ArrowRight, Clock, Phone,
  Sparkles, Shield,
} from 'lucide-react';
import { db } from '../../lib/firebase';
import {
  collection, addDoc, getDocs, query, orderBy,
  serverTimestamp, doc, getDoc, where, updateDoc,
} from 'firebase/firestore';
import { useTheme } from '../../context/ThemeContext';
import brandLogo from '../../assets/bdslogo.jpg';
import '../home.css';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const generateAppNo = () => {
  const year = new Date().getFullYear();
  const num = Math.floor(1000 + Math.random() * 9000);
  return `BDS/APN/${year}/${num}`;
};
const generateRegNo = () => {
  const year = new Date().getFullYear();
  const num = Math.floor(10000 + Math.random() * 90000);
  return `BDS/${year}/${num}`;
};
const EXAM_DURATION = 30 * 60;
const fmt = (s) =>
  `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

// ─── Barcode ──────────────────────────────────────────────────────────────────
const AppBarcode = ({ value }) => {
  const bars = value.split('').map((c, i) => ({
    w: ((c.charCodeAt(0) % 3) + 1) * 3,
    h: 38 + (c.charCodeAt(0) % 20),
    x: i * 9,
  }));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={bars.length * 9} height={58} style={{ display: 'block' }}>
        {bars.map((b, i) => <rect key={i} x={b.x} y={58 - b.h} width={b.w} height={b.h} fill="#1e293b" />)}
      </svg>
      <span style={{ fontFamily: 'monospace', fontSize: '9px', letterSpacing: '2px', color: '#1e293b', marginTop: 4 }}>{value}</span>
    </div>
  );
};

// ─── Step Indicator ───────────────────────────────────────────────────────────
const STEPS = [
  { key: 'apply', label: 'Apply', Icon: ClipboardSignature },
  { key: 'instructions', label: 'Briefing', Icon: FileText },
  { key: 'cbt', label: 'CBT Exam', Icon: BookOpen },
  { key: 'result', label: 'Result', Icon: GraduationCap },
];
const StepIndicator = ({ currentStep }) => {
  const ci = STEPS.findIndex(s => s.key === currentStep);
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, padding: '28px 0 0' }}>
      {STEPS.map(({ key, label, Icon }, i) => {
        const active = i === ci, done = i < ci;
        return (
          <React.Fragment key={key}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: done ? '#10b981' : active ? 'var(--color-primary)' : 'rgba(255,255,255,0.08)',
                border: `2px solid ${done ? '#10b981' : active ? '#fdba74' : 'rgba(255,255,255,0.15)'}`,
                transition: 'all 0.3s',
              }}>
                {done ? <CheckCircle size={20} color="#fff" /> : <Icon size={16} color={active ? '#fff' : 'rgba(255,255,255,0.35)'} />}
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: active ? '#fdba74' : done ? '#6ee7b7' : 'rgba(255,255,255,0.35)', letterSpacing: '0.5px' }}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ height: 2, width: 56, marginBottom: 26, background: i < ci ? '#10b981' : 'rgba(255,255,255,0.12)', transition: 'background 0.3s' }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ─── Reusable input ───────────────────────────────────────────────────────────
const FInput = ({ label, name, type = 'text', placeholder, value, onChange, required = true, min, max, colSpan, disabled }) => (
  <div style={{ gridColumn: colSpan === 2 ? '1 / -1' : 'auto' }}>
    <label className="home-form-label">{label}</label>
    <input
      type={type} name={name} value={value} onChange={onChange}
      placeholder={placeholder} required={required} min={min} max={max} disabled={disabled}
      className="home-form-input"
      style={{ background: disabled ? '#f1f5f9' : undefined }}
    />
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const AdmissionPortal = () => {
  const { schoolName, schoolLogo } = useTheme();
  const logoUrl = schoolLogo || brandLogo;
  const today = new Date().toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' });

  const [step, setStep] = useState('apply');
  const [mode, setMode] = useState('new');

  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [admissionOpen, setAdmissionOpen] = useState(null);

  const emptyForm = { fullName: '', dateOfBirth: '', gender: '', stateOfOrigin: '', localGovernment: '', phone: '', classApplyingFor: '', previousSchool: '', lastAverage: '' };
  const [formData, setFormData] = useState(emptyForm);
  const [appData, setAppData] = useState(null);
  const [submittingForm, setSubmittingForm] = useState(false);

  const [returnAppNo, setReturnAppNo] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState('');

  const [questions, setQuestions] = useState([]);
  const [loadingQ, setLoadingQ] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(EXAM_DURATION);
  const [examDone, setExamDone] = useState(false);
  const timerRef = useRef(null);
  const submitRef = useRef(null);

  const [result, setResult] = useState(null);

  const defaultClasses = () => [
    { id: 'JSS1', name: 'JSS 1' }, { id: 'JSS2', name: 'JSS 2' }, { id: 'JSS3', name: 'JSS 3' },
    { id: 'SS1', name: 'SS 1' }, { id: 'SS2-SCI', name: 'SS 2 Science' }, { id: 'SS2-ART', name: 'SS 2 Art' },
    { id: 'SS3-SCI', name: 'SS 3 Science' }, { id: 'SS3-ART', name: 'SS 3 Art' },
  ];

  useEffect(() => {
    const init = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'student_permissions'));
        const data = snap.exists() ? snap.data() : {};
        setAdmissionOpen(data.admissionOpen !== false);
      } catch { setAdmissionOpen(true); }
      try {
        const snap = await getDocs(query(collection(db, 'classes'), orderBy('name')));
        setClasses(snap.empty ? defaultClasses() : snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch { setClasses(defaultClasses()); }
      finally { setLoadingClasses(false); }
    };
    init();
  }, []);

  // Timer
  useEffect(() => {
    if (step !== 'cbt' || examDone) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); submitRef.current?.(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [step, examDone]);

  const handleApply = async (e) => {
    e.preventDefault();
    setSubmittingForm(true);
    try {
      const appNo = generateAppNo();
      const docRef = await addDoc(collection(db, 'admissions'), {
        ...formData, appNo, cbtCompleted: false, cbtScore: null,
        admissionStatus: 'pending', createdAt: serverTimestamp(),
      });
      setAppData({ appNo, docId: docRef.id, applicant: { ...formData, appNo } });
      setStep('instructions');
    } catch { alert('Submission failed. Please try again.'); }
    finally { setSubmittingForm(false); }
  };

  const handleLookup = async (e) => {
    e.preventDefault();
    setLookingUp(true); setLookupError('');
    try {
      const q = query(collection(db, 'admissions'), where('appNo', '==', returnAppNo.trim().toUpperCase()));
      const snap = await getDocs(q);
      if (snap.empty) { setLookupError('Application number not found. Please check and try again.'); return; }
      const data = { id: snap.docs[0].id, ...snap.docs[0].data() };
      if (data.cbtCompleted) {
        const score = data.cbtScore ?? 0, total = 20, pct = Math.round((score / total) * 100);
        const status = pct >= 50 ? 'granted' : pct >= 40 ? 'trial' : 'rejected';
        setAppData({ appNo: data.appNo, docId: data.id, applicant: data });
        setResult({ score, total, percentage: pct, status, regNo: data.regNo || null });
        setStep('result');
      } else {
        setAppData({ appNo: data.appNo, docId: data.id, applicant: data });
        setStep('instructions');
      }
    } catch { setLookupError('Error looking up application. Please try again.'); }
    finally { setLookingUp(false); }
  };

  const startCBT = async () => {
    setLoadingQ(true);
    try {
      const snap = await getDocs(collection(db, 'admissionQuestions'));
      let qs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (!qs.length) { alert('No exam questions available. Contact the school.'); return; }
      qs = qs.sort(() => Math.random() - 0.5).slice(0, Math.min(20, qs.length));
      setQuestions(qs); setAnswers({}); setCurrentQ(0);
      setTimeLeft(EXAM_DURATION); setExamDone(false); setStep('cbt');
    } catch { alert('Failed to load exam questions. Please try again.'); }
    finally { setLoadingQ(false); }
  };

  const handleSubmitExam = useCallback(async () => {
    if (examDone) return;
    clearInterval(timerRef.current); setExamDone(true);
    const score = questions.reduce((acc, q, i) => acc + (answers[i] === q.correctIndex ? 1 : 0), 0);
    const total = questions.length;
    const percentage = Math.round((score / total) * 100);
    const status = percentage >= 50 ? 'granted' : percentage >= 40 ? 'trial' : 'rejected';
    const regNo = status !== 'rejected' ? generateRegNo() : null;
    try {
      if (appData?.docId) {
        await updateDoc(doc(db, 'admissions', appData.docId), { cbtCompleted: true, cbtScore: score, admissionStatus: status, regNo: regNo || null });
        if (status !== 'rejected' && regNo) {
          await addDoc(collection(db, 'students'), {
            name: appData.applicant.fullName, regNo,
            className: appData.applicant.classApplyingFor,
            dateOfBirth: appData.applicant.dateOfBirth,
            gender: appData.applicant.gender,
            stateOfOrigin: appData.applicant.stateOfOrigin,
            localGovernment: appData.applicant.localGovernment,
            phone: appData.applicant.phone,
            admissionStatus: status, appNo: appData.appNo,
            paidFee: 0, expectedFee: 0,
            createdAt: serverTimestamp(), createdBy: 'admission_portal',
          });
        }
      }
    } catch (err) { console.error(err); }
    setResult({ score, total, percentage, status, regNo });
    setStep('result');
  }, [examDone, questions, answers, appData]);

  submitRef.current = handleSubmitExam;

  const resetAll = () => {
    setStep('apply'); setMode('new'); setResult(null); setAppData(null);
    setFormData(emptyForm); setQuestions([]); setAnswers({});
    setExamDone(false); setReturnAppNo(''); setLookupError('');
  };

  const answeredCount = Object.keys(answers).length;

  // ─── Closed / Loading ─────────────────────────────────────────────────────
  if (admissionOpen === null) return (
    <div className="home-page" style={{ width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Loader2 size={40} style={{ color: 'var(--color-primary)' }} className="admission-spin" />
      </div>
      <Footer />
    </div>
  );

  if (!admissionOpen) return (
    <div className="home-page" style={{ width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <section className="home-hero" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', flex: 1 }}>
        <div className="home-hero-content" style={{ textAlign: 'center', paddingTop: '4rem', paddingBottom: '4rem' }}>
          <div style={{ width: 80, height: 80, background: 'rgba(239,68,68,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <XCircle size={40} style={{ color: '#f87171' }} />
          </div>
          <h1 className="home-hero-title" style={{ fontSize: 'clamp(2rem,4vw,3rem)', marginBottom: 16 }}>Admissions Closed</h1>
          <p className="home-hero-desc" style={{ maxWidth: 440, margin: '0 auto' }}>
            The admission portal is not currently accepting applications. Please check back later or contact the school office.
          </p>
        </div>
      </section>
      <Footer />
    </div>
  );

  // ─── Main ─────────────────────────────────────────────────────────────────
  return (
    <div className="home-page" style={{ width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      {/* ── Hero ── */}
      <section className="home-hero">
        <div className="home-hero-blob-1" />
        <div className="home-hero-blob-2" />
        <div className="home-hero-content" style={{ paddingTop: '3rem', paddingBottom: '0', textAlign: 'center' }}>
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <img src={logoUrl} alt="School Logo" style={{ width: 76, height: 76, borderRadius: 20, objectFit: 'contain', border: '3px solid rgba(255,255,255,0.15)', marginBottom: 20, display: 'block', margin: '0 auto 20px' }} />
            <div className="home-hero-badge" style={{ margin: '0 auto 20px', display: 'inline-flex' }}>
              <Sparkles size={14} />
              {schoolName || 'Birxy SMS'} — Admission Portal
            </div>
            <h1 className="home-hero-title" style={{ fontSize: 'clamp(2rem,5vw,3.5rem)', marginBottom: 12 }}>
              Join Our <span className="home-hero-title-accent">Community</span>
            </h1>
            <p className="home-hero-desc" style={{ maxWidth: 560, margin: '0 auto' }}>
              Apply for admission, take the general assessment CBT, and receive your admission letter — instantly and online.
            </p>
          </motion.div>
          <StepIndicator currentStep={step} />
        </div>
      </section>

      {/* ── Main Content ── */}
      <section className="home-features" style={{ background: 'var(--color-slate-50)', padding: '3rem 0 5rem', flex: 1 }}>
        <div className="home-features-inner" style={{ maxWidth: 800 }}>

          {/* ══════════ STEP 1: APPLY ══════════ */}
          {step === 'apply' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              {/* Tab switcher */}
              <div style={{ display: 'flex', background: '#fff', borderRadius: 20, padding: 6, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', marginBottom: 24 }}>
                {[{ key: 'new', label: 'New Application', Icon: ClipboardSignature },
                  { key: 'returning', label: 'Return Applicant', Icon: Search }].map(({ key, label, Icon }) => (
                  <button key={key} onClick={() => { setMode(key); setLookupError(''); }}
                    style={{
                      flex: 1, padding: '12px 16px', borderRadius: 14, border: 'none', cursor: 'pointer',
                      fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      background: mode === key ? 'var(--color-primary)' : 'transparent',
                      color: mode === key ? '#fff' : '#94a3b8',
                      transition: 'all 0.2s',
                      boxShadow: mode === key ? '0 4px 14px rgba(249,115,22,0.3)' : 'none',
                    }}
                  >
                    <Icon size={15} /> {label}
                  </button>
                ))}
              </div>

              {/* ── New application form ── */}
              {mode === 'new' && (
                <div className="home-testimony-form" style={{ borderRadius: 24 }}>
                  <div className="home-testimony-form-header">
                    <div className="home-testimony-form-icon"><ClipboardSignature size={20} /></div>
                    <h3 className="home-testimony-form-title">Application Form</h3>
                  </div>
                  <p className="home-testimony-form-desc">
                    Fill in your details below. Your unique application number will be generated automatically upon submission.
                  </p>
                  <form onSubmit={handleApply}>
                    {/* Personal Info */}
                    <div style={{ marginBottom: 28 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                        <User size={14} style={{ color: 'var(--color-primary)' }} />
                        <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: '3px', color: 'var(--color-primary)', textTransform: 'uppercase' }}>Personal Information</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <FInput label="Full Legal Name" name="fullName" placeholder="e.g. Adaeze Okonkwo"
                          value={formData.fullName} onChange={e => setFormData(p => ({ ...p, fullName: e.target.value }))} colSpan={2} />
                        <FInput label="Date of Birth" name="dateOfBirth" type="date"
                          value={formData.dateOfBirth} onChange={e => setFormData(p => ({ ...p, dateOfBirth: e.target.value }))} />
                        <div>
                          <label className="home-form-label">Gender</label>
                          <select value={formData.gender} onChange={e => setFormData(p => ({ ...p, gender: e.target.value }))} required className="home-form-input" style={{ cursor: 'pointer' }}>
                            <option value="">Select gender</option>
                            <option>Male</option>
                            <option>Female</option>
                          </select>
                        </div>
                        <FInput label="State of Origin" name="stateOfOrigin" placeholder="e.g. Anambra"
                          value={formData.stateOfOrigin} onChange={e => setFormData(p => ({ ...p, stateOfOrigin: e.target.value }))} />
                        <FInput label="Local Government Area" name="localGovernment" placeholder="e.g. Onitsha North"
                          value={formData.localGovernment} onChange={e => setFormData(p => ({ ...p, localGovernment: e.target.value }))} />
                        <FInput label="Parent / Guardian Phone" name="phone" type="tel" placeholder="e.g. 08012345678"
                          value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} colSpan={2} />
                      </div>
                    </div>

                    {/* Academic Info */}
                    <div style={{ marginBottom: 32 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                        <BookOpen size={14} style={{ color: 'var(--color-emerald-500)' }} />
                        <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: '3px', color: 'var(--color-emerald-500)', textTransform: 'uppercase' }}>Academic Details</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div>
                          <label className="home-form-label">Class Applying For</label>
                          <select value={formData.classApplyingFor} onChange={e => setFormData(p => ({ ...p, classApplyingFor: e.target.value }))} required disabled={loadingClasses} className="home-form-input" style={{ cursor: 'pointer' }}>
                            <option value="">{loadingClasses ? 'Loading...' : 'Select class'}</option>
                            {classes.map(c => <option key={c.id} value={c.name || c.id}>{c.name || c.id}</option>)}
                          </select>
                        </div>
                        <FInput label="Previous School" name="previousSchool" placeholder="e.g. St. Joseph Primary"
                          value={formData.previousSchool} onChange={e => setFormData(p => ({ ...p, previousSchool: e.target.value }))} />
                        <FInput label="Last Term Average (%)" name="lastAverage" type="number" placeholder="e.g. 75" min="0" max="100"
                          value={formData.lastAverage} onChange={e => setFormData(p => ({ ...p, lastAverage: e.target.value }))} />
                      </div>
                    </div>

                    <button type="submit" disabled={submittingForm || loadingClasses} className="home-form-submit">
                      {submittingForm ? <><Loader2 size={18} className="admission-spin" /> Generating Application...</> : <>Submit & Get Application Number <ArrowRight size={18} /></>}
                    </button>
                  </form>
                </div>
              )}

              {/* ── Return applicant lookup ── */}
              {mode === 'returning' && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                  <div className="home-testimony-form" style={{ borderRadius: 24, textAlign: 'center' }}>
                    <div style={{ width: 64, height: 64, background: 'rgba(249,115,22,0.1)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                      <Search size={28} style={{ color: 'var(--color-primary)' }} />
                    </div>
                    <h3 className="home-testimony-form-title">Continue Your Application</h3>
                    <p className="home-testimony-form-desc" style={{ maxWidth: 380, margin: '0 auto 28px' }}>
                      Enter your application number to access your CBT exam or view your admission result.
                    </p>
                    <form onSubmit={handleLookup} style={{ maxWidth: 420, margin: '0 auto' }}>
                      <input value={returnAppNo} onChange={e => setReturnAppNo(e.target.value)}
                        placeholder="BDS/APN/2025/4721" required className="home-form-input"
                        style={{ textAlign: 'center', fontFamily: 'monospace', letterSpacing: '1px', fontSize: 16, marginBottom: 12 }}
                        onFocus={e => e.target.style.borderColor = 'var(--color-primary)'}
                        onBlur={e => e.target.style.borderColor = ''}
                      />
                      {lookupError && (
                        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '10px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left' }}>
                          <XCircle size={15} style={{ color: '#ef4444', flexShrink: 0 }} />
                          <p style={{ fontSize: 13, color: '#dc2626', margin: 0 }}>{lookupError}</p>
                        </div>
                      )}
                      <button type="submit" disabled={lookingUp} className="home-form-submit">
                        {lookingUp ? <><Loader2 size={18} className="admission-spin" /> Looking up...</> : <><Search size={18} /> Find My Application</>}
                      </button>
                    </form>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ══════════ STEP 2: INSTRUCTIONS ══════════ */}
          {step === 'instructions' && appData && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* App No display — dark glass card */}
              <div className="glass-morphism" style={{ borderRadius: 24, padding: '40px 36px', textAlign: 'center', background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="home-hero-badge" style={{ margin: '0 auto 20px', display: 'inline-flex' }}>
                  <Sparkles size={14} /> Application Received
                </div>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: 14 }}>
                  Your Application Number
                </p>
                <div style={{ background: 'rgba(249,115,22,0.1)', border: '2px solid rgba(249,115,22,0.3)', borderRadius: 16, padding: '20px 32px', display: 'inline-block', marginBottom: 18 }}>
                  <p style={{ fontSize: 28, fontWeight: 900, fontFamily: 'monospace', letterSpacing: '3px', margin: 0, color: '#fdba74' }}>
                    {appData.appNo}
                  </p>
                </div>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: 0 }}>
                  ⚠️ Save this number — you'll need it to access your result later.
                </p>
              </div>

              {/* CBT Rules card */}
              <div className="home-testimony-form" style={{ borderRadius: 24 }}>
                <div className="home-testimony-form-header">
                  <div className="home-testimony-form-icon"><BookOpen size={20} /></div>
                  <h3 className="home-testimony-form-title">CBT Examination Briefing</h3>
                </div>
                <p className="home-testimony-form-desc">
                  You are about to take the <strong>General Assessment Examination</strong> for admission into <strong>{schoolName || 'the school'}</strong>. Read these instructions carefully:
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
                  {[
                    { Icon: FileText, label: '20 Questions', desc: 'English, Maths & General Knowledge', color: 'var(--color-indigo-500)', bg: 'var(--color-indigo-50)' },
                    { Icon: Clock, label: '30 Minutes', desc: 'Timer auto-submits on timeout', color: 'var(--color-amber-500)', bg: 'var(--color-amber-50)' },
                    { Icon: CheckCircle, label: 'Pass Mark: 50%', desc: '10 or more correct to be admitted', color: 'var(--color-emerald-500)', bg: 'var(--color-emerald-50)' },
                    { Icon: GraduationCap, label: 'Instant Letter', desc: 'Admission letter on pass', color: 'var(--color-primary)', bg: 'var(--color-primary-light)' },
                  ].map(({ Icon, label, desc, color, bg }) => (
                    <div key={label} style={{ background: bg, borderRadius: 14, padding: '16px 18px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ width: 36, height: 36, background: '#fff', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                        <Icon size={17} style={{ color }} />
                      </div>
                      <div>
                        <p style={{ fontWeight: 900, fontSize: 13, color: '#0f172a', margin: '0 0 3px' }}>{label}</p>
                        <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ background: '#fffbeb', border: '1px solid #fef08a', borderRadius: 12, padding: '12px 16px', marginBottom: 24, display: 'flex', gap: 10 }}>
                  <AlertTriangle size={16} style={{ color: '#d97706', flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: 13, color: '#92400e', margin: 0, lineHeight: 1.6 }}>
                    <strong>Important:</strong> Once started, the timer runs continuously. Do not refresh or close the page.
                  </p>
                </div>
                <button onClick={startCBT} disabled={loadingQ} className="home-form-submit" style={{ background: '#059669' }}>
                  {loadingQ ? <><Loader2 size={18} className="admission-spin" /> Loading Questions...</> : <><BookOpen size={18} /> Start CBT Examination</>}
                </button>
              </div>
            </motion.div>
          )}

          {/* ══════════ STEP 3: CBT EXAM ══════════ */}
          {step === 'cbt' && questions.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              {/* Timer bar — dark glass */}
              <div className="glass-morphism" style={{
                borderRadius: 20, padding: '16px 28px', marginBottom: 20,
                background: timeLeft < 300 ? 'rgba(220,38,38,0.9)' : 'rgba(15,23,42,0.9)',
                border: `1px solid ${timeLeft < 300 ? 'rgba(248,113,113,0.3)' : 'rgba(255,255,255,0.1)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                transition: 'all 0.5s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <Timer size={22} style={{ color: timeLeft < 300 ? '#fca5a5' : '#fdba74' }} />
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', margin: '0 0 2px' }}>Time Remaining</p>
                    <p style={{ fontSize: 30, fontWeight: 900, fontFamily: 'monospace', color: '#fff', margin: 0, lineHeight: 1 }}>{fmt(timeLeft)}</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', margin: '0 0 2px' }}>Answered</p>
                  <p style={{ fontSize: 28, fontWeight: 900, color: '#fff', margin: 0 }}>
                    {answeredCount}<span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 17 }}>/{questions.length}</span>
                  </p>
                </div>
              </div>

              {/* Question card */}
              <div className="home-testimony-form" style={{ borderRadius: 24, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <span style={{ fontSize: 12, fontWeight: 900, color: 'var(--color-primary)', letterSpacing: '2px', textTransform: 'uppercase' }}>
                    Question {currentQ + 1} of {questions.length}
                  </span>
                  {answers[currentQ] !== undefined && (
                    <span style={{ background: '#dcfce7', color: '#15803d', fontSize: 12, fontWeight: 800, padding: '4px 14px', borderRadius: 100 }}>✓ Answered</span>
                  )}
                </div>
                <p style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', lineHeight: 1.65, marginBottom: 24 }}>
                  {questions[currentQ]?.prompt}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {questions[currentQ]?.options.map((opt, i) => {
                    const sel = answers[currentQ] === i;
                    return (
                      <button key={i} onClick={() => setAnswers(p => ({ ...p, [currentQ]: i }))}
                        style={{
                          padding: '14px 20px', borderRadius: 14,
                          border: `2px solid ${sel ? 'var(--color-primary)' : '#e2e8f0'}`,
                          background: sel ? 'var(--color-primary-light)' : '#f8fafc',
                          cursor: 'pointer', textAlign: 'left',
                          display: 'flex', alignItems: 'center', gap: 14,
                          fontWeight: sel ? 800 : 600, fontSize: 14,
                          color: sel ? 'var(--color-primary-dark)' : '#374151',
                          boxShadow: sel ? '0 4px 14px rgba(249,115,22,0.2)' : 'none',
                          transition: 'all 0.15s',
                        }}
                      >
                        <span style={{
                          width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                          background: sel ? 'var(--color-primary)' : '#e2e8f0',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 900,
                          color: sel ? '#fff' : '#64748b',
                        }}>
                          {String.fromCharCode(65 + i)}
                        </span>
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Question dots */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 16 }}>
                {questions.map((_, i) => (
                  <button key={i} onClick={() => setCurrentQ(i)}
                    style={{
                      width: 36, height: 36, borderRadius: '50%', border: 'none', cursor: 'pointer',
                      fontWeight: 800, fontSize: 12,
                      background: i === currentQ ? 'var(--color-primary)' : answers[i] !== undefined ? '#10b981' : '#e2e8f0',
                      color: i === currentQ || answers[i] !== undefined ? '#fff' : '#64748b',
                      boxShadow: i === currentQ ? 'var(--shadow-orange)' : 'none',
                      transform: i === currentQ ? 'scale(1.15)' : 'scale(1)',
                      transition: 'all 0.15s',
                    }}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>

              {/* Prev / Next / Submit */}
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => setCurrentQ(p => Math.max(0, p - 1))} disabled={currentQ === 0}
                  style={{ flex: 1, padding: '14px', borderRadius: 14, border: '2px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 800, fontSize: 14, cursor: currentQ === 0 ? 'not-allowed' : 'pointer', opacity: currentQ === 0 ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <ChevronLeft size={18} /> Previous
                </button>
                {currentQ < questions.length - 1 ? (
                  <button onClick={() => setCurrentQ(p => Math.min(questions.length - 1, p + 1))}
                    style={{ flex: 2, padding: '14px', borderRadius: 14, border: 'none', background: 'var(--color-primary)', color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: 'var(--shadow-orange)' }}>
                    Next <ChevronRight size={18} />
                  </button>
                ) : (
                  <button onClick={() => {
                    const u = questions.length - answeredCount;
                    if (u > 0 && !window.confirm(`${u} question(s) unanswered. Submit anyway?`)) return;
                    handleSubmitExam();
                  }}
                    style={{ flex: 2, padding: '14px', borderRadius: 14, border: 'none', background: '#059669', color: '#fff', fontWeight: 900, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 14px rgba(5,150,105,0.4)' }}>
                    <CheckCircle size={18} /> Submit Exam
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* ══════════ STEP 4: RESULT ══════════ */}
          {step === 'result' && result && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Score summary */}
              <div className="home-testimony-form" style={{ borderRadius: 24, textAlign: 'center' }}>
                <div style={{
                  width: 80, height: 80, borderRadius: '50%', margin: '0 auto 16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: result.status === 'granted' ? '#f0fdf4' : result.status === 'trial' ? '#fffbeb' : '#fef2f2',
                }}>
                  {result.status === 'granted' && <CheckCircle size={44} style={{ color: '#10b981' }} />}
                  {result.status === 'trial' && <AlertTriangle size={44} style={{ color: '#f59e0b' }} />}
                  {result.status === 'rejected' && <XCircle size={44} style={{ color: '#ef4444' }} />}
                </div>
                <div style={{ display: 'inline-block', marginBottom: 16 }}>
                  <span style={{
                    display: 'inline-block', padding: '5px 18px', borderRadius: 100, fontWeight: 900, fontSize: 12, letterSpacing: '2px', textTransform: 'uppercase',
                    background: result.status === 'granted' ? '#dcfce7' : result.status === 'trial' ? '#fef9c3' : '#fee2e2',
                    color: result.status === 'granted' ? '#15803d' : result.status === 'trial' ? '#854d0e' : '#b91c1c',
                  }}>
                    {result.status === 'granted' ? 'Admission Granted' : result.status === 'trial' ? 'Provisional Admission' : 'Not Admitted'}
                  </span>
                </div>
                <h2 className="home-testimony-form-title" style={{ fontSize: 24, marginBottom: 8 }}>
                  {result.status === 'granted' ? 'Congratulations! 🎉' : result.status === 'trial' ? 'Provisional Admission' : 'Application Unsuccessful'}
                </h2>
                <p className="home-testimony-form-desc" style={{ maxWidth: 440, margin: '0 auto 28px' }}>
                  {result.status === 'granted' ? 'You passed the admission assessment. Your letter is ready below.'
                    : result.status === 'trial' ? 'Your score qualifies you for a provisional admission period.'
                    : 'Your score did not meet the minimum threshold. You may re-apply when admissions re-open.'}
                </p>
                <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 0 }}>
                  {[
                    { label: 'Score', value: `${result.score}/${result.total}`, mono: true },
                    { label: 'Percentage', value: `${result.percentage}%`, color: result.status === 'granted' ? '#10b981' : result.status === 'trial' ? '#f59e0b' : '#ef4444' },
                    ...(appData?.appNo ? [{ label: 'App No', value: appData.appNo, mono: true, small: true }] : []),
                  ].map(({ label, value, mono, color, small }) => (
                    <div key={label} style={{ background: 'var(--color-slate-50)', borderRadius: 16, padding: '16px 24px', border: '1px solid #e2e8f0', minWidth: 100 }}>
                      <p style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', letterSpacing: '2px', textTransform: 'uppercase', margin: '0 0 6px' }}>{label}</p>
                      <p style={{ fontSize: small ? 14 : 28, fontWeight: 900, color: color || '#0f172a', margin: 0, fontFamily: mono ? 'monospace' : 'inherit' }}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Admission Letter */}
              {(result.status === 'granted' || result.status === 'trial') && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <p style={{ fontWeight: 900, fontSize: 11, letterSpacing: '3px', textTransform: 'uppercase', color: '#64748b', margin: 0 }}>Official Admission Letter</p>
                    <button onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#0f172a', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 12, fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,0,0,0.2)' }}>
                      <Printer size={15} /> Print Letter
                    </button>
                  </div>
                  <div id="admission-letter" style={{ background: '#fff', borderRadius: 22, boxShadow: '0 20px 60px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0', fontFamily: 'Georgia, serif', overflow: 'hidden' }}>
                    <div style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', padding: '28px 36px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <img src={logoUrl} alt="Logo" style={{ width: 52, height: 52, borderRadius: 12, objectFit: 'contain', border: '2px solid rgba(255,255,255,0.2)' }} />
                        <div>
                          <p style={{ color: '#fff', fontWeight: 900, fontSize: 16, textTransform: 'uppercase', margin: 0, fontFamily: 'Arial' }}>{schoolName || 'Birxy School'}</p>
                          <p style={{ color: '#94a3b8', fontSize: 11, margin: '3px 0 0', fontFamily: 'Arial', letterSpacing: '1.5px', fontWeight: 700 }}>ADMISSION OFFICE</p>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ color: '#94a3b8', fontSize: 10, fontFamily: 'Arial', fontWeight: 700, margin: 0, letterSpacing: '1.5px' }}>DATE ISSUED</p>
                        <p style={{ color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: 'Arial', margin: '3px 0 0' }}>{today}</p>
                      </div>
                    </div>
                    <div style={{ background: result.status === 'granted' ? '#059669' : '#d97706', padding: '9px 36px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p style={{ color: '#fff', fontWeight: 900, fontSize: 11, letterSpacing: '4px', margin: 0, fontFamily: 'Arial' }}>
                        {result.status === 'granted' ? 'OFFER OF ADMISSION' : 'PROVISIONAL ADMISSION'}
                      </p>
                      <p style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 700, fontSize: 11, margin: 0, fontFamily: 'monospace' }}>{appData?.appNo}</p>
                    </div>
                    <div style={{ padding: '36px' }}>
                      <p style={{ fontFamily: 'Arial', marginBottom: 20, color: '#334155', fontSize: 14, lineHeight: 1.8 }}>Dear <strong>{appData?.applicant?.fullName || 'Applicant'}</strong>,</p>
                      {result.status === 'granted' ? (
                        <>
                          <p style={{ fontSize: 14, lineHeight: 1.9, color: '#475569', fontFamily: 'Arial', marginBottom: 16 }}>We are delighted to inform you that following your <strong>General Assessment Examination</strong>, you have been <strong>OFFERED ADMISSION</strong> into <strong>{schoolName || 'our school'}</strong> for <strong>{appData?.applicant?.classApplyingFor}</strong> for the upcoming academic session.</p>
                          <p style={{ fontSize: 14, lineHeight: 1.9, color: '#475569', fontFamily: 'Arial', marginBottom: 16 }}>Your CBT score of <strong>{result.score}/{result.total} ({result.percentage}%)</strong> demonstrates a strong academic foundation. You are expected to report to the school office within <strong>14 working days</strong> to complete your registration.</p>
                          <p style={{ fontSize: 14, lineHeight: 1.9, color: '#475569', fontFamily: 'Arial' }}>Please bring this letter along with your <strong>Birth Certificate</strong>, <strong>Previous School Report Card</strong>, and <strong>2 Passport Photographs</strong> to the Bursary office to finalise enrollment.</p>
                        </>
                      ) : (
                        <>
                          <p style={{ fontSize: 14, lineHeight: 1.9, color: '#475569', fontFamily: 'Arial', marginBottom: 16 }}>Following your <strong>General Assessment Examination</strong>, you have been offered a <strong>PROVISIONAL (TRIAL) ADMISSION</strong> into <strong>{schoolName || 'our school'}</strong> for <strong>{appData?.applicant?.classApplyingFor}</strong>.</p>
                          <p style={{ fontSize: 14, lineHeight: 1.9, color: '#475569', fontFamily: 'Arial' }}>Your score of <strong>{result.score}/{result.total} ({result.percentage}%)</strong> places you on a monitored trial period. Performance will be reviewed at end of first term.</p>
                        </>
                      )}
                      <div style={{ marginTop: 24, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', padding: '20px 24px' }}>
                        <p style={{ fontSize: 10, fontWeight: 900, letterSpacing: '3px', textTransform: 'uppercase', color: '#94a3b8', marginBottom: 12, fontFamily: 'Arial' }}>Applicant Details</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 28px' }}>
                          {[
                            ['Full Name', appData?.applicant?.fullName],
                            ['Date of Birth', appData?.applicant?.dateOfBirth],
                            ['Gender', appData?.applicant?.gender],
                            ['State of Origin', appData?.applicant?.stateOfOrigin],
                            ['Class Admitted', appData?.applicant?.classApplyingFor],
                            ['CBT Score', `${result.score}/${result.total} (${result.percentage}%)`],
                            ...(result.regNo ? [['Registration No.', result.regNo]] : []),
                            ['Application No.', appData?.appNo],
                          ].map(([label, value]) => (
                            <div key={label} style={{ display: 'flex', gap: 8, fontSize: 13, fontFamily: 'Arial', padding: '5px 0', borderBottom: '1px solid #f1f5f9' }}>
                              <span style={{ color: '#94a3b8', fontWeight: 700, minWidth: 130 }}>{label}:</span>
                              <span style={{ color: '#0f172a', fontWeight: 900 }}>{value || '—'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 32, paddingTop: 24, borderTop: '1px solid #e2e8f0' }}>
                        <AppBarcode value={appData?.appNo || 'BDS'} />
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ height: 1, width: 180, background: '#94a3b8', marginBottom: 7, marginLeft: 'auto' }} />
                          <p style={{ fontSize: 12, fontWeight: 700, color: '#64748b', fontFamily: 'Arial', margin: 0 }}>Principal / Admission Officer</p>
                          <p style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'Arial', margin: '3px 0 0' }}>{schoolName || 'Birxy SMS'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {result.status === 'rejected' && (
                <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #fecaca', padding: '24px 28px' }}>
                  <p style={{ fontWeight: 800, color: '#dc2626', marginBottom: 8 }}>Your application was not successful this time.</p>
                  <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.8, margin: 0 }}>A minimum score of 50% (10/20) is required for admission. You may re-apply when admissions re-open.</p>
                </div>
              )}

              <button onClick={resetAll} className="home-form-submit" style={{ background: 'transparent', color: '#64748b', border: '2px solid #e2e8f0', boxShadow: 'none' }}>
                Submit Another Application
              </button>
            </motion.div>
          )}
        </div>
      </section>

      <Footer />

      <style>{`
        .admission-spin { animation: adm-spin 1s linear infinite; display: inline-block; }
        @keyframes adm-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media print {
          body > *:not(#root) { display: none; }
          nav, footer, button, .home-hero, .home-features { display: none !important; }
          #admission-letter { display: block !important; box-shadow: none !important; border: none !important; }
          body { background: white; }
        }
      `}</style>
    </div>
  );
};

export default AdmissionPortal;
