import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import Navbar from '../../components/Navbar';
import Footer from '../../components/MainFooter';
import {
  ClipboardSignature, Loader2, CheckCircle, AlertTriangle, XCircle,
  GraduationCap, Printer, ChevronRight, ChevronLeft, Timer,
  User, BookOpen, FileText, Search, ArrowRight, Clock, Phone,
  Sparkles, Shield, Calendar, AlertCircle, Download, CreditCard,
  Receipt, Wallet, Check, FileCheck, DollarSign, Layers, ShieldCheck,
  Building, CheckCircle2
} from 'lucide-react';
import FBNCheckout from 'firstchekout';
import { db } from '../../lib/firebase';
import {
  collection, addDoc, getDocs, query, orderBy,
  serverTimestamp, doc, getDoc, where, updateDoc,
} from 'firebase/firestore';
import { useTheme } from '../../context/ThemeContext';
import brandLogo from '../../assets/bdslogo.jpg';
import { NIGERIA_STATES, getLgasForState } from '../../utils/nigeriaStatesLga';
import { generateUniqueClassRegNo } from '../../utils/regNoGenerator';
import { getProspectusFeeData, formatNaira, PROSPECTUS_FEES_SCHEDULE, PROSPECTUS_REQUIREMENTS, getClassSection } from '../../utils/prospectusFees';
import '../home.css';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const generateAppNo = () => {
  const year = new Date().getFullYear();
  const num = Math.floor(1000 + Math.random() * 9000);
  return `BDS/APN/${year}/${num}`;
};

const fmt = (s) =>
  `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

const getStoredAdmissionResult = (data) => {
  const total = 20;
  const score = Number(data?.cbtScore ?? 0);
  const percentage = data?.cbtCompleted ? Math.round((score / total) * 100) : 0;
  const explicitStatus = ['granted', 'trial', 'rejected'].includes(data?.admissionStatus)
    ? data.admissionStatus
    : null;
  const computedStatus = data?.cbtCompleted
    ? (percentage >= 50 ? 'granted' : percentage >= 40 ? 'trial' : 'rejected')
    : 'pending';

  return {
    score,
    total,
    percentage: explicitStatus ? (explicitStatus === 'granted' ? 100 : explicitStatus === 'trial' ? 50 : 0) : percentage,
    status: explicitStatus || computedStatus,
    regNo: data?.regNo || null,
  };
};

// ─── Barcode ──────────────────────────────────────────────────────────────────
const AppBarcode = ({ value }) => {
  const bars = (value || 'BDS').split('').map((c, i) => ({
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
  const [examDuration, setExamDuration] = useState(30 * 60);
  const [examScheduleActive, setExamScheduleActive] = useState(false);
  const [examStartDate, setExamStartDate] = useState('');
  const [examEndDate, setExamEndDate] = useState('');

  const [timeLeft, setTimeLeft] = useState(0);
  const [examDone, setExamDone] = useState(false);
  const timerRef = useRef(null);
  const submitRef = useRef(null);
  const letterRef = useRef(null);
  const [isLetterPdfGenerating, setIsLetterPdfGenerating] = useState(false);

  const [result, setResult] = useState(null);
  const [payingFee, setPayingFee] = useState(false);
  const [feePaidState, setFeePaidState] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showRequirementsModal, setShowRequirementsModal] = useState(false);
  const [isReceiptPdfGenerating, setIsReceiptPdfGenerating] = useState(false);
  const receiptRef = useRef(null);

  const defaultClasses = () => [
    { id: 'Toddlers', name: 'Toddlers (Nursery)' },
    { id: 'Nursery 1', name: 'Nursery 1' },
    { id: 'Nursery 2', name: 'Nursery 2' },
    { id: 'Basic 1', name: 'Basic 1 (Primary 1)' },
    { id: 'Basic 2', name: 'Basic 2 (Primary 2)' },
    { id: 'Basic 3', name: 'Basic 3 (Primary 3)' },
    { id: 'Basic 4', name: 'Basic 4 (Primary 4)' },
    { id: 'Basic 5', name: 'Basic 5 (Primary 5)' },
    { id: 'Basic 6', name: 'Basic 6 (Primary 6)' },
    { id: 'JSS1', name: 'JSS 1' },
    { id: 'JSS2', name: 'JSS 2' },
    { id: 'JSS3', name: 'JSS 3' },
    { id: 'SS1', name: 'SS 1' },
    { id: 'SS2-SCI', name: 'SS 2 Science' },
    { id: 'SS2-ART', name: 'SS 2 Art' },
    { id: 'SS3-SCI', name: 'SS 3 Science' },
    { id: 'SS3-ART', name: 'SS 3 Art' },
  ];

  useEffect(() => {
    const init = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'student_permissions'));
        if (snap.exists()) {
          const data = snap.data();
          setAdmissionOpen(data.admissionOpen !== false);
          if (data.examDurationMinutes) setExamDuration(data.examDurationMinutes * 60);
          if (data.examScheduleActive !== undefined) setExamScheduleActive(!!data.examScheduleActive);
          if (data.examStartDate) setExamStartDate(data.examStartDate);
          if (data.examEndDate) setExamEndDate(data.examEndDate);
        } else {
          setAdmissionOpen(true);
        }
      } catch { setAdmissionOpen(true); }

      try {
        const snap = await getDocs(query(collection(db, 'classes')));
        if (!snap.empty) {
          // ClassManagement stores classes as document IDs
          const firestoreClasses = snap.docs
            .filter(d => !d.data().deleted)
            .map(d => ({ id: d.id, name: d.data().name || d.id }))
            .sort((a, b) => a.name.localeCompare(b.name));
          
          // Merge defaults if nursery/primary aren't explicitly registered yet
          const combined = [...firestoreClasses];
          defaultClasses().forEach(dc => {
            if (!combined.some(c => c.name.toLowerCase() === dc.name.toLowerCase() || c.id.toLowerCase() === dc.id.toLowerCase())) {
              combined.push(dc);
            }
          });
          setClasses(combined);
        } else {
          setClasses(defaultClasses());
        }
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

  // Helper: Schedule window check
  const getScheduleStatus = () => {
    if (!examScheduleActive) return { isAllowed: true };
    const now = new Date();
    if (examStartDate && now < new Date(examStartDate)) {
      const startFmt = new Date(examStartDate).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
      return {
        isAllowed: false,
        status: 'FUTURE',
        message: `Exam Scheduled: The CBT exam for admission is scheduled to start on ${startFmt}. Please check back at the scheduled time.`
      };
    }
    if (examEndDate && now > new Date(examEndDate)) {
      const endFmt = new Date(examEndDate).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
      return {
        isAllowed: false,
        status: 'EXPIRED',
        message: `Exam Closed: The admission CBT exam period closed on ${endFmt}. Please contact the school office.`
      };
    }
    return { isAllowed: true };
  };

  // Auto enroll student if passed
  const ensureStudentEnrolled = async (applicantInfo, status, existingRegNo) => {
    if (status === 'rejected') return existingRegNo || null;
    try {
      // Calculate accurate section prospectus fee for candidate's class
      const prospectusData = getProspectusFeeData(applicantInfo.classApplyingFor);
      const expectedFee = prospectusData.total || 0;

      // Check if student with this application number already exists in students collection
      const qStud = query(collection(db, 'students'), where('appNo', '==', applicantInfo.appNo));
      const studSnap = await getDocs(qStud);

      if (!studSnap.empty) {
        return studSnap.docs[0].data().regNo || existingRegNo;
      }

      // Generate unique class-dependent registration number
      const regNo = existingRegNo || await generateUniqueClassRegNo(applicantInfo.classApplyingFor);

      await addDoc(collection(db, 'students'), {
        name: applicantInfo.fullName,
        regNo,
        className: applicantInfo.classApplyingFor,
        dateOfBirth: applicantInfo.dateOfBirth || '',
        gender: applicantInfo.gender || '',
        stateOfOrigin: applicantInfo.stateOfOrigin || '',
        localGovernment: applicantInfo.localGovernment || '',
        phone: applicantInfo.phone || '',
        guardianPhone: applicantInfo.phone || '',
        guardianName: applicantInfo.fullName,
        admissionStatus: status,
        appNo: applicantInfo.appNo,
        paidFee: 0,
        paidAmount: 0,
        expectedFee: expectedFee,
        classSection: prospectusData.sectionTitle,
        admissionConfirmed: false,
        paymentConfirmed: false,
        requiresAdminConfirmation: true,
        classActivated: false,
        status: 'pending_activation',
        pendingAdmissionMessage: `Pending bursar payment confirmation for ${prospectusData.sectionTitle} (${formatNaira(expectedFee)}).`,
        createdAt: serverTimestamp(),
        createdBy: 'admission_portal_auto',
      });

      return regNo;
    } catch (err) {
      console.error('Error auto-enrolling student:', err);
      return existingRegNo;
    }
  };

  const handleApply = async (e) => {
    e.preventDefault();
    setSubmittingForm(true);
    try {
      const appNo = generateAppNo();
      const prospectusData = getProspectusFeeData(formData.classApplyingFor);
      const docRef = await addDoc(collection(db, 'admissions'), {
        ...formData,
        appNo,
        cbtCompleted: false,
        cbtScore: null,
        admissionStatus: 'pending',
        prospectusTotal: prospectusData.total,
        classSection: prospectusData.sectionTitle,
        feePaid: false,
        createdAt: serverTimestamp(),
      });
      setAppData({ appNo, docId: docRef.id, applicant: { ...formData, appNo } });
      setFeePaidState(null);
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
      setAppData({ appNo: data.appNo, docId: data.id, applicant: data });

      if (data.feePaid) {
        setFeePaidState({
          paid: true,
          ref: data.paymentRef || 'REF-OFFLINE',
          amount: data.paidAmount || getProspectusFeeData(data.classApplyingFor).total,
          date: data.paidAt ? new Date(data.paidAt).toLocaleDateString('en-NG') : today,
          method: data.paymentMethod || 'Online Payment (FirstChekOut)'
        });
      } else {
        setFeePaidState(null);
      }

      const storedResult = getStoredAdmissionResult(data);
      const hasLetter = ['granted', 'trial'].includes(storedResult.status);
      const shouldShowLetter = hasLetter || data.cbtCompleted;

      if (shouldShowLetter) {
        let regNo = data.regNo || storedResult.regNo;
        if (storedResult.status !== 'rejected' && !regNo) {
          regNo = await ensureStudentEnrolled(data, storedResult.status, regNo);
          if (regNo && regNo !== data.regNo) {
            await updateDoc(doc(db, 'admissions', data.id), { regNo, admissionStatus: storedResult.status });
          }
        }

        setResult({ ...storedResult, regNo });
        setStep('result');
      } else if (data.cbtCompleted) {
        setResult({ ...storedResult, regNo: data.regNo || null });
        setStep('result');
      } else {
        setStep('instructions');
      }
    } catch { setLookupError('Error looking up application. Please try again.'); }
    finally { setLookingUp(false); }
  };

  const startCBT = async () => {
    const sched = getScheduleStatus();
    if (!sched.isAllowed) {
      alert(sched.message);
      return;
    }

    setLoadingQ(true);
    try {
      const applicantClass = appData?.applicant?.classApplyingFor || '';
      const snap = await getDocs(collection(db, 'admissionQuestions'));
      let allQs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      if (!allQs.length) {
        alert('No exam questions available. Please contact the school.');
        return;
      }

      // Filter questions specifically for candidate's class or general ('All')
      let classQs = allQs.filter(q => (q.targetClass || 'All') === applicantClass);
      let generalQs = allQs.filter(q => !q.targetClass || q.targetClass === 'All');

      let combinedPool = [...classQs];
      for (const q of generalQs) {
        if (!combinedPool.some(e => e.id === q.id)) {
          combinedPool.push(q);
        }
      }
      if (combinedPool.length < 20) {
        for (const q of allQs) {
          if (!combinedPool.some(e => e.id === q.id)) {
            combinedPool.push(q);
          }
        }
      }

      let selected = combinedPool.sort(() => Math.random() - 0.5).slice(0, Math.min(20, combinedPool.length));
      setQuestions(selected);
      setAnswers({});
      setCurrentQ(0);
      setTimeLeft(examDuration);
      setExamDone(false);
      setStep('cbt');
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
    
    let regNo = null;
    if (status !== 'rejected' && appData?.applicant) {
      regNo = await ensureStudentEnrolled(appData.applicant, status, null);
    }

    try {
      if (appData?.docId) {
        await updateDoc(doc(db, 'admissions', appData.docId), {
          cbtCompleted: true,
          cbtScore: score,
          admissionStatus: status,
          regNo: regNo || null,
          studentCreated: status !== 'rejected'
        });
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

  const handlePrintLetter = () => {
    if (!letterRef.current) return;

    const printWindow = window.open('', '_blank', 'width=900,height=900');
    if (!printWindow) {
      window.alert('Please allow pop-ups to print the admission letter.');
      return;
    }

    const letterMarkup = letterRef.current.outerHTML;
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Admission Letter</title><style>body{margin:0;padding:24px;background:#fff;color:#111827;font-family:Arial,sans-serif}*{box-sizing:border-box}img{max-width:100%}</style></head><body>${letterMarkup}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
  };

  const handleDownloadLetterPdf = async () => {
    if (!letterRef.current) return;

    setIsLetterPdfGenerating(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const clone = letterRef.current.cloneNode(true);
      clone.style.position = 'fixed';
      clone.style.left = '-9999px';
      clone.style.top = '0';
      clone.style.width = '794px';
      clone.style.maxWidth = '794px';
      clone.style.background = '#ffffff';
      clone.style.opacity = '1';
      clone.style.transform = 'none';
      document.body.appendChild(clone);

      const opt = {
        margin: [8, 8, 8, 8],
        filename: `${(appData?.applicant?.fullName || 'admission-letter').replace(/\s+/g, '-').toLowerCase()}-${appData?.appNo || 'letter'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false, allowTaint: true, imageTimeout: 60000 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      };
      await html2pdf().set(opt).from(clone).save();
      clone.remove();
    } catch (err) {
      console.error('PDF download failed:', err);
      window.alert('PDF download failed. Please try again.');
    } finally {
      setIsLetterPdfGenerating(false);
    }
  };

  const handlePaymentSuccess = async (txnRef, amount, method = 'Online Payment (FirstChekOut)') => {
    try {
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-NG');
      const serialNo = 'RCP-' + Math.floor(100000 + Math.random() * 900000);
      const targetClass = appData?.applicant?.classApplyingFor || '';
      const prospectusData = getProspectusFeeData(targetClass);

      // 1. Update Admission Document in Firestore
      if (appData?.docId) {
        await updateDoc(doc(db, 'admissions', appData.docId), {
          feePaid: true,
          paidAmount: amount,
          paymentRef: txnRef,
          receiptSerial: serialNo,
          paidAt: now.toISOString(),
          paymentMethod: method,
          feeBreakdown: prospectusData.items,
        });
      }

      // 2. Update Student Document in Firestore if provisioned
      const lookupRegNo = result?.regNo || appData?.applicant?.regNo;
      if (lookupRegNo) {
        const qStud = query(collection(db, 'students'), where('regNo', '==', lookupRegNo));
        const sSnap = await getDocs(qStud);
        if (!sSnap.empty) {
          await updateDoc(doc(db, 'students', sSnap.docs[0].id), {
            paidFee: amount,
            paidAmount: amount,
            expectedFee: amount,
            feeVerified: true,
            admissionConfirmed: true,
            paymentConfirmed: true,
            classActivated: true,
            status: 'active',
            lastPaymentDate: dateStr,
            lastTransactionId: txnRef,
            lastSerialNo: serialNo,
            lastPaymentTerm: 'First Term',
            lastPaymentSession: '2025/2026',
          });
        }
      }

      // 3. Post Audit Payment Message for Live Bursar Activity Hub
      await addDoc(collection(db, 'payment_messages'), {
        studentName: appData?.applicant?.fullName || 'New Admitted Student',
        className: targetClass,
        regNo: lookupRegNo || appData?.appNo,
        amount,
        method,
        term: 'First Term',
        session: '2025/2026',
        transactionId: txnRef,
        serialNo,
        message: `Prospectus admission & school fee of ${formatNaira(amount)} received for ${appData?.applicant?.fullName} (${targetClass} - ${prospectusData.sectionTitle}).`,
        createdAt: serverTimestamp(),
      });

      // 4. Update UI State
      setFeePaidState({
        paid: true,
        ref: txnRef,
        serialNo,
        amount,
        date: dateStr,
        method,
      });

      setShowReceiptModal(true);
    } catch (err) {
      console.error('Error saving admission payment:', err);
      alert('Payment was recorded, but receipt sync encountered a delay. Reference code: ' + txnRef);
    }
  };

  const handlePayProspectusFee = async () => {
    if (!appData?.applicant) return;
    const targetClass = appData.applicant.classApplyingFor;
    const prospectusData = getProspectusFeeData(targetClass);
    const amount = prospectusData.total;

    setPayingFee(true);

    try {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let txnRef = 'BDS-ADM-';
      for (let i = 0; i < 8; i++) {
        txnRef += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      const nameParts = (appData.applicant.fullName || 'Candidate').trim().split(' ');
      const firstname = nameParts[0] || 'Candidate';
      const lastname = nameParts.slice(1).join(' ') || 'Applicant';

      const live = import.meta.env.VITE_FBN_LIVE === 'true';
      const publicKey = import.meta.env.VITE_FBN_PUBLIC_KEY || 'sb-pk-placeholder-key';
      
      const baseFrame = live 
        ? 'https://checkout.firstchekout.com' 
        : 'https://sandbox.firstchekout.com';
      const apiBase = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
        ? 'https://bdsportals.vercel.app'
        : window.location.origin;
      const initiatePaymentURI = `${apiBase}/api/fbn-checkout`;

      const txn = {
        live,
        ref: txnRef,
        amount: amount,
        fees: [{ amount: amount, label: `Admission & School Fees (${prospectusData.sectionTitle})` }],
        customer: {
          firstname,
          lastname,
          email: appData.applicant.email || `${appData.appNo.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}@school.com`,
          id: appData.docId || appData.appNo,
        },
        publicKey,
        description: `New Student Admission & School Fees - ${targetClass} (${prospectusData.sectionTitle})`,
        currency: 'NGN',
        meta: {
          appNo: appData.appNo,
          regNo: result?.regNo || '',
          targetClass,
          section: prospectusData.sectionKey,
          amount,
        },
        callback: async (res) => {
          console.log('FBN Admission Payment Callback:', res);
          if (res.status === 'success' || res.status === 'successful' || res.event === 'success') {
            await handlePaymentSuccess(res.reference || txnRef, amount, 'Online Payment (FirstChekOut / Card)');
          } else {
            alert(`Payment status: ${res.status || 'Cancelled/Failed'}. Please try again.`);
          }
          setPayingFee(false);
        },
        onClose: () => {
          setPayingFee(false);
        }
      };

      const addressUrl = {
        BaseFrame: baseFrame,
        InitiatePaymentURI: initiatePaymentURI
      };

      await FBNCheckout.initiateTransactionAsync(txn, addressUrl);
    } catch (err) {
      console.warn('FirstChekOut modal note:', err);
      const userSimulate = window.confirm(`Initiate instant sandbox admission payment of ${formatNaira(amount)} for ${targetClass} (${prospectusData.sectionTitle})?`);
      if (userSimulate) {
        const simRef = 'BDS-SIM-' + Math.floor(100000 + Math.random() * 900000);
        await handlePaymentSuccess(simRef, amount, 'Online Payment (Verified Gateway)');
      }
      setPayingFee(false);
    }
  };

  const handlePrintReceipt = () => {
    if (!receiptRef.current) return;
    const printWindow = window.open('', '_blank', 'width=900,height=900');
    if (!printWindow) {
      window.alert('Please allow pop-ups to print the receipt.');
      return;
    }
    const receiptMarkup = receiptRef.current.outerHTML;
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Official Payment Receipt</title><style>body{margin:0;padding:24px;background:#fff;color:#111827;font-family:Arial,sans-serif}*{box-sizing:border-box}img{max-width:100%}</style></head><body>${receiptMarkup}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
  };

  const handleDownloadReceiptPdf = async () => {
    if (!receiptRef.current) return;
    setIsReceiptPdfGenerating(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const clone = receiptRef.current.cloneNode(true);
      clone.style.position = 'fixed';
      clone.style.left = '-9999px';
      clone.style.top = '0';
      clone.style.width = '794px';
      clone.style.maxWidth = '794px';
      clone.style.background = '#ffffff';
      clone.style.opacity = '1';
      clone.style.transform = 'none';
      document.body.appendChild(clone);

      const opt = {
        margin: [8, 8, 8, 8],
        filename: `admission-receipt-${(appData?.applicant?.fullName || 'student').replace(/\s+/g, '-').toLowerCase()}-${appData?.appNo || 'rcp'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false, allowTaint: true, imageTimeout: 60000 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      };
      await html2pdf().set(opt).from(clone).save();
      clone.remove();
    } catch (err) {
      console.error('PDF download failed:', err);
      window.alert('PDF download failed. Please try again.');
    } finally {
      setIsReceiptPdfGenerating(false);
    }
  };

  const answeredCount = Object.keys(answers).length;
  const scheduleStatus = getScheduleStatus();

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
        <div className="home-hero-content">

          {/* Header pill */}
          <div className="home-hero-badge">
            <GraduationCap size={16} />
            <span>Admission Portal — Academic Session</span>
          </div>

          <h1 className="home-hero-title">
            Online Admission & CBT Assessment Portal
          </h1>
          <p className="home-hero-desc">
            Apply for admission, take the general assessment CBT, and receive your admission letter — instantly and online.
          </p>

          {/* Mode Switcher */}
          {step === 'apply' && (
            <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.08)', borderRadius: 100, padding: 4, border: '1px solid rgba(255,255,255,0.15)', marginBottom: 32 }}>
              <button
                onClick={() => setMode('new')}
                style={{
                  padding: '9px 24px', borderRadius: 100, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 13,
                  background: mode === 'new' ? 'var(--color-primary)' : 'transparent',
                  color: mode === 'new' ? '#fff' : 'rgba(255,255,255,0.6)',
                  transition: 'all 0.25s',
                }}
              >
                New Application
              </button>
              <button
                onClick={() => setMode('return')}
                style={{
                  padding: '9px 24px', borderRadius: 100, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 13,
                  background: mode === 'return' ? 'var(--color-primary)' : 'transparent',
                  color: mode === 'return' ? '#fff' : 'rgba(255,255,255,0.6)',
                  transition: 'all 0.25s',
                }}
              >
                Check Result / Return Applicant
              </button>
            </div>
          )}

          {/* Step Indicator */}
          {step !== 'apply' && <StepIndicator currentStep={step} />}

          {/* ══════════ STEP 1: APPLY / LOOKUP ══════════ */}
          {step === 'apply' && mode === 'new' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <div className="home-testimony-form" style={{ borderRadius: 24 }}>
                <div className="home-testimony-form-header">
                  <div className="home-testimony-form-icon"><ClipboardSignature size={20} /></div>
                  <h3 className="home-testimony-form-title">Student Admission Application</h3>
                </div>
                <p className="home-testimony-form-desc">Fill out all fields carefully to generate your Application Number and proceed to the assessment exam.</p>

                <form onSubmit={handleApply}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, textAlign: 'left', marginBottom: 20 }}>
                    <FInput label="Full Name *" name="fullName" placeholder="e.g. Chukwuma Obi" value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} colSpan={2} />
                    <FInput label="Date of Birth *" name="dateOfBirth" type="date" value={formData.dateOfBirth} onChange={e => setFormData({ ...formData, dateOfBirth: e.target.value })} />

                    <div>
                      <label className="home-form-label">Gender *</label>
                      <select name="gender" required value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })} className="home-form-input">
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>

                    <div>
                      <label className="home-form-label">Class Applying For *</label>
                      <select name="classApplyingFor" required value={formData.classApplyingFor} onChange={e => setFormData({ ...formData, classApplyingFor: e.target.value })} className="home-form-input" disabled={loadingClasses}>
                        <option value="">{loadingClasses ? 'Loading classes...' : 'Select Target Class'}</option>
                        {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="home-form-label">State of Origin *</label>
                      <select
                        name="stateOfOrigin"
                        required
                        value={formData.stateOfOrigin}
                        onChange={e => {
                          const newState = e.target.value;
                          setFormData({ ...formData, stateOfOrigin: newState, localGovernment: '' });
                        }}
                        className="home-form-input"
                      >
                        <option value="">Select State of Origin</option>
                        {NIGERIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="home-form-label">Local Government (LGA) *</label>
                      <select
                        name="localGovernment"
                        required
                        value={formData.localGovernment}
                        onChange={e => setFormData({ ...formData, localGovernment: e.target.value })}
                        className="home-form-input"
                        disabled={!formData.stateOfOrigin}
                      >
                        <option value="">{formData.stateOfOrigin ? 'Select Local Government (LGA)' : 'Select State first...'}</option>
                        {getLgasForState(formData.stateOfOrigin).map(lga => (
                          <option key={lga} value={lga}>{lga}</option>
                        ))}
                      </select>
                    </div>
                    <FInput label="Parent / Guardian Phone *" name="phone" type="tel" placeholder="e.g. 08012345678" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                    <FInput label="Previous School Attended *" name="previousSchool" placeholder="e.g. St. Jude Academy" value={formData.previousSchool} onChange={e => setFormData({ ...formData, previousSchool: e.target.value })} />
                    <FInput label="Last Academic Average (%)" name="lastAverage" type="number" min="0" max="100" placeholder="e.g. 75" value={formData.lastAverage} onChange={e => setFormData({ ...formData, lastAverage: e.target.value })} required={false} />
                  </div>

                  <button type="submit" disabled={submittingForm} className="home-form-submit">
                    {submittingForm ? <><Loader2 size={18} className="admission-spin" /> Generating Application...</> : <>Submit & Get Application Number <ArrowRight size={18} /></>}
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {step === 'apply' && mode === 'return' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <div className="home-testimony-form" style={{ maxWidth: 480, margin: '0 auto', borderRadius: 24 }}>
                <div className="home-testimony-form-header">
                  <div className="home-testimony-form-icon"><Search size={20} /></div>
                  <h3 className="home-testimony-form-title">Find Application / Check Result</h3>
                </div>
                <p className="home-testimony-form-desc">
                  Enter your application number to access your CBT exam or view your admission result.
                </p>

                <form onSubmit={handleLookup}>
                  <div style={{ textAlign: 'left', marginBottom: 20 }}>
                    <label className="home-form-label">Application Number *</label>
                    <input
                      type="text"
                      placeholder="e.g. BDS/APN/2026/1234"
                      required
                      value={returnAppNo}
                      onChange={e => setReturnAppNo(e.target.value)}
                      className="home-form-input"
                      style={{ fontSize: 16, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}
                    />
                  </div>

                  {lookupError && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 12, padding: '10px 14px', marginBottom: 16, fontSize: 13, fontWeight: 700 }}>
                      {lookupError}
                    </div>
                  )}

                  <button type="submit" disabled={lookingUp} className="home-form-submit">
                    {lookingUp ? <><Loader2 size={18} className="admission-spin" /> Looking up...</> : <><Search size={18} /> Find My Application</>}
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {/* ══════════ STEP 2: BRIEFING / INSTRUCTIONS ══════════ */}
          {step === 'instructions' && appData && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

              {/* App No Banner */}
              <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 20, padding: '20px 24px', border: '1px solid rgba(255,255,255,0.12)', marginBottom: 24, display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '3px', textTransform: 'uppercase', color: '#94a3b8' }}>Your Official Application Number</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <p style={{ fontSize: 28, fontWeight: 900, fontFamily: 'monospace', letterSpacing: '3px', margin: 0, color: '#fdba74' }}>
                    {appData.appNo}
                  </p>
                </div>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: 0 }}>
                  ⚠️ Save this number — you'll need it to check your status or letter.
                </p>
              </div>

              {/* CBT Rules card */}
              <div className="home-testimony-form" style={{ borderRadius: 24 }}>
                <div className="home-testimony-form-header">
                  <div className="home-testimony-form-icon"><BookOpen size={20} /></div>
                  <h3 className="home-testimony-form-title">CBT Examination Briefing</h3>
                </div>
                <p className="home-testimony-form-desc">
                  You are about to take the <strong>Assessment Examination for {appData?.applicant?.classApplyingFor || 'your class'}</strong> for admission into <strong>{schoolName || 'the school'}</strong>. Read these instructions carefully:
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
                  {[
                    { Icon: FileText, label: '20 Questions', desc: `Tailored for ${appData?.applicant?.classApplyingFor || 'selected class'}`, color: 'var(--color-indigo-500)', bg: 'var(--color-indigo-50)' },
                    { Icon: Clock, label: `${Math.floor(examDuration / 60)} Minutes`, desc: 'Timer auto-submits on timeout', color: 'var(--color-amber-500)', bg: 'var(--color-amber-50)' },
                    { Icon: CheckCircle, label: 'Pass Mark: 50%', desc: '10 or more correct to be admitted', color: 'var(--color-emerald-500)', bg: 'var(--color-emerald-50)' },
                    { Icon: GraduationCap, label: 'Instant Enrollment', desc: 'Auto moves student to class on pass', color: 'var(--color-primary)', bg: 'var(--color-primary-light)' },
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

                {!scheduleStatus.isAllowed ? (
                  <div style={{ background: '#fffbeb', border: '1px solid #fef08a', borderRadius: 14, padding: '16px 20px', marginBottom: 24, textAlign: 'left', display: 'flex', gap: 12 }}>
                    <AlertTriangle size={20} style={{ color: '#d97706', flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <h4 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 800, color: '#92400e' }}>Exam Schedule Notice</h4>
                      <p style={{ fontSize: 13, color: '#b45309', margin: 0, lineHeight: 1.6 }}>{scheduleStatus.message}</p>
                    </div>
                  </div>
                ) : (
                  <div style={{ background: '#fffbeb', border: '1px solid #fef08a', borderRadius: 12, padding: '12px 16px', marginBottom: 24, display: 'flex', gap: 10 }}>
                    <AlertTriangle size={16} style={{ color: '#d97706', flexShrink: 0, marginTop: 1 }} />
                    <p style={{ fontSize: 13, color: '#92400e', margin: 0, lineHeight: 1.6 }}>
                      <strong>Important:</strong> Once started, the timer runs continuously. Do not refresh or close the page.
                    </p>
                  </div>
                )}

                <button
                  onClick={startCBT}
                  disabled={loadingQ || !scheduleStatus.isAllowed}
                  className="home-form-submit"
                  style={{ background: scheduleStatus.isAllowed ? '#059669' : '#94a3b8', cursor: scheduleStatus.isAllowed ? 'pointer' : 'not-allowed' }}
                >
                  {loadingQ ? <><Loader2 size={18} className="admission-spin" /> Loading Questions...</> : <><BookOpen size={18} /> Start CBT Examination</>}
                </button>
              </div>
            </motion.div>
          )}

          {/* ══════════ STEP 3: CBT EXAM ══════════ */}
          {step === 'cbt' && questions.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              {/* Timer bar */}
              <div className="glass-morphism" style={{
                borderRadius: 20, padding: '16px 28px', marginBottom: 20,
                background: timeLeft < 300 ? 'rgba(220,38,38,0.9)' : 'rgba(15,23,42,0.9)',
                border: `1px solid ${timeLeft < 300 ? 'rgba(248,113,113,0.3)' : 'rgba(255,255,255,0.1)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                transition: 'all 0.5s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Timer size={20} color="#fff" />
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>Time Remaining</span>
                    <p style={{ fontSize: 24, fontWeight: 900, color: '#fff', margin: 0, fontFamily: 'monospace' }}>{fmt(timeLeft)}</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>Progress</span>
                  <p style={{ fontSize: 16, fontWeight: 900, color: '#fdba74', margin: 0 }}>{answeredCount} of {questions.length} Answered</p>
                </div>
              </div>

              {/* Question Card */}
              <div className="home-testimony-form" style={{ borderRadius: 24, textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-primary)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                    Question {currentQ + 1} of {questions.length}
                  </span>
                  <span style={{ background: '#f1f5f9', color: '#64748b', fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 100 }}>
                    Class: {appData?.applicant?.classApplyingFor || 'General'}
                  </span>
                </div>

                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', lineHeight: 1.6, marginBottom: 24 }}>
                  {questions[currentQ].prompt}
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
                  {questions[currentQ].options.map((option, idx) => {
                    const selected = answers[currentQ] === idx;
                    const labels = ['A', 'B', 'C', 'D'];
                    return (
                      <div
                        key={idx}
                        onClick={() => setAnswers(prev => ({ ...prev, [currentQ]: idx }))}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderRadius: 14,
                          background: selected ? 'var(--color-primary-light)' : '#f8fafc',
                          border: `2px solid ${selected ? 'var(--color-primary)' : '#e2e8f0'}`,
                          cursor: 'pointer', transition: 'all 0.2s',
                        }}
                      >
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%',
                          background: selected ? 'var(--color-primary)' : '#e2e8f0',
                          color: selected ? '#fff' : '#64748b',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 900, fontSize: 13, flexShrink: 0,
                        }}>
                          {labels[idx]}
                        </div>
                        <span style={{ fontSize: 14, fontWeight: selected ? 800 : 600, color: selected ? 'var(--color-primary-dark)' : '#334155' }}>
                          {option}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Nav buttons */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
                  <button
                    onClick={() => setCurrentQ(prev => Math.max(0, prev - 1))}
                    disabled={currentQ === 0}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 12,
                      border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontWeight: 700, fontSize: 13,
                      cursor: currentQ === 0 ? 'not-allowed' : 'pointer', opacity: currentQ === 0 ? 0.4 : 1,
                    }}
                  >
                    <ChevronLeft size={16} /> Previous
                  </button>

                  {currentQ < questions.length - 1 ? (
                    <button
                      onClick={() => setCurrentQ(prev => prev + 1)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 22px', borderRadius: 12,
                        border: 'none', background: 'var(--color-primary)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                      }}
                    >
                      Next Question <ChevronRight size={16} />
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmitExam}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', borderRadius: 12,
                        border: 'none', background: '#059669', color: '#fff', fontWeight: 900, fontSize: 14, cursor: 'pointer',
                      }}
                    >
                      <CheckCircle size={16} /> Submit Exam Now
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ══════════ STEP 4: RESULT & LETTER ══════════ */}
          {step === 'result' && result && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              {/* Score Header */}
              <div className="home-testimony-form" style={{ borderRadius: 24, marginBottom: 28 }}>
                <div style={{ marginBottom: 12 }}>
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
                <p className="home-testimony-form-desc" style={{ maxWidth: 480, margin: '0 auto 28px' }}>
                  {result.status === 'granted'
                    ? `You passed the assessment exam! Student record created for ${appData?.applicant?.classApplyingFor || 'selected class'}.`
                    : result.status === 'trial'
                    ? `You qualified for provisional admission into ${appData?.applicant?.classApplyingFor || 'selected class'}.`
                    : 'Your score did not meet the minimum threshold for admission. You may re-apply when admissions re-open.'}
                </p>

                <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 0 }}>
                  {[
                    { label: 'Score', value: `${result.score}/${result.total}`, mono: true },
                    { label: 'Percentage', value: `${result.percentage}%`, color: result.status === 'granted' ? '#10b981' : result.status === 'trial' ? '#f59e0b' : '#ef4444' },
                    ...(result.regNo ? [{ label: 'Reg Number', value: result.regNo, mono: true, small: true, color: '#0284c7' }] : []),
                    ...(appData?.appNo ? [{ label: 'App No', value: appData.appNo, mono: true, small: true }] : []),
                  ].map(({ label, value, mono, color, small }) => (
                    <div key={label} style={{ background: 'var(--color-slate-50)', borderRadius: 16, padding: '16px 20px', border: '1px solid #e2e8f0', minWidth: 110 }}>
                      <p style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', letterSpacing: '2px', textTransform: 'uppercase', margin: '0 0 6px' }}>{label}</p>
                      <p style={{ fontSize: small ? 14 : 26, fontWeight: 900, color: color || '#0f172a', margin: 0, fontFamily: mono ? 'monospace' : 'inherit' }}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ══════════ PROSPECTUS 2025/2026 FEES & PAYMENT SECTION ══════════ */}
              {(result.status === 'granted' || result.status === 'trial') && (() => {
                const targetClass = appData?.applicant?.classApplyingFor || 'JSS 1';
                const prospectusData = getProspectusFeeData(targetClass);

                return (
                  <div style={{ marginBottom: 32 }}>
                    {/* Header Banner */}
                    <div style={{
                      background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
                      borderRadius: 22,
                      padding: '24px 28px',
                      color: '#fff',
                      boxShadow: '0 12px 36px rgba(49, 46, 129, 0.25)',
                      border: '1px solid rgba(199, 210, 254, 0.2)',
                      marginBottom: 24,
                      textAlign: 'left'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
                            <Receipt size={24} color="#a5b4fc" />
                          </div>
                          <div>
                            <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: '2.5px', textTransform: 'uppercase', color: '#c7d2fe' }}>PROSPECTUS 2025/2026</span>
                            <h3 style={{ margin: '2px 0 0', fontSize: 20, fontWeight: 900, color: '#fff' }}>
                              {prospectusData.sectionTitle}
                            </h3>
                          </div>
                        </div>

                        <div style={{
                          background: 'rgba(255,255,255,0.1)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          padding: '8px 18px',
                          borderRadius: 100,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8
                        }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#e0e7ff' }}>Target Class:</span>
                          <strong style={{ fontSize: 13, color: '#fdba74' }}>{targetClass}</strong>
                        </div>
                      </div>

                      <p style={{ fontSize: 13, color: '#e0e7ff', margin: '0 0 20px', lineHeight: 1.6, maxWidth: 680 }}>
                        Official schedule of admission charges, term fees, uniforms, and student requisites for newly admitted candidates into <strong>{targetClass}</strong> ({prospectusData.classesDesc}).
                      </p>

                      {/* Itemized Table */}
                      <div style={{
                        background: '#ffffff',
                        borderRadius: 16,
                        overflow: 'hidden',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                        color: '#0f172a'
                      }}>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '50px 1fr 140px',
                          padding: '12px 18px',
                          background: '#f8fafc',
                          borderBottom: '1.5px solid #e2e8f0',
                          fontSize: 11,
                          fontWeight: 800,
                          letterSpacing: '1px',
                          textTransform: 'uppercase',
                          color: '#64748b'
                        }}>
                          <span>S/N</span>
                          <span>Item Description</span>
                          <span style={{ textAlign: 'right' }}>Amount (NGN)</span>
                        </div>

                        <div style={{ divideY: '1px solid #f1f5f9' }}>
                          {prospectusData.items.map((item, idx) => (
                            <div
                              key={item.name}
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '50px 1fr 140px',
                                padding: '12px 18px',
                                borderBottom: '1px solid #f1f5f9',
                                fontSize: 13,
                                alignItems: 'center',
                                background: idx % 2 === 0 ? '#fff' : '#fafafa'
                              }}
                            >
                              <span style={{ color: '#94a3b8', fontWeight: 700 }}>{idx + 1}</span>
                              <span style={{ color: '#1e293b', fontWeight: 600 }}>{item.name}</span>
                              <span style={{ textAlign: 'right', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>
                                {formatNaira(item.amount)}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Total Row */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '50px 1fr 140px',
                          padding: '16px 18px',
                          background: '#ecfdf5',
                          borderTop: '2px solid #a7f3d0',
                          fontSize: 15,
                          alignItems: 'center'
                        }}>
                          <span></span>
                          <span style={{ fontWeight: 900, color: '#065f46', letterSpacing: '1px', textTransform: 'uppercase' }}>
                            TOTAL PAYABLE
                          </span>
                          <span style={{ textAlign: 'right', fontWeight: 900, color: '#047857', fontSize: 18, fontFamily: 'monospace' }}>
                            {formatNaira(prospectusData.total)}
                          </span>
                        </div>
                      </div>

                      {/* Payment Action Bar */}
                      <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                        {feePaidState?.paid ? (
                          <div style={{
                            background: '#dcfce7',
                            border: '1.5px solid #86efac',
                            borderRadius: 14,
                            padding: '14px 20px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 14,
                            width: '100%',
                            boxSizing: 'border-box'
                          }}>
                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
                              <CheckCircle2 size={20} />
                            </div>
                            <div style={{ flex: 1, textAlign: 'left' }}>
                              <p style={{ margin: 0, fontWeight: 900, color: '#14532d', fontSize: 14 }}>
                                Admission & School Fees Fully Cleared!
                              </p>
                              <p style={{ margin: '2px 0 0', color: '#166534', fontSize: 12 }}>
                                Reference: <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{feePaidState.ref}</span> · Date: {feePaidState.date} · Method: {feePaidState.method}
                              </p>
                            </div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              <button
                                onClick={() => setShowReceiptModal(true)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  background: '#15803d',
                                  color: '#fff',
                                  border: 'none',
                                  padding: '9px 16px',
                                  borderRadius: 10,
                                  fontWeight: 700,
                                  fontSize: 12,
                                  cursor: 'pointer'
                                }}
                              >
                                <Receipt size={14} /> View Receipt
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <ShieldCheck size={18} color="#fdba74" />
                                <span style={{ fontSize: 13, color: '#c7d2fe' }}>
                                  Instant activation of student portal upon successful fee payment.
                                </span>
                              </div>
                              <button
                                onClick={handlePayProspectusFee}
                                disabled={payingFee}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 10,
                                  background: 'linear-gradient(135deg, #10b981, #059669)',
                                  color: '#fff',
                                  border: 'none',
                                  padding: '14px 28px',
                                  borderRadius: 14,
                                  fontWeight: 900,
                                  fontSize: 14,
                                  cursor: payingFee ? 'not-allowed' : 'pointer',
                                  boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)',
                                  transition: 'transform 0.15s, box-shadow 0.15s',
                                  opacity: payingFee ? 0.8 : 1
                                }}
                              >
                                {payingFee ? (
                                  <><Loader2 size={18} className="admission-spin" /> Processing Payment...</>
                                ) : (
                                  <><CreditCard size={18} /> Pay {formatNaira(prospectusData.total)} Online Now</>
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Requirements Checklist Card */}
                    <div style={{
                      background: '#ffffff',
                      borderRadius: 20,
                      border: '1.5px solid #e2e8f0',
                      padding: '24px 28px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.04)',
                      textAlign: 'left',
                      marginBottom: 24
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                            <FileCheck size={18} />
                          </div>
                          <div>
                            <h4 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#0f172a' }}>
                              Requirements for Admission and Registration
                            </h4>
                            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
                              Please present these official 13 items to the Bursary & Admissions desk upon arrival.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                        gap: '10px 18px'
                      }}>
                        {prospectusData.requirements.map((req, idx) => (
                          <div
                            key={req}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: 10,
                              padding: '8px 12px',
                              background: '#f8fafc',
                              borderRadius: 10,
                              border: '1px solid #f1f5f9',
                              fontSize: 12,
                              color: '#334155',
                              fontWeight: 600
                            }}
                          >
                            <span style={{
                              width: 20,
                              height: 20,
                              borderRadius: '50%',
                              background: '#e0e7ff',
                              color: '#4338ca',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 10,
                              fontWeight: 900,
                              flexShrink: 0
                            }}>
                              {idx + 1}
                            </span>
                            <span style={{ lineHeight: 1.5 }}>{req}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Admission Letter */}
              {(result.status === 'granted' || result.status === 'trial') && (
                <div style={{ marginBottom: 32 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 12, flexWrap: 'wrap' }}>
                    <p style={{ fontWeight: 900, fontSize: 11, letterSpacing: '3px', textTransform: 'uppercase', color: '#64748b', margin: 0 }}>Official Admission Letter</p>
                    <div className="admission-letter-actions" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <button onClick={handlePrintLetter} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#334155', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 12, fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,0,0,0.12)' }}>
                        <Printer size={15} /> Print Letter
                      </button>
                      <button onClick={handleDownloadLetterPdf} disabled={isLetterPdfGenerating} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#0f766e', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 12, fontWeight: 700, fontSize: 13, cursor: isLetterPdfGenerating ? 'wait' : 'pointer', boxShadow: '0 4px 14px rgba(0,0,0,0.12)', opacity: isLetterPdfGenerating ? 0.8 : 1 }}>
                        {isLetterPdfGenerating ? <Loader2 size={15} className="admission-spin" /> : <Download size={15} />} {isLetterPdfGenerating ? 'Preparing PDF...' : 'Download PDF'}
                      </button>
                    </div>
                  </div>
                  <div ref={letterRef} id="admission-letter" className="admission-letter-card" style={{ background: '#fff', borderRadius: 22, boxShadow: '0 20px 60px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0', fontFamily: 'Georgia, serif', overflow: 'hidden', textAlign: 'left' }}>
                    <div className="admission-letter-header" style={{ background: 'linear-gradient(135deg, #475569, #64748b)', padding: '28px 36px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <img src={logoUrl} alt="Logo" style={{ width: 52, height: 52, borderRadius: 12, objectFit: 'contain', border: '2px solid rgba(255,255,255,0.2)' }} />
                        <div>
                          <p style={{ color: '#fff', fontWeight: 900, fontSize: 16, textTransform: 'uppercase', margin: 0, fontFamily: 'Arial' }}>{schoolName || 'Birxy School'}</p>
                          <p style={{ color: '#e2e8f0', fontSize: 11, margin: '3px 0 0', fontFamily: 'Arial', letterSpacing: '1.5px', fontWeight: 700 }}>ADMISSION OFFICE</p>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ color: '#cbd5e1', fontSize: 10, fontFamily: 'Arial', fontWeight: 700, margin: 0, letterSpacing: '1.5px' }}>DATE ISSUED</p>
                        <p style={{ color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: 'Arial', margin: '3px 0 0' }}>{today}</p>
                      </div>
                    </div>
                    <div className="admission-letter-status" style={{ background: '#f8fafc', color: '#334155', padding: '9px 36px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0' }}>
                      <p style={{ color: '#334155', fontWeight: 800, fontSize: 11, letterSpacing: '4px', margin: 0, fontFamily: 'Arial' }}>
                        {result.status === 'granted' ? 'OFFER OF ADMISSION' : 'PROVISIONAL ADMISSION'}
                      </p>
                      <p style={{ color: '#475569', fontWeight: 700, fontSize: 11, margin: 0, fontFamily: 'monospace' }}>{appData?.appNo}</p>
                    </div>
                    <div style={{ padding: '36px' }}>
                      <p style={{ fontFamily: 'Arial', marginBottom: 20, color: '#334155', fontSize: 14, lineHeight: 1.8 }}>Dear <strong>{appData?.applicant?.fullName || 'Applicant'}</strong>,</p>
                      {result.status === 'granted' ? (
                        <>
                          <p style={{ fontSize: 14, lineHeight: 1.9, color: '#475569', fontFamily: 'Arial', marginBottom: 16 }}>We are delighted to inform you that following your <strong>General Assessment Examination</strong>, you have been <strong>OFFERED ADMISSION</strong> into <strong>{schoolName || 'our school'}</strong> for <strong>{appData?.applicant?.classApplyingFor}</strong> for the upcoming academic session.</p>
                          <p style={{ fontSize: 14, lineHeight: 1.9, color: '#475569', fontFamily: 'Arial', marginBottom: 16 }}>Your CBT score of <strong>{result.score}/{result.total} ({result.percentage}%)</strong> demonstrates a strong academic foundation. Your student account has been automatically provisioned under <strong>{appData?.applicant?.classApplyingFor}</strong> with Registration Number: <strong>{result.regNo}</strong>.</p>
                          <p style={{ fontSize: 14, lineHeight: 1.9, color: '#475569', fontFamily: 'Arial' }}>Please bring this letter along with your <strong>Birth Certificate</strong>, <strong>Previous School Report Card</strong>, and <strong>2 Passport Photographs</strong> to the Bursary office to finalise enrollment.</p>
                        </>
                      ) : (
                        <>
                          <p style={{ fontSize: 14, lineHeight: 1.9, color: '#475569', fontFamily: 'Arial', marginBottom: 16 }}>Following your <strong>General Assessment Examination</strong>, you have been offered a <strong>PROVISIONAL (TRIAL) ADMISSION</strong> into <strong>{schoolName || 'our school'}</strong> for <strong>{appData?.applicant?.classApplyingFor}</strong>.</p>
                          <p style={{ fontSize: 14, lineHeight: 1.9, color: '#475569', fontFamily: 'Arial' }}>Your score of <strong>{result.score}/{result.total} ({result.percentage}%)</strong> places you on a monitored trial period. Your student account has been created with Registration Number: <strong>{result.regNo}</strong>.</p>
                        </>
                      )}
                      <div style={{ marginTop: 24, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', padding: '20px 24px' }}>
                        <p style={{ fontSize: 10, fontWeight: 900, letterSpacing: '3px', textTransform: 'uppercase', color: '#94a3b8', marginBottom: 12, fontFamily: 'Arial' }}>Applicant Details</p>
                        <div className="admission-details-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 28px' }}>
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
                <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #fecaca', padding: '24px 28px', marginBottom: 24 }}>
                  <p style={{ fontWeight: 800, color: '#dc2626', marginBottom: 8 }}>Your application was not successful this time.</p>
                  <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.8, margin: 0 }}>A minimum score of 50% (10/20) is required for admission. You may re-apply when admissions re-open.</p>
                </div>
              )}

              <button onClick={resetAll} className="home-form-submit" style={{ background: 'transparent', color: '#64748b', border: '2px solid #e2e8f0', boxShadow: 'none' }}>
                Submit Another Application
              </button>
            </motion.div>
          )}

          {/* ══════════ OFFICIAL PAYMENT RECEIPT MODAL ══════════ */}
          {showReceiptModal && (
            <div style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              background: 'rgba(15, 23, 42, 0.75)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16
            }}>
              <div style={{
                background: '#fff',
                borderRadius: 24,
                width: '100%',
                maxWidth: 680,
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
                border: '1px solid #e2e8f0',
                textAlign: 'left'
              }}>
                <div style={{
                  padding: '18px 24px',
                  borderBottom: '1px solid #f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#f8fafc',
                  borderTopLeftRadius: 24,
                  borderTopRightRadius: 24
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Receipt size={20} color="#4f46e5" />
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#0f172a' }}>
                      Official Admission & School Fees Receipt
                    </h3>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      onClick={handlePrintReceipt}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        background: '#334155',
                        color: '#fff',
                        border: 'none',
                        padding: '8px 14px',
                        borderRadius: 10,
                        fontWeight: 700,
                        fontSize: 12,
                        cursor: 'pointer'
                      }}
                    >
                      <Printer size={14} /> Print
                    </button>
                    <button
                      onClick={handleDownloadReceiptPdf}
                      disabled={isReceiptPdfGenerating}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        background: '#059669',
                        color: '#fff',
                        border: 'none',
                        padding: '8px 14px',
                        borderRadius: 10,
                        fontWeight: 700,
                        fontSize: 12,
                        cursor: isReceiptPdfGenerating ? 'wait' : 'pointer'
                      }}
                    >
                      {isReceiptPdfGenerating ? <Loader2 size={14} className="admission-spin" /> : <Download size={14} />} PDF
                    </button>
                    <button
                      onClick={() => setShowReceiptModal(false)}
                      style={{
                        background: '#f1f5f9',
                        border: 'none',
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#64748b'
                      }}
                    >
                      <XCircle size={20} />
                    </button>
                  </div>
                </div>

                {/* Printable Receipt Body */}
                <div ref={receiptRef} id="official-admission-receipt" style={{ padding: '32px 36px', background: '#fff', color: '#0f172a' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #e2e8f0', paddingBottom: 20, marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <img src={logoUrl} alt="Logo" style={{ width: 56, height: 56, borderRadius: 12, objectFit: 'contain' }} />
                      <div>
                        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, textTransform: 'uppercase', color: '#1e1b4b' }}>
                          {schoolName || 'BONUS DOMINUS SCHOOLS'}
                        </h2>
                        <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                          No. 5A-C Chief Uzoanya's Crescent, Amuzukwu Layout, Umuahia, Abia State
                        </p>
                        <p style={{ margin: '2px 0 0', fontSize: 11, fontWeight: 800, color: '#4f46e5', letterSpacing: '1px' }}>
                          OFFICIAL BURSARY RECEIPT · PROSPECTUS 2025/2026
                        </p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        display: 'inline-block',
                        background: '#dcfce7',
                        color: '#15803d',
                        padding: '4px 12px',
                        borderRadius: 100,
                        fontWeight: 900,
                        fontSize: 11,
                        letterSpacing: '1px',
                        marginBottom: 6
                      }}>
                        ✓ PAYMENT VERIFIED
                      </span>
                      <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>
                        Receipt No: <strong style={{ fontFamily: 'monospace', color: '#0f172a' }}>{feePaidState?.serialNo || 'RCP-BDS-001'}</strong>
                      </p>
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748b' }}>
                        Date: <strong>{feePaidState?.date || today}</strong>
                      </p>
                    </div>
                  </div>

                  {/* Student Summary Grid */}
                  <div style={{ background: '#f8fafc', borderRadius: 14, padding: '16px 20px', border: '1px solid #e2e8f0', marginBottom: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', fontSize: 12 }}>
                    <div>
                      <span style={{ color: '#64748b', fontWeight: 700 }}>Candidate Name:</span>
                      <strong style={{ display: 'block', color: '#0f172a', fontSize: 13 }}>{appData?.applicant?.fullName || 'Candidate'}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontWeight: 700 }}>Class & Section:</span>
                      <strong style={{ display: 'block', color: '#0f172a', fontSize: 13 }}>
                        {appData?.applicant?.classApplyingFor || 'N/A'} ({getProspectusFeeData(appData?.applicant?.classApplyingFor).sectionTitle})
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontWeight: 700 }}>Application No:</span>
                      <span style={{ display: 'block', fontFamily: 'monospace', fontWeight: 800, color: '#4f46e5' }}>{appData?.appNo}</span>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontWeight: 700 }}>Reg Number:</span>
                      <span style={{ display: 'block', fontFamily: 'monospace', fontWeight: 800, color: '#059669' }}>{result?.regNo || appData?.applicant?.regNo || 'PENDING'}</span>
                    </div>
                  </div>

                  {/* Itemized Table */}
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 120px', padding: '10px 16px', background: '#f1f5f9', fontWeight: 800, fontSize: 11, color: '#475569', textTransform: 'uppercase' }}>
                      <span>#</span>
                      <span>Item Breakdown</span>
                      <span style={{ textAlign: 'right' }}>Amount</span>
                    </div>
                    {getProspectusFeeData(appData?.applicant?.classApplyingFor).items.map((item, idx) => (
                      <div key={item.name} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 120px', padding: '9px 16px', borderBottom: '1px solid #f1f5f9', fontSize: 12, background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                        <span style={{ color: '#94a3b8' }}>{idx + 1}</span>
                        <span style={{ color: '#1e293b', fontWeight: 600 }}>{item.name}</span>
                        <span style={{ textAlign: 'right', fontWeight: 800, fontFamily: 'monospace', color: '#0f172a' }}>{formatNaira(item.amount)}</span>
                      </div>
                    ))}
                    <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 120px', padding: '14px 16px', background: '#ecfdf5', fontWeight: 900, fontSize: 14, color: '#065f46', borderTop: '2px solid #a7f3d0' }}>
                      <span></span>
                      <span>TOTAL PAID IN FULL</span>
                      <span style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 16 }}>
                        {formatNaira(feePaidState?.amount || getProspectusFeeData(appData?.applicant?.classApplyingFor).total)}
                      </span>
                    </div>
                  </div>

                  {/* Signatures & Barcode */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 16 }}>
                    <AppBarcode value={feePaidState?.ref || appData?.appNo || 'BDS-PAID'} />
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ width: 140, height: 1, background: '#94a3b8', marginBottom: 6, marginLeft: 'auto' }} />
                      <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: '#334155' }}>Bursar / Finance Officer</p>
                      <p style={{ margin: '2px 0 0', fontSize: 10, color: '#94a3b8' }}>Bonus Dominus Schools</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <Footer />

      <style>{`
        .admission-spin { animation: adm-spin 1s linear infinite; display: inline-block; }
        @keyframes adm-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .admission-letter-card {
          color: #0f172a;
        }
        @media (max-width: 640px) {
          .admission-letter-actions {
            width: 100%;
            display: flex;
            flex-direction: column;
          }
          .admission-letter-actions button {
            width: 100%;
            justify-content: center;
          }
          .admission-letter-header {
            flex-direction: column;
            align-items: flex-start !important;
            padding: 22px 20px !important;
          }
          .admission-letter-status {
            flex-direction: column;
            align-items: flex-start !important;
            padding: 10px 20px !important;
            gap: 6px;
          }
          .admission-details-grid {
            grid-template-columns: 1fr !important;
            gap: 4px 0 !important;
          }
          .admission-details-grid > div {
            padding: 6px 0 !important;
          }
          .admission-details-grid span:first-child {
            min-width: 0 !important;
            display: block;
            margin-bottom: 2px;
          }
        }
        @media print {
          @page { size: A4; margin: 8mm; }
          body, html { background: white !important; margin: 0; padding: 0; }
          #root { display: block !important; background: white !important; }
          nav, footer, button, .home-hero, .home-features, .home-testimony-form, .home-form-submit { display: none !important; }
          #admission-letter {
            display: block !important;
            box-shadow: none !important;
            border: 1px solid #e5e7eb !important;
            width: 100%;
            max-width: none;
            margin: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .admission-letter-header {
            background: linear-gradient(135deg, #e2e8f0, #f8fafc) !important;
            color: #111827 !important;
          }
          .admission-letter-header p,
          .admission-letter-header span {
            color: #111827 !important;
          }
          .admission-letter-status {
            background: #f8fafc !important;
            color: #334155 !important;
          }
          .admission-letter-status p {
            color: #334155 !important;
          }
        }
      `}</style>
    </div>
  );
};

export default AdmissionPortal;
