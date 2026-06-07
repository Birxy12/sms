import React, { useState, useEffect, useRef } from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/MainFooter';
import {
  ClipboardSignature, Loader2, CheckCircle, AlertTriangle, XCircle,
  GraduationCap, Printer, Hash, Building2, User, Calendar, MapPin, BookOpen
} from 'lucide-react';
import { db } from '../../lib/firebase';
import {
  collection, addDoc, getDocs, query, orderBy, serverTimestamp, doc, getDoc, setDoc
} from 'firebase/firestore';
import { useTheme } from '../../context/ThemeContext';
import brandLogo from '../../assets/bdslogo.jpg';

// ── Generate alphanumeric application number ─────────────────
const generateAppNo = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const nums = Math.floor(100000 + Math.random() * 900000).toString();
  const sfx = chars[Math.floor(Math.random() * chars.length)] + chars[Math.floor(Math.random() * chars.length)];
  return `BDS/${nums}${sfx}`;
};

// ── Simple barcode-style SVG using application number ────────
const AppBarcode = ({ value }) => {
  const bars = value.split('').map((c, i) => ({
    w: ((c.charCodeAt(0) % 3) + 1) * 3,
    h: 40 + (c.charCodeAt(0) % 20),
    x: i * 9,
  }));
  return (
    <div className="flex flex-col items-center">
      <svg width={bars.length * 9} height={60} style={{ display: 'block' }}>
        {bars.map((b, i) => (
          <rect key={i} x={b.x} y={60 - b.h} width={b.w} height={b.h} fill="#1e293b" />
        ))}
      </svg>
      <span style={{ fontFamily: 'monospace', fontSize: '10px', letterSpacing: '2px', color: '#1e293b', marginTop: '4px' }}>
        {value}
      </span>
    </div>
  );
};

const AdmissionPortal = () => {
  const { schoolName, schoolLogo } = useTheme();
  const logoUrl = schoolLogo || brandLogo;

  const [formData, setFormData] = useState({
    fullName: '', dateOfBirth: '', stateOfOrigin: '',
    localGovernment: '', classApplyingFor: '', lastAverage: '', cbtScore: ''
  });

  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [admissionOpen, setAdmissionOpen] = useState(null); // null = loading
  const [result, setResult] = useState(null);
  const [letterTemplate, setLetterTemplate] = useState('');

  useEffect(() => {
    const fetchAll = async () => {
      // 1. Check admission toggle
      try {
        const ctrlSnap = await getDoc(doc(db, 'settings', 'student_permissions'));
        const ctrl = ctrlSnap.exists() ? ctrlSnap.data() : {};
        setAdmissionOpen(ctrl.admissionOpen !== false); // default open if not set
      } catch { setAdmissionOpen(true); }

      // 2. Classes from DB
      try {
        const snap = await getDocs(query(collection(db, 'classes'), orderBy('name')));
        if (!snap.empty) {
          setClasses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } else {
          setClasses([
            { id: 'JSS1', name: 'JSS1' }, { id: 'JSS2', name: 'JSS2' }, { id: 'JSS3', name: 'JSS3' },
            { id: 'SS1', name: 'SS1' }, { id: 'SS2-SCIENCE', name: 'SS2 SCIENCE' }, { id: 'SS2-ART', name: 'SS2 ART' },
            { id: 'SS3-SCIENCE', name: 'SS3 SCIENCE' }, { id: 'SS3-ART', name: 'SS3 ART' },
          ]);
        }
      } catch {
        setClasses([
          { id: 'JSS1', name: 'JSS1' }, { id: 'JSS2', name: 'JSS2' }, { id: 'JSS3', name: 'JSS3' },
          { id: 'SS1', name: 'SS1' }, { id: 'SS2-SCIENCE', name: 'SS2 SCIENCE' }, { id: 'SS2-ART', name: 'SS2 ART' },
          { id: 'SS3-SCIENCE', name: 'SS3 SCIENCE' }, { id: 'SS3-ART', name: 'SS3 ART' },
        ]);
      } finally { setLoadingClasses(false); }

      // 3. Letter template
      try {
        const tSnap = await getDoc(doc(db, 'admissionLetterTemplates', 'default'));
        if (tSnap.exists()) setLetterTemplate(tSnap.data().body || '');
      } catch { /* no template */ }
    };
    fetchAll();
  }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const score = Number(formData.cbtScore);
      let admissionStatus = score >= 50 ? 'granted' : score >= 45 ? 'trial' : 'rejected';
      const appNo = generateAppNo();

      // Save admission record
      await addDoc(collection(db, 'admissions'), {
        ...formData, admissionStatus, appNo, createdAt: serverTimestamp()
      });

      // If admitted or trial → push to students collection with auto RegNo
      if (admissionStatus === 'granted' || admissionStatus === 'trial') {
        const year = new Date().getFullYear();
        const randId = Math.floor(1000 + Math.random() * 9000);
        const regNo = `BDS/${year}/${String(randId).padStart(3, '0')}`;

        await addDoc(collection(db, 'students'), {
          name: formData.fullName,
          regNo,
          className: formData.classApplyingFor,
          dateOfBirth: formData.dateOfBirth,
          stateOfOrigin: formData.stateOfOrigin,
          localGovernment: formData.localGovernment,
          admissionStatus,
          appNo,
          paidFee: 0,
          expectedFee: 0,
          createdAt: serverTimestamp(),
          createdBy: 'admission_portal',
        });

        setResult({ status: admissionStatus, applicant: { ...formData, appNo, regNo } });
      } else {
        setResult({ status: admissionStatus, applicant: { ...formData, appNo } });
      }
    } catch (error) {
      console.error('Error submitting application:', error);
      alert('Submission failed. Please try again.');
    } finally { setLoading(false); }
  };

  const today = new Date().toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' });

  const statusConfig = {
    granted: {
      icon: <CheckCircle size={52} style={{ color: '#10b981' }} />,
      label: 'ADMISSION GRANTED',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      strip: 'bg-emerald-600',
    },
    trial: {
      icon: <AlertTriangle size={52} style={{ color: '#f59e0b' }} />,
      label: 'PROVISIONAL ADMISSION',
      badge: 'bg-amber-100 text-amber-800 border-amber-200',
      strip: 'bg-amber-500',
    },
    rejected: {
      icon: <XCircle size={52} style={{ color: '#ef4444' }} />,
      label: 'NOT ADMITTED',
      badge: 'bg-rose-100 text-rose-800 border-rose-200',
      strip: 'bg-rose-600',
    },
  };

  // ── Admission closed ─────────────────────────
  if (admissionOpen === null) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={40} className="animate-spin text-indigo-600" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!admissionOpen) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle size={40} style={{ color: '#ef4444' }} />
            </div>
            <h1 className="text-2xl font-black text-slate-900 mb-3">Admission Portal Closed</h1>
            <p className="text-slate-500 leading-relaxed">
              Admissions are currently not open. Please check back later or contact the school for more information.
            </p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f1f5f9' }}>
      <Navbar />

      {/* ── Hero Banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        padding: '48px 24px',
        textAlign: 'center',
        color: '#fff',
      }}>
        <img src={logoUrl} alt="Logo" style={{ width: 64, height: 64, borderRadius: 16, objectFit: 'contain', margin: '0 auto 16px', border: '3px solid rgba(255,255,255,0.2)' }} />
        <p style={{ fontSize: 11, fontWeight: 900, letterSpacing: '4px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 }}>
          {schoolName || 'Birxy SMS'}
        </p>
        <h1 style={{ fontSize: 32, fontWeight: 900, margin: '0 0 8px', letterSpacing: '-1px' }}>Admission Portal</h1>
        <p style={{ color: '#94a3b8', fontSize: 14, maxWidth: 480, margin: '0 auto' }}>
          Complete the form below. Your application number will be generated automatically and an admission letter will be issued instantly.
        </p>
      </div>

      <main style={{ maxWidth: 780, margin: '0 auto', width: '100%', padding: '32px 16px 64px' }}>

        {result ? (
          /* ── RESULT + LETTER ── */
          <div className="space-y-6">
            {/* Status Card */}
            <div style={{
              background: '#fff', borderRadius: 24, overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0'
            }}>
              <div className={`${statusConfig[result.status].strip} py-3 px-6`}>
                <p style={{ color: '#fff', fontWeight: 900, fontSize: 11, letterSpacing: '3px', textTransform: 'uppercase' }}>
                  Application Result
                </p>
              </div>
              <div style={{ padding: '32px', textAlign: 'center' }}>
                {statusConfig[result.status].icon}
                <h2 style={{ fontSize: 24, fontWeight: 900, marginTop: 12, color: '#0f172a' }}>
                  {statusConfig[result.status].label}
                </h2>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
                  <span style={{ background: '#f1f5f9', padding: '6px 16px', borderRadius: 100, fontWeight: 700, fontSize: 12, color: '#475569' }}>
                    App No: <span style={{ fontFamily: 'monospace', color: '#0f172a' }}>{result.applicant.appNo}</span>
                  </span>
                  {result.applicant.regNo && (
                    <span style={{ background: '#eff6ff', padding: '6px 16px', borderRadius: 100, fontWeight: 700, fontSize: 12, color: '#3b82f6' }}>
                      Reg No: <span style={{ fontFamily: 'monospace' }}>{result.applicant.regNo}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Admission Letter */}
            {(result.status === 'granted' || result.status === 'trial') && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <p style={{ fontWeight: 900, fontSize: 11, letterSpacing: '3px', textTransform: 'uppercase', color: '#64748b' }}>
                    Official Admission Letter
                  </p>
                  <button
                    onClick={() => window.print()}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      background: '#0f172a', color: '#fff', border: 'none',
                      padding: '10px 20px', borderRadius: 12, fontWeight: 700, fontSize: 13, cursor: 'pointer'
                    }}
                  >
                    <Printer size={15} /> Print Letter
                  </button>
                </div>

                {/* The Printable Letter */}
                <div id="admission-letter" style={{
                  background: '#fff', borderRadius: 20,
                  boxShadow: '0 20px 60px rgba(0,0,0,0.08)',
                  border: '1px solid #e2e8f0',
                  fontFamily: 'Georgia, serif',
                  overflow: 'hidden'
                }}>
                  {/* Letter Header Bar */}
                  <div style={{
                    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                    padding: '28px 36px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <img src={logoUrl} alt="Logo" style={{ width: 52, height: 52, borderRadius: 10, objectFit: 'contain', border: '2px solid rgba(255,255,255,0.3)' }} />
                      <div>
                        <p style={{ color: '#fff', fontWeight: 900, fontSize: 16, fontFamily: 'Arial, sans-serif', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
                          {schoolName || 'Birxy SMS'}
                        </p>
                        <p style={{ color: '#94a3b8', fontSize: 11, margin: '2px 0 0', fontFamily: 'Arial', letterSpacing: '1px', fontWeight: 700 }}>
                          ADMISSION OFFICE
                        </p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ color: '#94a3b8', fontSize: 11, fontFamily: 'Arial', fontWeight: 700, margin: 0 }}>DATE ISSUED</p>
                      <p style={{ color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: 'Arial', margin: '2px 0 0' }}>{today}</p>
                    </div>
                  </div>

                  {/* Status ribbon */}
                  <div style={{
                    background: result.status === 'granted' ? '#059669' : '#d97706',
                    padding: '8px 36px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <p style={{ color: '#fff', fontWeight: 900, fontSize: 11, letterSpacing: '4px', margin: 0, fontFamily: 'Arial' }}>
                      {result.status === 'granted' ? 'OFFER OF ADMISSION' : 'PROVISIONAL ADMISSION'}
                    </p>
                    <p style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 700, fontSize: 11, margin: 0, fontFamily: 'Arial', fontFamily: 'monospace' }}>
                      {result.applicant.appNo}
                    </p>
                  </div>

                  {/* Letter Body */}
                  <div style={{ padding: '36px' }}>
                    <p style={{ fontFamily: 'Arial', marginBottom: 20, color: '#334155', fontSize: 14 }}>
                      Dear <strong>{result.applicant.fullName}</strong>,
                    </p>

                    {letterTemplate ? (
                      <div style={{ fontSize: 14, lineHeight: '1.8', color: '#475569', fontFamily: 'Arial' }}
                        dangerouslySetInnerHTML={{
                          __html: letterTemplate
                            .replace(/\{studentName\}/g, result.applicant.fullName)
                            .replace(/\{class\}/g, result.applicant.classApplyingFor)
                            .replace(/\{score\}/g, result.applicant.cbtScore)
                            .replace(/\{schoolName\}/g, schoolName || 'our school')
                            .replace(/\{appNo\}/g, result.applicant.appNo)
                            .replace(/\{regNo\}/g, result.applicant.regNo || 'Pending')
                            .replace(/\{date\}/g, today)
                        }}
                      />
                    ) : (
                      <div style={{ fontSize: 14, lineHeight: '1.9', color: '#475569', fontFamily: 'Arial' }}>
                        {result.status === 'granted' ? (
                          <>
                            <p style={{ marginBottom: 16 }}>
                              We are delighted to inform you that following a careful assessment of your entrance examination results,
                              you have been <strong>OFFERED ADMISSION</strong> into <strong>{schoolName || 'our school'}</strong> for{' '}
                              <strong>{result.applicant.classApplyingFor}</strong>.
                            </p>
                            <p style={{ marginBottom: 16 }}>
                              Your CBT score of <strong>{result.applicant.cbtScore}/100</strong> demonstrates a strong academic foundation,
                              and we look forward to nurturing your talents. You are expected to report to the school office within
                              <strong> 14 days</strong> of this letter to complete registration.
                            </p>
                            <p>
                              Please bring this letter along with your <strong>Birth Certificate</strong>, <strong>Previous School Report Card</strong>,
                              and <strong>2 Passport Photographs</strong> to the Bursary office to complete your enrollment.
                            </p>
                          </>
                        ) : (
                          <>
                            <p style={{ marginBottom: 16 }}>
                              Following a review of your entrance examination results, you have been offered a{' '}
                              <strong>PROVISIONAL (TRIAL) ADMISSION</strong> into <strong>{schoolName || 'our school'}</strong> for{' '}
                              <strong>{result.applicant.classApplyingFor}</strong>.
                            </p>
                            <p style={{ marginBottom: 16 }}>
                              Your CBT score of <strong>{result.applicant.cbtScore}/100</strong> places you on a monitored trial period.
                              Your academic performance will be assessed at the end of the first term to determine full admission status.
                            </p>
                            <p>
                              Please report to the school office with required documents to complete your enrollment.
                            </p>
                          </>
                        )}
                      </div>
                    )}

                    {/* Applicant Summary Table */}
                    <div style={{
                      marginTop: 24, background: '#f8fafc', borderRadius: 12,
                      border: '1px solid #e2e8f0', padding: '20px 24px'
                    }}>
                      <p style={{ fontSize: 10, fontWeight: 900, letterSpacing: '3px', textTransform: 'uppercase', color: '#94a3b8', marginBottom: 14, fontFamily: 'Arial' }}>
                        Applicant Details
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px' }}>
                        {[
                          ['Full Name', result.applicant.fullName],
                          ['Date of Birth', result.applicant.dateOfBirth],
                          ['State of Origin', result.applicant.stateOfOrigin],
                          ['Local Government', result.applicant.localGovernment],
                          ['Class Admitted', result.applicant.classApplyingFor],
                          ['CBT Score', `${result.applicant.cbtScore}/100`],
                          ['Reg Number', result.applicant.regNo || 'Pending Assignment'],
                          ['Application No.', result.applicant.appNo],
                        ].map(([label, value]) => (
                          <div key={label} style={{ display: 'flex', gap: 8, fontSize: 13, fontFamily: 'Arial', padding: '4px 0', borderBottom: '1px solid #f1f5f9' }}>
                            <span style={{ color: '#94a3b8', fontWeight: 700, minWidth: 120 }}>{label}:</span>
                            <span style={{ color: '#0f172a', fontWeight: 900 }}>{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Barcode + Signature */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 36, paddingTop: 24, borderTop: '1px solid #e2e8f0' }}>
                      <AppBarcode value={result.applicant.appNo} />
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ height: 1, width: 160, background: '#94a3b8', marginBottom: 6, marginLeft: 'auto' }} />
                        <p style={{ fontSize: 12, fontWeight: 700, color: '#64748b', fontFamily: 'Arial', margin: 0 }}>Principal / Admission Officer</p>
                        <p style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'Arial', margin: '2px 0 0' }}>{schoolName || 'Birxy SMS'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => setResult(null)}
              style={{
                width: '100%', padding: '16px', border: '2px solid #e2e8f0',
                borderRadius: 16, fontWeight: 700, fontSize: 14, color: '#475569',
                background: '#fff', cursor: 'pointer'
              }}
            >
              Submit Another Application
            </button>
          </div>
        ) : (
          /* ── APPLICATION FORM ── */
          <div style={{
            background: '#fff', borderRadius: 24,
            boxShadow: '0 20px 60px rgba(0,0,0,0.07)',
            border: '1px solid #e2e8f0', overflow: 'hidden'
          }}>
            {/* Form Header */}
            <div style={{ padding: '28px 36px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 48, height: 48, background: '#eff6ff', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <ClipboardSignature size={24} style={{ color: '#3b82f6' }} />
              </div>
              <div>
                <h2 style={{ fontWeight: 900, fontSize: 20, color: '#0f172a', margin: 0 }}>Application Form</h2>
                <p style={{ color: '#94a3b8', fontSize: 13, margin: '2px 0 0', fontWeight: 600 }}>
                  Your application number will be auto-generated on submission
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '32px 36px' }}>
              {/* Section: Personal Information */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                  <User size={16} style={{ color: '#6366f1' }} />
                  <p style={{ fontWeight: 900, fontSize: 11, letterSpacing: '3px', color: '#6366f1', textTransform: 'uppercase', margin: 0 }}>
                    Personal Information
                  </p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  {[
                    { label: 'Full Legal Name', name: 'fullName', type: 'text', placeholder: 'e.g. Adaeze Okonkwo', colSpan: 2 },
                    { label: 'Date of Birth', name: 'dateOfBirth', type: 'date', placeholder: '' },
                    { label: 'State of Origin', name: 'stateOfOrigin', type: 'text', placeholder: 'e.g. Anambra' },
                    { label: 'Local Government Area', name: 'localGovernment', type: 'text', placeholder: 'e.g. Onitsha North' },
                  ].map(({ label, name, type, placeholder, colSpan }) => (
                    <div key={name} style={{ gridColumn: colSpan === 2 ? '1 / -1' : 'auto' }}>
                      <label style={{ fontSize: 11, fontWeight: 900, color: '#94a3b8', letterSpacing: '2px', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                        {label}
                      </label>
                      <input type={type} name={name} value={formData[name]} onChange={handleChange}
                        placeholder={placeholder} required
                        style={{
                          width: '100%', padding: '12px 16px', borderRadius: 12,
                          border: '2px solid #f1f5f9', background: '#f8fafc',
                          fontWeight: 700, fontSize: 14, color: '#0f172a', outline: 'none',
                          transition: 'border-color 0.2s', boxSizing: 'border-box'
                        }}
                        onFocus={e => e.target.style.borderColor = '#6366f1'}
                        onBlur={e => e.target.style.borderColor = '#f1f5f9'}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Section: Academic Details */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                  <BookOpen size={16} style={{ color: '#6366f1' }} />
                  <p style={{ fontWeight: 900, fontSize: 11, letterSpacing: '3px', color: '#6366f1', textTransform: 'uppercase', margin: 0 }}>
                    Academic Details
                  </p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 900, color: '#94a3b8', letterSpacing: '2px', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                      Class Applying For
                    </label>
                    <select name="classApplyingFor" value={formData.classApplyingFor} onChange={handleChange}
                      required disabled={loadingClasses}
                      style={{
                        width: '100%', padding: '12px 16px', borderRadius: 12,
                        border: '2px solid #f1f5f9', background: '#f8fafc',
                        fontWeight: 700, fontSize: 14, color: '#0f172a', outline: 'none',
                        cursor: 'pointer', boxSizing: 'border-box'
                      }}
                    >
                      <option value="">{loadingClasses ? 'Loading...' : 'Select a class'}</option>
                      {classes.map(cls => (
                        <option key={cls.id} value={cls.name || cls.id}>{cls.name || cls.id}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 900, color: '#94a3b8', letterSpacing: '2px', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                      Last Avg (Previous School)
                    </label>
                    <input type="number" name="lastAverage" value={formData.lastAverage} onChange={handleChange}
                      placeholder="e.g. 75" min="0" max="100" required
                      style={{
                        width: '100%', padding: '12px 16px', borderRadius: 12,
                        border: '2px solid #f1f5f9', background: '#f8fafc',
                        fontWeight: 700, fontSize: 14, color: '#0f172a', outline: 'none', boxSizing: 'border-box'
                      }}
                      onFocus={e => e.target.style.borderColor = '#6366f1'}
                      onBlur={e => e.target.style.borderColor = '#f1f5f9'}
                    />
                  </div>
                </div>
              </div>

              {/* CBT Score Box */}
              <div style={{
                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                borderRadius: 20, padding: '28px 32px', marginBottom: 28
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <GraduationCap size={20} style={{ color: '#a5b4fc' }} />
                  <p style={{ fontWeight: 900, fontSize: 13, color: '#c7d2fe', letterSpacing: '1px', margin: 0 }}>
                    CBT Evaluation Score
                  </p>
                </div>
                <input type="number" name="cbtScore" value={formData.cbtScore} onChange={handleChange}
                  placeholder="0" min="0" max="100" required
                  style={{
                    width: '100%', padding: '16px 20px', borderRadius: 14,
                    border: '2px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.08)',
                    fontWeight: 900, fontSize: 36, color: '#fff', outline: 'none', boxSizing: 'border-box',
                    textAlign: 'center'
                  }}
                  onFocus={e => e.target.style.borderColor = '#6366f1'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 16 }}>
                  {[
                    { label: '≥ 50 → Admitted', bg: 'rgba(16,185,129,0.15)', color: '#6ee7b7' },
                    { label: '45–49 → On Trial', bg: 'rgba(245,158,11,0.15)', color: '#fcd34d' },
                    { label: '< 45 → Rejected', bg: 'rgba(239,68,68,0.15)', color: '#fca5a5' },
                  ].map(item => (
                    <div key={item.label} style={{ background: item.bg, borderRadius: 10, padding: '8px 12px', textAlign: 'center' }}>
                      <p style={{ color: item.color, fontWeight: 800, fontSize: 11, margin: 0 }}>{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <button type="submit" disabled={loading || loadingClasses}
                style={{
                  width: '100%', padding: '18px', borderRadius: 16,
                  background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                  color: '#fff', fontWeight: 900, fontSize: 15,
                  border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: 10, opacity: (loading || loadingClasses) ? 0.5 : 1,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
                }}
              >
                {loading ? <Loader2 size={20} className="animate-spin" /> : <ClipboardSignature size={20} />}
                Submit Application & Get Result
              </button>
            </form>
          </div>
        )}
      </main>

      <Footer />

      <style>{`
        @media print {
          body > *:not(#root) { display: none; }
          nav, footer, button { display: none !important; }
          #admission-letter { display: block !important; box-shadow: none; border: none; }
          body { background: white; }
        }
      `}</style>
    </div>
  );
};

export default AdmissionPortal;
