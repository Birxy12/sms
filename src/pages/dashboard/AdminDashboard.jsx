import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { ensureFirebaseAuth } from '../../lib/ensureAuth';
import { collection, query, getDocs, orderBy, limit, doc, getDoc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import StatCard from '../../components/StatCard';
import ResultPublisher from '../../components/ResultPublisher';
import Marksheet from '../../components/Marksheet';
import BulkUpload from '../../components/BulkUpload';
import ScoreEntry from '../../components/ScoreEntry';
import StaffDashboard from './StaffDashboard';
import StudentDashboard from './StudentDashboard';
import { expandStudent } from '../../utils/firestoreSchema';
import { Users, GraduationCap, Briefcase, DollarSign, Calendar, TrendingUp, Eye, ArrowLeft, BookOpen, Server, Activity, Database, Layers, Shield, Key, AlertTriangle, Lock, Download, Fingerprint, CheckCircle, XCircle, Loader2, Search, RefreshCw } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
const AdminDashboard = () => {
  const { currentAdmin, changePassword, authReady } = useAdminAuth();
  const [viewMode, setViewMode] = useState('admin'); // admin, staff, student
  const [selectedClass, setSelectedClass] = useState('JSS1');
  const [activeTab, setActiveTab] = useState('Overview');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState({ type: '', message: '' });
  const navigate = useNavigate();

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
  
  const classes = ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2 ART', 'SS2 SCIENCE', 'SS3 ART', 'SS3 SCIENCE'];
  const adminTabs = [
    { id: 'Overview', label: 'Overview', icon: TrendingUp },
    { id: 'Academics', label: 'Academics', icon: BookOpen },
    { id: 'Finance', label: 'Finance', icon: DollarSign },
    { id: 'Management', label: 'Management', icon: Briefcase },
    { id: 'Biometrics', label: 'Biometrics', icon: Fingerprint },
    ...(currentAdmin?.isSuperAdmin ? [{ id: 'Security', label: 'System Security', icon: Shield }] : []),
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
                  <Fingerprint size={32} className="animate-pulse" />
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
                        ? <img src={student.photo} alt="" className="w-full h-full object-cover" />
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
    classes: classes.length,
    demographics: { male: 0, female: 0, others: 0 }
  });

  useEffect(() => {
    let isMounted = true;
    
    if (viewMode === 'admin') {
      const fetchStats = async () => {
        if (!currentAdmin) return;
        if (!authReady) return; // Don't query Firestore until auth is confirmed
        
        try {
          // Fetch students
          const studentSnap = await getDocs(collection(db, 'students'));
          if (!isMounted) return;

          let male = 0;
          let female = 0;
          let others = 0;
          
          studentSnap.forEach(doc => {
            const data = expandStudent(doc.data());
            const mGender = (data.gender || '').toLowerCase();
            if (mGender === 'm' || mGender === 'male') male++;
            else if (mGender === 'f' || mGender === 'female' || mGender === 'girl') female++;
            else others++;
          });

          // Fetch staff (Requires Auth)
          let staffSize = 0;
          try {
            const staffSnap = await getDocs(collection(db, 'staff'));
            staffSize = staffSnap.size;
          } catch (staffErr) {
            console.warn('Could not fetch staff stats:', staffErr.message);
          }

          // Fetch subjects
          let subjectSize = 0;
          try {
            const subjectSnap = await getDocs(collection(db, 'subjects'));
            subjectSize = subjectSnap.size;
          } catch (subErr) {
            console.warn('Could not fetch subjects stats:', subErr.message);
          }

          if (isMounted) {
            setRealStats(prev => ({
              ...prev,
              students: studentSnap.size,
              teachers: staffSize,
              subjects: subjectSize,
              demographics: { male, female, others }
            }));
          }
        } catch (error) {
          console.error('Error fetching dashboard stats:', error);
        }
      };

      fetchStats();
    }

    return () => {
      isMounted = false;
    };
  }, [viewMode, authReady]);

  const stats = [
    { title: 'Total Students', value: realStats.students.toLocaleString(), icon: GraduationCap, color: '#ff6b00' },
    { title: 'Total Teachers', value: realStats.teachers.toLocaleString(), icon: Briefcase, color: '#111111' },
    { title: 'Active Classes', value: realStats.classes.toLocaleString(), icon: Users, color: '#ff6b00' },
    { title: 'Total Subjects', value: realStats.subjects.toLocaleString(), icon: BookOpen, color: '#111111' },
  ];

  const recentActivities = [
    { id: 1, text: 'New student enrolled in JSS1', time: '2 hours ago' },
    { id: 2, text: 'Teacher meeting scheduled for tomorrow', time: '5 hours ago' },
    { id: 3, text: 'Tuition fees payment confirmed for 24 students', time: '1 day ago' },
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
        <h1 className="text-3xl font-black text-slate-800">Admin Dashboard</h1>
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
      <div className="modern-tabs-container hide-scrollbar overflow-x-auto max-w-full">
        {adminTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`modern-tab-item ${activeTab === tab.id ? 'active' : ''}`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>


      {/* Tab Content with Animation */}
      <div className="tab-content-animate" key={activeTab}>
        {/* Overview Tab */}
        {activeTab === 'Overview' && (

        <div className="animate-in fade-in space-y-6">
          {/* Site Health */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-2">
            <div className="card-premium p-6 flex items-center gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><Server size={24} /></div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">System Status</p>
                <h4 className="text-lg font-black text-slate-800">Online & Active</h4>
              </div>
            </div>
            <div className="card-premium p-6 flex items-center gap-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Database size={24} /></div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Database Sync</p>
                <h4 className="text-lg font-black text-slate-800">Real-time (12ms)</h4>
              </div>
            </div>
            <div className="card-premium p-6 flex items-center gap-4">
              <div className="p-3 bg-teal-50 text-teal-600 rounded-xl"><Activity size={24} /></div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Server Load</p>
                <h4 className="text-lg font-black text-slate-800">Optimal (24%)</h4>
              </div>
            </div>
          </div>

          <div className="stats-grid">
            {stats.map((stat, index) => (
              <StatCard key={index} {...stat} />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="card-premium lg:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-800">Academic Performance (Avg. Grades)</h3>
                <div className="flex gap-2">
                  <span className="flex items-center gap-1 text-xs font-medium text-slate-500"><div className="w-2 h-2 rounded-full bg-indigo-500"></div> CAT 1</span>
                  <span className="flex items-center gap-1 text-xs font-medium text-slate-500"><div className="w-2 h-2 rounded-full bg-teal-500"></div> Exam</span>
                </div>
              </div>
              <div className="space-y-4">
                {[
                  { label: 'MATHEMATICS', cat: 75, exam: 82 },
                  { label: 'ENGLISH', cat: 85, exam: 78 },
                  { label: 'SCIENCE', cat: 68, exam: 90 },
                  { label: 'IGBO', cat: 92, exam: 88 },
                ].map((subject, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                      <span>{subject.label}</span>
                      <span>Avg: {((subject.cat + subject.exam) / 2).toFixed(1)}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                      <div style={{ width: `${subject.cat}%` }} className="h-full bg-indigo-500 rounded-l-full"></div>
                      <div style={{ width: `${subject.exam}%` }} className="h-full bg-teal-500 opacity-60"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card-premium">
              <h3 className="text-lg font-bold text-slate-800 mb-6 text-center">Student Demographics</h3>
              <div className="relative w-48 h-48 mx-auto mb-6">
                <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                  <circle cx="18" cy="18" r="16" fill="transparent" stroke="#f1f5f9" strokeWidth="3"></circle>
                  {totalGender > 0 && (
                    <>
                      <circle cx="18" cy="18" r="16" fill="transparent" stroke="#ff6b00" strokeWidth="3" strokeDasharray={dashMale}></circle>
                      <circle cx="18" cy="18" r="16" fill="transparent" stroke="#1e293b" strokeWidth="3" strokeDasharray={dashFemale} strokeDashoffset={femaleOffset}></circle>
                    </>
                  )}
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="text-3xl font-black text-slate-800">{realStats.students.toLocaleString()}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Students</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#ff6b00]"></div>
                    <span className="text-sm font-medium text-slate-600">Male</span>
                  </div>
                  <span className="text-sm font-bold text-slate-800">{malePercent}% ({realStats.demographics.male})</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#1e293b]"></div>
                    <span className="text-sm font-medium text-slate-600">Female & Others</span>
                  </div>
                  <span className="text-sm font-bold text-slate-800">{femalePercent}% ({realStats.demographics.female + realStats.demographics.others})</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="card-premium lg:col-span-2 overflow-hidden">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-800">Enrollment Growth (2026)</h3>
              </div>
              <div className="h-48 flex items-end justify-between gap-2 md:gap-4 pb-2 border-b border-slate-100">
                {[
                  { m: 'Jan', v: 40 }, { m: 'Feb', v: 65 }, { m: 'Mar', v: 45 }, 
                  { m: 'Apr', v: 85 }, { m: 'May', v: 95 }, { m: 'Jun', v: 75 }
                ].map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
                    <div className="w-full bg-slate-100 group-hover:bg-indigo-50 rounded-t-xl relative transition-all h-full flex items-end">
                      <div 
                        className="w-full bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t-xl transition-all duration-1000"
                        style={{ height: `${d.v}%`, backgroundColor: i === 4 ? 'var(--primary)' : '#4f46e5' }}
                      ></div>
                      <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded-md font-bold whitespace-nowrap shadow-lg transition-all hidden md:block">
                        +{d.v} Students
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{d.m}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card-premium">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Recent Activities</h3>
              <div className="space-y-4">
                {recentActivities.map(activity => (
                  <div key={activity.id} className="pb-3 border-b border-slate-100 last:border-0">
                    <p className="text-sm text-slate-700 font-medium mb-1">{activity.text}</p>
                    <span className="text-xs text-slate-400 font-medium">{activity.time}</span>
                  </div>
                ))}
              </div>
              <button className="w-full mt-4 py-2.5 text-sm font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors">
                View All Activities
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Academics Tab */}
      {activeTab === 'Academics' && (
        <div className="animate-in fade-in space-y-6">
          <div className="card-premium">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h3 className="text-xl font-bold text-slate-800 m-0">Comprehensive Class Marksheet</h3>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <span className="text-sm font-bold text-slate-500">Class:</span>
                <select 
                  value={selectedClass} 
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-slate-200 outline-none bg-slate-50 font-bold focus:ring-2 focus:ring-indigo-500"
                >
                  {classes.map(cls => <option key={cls} value={cls}>{cls}</option>)}
                </select>
              </div>
            </div>
            <Marksheet className={selectedClass} />
          </div>
          <div className="card-premium">
            <ScoreEntry />
          </div>
        </div>
      )}

      {/* Finance Tab */}
      {activeTab === 'Finance' && (
        <div className="animate-in fade-in space-y-6">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-8 rounded-3xl relative overflow-hidden shadow-2xl">
            <div className="relative z-10">
              <h3 className="text-slate-400 text-sm font-bold tracking-widest uppercase mb-2">Total Fee Collection</h3>
              <div className="flex items-baseline gap-3 mb-8">
                <span className="text-5xl font-black">₦12.4M</span>
                <span className="text-emerald-400 font-bold text-sm bg-emerald-400/10 px-2 py-1 rounded-lg">+8.2% vs last term</span>
              </div>
              <div className="space-y-4 max-w-md">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-300 font-medium">Paid Students</span>
                  <span className="font-bold">842 / 1,284</span>
                </div>
                <div className="h-3 w-full bg-slate-700/50 rounded-full overflow-hidden backdrop-blur-sm border border-slate-600/50">
                  <div style={{ width: '65%' }} className="h-full bg-gradient-to-r from-emerald-500 to-teal-400"></div>
                </div>
                <button className="w-full bg-white/10 hover:bg-white/20 text-white py-3.5 rounded-xl font-bold transition-all mt-6 backdrop-blur-sm">
                  View Detailed Financial Report
                </button>
              </div>
            </div>
            <div className="absolute -right-20 -top-20 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute right-40 bottom-10 w-40 h-40 bg-teal-500/20 rounded-full blur-3xl pointer-events-none"></div>
          </div>
        </div>
      )}

      {/* Management Tab */}
      {activeTab === 'Management' && (
        <div className="animate-in fade-in space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <button 
              onClick={() => navigate('/admin/students')}
              className="card-premium flex items-center gap-4 hover:border-indigo-500 transition-all text-left"
            >
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Users size={24} /></div>
              <div>
                <h4 className="font-black text-slate-800">Student Management</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Enrollment & Records</p>
              </div>
            </button>
            <button 
              onClick={() => navigate('/staff')}
              className="card-premium flex items-center gap-4 hover:border-indigo-500 transition-all text-left"
            >
              <div className="p-3 bg-rose-50 text-rose-600 rounded-xl"><Briefcase size={24} /></div>
              <div>
                <h4 className="font-black text-slate-800">Staff Management</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Teachers & Roles</p>
              </div>
            </button>
            <button 
              onClick={() => navigate('/admin/classes')}
              className="card-premium flex items-center gap-4 hover:border-indigo-500 transition-all text-left"
            >
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><Layers size={24} /></div>
              <div>
                <h4 className="font-black text-slate-800">Class Management</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assign Class Teachers</p>
              </div>
            </button>
          </div>
          <BulkUpload />
          <ResultPublisher />

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

      {/* Biometrics Tab */}
      {activeTab === 'Biometrics' && (
        <div className="animate-in fade-in">
          <FingerprintManager />
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
      </div>
    </div>

  );
};

export default AdminDashboard;
