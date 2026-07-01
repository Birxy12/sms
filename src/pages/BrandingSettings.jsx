import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Save, RefreshCcw, Palette, School, BookOpen, CheckCircle, Loader2, Calendar, GraduationCap, Users, ChevronDown, AlertTriangle, ArrowRight, X, CheckSquare } from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { runAutoPromotion, fetchStudentsForClass, promoteOneSS1Student } from '../utils/promotion';
import { SS1_SUBJECTS } from '../utils/subjectConfig';

const BrandingSettings = () => {
  const { 
    schoolName, setSchoolName, 
    primaryColor, setPrimaryColor, 
    secondaryColor, setSecondaryColor,
    schoolLogo, setSchoolLogo,
    navbarBg, setNavbarBg,
    footerBg, setFooterBg,
    navbarTextColor, setNavbarTextColor,
    footerTextColor, setFooterTextColor,
    principalSignature, setPrincipalSignature,
    principalStamp, setPrincipalStamp,
    bursarSignature, setBursarSignature,
    bursarStamp, setBursarStamp,
    currentSession, setCurrentSession
  } = useTheme();

  // Local state for form buffers
  const [name, setName] = useState(schoolName);
  const [primary, setPrimary] = useState(primaryColor);
  const [secondary, setSecondary] = useState(secondaryColor);
  const [logoPreview, setLogoPreview] = useState(schoolLogo);
  const [navBg, setNavBg] = useState(navbarBg);
  const [footBg, setFootBg] = useState(footerBg);
  const [navText, setNavText] = useState(navbarTextColor);
  const [footText, setFootText] = useState(footerTextColor);
  const [pSig, setPSig] = useState(principalSignature);
  const [pStamp, setPStamp] = useState(principalStamp);
  const [bSig, setBSig] = useState(bursarSignature);
  const [bStamp, setBStamp] = useState(bursarStamp);

  // Academic Configuration State
  const [subjectRegistrationEnabled, setSubjectRegistrationEnabled] = useState(false);
  const [admissionEnabled, setAdmissionEnabled] = useState(false);
  const [configLoading, setConfigLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState({ type: '', message: '' });

  // Session Configuration
  const SESSION_LIST = ['2023/2024', '2024/2025', '2025/2026', '2026/2027', '2027/2028'];
  const [sessionInput, setSessionInput] = useState(currentSession || '2025/2026');
  const [sessionSaving, setSessionSaving] = useState(false);
  const [sessionSaved, setSessionSaved] = useState(false);

  // Move Students Modal
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [promotionStep, setPromotionStep] = useState('idle'); // idle | loading | auto_done | ss1_placement | done
  const [promotionResult, setPromotionResult] = useState(null);
  const [ss1Students, setSs1Students] = useState([]);
  const [ss1Assignments, setSs1Assignments] = useState({}); // { [studentId]: 'SS2 ART' | 'SS2 SCIENCE' }
  const [ss1Saving, setSs1Saving] = useState(false);

  // Sync with context once loaded
  React.useEffect(() => {
    setName(schoolName);
    setPrimary(primaryColor);
    setSecondary(secondaryColor);
    setLogoPreview(schoolLogo);
    setNavBg(navbarBg);
    setFootBg(footerBg);
    setNavText(navbarTextColor);
    setFootText(footerTextColor);
    setPSig(principalSignature);
    setPStamp(principalStamp);
    setBSig(bursarSignature);
    setBStamp(bursarStamp);
  }, [schoolName, primaryColor, secondaryColor, schoolLogo, navbarBg, footerBg, navbarTextColor, footerTextColor, principalSignature, principalStamp, bursarSignature, bursarStamp]);

  React.useEffect(() => {
    setSessionInput(currentSession || '2025/2026');
  }, [currentSession]);

  // Fetch Academic Config
  React.useEffect(() => {
    const fetchConfig = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'academic_permissions'));
        if (snap.exists()) {
          setSubjectRegistrationEnabled(snap.data().subjectRegistrationEnabled ?? false);
          setAdmissionEnabled(snap.data().admissionEnabled ?? false);
        }
      } catch (err) {
        console.error('Error fetching academic config:', err);
      } finally {
        setConfigLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const toggleSubjectRegistration = async () => {
    const newValue = !subjectRegistrationEnabled;
    setSubjectRegistrationEnabled(newValue);
    try {
      await setDoc(doc(db, 'settings', 'academic_permissions'), {
        subjectRegistrationEnabled: newValue,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      setStatusMsg({ type: 'success', message: `Subject Registration ${newValue ? 'Opened' : 'Closed'}.` });
      setTimeout(() => setStatusMsg({ type: '', message: '' }), 3000);
    } catch (err) {
      console.error('Error toggling subject registration:', err);
      setSubjectRegistrationEnabled(!newValue);
      setStatusMsg({ type: 'error', message: 'Failed to update setting.' });
    }
  };

  const toggleAdmission = async () => {
    const newValue = !admissionEnabled;
    setAdmissionEnabled(newValue);
    try {
      await setDoc(doc(db, 'settings', 'academic_permissions'), {
        admissionEnabled: newValue,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      setStatusMsg({ type: 'success', message: `Admission Portal (Advance Pro) ${newValue ? 'Enabled' : 'Disabled'}.` });
      setTimeout(() => setStatusMsg({ type: '', message: '' }), 3000);
    } catch (err) {
      console.error('Error toggling admission:', err);
      setAdmissionEnabled(!newValue);
      setStatusMsg({ type: 'error', message: 'Failed to update setting.' });
    }
  };

  const handleSaveSession = async () => {
    setSessionSaving(true);
    try {
      setCurrentSession(sessionInput);
      await setDoc(doc(db, 'settings', 'branding'), { currentSession: sessionInput }, { merge: true });
      setSessionSaved(true);
      setTimeout(() => setSessionSaved(false), 3000);
    } catch (err) {
      console.error('Error saving session:', err);
    } finally {
      setSessionSaving(false);
    }
  };

  const handleRunPromotion = async () => {
    setPromotionStep('loading');
    try {
      const result = await runAutoPromotion(sessionInput || currentSession, 45);
      setPromotionResult(result);

      // Load SS1 students for manual placement
      const ss1 = await fetchStudentsForClass('SS1');
      setSs1Students(ss1);
      const defaultAssignments = {};
      ss1.forEach(s => { defaultAssignments[s.id] = 'SS2 SCIENCE'; });
      setSs1Assignments(defaultAssignments);

      setPromotionStep(ss1.length > 0 ? 'ss1_placement' : 'done');
    } catch (err) {
      console.error('Promotion error:', err);
      setPromotionStep('idle');
      alert('An error occurred during promotion. Check the console.');
    }
  };

  const handleSaveSS1Placement = async () => {
    setSs1Saving(true);
    try {
      const promises = ss1Students.map(s =>
        promoteOneSS1Student(s.id, ss1Assignments[s.id] || 'SS2 SCIENCE')
      );
      await Promise.all(promises);
      setPromotionStep('done');
    } catch (err) {
      console.error('SS1 placement error:', err);
      alert('Error saving SS1 stream placement.');
    } finally {
      setSs1Saving(false);
    }
  };

  const handleImageUpload = (e, setter) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("File is too large. Please upload an image under 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setter(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    setSchoolName(name);
    setPrimaryColor(primary);
    setSecondaryColor(secondary);
    setSchoolLogo(logoPreview);
    setNavbarBg(navBg);
    setFooterBg(footBg);
    setNavbarTextColor(navText);
    setFooterTextColor(footText);
    setPrincipalSignature(pSig);
    setPrincipalStamp(pStamp);
    setBursarSignature(bSig);
    setBursarStamp(bStamp);
    alert('Branding and Credentials updated successfully!');
  };

  const handleReset = () => {
    setName('BONUS DOMINUS SECONDARY SCHOOL');
    setPrimary('#ff6b00');
    setSecondary('#111111');
    setLogoPreview(null);
    setSchoolLogo(null);
    setPSig(null);
    setPStamp(null);
    setBSig(null);
    setBStamp(null);
    setPrincipalSignature(null);
    setPrincipalStamp(null);
    setBursarSignature(null);
    setBursarStamp(null);
  };

  return (
    <div className="branding-settings">
      <div className="dashboard-title">
        <h1>Branding & Settings</h1>
        <p>Customize your secondary school identity across the platform.</p>
      </div>

      <div className="settings-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px', marginTop: '32px' }}>
        {/* School Name Card */}
        <div className="card-white branding-card">
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <School color="var(--primary)" />
            <h3>General Identity</h3>
          </div>
          <div className="input-group">
            <label>School Name</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter school name"
              className="settings-input"
            />
          </div>
          <div className="input-group" style={{ marginTop: '20px' }}>
            <label>School Logo (Max 2MB)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px' }}>
              {logoPreview ? (
                <img src={logoPreview} alt="School Logo" style={{ width: '48px', height: '48px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
              ) : (
                <div style={{ width: '48px', height: '48px', backgroundColor: '#f1f5f9', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <School size={20} color="#94a3b8" />
                </div>
              )}
              <input 
                type="file" 
                accept="image/png, image/jpeg, image/svg+xml"
                onChange={(e) => handleImageUpload(e, setLogoPreview)}
                style={{ fontSize: '14px' }}
              />
            </div>
          </div>
        </div>

        {/* Credentials Card */}
        <div className="card-white branding-card">
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <RefreshCcw color="var(--primary)" />
            <h3>Official Credentials</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Principal Section */}
            <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '16px' }}>
              <p style={{ fontWeight: '900', fontSize: '12px', color: '#1e293b', marginBottom: '12px', textTransform: 'uppercase' }}>Principal</p>
              <div style={{ spaceY: '12px' }}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '11px', color: '#64748b' }}>Signature</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <div style={{ width: '40px', height: '40px', border: '1px dashed #cbd5e1', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#fff' }}>
                      {pSig && <img src={pSig} alt="Sig" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />}
                    </div>
                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setPSig)} style={{ fontSize: '10px', width: '100px' }} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#64748b' }}>Stamp</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <div style={{ width: '40px', height: '40px', border: '1px dashed #cbd5e1', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#fff' }}>
                      {pStamp && <img src={pStamp} alt="Stamp" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />}
                    </div>
                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setPStamp)} style={{ fontSize: '10px', width: '100px' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Bursar Section */}
            <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '16px' }}>
              <p style={{ fontWeight: '900', fontSize: '12px', color: '#1e293b', marginBottom: '12px', textTransform: 'uppercase' }}>Bursar</p>
              <div style={{ spaceY: '12px' }}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '11px', color: '#64748b' }}>Signature</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <div style={{ width: '40px', height: '40px', border: '1px dashed #cbd5e1', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#fff' }}>
                      {bSig && <img src={bSig} alt="Sig" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />}
                    </div>
                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setBSig)} style={{ fontSize: '10px', width: '100px' }} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#64748b' }}>Stamp</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <div style={{ width: '40px', height: '40px', border: '1px dashed #cbd5e1', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#fff' }}>
                      {bStamp && <img src={bStamp} alt="Stamp" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />}
                    </div>
                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setBStamp)} style={{ fontSize: '10px', width: '100px' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Session Configuration Card */}
        <div className="card-white branding-card">
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <Calendar color="var(--primary)" />
            <h3>Academic Session</h3>
          </div>
          <div className="input-group">
            <label style={{ fontWeight: '700', fontSize: '13px', color: '#334155', display: 'block', marginBottom: '8px' }}>Current Academic Session</label>
            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>This session label is used across fee receipts, ID cards, result sheets, and the markbook.</p>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '160px' }}>
                <select
                  value={sessionInput}
                  onChange={e => setSessionInput(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 36px 10px 14px', borderRadius: '10px',
                    border: '2px solid #e2e8f0', fontSize: '14px', fontWeight: '700',
                    background: '#f8fafc', appearance: 'none', cursor: 'pointer',
                    color: '#1e293b', outline: 'none'
                  }}
                >
                  {SESSION_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }} />
              </div>
              <button
                onClick={handleSaveSession}
                disabled={sessionSaving}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '10px 20px', borderRadius: '10px', fontWeight: '800',
                  fontSize: '13px', cursor: 'pointer', border: 'none',
                  background: sessionSaved ? '#10b981' : 'var(--primary)',
                  color: '#fff', transition: 'all 0.2s'
                }}
              >
                {sessionSaving ? <Loader2 size={16} className="animate-spin" /> : sessionSaved ? <CheckCircle size={16} /> : <Save size={16} />}
                {sessionSaving ? 'Saving...' : sessionSaved ? 'Saved!' : 'Set Session'}
              </button>
            </div>
            <p style={{ marginTop: '10px', fontSize: '11px', color: '#94a3b8' }}>
              Active: <strong style={{ color: '#1e293b' }}>{currentSession}</strong>
            </p>
          </div>
        </div>

        {/* Move Students Card */}
        <div className="card-white branding-card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <GraduationCap color="#f59e0b" />
            <div>
              <h3 style={{ margin: 0 }}>Move Students</h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>End-of-year class promotion (Third Term)</p>
            </div>
          </div>
          <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '14px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <AlertTriangle size={16} style={{ color: '#d97706', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <p style={{ fontSize: '13px', fontWeight: '700', color: '#92400e', margin: '0 0 4px' }}>Use only after Third Term results are published</p>
                <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: '#78350f', lineHeight: '1.8' }}>
                  <li>JSS1 → JSS2, JSS2 → JSS3, JSS3 → SS1 (auto, avg ≥ 45%)</li>
                  <li>SS2 Art → SS3 Art, SS2 Science → SS3 Science (auto, avg ≥ 45%)</li>
                  <li>SS1 → SS2 Art or SS2 Science (manual — you pick per student based on 9 subjects)</li>
                </ul>
              </div>
            </div>
          </div>
          <button
            onClick={() => { setShowMoveModal(true); setPromotionStep('idle'); setPromotionResult(null); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '12px 24px', borderRadius: '12px', fontWeight: '800',
              fontSize: '14px', cursor: 'pointer', border: 'none',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: '#fff', boxShadow: '0 4px 14px #fde68a'
            }}
          >
            <Users size={18} /> Move Students to Next Class
          </button>
        </div>
        <div className="card-white branding-card">
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <BookOpen color="var(--primary)" />
            <h3>Academic Configuration</h3>
          </div>
          
          <div className="input-group">
            <div className="academic-config-row">
              <div>
                <label className="academic-config-label">Subject Registration Portal</label>
                <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Allow SS2 and SS3 students to register their 9 subjects.</p>
              </div>
              
              {configLoading ? (
                <Loader2 size={24} className="animate-spin text-slate-400" />
              ) : (
                <button 
                  onClick={toggleSubjectRegistration}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all focus:outline-none ${subjectRegistrationEnabled ? 'bg-purple-600' : 'bg-slate-300'}`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${subjectRegistrationEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              )}
            </div>

            <div className="academic-config-row" style={{ marginTop: '16px' }}>
              <div>
                <label className="academic-config-label">
                  Admission Portal 
                  <span style={{ fontSize: '10px', backgroundColor: '#8b5cf6', color: 'white', padding: '2px 8px', borderRadius: '12px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Advance Pro</span>
                </label>
                <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Enable or disable the public Admission page.</p>
              </div>
              
              {configLoading ? (
                <Loader2 size={24} className="animate-spin text-slate-400" />
              ) : (
                <button 
                  onClick={toggleAdmission}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all focus:outline-none ${admissionEnabled ? 'bg-purple-600' : 'bg-slate-300'}`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${admissionEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              )}
            </div>
            {statusMsg.message && (
              <p style={{ marginTop: '12px', fontSize: '12px', fontWeight: 'bold', color: statusMsg.type === 'success' ? '#10b981' : '#f43f5e', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle size={14} /> {statusMsg.message}
              </p>
            )}
          </div>
        </div>

        {/* Theme Card */}
        <div className="card-white branding-card">
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <Palette color="var(--primary)" />
            <h3>Theme Colors</h3>
          </div>
          
          <div className="color-section" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="color-input-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '4px' }}>Primary Accent</label>
                <p style={{ fontSize: '12px', color: '#888' }}>Used for buttons, icons, and highlights.</p>
              </div>
              <input 
                type="color" 
                value={primary} 
                onChange={(e) => setPrimary(e.target.value)}
                style={{ width: '40px', height: '40px', border: 'none', cursor: 'pointer' }}
              />
            </div>

            <div className="color-input-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '4px' }}>Sidebar & Secondary</label>
                <p style={{ fontSize: '12px', color: '#888' }}>Used for dashboard navigation background.</p>
              </div>
              <input 
                type="color" 
                value={secondary} 
                onChange={(e) => setSecondary(e.target.value)}
                style={{ width: '40px', height: '40px', border: 'none', cursor: 'pointer' }}
              />
            </div>

            <div style={{ borderTop: '1px solid #eee', margin: '10px 0' }}></div>

            <div className="color-input-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '4px' }}>Navbar Background</label>
                <p style={{ fontSize: '12px', color: '#888' }}>Background color of the public navigation bar.</p>
              </div>
              <input 
                type="color" 
                value={navBg} 
                onChange={(e) => setNavBg(e.target.value)}
                style={{ width: '40px', height: '40px', border: 'none', cursor: 'pointer' }}
              />
            </div>

            <div className="color-input-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '4px' }}>Navbar Text Color</label>
                <p style={{ fontSize: '12px', color: '#888' }}>Color of links and text in the navbar.</p>
              </div>
              <input 
                type="color" 
                value={navText} 
                onChange={(e) => setNavText(e.target.value)}
                style={{ width: '40px', height: '40px', border: 'none', cursor: 'pointer' }}
              />
            </div>

            <div className="color-input-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '4px' }}>Footer Background</label>
                <p style={{ fontSize: '12px', color: '#888' }}>Background color of the bottom footer section.</p>
              </div>
              <input 
                type="color" 
                value={footBg} 
                onChange={(e) => setFootBg(e.target.value)}
                style={{ width: '40px', height: '40px', border: 'none', cursor: 'pointer' }}
              />
            </div>

            <div className="color-input-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '4px' }}>Footer Text Color</label>
                <p style={{ fontSize: '12px', color: '#888' }}>Color of links and text in the footer.</p>
              </div>
              <input 
                type="color" 
                value={footText} 
                onChange={(e) => setFootText(e.target.value)}
                style={{ width: '40px', height: '40px', border: 'none', cursor: 'pointer' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="settings-actions" style={{ marginTop: '40px', display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
        <button className="btn-outline" onClick={handleReset} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <RefreshCcw size={18} /> Reset to Default
        </button>
        <button className="btn-primary" onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 32px' }}>
          <Save size={18} /> Save Changes
        </button>
      </div>

      {/* Preview Section */}
      <div className="card-white" style={{ marginTop: '40px' }}>
        <h3>Real-time Preview</h3>
        <p style={{ marginBottom: '20px' }}>This is how your current palette looks in action.</p>
          <div style={{ display: 'flex', gap: '12px' }}>
          <button style={{ backgroundColor: primary, color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px' }}>Button Style</button>
          <div style={{ backgroundColor: secondary, color: '#fff', padding: '10px 20px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {logoPreview && <img src={logoPreview} alt="" style={{ height: '24px' }} />}
            Sidebar Mockup
          </div>
          <div style={{ color: primary, fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>Link Hover State</div>
        </div>
      </div>

      {/* ===== MOVE STUDENTS MODAL ===== */}
      {showMoveModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{
            background: '#fff', borderRadius: '24px', width: '100%', maxWidth: '680px',
            maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.3)'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 28px', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '42px', height: '42px', background: 'linear-gradient(135deg,#f59e0b,#d97706)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <GraduationCap size={20} color="#fff" />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#1e293b' }}>Move Students</h2>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Session: {sessionInput || currentSession}</p>
                </div>
              </div>
              <button onClick={() => setShowMoveModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}>
                <X size={22} />
              </button>
            </div>

            <div style={{ padding: '28px' }}>

              {/* STEP: idle */}
              {promotionStep === 'idle' && (
                <div>
                  <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '20px', marginBottom: '24px' }}>
                    <p style={{ fontWeight: '700', color: '#1e293b', marginBottom: '12px', fontSize: '15px' }}>What will happen:</p>
                    {[
                      { from: 'JSS1', to: 'JSS2', type: 'auto' },
                      { from: 'JSS2', to: 'JSS3', type: 'auto' },
                      { from: 'JSS3', to: 'SS1', type: 'auto' },
                      { from: 'SS2 ART', to: 'SS3 ART', type: 'auto' },
                      { from: 'SS2 SCIENCE', to: 'SS3 SCIENCE', type: 'auto' },
                      { from: 'SS1', to: 'SS2 ART / SS2 SCIENCE', type: 'manual' },
                    ].map((row, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                        <span style={{ background: row.type === 'auto' ? '#dbeafe' : '#fef3c7', color: row.type === 'auto' ? '#1d4ed8' : '#92400e', fontSize: '10px', fontWeight: '800', padding: '2px 8px', borderRadius: '6px', minWidth: '48px', textAlign: 'center', textTransform: 'uppercase' }}>{row.type}</span>
                        <span style={{ fontWeight: '700', color: '#475569', fontSize: '14px' }}>{row.from}</span>
                        <ArrowRight size={14} color="#94a3b8" />
                        <span style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>{row.to}</span>
                        {row.type === 'auto' && <span style={{ fontSize: '11px', color: '#94a3b8' }}>(avg ≥ 45%)</span>}
                        {row.type === 'manual' && <span style={{ fontSize: '11px', color: '#d97706' }}>(you choose stream)</span>}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button onClick={() => setShowMoveModal(false)} style={{ padding: '11px 22px', borderRadius: '10px', border: '2px solid #e2e8f0', background: '#fff', fontWeight: '700', cursor: 'pointer', color: '#475569' }}>
                      Cancel
                    </button>
                    <button onClick={handleRunPromotion} style={{ padding: '11px 28px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                      <Users size={16} /> Run Promotion
                    </button>
                  </div>
                </div>
              )}

              {/* STEP: loading */}
              {promotionStep === 'loading' && (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <Loader2 size={48} style={{ color: '#f59e0b', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
                  <p style={{ fontWeight: '700', color: '#1e293b', fontSize: '16px' }}>Promoting students…</p>
                  <p style={{ color: '#64748b', fontSize: '13px' }}>Fetching Third Term marks and updating classes. Please wait.</p>
                </div>
              )}

              {/* STEP: ss1_placement (auto done, now handle SS1 manually) */}
              {promotionStep === 'ss1_placement' && (
                <div>
                  {/* Auto-promotion summary */}
                  {promotionResult && (
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '14px', padding: '16px', marginBottom: '24px' }}>
                      <p style={{ fontWeight: '800', color: '#166534', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CheckCircle size={16} /> Auto-promotion complete
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                        {[
                          { label: 'Promoted', value: promotionResult.promoted.length, color: '#16a34a' },
                          { label: 'Below 45%', value: promotionResult.failed.length, color: '#dc2626' },
                          { label: 'No Marks', value: promotionResult.skipped.length, color: '#d97706' },
                        ].map(stat => (
                          <div key={stat.label} style={{ background: '#fff', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                            <p style={{ fontSize: '22px', fontWeight: '900', color: stat.color, margin: 0 }}>{stat.value}</p>
                            <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>{stat.label}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SS1 Manual Placement */}
                  <div style={{ marginBottom: '20px' }}>
                    <p style={{ fontWeight: '800', color: '#1e293b', fontSize: '15px', marginBottom: '6px' }}>SS1 Stream Placement</p>
                    <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '16px' }}>
                      Assign each SS1 student to either <strong>Art</strong> or <strong>Science</strong> stream for SS2, based on their registered subjects.
                    </p>
                    {ss1Students.length === 0 ? (
                      <p style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '13px' }}>No SS1 students found.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '280px', overflowY: 'auto' }}>
                        {ss1Students.map(student => (
                          <div key={student.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', borderRadius: '12px', padding: '12px 16px', gap: '16px' }}>
                            <div>
                              <p style={{ margin: 0, fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>{student.name}</p>
                              <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>{student.regNo}</p>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                              {['SS2 ART', 'SS2 SCIENCE'].map(stream => (
                                <button
                                  key={stream}
                                  onClick={() => setSs1Assignments(prev => ({ ...prev, [student.id]: stream }))}
                                  style={{
                                    padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', border: '2px solid',
                                    borderColor: ss1Assignments[student.id] === stream ? (stream === 'SS2 ART' ? '#8b5cf6' : '#0ea5e9') : '#e2e8f0',
                                    background: ss1Assignments[student.id] === stream ? (stream === 'SS2 ART' ? '#ede9fe' : '#e0f2fe') : '#fff',
                                    color: ss1Assignments[student.id] === stream ? (stream === 'SS2 ART' ? '#7c3aed' : '#0369a1') : '#94a3b8',
                                    transition: 'all 0.15s'
                                  }}
                                >
                                  {stream === 'SS2 ART' ? 'Art' : 'Science'}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button onClick={() => setShowMoveModal(false)} style={{ padding: '11px 22px', borderRadius: '10px', border: '2px solid #e2e8f0', background: '#fff', fontWeight: '700', cursor: 'pointer', color: '#475569' }}>
                      Close
                    </button>
                    <button onClick={handleSaveSS1Placement} disabled={ss1Saving} style={{ padding: '11px 28px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', color: '#fff', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                      {ss1Saving ? <Loader2 size={16} className="animate-spin" /> : <CheckSquare size={16} />}
                      {ss1Saving ? 'Saving...' : 'Save Stream Placement'}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP: done */}
              {promotionStep === 'done' && (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <div style={{ width: '72px', height: '72px', background: 'linear-gradient(135deg,#10b981,#059669)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                    <CheckCircle size={36} color="#fff" />
                  </div>
                  <h3 style={{ fontSize: '22px', fontWeight: '900', color: '#1e293b', marginBottom: '8px' }}>Promotion Complete!</h3>
                  <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>
                    All students have been moved to their new classes. The changes are live in Firestore.
                  </p>
                  {promotionResult && (
                    <div style={{ display: 'inline-grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                      {[
                        { label: 'Promoted', value: promotionResult.promoted.length, bg: '#f0fdf4', color: '#16a34a' },
                        { label: 'Held Back', value: promotionResult.failed.length, bg: '#fff1f2', color: '#dc2626' },
                        { label: 'Skipped', value: promotionResult.skipped.length, bg: '#fffbeb', color: '#d97706' },
                      ].map(s => (
                        <div key={s.label} style={{ background: s.bg, borderRadius: '12px', padding: '14px 20px' }}>
                          <p style={{ fontSize: '28px', fontWeight: '900', color: s.color, margin: 0 }}>{s.value}</p>
                          <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>{s.label}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <button onClick={() => setShowMoveModal(false)} style={{ padding: '12px 32px', borderRadius: '12px', border: 'none', background: '#1e293b', color: '#fff', fontWeight: '800', cursor: 'pointer', fontSize: '14px' }}>
                    Close
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default BrandingSettings;
