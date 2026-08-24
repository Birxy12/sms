import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Save, RefreshCcw, Palette, School, BookOpen, CheckCircle, Loader2, Calendar, GraduationCap, Users, ChevronDown, AlertTriangle, ArrowRight, X, CheckSquare, Image as ImageIcon, Upload, Search, Zap, Check, Square, Filter, UserCheck } from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, collection, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { uploadFileToSupabase } from '../lib/supabase';
import { runAutoPromotion, fetchStudentsForClass, promoteOneSS1Student } from '../utils/promotion';
import { SS1_SUBJECTS } from '../utils/subjectConfig';
import { DEFAULT_COMMENT_TEMPLATES } from '../utils/commentGenerator';

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
    currentSession, setCurrentSession,
    cat1Limit, setCat1Limit,
    cat2Limit, setCat2Limit,
    examLimit, setExamLimit,
    currentTerm, setCurrentTerm,
    termStartDate, setTermStartDate,
    termEndDate, setTermEndDate,
    nextTermBeginsDate, setNextTermBeginsDate,
    promotionPassMark, setPromotionPassMark,
    autoCommentsEnabled, setAutoCommentsEnabled,
    commentTemplates, setCommentTemplates,
    averageDivisors, setAverageDivisors
  } = useTheme();

  // Local state for form buffers
  const [name, setName] = useState(schoolName);
  const [primary, setPrimary] = useState(primaryColor);
  const [secondary, setSecondary] = useState(secondaryColor);
  const [logoPreview, setLogoPreview] = useState(schoolLogo);
  const [heroImages, setHeroImages] = useState([]);
  const [slideDuration, setSlideDuration] = useState(4);
  const [heroImagesUploading, setHeroImagesUploading] = useState(false);
  const [campusLifeImages, setCampusLifeImages] = useState([]);
  const [campusLifeUploading, setCampusLifeUploading] = useState(false);
  const [homeAdImage, setHomeAdImage] = useState(null);
  const [homeAdLink, setHomeAdLink] = useState('');
  const [homeAdEnabled, setHomeAdEnabled] = useState(false);
  const [homeAdUploading, setHomeAdUploading] = useState(false);
  const [navBg, setNavBg] = useState(navbarBg);
  const [footBg, setFootBg] = useState(footerBg);
  const [navText, setNavText] = useState(navbarTextColor);
  const [footText, setFootText] = useState(footerTextColor);
  const [pSig, setPSig] = useState(principalSignature);
  const [pStamp, setPStamp] = useState(principalStamp);
  const [bSig, setBSig] = useState(bursarSignature);
  const [bStamp, setBStamp] = useState(bursarStamp);

  // New Academic Settings Buffers
  const [cat1Val, setCat1Val] = useState(cat1Limit ?? 20);
  const [cat2Val, setCat2Val] = useState(cat2Limit ?? 20);
  const [examVal, setExamVal] = useState(examLimit ?? 60);

  const [termInput, setTermInput] = useState(currentTerm || '1st Term');
  const [termStart, setTermStart] = useState(termStartDate || '');
  const [termEnd, setTermEnd] = useState(termEndDate || '');
  const [nextTerm, setNextTerm] = useState(nextTermBeginsDate || '');

  const [passMarkInput, setPassMarkInput] = useState(promotionPassMark ?? 45);

  const [commentsEnabled, setCommentsEnabled] = useState(autoCommentsEnabled ?? true);
  const [tpls, setTpls] = useState(commentTemplates || DEFAULT_COMMENT_TEMPLATES);
  const [divisorInputs, setDivisorInputs] = useState(averageDivisors || {
    JSS1: 16,
    JSS2: 16,
    JSS3: 16,
    SS1: 16,
    'SS2 SCIENCE': 9,
    'SS2 ART': 9,
    'SS3 SCIENCE': 9,
    'SS3 ART': 9,
  });

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
  const [promotionMode, setPromotionMode] = useState('auto'); // 'auto' | 'manual' | 'selective'
  const [manualFromClass, setManualFromClass] = useState('JSS1');
  const [manualToClass, setManualToClass] = useState('JSS2');
  const [promotionResult, setPromotionResult] = useState(null);
  const [ss1Students, setSs1Students] = useState([]);
  const [ss1Assignments, setSs1Assignments] = useState({}); // { [studentId]: 'SS2 ART' | 'SS2 SCIENCE' }
  const [ss1Saving, setSs1Saving] = useState(false);

  // Selective Move States (Option 3: Select Students from Class to Move)
  const [selectiveFromClass, setSelectiveFromClass] = useState('JSS 2');
  const [selectiveToClass, setSelectiveToClass] = useState('JSS 3');
  const [selectiveStudents, setSelectiveStudents] = useState([]);
  const [loadingSelective, setLoadingSelective] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set());
  const [selectiveSearch, setSelectiveSearch] = useState('');

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
    setCat1Val(cat1Limit ?? 20);
    setCat2Val(cat2Limit ?? 20);
    setExamVal(examLimit ?? 60);
    setTermInput(currentTerm || '1st Term');
    setTermStart(termStartDate || '');
    setTermEnd(termEndDate || '');
    setNextTerm(nextTermBeginsDate || '');
    setPassMarkInput(promotionPassMark ?? 45);
    setCommentsEnabled(autoCommentsEnabled ?? true);
    setTpls(commentTemplates || DEFAULT_COMMENT_TEMPLATES);
    setDivisorInputs(averageDivisors || {
      JSS1: 16,
      JSS2: 16,
      JSS3: 16,
      SS1: 16,
      'SS2 SCIENCE': 9,
      'SS2 ART': 9,
      'SS3 SCIENCE': 9,
      'SS3 ART': 9,
    });
  }, [schoolName, primaryColor, secondaryColor, schoolLogo, navbarBg, footerBg, navbarTextColor, footerTextColor, principalSignature, principalStamp, bursarSignature, bursarStamp, cat1Limit, cat2Limit, examLimit, currentTerm, termStartDate, termEndDate, nextTermBeginsDate, promotionPassMark, autoCommentsEnabled, commentTemplates, averageDivisors]);

  React.useEffect(() => {
    setSessionInput(currentSession || '2025/2026');
  }, [currentSession]);

  React.useEffect(() => {
    const fetchPublicContent = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'public_content'));
        if (snap.exists() && snap.data().landingPage) {
          const lp = snap.data().landingPage;
          if (lp.heroImages) {
            setHeroImages(lp.heroImages.map(img => typeof img === 'string' ? { url: img, caption: '' } : img));
          }
          if (lp.campusLifeImages) {
            setCampusLifeImages(lp.campusLifeImages.map(img => typeof img === 'string' ? { url: img, caption: '' } : img));
          }
          if (lp.homeSlideDuration !== undefined) setSlideDuration(lp.homeSlideDuration);
          if (lp.homeAdImage) setHomeAdImage(lp.homeAdImage);
          if (lp.homeAdLink) setHomeAdLink(lp.homeAdLink);
          if (lp.homeAdEnabled !== undefined) setHomeAdEnabled(lp.homeAdEnabled);
        }
      } catch (e) {
        console.error('Failed to load public content', e);
      }
    };
    fetchPublicContent();
  }, []);

  const handleSave = async () => {
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
    setCat1Limit(Number(cat1Val));
    setCat2Limit(Number(cat2Val));
    setExamLimit(Number(examVal));
    setCurrentTerm(termInput);
    setTermStartDate(termStart);
    setTermEndDate(termEnd);
    setNextTermBeginsDate(nextTerm);
    setPromotionPassMark(Number(passMarkInput));
    setAutoCommentsEnabled(commentsEnabled);
    setCommentTemplates(tpls);
    setAverageDivisors(divisorInputs);

    try {
      await setDoc(doc(db, 'settings', 'public_content'), {
        landingPage: {
          heroImages: heroImages,
          campusLifeImages: campusLifeImages,
          homeSlideDuration: Number(slideDuration),
          homeAdImage: homeAdImage,
          homeAdLink: homeAdLink,
          homeAdEnabled: homeAdEnabled
        }
      }, { merge: true });
    } catch (e) {
      console.error('Failed to save public content', e);
    }

    alert('Branding and Academic Settings updated successfully!');
  };

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

  const loadSelectiveStudents = async (className) => {
    if (!className) return;
    setLoadingSelective(true);
    setSelectedStudentIds(new Set());
    try {
      const snap = await getDocs(collection(db, 'students'));
      const list = [];
      const normTarget = className.trim().toLowerCase().replace(/\s+/g, '');
      
      snap.forEach(docSnap => {
        const data = docSnap.data();
        const c = (data.className || data.c || data.class || data.classId || '').trim();
        const normC = c.toLowerCase().replace(/\s+/g, '');
        
        if (normC === normTarget || c === className) {
          list.push({
            id: docSnap.id,
            name: data.name || data.n || data['STUDENT NAME'] || 'N/A',
            regNo: data.regNo || data.r || '',
            gender: data.gender || data.g || 'Male',
            className: c,
            photo: data.photo || data.photoURL || null,
            avatarId: data.avatarId || null
          });
        }
      });

      list.sort((a, b) => (a.regNo || '').localeCompare(b.regNo || '', undefined, { numeric: true }) || a.name.localeCompare(b.name));
      setSelectiveStudents(list);
    } catch (err) {
      console.error('Error fetching students for selective move:', err);
    } finally {
      setLoadingSelective(false);
    }
  };

  React.useEffect(() => {
    if (showMoveModal && promotionMode === 'selective') {
      loadSelectiveStudents(selectiveFromClass);
    }
  }, [showMoveModal, promotionMode, selectiveFromClass]);

  const toggleStudentSelection = (id) => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllVisible = (filteredList) => {
    const allSelected = filteredList.length > 0 && filteredList.every(s => selectedStudentIds.has(s.id));
    if (allSelected) {
      setSelectedStudentIds(prev => {
        const next = new Set(prev);
        filteredList.forEach(s => next.delete(s.id));
        return next;
      });
    } else {
      setSelectedStudentIds(prev => {
        const next = new Set(prev);
        filteredList.forEach(s => next.add(s.id));
        return next;
      });
    }
  };

  const handleSelectiveMove = async () => {
    if (selectedStudentIds.size === 0) {
      alert('Please select at least one student to move.');
      return;
    }
    if (!selectiveToClass) {
      alert('Please select a target class.');
      return;
    }
    if (selectiveFromClass === selectiveToClass) {
      alert('Source and target classes are identical.');
      return;
    }

    setPromotionStep('loading');
    try {
      const batch = writeBatch(db);
      const movedList = [];

      selectedStudentIds.forEach(id => {
        const studentRef = doc(db, 'students', id);
        batch.update(studentRef, {
          className: selectiveToClass,
          classId: selectiveToClass,
          c: selectiveToClass,
          updatedAt: new Date().toISOString()
        });
        const found = selectiveStudents.find(s => s.id === id);
        if (found) {
          movedList.push({ ...found, from: selectiveFromClass, to: selectiveToClass });
        }
      });

      await batch.commit();
      setPromotionResult({
        promoted: movedList,
        failed: [],
        skipped: [],
        selectiveCount: movedList.length,
        fromClass: selectiveFromClass,
        toClass: selectiveToClass
      });
      setPromotionStep('done');
    } catch (err) {
      console.error('Selective move error:', err);
      alert('An error occurred during selective student move. Check console.');
      setPromotionStep('idle');
    }
  };

  const handleRunPromotion = async () => {
    if (promotionMode === 'selective') {
      handleSelectiveMove();
      return;
    }

    if (promotionMode === 'manual') {
      handleManualMove();
      return;
    }

    setPromotionStep('loading');
    setPromotionResult(null);
    try {
      const res = await runAutoPromotion(sessionInput || currentSession, Number(promotionPassMark) || 45);
      setPromotionResult(res);
      const ss1 = await fetchStudentsForClass('SS1');
      setSs1Students(ss1);
      const initAssign = {};
      ss1.forEach(s => initAssign[s.id] = 'SS2 SCIENCE');
      setSs1Assignments(initAssign);
      setPromotionStep(ss1.length > 0 ? 'ss1_placement' : 'done');
    } catch (err) {
      console.error('Promotion error:', err);
      alert('An error occurred running promotion. Check console.');
      setPromotionStep('idle');
    }
  };

  const handleManualMove = async () => {
    setPromotionStep('loading');
    try {
      const studentsRef = collection(db, 'students');
      
      let snap = await getDocs(query(studentsRef, where('c', '==', manualFromClass)));
      if (snap.empty) {
        snap = await getDocs(query(studentsRef, where('className', '==', manualFromClass)));
      }
      
      const batch = writeBatch(db);
      snap.docs.forEach(docSnap => {
        batch.update(docSnap.ref, { 
          c: manualToClass, 
          className: manualToClass,
          classId: manualToClass
        });
      });
      await batch.commit();
      
      setPromotionResult({ promoted: snap.docs, failed: [], skipped: [] });
      setPromotionStep('done');
    } catch (err) {
      console.error('Manual move error:', err);
      alert('An error occurred during manual move.');
      setPromotionStep('idle');
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

  const handleHeroUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("File is too large. Please upload an image under 2MB.");
        return;
      }
      setHeroImagesUploading(true);
      try {
        const url = await uploadFileToSupabase(file, 'images', 'hero');
        setHeroImages(prev => [...prev, { url, caption: '' }]);
      } catch (err) {
        alert("Failed to upload image. Please try again.");
      } finally {
        setHeroImagesUploading(false);
      }
    }
  };

  const removeHeroImage = (index) => {
    setHeroImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleHeroCaptionChange = (index, newCaption) => {
    const newImgs = [...heroImages];
    if (typeof newImgs[index] === 'string') {
      newImgs[index] = { url: newImgs[index], caption: newCaption };
    } else {
      newImgs[index].caption = newCaption;
    }
    setHeroImages(newImgs);
  };

  const handleCampusLifeUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("File is too large. Please upload an image under 2MB.");
        return;
      }
      setCampusLifeUploading(true);
      try {
        const url = await uploadFileToSupabase(file, 'images', 'campus');
        setCampusLifeImages(prev => [...prev, { url, caption: '' }]);
      } catch (err) {
        alert("Failed to upload image.");
      } finally {
        setCampusLifeUploading(false);
      }
    }
  };

  const removeCampusLifeImage = (index) => {
    setCampusLifeImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleCampusLifeCaptionChange = (index, newCaption) => {
    const newImgs = [...campusLifeImages];
    if (typeof newImgs[index] === 'string') {
      newImgs[index] = { url: newImgs[index], caption: newCaption };
    } else {
      newImgs[index].caption = newCaption;
    }
    setCampusLifeImages(newImgs);
  };

  const handleAdUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("File is too large. Please upload an image under 2MB.");
        return;
      }
      setHomeAdUploading(true);
      try {
        const url = await uploadFileToSupabase(file, 'images', 'ads');
        setHomeAdImage(url);
      } catch (err) {
        alert("Failed to upload ad image. Please try again.");
      } finally {
        setHomeAdUploading(false);
      }
    }
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
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-all focus:outline-none shadow-sm ${subjectRegistrationEnabled ? 'bg-blue-600' : 'bg-red-600'}`}
                >
                  <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform ${subjectRegistrationEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
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
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-all focus:outline-none shadow-sm ${admissionEnabled ? 'bg-blue-600' : 'bg-red-600'}`}
                >
                  <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform ${admissionEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
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

        {/* Assessment Limit Card (CAT1, CAT2, Exam) */}
        <div className="card-white branding-card">
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <BookOpen color="var(--primary)" />
            <div>
              <h3 style={{ margin: 0 }}>Continuous Assessment & Exam Limits</h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Configure maximum score limit per subject test component.</p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>1st Test (CAT 1)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={cat1Val}
                onChange={(e) => setCat1Val(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '2px solid #e2e8f0', fontWeight: '700', fontSize: '14px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>2nd Test (CAT 2)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={cat2Val}
                onChange={(e) => setCat2Val(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '2px solid #e2e8f0', fontWeight: '700', fontSize: '14px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>Exam Max</label>
              <input
                type="number"
                min="0"
                max="100"
                value={examVal}
                onChange={(e) => setExamVal(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '2px solid #e2e8f0', fontWeight: '700', fontSize: '14px' }}
              />
            </div>
          </div>
          <div style={{ padding: '10px 14px', borderRadius: '10px', background: Number(cat1Val) + Number(cat2Val) + Number(examVal) === 100 ? '#f0fdf4' : '#fff1f2', border: `1px solid ${Number(cat1Val) + Number(cat2Val) + Number(examVal) === 100 ? '#bbf7d0' : '#fecdd3'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: Number(cat1Val) + Number(cat2Val) + Number(examVal) === 100 ? '#166534' : '#991b1b' }}>
              Total Max Marks: <strong>{Number(cat1Val) + Number(cat2Val) + Number(examVal)} Marks</strong>
            </span>
            {Number(cat1Val) + Number(cat2Val) + Number(examVal) !== 100 && (
              <span style={{ fontSize: '11px', color: '#dc2626', fontWeight: '700' }}>Warning: Sum should equal 100</span>
            )}
          </div>
        </div>

        {/* Hero Section Images Card */}
        <div className="card-white branding-card">
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <ImageIcon color="var(--primary)" />
            <div>
              <h3 style={{ margin: 0 }}>Home Page Hero Images</h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Set the slideshow pictures for the public landing page.</p>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {heroImages.map((img, idx) => (
              <div key={idx} style={{ position: 'relative', width: '150px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ position: 'relative', width: '100%', height: '100px', borderRadius: '10px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                  <img src={typeof img === 'string' ? img : img.url} alt="Hero" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button 
                    onClick={() => removeHeroImage(idx)}
                    style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <X size={14} />
                  </button>
                </div>
                <input 
                  type="text" 
                  placeholder="Caption..." 
                  value={typeof img === 'string' ? '' : img.caption || ''}
                  onChange={(e) => handleHeroCaptionChange(idx, e.target.value)}
                  style={{ width: '100%', fontSize: '11px', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                />
              </div>
            ))}
            {heroImages.length < 5 && (
              <div style={{ width: '150px', height: '100px', borderRadius: '10px', border: '2px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', cursor: 'pointer', background: '#f8fafc' }}>
                {heroImagesUploading ? (
                  <Loader2 size={24} className="animate-spin text-slate-400" />
                ) : (
                  <>
                    <input type="file" accept="image/*" onChange={handleHeroUpload} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', zIndex: 10 }} />
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#64748b' }}>
                      <Upload size={20} style={{ marginBottom: '4px' }} />
                      <span style={{ fontSize: '11px', fontWeight: 'bold' }}>Add Image</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div style={{ marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
            <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>Slideshow Interval (Seconds)</label>
            <input
              type="number"
              min="1"
              max="20"
              value={slideDuration}
              onChange={(e) => setSlideDuration(e.target.value)}
              style={{ width: '100%', maxWidth: '200px', padding: '10px', borderRadius: '10px', border: '2px solid #e2e8f0', fontSize: '14px' }}
            />
          </div>
        </div>

        {/* Campus Life Images Card */}
        <div className="card-white branding-card">
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <ImageIcon color="var(--primary)" />
            <div>
              <h3 style={{ margin: 0 }}>Campus Life Images</h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Experience Our World - max 3 images.</p>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {campusLifeImages.map((img, idx) => (
              <div key={idx} style={{ position: 'relative', width: '150px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ position: 'relative', width: '100%', height: '100px', borderRadius: '10px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                  <img src={typeof img === 'string' ? img : img.url} alt="Campus" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button 
                    onClick={() => removeCampusLifeImage(idx)}
                    style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <X size={14} />
                  </button>
                </div>
                <input 
                  type="text" 
                  placeholder="Label..." 
                  value={typeof img === 'string' ? '' : img.caption || ''}
                  onChange={(e) => handleCampusLifeCaptionChange(idx, e.target.value)}
                  style={{ width: '100%', fontSize: '11px', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                />
              </div>
            ))}
            {campusLifeImages.length < 3 && (
              <div style={{ width: '150px', height: '100px', borderRadius: '10px', border: '2px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', cursor: 'pointer', background: '#f8fafc' }}>
                {campusLifeUploading ? (
                  <Loader2 size={24} className="animate-spin text-slate-400" />
                ) : (
                  <>
                    <input type="file" accept="image/*" onChange={handleCampusLifeUpload} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', zIndex: 10 }} />
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#64748b' }}>
                      <Upload size={20} style={{ marginBottom: '4px' }} />
                      <span style={{ fontSize: '11px', fontWeight: 'bold' }}>Add Image</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Home Page Ad Section */}
        <div className="card-white branding-card">
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <AlertTriangle color="var(--primary)" />
            <div>
              <h3 style={{ margin: 0 }}>Public Announcement / Ad Banner</h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Display a dismissible pop-up banner on the home page.</p>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#475569' }}>Enable Ad:</label>
              <button 
                onClick={() => setHomeAdEnabled(!homeAdEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all focus:outline-none shadow-sm ${homeAdEnabled ? 'bg-blue-600' : 'bg-slate-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${homeAdEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>Ad Target Link (Optional)</label>
              <input
                type="url"
                placeholder="https://example.com"
                value={homeAdLink}
                onChange={(e) => setHomeAdLink(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '2px solid #e2e8f0', fontSize: '14px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>Ad Banner Image (Optional, max 2MB)</label>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {homeAdImage && (
                  <div style={{ position: 'relative', width: '200px', height: '100px', borderRadius: '10px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                    <img src={homeAdImage} alt="Ad Banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button 
                      onClick={() => setHomeAdImage(null)}
                      style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
                {!homeAdImage && (
                  <div style={{ width: '200px', height: '100px', borderRadius: '10px', border: '2px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', cursor: 'pointer', background: '#f8fafc' }}>
                    {homeAdUploading ? (
                      <Loader2 size={24} className="animate-spin text-slate-400" />
                    ) : (
                      <>
                        <input type="file" accept="image/*" onChange={handleAdUpload} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', zIndex: 10 }} />
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#64748b' }}>
                          <Upload size={20} style={{ marginBottom: '4px' }} />
                          <span style={{ fontSize: '11px', fontWeight: 'bold' }}>Upload Banner</span>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Term Schedule & Dates Card */}
        <div className="card-white branding-card">
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <Calendar color="var(--primary)" />
            <div>
              <h3 style={{ margin: 0 }}>Term Schedule & Dates</h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Specify current term and key academic calendar dates.</p>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>Active Academic Term</label>
            <select
              value={termInput}
              onChange={(e) => setTermInput(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '2px solid #e2e8f0', fontWeight: '700', fontSize: '14px', background: '#f8fafc' }}
            >
              <option value="1st Term">1st Term</option>
              <option value="2nd Term">2nd Term</option>
              <option value="3rd Term">3rd Term</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '4px' }}>Term Start Date</label>
              <input
                type="date"
                value={termStart}
                onChange={(e) => setTermStart(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '2px solid #e2e8f0', fontSize: '13px', fontWeight: '600' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '4px' }}>Term End Date</label>
              <input
                type="date"
                value={termEnd}
                onChange={(e) => setTermEnd(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '2px solid #e2e8f0', fontSize: '13px', fontWeight: '600' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '4px' }}>Next Resumption</label>
              <input
                type="date"
                value={nextTerm}
                onChange={(e) => setNextTerm(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '2px solid #e2e8f0', fontSize: '13px', fontWeight: '600' }}
              />
            </div>
          </div>
        </div>

        {/* Promotion Pass Mark Threshold Card */}
        <div className="card-white branding-card">
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <GraduationCap color="var(--primary)" />
            <div>
              <h3 style={{ margin: 0 }}>Student Promotion Pass Mark</h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Minimum overall average score required for promotion to next class.</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>Pass Mark Threshold (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={passMarkInput}
                onChange={(e) => setPassMarkInput(e.target.value)}
                placeholder="e.g. 45"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '2px solid #e2e8f0', fontWeight: '800', fontSize: '16px' }}
              />
            </div>
            <div style={{ padding: '12px 16px', background: '#e0f2fe', borderRadius: '12px', border: '1px solid #bae6fd', flex: 1.5 }}>
              <p style={{ margin: 0, fontSize: '12px', color: '#0369a1', fontWeight: '700' }}>
                Students with Third Term average ≥ <strong>{passMarkInput}%</strong> will automatically qualify for auto-promotion.
              </p>
            </div>
          </div>
        </div>

        {/* Average Divisor Configuration Card */}
        <div className="card-white branding-card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <BookOpen color="var(--primary)" />
            <div>
              <h3 style={{ margin: 0 }}>Average Divisor Settings</h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Set the subject divisor used to calculate class averages. Example: JSS1 uses 16 subjects.</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            {Object.entries(divisorInputs).map(([className, value]) => (
              <div key={className} style={{ padding: '12px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>{className}</label>
                <input
                  type="number"
                  min="1"
                  value={value}
                  onChange={(e) => setDivisorInputs(prev => ({ ...prev, [className]: Number(e.target.value || 1) }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '2px solid #e2e8f0', fontWeight: '800', fontSize: '14px' }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Auto Generation of Result Comments Card */}
        <div className="card-white branding-card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <CheckSquare color="var(--primary)" />
              <div>
                <h3 style={{ margin: 0 }}>Auto-Generation of Result Comments</h3>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Automatically populate Principal & Teacher remarks on report cards based on student average score.</p>
              </div>
            </div>

            <button
              onClick={() => setCommentsEnabled(!commentsEnabled)}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all focus:outline-none ${commentsEnabled ? 'bg-emerald-600' : 'bg-slate-300'}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${commentsEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {commentsEnabled && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginTop: '16px' }}>
              {Object.keys(tpls).map((key) => (
                <div key={key} style={{ padding: '14px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <p style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>
                    {tpls[key].label}
                  </p>

                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '4px' }}>Form Teacher Remark</label>
                    <textarea
                      rows={2}
                      value={tpls[key].teacher}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTpls(prev => ({ ...prev, [key]: { ...prev[key], teacher: val } }));
                      }}
                      style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', resize: 'vertical' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '4px' }}>Principal Remark</label>
                    <textarea
                      rows={2}
                      value={tpls[key].principal}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTpls(prev => ({ ...prev, [key]: { ...prev[key], principal: val } }));
                      }}
                      style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', resize: 'vertical' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
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
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '20px' }}>
                    <button 
                      type="button"
                      onClick={() => setPromotionMode('auto')}
                      style={{ padding: '12px 14px', borderRadius: '12px', border: promotionMode === 'auto' ? '2px solid #3b82f6' : '2px solid #e2e8f0', background: promotionMode === 'auto' ? '#eff6ff' : '#fff', fontWeight: '700', color: promotionMode === 'auto' ? '#1d4ed8' : '#64748b', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                      <Zap size={16} /> End of Year Auto
                    </button>
                    <button 
                      type="button"
                      onClick={() => setPromotionMode('manual')}
                      style={{ padding: '12px 14px', borderRadius: '12px', border: promotionMode === 'manual' ? '2px solid #3b82f6' : '2px solid #e2e8f0', background: promotionMode === 'manual' ? '#eff6ff' : '#fff', fontWeight: '700', color: promotionMode === 'manual' ? '#1d4ed8' : '#64748b', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                      <Users size={16} /> Entire Class Move
                    </button>
                    <button 
                      type="button"
                      onClick={() => { 
                        setPromotionMode('selective'); 
                        loadSelectiveStudents(selectiveFromClass); 
                      }}
                      style={{ padding: '12px 14px', borderRadius: '12px', border: promotionMode === 'selective' ? '2px solid #3b82f6' : '2px solid #e2e8f0', background: promotionMode === 'selective' ? '#eff6ff' : '#fff', fontWeight: '800', color: promotionMode === 'selective' ? '#1d4ed8' : '#64748b', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: promotionMode === 'selective' ? '0 4px 12px rgba(59,130,246,0.15)' : 'none' }}
                    >
                      <CheckSquare size={16} /> Select Students to Move
                    </button>
                  </div>

                  {promotionMode === 'auto' && (
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
                  )}

                  {promotionMode === 'manual' && (
                    <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '20px', marginBottom: '24px' }}>
                      <p style={{ fontWeight: '700', color: '#1e293b', marginBottom: '12px', fontSize: '15px' }}>Manual Move Configuration:</p>
                      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '6px' }}>Move From Class</label>
                          <select 
                            value={manualFromClass} 
                            onChange={(e) => setManualFromClass(e.target.value)}
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                          >
                            {['JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2 SCIENCE', 'SS 2 ART', 'SS 3 SCIENCE', 'SS 3 ART', 'JSS1', 'JSS2', 'JSS3', 'SS1'].map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <ArrowRight size={24} color="#94a3b8" style={{ marginBottom: '10px' }} />
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', display: 'block', marginBottom: '6px' }}>Move To Class</label>
                          <select 
                            value={manualToClass} 
                            onChange={(e) => setManualToClass(e.target.value)}
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                          >
                            {['JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2 SCIENCE', 'SS 2 ART', 'SS 3 SCIENCE', 'SS 3 ART', 'GRADUATED'].map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                      </div>
                      <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '12px', fontWeight: 'bold' }}>
                        Warning: This will forcibly update ALL students in the 'From' class to the 'To' class, ignoring grades.
                      </p>
                    </div>
                  )}

                  {promotionMode === 'selective' && (() => {
                    const filtered = selectiveStudents.filter(s => {
                      if (!selectiveSearch.trim()) return true;
                      const q = selectiveSearch.toLowerCase();
                      return s.name.toLowerCase().includes(q) || (s.regNo && s.regNo.toLowerCase().includes(q));
                    });

                    const allFilteredSelected = filtered.length > 0 && filtered.every(s => selectedStudentIds.has(s.id));
                    const CLASS_OPTIONS = ['JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2 SCIENCE', 'SS 2 ART', 'SS 3 SCIENCE', 'SS 3 ART', 'GRADUATED'];

                    return (
                      <div style={{ background: '#f8fafc', borderRadius: '18px', padding: '20px', marginBottom: '24px', border: '1px solid #e2e8f0' }}>
                        <p style={{ fontWeight: '800', color: '#1e293b', marginBottom: '14px', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <CheckSquare size={18} style={{ color: '#3b82f6' }} /> Select Students from Class to Move
                        </p>

                        {/* Class Selectors */}
                        <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
                          <div style={{ flex: 1, minWidth: '160px' }}>
                            <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px' }}>Source Class</label>
                            <select 
                              value={selectiveFromClass} 
                              onChange={(e) => {
                                setSelectiveFromClass(e.target.value);
                                loadSelectiveStudents(e.target.value);
                              }}
                              style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: '700', color: '#1e293b', background: '#fff' }}
                            >
                              {CLASS_OPTIONS.filter(c => c !== 'GRADUATED').map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '20px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <ArrowRight size={16} color="#64748b" />
                            </div>
                          </div>

                          <div style={{ flex: 1, minWidth: '160px' }}>
                            <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px' }}>Target New Class</label>
                            <select 
                              value={selectiveToClass} 
                              onChange={(e) => setSelectiveToClass(e.target.value)}
                              style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: '700', color: '#1e293b', background: '#fff' }}
                            >
                              {CLASS_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                        </div>

                        {/* Search & Bulk Selector Bar */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                            <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input 
                              type="text"
                              placeholder="Search students in class..."
                              value={selectiveSearch}
                              onChange={(e) => setSelectiveSearch(e.target.value)}
                              style={{ width: '100%', padding: '8px 12px 8px 34px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
                            />
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              type="button"
                              onClick={() => handleSelectAllVisible(filtered)}
                              disabled={filtered.length === 0}
                              style={{
                                padding: '7px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '700',
                                border: '1px solid #cbd5e1', background: allFilteredSelected ? '#eff6ff' : '#fff',
                                color: allFilteredSelected ? '#1d4ed8' : '#475569', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '6px'
                              }}
                            >
                              {allFilteredSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                              {allFilteredSelected ? 'Deselect All' : `Select All (${filtered.length})`}
                            </button>
                            <span style={{ fontSize: '12px', fontWeight: '800', color: '#3b82f6', background: '#dbeafe', padding: '4px 10px', borderRadius: '100px' }}>
                              {selectedStudentIds.size} Selected
                            </span>
                          </div>
                        </div>

                        {/* Student Roster List Card */}
                        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                          {loadingSelective ? (
                            <div style={{ padding: '36px', textAlign: 'center' }}>
                              <Loader2 size={28} className="animate-spin" style={{ color: '#3b82f6', margin: '0 auto 8px' }} />
                              <p style={{ fontSize: '13px', fontWeight: '700', color: '#64748b', margin: 0 }}>Loading students in {selectiveFromClass}...</p>
                            </div>
                          ) : filtered.length === 0 ? (
                            <div style={{ padding: '36px', textAlign: 'center' }}>
                              <Users size={32} style={{ color: '#cbd5e1', margin: '0 auto 8px' }} />
                              <p style={{ fontSize: '13px', fontWeight: '700', color: '#64748b', margin: 0 }}>
                                {selectiveStudents.length === 0 ? `No students currently found in ${selectiveFromClass}.` : 'No students match your search filter.'}
                              </p>
                            </div>
                          ) : (
                            <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                              {filtered.map(student => {
                                const isSelected = selectedStudentIds.has(student.id);
                                return (
                                  <div 
                                    key={student.id}
                                    onClick={() => toggleStudentSelection(student.id)}
                                    style={{
                                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                      padding: '10px 14px', borderBottom: '1px solid #f1f5f9',
                                      background: isSelected ? '#f0f7ff' : 'transparent',
                                      cursor: 'pointer', transition: 'background 0.15s',
                                      gap: '12px'
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                                      <div style={{ color: isSelected ? '#2563eb' : '#94a3b8', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                                        {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                                      </div>
                                      <div style={{ minWidth: 0 }}>
                                        <p style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                          {student.name}
                                        </p>
                                        <p style={{ margin: 0, fontSize: '11px', color: '#64748b', fontFamily: 'monospace', fontWeight: '700' }}>
                                          {student.regNo || 'No Reg No'}
                                        </p>
                                      </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                      <span style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', padding: '2px 8px', borderRadius: '6px', background: '#f1f5f9', color: '#475569' }}>
                                        {student.className}
                                      </span>
                                      <span style={{ fontSize: '10px', fontWeight: '800', padding: '2px 6px', borderRadius: '6px', background: student.gender === 'Female' ? '#fdf2f8' : '#f0f9ff', color: student.gender === 'Female' ? '#db2777' : '#0284c7' }}>
                                        {student.gender?.[0] || 'M'}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {selectedStudentIds.size > 0 && (
                          <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '10px', background: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '12px', fontWeight: '700', color: '#1e40af' }}>
                              Ready to move <strong>{selectedStudentIds.size}</strong> student(s) from <strong>{selectiveFromClass}</strong> to <strong>{selectiveToClass}</strong>.
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button onClick={() => setShowMoveModal(false)} style={{ padding: '11px 22px', borderRadius: '10px', border: '2px solid #e2e8f0', background: '#fff', fontWeight: '700', cursor: 'pointer', color: '#475569' }}>
                      Cancel
                    </button>
                    <button 
                      onClick={handleRunPromotion} 
                      disabled={promotionMode === 'selective' && selectedStudentIds.size === 0}
                      style={{ 
                        padding: '11px 28px', borderRadius: '10px', border: 'none', 
                        background: promotionMode === 'selective' && selectedStudentIds.size === 0 ? '#cbd5e1' : 'linear-gradient(135deg,#f59e0b,#d97706)', 
                        color: '#fff', fontWeight: '800', cursor: promotionMode === 'selective' && selectedStudentIds.size === 0 ? 'not-allowed' : 'pointer', 
                        display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' 
                      }}
                    >
                      {promotionMode === 'selective' ? (
                        <><CheckSquare size={16} /> Move {selectedStudentIds.size} Selected Students</>
                      ) : promotionMode === 'manual' ? (
                        <><Users size={16} /> Move Entire Class</>
                      ) : (
                        <><Zap size={16} /> Run Auto Promotion</>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP: loading */}
              {promotionStep === 'loading' && (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <Loader2 size={48} style={{ color: '#f59e0b', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
                  <p style={{ fontWeight: '700', color: '#1e293b', fontSize: '16px' }}>Moving / promoting students…</p>
                  <p style={{ color: '#64748b', fontSize: '13px' }}>Updating student records in Firestore. Please wait.</p>
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
                  <h3 style={{ fontSize: '22px', fontWeight: '900', color: '#1e293b', marginBottom: '8px' }}>
                    {promotionResult?.selectiveCount ? 'Students Moved Successfully!' : 'Promotion Complete!'}
                  </h3>
                  <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>
                    {promotionResult?.selectiveCount 
                      ? `${promotionResult.selectiveCount} selected student(s) have been moved from ${promotionResult.fromClass} to ${promotionResult.toClass}.`
                      : 'All students have been moved to their new classes. The changes are live in Firestore.'}
                  </p>

                  {promotionResult?.selectiveCount ? (
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '14px', padding: '18px', marginBottom: '24px', textAlign: 'center', maxWidth: '360px', margin: '0 auto 24px' }}>
                      <p style={{ fontSize: '32px', fontWeight: '900', color: '#16a34a', margin: 0 }}>{promotionResult.selectiveCount}</p>
                      <p style={{ fontSize: '13px', fontWeight: '700', color: '#166534', margin: '4px 0 0' }}>
                        Students placed in <strong>{promotionResult.toClass}</strong>
                      </p>
                    </div>
                  ) : promotionResult && (
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
