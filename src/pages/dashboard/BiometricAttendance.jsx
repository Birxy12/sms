import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../lib/firebase';
import {
  collection, getDocs, addDoc, serverTimestamp,
  where, orderBy, query
} from 'firebase/firestore';
import {
  Fingerprint, CheckCircle, XCircle, Clock, Users, Search,
  Calendar, AlertCircle, Loader2, Shield, RefreshCw, UserCheck,
  Hash
} from 'lucide-react';

// ── helpers ────────────────────────────────────────────────────────────────
function fromBase64url(b64) {
  const b = b64.replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b);
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function nowStr() {
  return new Date().toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', hour12: true });
}
const webAuthnSupported = () =>
  typeof window !== 'undefined' &&
  window.PublicKeyCredential !== undefined &&
  typeof window.PublicKeyCredential === 'function';

// ── Main Component ──────────────────────────────────────────────────────────
const BiometricAttendance = () => {
  const [students, setStudents] = useState([]);
  const [todayLogs, setTodayLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [regInput, setRegInput] = useState('');
  const [selectedClass, setSelectedClass] = useState('All');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [foundStudent, setFoundStudent] = useState(null);
  const [tab, setTab] = useState('scan');
  const regRef = useRef(null);

  const classes = ['All', 'JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2 ART', 'SS2 SCIENCE', 'SS3 ART', 'SS3 SCIENCE'];

  const fetchData = async () => {
    setLoading(true);
    try {
      const studSnap = await getDocs(collection(db, 'students'));
      setStudents(studSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      try {
        const logSnap = await getDocs(query(
          collection(db, 'attendance'),
          where('date', '==', todayStr()),
          orderBy('timestamp', 'desc')
        ));
        setTodayLogs(logSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (_) { setTodayLogs([]); }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleLookup = () => {
    const reg = regInput.trim().toLowerCase();
    if (!reg) return;
    const found = students.find(s =>
      (s.regNo || s.reg_no || '').toLowerCase() === reg
    );
    if (!found) {
      setStatus({ type: 'error', message: `No student found with Reg No: ${regInput}` });
      setFoundStudent(null);
      return;
    }
    const already = todayLogs.find(l => l.studentId === found.id);
    if (already) {
      setStatus({ type: 'warn', message: `${found.name} is already marked present today at ${already.time}.` });
      setFoundStudent(null);
      return;
    }
    setFoundStudent(found);
    setStatus({ type: '', message: '' });
  };

  const handleFingerprintScan = async () => {
    if (!foundStudent) return;
    if (!webAuthnSupported()) {
      setStatus({ type: 'error', message: 'WebAuthn / biometrics not supported in this browser.' });
      return;
    }
    const credId = foundStudent.fingerprintCredentialId;
    if (!credId) {
      setStatus({ type: 'error', message: `${foundStudent.name} has no fingerprint enrolled. Ask admin to enroll first.` });
      return;
    }
    setScanning(true);
    setStatus({ type: 'info', message: 'Place your finger on the sensor\u2026' });
    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      await navigator.credentials.get({
        publicKey: {
          challenge,
          timeout: 30000,
          rpId: window.location.hostname,
          allowCredentials: [{ id: fromBase64url(credId), type: 'public-key' }],
          userVerification: 'required'
        }
      });
      await markAttendance(foundStudent, 'fingerprint');
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setStatus({ type: 'error', message: 'Fingerprint verification cancelled or timed out.' });
      } else {
        setStatus({ type: 'error', message: `Biometric error: ${err.message}` });
      }
      setScanning(false);
    }
  };

  const handleManualMark = async () => {
    if (!foundStudent) return;
    if (!window.confirm(`Mark ${foundStudent.name} (${foundStudent.regNo || foundStudent.reg_no}) as present manually?`)) return;
    await markAttendance(foundStudent, 'manual');
  };

  const markAttendance = async (student, method) => {
    setScanning(true);
    try {
      const record = {
        studentId: student.id,
        regNo: student.regNo || student.reg_no || '',
        name: student.name || student.NAME || '',
        className: student.className || student.class_name || student.CLASS || '',
        date: todayStr(),
        time: nowStr(),
        timestamp: serverTimestamp(),
        method
      };
      await addDoc(collection(db, 'attendance'), record);
      setTodayLogs(prev => [{ ...record, id: Date.now().toString() }, ...prev]);
      setStatus({
        type: 'success',
        message: `\u2713 ${student.name} marked PRESENT via ${method === 'fingerprint' ? '\uD83E\uDDF6 Fingerprint' : '\u270B Manual'} at ${record.time}`
      });
      setFoundStudent(null);
      setRegInput('');
      setTimeout(() => setStatus({ type: '', message: '' }), 5000);
    } catch (err) {
      setStatus({ type: 'error', message: `Failed to save attendance: ${err.message}` });
    } finally {
      setScanning(false);
    }
  };

  const filteredLogs = selectedClass === 'All'
    ? todayLogs
    : todayLogs.filter(l => l.className === selectedClass);

  const presentCount = todayLogs.length;
  const fingerprintCount = todayLogs.filter(l => l.method === 'fingerprint').length;
  const manualCount = todayLogs.filter(l => l.method === 'manual').length;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)', padding: '2rem' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 32 }}>
          <div>
            <h1 style={{ color: 'white', fontSize: 28, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 12, margin: 0 }}>
              <Fingerprint size={32} color="#818cf8" />
              Biometric Attendance
            </h1>
            <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 6, fontWeight: 500 }}>
              {new Date().toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={fetchData} style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 12, cursor: 'pointer', color: 'white' }} title="Refresh">
              <RefreshCw size={16} />
            </button>
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 4, gap: 4 }}>
              {['scan', 'log'].map(t => (
                <button key={t} onClick={() => setTab(t)} style={{
                  padding: '6px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13,
                  background: tab === t ? 'white' : 'transparent', color: tab === t ? '#0f172a' : '#94a3b8', transition: 'all 0.2s'
                }}>
                  {t === 'scan' ? '🫆 Scan' : '📋 Log'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
          {[
            { label: 'Present Today', value: presentCount, icon: UserCheck, color: '#34d399' },
            { label: 'Fingerprint', value: fingerprintCount, icon: Fingerprint, color: '#818cf8' },
            { label: 'Manual', value: manualCount, icon: Shield, color: '#fbbf24' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '20px 16px', textAlign: 'center', backdropFilter: 'blur(10px)' }}>
              <Icon size={22} color={color} style={{ margin: '0 auto 8px' }} />
              <p style={{ color: 'white', fontSize: 26, fontWeight: 900, margin: 0 }}>{value}</p>
              <p style={{ color: '#64748b', fontSize: 11, fontWeight: 600, margin: '4px 0 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Scan Tab */}
        {tab === 'scan' && (
          <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: '2rem', backdropFilter: 'blur(10px)' }}>
            <h2 style={{ color: 'white', fontWeight: 900, fontSize: 18, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Hash size={18} color="#818cf8" /> Enter Reg Number
            </h2>
            <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
              <input
                ref={regRef}
                type="text"
                value={regInput}
                onChange={e => setRegInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLookup()}
                placeholder="e.g. REG/2024/001"
                style={{
                  flex: 1, padding: '14px 20px', borderRadius: 16, background: 'rgba(255,255,255,0.08)',
                  border: '1.5px solid rgba(255,255,255,0.15)', color: 'white', fontSize: 16,
                  fontWeight: 700, outline: 'none'
                }}
              />
              <button onClick={handleLookup} style={{
                padding: '14px 24px', background: '#4f46e5', border: 'none', borderRadius: 16,
                color: 'white', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8
              }}>
                <Search size={18} /> Find
              </button>
            </div>

            {/* Student Card */}
            {foundStudent && (
              <div style={{ background: 'rgba(79,70,229,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 20, padding: '1.5rem', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: '50%', background: '#4f46e5', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 22, fontWeight: 900, overflow: 'hidden', flexShrink: 0
                  }}>
                    {foundStudent.photo
                      ? <img src={foundStudent.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : (foundStudent.name || '?')[0]}
                  </div>
                  <div>
                    <p style={{ color: 'white', fontWeight: 900, fontSize: 20, margin: 0 }}>{foundStudent.name}</p>
                    <p style={{ color: '#94a3b8', fontSize: 13, margin: '4px 0' }}>{foundStudent.regNo || foundStudent.reg_no} · {foundStudent.className || foundStudent.class_name}</p>
                    <span style={{
                      display: 'inline-block', padding: '2px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700, marginTop: 4,
                      background: foundStudent.fingerprintCredentialId ? 'rgba(52,211,153,0.15)' : 'rgba(251,191,36,0.15)',
                      color: foundStudent.fingerprintCredentialId ? '#34d399' : '#fbbf24',
                    }}>
                      {foundStudent.fingerprintCredentialId ? '🫆 Fingerprint Enrolled' : '⚠️ No Fingerprint Enrolled'}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {foundStudent.fingerprintCredentialId && webAuthnSupported() && (
                    <button onClick={handleFingerprintScan} disabled={scanning} style={{
                      flex: 1, minWidth: 180, padding: '16px 24px', background: scanning ? '#374151' : '#4f46e5',
                      border: 'none', borderRadius: 16, color: 'white', fontWeight: 900, fontSize: 15,
                      cursor: scanning ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                    }}>
                      {scanning ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : <Fingerprint size={20} />}
                      {scanning ? 'Verifying\u2026' : 'Scan Fingerprint'}
                    </button>
                  )}
                  <button onClick={handleManualMark} disabled={scanning} style={{
                    flex: 1, minWidth: 180, padding: '16px 24px', background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.15)', borderRadius: 16, color: 'white', fontWeight: 700,
                    fontSize: 15, cursor: scanning ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                  }}>
                    <CheckCircle size={20} /> Mark Manually
                  </button>
                  <button onClick={() => { setFoundStudent(null); setRegInput(''); setStatus({ type: '', message: '' }); }} style={{
                    padding: '16px', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 16, color: '#64748b', cursor: 'pointer'
                  }}>
                    <XCircle size={20} />
                  </button>
                </div>
              </div>
            )}

            {/* Status */}
            {status.message && (
              <div style={{
                padding: '16px 20px', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 12, fontWeight: 700, fontSize: 14,
                background: status.type === 'success' ? 'rgba(52,211,153,0.15)' : status.type === 'error' ? 'rgba(239,68,68,0.15)' : status.type === 'warn' ? 'rgba(251,191,36,0.15)' : 'rgba(99,102,241,0.15)',
                color: status.type === 'success' ? '#34d399' : status.type === 'error' ? '#f87171' : status.type === 'warn' ? '#fbbf24' : '#818cf8',
                border: `1px solid ${status.type === 'success' ? 'rgba(52,211,153,0.3)' : status.type === 'error' ? 'rgba(239,68,68,0.3)' : status.type === 'warn' ? 'rgba(251,191,36,0.3)' : 'rgba(99,102,241,0.3)'}`
              }}>
                {status.type === 'success' ? <CheckCircle size={18} /> : status.type === 'error' ? <XCircle size={18} /> : status.type === 'warn' ? <AlertCircle size={18} /> : <Loader2 size={18} />}
                {status.message}
              </div>
            )}

            {!webAuthnSupported() && (
              <div style={{ marginTop: 16, padding: '16px 20px', borderRadius: 16, background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', color: '#fbbf24', fontSize: 13, fontWeight: 500 }}>
                <strong>WebAuthn not available.</strong> This browser/device doesn't support fingerprint authentication.
                Use manual check-in or switch to Chrome/Edge with Windows Hello or Safari with Touch ID.
              </div>
            )}
          </div>
        )}

        {/* Log Tab */}
        {tab === 'log' && (
          <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: '2rem', backdropFilter: 'blur(10px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
              <h2 style={{ color: 'white', fontWeight: 900, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                <Calendar size={18} color="#818cf8" /> Today's Log
              </h2>
              <select
                value={selectedClass}
                onChange={e => setSelectedClass(e.target.value)}
                style={{ padding: '8px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'white', fontWeight: 700, outline: 'none', fontSize: 13 }}
              >
                {classes.map(c => <option key={c} value={c} style={{ background: '#1e1b4b' }}>{c}</option>)}
              </select>
            </div>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
                <Loader2 size={32} color="#818cf8" style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 0' }}>
                <Users size={48} color="#334155" style={{ margin: '0 auto 16px' }} />
                <p style={{ color: '#64748b', fontWeight: 700 }}>No attendance recorded yet for today.</p>
              </div>
            ) : (
              <div style={{ maxHeight: 500, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filteredLogs.map((log, i) => (
                  <div key={log.id || i} style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px',
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 14, transition: 'background 0.2s'
                  }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(52,211,153,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399', fontWeight: 900, fontSize: 14, flexShrink: 0 }}>
                      {(log.name || '?')[0]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: 'white', fontWeight: 700, fontSize: 14, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.name}</p>
                      <p style={{ color: '#64748b', fontSize: 12, margin: '2px 0 0' }}>{log.regNo} · {log.className}</p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ color: 'white', fontSize: 12, fontWeight: 700, margin: 0 }}>{log.time}</p>
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: 100, fontSize: 10, fontWeight: 800, marginTop: 3,
                        background: log.method === 'fingerprint' ? 'rgba(99,102,241,0.2)' : 'rgba(251,191,36,0.2)',
                        color: log.method === 'fingerprint' ? '#818cf8' : '#fbbf24'
                      }}>
                        {log.method === 'fingerprint' ? '🫆 Biometric' : '✋ Manual'}
                      </span>
                    </div>
                    <CheckCircle size={16} color="#34d399" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default BiometricAttendance;
