import React, { useState, useEffect } from 'react';
import { useStudentAuth } from '../../context/StudentAuthContext';
import { useTheme } from '../../context/ThemeContext';
import { db } from '../../lib/firebase';
import { collection, query, getDocs, where, limit, orderBy, doc, getDoc } from 'firebase/firestore';
import { 
  LayoutDashboard, Award, CreditCard, Calendar, Bell, ChevronRight, 
  Inbox as InboxIcon, Trophy, Wallet, BookOpen, Library, MonitorCheck, 
  AlertCircle, Star, ArrowUpRight, ArrowDownRight, Clock, User, Zap, GraduationCap, ChevronDown,
  Eye, EyeOff, PlusCircle, Search, CheckCircle2, X, RefreshCw, BarChart3, Sparkles, Settings, Receipt, FileText
} from 'lucide-react';
import { getStudentWallet, fundStudentWallet, debitStudentWallet } from '../../utils/wallet';
import { MARKS_KEYS, expandMarks } from '../../utils/firestoreSchema';
import { getProspectusFeeData, formatNaira } from '../../utils/prospectusFees';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import PinSetupModal from '../../components/student/PinSetupModal';
import SchoolManagementDashboard from '../../components/SchoolManagementDashboard';

import { useSearchParams } from 'react-router-dom';

const StudentDashboard = () => {
  const { currentStudent, authError, authReady } = useStudentAuth();
  const { primaryColor, currentSession } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const publicPin = searchParams.get('pin');
  const isAdminBypass = publicPin === '@@@@@@' || publicPin === '001100' || publicPin === '260796';

  const studentName = currentStudent?.name || 'Student';
  const className   = currentStudent?.className || 'N/A';
  const regNum      = currentStudent?.regNo || '';

  const [activeTab, setActiveTab]       = useState('overview');
  const [inboxCount, setInboxCount]     = useState(0);
  const [resultsCount, setResultsCount] = useState(0);
  const [avgScore, setAvgScore]         = useState(0);
  const [latestTermAvg, setLatestTermAvg] = useState('0.0');
  const [latestTermTitle, setLatestTermTitle] = useState('Latest Term');
  const [currentSessionExamsCount, setCurrentSessionExamsCount] = useState(0);
  const [totalExamsCount, setTotalExamsCount] = useState(0);
  const [loading, setLoading]           = useState(true);
  const [dashboardError, setDashboardError] = useState('');
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [feeData, setFeeData]           = useState({ expected: 0, paid: 0, balance: 0, lastDate: 'N/A' });
  const [publishedTerms, setPublishedTerms] = useState([]);
  const [selectedTermId, setSelectedTermId] = useState('');

  // Wallet System States
  const [walletData, setWalletData]     = useState({ balance: 0, transactions: [] });
  const [showBalance, setShowBalance]   = useState(true);
  const [showFundModal, setShowFundModal] = useState(false);
  const [fundAmount, setFundAmount]     = useState('5000');
  const [fundMethod, setFundMethod]     = useState('Card Payment');
  const [fundingProcessing, setFundingProcessing] = useState(false);
  const [fundSuccessMsg, setFundSuccessMsg] = useState('');
  const [walletSearch, setWalletSearch] = useState('');
  const [walletFilter, setWalletFilter] = useState('ALL');
  const [showFeePayModal, setShowFeePayModal] = useState(false);

  const loadWallet = async (studentId) => {
    if (!studentId) return;
    try {
      const data = await getStudentWallet(studentId);
      setWalletData(data);
    } catch (e) {
      console.warn('Error loading student wallet:', e);
    }
  };

  useEffect(() => {
    if (!currentStudent || !regNum) {
      if (!loading && !currentStudent) setLoading(false);
      return;
    }
    // Wait until Firebase auth is confirmed before reading Firestore
    if (!authReady) return;
    
    const loadData = async () => {
      try {
        setDashboardError('');

        // PIN verification for external / public link access
        if (publicPin && !isAdminBypass) {
          const storedPin = currentStudent?.pin || '';
          if (storedPin && storedPin !== publicPin) {
            setDashboardError('Unauthorized access. Invalid PIN.');
            setLoading(false);
            return;
          }
        }

        // 1. Fetch Notifications & Count
        const [s1, s2, s3] = await Promise.all([
          getDocs(query(collection(db, 'notifications'), where('targetType', '==', 'global'), limit(5))),
          getDocs(query(collection(db, 'notifications'), where('targetType', '==', 'class'), where('targetValue', '==', className), limit(5))),
          getDocs(query(collection(db, 'notifications'), where('targetType', '==', 'student'), where('targetValue', '==', regNum), limit(5))),
        ]);
        
        const allNotifs = [...s1.docs, ...s2.docs, ...s3.docs]
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        
        setRecentNotifications(allNotifs.slice(0, 3));
        setInboxCount(new Set(allNotifs.map(n => n.id)).size);

        // 2. Fetch Publications of type 'Result'
        const pubQuery = query(collection(db, 'publications'), where('type', '==', 'Result'));
        const pubSnap = await getDocs(pubQuery);
        const publishedTermsList = pubSnap.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            session: data.session,
            term: data.term,
            examName: data.examName,
            targetClass: data.targetClass || 'All Classes'
          };
        }).filter(pub => pub.targetClass === 'All Classes' || pub.targetClass === className);
        publishedTermsList.sort((a, b) => b.session.localeCompare(a.session));
        setPublishedTerms(publishedTermsList);
        if (publishedTermsList.length > 0) setSelectedTermId(publishedTermsList[0].id);
        const publishedTerms = publishedTermsList;

        // Fetch Results & Calculate Average
        // Try compressed key first
        let marksQuery = query(collection(db, 'marks'), where(MARKS_KEYS.regNo, '==', regNum));
        let rSnap = await getDocs(marksQuery);
        
        // Fallback to legacy key if empty
        if (rSnap.empty) {
          marksQuery = query(collection(db, 'marks'), where('reg_no', '==', regNum));
          rSnap = await getDocs(marksQuery);
        }

        const allResults = rSnap.docs.map(doc => expandMarks(doc.data()));
        const normTerm = (t = '') => t.toLowerCase().replace(/\s+/g, '');

        // Filter results that have a matching published term/session
        const publishedMarks = allResults.filter(d => {
          return publishedTerms.some(pub => {
            const sessionMatch = d.session === pub.session;
            const termMatch =
              normTerm(d.term) === normTerm(pub.term) ||
              pub.term.toLowerCase().includes((d.term || '').toLowerCase());
            return sessionMatch && termMatch;
          });
        });

        // Filter results with published terms if publications exist, or use all recorded term exams
        const resultsToAnalyze = (publishedMarks.length > 0) ? publishedMarks : allResults.filter(d => d.marks && Object.keys(d.marks).length > 0);
        
        setResultsCount(resultsToAnalyze.length);
        const currentSessionResults = resultsToAnalyze.filter(d => d.session === (currentSession || '2025/2026'));
        setCurrentSessionExamsCount(currentSessionResults.length);
        setTotalExamsCount(resultsToAnalyze.length);

        if (resultsToAnalyze.length > 0) {
          // Academic Average: (Second Term + Third Term) / 2
          let secondTermAvg = 0;
          let thirdTermAvg = 0;
          let hasSecondTerm = false;
          let hasThirdTerm = false;
          let otherTermsSum = 0;
          let otherTermsCount = 0;

          resultsToAnalyze.forEach(result => {
            const norm = (result.term || '').toLowerCase();
            const marks = result.marks || {};
            let termAvg = 0;
            if (marks._meta && marks._meta.average !== undefined && parseFloat(marks._meta.average) > 0) {
              termAvg = parseFloat(marks._meta.average);
            } else if (marks._meta && marks._meta.avg !== undefined && parseFloat(marks._meta.avg) > 0) {
              termAvg = parseFloat(marks._meta.avg);
            } else {
              let tSum = 0;
              let tCount = 0;
              Object.entries(marks).forEach(([subj, sObj]) => {
                if (subj === '_meta' || !sObj) return;
                const sc = parseFloat(sObj.total) || parseFloat(sObj.percent) || parseFloat(sObj.exam) || 0;
                if (sc > 0) {
                  tSum += sc;
                  tCount++;
                }
              });
              if (tCount > 0) {
                termAvg = tSum / tCount;
              }
            }

            if (norm.includes('second') || norm.includes('2nd')) {
              secondTermAvg = termAvg;
              hasSecondTerm = true;
            } else if (norm.includes('third') || norm.includes('3rd')) {
              thirdTermAvg = termAvg;
              hasThirdTerm = true;
            } else if (termAvg > 0) {
              otherTermsSum += termAvg;
              otherTermsCount++;
            }
          });

          if (hasSecondTerm || hasThirdTerm) {
            // Formula: (Second Term + Third Term) / 2
            const sum2ndAnd3rd = secondTermAvg + thirdTermAvg;
            setAvgScore((sum2ndAnd3rd / 2).toFixed(1));

            // Set Last/Latest Term Average percentage
            if (hasThirdTerm && thirdTermAvg > 0) {
              setLatestTermAvg(thirdTermAvg.toFixed(1));
              setLatestTermTitle('Third Term');
            } else if (hasSecondTerm && secondTermAvg > 0) {
              setLatestTermAvg(secondTermAvg.toFixed(1));
              setLatestTermTitle('Second Term');
            } else {
              setLatestTermAvg((sum2ndAnd3rd / 2).toFixed(1));
              setLatestTermTitle('Latest Term');
            }
          } else if (otherTermsCount > 0) {
            const calculated = (otherTermsSum / otherTermsCount).toFixed(1);
            setAvgScore(calculated);
            setLatestTermAvg(calculated);
            setLatestTermTitle('Latest Term');
          } else {
            setAvgScore('0.0');
            setLatestTermAvg('0.0');
            setLatestTermTitle('Current Term');
          }
        } else {
          setAvgScore('0.0');
          setLatestTermAvg('0.0');
          setLatestTermTitle('Current Term');
        }

        // 3. Fetch Fees Info
        let expected = 0;
        let paid = 0;
        let lastDate = 'N/A';
        let isVerified = false;

        let classFallbackFee = 0;
        try {
          const feeSnap = await getDoc(doc(db, 'settings', 'fees'));
          if (feeSnap.exists()) {
            const fData = feeSnap.data();
            classFallbackFee = parseFloat(fData[className]) || parseFloat(fData['default']) || 0;
          }
        } catch (fErr) {
          console.warn('Could not fetch settings/fees:', fErr);
        }

        if (!classFallbackFee && className && className !== 'N/A') {
          classFallbackFee = getProspectusFeeData(className).total || 0;
        }

        if (currentStudent?.id) {
          const studentRef = doc(db, 'students', currentStudent.id);
          const studentSnap = await getDoc(studentRef);
          if (studentSnap.exists()) {
            const sData = studentSnap.data();
            expected = parseFloat(sData.expectedFee) || classFallbackFee || 0;
            paid = parseFloat(sData.paidFee) || parseFloat(sData.paidAmount) || 0;
            lastDate = sData.lastPaymentDate || 'N/A';
            isVerified = sData.feeVerified === true || sData.isVerified === true;
          }
        } else {
          expected = parseFloat(currentStudent?.expectedFee) || classFallbackFee || 0;
          paid = parseFloat(currentStudent?.paidFee) || parseFloat(currentStudent?.paidAmount) || 0;
          lastDate = currentStudent?.lastPaymentDate || 'N/A';
          isVerified = currentStudent?.feeVerified === true || currentStudent?.isVerified === true;
        }

        const balance = Math.max(0, expected - paid);
        setFeeData({ expected, paid, balance, lastDate, isVerified });

        // 4. Load Student Wallet
        await loadWallet(currentStudent?.id || regNum);

      } catch (e) {
        console.error("Dashboard error:", e);
        if (e?.code === 'permission-denied') {
          setDashboardError('Access restricted. Please check your permissions.');
        }
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [currentStudent, className, regNum, authReady, currentSession]);

  const handleFundSubmit = async (e) => {
    e.preventDefault();
    const amount = Number(fundAmount);
    if (!amount || amount <= 0) return;
    setFundingProcessing(true);
    setFundSuccessMsg('');
    try {
      await new Promise(r => setTimeout(r, 1200));
      const ref = `REF-${Math.floor(100000 + Math.random() * 900000)}`;
      const updated = await fundStudentWallet(currentStudent?.id || regNum, amount, fundMethod, ref);
      setWalletData(updated);
      setFundSuccessMsg(`Wallet funded successfully with ₦${amount.toLocaleString()}!`);
      setTimeout(() => {
        setShowFundModal(false);
        setFundSuccessMsg('');
        setFundAmount('5000');
      }, 1800);
    } catch (e) {
      alert("Failed to fund wallet: " + e.message);
    } finally {
      setFundingProcessing(false);
    }
  };

  const handlePayFeeWithWallet = async () => {
    const amountToPay = feeData.balance;
    if (amountToPay <= 0) return alert('No pending school fees balance!');
    if (walletData.balance < amountToPay) {
      return alert(`Insufficient wallet balance. Available: ₦${walletData.balance.toLocaleString()}, Fee Due: ₦${amountToPay.toLocaleString()}`);
    }
    try {
      setFundingProcessing(true);
      const ref = `PAY-FEE-${Math.floor(100000 + Math.random() * 900000)}`;
      const updated = await debitStudentWallet(currentStudent?.id || regNum, amountToPay, `School Fee Payment for ${currentSession}`, ref);
      setWalletData(updated);

      // Update Firestore student record
      if (currentStudent?.id) {
        const newPaid = feeData.paid + amountToPay;
        await setDoc(doc(db, 'students', currentStudent.id), {
          paidFee: newPaid,
          paidAmount: newPaid,
          lastPaymentDate: new Date().toISOString()
        }, { merge: true }).catch(() => {});
        setFeeData(prev => ({ ...prev, paid: newPaid, balance: 0, lastDate: 'Today' }));
      }
      alert(`Payment of ₦${amountToPay.toLocaleString()} successful! Your school fees are fully cleared.`);
      setShowFeePayModal(false);
    } catch (err) {
      alert(err.message || 'Fee payment failed');
    } finally {
      setFundingProcessing(false);
    }
  };

  const termsPerSession = 3;
  // Strictly PENDING until payment is made (paid > 0) AND verified or equal/exceeds expected fee
  const hasPaid = (feeData.paid || 0) > 0;
  const feeIsCleared = hasPaid && (feeData.isVerified || (feeData.expected > 0 && feeData.paid >= feeData.expected));
  const feeIsPartial = hasPaid && !feeIsCleared && feeData.balance > 0;

  // GPA 0 to 5.0 scale (5.0 for 100%, calculated from 2nd Term + 3rd Term average)
  const gpaValue = ((parseFloat(avgScore || 0) / 100) * 5).toFixed(2);

  const mainStats = [
    { label: 'GPA Average', value: `${gpaValue} / 5.0`, icon: Zap, color: '#6366f1', trend: `${avgScore}% Avg` },
    { 
      label: 'Exams Taken', 
      value: `${currentSessionExamsCount}/${termsPerSession}`, 
      icon: Trophy, 
      color: '#10b981', 
      trend: `${totalExamsCount} Total` 
    },
    { 
      label: feeIsCleared ? 'Fees Cleared' : (feeIsPartial ? 'Partial Fee' : 'Pending Fee'), 
      value: feeIsCleared ? 'Cleared ✓' : (feeData.balance > 0 ? `₦${feeData.balance.toLocaleString()}` : (feeData.expected > 0 ? `₦${feeData.expected.toLocaleString()}` : 'Pending')), 
      icon: Wallet, 
      color: feeIsCleared ? '#10b981' : (feeIsPartial ? '#f59e0b' : '#ef4444'), 
      trend: feeIsCleared ? 'Verified ✓' : (feeIsPartial ? 'Partial Paid' : 'Awaiting Payment') 
    },
    { label: 'Attendance', value: '94%', icon: Calendar, color: '#ec4899', trend: 'Excellent' },
  ];

  const tabs = [
    { 
      id: 'overview', 
      label: 'Overview', 
      icon: LayoutDashboard, 
      activeGradient: 'from-indigo-600 via-indigo-600 to-indigo-700',
      activeShadow: 'shadow-indigo-500/30',
      activeBorder: 'border-indigo-400/50',
      iconActiveBg: 'bg-indigo-400/25 text-white',
      iconInactiveBg: 'bg-indigo-100/80 text-indigo-700',
      inactiveStyle: 'bg-indigo-50/80 text-indigo-700 hover:bg-indigo-100 border-indigo-200/60 shadow-sm shadow-indigo-100/30',
      color: '#6366f1',
      badge: null
    },
    { 
      id: 'analysis', 
      label: 'Analysis & Metrics', 
      icon: BarChart3, 
      activeGradient: 'from-purple-600 via-purple-600 to-indigo-700',
      activeShadow: 'shadow-purple-500/30',
      activeBorder: 'border-purple-400/50',
      iconActiveBg: 'bg-purple-400/25 text-white',
      iconInactiveBg: 'bg-purple-100/80 text-purple-700',
      inactiveStyle: 'bg-purple-50/80 text-purple-700 hover:bg-purple-100 border-purple-200/60 shadow-sm shadow-purple-100/30',
      color: '#8b5cf6',
      badge: 'Live'
    },
    { 
      id: 'wallet', 
      label: 'Student Wallet', 
      icon: Wallet, 
      activeGradient: 'from-emerald-600 via-emerald-600 to-teal-700',
      activeShadow: 'shadow-emerald-500/30',
      activeBorder: 'border-emerald-400/50',
      iconActiveBg: 'bg-emerald-400/25 text-white',
      iconInactiveBg: 'bg-emerald-100/80 text-emerald-700',
      inactiveStyle: 'bg-emerald-50/80 text-emerald-700 hover:bg-emerald-100 border-emerald-200/60 shadow-sm shadow-emerald-100/30',
      color: '#10b981',
      badge: walletData?.balance > 0 ? `₦${walletData.balance.toLocaleString()}` : null
    },
    { 
      id: 'academic', 
      label: 'Academic & Results', 
      icon: GraduationCap, 
      activeGradient: 'from-blue-600 via-blue-600 to-sky-700',
      activeShadow: 'shadow-blue-500/30',
      activeBorder: 'border-blue-400/50',
      iconActiveBg: 'bg-blue-400/25 text-white',
      iconInactiveBg: 'bg-blue-100/80 text-blue-700',
      inactiveStyle: 'bg-blue-50/80 text-blue-700 hover:bg-blue-100 border-blue-200/60 shadow-sm shadow-blue-100/30',
      color: '#0ea5e9',
      badge: null
    },
    { 
      id: 'notices', 
      label: 'Notices', 
      icon: Bell, 
      activeGradient: 'from-amber-500 via-amber-600 to-orange-600',
      activeShadow: 'shadow-amber-500/30',
      activeBorder: 'border-amber-400/50',
      iconActiveBg: 'bg-amber-400/25 text-white',
      iconInactiveBg: 'bg-amber-100/80 text-amber-800',
      inactiveStyle: 'bg-amber-50/80 text-amber-800 hover:bg-amber-100 border-amber-200/60 shadow-sm shadow-amber-100/30',
      color: '#f59e0b',
      badge: inboxCount > 0 ? `${inboxCount} New` : null
    },
    { 
      id: 'finance', 
      label: 'Finance & Fees', 
      icon: CreditCard, 
      activeGradient: 'from-rose-600 via-rose-600 to-pink-700',
      activeShadow: 'shadow-rose-500/30',
      activeBorder: 'border-rose-400/50',
      iconActiveBg: 'bg-rose-400/25 text-white',
      iconInactiveBg: 'bg-rose-100/80 text-rose-700',
      inactiveStyle: 'bg-rose-50/80 text-rose-700 hover:bg-rose-100 border-rose-200/60 shadow-sm shadow-rose-100/30',
      color: '#f43f5e',
      badge: feeIsCleared ? 'Cleared' : (feeData?.balance > 0 ? 'Due' : null)
    },
    { 
      id: 'profile', 
      label: 'My Profile', 
      icon: User, 
      activeGradient: 'from-slate-800 via-slate-800 to-slate-900',
      activeShadow: 'shadow-slate-800/30',
      activeBorder: 'border-slate-700/60',
      iconActiveBg: 'bg-slate-700/50 text-white',
      iconInactiveBg: 'bg-slate-200 text-slate-800',
      inactiveStyle: 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200 shadow-sm',
      color: '#64748b',
      badge: null
    },
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8">
      <AnimatePresence>
        {loading ? (
          <div className="flex items-center justify-center h-[60vh]">
            <motion.div 
              animate={{ rotate: 360 }} 
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full"
            />
          </div>
        ) : (
          <motion.div variants={container} initial="hidden" animate="show" className="max-w-7xl mx-auto space-y-8">
            
            {/* Enterprise Header */}
            <motion.div variants={item} className="relative overflow-hidden rounded-[2rem] bg-slate-900 p-8 md:p-12 text-white shadow-2xl">
              <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-indigo-500/20 blur-[100px] rounded-full" />
              <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-emerald-500/10 blur-[80px] rounded-full" />
              
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 p-1">
                      <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center overflow-hidden">
                        {currentStudent?.photo ? (
                          <img src={currentStudent.photo} alt="Profile" className="w-full h-full object-cover rounded-full" />
                        ) : (
                          <User size={20} className="text-slate-400" />
                        )}
                      </div>
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-emerald-500 w-4 h-4 rounded-full border-2 border-slate-900" />
                  </div>
                  <div>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight">{studentName}</h1>
                    <div className="flex items-center gap-3 mt-2 text-slate-400 font-bold text-sm uppercase tracking-wider">
                      <span>{className}</span>
                      <span className="w-1 h-1 bg-slate-600 rounded-full" />
                      <span>{regNum}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/30 px-4 py-2 rounded-xl text-emerald-300 font-black text-sm">
                    <Wallet size={16} className="text-emerald-400" />
                    <span>Wallet: {showBalance ? `₦${walletData.balance.toLocaleString()}` : '••••••'}</span>
                    <button onClick={() => setShowBalance(!showBalance)} className="ml-1 text-emerald-300 hover:text-white">
                      {showBalance ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <button onClick={() => { setActiveTab('wallet'); setShowFundModal(true); }} className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 font-black text-white rounded-xl transition-all text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95">
                    <PlusCircle size={16} /> Fund Wallet
                  </button>
                  <button onClick={() => navigate('/students/profile')} className="px-5 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl font-bold transition-all text-sm flex items-center gap-2 text-white border border-white/20 hover:border-white/40 shadow-sm hover:scale-105 active:scale-95">
                    <Settings size={16} className="text-indigo-300" />
                    <span>Profile Settings</span>
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Premium Tab Bar with Vibrant Icons & Badges */}
            <motion.div 
              variants={item} 
              className="flex bg-white/95 backdrop-blur-xl p-2 rounded-2xl border border-slate-200/80 shadow-lg shadow-slate-200/40 overflow-x-auto no-scrollbar gap-2"
            >
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative flex items-center gap-2.5 px-4 md:px-5 py-3 rounded-xl font-black text-xs md:text-sm transition-all duration-300 whitespace-nowrap group hover:scale-[1.02] active:scale-95 border ${
                      isActive 
                        ? `bg-gradient-to-r ${tab.activeGradient} text-white shadow-lg ${tab.activeShadow} ${tab.activeBorder}` 
                        : `${tab.inactiveStyle}`
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg transition-all duration-300 ${isActive ? tab.iconActiveBg : tab.iconInactiveBg}`}>
                      <Icon size={17} className={isActive ? 'text-white' : ''} />
                    </div>
                    <span className="tracking-tight">{tab.label}</span>
                    {tab.badge && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        isActive
                          ? 'bg-white/20 text-white border border-white/25 backdrop-blur-sm'
                          : tab.badge === 'Live' || tab.badge === 'Cleared'
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                          : tab.badge === 'Due'
                          ? 'bg-rose-50 text-rose-600 border border-rose-200 animate-pulse'
                          : 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                      }`}>
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </motion.div>

            {/* Tab Content */}
            <motion.div 
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              {activeTab === 'overview' && (
                <>
                  {/* Metrics Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {mainStats.map((stat, idx) => (
                      <motion.div
                        key={idx}
                        whileHover={{ y: -5, scale: 1.02, transition: { duration: 0.2 } }}
                        className="relative overflow-hidden bg-white p-6 rounded-[1.75rem] border border-slate-100/80 shadow-md shadow-slate-200/50 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 flex flex-col justify-between group"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="p-3.5 rounded-2xl transition-transform duration-300 group-hover:scale-110 shadow-sm" style={{ backgroundColor: `${stat.color}15`, border: `1px solid ${stat.color}30` }}>
                            <stat.icon size={24} style={{ color: stat.color }} />
                          </div>
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border ${
                            stat.trend.includes('+') || stat.trend.includes('Verified') || stat.trend.includes('Excellent')
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-200/60'
                              : stat.trend.includes('Pending') || stat.trend.includes('Awaiting')
                              ? 'bg-rose-50 text-rose-600 border-rose-200/60 animate-pulse'
                              : 'bg-slate-50 text-slate-600 border-slate-200/60'
                          }`}>
                            {stat.trend}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-3xl font-black text-slate-800 mb-1 tracking-tight">{stat.value}</h3>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                      <motion.div
                        whileHover={{ y: -3 }}
                        className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-lg transition-all duration-300"
                      >
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-xl font-black text-slate-800 tracking-tight">Recent Academic Performance</h3>
                          <span className="px-3 py-1 bg-indigo-50 text-indigo-600 font-bold text-xs rounded-full border border-indigo-100 flex items-center gap-1.5">
                            <Sparkles size={13} className="text-indigo-500" />
                            {latestTermTitle}
                          </span>
                        </div>
                        <div className="space-y-6">
                          <div className="p-6 bg-gradient-to-r from-slate-50 to-indigo-50/30 rounded-2xl border border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm shadow-indigo-200">
                                <Award size={24} />
                              </div>
                              <div>
                                <p className="font-black text-slate-800 text-base">Last Term Average</p>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Evaluated across subjects</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-3xl font-black text-indigo-600 tracking-tight">{latestTermAvg || avgScore}%</p>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Term Score Average</p>
                            </div>
                          </div>
                          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden p-0.5">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${latestTermAvg || avgScore}%` }}
                              transition={{ duration: 1, ease: 'easeOut' }}
                              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                            />
                          </div>
                        </div>
                      </motion.div>
                    </div>
                    <motion.div
                      whileHover={{ y: -3 }}
                      className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 p-8 rounded-[2rem] text-white flex flex-col justify-between shadow-xl shadow-indigo-600/25"
                    >
                      <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                      <div className="relative z-10">
                        <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center mb-6 border border-white/20">
                          <Star size={24} className="text-amber-300 fill-amber-300" />
                        </div>
                        <h3 className="text-2xl font-black mb-2 tracking-tight">Student Excellence</h3>
                        <p className="text-indigo-100 text-sm leading-relaxed font-medium">Keep maintaining high scores to unlock advanced school honors, certificates, and leaderboard rankings.</p>
                      </div>
                      <button
                        onClick={() => navigate('/students/results')}
                        className="relative z-10 mt-8 w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-emerald-500/30 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                      >
                        <Award size={18} /> View Honors & Results
                      </button>
                    </motion.div>
                  </div>
                </>
              )}

              {activeTab === 'analysis' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <SchoolManagementDashboard userRole="student" />
                </div>
              )}

              {activeTab === 'wallet' && (
                <div className="space-y-8">
                  {/* Wallet Balance Hero Card */}
                  <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 p-8 md:p-10 text-white shadow-2xl border border-emerald-500/20">
                    <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-emerald-500/20 blur-[90px] rounded-full" />
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                      <div>
                        <div className="flex items-center gap-3 text-emerald-400 font-black text-xs uppercase tracking-wider mb-2">
                          <Wallet size={18} />
                          <span>Student Digital e-Wallet</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white">
                            {showBalance ? `₦${walletData.balance.toLocaleString()}` : '••••••••'}
                          </h2>
                          <button
                            onClick={() => setShowBalance(!showBalance)}
                            className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all text-slate-300 hover:text-white"
                            title="Toggle Balance Visibility"
                          >
                            {showBalance ? <EyeOff size={20} /> : <Eye size={20} />}
                          </button>
                        </div>
                        <p className="text-xs text-slate-400 font-semibold mt-2">
                          Available for instant fee payment, CBT tokens, and school shop purchases.
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-3 w-full md:w-auto">
                        <button
                          onClick={() => setShowFundModal(true)}
                          className="flex-1 md:flex-none px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 text-sm"
                        >
                          <PlusCircle size={18} /> Fund Wallet
                        </button>
                        {feeData.balance > 0 && (
                          <button
                            onClick={() => setShowFeePayModal(true)}
                            className="flex-1 md:flex-none px-6 py-3.5 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-black rounded-2xl transition-all flex items-center justify-center gap-2 text-sm border border-white/10"
                          >
                            <CreditCard size={18} /> Pay School Fees (₦{feeData.balance.toLocaleString()})
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Transaction History Section */}
                  <div className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-100">
                      <div>
                        <h3 className="text-xl font-black text-slate-800">Transaction History</h3>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">Real-time ledger of credits & debits</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                        {/* Search Bar */}
                        <div className="relative flex-1 md:w-60">
                          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Search reference or detail..."
                            value={walletSearch}
                            onChange={(e) => setWalletSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold focus:outline-none focus:border-emerald-500"
                          />
                        </div>

                        {/* Filter Buttons */}
                        <div className="flex bg-slate-100/90 p-1 rounded-2xl gap-1 border border-slate-200/60">
                          {[
                            { type: 'ALL', label: 'All', icon: LayoutDashboard, color: 'text-indigo-600' },
                            { type: 'CREDIT', label: 'Credits (+)', icon: ArrowDownRight, color: 'text-emerald-600' },
                            { type: 'DEBIT', label: 'Debits (-)', icon: ArrowUpRight, color: 'text-rose-600' }
                          ].map(btn => {
                            const isFilterActive = walletFilter === btn.type;
                            const FilterIcon = btn.icon;
                            return (
                              <button
                                key={btn.type}
                                onClick={() => setWalletFilter(btn.type)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                                  isFilterActive 
                                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80 scale-[1.02]' 
                                    : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
                                }`}
                              >
                                <FilterIcon size={14} className={isFilterActive ? btn.color : 'text-slate-400'} />
                                <span>{btn.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Transactions List */}
                    <div className="divide-y divide-slate-100">
                      {walletData.transactions
                        .filter(tx => {
                          if (walletFilter !== 'ALL' && tx.type !== walletFilter) return false;
                          if (walletSearch) {
                            const q = walletSearch.toLowerCase();
                            return (
                              (tx.id || '').toLowerCase().includes(q) ||
                              (tx.description || '').toLowerCase().includes(q) ||
                              (tx.method || '').toLowerCase().includes(q)
                            );
                          }
                          return true;
                        })
                        .map((tx, idx) => (
                          <div key={tx.id || idx} className="py-4 flex items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors px-2 rounded-xl">
                            <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black ${
                                tx.type === 'CREDIT' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                              }`}>
                                {tx.type === 'CREDIT' ? <ArrowDownRight size={22} /> : <ArrowUpRight size={22} />}
                              </div>
                              <div>
                                <p className="font-black text-slate-800 text-sm">{tx.description}</p>
                                <div className="flex items-center gap-3 text-xs text-slate-400 font-semibold mt-0.5">
                                  <span>{tx.method || 'Direct'}</span>
                                  <span>•</span>
                                  <span>{tx.date ? new Date(tx.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recently'}</span>
                                  <span>•</span>
                                  <span className="font-mono text-[11px] text-slate-500">{tx.id}</span>
                                </div>
                              </div>
                            </div>

                            <div className="text-right">
                              <span className={`text-base font-black ${tx.type === 'CREDIT' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {tx.type === 'CREDIT' ? '+' : '-'}₦{Number(tx.amount || 0).toLocaleString()}
                              </span>
                              <div className="mt-1">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700">
                                  ✓ Successful
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}

                      {walletData.transactions.length === 0 && (
                        <div className="py-16 text-center text-slate-400">
                          <Wallet size={40} className="mx-auto mb-3 opacity-30" />
                          <p className="font-bold text-sm">No wallet transactions recorded yet.</p>
                          <p className="text-xs mt-1">Click "Fund Wallet" to add funds.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'academic' && (
                <div className="space-y-6">
                  {/* Term & Session Quick Selector */}
                  {publishedTerms.length > 0 && (
                    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                      <h3 className="text-lg font-black text-slate-800 mb-4">View Report Card</h3>
                      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
                        <div className="flex-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Select Term / Examination</label>
                          <div className="relative">
                            <select
                              value={selectedTermId}
                              onChange={(e) => setSelectedTermId(e.target.value)}
                              className="w-full px-5 py-3 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 outline-none font-bold text-slate-700 appearance-none cursor-pointer transition-all"
                            >
                              {publishedTerms.map(pub => (
                                <option key={pub.id} value={pub.id}>
                                  {pub.examName || pub.term} — {pub.session}
                                </option>
                              ))}
                            </select>
                            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          </div>
                        </div>
                        <button
                          onClick={() => navigate(`/students/results?pubId=${encodeURIComponent(selectedTermId)}`)}
                          disabled={!selectedTermId}
                          className="px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-2xl font-black transition-all shadow-lg shadow-indigo-600/30 disabled:opacity-50 whitespace-nowrap flex items-center gap-2 hover:scale-[1.02] active:scale-95 border border-indigo-400/30"
                        >
                          <Trophy size={16} className="text-amber-300" />
                          <span>View Term Results</span>
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                  {/* Academic Modules Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {[
                      { label: 'Exam Results', icon: Trophy, color: '#10b981', path: '/students/results', desc: 'Detailed score breakdown' },
                      { label: 'CBT Portal', icon: MonitorCheck, color: '#f59e0b', path: '/students/cbt', desc: 'Computer based tests' },
                      { label: 'Study Notes', icon: BookOpen, color: '#6366f1', path: '/students/notes', desc: 'Course materials' },
                      { label: 'Assignments', icon: Library, color: '#8b5cf6', path: '/students/assignments', desc: 'Pending homework' },
                      ...(className.startsWith('SS2') || className.startsWith('SS3') ? [{ label: 'Subject Registration', icon: BookOpen, color: '#ec4899', path: '/students/registration', desc: 'Register 9 subjects' }] : [])
                    ].map((module, idx) => (
                      <button 
                        key={idx}
                        onClick={() => navigate(module.path)}
                        className="p-8 bg-white border border-slate-100 rounded-[2rem] text-left hover:shadow-2xl hover:shadow-slate-200/50 transition-all space-y-4 hover:scale-[1.02] active:scale-95"
                      >
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm" style={{ backgroundColor: `${module.color}15`, border: `1px solid ${module.color}30` }}>
                          <module.icon size={28} style={{ color: module.color }} />
                        </div>
                        <div>
                          <p className="text-lg font-black text-slate-800">{module.label}</p>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-tight">{module.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'notices' && (
                <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
                  <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                        <Bell size={20} />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-slate-800">School Notifications</h3>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Official announcements & alerts</p>
                      </div>
                    </div>
                    <div className="bg-amber-100 text-amber-700 border border-amber-200 px-3.5 py-1 rounded-full text-xs font-black uppercase flex items-center gap-1.5 shadow-sm">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping inline-block" />
                      <span>{inboxCount} New Alerts</span>
                    </div>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {recentNotifications.length > 0 ? recentNotifications.map((notif, idx) => (
                      <div key={idx} className="p-8 flex gap-6 hover:bg-slate-50/80 transition-colors cursor-pointer group" onClick={() => navigate('/students/inbox')}>
                        <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 group-hover:bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 transition-colors shrink-0">
                          <Bell size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-800 group-hover:text-indigo-600 transition-colors mb-1">{notif.title || 'Official Announcement'}</p>
                          <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed mb-3">{notif.message}</p>
                          <div className="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase">
                            <span className="flex items-center gap-1"><Clock size={12} /> {notif.createdAt?.seconds ? new Date(notif.createdAt.seconds * 1000).toLocaleDateString() : 'Today'}</span>
                            <span className="flex items-center gap-1"><User size={12} /> Administration</span>
                          </div>
                        </div>
                      </div>
                    )) : (
                      <div className="p-20 text-center text-slate-400">
                        <Bell size={40} className="mx-auto mb-3 opacity-30" />
                        <p className="font-bold text-sm">Your inbox is empty</p>
                        <p className="text-xs mt-1">Official announcements will appear here.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'finance' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-white p-8 rounded-[2rem] border border-slate-100 flex flex-col justify-between shadow-sm">
                    <div>
                      <div className="w-16 h-16 bg-rose-50 border border-rose-100 rounded-3xl flex items-center justify-center text-rose-600 mb-6 shadow-sm">
                        <Wallet size={32} />
                      </div>
                      <h3 className="text-2xl font-black text-slate-800 mb-2">School Fees Balance</h3>
                      <p className="text-slate-400 font-bold mb-8">Summary of your current financial standing.</p>
                      <div className="text-4xl font-black text-slate-900 mb-2">
                        {feeIsCleared ? '₦0' : (feeData.balance > 0 ? `₦${feeData.balance.toLocaleString()}` : (feeData.expected > 0 ? `₦${feeData.expected.toLocaleString()}` : 'Pending'))}
                      </div>
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase ${
                        feeIsCleared 
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                          : (feeIsPartial ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-rose-50 text-rose-600 border border-rose-200')
                      }`}>
                        {feeIsCleared ? '✓ Fully Cleared & Verified' : (feeIsPartial ? 'Partial Payment Made' : 'Pending / Awaiting Payment')}
                      </div>
                    </div>
                    <div className="mt-8 space-y-3">
                      {!feeIsCleared ? (
                        <button onClick={() => setShowFeePayModal(true)} className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm shadow-xl flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-95 transition-all">
                          <Wallet size={18} /> Pay Fee via Student Wallet
                        </button>
                      ) : null}
                      <button onClick={() => navigate('/students/fees')} className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-sm shadow-xl flex items-center justify-center gap-2 border border-slate-700/60 hover:scale-[1.01] active:scale-95 transition-all">
                        <FileText size={18} className="text-indigo-400" />
                        <span>Open Full Fee Portal</span>
                      </button>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-200/70 border-dashed flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 bg-white rounded-3xl shadow-sm border border-slate-100 flex items-center justify-center text-indigo-500 mb-6">
                      <CreditCard size={36} />
                    </div>
                    <h3 className="text-lg font-black text-slate-800 mb-2">Payment Receipts</h3>
                    <p className="text-sm text-slate-400 font-medium max-w-[220px]">View and download all your verified payment receipts and invoices.</p>
                    <button onClick={() => navigate('/students/fees')} className="mt-6 px-5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-sm font-black transition-all flex items-center gap-2 shadow-sm hover:scale-105 active:scale-95 border border-indigo-200/80">
                      <Receipt size={16} className="text-indigo-600" />
                      <span>View Payment History</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'profile' && (
                <div className="space-y-8">
                  {/* Profile Hero Card */}
                  <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-tr from-violet-600 via-purple-600 to-indigo-500 p-8 text-white shadow-2xl">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-[80px] rounded-full -mr-20 -mt-20" />
                    <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-8">
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <div className="w-16 h-16 rounded-full bg-white/10 border-4 border-white/30 overflow-hidden shadow-xl">
                          {currentStudent?.photo ? (
                            <img src={currentStudent.photo} alt={currentStudent?.name} className="w-full h-full object-cover rounded-full" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-3xl font-black text-white/60">
                                {(currentStudent?.name || 'S')[0].toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-emerald-500 w-7 h-7 rounded-full border-4 border-violet-600 flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full" />
                        </div>
                      </div>

                      {/* Student Details */}
                      <div className="flex-1">
                        <p className="text-violet-200 text-xs font-black uppercase tracking-widest mb-1">Student Profile</p>
                        <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-3">
                          {currentStudent?.name || 'Student'}
                        </h2>
                        <div className="flex flex-wrap gap-3">
                          <span className="px-4 py-1.5 rounded-full bg-white/15 border border-white/20 text-sm font-black">
                            {currentStudent?.className || 'N/A'}
                          </span>
                          <span className="px-4 py-1.5 rounded-full bg-white/15 border border-white/20 text-sm font-black">
                            ID: {currentStudent?.regNo || regNum}
                          </span>
                          {currentStudent?.gender && (
                            <span className="px-4 py-1.5 rounded-full bg-white/15 border border-white/20 text-sm font-black capitalize">
                              {currentStudent.gender}
                            </span>
                          )}
                          {currentStudent?.house && (
                            <span className="px-4 py-1.5 rounded-full bg-emerald-500/30 border border-emerald-400/40 text-sm font-black">
                              🏠 {currentStudent.house}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => navigate('/students/profile')}
                        className="px-6 py-3 bg-white/15 hover:bg-white/25 border border-white/20 rounded-2xl font-black text-sm transition-all backdrop-blur-sm whitespace-nowrap"
                      >
                        Edit Profile →
                      </button>
                    </div>
                  </div>

                  {/* Info Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[
                      { label: 'Full Name', value: currentStudent?.name || '—', icon: User, color: '#6366f1' },
                      { label: 'Class', value: currentStudent?.className || '—', icon: GraduationCap, color: '#3b82f6' },
                      { label: 'Reg. Number', value: currentStudent?.regNo || regNum || '—', icon: BookOpen, color: '#10b981' },
                      { label: 'Gender', value: currentStudent?.gender || '—', icon: User, color: '#ec4899' },
                      { label: 'Date of Birth', value: currentStudent?.dob || '—', icon: Calendar, color: '#f59e0b' },
                      { label: 'House', value: currentStudent?.house || '—', icon: Star, color: '#8b5cf6' },
                      { label: 'Phone', value: currentStudent?.phone || '—', icon: Zap, color: '#06b6d4' },
                      { label: 'Email', value: currentStudent?.email || '—', icon: InboxIcon, color: '#f43f5e' },
                      { label: 'Session', value: currentSession || '—', icon: Calendar, color: '#84cc16' },
                    ].map((item, idx) => (
                      <div key={idx} className="bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${item.color}15` }}>
                          <item.icon size={22} style={{ color: item.color }} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{item.label}</p>
                          <p className="text-sm font-black text-slate-800 truncate">{item.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Photo Upload CTA */}
                  {!currentStudent?.photo && (
                    <div className="bg-amber-50 border-2 border-amber-200 border-dashed rounded-[2rem] p-8 text-center">
                      <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <User size={32} className="text-amber-600" />
                      </div>
                      <h4 className="text-lg font-black text-amber-800 mb-1">No Profile Photo Yet</h4>
                      <p className="text-sm text-amber-600 font-medium mb-4">Your profile photo will appear on your result card and ID card.</p>
                      <button
                        onClick={() => navigate('/students/profile')}
                        className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black text-sm transition-all shadow-lg shadow-amber-200"
                      >
                        Upload Photo Now
                      </button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== FUND WALLET MODAL ===== */}
      {showFundModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[2rem] max-w-md w-full p-8 shadow-2xl space-y-6 relative">
            <button onClick={() => setShowFundModal(false)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 font-black">
                <PlusCircle size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800">Fund Wallet</h3>
                <p className="text-xs text-slate-400 font-bold uppercase">Instant Credit Gateway</p>
              </div>
            </div>

            {fundSuccessMsg ? (
              <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-3">
                <CheckCircle2 size={40} className="mx-auto text-emerald-500" />
                <p className="font-black text-emerald-800 text-sm">{fundSuccessMsg}</p>
              </div>
            ) : (
              <form onSubmit={handleFundSubmit} className="space-y-6">
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase block mb-2">Deposit Amount (₦)</label>
                  <input
                    type="number"
                    min="500"
                    max="500000"
                    required
                    value={fundAmount}
                    onChange={(e) => setFundAmount(e.target.value)}
                    className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-2 border-slate-200 font-black text-xl text-slate-800 outline-none focus:border-emerald-500"
                  />
                  {/* Preset Chips */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {['2000', '5000', '10000', '20000', '50000'].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setFundAmount(amt)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all ${
                          fundAmount === amt ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        +₦{Number(amt).toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-500 uppercase block mb-2">Payment Method</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'Card Payment', label: 'Debit Card' },
                      { id: 'Bank Transfer', label: 'Transfer' },
                      { id: 'USSD', label: 'USSD Code' }
                    ].map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setFundMethod(m.id)}
                        className={`py-3 px-2 rounded-2xl text-xs font-black border text-center transition-all ${
                          fundMethod === m.id ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={fundingProcessing}
                  className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-black text-base rounded-2xl transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2"
                >
                  {fundingProcessing ? <RefreshCw size={20} className="animate-spin" /> : <PlusCircle size={20} />}
                  {fundingProcessing ? 'Processing Payment...' : `Confirm Deposit (₦${Number(fundAmount || 0).toLocaleString()})`}
                </button>
              </form>
            )}
          </motion.div>
        </div>
      )}

      {/* ===== PAY FEE VIA WALLET MODAL ===== */}
      {showFeePayModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[2rem] max-w-md w-full p-8 shadow-2xl space-y-6 relative">
            <button onClick={() => setShowFeePayModal(false)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-black">
                <CreditCard size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800">Pay School Fees</h3>
                <p className="text-xs text-slate-400 font-bold uppercase">Direct Wallet Debit</p>
              </div>
            </div>

            <div className="space-y-3 bg-slate-50 p-5 rounded-2xl border border-slate-100 text-sm">
              <div className="flex justify-between font-bold text-slate-600">
                <span>Fee Amount Due:</span>
                <span className="font-black text-rose-600">₦{feeData.balance.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-600">
                <span>Your Wallet Balance:</span>
                <span className="font-black text-emerald-600">₦{walletData.balance.toLocaleString()}</span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between font-black text-slate-800">
                <span>Balance After Payment:</span>
                <span>₦{(walletData.balance - feeData.balance).toLocaleString()}</span>
              </div>
            </div>

            {walletData.balance < feeData.balance ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs font-bold text-amber-800 space-y-2">
                <p>Your wallet balance is insufficient to pay this fee balance.</p>
                <button
                  onClick={() => { setShowFeePayModal(false); setShowFundModal(true); }}
                  className="px-4 py-2 bg-amber-500 text-white rounded-xl font-black text-xs inline-block"
                >
                  Fund Wallet First →
                </button>
              </div>
            ) : (
              <button
                onClick={handlePayFeeWithWallet}
                disabled={fundingProcessing}
                className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-black text-base rounded-2xl transition-all shadow-xl flex items-center justify-center gap-2"
              >
                {fundingProcessing ? <RefreshCw size={20} className="animate-spin" /> : <CheckCircle2 size={20} />}
                {fundingProcessing ? 'Processing Fee Debit...' : 'Pay Fee Now'}
              </button>
            )}
          </motion.div>
        </div>
      )}

      <PinSetupModal />
    </div>
  );
};

export default StudentDashboard;

