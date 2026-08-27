import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { 
  Save, RefreshCcw, Palette, School, BookOpen, CheckCircle, Loader2, Calendar, 
  GraduationCap, Users, ChevronDown, AlertTriangle, ArrowRight, X, CheckSquare, 
  Image as ImageIcon, Upload, Search, Zap, Check, Square, Filter, UserCheck, 
  Globe, Phone, Mail, Clock, Lock, ShieldCheck, CreditCard, Building, Building2, 
  Share2, FileCheck, Layers, Award, Sparkles, Sliders, ExternalLink, Plus, Trash2
} from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, collection, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { uploadFileToSupabase } from '../lib/supabase';
import { runAutoPromotion, fetchStudentsForClass, promoteOneSS1Student } from '../utils/promotion';
import { SS1_SUBJECTS } from '../utils/subjectConfig';
import { DEFAULT_COMMENT_TEMPLATES } from '../utils/commentGenerator';
import ManageClubsAndHousesModal from '../components/ManageClubsAndHousesModal';
import { formatNaira } from '../utils/prospectusFees';

const COLOR_PRESETS = [
  { name: 'Bonus Dominus Amber', primary: '#ff6b00', secondary: '#111111', navBg: '#0f172a', footBg: '#0f172a', navText: '#ffffff', footText: '#ffffff' },
  { name: 'Royal Indigo & Navy', primary: '#4f46e5', secondary: '#0f172a', navBg: '#0f172a', footBg: '#020617', navText: '#ffffff', footText: '#ffffff' },
  { name: 'Emerald Prestige', primary: '#059669', secondary: '#064e3b', navBg: '#064e3b', footBg: '#022c22', navText: '#ffffff', footText: '#ffffff' },
  { name: 'Crimson Executive', primary: '#e11d48', secondary: '#1e1b4b', navBg: '#1e1b4b', footBg: '#0f172a', navText: '#ffffff', footText: '#ffffff' },
  { name: 'Ocean Cyan & Slate', primary: '#0284c7', secondary: '#0f172a', navBg: '#0f172a', footBg: '#0f172a', navText: '#ffffff', footText: '#ffffff' },
];

const BrandingSettings = () => {
  const [activeTab, setActiveTab] = useState('identity'); // 'identity' | 'appearance' | 'academic' | 'permissions' | 'signatures' | 'bank_accounts' | 'media' | 'promotion'
  const [showClubsModal, setShowClubsModal] = useState(false);
  const [saveStatus, setSaveStatus] = useState({ state: 'idle', message: '' }); // 'idle' | 'saving' | 'saved' | 'error'

  const { 
    schoolName, setSchoolName, 
    motto, setMotto,
    schoolAddress, setSchoolAddress,
    schoolPhone, setSchoolPhone,
    schoolEmail, setSchoolEmail,
    principalName, setPrincipalName,
    examinationOfficerName, setExaminationOfficerName,
    socialLinks, setSocialLinks,
    bankAccounts, setBankAccounts,
    portalPermissions, setPortalPermissions,
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
    averageDivisors, setAverageDivisors,
    darkMode, toggleDarkMode
  } = useTheme();

  // Local state for form buffers
  const [name, setName] = useState(schoolName || 'BONUS DOMINUS SECONDARY SCHOOL');
  const [schoolMotto, setSchoolMotto] = useState(motto || 'Nurturing Leaders of Tomorrow with Knowledge, Discipline, and Excellence');
  const [address, setAddress] = useState(schoolAddress || '123 Education Lane, Digital City, Nigeria');
  const [phone, setPhone] = useState(schoolPhone || '+234 800 123 4567');
  const [email, setEmail] = useState(schoolEmail || 'info@bonusdominus.edu.ng');
  const [officeHours, setOfficeHours] = useState('Mon - Fri: 8:00 AM - 4:00 PM');
  const [pName, setPName] = useState(principalName || 'Mrs. Anita Etuzu');
  const [examOfficer, setExamOfficer] = useState(examinationOfficerName || 'Exam Officer');
  
  const [socials, setSocials] = useState({
    facebook: 'https://facebook.com',
    twitter: 'https://twitter.com',
    instagram: 'https://instagram.com',
    linkedin: '',
    youtube: '',
    whatsapp: '+2348001234567',
    ...(socialLinks || {})
  });

  const [primary, setPrimary] = useState(primaryColor || '#ff6b00');
  const [secondary, setSecondary] = useState(secondaryColor || '#111111');
  const [logoPreview, setLogoPreview] = useState(schoolLogo);
  const [navBg, setNavBg] = useState(navbarBg || '#000000');
  const [footBg, setFootBg] = useState(footerBg || '#000000');
  const [navText, setNavText] = useState(navbarTextColor || '#ffffff');
  const [footText, setFootText] = useState(footerTextColor || '#ffffff');

  const [pSig, setPSig] = useState(principalSignature);
  const [pStamp, setPStamp] = useState(principalStamp);
  const [bSig, setBSig] = useState(bursarSignature);
  const [bStamp, setBStamp] = useState(bursarStamp);
  const [examSig, setExamSig] = useState(null);

  // Bank Accounts state
  const [accountsList, setAccountsList] = useState(
    bankAccounts && bankAccounts.length > 0 ? bankAccounts : [
      { bankName: 'First Bank of Nigeria', accountName: 'Bonus Dominus College / School Fees', accountNumber: '2022829027', type: 'Tuition & Prospectus', isDefault: true },
      { bankName: 'Moniepoint Microfinance Bank', accountName: 'Bonus Dominus School Portal', accountNumber: '8223190412', type: 'Online Instant Collections', isDefault: false },
      { bankName: 'OPay Digital Services', accountName: 'Bonus Dominus Secondary School', accountNumber: '9017588338', type: 'Direct Bursary Transfer', isDefault: false }
    ]
  );
  const [newBankName, setNewBankName] = useState('');
  const [newAccName, setNewAccName] = useState('');
  const [newAccNo, setNewAccNo] = useState('');
  const [newAccType, setNewAccType] = useState('General Bursary');

  // Academic Settings Buffers
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
  const [showAddTierModal, setShowAddTierModal] = useState(false);
  const [newTierLabel, setNewTierLabel] = useState('');
  const [newTierMinScore, setNewTierMinScore] = useState(70);
  const [newTierTeacher, setNewTierTeacher] = useState('');
  const [newTierPrincipal, setNewTierPrincipal] = useState('');

  const handleAddCommentTier = () => {
    if (!newTierLabel.trim()) {
      alert('Please enter a Performance Tier Label (e.g. Credit / Merit 65% - 74%)');
      return;
    }
    const tierKey = 'tier_' + Date.now();
    setTpls(prev => ({
      ...prev,
      [tierKey]: {
        label: newTierLabel.trim(),
        minScore: Number(newTierMinScore) || 0,
        teacher: newTierTeacher.trim() || 'Commendable effort and sound academic grasp.',
        principal: newTierPrincipal.trim() || 'Good performance. Keep up the high standard.'
      }
    }));
    setShowAddTierModal(false);
    setNewTierLabel('');
    setNewTierMinScore(70);
    setNewTierTeacher('');
    setNewTierPrincipal('');
  };

  const handleDeleteCommentTier = (key) => {
    if (!window.confirm(`Delete the remark tier for "${tpls[key]?.label || key}"?`)) return;
    setTpls(prev => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  const handleResetDefaultCommentTiers = () => {
    if (!window.confirm('Reset all remark templates to the standard 5 performance tiers?')) return;
    setTpls(DEFAULT_COMMENT_TEMPLATES);
  };
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

  // Portal Permissions & Toggles
  const [permissions, setPermissions] = useState({
    admissionOpen: true,
    subjectRegistrationEnabled: false,
    resultCheckingEnabled: true,
    cbtEnabled: true,
    onlinePaymentEnabled: true,
    walletPaymentEnabled: true,
    allowProfileEdit: false,
    ...(portalPermissions || {})
  });

  // Media & Landing Page CMS
  const [heroImages, setHeroImages] = useState([]);
  const [slideDuration, setSlideDuration] = useState(4);
  const [heroImagesUploading, setHeroImagesUploading] = useState(false);
  const [campusLifeImages, setCampusLifeImages] = useState([]);
  const [campusLifeUploading, setCampusLifeUploading] = useState(false);
  const [homeAdImage, setHomeAdImage] = useState(null);
  const [homeAdLink, setHomeAdLink] = useState('');
  const [homeAdEnabled, setHomeAdEnabled] = useState(false);
  const [homeAdUploading, setHomeAdUploading] = useState(false);

  // Session Configuration
  const SESSION_LIST = ['2023/2024', '2024/2025', '2025/2026', '2026/2027', '2027/2028', '2028/2029'];
  const [sessionInput, setSessionInput] = useState(currentSession || '2025/2026');

  // Move Students Modal
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [promotionStep, setPromotionStep] = useState('idle'); // idle | loading | auto_done | ss1_placement | done
  const [promotionMode, setPromotionMode] = useState('auto'); // 'auto' | 'manual' | 'selective'
  const [manualFromClass, setManualFromClass] = useState('JSS1');
  const [manualToClass, setManualToClass] = useState('JSS2');
  const [promotionResult, setPromotionResult] = useState(null);
  const [ss1Students, setSs1Students] = useState([]);
  const [ss1Assignments, setSs1Assignments] = useState({});
  const [ss1Saving, setSs1Saving] = useState(false);

  // Selective Move States
  const [selectiveFromClass, setSelectiveFromClass] = useState('JSS 2');
  const [selectiveToClass, setSelectiveToClass] = useState('JSS 3');
  const [selectiveStudents, setSelectiveStudents] = useState([]);
  const [loadingSelective, setLoadingSelective] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set());
  const [selectiveSearch, setSelectiveSearch] = useState('');

  // Sync from context once ready
  useEffect(() => {
    setName(schoolName || 'BONUS DOMINUS SECONDARY SCHOOL');
    setSchoolMotto(motto || 'Nurturing Leaders of Tomorrow with Knowledge, Discipline, and Excellence');
    setAddress(schoolAddress || '123 Education Lane, Digital City, Nigeria');
    setPhone(schoolPhone || '+234 800 123 4567');
    setEmail(schoolEmail || 'info@bonusdominus.edu.ng');
    setPName(principalName || 'Mrs. Anita Etuzu');
    setExamOfficer(examinationOfficerName || 'Exam Officer');
    if (socialLinks) setSocials(prev => ({ ...prev, ...socialLinks }));
    if (bankAccounts && bankAccounts.length > 0) setAccountsList(bankAccounts);
    if (portalPermissions) setPermissions(prev => ({ ...prev, ...portalPermissions }));
    setPrimary(primaryColor || '#ff6b00');
    setSecondary(secondaryColor || '#111111');
    setLogoPreview(schoolLogo);
    setNavBg(navbarBg || '#000000');
    setFootBg(footerBg || '#000000');
    setNavText(navbarTextColor || '#ffffff');
    setFootText(footerTextColor || '#ffffff');
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
    if (averageDivisors) setDivisorInputs(averageDivisors);
  }, [schoolName, motto, schoolAddress, schoolPhone, schoolEmail, principalName, examinationOfficerName, socialLinks, bankAccounts, portalPermissions, primaryColor, secondaryColor, schoolLogo, navbarBg, footerBg, navbarTextColor, footerTextColor, principalSignature, principalStamp, bursarSignature, bursarStamp, currentSession, cat1Limit, cat2Limit, examLimit, currentTerm, termStartDate, termEndDate, nextTermBeginsDate, promotionPassMark, autoCommentsEnabled, commentTemplates, averageDivisors]);

  // Load public_content & permissions from Firestore on mount
  useEffect(() => {
    const fetchRemoteSettings = async () => {
      try {
        const publicSnap = await getDoc(doc(db, 'settings', 'public_content'));
        if (publicSnap.exists()) {
          const pData = publicSnap.data();
          if (pData.contactDetails) {
            if (pData.contactDetails.address) setAddress(pData.contactDetails.address);
            if (pData.contactDetails.phone) setPhone(pData.contactDetails.phone);
            if (pData.contactDetails.email) setEmail(pData.contactDetails.email);
            if (pData.contactDetails.hours) setOfficeHours(pData.contactDetails.hours);
          }
          if (pData.socialLinks) {
            setSocials(prev => ({ ...prev, ...pData.socialLinks }));
          }
          if (pData.landingPage) {
            const lp = pData.landingPage;
            if (Array.isArray(lp.heroImages)) setHeroImages(lp.heroImages);
            if (Array.isArray(lp.campusLifeImages)) setCampusLifeImages(lp.campusLifeImages);
            if (lp.homeSlideDuration) setSlideDuration(lp.homeSlideDuration);
            if (lp.homeAdImage) setHomeAdImage(lp.homeAdImage);
            if (lp.homeAdLink) setHomeAdLink(lp.homeAdLink);
            if (lp.homeAdEnabled !== undefined) setHomeAdEnabled(lp.homeAdEnabled);
          }
        }

        // Student permissions
        const permSnap = await getDoc(doc(db, 'settings', 'student_permissions'));
        if (permSnap.exists()) {
          const permData = permSnap.data();
          setPermissions(prev => ({
            ...prev,
            admissionOpen: permData.admissionOpen !== false,
            resultCheckingEnabled: permData.resultCheckingEnabled !== false,
            cbtEnabled: permData.cbtEnabled !== false,
            allowProfileEdit: !!permData.allowProfileEdit,
            onlinePaymentEnabled: permData.onlinePaymentEnabled !== false,
            walletPaymentEnabled: permData.walletPaymentEnabled !== false
          }));
        }

        // Academic permissions
        const acadSnap = await getDoc(doc(db, 'settings', 'academic_permissions'));
        if (acadSnap.exists()) {
          const aData = acadSnap.data();
          setPermissions(prev => ({
            ...prev,
            subjectRegistrationEnabled: !!aData.subjectRegistrationEnabled,
            admissionOpen: aData.admissionEnabled !== undefined ? aData.admissionEnabled : prev.admissionOpen
          }));
        }
      } catch (err) {
        console.warn('Could not fetch extra remote settings:', err);
      }
    };
    fetchRemoteSettings();
  }, []);

  // Bank account handlers
  const handleAddBankAccount = () => {
    if (!newBankName.trim() || !newAccNo.trim() || !newAccName.trim()) {
      alert('Please fill Bank Name, Account Name, and Account Number.');
      return;
    }
    const newAcc = {
      bankName: newBankName.trim(),
      accountName: newAccName.trim(),
      accountNumber: newAccNo.trim(),
      type: newAccType.trim() || 'Tuition & Fees',
      isDefault: accountsList.length === 0
    };
    setAccountsList(prev => [...prev, newAcc]);
    setNewBankName('');
    setNewAccName('');
    setNewAccNo('');
  };

  const handleRemoveBankAccount = (index) => {
    setAccountsList(prev => prev.filter((_, i) => i !== index));
  };

  const handleSetDefaultAccount = (index) => {
    setAccountsList(prev => prev.map((acc, i) => ({ ...acc, isDefault: i === index })));
  };

  // Image Upload helper
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

  // Hero Upload
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
        alert("Failed to upload hero image.");
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

  // Campus Life Upload
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
        alert("Failed to upload campus life image.");
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

  // Ad Banner Upload
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
        alert("Failed to upload ad image.");
      } finally {
        setHomeAdUploading(false);
      }
    }
  };

  // Apply color preset
  const applyPreset = (preset) => {
    setPrimary(preset.primary);
    setSecondary(preset.secondary);
    setNavBg(preset.navBg);
    setFootBg(preset.footBg);
    setNavText(preset.navText);
    setFootText(preset.footText);
  };

  // MASTER SAVE HANDLER: Synchronizes all branding, academic, contact, permissions, and CMS across Firestore
  const handleSaveAll = async () => {
    setSaveStatus({ state: 'saving', message: 'Saving master branding & settings across all modules...' });

    try {
      // 1. Update Theme Context in memory
      setSchoolName(name);
      setMotto(schoolMotto);
      setSchoolAddress(address);
      setSchoolPhone(phone);
      setSchoolEmail(email);
      setPName(pName);
      setExamOfficer(examOfficer);
      setSocialLinks(socials);
      setBankAccounts(accountsList);
      setPortalPermissions(permissions);
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
      setCurrentSession(sessionInput);
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

      // 2. Persist to settings/branding
      await setDoc(doc(db, 'settings', 'branding'), {
        schoolName: name,
        motto: schoolMotto,
        schoolAddress: address,
        schoolPhone: phone,
        schoolEmail: email,
        principalName: pName,
        examinationOfficerName: examOfficer,
        socialLinks: socials,
        bankAccounts: accountsList,
        portalPermissions: permissions,
        primaryColor: primary,
        secondaryColor: secondary,
        schoolLogo: logoPreview,
        navbarBg: navBg,
        footerBg: footBg,
        navbarTextColor: navText,
        footerTextColor: footText,
        principalSignature: pSig,
        principalStamp: pStamp,
        bursarSignature: bSig,
        bursarStamp: bStamp,
        currentSession: sessionInput,
        cat1Limit: Number(cat1Val),
        cat2Limit: Number(cat2Val),
        examLimit: Number(examVal),
        currentTerm: termInput,
        termStartDate: termStart,
        termEndDate: termEnd,
        nextTermBeginsDate: nextTerm,
        promotionPassMark: Number(passMarkInput),
        autoCommentsEnabled: commentsEnabled,
        commentTemplates: tpls,
        averageDivisors: divisorInputs,
        lastUpdated: new Date().toISOString()
      }, { merge: true });

      // 3. Persist to settings/public_content (Contact, Socials & CMS)
      await setDoc(doc(db, 'settings', 'public_content'), {
        contactDetails: {
          address,
          phone,
          email,
          hours: officeHours
        },
        socialLinks: socials,
        landingPage: {
          heroImages,
          campusLifeImages,
          homeSlideDuration: Number(slideDuration),
          homeAdImage,
          homeAdLink,
          homeAdEnabled
        },
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // 4. Persist to settings/student_permissions (Admission, Results, CBT, Payments)
      await setDoc(doc(db, 'settings', 'student_permissions'), {
        admissionOpen: permissions.admissionOpen,
        resultCheckingEnabled: permissions.resultCheckingEnabled,
        cbtEnabled: permissions.cbtEnabled,
        onlinePaymentEnabled: permissions.onlinePaymentEnabled,
        walletPaymentEnabled: permissions.walletPaymentEnabled,
        allowProfileEdit: permissions.allowProfileEdit,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // 5. Persist to settings/academic_permissions (Subject Registration)
      await setDoc(doc(db, 'settings', 'academic_permissions'), {
        subjectRegistrationEnabled: permissions.subjectRegistrationEnabled,
        admissionEnabled: permissions.admissionOpen,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setSaveStatus({ state: 'saved', message: 'All Master Settings and Branding updated successfully!' });
      setTimeout(() => setSaveStatus({ state: 'idle', message: '' }), 4000);
    } catch (err) {
      console.error('Error saving branding settings:', err);
      setSaveStatus({ state: 'error', message: 'Failed to save settings. Check console for details.' });
    }
  };

  const handleResetDefaults = () => {
    if (!window.confirm('Reset all branding settings to factory defaults?')) return;
    setName('BONUS DOMINUS SECONDARY SCHOOL');
    setSchoolMotto('Nurturing Leaders of Tomorrow with Knowledge, Discipline, and Excellence');
    setPrimary('#ff6b00');
    setSecondary('#111111');
    setNavBg('#000000');
    setFootBg('#000000');
    setNavText('#ffffff');
    setFootText('#ffffff');
    setLogoPreview(null);
    setPSig(null);
    setPStamp(null);
    setBSig(null);
    setBStamp(null);
  };

  // Selective Student Move Loader
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
    if (selectedStudentIds.size === 0) return alert('Please select at least one student to move.');
    if (!selectiveToClass) return alert('Please select a target class.');
    if (selectiveFromClass === selectiveToClass) return alert('Source and target classes are identical.');

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
      alert('An error occurred during selective student move.');
      setPromotionStep('idle');
    }
  };

  const handleRunPromotion = async () => {
    if (promotionMode === 'selective') return handleSelectiveMove();
    if (promotionMode === 'manual') return handleManualMove();

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
      alert('An error occurred running promotion.');
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

  const TABS = [
    { id: 'identity', label: 'School Identity & Contact', icon: School, count: null },
    { id: 'appearance', label: 'Colors & Styling', icon: Palette, count: null },
    { id: 'academic', label: 'Academic Calendar & Limits', icon: Calendar, count: null },
    { id: 'permissions', label: 'Portal Permissions', icon: Lock, count: null },
    { id: 'signatures', label: 'Credentials & Signatures', icon: FileCheck, count: null },
    { id: 'bank_accounts', label: 'Official Bank Accounts', icon: Building2, count: accountsList.length },
    { id: 'media', label: 'Website CMS & Media', icon: ImageIcon, count: null },
    { id: 'promotion', label: 'Promotion & Class Move', icon: GraduationCap, count: null },
  ];

  const totalAssessmentScore = Number(cat1Val || 0) + Number(cat2Val || 0) + Number(examVal || 0);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in duration-300">
      
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-slate-900/20 mb-8 border border-slate-700/50">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex items-center gap-5">
            {logoPreview ? (
              <img 
                src={logoPreview} 
                alt="Logo" 
                className="w-16 h-16 rounded-2xl object-cover bg-white p-1 border-2 border-white/20 shadow-md" 
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-indigo-600/30 border-2 border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-md">
                <School size={32} />
              </div>
            )}
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight m-0">{name || 'School Branding & Settings'}</h1>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
                  Master Control
                </span>
              </div>
              <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl font-medium">
                Unified administrative control center for institution identity, themes, portal security, and academic policies.
              </p>
            </div>
          </div>

          {/* Action Header Buttons */}
          <div className="flex items-center gap-3 w-full lg:w-auto justify-end flex-wrap">
            <button
              onClick={handleResetDefaults}
              type="button"
              className="px-4 py-2.5 rounded-xl border border-slate-600 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-2"
            >
              <RefreshCcw size={14} /> Reset Defaults
            </button>
            <button
              onClick={handleSaveAll}
              disabled={saveStatus.state === 'saving'}
              type="button"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-black shadow-lg shadow-emerald-900/30 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {saveStatus.state === 'saving' ? (
                <><Loader2 size={16} className="animate-spin" /> Saving Changes...</>
              ) : (
                <><Save size={16} /> Save All Settings</>
              )}
            </button>
          </div>
        </div>

        {/* Global Save Alert Banner */}
        {saveStatus.message && (
          <div className={`mt-5 p-3.5 rounded-2xl flex items-center gap-3 text-xs sm:text-sm font-bold animate-in zoom-in-95 duration-200 ${
            saveStatus.state === 'saved' ? 'bg-emerald-950/80 text-emerald-200 border border-emerald-500/40' :
            saveStatus.state === 'error' ? 'bg-rose-950/80 text-rose-200 border border-rose-500/40' :
            'bg-indigo-950/80 text-indigo-200 border border-indigo-500/40'
          }`}>
            {saveStatus.state === 'saved' && <CheckCircle size={18} className="text-emerald-400 shrink-0" />}
            {saveStatus.state === 'error' && <AlertTriangle size={18} className="text-rose-400 shrink-0" />}
            {saveStatus.state === 'saving' && <Loader2 size={18} className="animate-spin text-indigo-400 shrink-0" />}
            <span>{saveStatus.message}</span>
          </div>
        )}
      </div>

      {/* Tabs Navigation Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 no-scrollbar">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl text-xs sm:text-sm font-black whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-[1.02]'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <Icon size={16} className={isActive ? 'text-white' : 'text-indigo-500'} />
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: SCHOOL IDENTITY & CONTACT */}
      {/* ========================================================================= */}
      {activeTab === 'identity' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
          
          {/* Main Identity */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-700 pb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center">
                <School size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white m-0">Institution Identity</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 m-0">Official name, motto, and leadership profiles</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">Official School Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. BONUS DOMINUS SECONDARY SCHOOL"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">School Motto / Slogan</label>
                <input
                  type="text"
                  value={schoolMotto}
                  onChange={(e) => setSchoolMotto(e.target.value)}
                  placeholder="e.g. Knowledge, Discipline, and Excellence"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">Principal Full Name</label>
                  <input
                    type="text"
                    value={pName}
                    onChange={(e) => setPName(e.target.value)}
                    placeholder="e.g. Mrs. Anita Etuzu"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">Examination Officer Name</label>
                  <input
                    type="text"
                    value={examOfficer}
                    onChange={(e) => setExamOfficer(e.target.value)}
                    placeholder="e.g. Mr. Kenneth O."
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Contact Details Section */}
            <div className="border-t border-slate-100 dark:border-slate-700 pt-6 space-y-4">
              <h4 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Phone size={16} className="text-emerald-500" /> Official Campus Contact & Hours
              </h4>

              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-200 mb-1">Campus Physical Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. 123 Education Lane, Digital City, Nigeria"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs sm:text-sm font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-200 mb-1">Phone Number(s)</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+234 800 123 4567"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs sm:text-sm font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-200 mb-1">Official Inquiry Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="info@school.edu.ng"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs sm:text-sm font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-200 mb-1">Working / Office Hours</label>
                  <input
                    type="text"
                    value={officeHours}
                    onChange={(e) => setOfficeHours(e.target.value)}
                    placeholder="Mon - Fri: 8:00 AM - 4:00 PM"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs sm:text-sm font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Social Media Links */}
            <div className="border-t border-slate-100 dark:border-slate-700 pt-6 space-y-4">
              <h4 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Share2 size={16} className="text-indigo-500" /> Social Media & WhatsApp Links
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">WhatsApp Support Line</label>
                  <input
                    type="text"
                    value={socials.whatsapp || ''}
                    onChange={(e) => setSocials(prev => ({ ...prev, whatsapp: e.target.value }))}
                    placeholder="+2348001234567"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-semibold text-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">Facebook Page URL</label>
                  <input
                    type="url"
                    value={socials.facebook || ''}
                    onChange={(e) => setSocials(prev => ({ ...prev, facebook: e.target.value }))}
                    placeholder="https://facebook.com/..."
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-semibold text-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">Twitter / X Handle URL</label>
                  <input
                    type="url"
                    value={socials.twitter || ''}
                    onChange={(e) => setSocials(prev => ({ ...prev, twitter: e.target.value }))}
                    placeholder="https://x.com/..."
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-semibold text-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">Instagram URL</label>
                  <input
                    type="url"
                    value={socials.instagram || ''}
                    onChange={(e) => setSocials(prev => ({ ...prev, instagram: e.target.value }))}
                    placeholder="https://instagram.com/..."
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-semibold text-slate-800 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Logo & Emblem Upload */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-700 pb-4 mb-6">
                <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 flex items-center justify-center">
                  <ImageIcon size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white m-0">Logo & Crest</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 m-0">Used on Report Cards, Receipts, Navbar</p>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50 mb-6 text-center">
                {logoPreview ? (
                  <div className="relative group mb-3">
                    <img 
                      src={logoPreview} 
                      alt="Logo" 
                      className="w-28 h-28 object-contain rounded-2xl bg-white p-2 border border-slate-200 shadow-md" 
                    />
                    <button
                      onClick={() => setLogoPreview(null)}
                      className="absolute -top-2 -right-2 bg-rose-600 text-white rounded-full p-1 shadow hover:bg-rose-700"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-2xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-400 mb-3">
                    <School size={36} />
                  </div>
                )}
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Official Crest (Max 2MB)</p>
                <p className="text-[11px] text-slate-400 mb-4">PNG, JPG, or SVG with transparent background recommended</p>
                <label className="cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black px-4 py-2 rounded-xl transition-all shadow-md">
                  Upload New Crest
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, setLogoPreview)}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="p-4 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-2xl border border-indigo-100 dark:border-indigo-900 text-xs text-indigo-900 dark:text-indigo-200">
              <p className="font-bold mb-1">💡 Branding Tip:</p>
              Your uploaded crest automatically reflects on official Terminal Report Cards, Bursary Payment Receipts, and Student ID cards.
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: APPEARANCE & COLORS */}
      {/* ========================================================================= */}
      {activeTab === 'appearance' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Quick Presets */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 className="text-base font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Sparkles size={18} className="text-amber-500" /> Curated School Theme Presets
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {COLOR_PRESETS.map(preset => (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset)}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 bg-slate-50 dark:bg-slate-900/50 text-left transition-all group"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded-full border border-white/40 shadow-sm" style={{ backgroundColor: preset.primary }} />
                    <div className="w-5 h-5 rounded-full border border-white/40 shadow-sm" style={{ backgroundColor: preset.secondary }} />
                  </div>
                  <p className="text-xs font-black text-slate-800 dark:text-white m-0 group-hover:text-indigo-500">{preset.name}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Color Palettes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Primary Accent */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">Primary Accent Color</label>
                <p className="text-xs text-slate-500 mb-4">Buttons, links, highlights, and active elements.</p>
              </div>
              <div className="flex items-center gap-3">
                <input 
                  type="color" 
                  value={primary} 
                  onChange={(e) => setPrimary(e.target.value)}
                  className="w-12 h-12 rounded-xl cursor-pointer border-none bg-transparent"
                />
                <input
                  type="text"
                  value={primary}
                  onChange={(e) => setPrimary(e.target.value)}
                  className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-mono font-bold text-slate-800 dark:text-white w-28"
                />
              </div>
            </div>

            {/* Sidebar & Secondary */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">Sidebar / Secondary Color</label>
                <p className="text-xs text-slate-500 mb-4">Administrative dashboard sidebar and secondary navigation.</p>
              </div>
              <div className="flex items-center gap-3">
                <input 
                  type="color" 
                  value={secondary} 
                  onChange={(e) => setSecondary(e.target.value)}
                  className="w-12 h-12 rounded-xl cursor-pointer border-none bg-transparent"
                />
                <input
                  type="text"
                  value={secondary}
                  onChange={(e) => setSecondary(e.target.value)}
                  className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-mono font-bold text-slate-800 dark:text-white w-28"
                />
              </div>
            </div>

            {/* Navbar Background */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">Navbar Background & Text</label>
                <p className="text-xs text-slate-500 mb-4">Public homepage and top navigation bar.</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <input type="color" value={navBg} onChange={(e) => setNavBg(e.target.value)} className="w-10 h-10 rounded-xl cursor-pointer" />
                  <span className="text-[10px] font-bold text-slate-500">Bg</span>
                </div>
                <div className="flex items-center gap-2">
                  <input type="color" value={navText} onChange={(e) => setNavText(e.target.value)} className="w-10 h-10 rounded-xl cursor-pointer" />
                  <span className="text-[10px] font-bold text-slate-500">Text</span>
                </div>
              </div>
            </div>

            {/* Footer Background */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">Footer Background & Text</label>
                <p className="text-xs text-slate-500 mb-4">Bottom public footer background color.</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <input type="color" value={footBg} onChange={(e) => setFootBg(e.target.value)} className="w-10 h-10 rounded-xl cursor-pointer" />
                  <span className="text-[10px] font-bold text-slate-500">Bg</span>
                </div>
                <div className="flex items-center gap-2">
                  <input type="color" value={footText} onChange={(e) => setFootText(e.target.value)} className="w-10 h-10 rounded-xl cursor-pointer" />
                  <span className="text-[10px] font-bold text-slate-500">Text</span>
                </div>
              </div>
            </div>

            {/* Global Dark Mode Switch */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">Global Dark Theme Mode</label>
                <p className="text-xs text-slate-500 mb-4">Switch between sleek dark interface or daylight high-contrast.</p>
              </div>
              <button
                onClick={toggleDarkMode}
                type="button"
                className="inline-flex items-center gap-3 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-900 text-xs font-black text-slate-800 dark:text-white"
              >
                <span className={`w-3 h-3 rounded-full ${darkMode ? 'bg-indigo-500' : 'bg-amber-500'}`} />
                {darkMode ? 'Dark Mode Active' : 'Light Mode Active'}
              </button>
            </div>

          </div>

          {/* Real-time Component Preview Mockup */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-sm">
            <h4 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white mb-4">
              Real-time Component Preview
            </h4>
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between flex-wrap gap-4" style={{ backgroundColor: navBg, color: navText }}>
              <div className="flex items-center gap-3">
                {logoPreview ? (
                  <img src={logoPreview} alt="" className="w-8 h-8 rounded-lg object-contain bg-white p-0.5" />
                ) : (
                  <School size={24} />
                )}
                <span className="font-black text-sm tracking-tight">{name}</span>
              </div>
              <div className="flex items-center gap-3">
                <button className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{ backgroundColor: primary, color: '#fff' }}>
                  Primary Action
                </button>
                <span className="text-xs font-semibold opacity-80">Link Hover</span>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: ACADEMIC CALENDAR & LIMITS */}
      {/* ========================================================================= */}
      {activeTab === 'academic' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Active Session & Term Card */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-700 pb-4 mb-6">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center">
                <Calendar size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white m-0">Academic Session & Term Dates</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 m-0">Sets the active school academic year and calendar milestones</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">Academic Session</label>
                <select
                  value={sessionInput}
                  onChange={(e) => setSessionInput(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-black text-slate-800 dark:text-white"
                >
                  {SESSION_LIST.map(s => (
                    <option key={s} value={s}>{s} Academic Year</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">Active Academic Term</label>
                <select
                  value={termInput}
                  onChange={(e) => setTermInput(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-black text-slate-800 dark:text-white"
                >
                  <option value="1st Term">1st Term (First)</option>
                  <option value="2nd Term">2nd Term (Second)</option>
                  <option value="3rd Term">3rd Term (Third / Promotional)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">Term Start Date</label>
                <input
                  type="date"
                  value={termStart}
                  onChange={(e) => setTermStart(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs sm:text-sm font-semibold text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">Term End Date</label>
                <input
                  type="date"
                  value={termEnd}
                  onChange={(e) => setTermEnd(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs sm:text-sm font-semibold text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">Next Term Resumption</label>
                <input
                  type="date"
                  value={nextTerm}
                  onChange={(e) => setNextTerm(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs sm:text-sm font-semibold text-slate-800 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Continuous Assessment Limits & Pass Mark */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen size={18} className="text-indigo-500" /> Continuous Assessment & Exam Limits
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Score limit weights for continuous assessment tests and terminal examination.
              </p>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-200 mb-1">1st Test (CAT 1)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={cat1Val}
                    onChange={(e) => setCat1Val(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-black text-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-200 mb-1">2nd Test (CAT 2)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={cat2Val}
                    onChange={(e) => setCat2Val(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-black text-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-200 mb-1">Exam Max Score</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={examVal}
                    onChange={(e) => setExamVal(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-black text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-black ${
                totalAssessmentScore === 100 
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' 
                  : 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
              }`}>
                <span>Total Assessment Weight: {totalAssessmentScore} / 100 Marks</span>
                {totalAssessmentScore !== 100 && (
                  <span className="text-[11px] font-bold text-rose-600">Warning: Total should equal 100</span>
                )}
              </div>
            </div>

            {/* Promotion Pass Mark Threshold */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <GraduationCap size={18} className="text-amber-500" /> Promotion Pass Mark Threshold
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  Minimum cumulative average percentage required to qualify for auto-promotion to the next class.
                </p>

                <div className="flex items-center gap-4">
                  <div className="w-32">
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-200 mb-1">Pass Mark (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={passMarkInput}
                      onChange={(e) => setPassMarkInput(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-lg font-black text-slate-800 dark:text-white"
                    />
                  </div>
                  <div className="flex-1 p-3.5 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200 font-medium">
                    Students with average ≥ <strong>{passMarkInput}%</strong> will automatically be promoted to next class during Third Term processing.
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Average Divisor Configuration */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Layers size={18} className="text-indigo-500" /> Class Subject Divisors (for Average Calculation)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Total subject count divisor used to calculate overall percentage on terminal report cards.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              {Object.entries(divisorInputs).map(([className, value]) => (
                <div key={className} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 text-center">
                  <span className="block text-xs font-black text-slate-700 dark:text-slate-200 mb-1">{className}</span>
                  <input
                    type="number"
                    min="1"
                    value={value}
                    onChange={(e) => setDivisorInputs(prev => ({ ...prev, [className]: Number(e.target.value || 1) }))}
                    className="w-full text-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl p-2 text-sm font-black text-slate-800 dark:text-white"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Auto Comments Templates */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border-2 border-indigo-500/40 shadow-xl shadow-indigo-950/30 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-700 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                  <Award size={22} className="text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-white m-0">Auto-Generated Result Remarks</h3>
                    <span className="bg-indigo-500/30 text-indigo-200 border border-indigo-400/40 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                      Custom Tiers
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 m-0 mt-0.5 font-medium">
                    Configure Principal & Form Teacher comment templates based on student score percentages
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={handleResetDefaultCommentTiers}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <RefreshCcw size={13} className="text-slate-300" /> 
                  <span className="text-white">Reset 5 Tiers</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddTierModal(!showAddTierModal)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white text-xs font-black shadow-lg shadow-indigo-600/40 transition-all flex items-center gap-2 active:scale-95"
                >
                  <Plus size={16} className="text-white font-black stroke-[3]" /> 
                  <span className="text-white font-black">Add Performance Tier</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCommentsEnabled(!commentsEnabled)}
                  title={commentsEnabled ? 'Auto-comments enabled' : 'Auto-comments disabled'}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-all focus:outline-none ${commentsEnabled ? 'bg-emerald-500 shadow-md shadow-emerald-500/30' : 'bg-slate-700 border border-slate-600'}`}
                >
                  <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform ${commentsEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>

            {/* Add New Tier Creator Box */}
            {showAddTierModal && (
              <div className="p-6 bg-slate-950 rounded-2xl border-2 border-indigo-400 text-white space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2 text-white">
                    <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black">
                      <Plus size={16} className="text-white" />
                    </div>
                    <h4 className="text-sm font-black text-white m-0">Create New Remark Tier</h4>
                  </div>
                  <button onClick={() => setShowAddTierModal(false)} className="text-slate-400 hover:text-white p-1">
                    <X size={18} className="text-white" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-black text-white mb-1.5 flex items-center gap-1.5">
                      <Award size={14} className="text-indigo-400" /> Tier Title / Label
                    </label>
                    <input
                      type="text"
                      value={newTierLabel}
                      onChange={(e) => setNewTierLabel(e.target.value)}
                      placeholder="e.g. High Distinction / Honors (85% - 100%)"
                      className="w-full bg-slate-900 border-2 border-slate-700 focus:border-indigo-400 text-white rounded-xl p-3 text-xs font-bold placeholder:text-slate-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-white mb-1.5 flex items-center gap-1.5">
                      <Sliders size={14} className="text-indigo-400" /> Minimum Score %
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={newTierMinScore}
                      onChange={(e) => setNewTierMinScore(e.target.value)}
                      placeholder="85"
                      className="w-full bg-slate-900 border-2 border-slate-700 focus:border-indigo-400 text-white rounded-xl p-3 text-xs font-black placeholder:text-slate-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-white mb-1.5 flex items-center gap-1.5">
                      <UserCheck size={14} className="text-emerald-400" /> Form Teacher Remark Template
                    </label>
                    <textarea
                      rows={2}
                      value={newTierTeacher}
                      onChange={(e) => setNewTierTeacher(e.target.value)}
                      placeholder="e.g. An exceptional student with outstanding academic brilliance and conduct."
                      className="w-full bg-slate-900 border-2 border-slate-700 focus:border-indigo-400 text-white rounded-xl p-3 text-xs font-medium placeholder:text-slate-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-white mb-1.5 flex items-center gap-1.5">
                      <Award size={14} className="text-amber-400" /> Principal Remark Template
                    </label>
                    <textarea
                      rows={2}
                      value={newTierPrincipal}
                      onChange={(e) => setNewTierPrincipal(e.target.value)}
                      placeholder="e.g. Excellent result! Continues to set the academic standard."
                      className="w-full bg-slate-900 border-2 border-slate-700 focus:border-indigo-400 text-white rounded-xl p-3 text-xs font-medium placeholder:text-slate-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddTierModal(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddCommentTier}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-lg shadow-emerald-900/40 transition-all flex items-center gap-2"
                  >
                    <Check size={16} className="text-white font-black stroke-[3]" /> Save Tier
                  </button>
                </div>
              </div>
            )}

            {commentsEnabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(tpls)
                  .sort(([, a], [, b]) => Number(b?.minScore ?? 0) - Number(a?.minScore ?? 0))
                  .map(([key, tier]) => (
                    <div 
                      key={key} 
                      className="p-5 bg-slate-950/90 rounded-2xl border-2 border-slate-700/80 hover:border-indigo-500/60 transition-all space-y-4 shadow-lg text-white"
                    >
                      {/* Tier Header & Score Editor */}
                      <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0" />
                          <input
                            type="text"
                            value={tier?.label || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setTpls(prev => ({ ...prev, [key]: { ...prev[key], label: val } }));
                            }}
                            className="w-full bg-slate-900 border border-slate-700 focus:border-indigo-400 text-xs font-black text-white px-2.5 py-1.5 rounded-lg focus:outline-none"
                            placeholder="Tier Name..."
                          />
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center gap-1.5 bg-indigo-950/70 border border-indigo-500/50 rounded-lg px-2.5 py-1 text-white">
                            <span className="text-[10px] font-black text-indigo-300 uppercase">Min %</span>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={tier?.minScore ?? 0}
                              onChange={(e) => {
                                const val = Number(e.target.value) || 0;
                                setTpls(prev => ({ ...prev, [key]: { ...prev[key], minScore: val } }));
                              }}
                              className="w-10 bg-indigo-600 text-xs font-black text-white text-center rounded focus:outline-none px-1"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteCommentTier(key)}
                            title="Delete this Tier"
                            className="p-2 text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow-sm"
                          >
                            <Trash2 size={14} className="text-white" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-black text-slate-200 mb-1.5 flex items-center gap-1.5">
                          <UserCheck size={14} className="text-emerald-400" /> Form Teacher Remark Template
                        </label>
                        <textarea
                          rows={2}
                          value={tier?.teacher || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTpls(prev => ({ ...prev, [key]: { ...prev[key], teacher: val } }));
                          }}
                          className="w-full bg-slate-900 border-2 border-slate-700 focus:border-indigo-400 text-white rounded-xl p-3 text-xs font-medium leading-relaxed focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-black text-slate-200 mb-1.5 flex items-center gap-1.5">
                          <Award size={14} className="text-amber-400" /> Principal Remark Template
                        </label>
                        <textarea
                          rows={2}
                          value={tier?.principal || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTpls(prev => ({ ...prev, [key]: { ...prev[key], principal: val } }));
                          }}
                          className="w-full bg-slate-900 border-2 border-slate-700 focus:border-indigo-400 text-white rounded-xl p-3 text-xs font-medium leading-relaxed focus:outline-none"
                        />
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: PORTAL PERMISSIONS & SECURITY */}
      {/* ========================================================================= */}
      {activeTab === 'permissions' && (
        <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border-2 border-indigo-500/40 shadow-xl shadow-indigo-950/30 space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-700 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                <Lock size={22} className="text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-white m-0">Portal Access & Security Controls</h3>
                  <span className="bg-indigo-500/30 text-indigo-200 border border-indigo-400/40 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                    Master Access
                  </span>
                </div>
                <p className="text-xs text-slate-300 m-0 mt-0.5 font-medium">
                  Enable or lock specific public and student portals across the web application
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                id: 'admissionOpen',
                title: 'Public Admission Portal',
                description: 'Allow new applicant candidate registrations and entrance applications.',
                badge: 'Public',
                icon: School,
                iconColor: 'text-indigo-400',
                iconBg: 'bg-indigo-950/60'
              },
              {
                id: 'cbtEnabled',
                title: 'CBT Entrance Examination',
                description: 'Require candidates to complete the timed online assessment before prospectus payment.',
                badge: 'Admission',
                icon: Zap,
                iconColor: 'text-amber-400',
                iconBg: 'bg-amber-950/60'
              },
              {
                id: 'subjectRegistrationEnabled',
                title: 'Subject Registration Portal',
                description: 'Allow SS2 and SS3 students to self-register their 9 subjects on the student dashboard.',
                badge: 'Senior Secondary',
                icon: BookOpen,
                iconColor: 'text-sky-400',
                iconBg: 'bg-sky-950/60'
              },
              {
                id: 'resultCheckingEnabled',
                title: 'Terminal Result Checking Portal',
                description: 'Allow students to view and download their academic report cards for published terms.',
                badge: 'Results',
                icon: Award,
                iconColor: 'text-emerald-400',
                iconBg: 'bg-emerald-950/60'
              },
              {
                id: 'onlinePaymentEnabled',
                title: 'Online Payment Gateways (First Bank & Moniepoint)',
                description: 'Allow direct online fee settlement with instant automated credit verification.',
                badge: 'Bursary',
                icon: CreditCard,
                iconColor: 'text-violet-400',
                iconBg: 'bg-violet-950/60'
              },
              {
                id: 'walletPaymentEnabled',
                title: 'Student E-Wallet Payments',
                description: 'Enable pre-loaded student e-wallet debiting for fee payments without card charges.',
                badge: 'Wallet',
                icon: CreditCard,
                iconColor: 'text-teal-400',
                iconBg: 'bg-teal-950/60'
              },
              {
                id: 'allowProfileEdit',
                title: 'Student Profile Self-Editing',
                description: 'Allow registered students to update their personal info, phone numbers, and passport photos.',
                badge: 'Security',
                icon: UserCheck,
                iconColor: 'text-rose-400',
                iconBg: 'bg-rose-950/60'
              }
            ].map(perm => {
              const isEnabled = !!permissions[perm.id];
              const Icon = perm.icon;
              return (
                <div 
                  key={perm.id}
                  className="p-5 rounded-2xl bg-slate-950/90 border-2 border-slate-700/80 hover:border-indigo-500/60 transition-all text-white shadow-lg flex items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    <div className={`w-10 h-10 rounded-xl ${perm.iconBg} border border-slate-700 flex items-center justify-center shrink-0 mt-0.5 shadow-sm`}>
                      <Icon size={20} className={perm.iconColor} />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-black text-white m-0 tracking-tight">{perm.title}</h4>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/40 uppercase">
                          {perm.badge}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 m-0 leading-relaxed font-medium">{perm.description}</p>
                      <div className="pt-1">
                        {isEnabled ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-400">
                            <CheckCircle size={13} className="text-emerald-400" /> Active & Open
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black text-slate-400">
                            <Lock size={13} className="text-slate-400" /> Locked / Disabled
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setPermissions(prev => ({ ...prev, [perm.id]: !isEnabled }))}
                    title={isEnabled ? `${perm.title} is ON - Click to Lock` : `${perm.title} is OFF - Click to Enable`}
                    className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-all focus:outline-none p-1 ${
                      isEnabled 
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-md shadow-emerald-500/30' 
                        : 'bg-slate-800 border-2 border-slate-600'
                    }`}
                  >
                    <span className={`inline-flex items-center justify-center h-6 w-6 transform rounded-full bg-white shadow-md transition-transform ${
                      isEnabled ? 'translate-x-6' : 'translate-x-0'
                    }`}>
                      {isEnabled ? (
                        <Check size={13} className="text-emerald-600 font-black stroke-[3]" />
                      ) : (
                        <Lock size={11} className="text-slate-500" />
                      )}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: OFFICIAL CREDENTIALS & SIGNATURES */}
      {/* ========================================================================= */}
      {activeTab === 'signatures' && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-sm space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-700 pb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center">
              <FileCheck size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white m-0">Official Signatures & Institutional Stamps</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 m-0">Embedded on Report Cards, Payment Receipts, Clearance, and Admission Letters</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Principal Signature */}
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex flex-col justify-between text-center">
              <div>
                <p className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1">Principal Signature</p>
                <p className="text-[11px] text-slate-400 mb-4">{pName || 'Mrs. Anita Etuzu'}</p>
                <div className="w-full h-24 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center overflow-hidden mb-3">
                  {pSig ? (
                    <img src={pSig} alt="Principal Signature" className="max-h-full max-w-full object-contain p-2" />
                  ) : (
                    <span className="text-xs text-slate-400 font-bold">No Signature</span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-center gap-2">
                <label className="cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black px-3 py-1.5 rounded-lg">
                  Upload
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setPSig)} className="hidden" />
                </label>
                {pSig && (
                  <button onClick={() => setPSig(null)} className="text-[11px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2 py-1.5 rounded-lg">
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Principal Stamp */}
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex flex-col justify-between text-center">
              <div>
                <p className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1">Official School Stamp</p>
                <p className="text-[11px] text-slate-400 mb-4">Embossed on report cards</p>
                <div className="w-full h-24 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center overflow-hidden mb-3">
                  {pStamp ? (
                    <img src={pStamp} alt="Principal Stamp" className="max-h-full max-w-full object-contain p-2" />
                  ) : (
                    <span className="text-xs text-slate-400 font-bold">No Stamp</span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-center gap-2">
                <label className="cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black px-3 py-1.5 rounded-lg">
                  Upload
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setPStamp)} className="hidden" />
                </label>
                {pStamp && (
                  <button onClick={() => setPStamp(null)} className="text-[11px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2 py-1.5 rounded-lg">
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Bursar Signature */}
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex flex-col justify-between text-center">
              <div>
                <p className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1">Bursar Signature</p>
                <p className="text-[11px] text-slate-400 mb-4">Official Payment Receipts</p>
                <div className="w-full h-24 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center overflow-hidden mb-3">
                  {bSig ? (
                    <img src={bSig} alt="Bursar Signature" className="max-h-full max-w-full object-contain p-2" />
                  ) : (
                    <span className="text-xs text-slate-400 font-bold">No Signature</span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-center gap-2">
                <label className="cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black px-3 py-1.5 rounded-lg">
                  Upload
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setBSig)} className="hidden" />
                </label>
                {bSig && (
                  <button onClick={() => setBSig(null)} className="text-[11px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2 py-1.5 rounded-lg">
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Bursar Stamp */}
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex flex-col justify-between text-center">
              <div>
                <p className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 mb-1">Bursary Clearance Stamp</p>
                <p className="text-[11px] text-slate-400 mb-4">Payment Verification Stamp</p>
                <div className="w-full h-24 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center overflow-hidden mb-3">
                  {bStamp ? (
                    <img src={bStamp} alt="Bursar Stamp" className="max-h-full max-w-full object-contain p-2" />
                  ) : (
                    <span className="text-xs text-slate-400 font-bold">No Stamp</span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-center gap-2">
                <label className="cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black px-3 py-1.5 rounded-lg">
                  Upload
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setBStamp)} className="hidden" />
                </label>
                {bStamp && (
                  <button onClick={() => setBStamp(null)} className="text-[11px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2 py-1.5 rounded-lg">
                    Clear
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: OFFICIAL BANK COLLECTION ACCOUNTS */}
      {/* ========================================================================= */}
      {activeTab === 'bank_accounts' && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-sm space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-100 dark:border-slate-700 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center">
                <Building2 size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white m-0">Official School Collection Accounts</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 m-0">Direct manual transfer accounts displayed to parents and students</p>
              </div>
            </div>
          </div>

          {/* Add New Bank Account Form */}
          <div className="p-5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Plus size={16} className="text-indigo-600" /> Add New School Bank Account
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Bank Name</label>
                <input
                  type="text"
                  value={newBankName}
                  onChange={(e) => setNewBankName(e.target.value)}
                  placeholder="e.g. First Bank of Nigeria"
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Account Name</label>
                <input
                  type="text"
                  value={newAccName}
                  onChange={(e) => setNewAccName(e.target.value)}
                  placeholder="e.g. Bonus Dominus College"
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Account Number (10 Digits)</label>
                <input
                  type="text"
                  value={newAccNo}
                  onChange={(e) => setNewAccNo(e.target.value)}
                  placeholder="e.g. 2022829027"
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-mono font-bold text-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Collection Purpose</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newAccType}
                    onChange={(e) => setNewAccType(e.target.value)}
                    placeholder="Tuition & Prospectus"
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddBankAccount}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shrink-0 transition-all shadow-md"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* List of Configured Accounts */}
          <div className="space-y-3">
            {accountsList.map((acc, index) => (
              <div 
                key={index} 
                className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between flex-wrap gap-4 shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center font-black text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-slate-900 dark:text-white">{acc.bankName}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300">
                        {acc.type}
                      </span>
                      {acc.isDefault && (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                          Primary
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 m-0">{acc.accountName}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-mono text-base font-black text-slate-800 dark:text-white tracking-wider">{acc.accountNumber}</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(acc.accountNumber);
                      alert(`Copied ${acc.accountNumber} to clipboard!`);
                    }}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    Copy
                  </button>
                  {!acc.isDefault && (
                    <button
                      type="button"
                      onClick={() => handleSetDefaultAccount(index)}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      Make Default
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveBankAccount(index)}
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: WEBSITE CMS & MEDIA */}
      {/* ========================================================================= */}
      {activeTab === 'media' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Hero Carousel Section */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 dark:border-slate-700 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center">
                  <ImageIcon size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white m-0">Homepage Hero Carousel Slides</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 m-0">Upload up to 5 pictures that cycle on the public landing page hero</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">Interval:</span>
                <input
                  type="number"
                  min="2"
                  max="15"
                  value={slideDuration}
                  onChange={(e) => setSlideDuration(e.target.value)}
                  className="w-16 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-center text-xs font-black text-slate-800 dark:text-white"
                />
                <span className="text-xs font-bold text-slate-500">sec</span>
              </div>
            </div>

            <div className="flex gap-4 flex-wrap">
              {heroImages.map((img, idx) => (
                <div key={idx} className="relative w-44 space-y-2">
                  <div className="w-full h-28 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 relative group">
                    <img src={typeof img === 'string' ? img : img.url} alt="Hero" className="w-full h-full object-cover" />
                    <button 
                      onClick={() => removeHeroImage(idx)}
                      className="absolute top-2 right-2 bg-rose-600 text-white rounded-full p-1 shadow hover:bg-rose-700"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <input 
                    type="text" 
                    placeholder="Caption..." 
                    value={typeof img === 'string' ? '' : img.caption || ''}
                    onChange={(e) => handleHeroCaptionChange(idx, e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white"
                  />
                </div>
              ))}

              {heroImages.length < 5 && (
                <div className="w-44 h-28 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 flex flex-col items-center justify-center cursor-pointer bg-slate-50 dark:bg-slate-900/40 relative">
                  {heroImagesUploading ? (
                    <Loader2 size={24} className="animate-spin text-indigo-500" />
                  ) : (
                    <>
                      <input type="file" accept="image/*" onChange={handleHeroUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                      <Upload size={20} className="text-slate-400 mb-1" />
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Add Hero Slide</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Campus Life Gallery */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-700 pb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center">
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white m-0">Campus Life Gallery</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 m-0">Spotlight photos of sports, sciences, arts, and classrooms</p>
              </div>
            </div>

            <div className="flex gap-4 flex-wrap">
              {campusLifeImages.map((img, idx) => (
                <div key={idx} className="relative w-44 space-y-2">
                  <div className="w-full h-28 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 relative group">
                    <img src={typeof img === 'string' ? img : img.url} alt="Campus" className="w-full h-full object-cover" />
                    <button 
                      onClick={() => removeCampusLifeImage(idx)}
                      className="absolute top-2 right-2 bg-rose-600 text-white rounded-full p-1 shadow hover:bg-rose-700"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <input 
                    type="text" 
                    placeholder="Activity label..." 
                    value={typeof img === 'string' ? '' : img.caption || ''}
                    onChange={(e) => handleCampusLifeCaptionChange(idx, e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white"
                  />
                </div>
              ))}

              {campusLifeImages.length < 6 && (
                <div className="w-44 h-28 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 flex flex-col items-center justify-center cursor-pointer bg-slate-50 dark:bg-slate-900/40 relative">
                  {campusLifeUploading ? (
                    <Loader2 size={24} className="animate-spin text-indigo-500" />
                  ) : (
                    <>
                      <input type="file" accept="image/*" onChange={handleCampusLifeUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                      <Upload size={20} className="text-slate-400 mb-1" />
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Add Campus Photo</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Home Page Announcement Popup Banner */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border-2 border-amber-500/40 shadow-xl shadow-amber-950/20 space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-700 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md">
                  <AlertTriangle size={22} className="text-white" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white m-0">Public Announcement / Modal Ad Banner</h3>
                  <p className="text-xs text-slate-300 m-0 mt-0.5 font-medium">Show a dismissible floating promo banner to visitors on the landing page</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {homeAdEnabled ? (
                  <span className="text-xs font-black text-emerald-400 flex items-center gap-1">
                    <CheckCircle size={13} /> Active
                  </span>
                ) : (
                  <span className="text-xs font-black text-slate-400 flex items-center gap-1">
                    <Lock size={13} /> Inactive
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setHomeAdEnabled(!homeAdEnabled)}
                  title={homeAdEnabled ? 'Banner is Enabled' : 'Banner is Disabled'}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-all focus:outline-none p-1 ${
                    homeAdEnabled ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-md shadow-emerald-500/30' : 'bg-slate-800 border-2 border-slate-600'
                  }`}
                >
                  <span className={`inline-flex items-center justify-center h-6 w-6 transform rounded-full bg-white shadow-md transition-transform ${
                    homeAdEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}>
                    {homeAdEnabled ? (
                      <Check size={13} className="text-emerald-600 font-black stroke-[3]" />
                    ) : (
                      <Lock size={11} className="text-slate-500" />
                    )}
                  </span>
                </button>
              </div>
            </div>

            {homeAdEnabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-black text-white mb-1.5 flex items-center gap-1.5">
                    <Globe size={14} className="text-amber-400" /> Target Link URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={homeAdLink}
                    onChange={(e) => setHomeAdLink(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-slate-950 border-2 border-slate-700 focus:border-amber-400 text-white rounded-xl p-3 text-xs font-bold placeholder:text-slate-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-white mb-1.5 flex items-center gap-1.5">
                    <ImageIcon size={14} className="text-amber-400" /> Banner Graphic Image
                  </label>
                  <div className="flex items-center gap-3">
                    {homeAdImage ? (
                      <div className="relative w-36 h-20 rounded-xl overflow-hidden border-2 border-slate-700 shadow">
                        <img src={homeAdImage} alt="Ad" className="w-full h-full object-cover" />
                        <button onClick={() => setHomeAdImage(null)} className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-1 shadow hover:bg-rose-700">
                          <X size={12} className="text-white" />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 shadow-md">
                        <Upload size={15} className="text-white" /> Upload Banner
                        <input type="file" accept="image/*" onChange={handleAdUpload} className="hidden" />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 8: PROMOTION, CLASSES & CLUBS */}
      {/* ========================================================================= */}
      {activeTab === 'promotion' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-200">
          
          {/* Move Students Card */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border-l-4 border-l-amber-500 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-700 pb-4 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
                  <GraduationCap size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white m-0">Student Promotion & Class Movement</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 m-0">Auto-promote or shift students across classes for the new session</p>
                </div>
              </div>

              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200 space-y-2 mb-4">
                <p className="font-black flex items-center gap-1.5">
                  <AlertTriangle size={14} className="text-amber-600" /> Use after Third Term results are published
                </p>
                <ul className="list-disc pl-4 space-y-1 opacity-90">
                  <li>JSS1 → JSS2, JSS2 → JSS3, JSS3 → SS1 (Auto: avg ≥ {passMarkInput}%)</li>
                  <li>SS1 → SS2 Science or Art stream (Manual / Stream placement)</li>
                  <li>Move individual selected students or entire classes</li>
                </ul>
              </div>
            </div>

            <button
              onClick={() => { setShowMoveModal(true); setPromotionStep('idle'); setPromotionResult(null); }}
              type="button"
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
            >
              <Users size={16} /> Open Student Promotion & Movement Studio
            </button>
          </div>

          {/* School Clubs & Houses */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border-l-4 border-l-indigo-500 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-700 pb-4 mb-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center">
                  <Users size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white m-0">School Clubs & Houses</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 m-0">Manage extracurricular societies and sports houses</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Configure official school houses (e.g. Red, Blue, Green, Yellow) and academic/extracurricular clubs (e.g. JET Club, Press Club, Drama Club, ICT Society) available for student profile registration.
              </p>
            </div>

            <button
              onClick={() => setShowClubsModal(true)}
              type="button"
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black text-xs sm:text-sm shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
            >
              <Users size={16} /> Configure Clubs & Houses
            </button>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* MOVE STUDENTS MODAL */}
      {/* ========================================================================= */}
      {showMoveModal && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center">
                  <GraduationCap size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white m-0">Student Promotion & Movement</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 m-0">Active Session: {sessionInput || currentSession}</p>
                </div>
              </div>
              <button onClick={() => setShowMoveModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              {promotionStep === 'idle' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'auto', label: 'End of Year Auto', icon: Zap },
                      { id: 'manual', label: 'Entire Class Move', icon: Users },
                      { id: 'selective', label: 'Select Students', icon: CheckSquare },
                    ].map(m => {
                      const Icon = m.icon;
                      const isSel = promotionMode === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setPromotionMode(m.id);
                            if (m.id === 'selective') loadSelectiveStudents(selectiveFromClass);
                          }}
                          className={`p-3 rounded-xl border text-xs font-black flex items-center justify-center gap-2 transition-all ${
                            isSel ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <Icon size={14} /> {m.label}
                        </button>
                      );
                    })}
                  </div>

                  {promotionMode === 'auto' && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 space-y-2">
                      <p className="font-bold text-slate-900 dark:text-white">Auto Promotion Rule:</p>
                      <p>Students with 3rd term average ≥ {passMarkInput}% will be promoted to the immediate next class level.</p>
                    </div>
                  )}

                  {promotionMode === 'manual' && (
                    <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">From Class</label>
                        <select value={manualFromClass} onChange={(e) => setManualFromClass(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold">
                          {['JSS1','JSS2','JSS3','SS1','SS2 SCIENCE','SS2 ART','SS3 SCIENCE','SS3 ART'].map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">To Target Class</label>
                        <select value={manualToClass} onChange={(e) => setManualToClass(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold">
                          {['JSS1','JSS2','JSS3','SS1','SS2 SCIENCE','SS2 ART','SS3 SCIENCE','SS3 ART','Graduated'].map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                  )}

                  {promotionMode === 'selective' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">From Class</label>
                          <select 
                            value={selectiveFromClass} 
                            onChange={(e) => { setSelectiveFromClass(e.target.value); loadSelectiveStudents(e.target.value); }} 
                            className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
                          >
                            {['JSS 1','JSS 2','JSS 3','SS 1','SS 2 Science','SS 2 Art','SS 3 Science','SS 3 Art'].map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Move To Target Class</label>
                          <select 
                            value={selectiveToClass} 
                            onChange={(e) => setSelectiveToClass(e.target.value)} 
                            className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
                          >
                            {['JSS 1','JSS 2','JSS 3','SS 1','SS 2 Science','SS 2 Art','SS 3 Science','SS 3 Art','Graduated'].map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="max-h-56 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl p-2 space-y-1">
                        {loadingSelective ? (
                          <div className="p-8 text-center text-xs text-slate-400"><Loader2 className="animate-spin inline mr-2" /> Loading students...</div>
                        ) : selectiveStudents.length === 0 ? (
                          <div className="p-8 text-center text-xs text-slate-400">No students found in {selectiveFromClass}</div>
                        ) : (
                          selectiveStudents.map(s => (
                            <div 
                              key={s.id} 
                              onClick={() => toggleStudentSelection(s.id)}
                              className={`p-2.5 rounded-xl border flex items-center justify-between text-xs cursor-pointer ${
                                selectedStudentIds.has(s.id) ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 font-bold' : 'border-slate-100 dark:border-slate-700'
                              }`}
                            >
                              <span>{s.name} ({s.regNo})</span>
                              {selectedStudentIds.has(s.id) ? <CheckSquare size={14} className="text-indigo-600" /> : <Square size={14} className="text-slate-300" />}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-4">
                    <button onClick={() => setShowMoveModal(false)} className="px-4 py-2 rounded-xl border text-xs font-bold">Cancel</button>
                    <button onClick={handleRunPromotion} className="px-6 py-2 rounded-xl bg-amber-500 text-white text-xs font-black shadow-md">
                      Execute Class Movement
                    </button>
                  </div>
                </div>
              )}

              {promotionStep === 'loading' && (
                <div className="p-12 text-center space-y-3">
                  <Loader2 size={40} className="animate-spin text-amber-500 mx-auto" />
                  <p className="text-sm font-bold text-slate-800 dark:text-white">Processing Class Promotion & Movement...</p>
                </div>
              )}

              {promotionStep === 'ss1_placement' && (
                <div className="space-y-4">
                  <h4 className="text-sm font-black">SS1 Senior Stream Placement</h4>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {ss1Students.map(s => (
                      <div key={s.id} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl flex items-center justify-between text-xs">
                        <span className="font-bold">{s.name}</span>
                        <div className="flex gap-2">
                          {['SS2 ART', 'SS2 SCIENCE'].map(stream => (
                            <button
                              key={stream}
                              type="button"
                              onClick={() => setSs1Assignments(prev => ({ ...prev, [s.id]: stream }))}
                              className={`px-3 py-1 rounded-lg font-black text-[11px] ${
                                ss1Assignments[s.id] === stream ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700'
                              }`}
                            >
                              {stream === 'SS2 ART' ? 'Art' : 'Science'}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end gap-2">
                    <button onClick={handleSaveSS1Placement} disabled={ss1Saving} className="px-6 py-2 rounded-xl bg-indigo-600 text-white text-xs font-black">
                      {ss1Saving ? 'Saving...' : 'Save Stream Assignments'}
                    </button>
                  </div>
                </div>
              )}

              {promotionStep === 'done' && (
                <div className="p-8 text-center space-y-4">
                  <CheckCircle size={48} className="text-emerald-500 mx-auto" />
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">Class Movement Completed!</h3>
                  <p className="text-xs text-slate-500">Student records and active class placements have been updated in Firestore.</p>
                  <button onClick={() => setShowMoveModal(false)} className="px-6 py-2 bg-slate-900 text-white rounded-xl text-xs font-black">
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Clubs & Houses Modal */}
      <ManageClubsAndHousesModal
        isOpen={showClubsModal}
        onClose={() => setShowClubsModal(false)}
      />

    </div>
  );
};

export default BrandingSettings;
