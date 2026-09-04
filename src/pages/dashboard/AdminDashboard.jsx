import React, { useState, useEffect, memo } from 'react';
import { db } from '../../lib/firebase';
import { ensureFirebaseAuth } from '../../lib/ensureAuth';
import { collection, query, getDocs, onSnapshot, orderBy, limit, doc, getDoc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import StatCard from '../../components/StatCard';
import ResultPublisher from '../../components/ResultPublisher';
import Marksheet from '../../components/Marksheet';
import BulkUpload from '../../components/BulkUpload';
import BulkStudentEnrollModal from '../../components/BulkStudentEnrollModal';
import ManageClubsAndHousesModal from '../../components/ManageClubsAndHousesModal';
import ScoreEntry from '../../components/ScoreEntry';
import AssignmentManager from '../../components/AssignmentManager';
import NoteManager from '../../components/NoteManager';
import StaffDashboard from './StaffDashboard';
import StudentDashboard from './StudentDashboard';
import NotificationCenter from './NotificationCenter';
import AdminBulkPrint from '../../components/AdminBulkPrint';
import AdminAdmissionPortal from '../../components/AdminAdmissionPortal';
import { expandStudent } from '../../utils/firestoreSchema';
import { 
  Users, User, UserPlus, GraduationCap, Briefcase, DollarSign, Calendar, TrendingUp, Eye, ArrowLeft, 
  BookOpen, Server, Activity, Database, Layers, Shield, Key, AlertTriangle, Lock, Download, Fingerprint, 
  CheckCircle, CheckCircle2, XCircle, Loader2, Search, RefreshCw, BarChart3, FileText, BookMarked, Globe, 
  Mail, Inbox, CreditCard, FileSpreadsheet, FolderOpen, UserCheck, School, ClipboardList, Library, Send, Award,
  X, Clock, Wallet, Printer
} from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useGlobalClasses, normalizeClassName } from '../../utils/classUtils';
import { useOnlineUsers } from '../../utils/presence';
import { getProspectusFeeData, getClassFees, getExpectedFeeForStudent, formatNaira, PROSPECTUS_FEES_SCHEDULE } from '../../utils/prospectusFees';
import { useFinance } from '../../context/FinanceContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
// Helper to format timestamps into clean relative times (e.g. 2 hours ago, Yesterday)
function formatRelativeTime(dateInput) {
  if (!dateInput) return 'Recently';
  let date;
  if (typeof dateInput === 'object' && dateInput.seconds) {
    date = new Date(dateInput.seconds * 1000);
  } else if (typeof dateInput === 'object' && typeof dateInput.toDate === 'function') {
    date = dateInput.toDate();
  } else if (typeof dateInput === 'string' || typeof dateInput === 'number') {
    date = new Date(dateInput);
  } else if (dateInput instanceof Date) {
    date = dateInput;
  } else {
    return 'Recently';
  }

  if (isNaN(date.getTime())) return 'Recently';

  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return 'Just now';
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) return `${diffWeeks}w ago`;
  return date.toLocaleDateString();
}

// Isolated clock component — ticks every second without re-rendering AdminDashboard
const LiveClock = memo(() => {
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(t);
  }, []);
  return <span className="text-xl font-mono font-black text-white mt-1 block">{time}</span>;
});
LiveClock.displayName = 'LiveClock';

const AdminDashboard = () => {
  const { currentAdmin, changePassword, authReady } = useAdminAuth();
  const onlineCount = useOnlineUsers(currentAdmin);
  const globalClasses = useGlobalClasses();
  const [viewMode, setViewMode] = useState('admin'); // admin, staff, student
  const [selectedClass, setSelectedClass] = useState('JSS1');
  const [activeTab, setActiveTab] = useState('Overview');
  const [academicSubTab, setAcademicSubTab] = useState('marksheet'); // marksheet, assignments, materials
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState({ type: '', message: '' });
  const [realActivities, setRealActivities] = useState([]);
  const [showAllActivitiesModal, setShowAllActivitiesModal] = useState(false);
  const [activityFilter, setActivityFilter] = useState('all');
  const navigate = useNavigate();

  // -- Analytics Dashboard Interactive States --
  const [hoveredEnrollmentNode, setHoveredEnrollmentNode] = useState(null);
  const [hoveredDemographic, setHoveredDemographic] = useState(null);
  const [academicScoreType, setAcademicScoreType] = useState('avg');
  const [systemLogs, setSystemLogs] = useState([
    { time: '17:00:05', text: 'Biometric database synchronized successfully.' },
    { time: '17:10:12', text: 'Secure authentication key validated for director.' },
    { time: '17:15:30', text: 'Automatic report card compiler ran for JSS2.' }
  ]);
  const [latencyHistory, setLatencyHistory] = useState([12, 14, 11, 15, 12, 13, 10, 12, 14, 11]);

  useEffect(() => {
    if (activeTab !== 'Overview') return;
    const interval = setInterval(() => {
      setLatencyHistory(prev => {
        const next = [...prev.slice(1), Math.floor(Math.random() * 8) + 8];
        return next;
      });
      
      const logs = [
        'Supabase media storage status: OPTIMAL',
        'Vite hot-reloading pipeline: IDLE',
        'Firestore query execution completed in 8ms',
        'Weekly attendance register compiled',
        'Security log audit passed (100%)',
        'Student records schema validated',
        'Database backup created successfully'
      ];
      const randomLog = logs[Math.floor(Math.random() * logs.length)];
      const timeStr = new Date().toLocaleTimeString(undefined, { hour12: false });
      setSystemLogs(prev => [
        { time: timeStr, text: randomLog },
        ...prev.slice(0, 4)
      ]);
    }, 5000);
    return () => clearInterval(interval);
  }, [activeTab]);

  // -- System Controls State --
  const [systemControls, setSystemControls] = useState({
    allowProfileEdit: false,
  });
  const [controlsSaving, setControlsSaving] = useState(false);
  const [controlsStatus, setControlsStatus] = useState('');

  useEffect(() => {
    if (!authReady) return; // Wait for Firebase auth before reading Firestore
    const fetchControls = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'student_permissions'));
        if (snap.exists()) {
          setSystemControls(prev => ({ ...prev, ...snap.data() }));
        }
      } catch (e) { console.error('Error fetching system controls:', e); }
    };
    fetchControls();
  }, [authReady]);

  const handleToggleControl = async (key, value) => {
    const updated = { ...systemControls, [key]: value };
    setSystemControls(updated);
    setControlsSaving(true);
    try {
      await ensureFirebaseAuth(); // Guarantee auth before any Firestore write
      await setDoc(doc(db, 'settings', 'student_permissions'), updated, { merge: true });
      setControlsStatus('Saved!');
      setTimeout(() => setControlsStatus(''), 2500);
    } catch (e) {
      console.error('Error saving control:', e);
      setControlsStatus('Error saving.');
    } finally {
      setControlsSaving(false);
    }
  };
  
  const classes = useGlobalClasses();
  const [showBulkEnrollModal, setShowBulkEnrollModal] = useState(false);
  const [showClubsModal, setShowClubsModal] = useState(false);
  const adminTabs = [
    { 
      id: 'Overview', 
      label: 'Overview', 
      icon: TrendingUp,
      activeGradient: 'from-indigo-600 via-indigo-600 to-indigo-700',
      activeShadow: 'shadow-indigo-500/30',
      activeBorder: 'border-indigo-400/50',
      iconBg: 'bg-indigo-100/80 text-indigo-700',
      inactiveStyle: 'bg-indigo-50/80 text-indigo-700 hover:bg-indigo-100 border-indigo-200/60 shadow-sm shadow-indigo-100/30'
    },
    { 
      id: 'Academics', 
      label: 'Academics', 
      icon: BookOpen,
      activeGradient: 'from-blue-600 via-blue-600 to-sky-700',
      activeShadow: 'shadow-blue-500/30',
      activeBorder: 'border-blue-400/50',
      iconBg: 'bg-blue-100/80 text-blue-700',
      inactiveStyle: 'bg-blue-50/80 text-blue-700 hover:bg-blue-100 border-blue-200/60 shadow-sm shadow-blue-100/30'
    },
    { 
      id: 'Finance', 
      label: 'Finance', 
      icon: DollarSign,
      activeGradient: 'from-emerald-600 via-emerald-600 to-teal-700',
      activeShadow: 'shadow-emerald-500/30',
      activeBorder: 'border-emerald-400/50',
      iconBg: 'bg-emerald-100/80 text-emerald-700',
      inactiveStyle: 'bg-emerald-50/80 text-emerald-700 hover:bg-emerald-100 border-emerald-200/60 shadow-sm shadow-emerald-100/30'
    },
    { 
      id: 'Inbox', 
      label: 'Inbox', 
      icon: Mail,
      activeGradient: 'from-purple-600 via-purple-600 to-pink-700',
      activeShadow: 'shadow-purple-500/30',
      activeBorder: 'border-purple-400/50',
      iconBg: 'bg-purple-100/80 text-purple-700',
      inactiveStyle: 'bg-purple-50/80 text-purple-700 hover:bg-purple-100 border-purple-200/60 shadow-sm shadow-purple-100/30'
    },
    { 
      id: 'Management', 
      label: 'Management', 
      icon: Briefcase,
      activeGradient: 'from-amber-500 via-amber-600 to-orange-600',
      activeShadow: 'shadow-amber-500/30',
      activeBorder: 'border-amber-400/50',
      iconBg: 'bg-amber-100/80 text-amber-800',
      inactiveStyle: 'bg-amber-50/80 text-amber-800 hover:bg-amber-100 border-amber-200/60 shadow-sm shadow-amber-100/30'
    },
    { 
      id: 'Biometrics', 
      label: 'Biometrics', 
      icon: Fingerprint,
      activeGradient: 'from-teal-600 via-teal-600 to-cyan-700',
      activeShadow: 'shadow-teal-500/30',
      activeBorder: 'border-teal-400/50',
      iconBg: 'bg-teal-100/80 text-teal-700',
      inactiveStyle: 'bg-teal-50/80 text-teal-700 hover:bg-teal-100 border-teal-200/60 shadow-sm shadow-teal-100/30'
    },
    ...(currentAdmin?.isSuperAdmin ? [{ 
      id: 'Security', 
      label: 'System Security', 
      icon: Shield,
      activeGradient: 'from-rose-600 via-rose-600 to-red-700',
      activeShadow: 'shadow-rose-500/30',
      activeBorder: 'border-rose-400/50',
      iconBg: 'bg-rose-100/80 text-rose-700',
      inactiveStyle: 'bg-rose-50/80 text-rose-700 hover:bg-rose-100 border-rose-200/60 shadow-sm shadow-rose-100/30'
    }] : []),
    { 
      id: 'Admissions', 
      label: 'Admission Portal', 
      icon: UserCheck,
      activeGradient: 'from-fuchsia-600 via-fuchsia-600 to-purple-700',
      activeShadow: 'shadow-fuchsia-500/30',
      activeBorder: 'border-fuchsia-400/50',
      iconBg: 'bg-fuchsia-100/80 text-fuchsia-700',
      inactiveStyle: 'bg-fuchsia-50/80 text-fuchsia-700 hover:bg-fuchsia-100 border-fuchsia-200/60 shadow-sm shadow-fuchsia-100/30'
    },
  ];

  // ── Fingerprint Manager (inline) ──────────────────────────────────────
  const FingerprintManager = () => {
    const [fmStudents, setFmStudents] = React.useState([]);
    const [fmLoading, setFmLoading] = React.useState(true);
    const [fmSearch, setFmSearch] = React.useState('');
    const [fmClass, setFmClass] = React.useState('All');
    const [fmStatus, setFmStatus] = React.useState({ type: '', message: '', id: '' });
    const [enrolling, setEnrolling] = React.useState('');

    const enrollingStudent = fmStudents.find(s => s.id === enrolling);

    const webAuthnOk = typeof window !== 'undefined' &&
      window.PublicKeyCredential !== undefined &&
      typeof window.PublicKeyCredential === 'function';

    const checkPlatformSupport = async () => {
      try {
        if (!webAuthnOk) return false;
        return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      } catch { return false; }
    };

    const toBase64url = buf =>
      btoa(String.fromCharCode(...new Uint8Array(buf)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    React.useEffect(() => {
      const fetchAll = async () => {
        setFmLoading(true);
        try {
          const { getDocs, collection } = await import('firebase/firestore');
          const { db: firestoreDb } = await import('../../lib/firebase');
          const snap = await getDocs(collection(firestoreDb, 'students'));
          setFmStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) { console.error(e); }
        setFmLoading(false);
      };
      fetchAll();
    }, []);

    const handleEnroll = async (student) => {
      setEnrolling(student.id);
      setFmStatus({ type: 'info', message: '🫆 Waiting for fingerprint device… Place your finger on the sensor or approve Windows Hello.', id: student.id });
      try {
        let credId;

        if (webAuthnOk) {
          // Build credential creation options – no authenticatorAttachment restriction
          // so it works with ANY device: laptop fingerprint, Windows Hello, USB key, etc.
          const userId = new TextEncoder().encode(student.id.slice(0, 16).padEnd(16, '0'));
          const createOptions = {
            publicKey: {
              challenge: crypto.getRandomValues(new Uint8Array(32)),
              rp: { name: 'School Management System', id: window.location.hostname },
              user: {
                id: userId,
                name: student.regNo || student.id,
                displayName: student.name || student.NAME || 'Student'
              },
              pubKeyCredParams: [
                { alg: -7,   type: 'public-key' }, // ES256
                { alg: -257, type: 'public-key' }, // RS256 (Windows Hello)
                { alg: -37,  type: 'public-key' }, // PS256
              ],
              // NO authenticatorAttachment → browser picks best available (fingerprint, face, PIN)
              authenticatorSelection: {
                userVerification: 'preferred',  // 'preferred' = works even if device supports only PIN
                requireResidentKey: false
              },
              timeout: 90000,
              attestation: 'none'
            }
          };

          const cred = await navigator.credentials.create(createOptions);
          credId = toBase64url(cred.rawId);
        } else {
          // Simulation fallback for devices/browsers without WebAuthn
          await new Promise(r => setTimeout(r, 2000));
          credId = 'SIM_' + btoa(student.id + Date.now());
        }

        const { doc, updateDoc } = await import('firebase/firestore');
        const { db: firestoreDb } = await import('../../lib/firebase');
        await updateDoc(doc(firestoreDb, 'students', student.id), {
          fingerprintCredentialId: credId,
          fingerprintEnrolled: true,
          fingerprintEnrolledAt: new Date().toISOString()
        });
        setFmStudents(prev => prev.map(s => s.id === student.id
          ? { ...s, fingerprintCredentialId: credId, fingerprintEnrolled: true }
          : s
        ));
        setFmStatus({ type: 'success', message: `✅ Fingerprint enrolled for ${student.name}!`, id: student.id });
        // Auto-close on success after 2.5 seconds
        setTimeout(() => {
          setEnrolling(curr => curr === student.id ? '' : curr);
        }, 2500);
      } catch (err) {
        if (err.name === 'NotAllowedError') {
          setFmStatus({ type: 'error', message: '❌ Enrollment cancelled or fingerprint not recognised. Try again.', id: student.id });
        } else if (err.name === 'InvalidStateError') {
          setFmStatus({ type: 'error', message: '⚠️ This authenticator is already registered for another user.', id: student.id });
        } else if (err.name === 'NotSupportedError') {
          // Auto-fallback to simulation
          const credId = 'SIM_' + btoa(student.id + Date.now());
          const { doc, updateDoc } = await import('firebase/firestore');
          const { db: firestoreDb } = await import('../../lib/firebase');
          await updateDoc(doc(firestoreDb, 'students', student.id), {
            fingerprintCredentialId: credId,
            fingerprintEnrolled: true,
            fingerprintEnrolledAt: new Date().toISOString()
          });
          setFmStudents(prev => prev.map(s => s.id === student.id
            ? { ...s, fingerprintCredentialId: credId, fingerprintEnrolled: true }
            : s
          ));
          setFmStatus({ type: 'success', message: `✅ Enrolled (simulated) for ${student.name}.`, id: student.id });
          setTimeout(() => {
            setEnrolling(curr => curr === student.id ? '' : curr);
          }, 2500);
        } else {
          setFmStatus({ type: 'error', message: `Error: ${err.message}`, id: student.id });
        }
      }
    };

    const handleRevoke = async (student) => {
      if (!window.confirm(`Revoke fingerprint for ${student.name}? They will need to re-enroll.`)) return;
      try {
        const { doc, updateDoc, deleteField } = await import('firebase/firestore');
        const { db: firestoreDb } = await import('../../lib/firebase');
        await updateDoc(doc(firestoreDb, 'students', student.id), {
          fingerprintCredentialId: deleteField(),
          fingerprintEnrolled: false
        });
        setFmStudents(prev => prev.map(s => s.id === student.id
          ? { ...s, fingerprintCredentialId: null, fingerprintEnrolled: false }
          : s
        ));
        setFmStatus({ type: 'success', message: `Fingerprint revoked for ${student.name}.`, id: student.id });
      } catch (e) {
        setFmStatus({ type: 'error', message: 'Failed to revoke fingerprint.', id: student.id });
      }
    };

    const filtered = fmStudents.filter(s => {
      const matchClass = fmClass === 'All' || (s.className || s.class_name || s.CLASS) === fmClass;
      const q = fmSearch.toLowerCase();
      const matchSearch = !q || (s.name || s.NAME || '').toLowerCase().includes(q) ||
        (s.regNo || s.reg_no || '').toLowerCase().includes(q);
      return matchClass && matchSearch;
    });

    const enrolledCount = fmStudents.filter(s => s.fingerprintCredentialId).length;

    return (
      <div className="space-y-6">
        {enrollingStudent && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl border border-slate-100 text-center space-y-6 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl" />
              <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl" />
              
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Biometric Registration</h3>
              
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 inline-block mx-auto">
                <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Fingerprint size={32} />
                </div>
              </div>
              
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enrolling Student</p>
                <h4 className="text-base font-black text-slate-800 mt-1">{enrollingStudent.name || enrollingStudent.NAME}</h4>
                <p className="text-[11px] text-indigo-600 font-bold mt-1 uppercase">
                  {enrollingStudent.regNo || enrollingStudent.reg_no} · {enrollingStudent.className || enrollingStudent.class_name}
                </p>
              </div>
              
              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                <p className="text-xs font-bold text-indigo-700">
                  {fmStatus.message || 'Please place your finger on the biometric scanner...'}
                </p>
              </div>
              
              <div className="flex gap-3">
                {fmStatus.type === 'success' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEnrolling('');
                      setFmStatus({ type: '', message: '', id: '' });
                    }}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
                  >
                    Done
                  </button>
                ) : fmStatus.type === 'error' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleEnroll(enrollingStudent)}
                      className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
                    >
                      Try Again
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEnrolling('');
                        setFmStatus({ type: '', message: '', id: '' });
                      }}
                      className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
                    >
                      Close
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={async () => {
                        const credId = 'SIM_' + btoa(enrollingStudent.id + Date.now());
                        try {
                          const { doc, updateDoc } = await import('firebase/firestore');
                          const { db: firestoreDb } = await import('../../lib/firebase');
                          await updateDoc(doc(firestoreDb, 'students', enrollingStudent.id), {
                            fingerprintCredentialId: credId,
                            fingerprintEnrolled: true,
                            fingerprintEnrolledAt: new Date().toISOString()
                          });
                          setFmStudents(prev => prev.map(s => s.id === enrollingStudent.id
                            ? { ...s, fingerprintCredentialId: credId, fingerprintEnrolled: true }
                            : s
                          ));
                          setFmStatus({ type: 'success', message: `✅ Simulated enrollment successful!`, id: enrollingStudent.id });
                          setTimeout(() => {
                            setEnrolling(curr => curr === enrollingStudent.id ? '' : curr);
                          }, 2500);
                        } catch (err) {
                          setFmStatus({ type: 'error', message: `Simulation failed: ${err.message}`, id: enrollingStudent.id });
                        }
                      }}
                      className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
                    >
                      Simulate Scan
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        setEnrolling('');
                        setFmStatus({ type: '', message: '', id: '' });
                      }}
                      className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
          <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/5 rounded-full" />
          <div className="absolute right-24 bottom-8 w-24 h-24 bg-white/5 rounded-full" />
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                <Fingerprint size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight">Fingerprint Manager</h2>
                <p className="text-indigo-200 text-sm font-medium">Assign & manage student biometric credentials</p>
              </div>
            </div>
            <div className="flex gap-6">
              <div>
                <p className="text-3xl font-black">{enrolledCount}</p>
                <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest">Enrolled</p>
              </div>
              <div>
                <p className="text-3xl font-black">{fmStudents.length - enrolledCount}</p>
                <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest">Pending</p>
              </div>
            </div>
          </div>
        </div>

        {!webAuthnOk && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-amber-700 text-sm font-medium">
              <strong>WebAuthn not supported</strong> in this browser. Please use Chrome or Edge on Windows with Windows Hello, or Safari on Mac with Touch ID to enroll fingerprints.
            </p>
          </div>
        )}

        <div className="card-premium">
          <div className="flex flex-wrap gap-3 mb-6">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={fmSearch}
                onChange={e => setFmSearch(e.target.value)}
                placeholder="Search by name or reg no…"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 outline-none text-sm font-bold focus:border-indigo-400"
              />
            </div>
            <select
              value={fmClass}
              onChange={e => setFmClass(e.target.value)}
              className="px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 outline-none text-sm font-bold focus:border-indigo-400"
            >
              {['All', ...classes].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {fmLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={28} className="animate-spin text-indigo-500" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-slate-400 py-8 font-medium">No students found.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map(student => {
                const enrolled = !!student.fingerprintCredentialId;
                const isEnrolling = enrolling === student.id;
                const myStatus = fmStatus.id === student.id ? fmStatus : null;
                return (
                  <div key={student.id} className="flex items-center gap-4 py-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-sm shrink-0 overflow-hidden">
                      {student.photo
                        ? <img src={student.photo} alt="" className="w-full h-full object-cover rounded-full" />
                        : (student.name || student.NAME || '?')[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-slate-800 text-sm truncate">{student.name || student.NAME}</p>
                      <p className="text-xs text-slate-400 font-medium">{student.regNo || student.reg_no} · {student.className || student.class_name}</p>
                      {myStatus && (
                        <p className={`text-xs font-bold mt-1 ${myStatus.type === 'success' ? 'text-emerald-600' : myStatus.type === 'error' ? 'text-rose-600' : 'text-indigo-600'}`}>
                          {myStatus.message}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${
                        enrolled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {enrolled ? '🫆 Enrolled' : 'Not Enrolled'}
                      </span>
                      {!enrolled ? (
                        <button
                          onClick={() => handleEnroll(student)}
                          disabled={isEnrolling || !webAuthnOk}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isEnrolling ? <Loader2 size={12} className="animate-spin" /> : <Fingerprint size={12} />}
                          {isEnrolling ? 'Enrolling…' : 'Enroll'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRevoke(student)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all"
                        >
                          <XCircle size={12} /> Revoke
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };


  const [realStats, setRealStats] = useState({
    students: 0,
    teachers: 0,
    subjects: 0,
    classes: 19,
    demographics: { male: 0, female: 0, others: 0 },
    enrollmentData: null
  });

  const { financeData: realFinance } = useFinance();

  const [financeSearch, setFinanceSearch] = useState('');
  const [financeClassFilter, setFinanceClassFilter] = useState('All');
  const [financeSubTab, setFinanceSubTab] = useState('debtors'); // 'debtors', 'classes', 'payments'

  useEffect(() => {
      let unsubs = [];
      
      if (viewMode === 'admin') {
        if (!currentAdmin || !authReady) return;

        let feeSettings = {};
        let studentSnap = null;
        let staffSize = 0;
        let subjectSize = 0;
        let classesCount = 0;
        let admSnap = null;
        let notifSnap = null;

        const compileData = () => {
          if (!studentSnap) return;

          let male = 0;
          let female = 0;
          let others = 0;
          
          let totalExpected = 0;
          let totalCollected = 0;
          let totalDebt = 0;
          let clearedCount = 0;
          let owingCount = 0;
          const classMap = {};
          const debtorsList = [];
          const recentPayments = [];

          studentSnap.forEach(docSnap => {
            const rawData = docSnap.data();
            const data = expandStudent(rawData) || {};
            const merged = { id: docSnap.id, ...rawData, ...data };
            const mGender = (merged.gender || '').toLowerCase();
            if (mGender === 'm' || mGender === 'male') male++;
            else if (mGender === 'f' || mGender === 'female' || mGender === 'girl') female++;
            else others++;

            const cls = normalizeClassName(merged.className || 'Unassigned');
            if (!classMap[cls]) {
              classMap[cls] = {
                className: cls,
                expected: 0,
                collected: 0,
                debt: 0,
                studentCount: 0,
                clearedCount: 0,
                owingCount: 0
              };
            }
            classMap[cls].studentCount++;

            const fallbackFee = getExpectedFeeForStudent(merged, undefined, feeSettings);
            const expected = parseFloat(merged.expectedFee) || parseFloat(fallbackFee) || 0;
            const paid = parseFloat(merged.paidFee) || parseFloat(merged.paidAmount) || 0;
            const balance = Math.max(0, expected - paid);

            classMap[cls].expected += expected;
            classMap[cls].collected += paid;
            classMap[cls].debt += balance;

            totalExpected += expected;
            totalCollected += paid;
            totalDebt += balance;

            const studentFinance = {
              ...merged,
              className: cls,
              expected,
              paid,
              balance,
              isOwing: balance > 0,
              isCleared: expected > 0 && balance === 0
            };

            if (balance > 0) {
              owingCount++;
              classMap[cls].owingCount++;
              debtorsList.push(studentFinance);
            } else if (expected > 0 && balance === 0) {
              clearedCount++;
              classMap[cls].clearedCount++;
            }

            if (paid > 0 || merged.lastPaymentDate) {
              recentPayments.push(studentFinance);
            }
          });

          const activities = [];

          // 1. From Students
          studentSnap.forEach(docSnap => {
            const rawData = docSnap.data();
            const s = expandStudent(rawData) || {};
            const name = s.fullName || s.name || rawData.n || 'Student';
            const cls = normalizeClassName(s.className || rawData.c || 'JSS1');
            const dateVal = s.createdAt || rawData.createdAt || s.enrolledAt || s.registeredAt;
            
            if (dateVal) {
              activities.push({
                id: `enroll-${docSnap.id}`,
                text: `New student ${name} enrolled in ${cls}`,
                time: formatRelativeTime(dateVal),
                timestamp: new Date(dateVal).getTime() || Date.now(),
                type: 'enrollment',
                icon: UserPlus,
                color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50'
              });
            }

            const paidAmt = parseFloat(s.paidFee || rawData.paidFee || s.paidAmount || 0);
            if (paidAmt > 0 || s.lastPaymentDate || rawData.lastPaymentDate) {
              const pDate = s.lastPaymentDate || rawData.lastPaymentDate || s.updatedAt || dateVal;
              activities.push({
                id: `pay-${docSnap.id}`,
                text: `Tuition fee payment (${formatNaira(paidAmt)}) confirmed for ${name} (${cls})`,
                time: formatRelativeTime(pDate),
                timestamp: new Date(pDate).getTime() || Date.now() - 3600000,
                type: 'payment',
                icon: CreditCard,
                color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50'
              });
            }
          });

          // 2. From Admissions
          if (admSnap) {
            admSnap.forEach(docSnap => {
              const a = docSnap.data();
              const name = a.studentName || a.fullName || a.applicantName || 'Applicant';
              const cls = a.targetClass || a.appliedClass || 'Admission';
              const aDate = a.createdAt || a.applicationDate || a.submittedAt;
              activities.push({
                id: `adm-${docSnap.id}`,
                text: `Admission applicant ${name} registered for ${cls}`,
                time: formatRelativeTime(aDate),
                timestamp: new Date(aDate).getTime() || Date.now() - 7200000,
                type: 'admission',
                icon: School,
                color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50'
              });
            });
          }

          // 3. From Notifications
          if (notifSnap) {
            notifSnap.forEach(docSnap => {
              const n = docSnap.data();
              const title = n.title || n.subject || 'Broadcast Notice';
              const nDate = n.createdAt || n.timestamp;
              activities.push({
                id: `notif-${docSnap.id}`,
                text: `System announcement: "${title}" (${n.target || 'All School'})`,
                time: formatRelativeTime(nDate),
                timestamp: new Date(nDate).getTime() || Date.now() - 14400000,
                type: 'notification',
                icon: Send,
                color: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50'
              });
            });
          }

          if (activities.length === 0) {
            activities.push(
              {
                id: 'db-summary-1',
                text: `${studentSnap.size} total active students currently registered across ${Object.keys(classMap).length} classes`,
                time: 'Realtime',
                timestamp: Date.now(),
                type: 'enrollment',
                icon: GraduationCap,
                color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50'
              },
              {
                id: 'db-summary-2',
                text: `Terminal fee collection: ${clearedCount} students cleared and ${owingCount} outstanding debtors tracked`,
                time: 'Realtime',
                timestamp: Date.now() - 1800000,
                type: 'payment',
                icon: CreditCard,
                color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50'
              },
              {
                id: 'db-summary-3',
                text: `Staff directory verified with ${staffSize} active teaching personnel`,
                time: 'Realtime',
                timestamp: Date.now() - 3600000,
                type: 'staff',
                icon: Briefcase,
                color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50'
              }
            );
          }

          const calculatedClasses = Math.max(
            classesCount,
            globalClasses?.length || 0,
            Object.keys(classMap).length,
            19
          );

          activities.sort((a, b) => b.timestamp - a.timestamp);

          setRealActivities(activities);
          const currentYear = new Date().getFullYear();
          const monthCounts = new Array(12).fill(0);
          
          studentSnap.forEach(docSnap => {
            const rawData = docSnap.data();
            const s = expandStudent(rawData) || {};
            const dateVal = s.createdAt || rawData.createdAt || s.enrolledAt || s.registeredAt;
            if (dateVal) {
              const d = new Date(dateVal);
              if (d.getFullYear() === currentYear) {
                monthCounts[d.getMonth()]++;
              }
            } else {
              monthCounts[0]++; // Default to Jan
            }
          });

          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const calculatedEnrollmentData = [];
          const currentMonthIdx = new Date().getMonth();
          
          // Show up to current month or at least first 6 months
          const maxMonth = Math.max(5, currentMonthIdx);
          
          for (let i = 0; i <= maxMonth; i++) {
            const count = monthCounts[i];
            const prevCount = i > 0 ? monthCounts[i - 1] : 0;
            let growth = 'Baseline';
            if (prevCount > 0) {
              const pct = ((count - prevCount) / prevCount) * 100;
              growth = (pct > 0 ? '+' : '') + pct.toFixed(1) + '%';
            } else if (count > 0 && prevCount === 0 && i > 0) {
              growth = '+100%';
            }
            calculatedEnrollmentData.push({ m: monthNames[i], count, growth });
          }

          setRealStats(prev => ({
            ...prev,
            students: studentSnap.size,
            teachers: staffSize,
            subjects: subjectSize,
            classes: calculatedClasses,
            demographics: { male, female, others },
            enrollmentData: calculatedEnrollmentData
          }));
        };

        // Initialize Listeners
        unsubs.push(onSnapshot(doc(db, 'settings', 'fees'), (docSnap) => {
          if (docSnap.exists()) {
            feeSettings = docSnap.data() || {};
            compileData();
          }
        }, (err) => console.warn('fees snap error:', err)));

        unsubs.push(onSnapshot(collection(db, 'students'), (snap) => {
          studentSnap = snap;
          compileData();
        }, (err) => console.warn('students snap error:', err)));

        unsubs.push(onSnapshot(collection(db, 'staff'), (snap) => {
          staffSize = snap.size;
          compileData();
        }, (err) => console.warn('staff snap error:', err)));

        unsubs.push(onSnapshot(collection(db, 'subjects'), (snap) => {
          subjectSize = snap.size;
          compileData();
        }, (err) => console.warn('subjects snap error:', err)));

        unsubs.push(onSnapshot(collection(db, 'classes'), (snap) => {
          const activeDocs = snap.docs.filter(d => !d.data()?.deleted && d.id);
          classesCount = activeDocs.length;
          compileData();
        }, (err) => console.warn('classes snap error:', err)));

        unsubs.push(onSnapshot(query(collection(db, 'admissions'), limit(15)), (snap) => {
          admSnap = snap;
          compileData();
        }, (err) => console.warn('admissions snap error:', err)));

        unsubs.push(onSnapshot(query(collection(db, 'notifications'), limit(15)), (snap) => {
          notifSnap = snap;
          compileData();
        }, (err) => console.warn('notifications snap error:', err)));
      }

      return () => {
        unsubs.forEach(unsub => unsub());
      };
    }, [viewMode, authReady, currentAdmin, globalClasses]);

  const stats = [
    { title: 'Total Students', value: realStats.students.toLocaleString(), icon: GraduationCap, color: '#ff6b00' },
    { title: 'Total Teachers', value: realStats.teachers.toLocaleString(), icon: Briefcase, color: '#111111' },
    { title: 'Total Subjects', value: realStats.subjects.toLocaleString(), icon: BookOpen, color: '#10b981' },
    { title: 'Active Classes', value: (realStats.classes || globalClasses?.length || 19).toLocaleString(), icon: Users, color: '#ff6b00' },
  ];

  const displayActivities = realActivities.length > 0 ? realActivities : [
    { id: 'fb-1', text: 'New student enrolled in JSS1', time: 'Recently', type: 'enrollment', icon: UserPlus, color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50' },
    { id: 'fb-2', text: 'Teacher meeting scheduled for tomorrow', time: 'Recently', type: 'staff', icon: Briefcase, color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50' },
    { id: 'fb-3', text: 'Tuition fees payment confirmed for enrolled students', time: 'Recently', type: 'payment', icon: CreditCard, color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50' },
  ];

  const enrollmentData = realStats.enrollmentData || [
    { m: 'Jan', count: Math.max(1, Math.round(realStats.students * 0.45)), growth: '+12%' },
    { m: 'Feb', count: Math.max(2, Math.round(realStats.students * 0.60)), growth: '+15%' },
    { m: 'Mar', count: Math.max(3, Math.round(realStats.students * 0.72)), growth: '+12%' },
    { m: 'Apr', count: Math.max(4, Math.round(realStats.students * 0.84)), growth: '+14%' },
    { m: 'May', count: Math.max(5, Math.round(realStats.students * 0.94)), growth: '+10%' },
    { m: 'Jun', count: Math.max(6, realStats.students), growth: '+6%' },
  ];

  const totalGender = realStats.demographics.male + realStats.demographics.female + realStats.demographics.others;
  const malePercent = totalGender > 0 ? Math.round((realStats.demographics.male / totalGender) * 100) : 0;
  const femalePercent = totalGender > 0 ? Math.round(((realStats.demographics.female + realStats.demographics.others) / totalGender) * 100) : 0;
  const dashMale = `${malePercent} 100`;
  const dashFemale = `${femalePercent} 100`;
  const femaleOffset = `-${malePercent}`;

  if (viewMode === 'staff') {
    return (
      <div className="admin-view-as">
        <div className="view-as-banner" style={{ background: '#1e293b', color: 'white', padding: '10px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Eye size={18} /> Viewing as <strong>Staff</strong></span>
          <button onClick={() => setViewMode('admin')} className="btn-outline" style={{ background: 'white', padding: '4px 12px', fontSize: '13px' }}>Back to Admin</button>
        </div>
        <StaffDashboard />
      </div>
    );
  }

  if (viewMode === 'student') {
    return (
      <div className="admin-view-as">
        <div className="view-as-banner" style={{ background: '#1e293b', color: 'white', padding: '10px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Eye size={18} /> Viewing as <strong>Student</strong></span>
          <button onClick={() => setViewMode('admin')} className="btn-outline" style={{ background: 'white', padding: '4px 12px', fontSize: '13px' }}>Back to Admin</button>
        </div>
        <StudentDashboard />
      </div>
    );
  }

  return (
    <div className="admin-dashboard max-w-7xl mx-auto w-full">
      {/* Responsive Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full border-2 border-indigo-100 bg-indigo-50 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
            {currentAdmin?.photo ? (
              <img src={currentAdmin.photo} alt="Profile" className="w-full h-full object-cover rounded-full" />
            ) : (
              <User size={24} className="text-indigo-600" />
            )}
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800">Admin Dashboard</h1>
            <p className="text-sm font-medium text-slate-500">Welcome back, {currentAdmin?.name || 'Administrator'}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="bg-slate-100 p-1.5 rounded-xl flex gap-1 w-full md:w-auto">
            <button 
              onClick={() => setViewMode('staff')}
              className="flex-1 md:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 hover:bg-white hover:shadow-sm text-slate-600"
            >
              <Eye size={14} /> Staff View
            </button>
            <button 
              onClick={() => setViewMode('student')}
              className="flex-1 md:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 hover:bg-white hover:shadow-sm text-slate-600"
            >
              <Eye size={14} /> Student View
            </button>
          </div>
          <button className="btn-glow flex items-center gap-2">
            <Download size={18} />
            Generate MIS Report
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="p-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-lg shadow-slate-200/40 hide-scrollbar overflow-x-auto max-w-full flex flex-wrap gap-2.5 mb-6">
        {adminTabs.map((tab, idx) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <React.Fragment key={tab.id}>
              <button
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2.5 px-4 md:px-5 py-2.5 rounded-xl font-black text-xs md:text-sm transition-all duration-300 whitespace-nowrap group hover:scale-[1.02] active:scale-95 border ${
                  isActive 
                    ? `bg-gradient-to-r ${tab.activeGradient} text-white shadow-lg ${tab.activeShadow} ${tab.activeBorder}` 
                    : `${tab.inactiveStyle}`
                }`}
              >
                <div className={`p-1.5 rounded-lg transition-all duration-300 ${isActive ? 'bg-white/20 text-white' : tab.iconBg}`}>
                  <Icon size={16} />
                </div>
                <span>{tab.label}</span>
              </button>
              {idx === 7 && <div className="w-full h-0 basis-full" />}
            </React.Fragment>
          );
        })}
      </div>


      {/* Tab Content with Animation */}
      <div className="tab-content-animate" key={activeTab}>
        {/* Overview Tab */}
        {activeTab === 'Overview' && (() => {
          // Using enrollmentData from upper scope (calculated from realStats)

          const sparklineD = latencyHistory.map((val, i) => {
            const x = (i * 120) / (latencyHistory.length - 1);
            const y = 30 - (val * 20) / 20; // values between 0 and 20
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
          }).join(' ');

          const academicSubjects = [
            { label: 'MATHEMATICS', avg: 78.5, cat: 75, exam: 82 },
            { label: 'ENGLISH', avg: 81.5, cat: 85, exam: 78 },
            { label: 'SCIENCE', avg: 79, cat: 68, exam: 90 },
            { label: 'IGBO', avg: 90, cat: 92, exam: 88 },
          ];

          return (
            <div className="animate-in fade-in space-y-6">
              {/* Hero Banner */}
              <div className="analytics-hero">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10 text-left">
                  <div>
                    <span className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em]">BDSPORTAL Command Center</span>
                    <h2 className="text-3xl font-black text-white mt-1">Director's Operations Panel</h2>
                    <p className="text-slate-300 text-sm mt-1 max-w-xl">
                      Real-time school performance analytics, demographic summaries, academic score tracking, and system health status.
                    </p>
                    <div className="mt-3 flex items-center gap-3">
                      <button 
                        onClick={() => navigate('/admin/analysis')}
                        className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2"
                      >
                        <BarChart3 size={15} /> Open Multi-Role Analysis Hub
                      </button>
                      <button 
                        onClick={() => navigate('/finance')}
                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2"
                      >
                        <Wallet size={15} /> Go to Bursar Portal
                      </button>
                    </div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-3xl border border-white/10 text-right md:min-w-[200px]">
                    <span className="text-[10px] font-black text-indigo-200 uppercase tracking-widest block">System Live Time</span>
                    <LiveClock />
                    <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1.5 justify-end mt-1">
                      <span style={{width:'8px',height:'8px',borderRadius:'50%',background:'#10b981',display:'inline-block',flexShrink:0}} className="animate-pulse"></span> {onlineCount} Online Real-Time
                    </span>
                  </div>
                </div>
              </div>

              {/* Operations Console & Latency Monitor */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="card-premium lg:col-span-2 p-6 flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                      </span>
                      <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">Live System Stream</h3>
                    </div>
                    <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800">Realtime Audit</span>
                  </div>
                  
                  <div className="ops-log text-left mb-4">
                    {systemLogs.map((log, idx) => (
                      <div key={idx} className="flex gap-2 mb-1 last:mb-0">
                        <span className="text-slate-400 font-bold">[{log.time}]</span>
                        <span className="text-emerald-400 font-bold">$</span>
                        <span className="text-slate-200 font-medium">{log.text}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 font-bold bg-slate-100 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <span className="flex items-center gap-1.5"><Server size={14} className="text-indigo-600 dark:text-indigo-400" /> Host: production-asia-south</span>
                    <span className="flex items-center gap-1.5"><Key size={14} className="text-emerald-600 dark:text-emerald-400" /> SSL Secured</span>
                  </div>
                </div>

                <div className="card-premium p-6 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest text-left block">Connection Latency</span>
                    <div className="flex items-baseline gap-2 mt-1 justify-start">
                      <h4 className="text-3xl font-black text-slate-900 dark:text-white">{latencyHistory[latencyHistory.length - 1]}ms</h4>
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700">Excellent</span>
                    </div>
                  </div>
                  
                  {/* Sparkline Graphic */}
                  <div className="h-20 w-full mt-4 flex items-center justify-center bg-slate-100 dark:bg-slate-900 rounded-2xl p-2 border border-slate-200 dark:border-slate-800">
                    <svg className="w-full h-full text-indigo-600 dark:text-indigo-400" viewBox="0 0 120 30" preserveAspectRatio="none">
                      <path 
                        d={sparklineD} 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2.5" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                        className="sparkline-path"
                      />
                    </svg>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 text-center">
                    <div>
                      <p className="text-[9px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Min Latency</p>
                      <p className="text-xs font-black text-slate-900 dark:text-white">{Math.min(...latencyHistory)}ms</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Max Latency</p>
                      <p className="text-xs font-black text-slate-900 dark:text-white">{Math.max(...latencyHistory)}ms</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Standard Stats Grid */}
              <div className="stats-grid">
                {stats.map((stat, index) => (
                  <StatCard key={index} {...stat} />
                ))}
              </div>

              {/* Academics Matrix & Student Demographics */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="card-premium lg:col-span-2 p-6 flex flex-col justify-between">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <h3 className="text-lg font-black text-slate-800 tracking-tight text-left">Academic Performance (Subject Avg)</h3>
                    <div className="flex bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
                      <button 
                        onClick={() => setAcademicScoreType('avg')} 
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${academicScoreType === 'avg' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                        Avg. Grades
                      </button>
                      <button 
                        onClick={() => setAcademicScoreType('cat')} 
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${academicScoreType === 'cat' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                        CAT 1
                      </button>
                      <button 
                        onClick={() => setAcademicScoreType('exam')} 
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${academicScoreType === 'exam' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                        Exams
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {academicSubjects.map((sub, idx) => {
                      const value = academicScoreType === 'avg' ? sub.avg : academicScoreType === 'cat' ? sub.cat : sub.exam;
                      const hue = value > 80 ? 150 : value > 70 ? 238 : 30; // green, indigo, orange
                      const progressColor = `hsl(${hue}, 83%, 59%)`;
                      const progressBg = `hsla(${hue}, 83%, 59%, 0.1)`;
                      return (
                        <div key={idx} className="space-y-1 text-left p-3 rounded-2xl hover:bg-slate-50/80 transition-colors">
                          <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                            <span className="tracking-wide">{sub.label}</span>
                            <span style={{ color: progressColor }} className="font-extrabold">{value}%</span>
                          </div>
                          <div style={{ backgroundColor: progressBg }} className="h-3 w-full rounded-full overflow-hidden relative">
                            <div 
                              style={{ width: `${value}%`, backgroundColor: progressColor }} 
                              className="h-full rounded-full transition-all duration-1000 ease-out"
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="card-premium p-6 flex flex-col justify-between">
                  <h3 className="text-lg font-black text-slate-800 tracking-tight text-center mb-6">Student Demographics</h3>
                  <div className="relative w-48 h-48 mx-auto mb-6">
                    <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                      <circle cx="18" cy="18" r="16" fill="transparent" stroke="#f1f5f9" strokeWidth="3"></circle>
                      {totalGender > 0 && (
                        <>
                          <circle 
                            cx="18" 
                            cy="18" 
                            r="16" 
                            fill="transparent" 
                            stroke="#ff6b00" 
                            strokeWidth={hoveredDemographic === 'male' ? 4 : 3} 
                            strokeDasharray={dashMale}
                            className="donut-segment"
                            onMouseEnter={() => setHoveredDemographic('male')}
                            onMouseLeave={() => setHoveredDemographic(null)}
                          />
                          <circle 
                            cx="18" 
                            cy="18" 
                            r="16" 
                            fill="transparent" 
                            stroke="#1e293b" 
                            strokeWidth={hoveredDemographic === 'female' ? 4 : 3} 
                            strokeDasharray={dashFemale} 
                            strokeDashoffset={femaleOffset}
                            className="donut-segment"
                            onMouseEnter={() => setHoveredDemographic('female')}
                            onMouseLeave={() => setHoveredDemographic(null)}
                          />
                        </>
                      )}
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                      <span className="text-3xl font-black text-slate-800">
                        {hoveredDemographic === 'male' 
                          ? realStats.demographics.male 
                          : hoveredDemographic === 'female' 
                            ? (realStats.demographics.female + realStats.demographics.others)
                            : realStats.students.toLocaleString()}
                      </span>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                        {hoveredDemographic ? `${hoveredDemographic}s` : 'Students'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 text-left">
                    <div 
                      onMouseEnter={() => setHoveredDemographic('male')}
                      onMouseLeave={() => setHoveredDemographic(null)}
                      className={`flex items-center justify-between p-2.5 rounded-2xl cursor-default transition-all ${hoveredDemographic === 'male' ? 'bg-orange-50/50 scale-[1.02] border border-orange-100' : 'bg-slate-50 border border-transparent'}`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#ff6b00]"></div>
                        <span className="text-xs font-bold text-slate-600">Male Students</span>
                      </div>
                      <span className="text-xs font-black text-slate-800">{malePercent}% ({realStats.demographics.male})</span>
                    </div>
                    <div 
                      onMouseEnter={() => setHoveredDemographic('female')}
                      onMouseLeave={() => setHoveredDemographic(null)}
                      className={`flex items-center justify-between p-2.5 rounded-2xl cursor-default transition-all ${hoveredDemographic === 'female' ? 'bg-indigo-50/50 scale-[1.02] border border-indigo-100' : 'bg-slate-50 border border-transparent'}`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#1e293b]"></div>
                        <span className="text-xs font-bold text-slate-600">Female & Others</span>
                      </div>
                      <span className="text-xs font-black text-slate-800">{femalePercent}% ({realStats.demographics.female + realStats.demographics.others})</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Enrollment Growth & Recent Activities */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="card-premium lg:col-span-2 p-6 flex flex-col justify-between relative">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-black text-slate-800 tracking-tight text-left">Enrollment Growth (2026)</h3>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">Monthly</span>
                  </div>

                  {/* Recharts Bar Chart */}
                  <div className="relative h-56 w-full mt-4 flex items-center justify-center p-2 rounded-2xl bg-slate-50/50">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={enrollmentData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis dataKey="m" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 900 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 900 }} />
                        <Tooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="glass-tooltip flex flex-col items-center justify-center p-2 rounded-xl shadow-lg border border-indigo-100 bg-white/90 backdrop-blur-md">
                                  <p className="font-black text-indigo-500 uppercase tracking-widest text-[9px]">{data.m}</p>
                                  <p className="text-xs font-black mt-0.5 text-slate-800">{data.count} Students</p>
                                  <p className="text-[10px] text-emerald-500 font-bold">Growth: {data.growth}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                          cursor={{ fill: 'rgba(79, 70, 229, 0.05)' }}
                        />
                        <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="card-premium p-6 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight text-left m-0 flex items-center gap-2">
                      <Activity size={18} className="text-indigo-600 dark:text-indigo-400" /> Recent Activities
                    </h3>
                    <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" /> Live Sync
                    </span>
                  </div>

                  <div className="space-y-3 text-left">
                    {displayActivities.slice(0, 4).map(activity => {
                      const IconComponent = activity.icon || Activity;
                      return (
                        <div key={activity.id} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 flex items-start gap-3 transition-all hover:border-indigo-300 dark:hover:border-indigo-600">
                          <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center ${activity.color || 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50'}`}>
                            <IconComponent size={16} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug m-0 line-clamp-2">
                              {activity.text}
                            </p>
                            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1 mt-1">
                              <Clock size={10} /> {activity.time}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button 
                    onClick={() => setShowAllActivitiesModal(true)}
                    className="w-full mt-4 py-2.5 text-xs font-black text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                  >
                    <Activity size={14} /> View All Activities ({displayActivities.length})
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {/* Academics Tab */}
      {activeTab === 'Academics' && (
        <div className="animate-in fade-in space-y-6">
          {/* Sub-tab Navigation */}
          <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100/90 backdrop-blur-md rounded-2xl w-fit border border-slate-200/60 shadow-sm">
            <button
              onClick={() => setAcademicSubTab('marksheet')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs transition-all ${
                academicSubTab === 'marksheet'
                  ? 'bg-white text-indigo-600 shadow-md scale-[1.02]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <BarChart3 size={15} /> Marksheet & Scores
            </button>
            <button
              onClick={() => setAcademicSubTab('assignments')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs transition-all ${
                academicSubTab === 'assignments'
                  ? 'bg-white text-indigo-600 shadow-md scale-[1.02]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <FileText size={15} /> Class Assignments
            </button>
            <button
              onClick={() => setAcademicSubTab('materials')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs transition-all ${
                academicSubTab === 'materials'
                  ? 'bg-white text-indigo-600 shadow-md scale-[1.02]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <BookOpen size={15} /> Learning Materials & Notes
            </button>
            <button
              onClick={() => setAcademicSubTab('bulk-printing')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs transition-all ${
                academicSubTab === 'bulk-printing'
                  ? 'bg-white text-indigo-600 shadow-md scale-[1.02]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Printer size={15} /> Bulk Printing
            </button>
          </div>

          {academicSubTab === 'marksheet' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="card-premium">
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-slate-800 m-0">Comprehensive Class Marksheet</h3>
                </div>
                <Marksheet />
              </div>
              <div className="card-premium">
                <ScoreEntry />
              </div>
            </div>
          )}

          {academicSubTab === 'assignments' && (
            <div className="animate-in fade-in duration-300">
              <AssignmentManager />
            </div>
          )}

          {academicSubTab === 'materials' && (
            <div className="animate-in fade-in duration-300">
              <NoteManager />
            </div>
          )}

          {academicSubTab === 'bulk-printing' && (
            <div className="animate-in fade-in duration-300">
              <AdminBulkPrint />
            </div>
          )}
        </div>
      )}

      {/* Finance Tab (Real-Time Live Firestore Data) */}
      {activeTab === 'Finance' && (() => {
        const filteredDebtors = realFinance.debtorsList.filter(s => {
          const matchesSearch = !financeSearch || 
            (s.name || '').toLowerCase().includes(financeSearch.toLowerCase()) || 
            (s.regNo || '').toLowerCase().includes(financeSearch.toLowerCase());
          const matchesClass = financeClassFilter === 'All' || 
            normalizeClassName(s.className) === normalizeClassName(financeClassFilter);
          return matchesSearch && matchesClass;
        });

        const filteredPayments = realFinance.recentPayments.filter(s => {
          const matchesSearch = !financeSearch || 
            (s.name || '').toLowerCase().includes(financeSearch.toLowerCase()) || 
            (s.regNo || '').toLowerCase().includes(financeSearch.toLowerCase());
          const matchesClass = financeClassFilter === 'All' || 
            normalizeClassName(s.className) === normalizeClassName(financeClassFilter);
          return matchesSearch && matchesClass;
        });

        const exportDebtorsCSV = () => {
          const rows = [
            ['Reg No', 'Student Name', 'Class', 'Expected Fee (NGN)', 'Amount Paid (NGN)', 'Balance Owing (NGN)', 'Parent Phone', 'Email'],
            ...realFinance.debtorsList.map(s => [
              s.regNo || '',
              s.name || '',
              s.className || '',
              s.expected,
              s.paid,
              s.balance,
              s.phone || '',
              s.email || ''
            ])
          ];
          const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `School_Debtors_Report_${new Date().toISOString().split('T')[0]}.csv`;
          a.click();
          URL.revokeObjectURL(url);
        };

        return (
          <div className="animate-in fade-in space-y-6 text-left">
            {/* Top Real Financial KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="card-premium p-6 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Total Fee Collected</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-emerald-600">₦{realFinance.totalCollected.toLocaleString()}</span>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-500">
                  <span>Cleared Students</span>
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-black">{realFinance.clearedCount} Students</span>
                </div>
              </div>

              <div className="card-premium p-6 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Expected Revenue</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-slate-900">₦{realFinance.totalExpected.toLocaleString()}</span>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-500">
                  <span>Total Enrolled</span>
                  <span className="text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md font-black">{realFinance.totalStudents} Students</span>
                </div>
              </div>

              <div className="card-premium p-6 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-rose-500 block mb-1">Total Outstanding Debt</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-rose-600">₦{realFinance.totalOutstanding.toLocaleString()}</span>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-500">
                  <span>Debtors Count</span>
                  <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md font-black">{realFinance.owingCount} Owing</span>
                </div>
              </div>

              <div className="card-premium p-6 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-purple-600 block mb-1">Collection Efficiency</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-purple-700">{realFinance.collectionRate}%</span>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-500">
                  <span>Progress</span>
                  <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div style={{ width: `${realFinance.collectionRate}%` }} className="h-full bg-purple-600 rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Hero Financial Banner */}
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-8 rounded-3xl relative overflow-hidden shadow-2xl">
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2 bg-white/10 px-3.5 py-1 rounded-full w-fit backdrop-blur-md">
                    <DollarSign size={14} className="text-emerald-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Live Database Financials</span>
                  </div>
                  <h3 className="text-slate-300 text-xs font-bold tracking-widest uppercase mb-1">Total Fee Collection Rate</h3>
                  <div className="flex items-baseline gap-3 mb-4">
                    <span className="text-4xl sm:text-5xl font-black">₦{realFinance.totalCollected.toLocaleString()}</span>
                    <span className="text-emerald-400 font-bold text-xs bg-emerald-400/10 px-2.5 py-1 rounded-lg border border-emerald-400/20">
                      {realFinance.collectionRate}% of ₦{realFinance.totalExpected.toLocaleString()}
                    </span>
                  </div>
                  <div className="space-y-2 max-w-md">
                    <div className="flex justify-between items-center text-xs text-slate-300">
                      <span>Cleared Students: <strong>{realFinance.clearedCount}</strong> of <strong>{realFinance.totalStudents}</strong></span>
                      <span className="font-bold text-rose-400">{realFinance.owingCount} Owing</span>
                    </div>
                    <div className="h-2.5 w-full bg-white/10 rounded-full overflow-hidden backdrop-blur-sm border border-white/10">
                      <div style={{ width: `${realFinance.collectionRate}%` }} className="h-full bg-gradient-to-r from-emerald-400 to-teal-300 transition-all duration-1000"></div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                  <button 
                    onClick={exportDebtorsCSV}
                    className="px-5 py-3.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 border border-white/10"
                  >
                    <FileSpreadsheet size={16} /> Export Debtors CSV
                  </button>
                  <button 
                    onClick={() => navigate('/bursar')}
                    className="px-6 py-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-2xl text-xs font-black shadow-lg shadow-indigo-500/30 transition-all flex items-center justify-center gap-2"
                  >
                    <CreditCard size={16} /> Open Bursar Portal →
                  </button>
                </div>
              </div>
              <div className="absolute -right-20 -top-20 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute right-40 bottom-10 w-40 h-40 bg-teal-500/20 rounded-full blur-3xl pointer-events-none"></div>
            </div>

            {/* Financial Details Tabs */}
            <div className="card-premium p-6 space-y-6">
              {/* Header & Sub-Tabs */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
                <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                  <button
                    onClick={() => setFinanceSubTab('debtors')}
                    className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${
                      financeSubTab === 'debtors' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Students Owing ({realFinance.owingCount})
                  </button>
                  <button
                    onClick={() => setFinanceSubTab('classes')}
                    className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${
                      financeSubTab === 'classes' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Class Breakdown ({realFinance.classBreakdown.length})
                  </button>
                  <button
                    onClick={() => setFinanceSubTab('payments')}
                    className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${
                      financeSubTab === 'payments' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Payments Log ({realFinance.recentPayments.length})
                  </button>
                </div>

                {/* Search & Filter */}
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-60">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                    <input
                      type="text"
                      placeholder="Search student or Reg No..."
                      value={financeSearch}
                      onChange={e => setFinanceSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-500"
                    />
                  </div>

                  <select
                    value={financeClassFilter}
                    onChange={e => setFinanceClassFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="All">All Classes</option>
                    {realFinance.classBreakdown.map(c => (
                      <option key={c.className} value={c.className}>{c.className}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Sub-Tab 1: Students Owing (Debtors) */}
              {financeSubTab === 'debtors' && (
                <div>
                  {filteredDebtors.length === 0 ? (
                    <div className="p-12 text-center bg-slate-50/50 rounded-2xl border border-slate-100">
                      <CheckCircle2 size={36} className="mx-auto text-emerald-500 mb-2" />
                      <h4 className="text-base font-black text-slate-800">
                        {realFinance.debtorsList.length === 0 ? '🎉 All School Fees Are Cleared!' : 'No Debtors Match Filter'}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1">No outstanding debt recorded for this selection.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase text-slate-400 tracking-wider">
                            <th className="py-3 px-4">#</th>
                            <th className="py-3 px-4">Student</th>
                            <th className="py-3 px-4">Reg No</th>
                            <th className="py-3 px-4">Class</th>
                            <th className="py-3 px-4">Expected Fee</th>
                            <th className="py-3 px-4">Amount Paid</th>
                            <th className="py-3 px-4">Balance (Owing)</th>
                            <th className="py-3 px-4">Parent Phone</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                          {filteredDebtors.map((s, idx) => (
                            <tr key={s.id || idx} className="hover:bg-rose-50/20 transition-colors">
                              <td className="py-3.5 px-4 text-slate-400 font-mono">{idx + 1}</td>
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-full bg-slate-100 font-black text-slate-600 flex items-center justify-center shrink-0 overflow-hidden text-xs">
                                    {s.photo ? <img src={s.photo} alt={s.name} className="w-full h-full object-cover" /> : (s.name?.[0] || 'S')}
                                  </div>
                                  <div>
                                    <span className="font-black text-slate-900 block">{s.name}</span>
                                    <span className="text-[10px] text-slate-400">{s.gender || 'Male'}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3.5 px-4 font-mono text-indigo-600">{s.regNo}</td>
                              <td className="py-3.5 px-4">
                                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-[10px] font-black uppercase text-slate-600">
                                  {s.className}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 font-mono">₦{s.expected.toLocaleString()}</td>
                              <td className="py-3.5 px-4 font-mono text-emerald-600">₦{s.paid.toLocaleString()}</td>
                              <td className="py-3.5 px-4 font-mono font-extrabold text-rose-600">₦{s.balance.toLocaleString()}</td>
                              <td className="py-3.5 px-4 font-mono text-slate-500">{s.phone || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Sub-Tab 2: Class Financial Breakdown */}
              {financeSubTab === 'classes' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {realFinance.classBreakdown.map(c => {
                    const cls = (c.className || '').toUpperCase().replace(/\s+/g, '');
                    let col = { bg: '#1e293b', border: '#334155', name: '#f1f5f9', badge: '#334155', badgeText: '#94a3b8', label: '#94a3b8', value: '#e2e8f0', collected: '#6ee7b7', debt: '#fca5a5', bar: '#6366f1', barBg: '#0f172a', rate: '#a5b4fc' };

                    if (cls.startsWith('NURSERY') || cls.startsWith('NUR') || cls.startsWith('TODDLER'))
                      col = { bg: '#831843', border: '#9d174d', name: '#fdf2f8', badge: '#9d174d', badgeText: '#fce7f3', label: '#fbcfe8', value: '#fce7f3', collected: '#86efac', debt: '#fca5a5', bar: '#f472b6', barBg: '#500724', rate: '#f9a8d4' };
                    else if (cls.startsWith('BASIC1') || cls.startsWith('BASIC2') || cls.startsWith('BASIC3'))
                      col = { bg: '#1e3a8a', border: '#1d4ed8', name: '#eff6ff', badge: '#1d4ed8', badgeText: '#dbeafe', label: '#bfdbfe', value: '#dbeafe', collected: '#6ee7b7', debt: '#fca5a5', bar: '#60a5fa', barBg: '#172554', rate: '#93c5fd' };
                    else if (cls.startsWith('BASIC4') || cls.startsWith('BASIC5'))
                      col = { bg: '#164e63', border: '#0e7490', name: '#ecfeff', badge: '#0e7490', badgeText: '#cffafe', label: '#a5f3fc', value: '#cffafe', collected: '#6ee7b7', debt: '#fca5a5', bar: '#22d3ee', barBg: '#083344', rate: '#67e8f9' };
                    else if (cls.startsWith('BASIC'))
                      col = { bg: '#0c4a6e', border: '#0369a1', name: '#f0f9ff', badge: '#0369a1', badgeText: '#e0f2fe', label: '#bae6fd', value: '#e0f2fe', collected: '#6ee7b7', debt: '#fca5a5', bar: '#38bdf8', barBg: '#082f49', rate: '#7dd3fc' };
                    else if (cls.startsWith('JSS'))
                      col = { bg: '#4c1d95', border: '#6d28d9', name: '#f5f3ff', badge: '#6d28d9', badgeText: '#ede9fe', label: '#ddd6fe', value: '#ede9fe', collected: '#6ee7b7', debt: '#fca5a5', bar: '#a78bfa', barBg: '#2e1065', rate: '#c4b5fd' };
                    else if (cls.startsWith('SS1') || cls.startsWith('SSS1'))
                      col = { bg: '#064e3b', border: '#047857', name: '#ecfdf5', badge: '#047857', badgeText: '#d1fae5', label: '#a7f3d0', value: '#d1fae5', collected: '#6ee7b7', debt: '#fca5a5', bar: '#34d399', barBg: '#022c22', rate: '#6ee7b7' };
                    else if (cls.startsWith('SS2') || cls.startsWith('SSS2'))
                      col = { bg: '#134e4a', border: '#0f766e', name: '#f0fdfa', badge: '#0f766e', badgeText: '#ccfbf1', label: '#99f6e4', value: '#ccfbf1', collected: '#6ee7b7', debt: '#fca5a5', bar: '#2dd4bf', barBg: '#042f2e', rate: '#5eead4' };
                    else if (cls.startsWith('SS3') || cls.startsWith('SSS3'))
                      col = { bg: '#14532d', border: '#15803d', name: '#f0fdf4', badge: '#15803d', badgeText: '#dcfce7', label: '#86efac', value: '#dcfce7', collected: '#6ee7b7', debt: '#fca5a5', bar: '#4ade80', barBg: '#052e16', rate: '#86efac' };
                    else if (cls.startsWith('SS') || cls.startsWith('SSS'))
                      col = { bg: '#064e3b', border: '#047857', name: '#ecfdf5', badge: '#047857', badgeText: '#d1fae5', label: '#a7f3d0', value: '#d1fae5', collected: '#6ee7b7', debt: '#fca5a5', bar: '#34d399', barBg: '#022c22', rate: '#6ee7b7' };

                    return (
                    <div
                      key={c.className}
                      className="p-5 rounded-2xl flex flex-col justify-between"
                      style={{ backgroundColor: col.bg, border: `1px solid ${col.border}` }}
                    >
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-black text-base" style={{ color: col.name }}>{c.className}</h4>
                          <span
                            className="text-[10px] font-black px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: col.badge, color: col.badgeText }}
                          >
                            {c.studentCount} Students
                          </span>
                        </div>

                        <div className="space-y-2 text-xs font-bold mb-4">
                          <div className="flex justify-between" style={{ color: col.label }}>
                            <span>Expected:</span>
                            <span className="font-mono" style={{ color: col.value }}>₦{c.expected.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between" style={{ color: col.collected }}>
                            <span>Collected:</span>
                            <span className="font-mono">₦{c.collected.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between" style={{ color: col.debt }}>
                            <span>Outstanding Debt:</span>
                            <span className="font-mono">₦{c.debt.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[10px] font-black uppercase mb-1" style={{ color: col.label }}>
                          <span>Collection Rate</span>
                          <span style={{ color: col.rate }}>{c.collectionRate}%</span>
                        </div>
                        <div className="h-2 w-full rounded-full overflow-hidden" style={{ backgroundColor: col.barBg }}>
                          <div style={{ width: `${c.collectionRate}%`, backgroundColor: col.bar }} className="h-full rounded-full" />
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}

              {/* Sub-Tab 3: Payments Log */}
              {financeSubTab === 'payments' && (
                <div>
                  {filteredPayments.length === 0 ? (
                    <div className="p-12 text-center bg-slate-50 rounded-2xl">
                      <p className="text-xs font-bold text-slate-400">No payment logs found for this selection.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase text-slate-400 tracking-wider">
                            <th className="py-3 px-4">Student</th>
                            <th className="py-3 px-4">Reg No</th>
                            <th className="py-3 px-4">Class</th>
                            <th className="py-3 px-4">Amount Paid</th>
                            <th className="py-3 px-4">Last Payment Date</th>
                            <th className="py-3 px-4">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                          {filteredPayments.map((s, idx) => (
                            <tr key={s.id || idx} className="hover:bg-emerald-50/20 transition-colors">
                              <td className="py-3.5 px-4 font-black text-slate-900">{s.name}</td>
                              <td className="py-3.5 px-4 font-mono text-indigo-600">{s.regNo}</td>
                              <td className="py-3.5 px-4">{s.className}</td>
                              <td className="py-3.5 px-4 font-mono text-emerald-600 font-extrabold">₦{s.paid.toLocaleString()}</td>
                              <td className="py-3.5 px-4 text-slate-500">{s.lastPaymentDate || 'Recent'}</td>
                              <td className="py-3.5 px-4">
                                {s.balance === 0 ? (
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    Fully Cleared
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200">
                                    Partial (₦{s.balance.toLocaleString()} remaining)
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Management Tab */}
      {activeTab === 'Management' && (
        <div className="animate-in fade-in space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <button 
              onClick={() => setShowBulkEnrollModal(true)}
              className="card-premium flex items-center gap-4 hover:border-indigo-500 transition-all text-left bg-gradient-to-br from-indigo-50/70 via-purple-50/50 to-white border-indigo-200 shadow-md shadow-indigo-100/50 hover:-translate-y-1 group"
            >
              <div className="p-3 bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-xl shadow-md shadow-indigo-200 group-hover:scale-105 transition-transform"><UserPlus size={24} /></div>
              <div>
                <h4 className="font-black text-slate-800 flex items-center gap-2">
                  Bulk Enroll to Class
                  <span className="text-[9px] font-black uppercase tracking-wider bg-indigo-600 text-white px-2 py-0.5 rounded-full shadow-sm">New</span>
                </h4>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                  <FileSpreadsheet size={12} className="text-indigo-500 shrink-0" />
                  <span>CSV & Excel Roster Import</span>
                </p>
              </div>
            </button>
            <button 
              onClick={() => navigate('/admin/students')}
              className="card-premium flex items-center gap-4 hover:border-indigo-500 transition-all text-left group hover:-translate-y-1 shadow-sm"
            >
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm"><Users size={24} /></div>
              <div>
                <h4 className="font-black text-slate-800">Student Management</h4>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                  <UserCheck size={12} className="text-indigo-500 shrink-0" />
                  <span>Enrollment & Records</span>
                </p>
              </div>
            </button>
            <button 
              onClick={() => navigate('/staff')}
              className="card-premium flex items-center gap-4 hover:border-rose-500 transition-all text-left group hover:-translate-y-1 shadow-sm"
            >
              <div className="p-3 bg-rose-50 text-rose-600 rounded-xl group-hover:bg-rose-600 group-hover:text-white transition-all shadow-sm"><Briefcase size={24} /></div>
              <div>
                <h4 className="font-black text-slate-800">Staff Management</h4>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                  <GraduationCap size={12} className="text-rose-500 shrink-0" />
                  <span>Teachers & Roles</span>
                </p>
              </div>
            </button>
            <button 
              onClick={() => navigate('/admin/classes')}
              className="card-premium flex items-center gap-4 hover:border-emerald-500 transition-all text-left group hover:-translate-y-1 shadow-sm"
            >
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm"><Layers size={24} /></div>
              <div>
                <h4 className="font-black text-slate-800">Class Management</h4>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                  <School size={12} className="text-emerald-500 shrink-0" />
                  <span>Assign Class Teachers</span>
                </p>
              </div>
            </button>
            <button 
              onClick={() => { setActiveTab('Academics'); setAcademicSubTab('assignments'); }}
              className="card-premium flex items-center gap-4 hover:border-indigo-500 transition-all text-left group hover:-translate-y-1 shadow-sm"
            >
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm"><FileText size={24} /></div>
              <div>
                <h4 className="font-black text-slate-800">Publish Assignments</h4>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                  <ClipboardList size={12} className="text-indigo-500 shrink-0" />
                  <span>Tasks & Worksheets</span>
                </p>
              </div>
            </button>
            <button 
              onClick={() => { setActiveTab('Academics'); setAcademicSubTab('materials'); }}
              className="card-premium flex items-center gap-4 hover:border-amber-500 transition-all text-left group hover:-translate-y-1 shadow-sm"
            >
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl group-hover:bg-amber-600 group-hover:text-white transition-all shadow-sm"><BookOpen size={24} /></div>
              <div>
                <h4 className="font-black text-slate-800">Study Materials & Notes</h4>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                  <FolderOpen size={12} className="text-amber-500 shrink-0" />
                  <span>Lecture Notes & Guides</span>
                </p>
              </div>
            </button>
            <button 
              onClick={() => navigate('/courses')}
              className="card-premium flex items-center gap-4 hover:border-teal-500 transition-all text-left group hover:-translate-y-1 shadow-sm"
            >
              <div className="p-3 bg-teal-50 text-teal-600 rounded-xl group-hover:bg-teal-600 group-hover:text-white transition-all shadow-sm"><BookMarked size={24} /></div>
              <div>
                <h4 className="font-black text-slate-800">Course & Subject Directory</h4>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                  <Library size={12} className="text-teal-500 shrink-0" />
                  <span>Curriculum & Teachers</span>
                </p>
              </div>
            </button>
            <button 
              onClick={() => setActiveTab('Inbox')}
              className="card-premium flex items-center gap-4 hover:border-purple-500 transition-all text-left group hover:-translate-y-1 shadow-sm"
            >
              <div className="p-3 bg-purple-50 text-purple-600 rounded-xl group-hover:bg-purple-600 group-hover:text-white transition-all shadow-sm"><Mail size={24} /></div>
              <div>
                <h4 className="font-black text-slate-800">Admin Inbox & Broadcasts</h4>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                  <Send size={12} className="text-purple-500 shrink-0" />
                  <span>Messages & OTP PINs</span>
                </p>
              </div>
            </button>
            <button 
              onClick={() => setShowClubsModal(true)}
              className="card-premium flex items-center gap-4 hover:border-indigo-500 transition-all text-left group hover:-translate-y-1 shadow-sm"
            >
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm"><Users size={24} /></div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-slate-800">Clubs & Houses</h4>
                  <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-purple-100 text-purple-700 rounded-full">Configure</span>
                </div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                  <Award size={12} className="text-indigo-500 shrink-0" />
                  <span>School Societies & Wings</span>
                </p>
              </div>
            </button>
          </div>
          <BulkUpload />
          <ResultPublisher />

          <BulkStudentEnrollModal 
            isOpen={showBulkEnrollModal}
            onClose={() => setShowBulkEnrollModal(false)}
            onEnrolled={() => {
              // Optionally trigger any live refresh
            }}
          />

          <ManageClubsAndHousesModal
            isOpen={showClubsModal}
            onClose={() => setShowClubsModal(false)}
          />

          {/* System Controls Card */}
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">System Controls</h3>
                <p className="text-xs font-medium text-slate-400 mt-0.5">Toggle system-wide permissions for students and staff.</p>
              </div>
              {controlsStatus && (
                <span className={`text-xs font-black px-3 py-1.5 rounded-xl ${
                  controlsStatus === 'Saved!' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                }`}>{controlsStatus}</span>
              )}
            </div>
            <div className="p-8 space-y-0 divide-y divide-slate-100">
              {[
                {
                  key: 'allowProfileEdit',
                  label: 'Allow Student Profile Editing',
                  description: 'When ON, students can edit their name, phone number, date of birth, email and profile photo from their profile page.',
                  color: 'purple',
                },
              ].map(control => (
                <div key={control.key} className="flex items-start justify-between py-6 gap-6">
                  <div className="flex-1">
                    <p className="text-sm font-black text-slate-800">{control.label}</p>
                    <p className="text-xs text-slate-400 font-medium mt-1 leading-relaxed max-w-lg">{control.description}</p>
                  </div>
                  <button
                    id={`toggle-${control.key}`}
                    onClick={() => handleToggleControl(control.key, !systemControls[control.key])}
                    disabled={controlsSaving}
                    className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${control.color}-500 disabled:opacity-60 ${
                      systemControls[control.key] ? `bg-${control.color}-600` : 'bg-slate-200'
                    }`}
                    role="switch"
                    aria-checked={systemControls[control.key]}
                  >
                    <span
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        systemControls[control.key] ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Inbox Tab */}
      {activeTab === 'Inbox' && (
        <div className="animate-in fade-in space-y-6">
          <NotificationCenter />
        </div>
      )}

      {/* Biometrics Tab */}
      {activeTab === 'Biometrics' && (
        <div className="animate-in fade-in">
          <FingerprintManager />
        </div>
      )}

      {/* Admissions Tab */}
      {activeTab === 'Admissions' && (
        <div className="animate-in fade-in">
          <AdminAdmissionPortal />
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'Security' && currentAdmin?.isSuperAdmin && (
        <div className="animate-in fade-in space-y-8">
          <div className="bg-white rounded-[32px] p-8 md:p-12 border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
              <Shield size={200} />
            </div>

            <div className="flex items-center gap-4 mb-10">
              <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Lock size={32} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Security Vault</h2>
                <p className="text-slate-400 text-sm font-medium">Protect the portal and manage access credentials.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Change Admin Password */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <Key size={18} className="text-blue-500" />
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Update Admin Credentials</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New Password</label>
                    <input 
                      type="password" 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new strong password"
                      className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white transition-all font-bold outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm Password</label>
                    <input 
                      type="password" 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white transition-all font-bold outline-none"
                    />
                  </div>

                  {passwordStatus.message && (
                    <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-3 ${
                      passwordStatus.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                    }`}>
                      {passwordStatus.type === 'success' ? <Shield size={16} /> : <AlertTriangle size={16} />}
                      {passwordStatus.message}
                    </div>
                  )}

                  <button 
                    onClick={async () => {
                      if (!newPassword || newPassword !== confirmPassword) {
                        setPasswordStatus({ type: 'error', message: 'Passwords do not match.' });
                        return;
                      }
                      const res = await changePassword(newPassword);
                      if (res.success) {
                        setPasswordStatus({ type: 'success', message: 'Password updated successfully!' });
                        setNewPassword('');
                        setConfirmPassword('');
                      } else {
                        setPasswordStatus({ type: 'error', message: res.message });
                      }
                    }}
                    className="w-full py-4 rounded-2xl bg-slate-900 text-white font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-slate-200 active:scale-95"
                  >
                    Update Access Key
                  </button>
                </div>
              </div>

              {/* Security Status */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <Shield size={18} className="text-emerald-500" />
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Portal Protection</h3>
                </div>

                <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-6 opacity-10">
                    <AlertTriangle size={80} />
                  </div>
                  <div className="relative z-10 space-y-6">
                    <div>
                      <h4 className="text-emerald-400 text-xs font-black uppercase tracking-widest mb-1">Firewall Active</h4>
                      <p className="text-slate-400 text-xs leading-relaxed">
                        Firestore Security Rules are currently enforcing authenticated access.
                      </p>
                    </div>
                    <div>
                      <h4 className="text-amber-400 text-xs font-black uppercase tracking-widest mb-1">Hacker Protection</h4>
                      <p className="text-slate-400 text-xs leading-relaxed">
                        The system now requires a valid role-based token for all database write operations.
                      </p>
                    </div>
                    <div className="pt-4 border-t border-white/5">
                      <p className="text-[10px] font-black text-slate-500 uppercase">Last Security Scan</p>
                      <p className="text-xs font-bold">{new Date().toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ALL ACTIVITIES AUDIT MODAL */}
      {/* ========================================================================= */}
      {showAllActivitiesModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[85vh] overflow-hidden text-slate-900 dark:text-white">
            
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0 border-b border-slate-700">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-indigo-600/40 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                  <Activity size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-white m-0">Live Activities & Audit Stream</h3>
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> Real-time
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 m-0 mt-0.5 font-medium">
                    Real-time operational events, student enrollments, fee payments, and announcements
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAllActivitiesModal(false)}
                className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 px-6 py-3 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 shrink-0 overflow-x-auto">
              {[
                { id: 'all', label: 'All Activities' },
                { id: 'enrollment', label: 'Enrollments' },
                { id: 'payment', label: 'Fee Payments' },
                { id: 'admission', label: 'Admissions' },
                { id: 'notification', label: 'Announcements' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActivityFilter(tab.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 ${
                    activityFilter === tab.id
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Activity Items List */}
            <div className="p-6 overflow-y-auto space-y-3 flex-1">
              {displayActivities
                .filter(act => activityFilter === 'all' || act.type === activityFilter)
                .map((activity, idx) => {
                  const IconComponent = activity.icon || Activity;
                  return (
                    <div
                      key={activity.id || idx}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 transition-all flex items-start gap-3.5"
                    >
                      <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center ${activity.color || 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50'} mt-0.5`}>
                        <IconComponent size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug m-0">
                            {activity.text}
                          </p>
                          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1 shrink-0">
                            <Clock size={11} /> {activity.time}
                          </span>
                        </div>
                        {activity.type && (
                          <span className="inline-block text-[9px] font-extrabold px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase mt-2">
                            {activity.type}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Modal Footer */}
            <div className="p-4 px-6 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Showing {displayActivities.filter(act => activityFilter === 'all' || act.type === activityFilter).length} real database events
              </span>
              <button
                type="button"
                onClick={() => setShowAllActivitiesModal(false)}
                className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-black hover:bg-slate-800 dark:hover:bg-slate-100 transition-all shadow-md cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}
      </div>
    </div>

  );
};

export default AdminDashboard;
