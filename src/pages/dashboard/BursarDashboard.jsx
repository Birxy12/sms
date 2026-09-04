import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../lib/firebase';
import { ensureFirebaseAuth } from '../../lib/ensureAuth';
import { collection, query, getDocs, orderBy, where, doc, updateDoc, writeBatch, addDoc, serverTimestamp, setDoc, getDoc, limit } from 'firebase/firestore';
import { 
  Wallet, DollarSign, TrendingUp, TrendingDown, Users, 
  Search, Download, Plus, ArrowUpRight, 
  CheckCircle, AlertCircle, Loader2, Briefcase, Settings, Printer, MessageSquare, AlertTriangle, FileText, UserPlus, Banknote,
  FileSpreadsheet, User, ShieldCheck, Key, Lock, Clock, History, CheckCheck, RefreshCw, X, ShieldAlert,
  Sparkles, ListChecks, CheckCircle2, ChevronDown, ChevronUp, Layers, Check, HelpCircle, UserCheck, ShoppingBag, BarChart3
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { fetchGlobalClasses, DEFAULT_CLASSES, normalizeClassName, getUniqueClasses } from '../../utils/classUtils';
import { getClassCode, formatRegNumberSuffix } from '../../utils/regNoGenerator';
import { createWhatsAppChatUrl } from '../../utils/whatsapp';
import { 
  getProspectusFeeData, 
  getDefaultClassFeeStructure,
  getClassFees,
  getExpectedFeeForStudent,
  formatNaira, 
  PROSPECTUS_FEES_SCHEDULE, 
  PROSPECTUS_REQUIREMENTS, 
  getClassSection 
} from '../../utils/prospectusFees';
import SchoolManagementDashboard from '../../components/SchoolManagementDashboard';
import Papa from 'papaparse';
import ExpensesView from './ExpensesView';
import ClassManagement from './ClassManagement';
import StoreView from './StoreView';
import DailyIncomeView from './DailyIncomeView';
import { useFinance } from '../../context/FinanceContext';

const ADMIN_WHATSAPP_PHONE = '2349066202949';
const SESSIONS = ['2025/2026', '2026/2027', '2024/2025'];
const TERMS = ['First Term', 'Second Term', 'Third Term'];

const OldFeesAnalytics = ({ currentCollected, currentExpected }) => {
  const [oldFees, setOldFees] = useState(() => {
    const saved = localStorage.getItem('historical_fees');
    return saved ? JSON.parse(saved) : [];
  });
  const [newSession, setNewSession] = useState('');
  const [newExpected, setNewExpected] = useState('');
  const [newCollected, setNewCollected] = useState('');

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newSession || !newExpected || !newCollected) return;
    const updated = [
      ...oldFees,
      { session: newSession, expected: parseFloat(newExpected), collected: parseFloat(newCollected) }
    ];
    setOldFees(updated);
    localStorage.setItem('historical_fees', JSON.stringify(updated));
    setNewSession(''); setNewExpected(''); setNewCollected('');
  };

  const handleClear = () => {
    setOldFees([]);
    localStorage.removeItem('historical_fees');
  };

  const data = [
    ...oldFees,
    { session: 'Current', expected: currentExpected, collected: currentCollected }
  ];

  const maxVal = Math.max(...data.map(d => Math.max(d.expected, d.collected)), 1);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-3">
        <h4 className="text-sm font-black text-slate-700 uppercase tracking-widest">Historical Performance Chart</h4>
        {oldFees.length > 0 && (
          <button onClick={handleClear} className="text-xs px-3 py-1.5 rounded-lg bg-orange-500 text-blue-900 hover:bg-orange-600 font-bold transition-colors">Clear History</button>
        )}
      </div>
      <div className="flex flex-col md:flex-row gap-8 items-end justify-between p-6 bg-slate-50 rounded-2xl overflow-x-auto">
        {data.map((d, idx) => {
          const expHeight = `${(d.expected / maxVal) * 100}%`;
          const colHeight = `${(d.collected / maxVal) * 100}%`;
          return (
            <div key={idx} className="flex-1 flex flex-col items-center min-w-[100px] h-60 justify-end">
              <div className="h-48 w-full flex items-end justify-center gap-2 relative">
                {/* Expected Bar */}
                <div style={{ height: expHeight }} className="w-8 bg-slate-300 rounded-t-lg group relative cursor-pointer hover:bg-slate-400 transition-colors">
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900 text-white text-[10px] p-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-md">
                    Expected: ₦{d.expected.toLocaleString()}
                  </div>
                </div>
                {/* Collected Bar */}
                <div style={{ height: colHeight }} className="w-8 bg-emerald-500 rounded-t-lg group relative cursor-pointer hover:bg-emerald-600 transition-colors">
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900 text-white text-[10px] p-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-md">
                    Collected: ₦{d.collected.toLocaleString()}
                  </div>
                </div>
              </div>
              <span className="text-xs font-black text-slate-700 mt-3 block text-center">{d.session}</span>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Session</label>
          <input type="text" value={newSession} onChange={e => setNewSession(e.target.value)} placeholder="e.g. 2023/2024" required
            className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 outline-none text-sm font-bold focus:border-slate-400" />
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Expected (₦)</label>
          <input type="number" value={newExpected} onChange={e => setNewExpected(e.target.value)} placeholder="Expected" required
            className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 outline-none text-sm font-bold focus:border-slate-400" />
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Collected (₦)</label>
          <input type="number" value={newCollected} onChange={e => setNewCollected(e.target.value)} placeholder="Collected" required
            className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 outline-none text-sm font-bold focus:border-slate-400" />
        </div>
        <button type="submit" className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl text-sm transition-all hover:bg-slate-800">
          Add Comparison
        </button>
      </form>
    </div>
  );
};
const AnimatedCounter = ({ end }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (end === 0) {
      setCount(0);
      return;
    }
    let start = 0;
    const duration = 1500;
    const stepTime = Math.max(10, Math.floor(duration / end));
    const timer = setInterval(() => {
      start += 1;
      setCount(start);
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      }
    }, stepTime);
    return () => clearInterval(timer);
  }, [end]);

  return <>{count}</>;
};

const BursarDashboard = () => {
  const { currentAdmin } = useAdminAuth();
  const { primaryColor, schoolName } = useTheme();
  const location = window.location;
  const [activeView, setActiveView] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') || localStorage.getItem('bursar_active_tab') || 'overview';
  });

  // Navigate and persist tab to URL + localStorage so refresh restores last position
  const navigateTo = (tabId) => {
    setActiveView(tabId);
    localStorage.setItem('bursar_active_tab', tabId);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tabId);
    window.history.replaceState({}, '', url.toString());
  };
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [preSelectedStudent, setPreSelectedStudent] = useState(null);
  
  // Data state
  const [allStudents, setAllStudents] = useState([]);
  const [paymentMessages, setPaymentMessages] = useState([]);
  const [feeSettings, setFeeSettings] = useState({});
  const { financeData: stats } = useFinance();

  const [classes, setClasses] = useState(DEFAULT_CLASSES);

  // Security 2FA PIN & Payment Reset Audit State
  const [showPinModal, setShowPinModal] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [generatedPin, setGeneratedPin] = useState('');
  const [pinSending, setPinSending] = useState(false);
  const [pinError, setPinError] = useState('');
  const [resetsHistory, setResetsHistory] = useState([]);
  const [lastResetInfo, setLastResetInfo] = useState(null);
  const [resetWhatsAppUrl, setResetWhatsAppUrl] = useState('');

  const fetchResetHistory = async () => {
    try {
      await ensureFirebaseAuth();
      let history = [];

      // 1. Prioritize reading from settings/bursar_resets_history (guaranteed allowed under Firestore security rules)
      try {
        const auditSnap = await getDoc(doc(db, 'settings', 'bursar_resets_history'));
        if (auditSnap.exists() && Array.isArray(auditSnap.data().history) && auditSnap.data().history.length > 0) {
          history = auditSnap.data().history.map((item, idx) => ({ id: item.id || `audit-${idx}`, ...item }));
        }
      } catch (docErr) {
        console.warn("Could not load from settings/bursar_resets_history:", docErr.message);
      }

      // 2. Fallback to settings/bursar_last_reset
      if (history.length === 0) {
        try {
          const docSnap = await getDoc(doc(db, 'settings', 'bursar_last_reset'));
          if (docSnap.exists()) {
            history = [{ id: 'last_reset', ...docSnap.data() }];
          }
        } catch (docErr) {
          console.warn("Could not load bursar_last_reset doc:", docErr.message);
        }
      }

      // 3. Fallback to payment_resets collection
      if (history.length === 0) {
        try {
          const q = query(collection(db, 'payment_resets'), orderBy('createdAt', 'desc'), limit(25));
          const snap = await getDocs(q);
          if (!snap.empty) {
            history = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          }
        } catch (collErr) {
          // Suppress permission error
        }
      }

      // 4. Fallback to localStorage
      if (history.length === 0) {
        const saved = localStorage.getItem('payment_resets_history');
        if (saved) {
          try {
            history = JSON.parse(saved);
          } catch (e) {
            history = [];
          }
        }
      }

      const safeHistory = Array.isArray(history) ? history : [];
      setResetsHistory(safeHistory);
      if (safeHistory.length > 0) {
        setLastResetInfo(safeHistory[0]);
      }
    } catch (e) {
      console.log("Could not load payment reset history:", e);
      setResetsHistory([]);
    }
  };

  const fetchFinancialData = async () => {
    // Legacy function kept to avoid breaking references inside handleVerifyPinAndResetFees etc.
    // Data is now fetched in real-time via onSnapshot in useEffect.
  };

  useEffect(() => {
    let unsubscribeStudents = null;
    let unsubscribeFees = null;
    let unsubscribeMessages = null;

    const setupListeners = async () => {
      try {
        await ensureFirebaseAuth();
        
        // Sync Classes
        try {
          const dynamicClasses = await fetchGlobalClasses();
          setClasses(dynamicClasses);
        } catch (cErr) {
          console.warn("Class sync error:", cErr);
        }

        // Setup Fee Settings Listener
        import('firebase/firestore').then(({ onSnapshot }) => {
          unsubscribeFees = onSnapshot(doc(db, 'settings', 'fees'), (feeSnap) => {
            let loadedFees = {};
            if (feeSnap.exists()) {
              loadedFees = feeSnap.data() || {};
              setFeeSettings(loadedFees);
            }

            // Setup Students Listener AFTER getting fees to accurately calculate expectations
            if (!unsubscribeStudents) {
              unsubscribeStudents = onSnapshot(collection(db, 'students'), (snap) => {
                const students = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                setAllStudents(students);
                setLoading(false);
              }, (err) => {
                console.error(err);
                setLoading(false);
              });
            }
          });

          // Setup Messages Listener
          unsubscribeMessages = onSnapshot(query(collection(db, 'payment_messages'), orderBy('createdAt', 'desc')), (msgSnap) => {
            setPaymentMessages(msgSnap.docs.map(d => ({ id: d.id, ...d.data() })));
          });
        });

      } catch (error) {
        console.error(error);
        setStatus({ 
          type: 'error', 
          message: 'Failed to setup financial listeners.' 
        });
        setLoading(false);
      }
    };

    setupListeners();
    fetchResetHistory();

    return () => {
      if (unsubscribeStudents) unsubscribeStudents();
      if (unsubscribeFees) unsubscribeFees();
      if (unsubscribeMessages) unsubscribeMessages();
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab')) {
      navigateTo(params.get('tab'));
    }
  }, [window.location.search]);

  // 1. INITIATE PAYMENT RESET: Send 4-digit PIN to Admin Inbox & Admin WhatsApp (+234 9066202949)
  const handleRequestResetPin = async () => {
    setPinSending(true);
    setPinError('');
    try {
      await ensureFirebaseAuth();
      const pin = Math.floor(1000 + Math.random() * 9000).toString();
      setGeneratedPin(pin);
      setEnteredPin('');

      const bursarName = currentAdmin?.name || currentAdmin?.email || 'Bursar';
      const nowStr = new Date().toLocaleDateString('en-NG', { 
        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
      });

      // Construct WhatsApp Direct Message tagged with BDS ADMIN
      const waMsg = `🔐 *BDS ADMIN - 2FA SECURITY RESET PIN*\n\n🏫 *Bonus Dominus School Portal*\n👤 *Requester:* ${bursarName}\n⏰ *Time:* ${nowStr}\n📋 *Action:* Reset / Clear All Student Fee Balances\n\n🔑 *YOUR 4-DIGIT 2FA RESET PIN:*\n👉 *${pin}*\n\n⚠️ *Security Notice:* Share this PIN with the Bursar only if you authorize resetting current fee records.`;
      const waLink = createWhatsAppChatUrl(ADMIN_WHATSAPP_PHONE, waMsg);
      setResetWhatsAppUrl(waLink);

      // Automatically dispatch / open WhatsApp window without requiring click
      try {
        window.open(waLink, '_blank', 'noopener,noreferrer');
      } catch (openErr) {
        console.warn("Auto-open WhatsApp popup was blocked:", openErr);
      }

      // Dispatch urgent 2FA PIN message to Admin Inbox in Firestore
      try {
        await addDoc(collection(db, 'notifications'), {
          title: '🔐 URGENT: 4-Digit Security PIN for Bursar Payment Reset (BDS ADMIN)',
          message: `The Bursar (${bursarName}) has requested authorization to wipe and reset student fee/payment records.\n\nAUTHORIZATION PIN: ${pin}\n\nGenerated: ${nowStr}.\nAdmin WhatsApp: +234 9066202949\n\nShare this 4-digit PIN with the Bursar only if you authorize this reset action.`,
          targetType: 'admin',
          targetValue: 'admin',
          type: 'bursar_payment_reset_otp',
          pin: pin,
          bursarName: bursarName,
          senderTag: 'BDS ADMIN',
          createdAt: serverTimestamp(),
          isRead: false,
          priority: 'urgent'
        });
      } catch (notifErr) {
        console.warn("Could not save to notifications collection:", notifErr);
      }

      // Save to settings/bursar_reset_auth for server-like validation
      try {
        await setDoc(doc(db, 'settings', 'bursar_reset_auth'), {
          pin: pin,
          requestedBy: bursarName,
          requestedAt: Date.now(),
          expiresAt: Date.now() + 15 * 60 * 1000
        }, { merge: true });
      } catch (authErr) {
        console.warn("Could not write bursar_reset_auth:", authErr);
      }

      setShowPinModal(true);
      setStatus({ 
        type: 'info', 
        message: 'Security PIN generated. Auto-dispatched to Admin WhatsApp (+234 9066202949) and Admin Inbox.' 
      });
    } catch (err) {
      console.error("Error generating reset PIN:", err);
      setStatus({ type: 'error', message: 'Failed to generate security PIN.' });
    } finally {
      setPinSending(false);
    }
  };

  // 2. VERIFY PIN & EXECUTE RESET: Clears fees and logs date in analysis report
  const handleVerifyPinAndResetFees = async (e) => {
    if (e) e.preventDefault();
    if (!enteredPin || enteredPin.trim().length !== 4) {
      setPinError('Please enter the 4-digit PIN sent to the Admin Inbox.');
      return;
    }

    setPinSending(true);
    setPinError('');

    try {
      let isValid = (enteredPin.trim() === generatedPin);
      
      if (!isValid) {
        const authSnap = await getDoc(doc(db, 'settings', 'bursar_reset_auth'));
        if (authSnap.exists()) {
          const authData = authSnap.data();
          if (authData.pin === enteredPin.trim() && Date.now() < (authData.expiresAt || Infinity)) {
            isValid = true;
          }
        }
      }

      if (!isValid) {
        setPinError('Invalid 4-digit PIN. Please check the School Administrator\'s Inbox in the webapp.');
        setPinSending(false);
        return;
      }

      setShowPinModal(false);
      setLoading(true);
      setStatus({ type: 'info', message: 'PIN Verified. Wiping all fee records and logging audit date...' });

      const { ensureFirebaseAuth } = await import('../../lib/ensureAuth');
      await ensureFirebaseAuth();
      let batch = writeBatch(db);
      let count = 0;
      
      for (const student of allStudents) {
        const ref = doc(db, 'students', student.id);
        batch.update(ref, { 
          paidFee: 0, 
          paidAmount: 0, 
          expectedFee: 0, 
          lastPaymentDate: 'N/A',
          lastPaymentTerm: 'N/A',
          lastPaymentSession: 'N/A',
          txnId: '',
          serialNo: '',
          paymentStatus: 'Pending',
          updatedAt: new Date().toISOString()
        });
        count++;
        if (count % 300 === 0) {
          await batch.commit();
          batch = writeBatch(db);
        }
      }
      
      if (count % 300 !== 0) {
        await batch.commit();
      }

      // Record Reset Date & Audit Log in Firestore
      const nowFormatted = new Date().toLocaleDateString('en-NG', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
      });

      const resetRecord = {
        resetDate: new Date().toISOString(),
        formattedDate: nowFormatted,
        bursarName: currentAdmin?.name || currentAdmin?.email || 'Bursar',
        bursarEmail: currentAdmin?.email || '',
        studentsCount: count,
        wipedExpected: stats.totalExpected,
        wipedCollected: stats.totalCollected,
        authorizedByPin: true,
        authorizedPinCode: enteredPin,
      };

      // 1. Save to settings/bursar_last_reset & settings/bursar_resets_history (guaranteed allowed under rules)
      try {
        await setDoc(doc(db, 'settings', 'bursar_last_reset'), { ...resetRecord, createdAt: serverTimestamp() }, { merge: true });
        const auditSnap = await getDoc(doc(db, 'settings', 'bursar_resets_history'));
        const existingAudits = (auditSnap.exists() && Array.isArray(auditSnap.data().history)) ? auditSnap.data().history : [];
        const cleanItem = { id: `reset-${Date.now()}`, ...resetRecord, timestamp: Date.now() };
        await setDoc(doc(db, 'settings', 'bursar_resets_history'), {
          history: [cleanItem, ...existingAudits].slice(0, 50)
        }, { merge: true });
      } catch (auditErr) {
        console.warn("Could not save to settings audit doc:", auditErr);
      }

      // 2. Save to payment_resets collection
      try {
        await addDoc(collection(db, 'payment_resets'), { ...resetRecord, createdAt: serverTimestamp() });
      } catch (collErr) {
        console.warn("payment_resets collection write ignored:", collErr.message);
      }

      // 3. Save to localStorage
      try {
        const currentSaved = localStorage.getItem('payment_resets_history');
        const prevList = currentSaved ? JSON.parse(currentSaved) : [];
        const updatedList = [{ id: `reset-${Date.now()}`, ...resetRecord, timestamp: Date.now() }, ...(Array.isArray(prevList) ? prevList : [])];
        localStorage.setItem('payment_resets_history', JSON.stringify(updatedList));
      } catch (lsErr) {
        console.warn("Could not save reset history to localStorage:", lsErr);
      }

      await fetchFinancialData();
      await fetchResetHistory();

      setStatus({ 
        type: 'success', 
        message: `Payment Reset Authorized & Logged on ${nowFormatted}. ${count} student accounts cleared.` 
      });
    } catch (error) {
      console.error(error);
      setStatus({ type: 'error', message: 'Failed to reset fees.' });
    } finally {
      setLoading(false);
      setPinSending(false);
    }
  };

  const statCards = [
      { label: 'Total Expected', value: stats.totalExpected, icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50' },
      { label: 'Total Collected', value: stats.totalCollected, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
      { label: 'Total Expenses', value: stats.totalExpenses || 0, icon: Banknote, color: 'text-rose-600', bg: 'bg-rose-50' },
      { label: 'Net Balance', value: stats.netBalance || 0, icon: Wallet, color: 'text-teal-600', bg: 'bg-teal-50' },
      { label: 'Total Debt', value: stats.totalOutstanding, icon: TrendingDown, color: 'text-orange-600', bg: 'bg-orange-50' },
      { label: 'Total Students', value: stats.totalStudents, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    ];

  const sidebarTabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp, color: 'indigo' },
    { id: 'expenses', label: 'Expenses', icon: Wallet, color: 'rose' },
    { id: 'feesetting', label: 'Fee Setting', icon: Settings, color: 'blue' },
    { id: 'cashpay', label: 'Cash Payment', icon: Banknote, color: 'green' },
    { id: 'bulkpay', label: 'Bulk Upload', icon: Download, color: 'blue' },
    { id: 'receipts', label: 'Print Receipt', icon: Printer, color: 'emerald' },
    { id: 'register', label: 'Register Student', icon: UserPlus, color: 'violet' },
    { id: 'messages', label: 'Message Hub', icon: MessageSquare, color: 'purple' },
    { id: 'store', label: 'Store (Trading)', icon: ShoppingBag, color: 'emerald' },
    { id: 'dailyincome', label: 'Daily Income', icon: BarChart3, color: 'indigo' },
    { id: 'debtors', label: 'Debtors', icon: AlertTriangle, color: 'rose' },
    { id: 'newintakes', label: 'New Intakes', icon: UserCheck, color: 'blue' },
    { id: 'classmanage', label: 'Manage Class', icon: Layers, color: 'blue' },
    { id: 'analysis', label: 'Financial Analysis', icon: Briefcase, color: 'indigo' },
    { id: 'staffpay', label: 'Staff Payment', icon: Users, color: 'violet' },
  ];

  // --- Sub-Components for Tabs ---

  const FeeSettingView = () => {
    const [selectedClass, setSelectedClass] = useState(classes[0] || 'JSS1');
    const [schoolFee, setSchoolFee] = useState('');
    const [prospectiveTotal, setProspectiveTotal] = useState('');
    const [feeSession, setFeeSession] = useState('2025/2026');
    const [feeTerm, setFeeTerm] = useState('First Term');
    const [syncMode, setSyncMode] = useState('smart'); // 'smart', 'returning_all', 'intake_all'
    const [saving, setSaving] = useState(false);
    const [savingSettingsOnly, setSavingSettingsOnly] = useState(false);

    // Auto load selected class defaults/custom values
    useEffect(() => {
      if (!selectedClass) return;
      const config = getClassFees(selectedClass, feeSettings);
      setSchoolFee(config.schoolFee || '');
      setProspectiveTotal(config.prospectiveTotal || '');
    }, [selectedClass, feeSettings]);

    const targetStudents = allStudents.filter(s => 
      (s.className || s.class_name || s.CLASS) === selectedClass
    );
    const returningCount = targetStudents.filter(s => !s.isNewIntake && s.studentType !== 'new_intake').length;
    const intakeCount = targetStudents.filter(s => s.isNewIntake === true || s.studentType === 'new_intake').length;
    const sectionInfo = getProspectusFeeData(selectedClass);

    // Save Fee Settings to Firestore
    const handleSaveFeeSettingsOnly = async (e) => {
      if (e) e.preventDefault();
      if (!selectedClass || !schoolFee || !prospectiveTotal) {
        alert('Please specify both Returning School Fee and New Intake Prospective Total.');
        return;
      }

      setSavingSettingsOnly(true);
      try {
        await ensureFirebaseAuth();
        const updatedFees = {
          ...feeSettings,
          [selectedClass]: {
            schoolFee: parseFloat(schoolFee) || 0,
            prospectiveTotal: parseFloat(prospectiveTotal) || 0,
            updatedAt: new Date().toISOString(),
            updatedBy: currentAdmin?.name || currentAdmin?.email || 'Bursar'
          }
        };

        await setDoc(doc(db, 'settings', 'fees'), updatedFees, { merge: true });
        setFeeSettings(updatedFees);
        setStatus({
          type: 'success',
          message: `Fee settings saved for ${selectedClass}: Returning ₦${Number(schoolFee).toLocaleString()} | New Intake ₦${Number(prospectiveTotal).toLocaleString()}`
        });
      } catch (err) {
        console.error(err);
        setStatus({ type: 'error', message: 'Failed to save fee settings.' });
      } finally {
        setSavingSettingsOnly(false);
      }
    };

    // Save & Apply Fee to Enrolled Students in Class
    const handleApplyFeeToStudents = async (e) => {
      e.preventDefault();
      if (!selectedClass || !schoolFee || !prospectiveTotal) {
        alert('Please specify both Returning School Fee and New Intake Prospective Total.');
        return;
      }

      const confirmMsg = syncMode === 'smart'
        ? `Apply fees to ${targetStudents.length} students in ${selectedClass}?\n\n• Returning Students (${returningCount}): ₦${Number(schoolFee).toLocaleString()}\n• New Intakes (${intakeCount}): ₦${Number(prospectiveTotal).toLocaleString()}\n• Term: ${feeTerm} (${feeSession})`
        : syncMode === 'returning_all'
        ? `Set Returning Fee (₦${Number(schoolFee).toLocaleString()}) for ALL ${targetStudents.length} students in ${selectedClass}?`
        : `Set New Intake Fee (₦${Number(prospectiveTotal).toLocaleString()}) for ALL ${targetStudents.length} students in ${selectedClass}?`;

      if (!window.confirm(confirmMsg)) return;

      setSaving(true);
      try {
        await ensureFirebaseAuth();

        // 1. Save to settings/fees first so it's permanent
        const updatedFees = {
          ...feeSettings,
          [selectedClass]: {
            schoolFee: parseFloat(schoolFee) || 0,
            prospectiveTotal: parseFloat(prospectiveTotal) || 0,
            updatedAt: new Date().toISOString(),
            updatedBy: currentAdmin?.name || currentAdmin?.email || 'Bursar'
          }
        };
        await setDoc(doc(db, 'settings', 'fees'), updatedFees, { merge: true });
        setFeeSettings(updatedFees);

        // 2. Batch update enrolled students
        let batch = writeBatch(db);
        let count = 0;

        for (const s of targetStudents) {
          const isIntake = s.isNewIntake === true || s.studentType === 'new_intake';
          let appliedAmount = parseFloat(schoolFee);
          if (syncMode === 'smart') {
            appliedAmount = isIntake ? parseFloat(prospectiveTotal) : parseFloat(schoolFee);
          } else if (syncMode === 'intake_all') {
            appliedAmount = parseFloat(prospectiveTotal);
          } else {
            appliedAmount = parseFloat(schoolFee);
          }

          const ref = doc(db, 'students', s.id);
          batch.update(ref, { 
            expectedFee: appliedAmount,
            lastPaymentTerm: feeTerm,
            lastPaymentSession: feeSession,
            updatedAt: new Date().toISOString()
          });
          count++;

          if (count % 300 === 0) {
            await batch.commit();
            batch = writeBatch(db);
          }
        }

        if (count % 300 !== 0 && count > 0) {
          await batch.commit();
        }

        await fetchFinancialData();
        setStatus({ 
          type: 'success', 
          message: `Fee settings saved & applied to ${targetStudents.length} students in ${selectedClass} successfully.` 
        });
      } catch (err) {
        console.error(err);
        setStatus({ type: 'error', message: 'Failed to apply fee to students.' });
      } finally {
        setSaving(false);
      }
    };

    return (
      <div className="space-y-8 mt-6 max-w-5xl mx-auto">
        {/* Main Fee Settings Form Card */}
        <div className="card-white p-6 sm:p-8 border border-slate-200 shadow-sm rounded-3xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-slate-100 pb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner">
                <Settings size={26} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">Class Fee & Prospective Structure</h3>
                <p className="text-xs sm:text-sm text-slate-500">
                  Configure Returning Student School Fees and New Intake Total Packages dynamically.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-slate-100 px-3.5 py-1.5 rounded-full text-xs font-bold text-slate-600 self-start sm:self-auto">
              <Sparkles size={14} className="text-indigo-600" />
              <span>{sectionInfo.sectionTitle}</span>
            </div>
          </div>

          <form onSubmit={handleApplyFeeToStudents} className="space-y-6">
            {/* Class & Session Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">
                  1. Select Target Class
                </label>
                <select 
                  value={selectedClass} 
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 outline-none font-bold text-slate-800 transition-all cursor-pointer text-sm"
                  required
                >
                  {classes.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">
                  Academic Session
                </label>
                <select 
                  value={feeSession} 
                  onChange={(e) => setFeeSession(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 outline-none font-bold text-slate-800 transition-all cursor-pointer text-sm"
                >
                  {SESSIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">
                  Academic Term
                </label>
                <select 
                  value={feeTerm} 
                  onChange={(e) => setFeeTerm(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 outline-none font-bold text-slate-800 transition-all cursor-pointer text-sm"
                >
                  {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {/* Returning Fee vs Prospective Total Amounts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              {/* Existing / Returning Student Fee */}
              <div className="p-5 rounded-2xl border-2 border-indigo-100 bg-indigo-50/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center">🎓</span>
                    <label className="text-xs font-black text-indigo-950 uppercase tracking-wider">
                      Returning Student School Fee
                    </label>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                    Tuition Only
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Regular termly school fee for already existing students in <strong>{selectedClass}</strong>.
                </p>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-lg text-slate-400">₦</span>
                  <input 
                    type="number" 
                    value={schoolFee} 
                    onChange={(e) => setSchoolFee(e.target.value)}
                    placeholder="e.g. 32000"
                    className="w-full pl-9 pr-4 py-3 rounded-xl bg-white border-2 border-indigo-200 focus:border-indigo-600 outline-none font-black text-slate-900 text-lg transition-all"
                    required
                  />
                </div>
              </div>

              {/* New Intake Prospective Package Fee */}
              <div className="p-5 rounded-2xl border-2 border-amber-100 bg-amber-50/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-amber-500 text-white font-black text-xs flex items-center justify-center">🌟</span>
                    <label className="text-xs font-black text-amber-950 uppercase tracking-wider">
                      New Intake Prospective Total
                    </label>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                    Full Package
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Total admission package for fresh students (Tuition, Uniforms, P.E, Sports, Caution, etc.).
                </p>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-lg text-slate-400">₦</span>
                  <input 
                    type="number" 
                    value={prospectiveTotal} 
                    onChange={(e) => setProspectiveTotal(e.target.value)}
                    placeholder="e.g. 77000"
                    className="w-full pl-9 pr-4 py-3 rounded-xl bg-white border-2 border-amber-200 focus:border-amber-500 outline-none font-black text-slate-900 text-lg transition-all"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Sync Scope Options & Enrolled Class Stats */}
            {(() => {
              const sc = (selectedClass || '').toUpperCase().replace(/\s+/g, '');
              let panelColor = { bg: '#1e293b', border: '#334155', headerText: '#f1f5f9', subText: '#94a3b8', strongText: '#e2e8f0' };
              if (sc.startsWith('NURSERY') || sc.startsWith('NUR'))
                panelColor = { bg: '#831843', border: '#9d174d', headerText: '#fdf2f8', subText: '#fbcfe8', strongText: '#fce7f3' };
              else if (sc.startsWith('BASIC1') || sc.startsWith('BASIC2') || sc.startsWith('BASIC3'))
                panelColor = { bg: '#1e3a8a', border: '#1d4ed8', headerText: '#eff6ff', subText: '#bfdbfe', strongText: '#dbeafe' };
              else if (sc.startsWith('BASIC4') || sc.startsWith('BASIC5'))
                panelColor = { bg: '#164e63', border: '#0e7490', headerText: '#ecfeff', subText: '#a5f3fc', strongText: '#cffafe' };
              else if (sc.startsWith('BASIC'))
                panelColor = { bg: '#0c4a6e', border: '#0369a1', headerText: '#f0f9ff', subText: '#bae6fd', strongText: '#e0f2fe' };
              else if (sc.startsWith('JSS'))
                panelColor = { bg: '#4c1d95', border: '#6d28d9', headerText: '#f5f3ff', subText: '#ddd6fe', strongText: '#ede9fe' };
              else if (sc.startsWith('SS1') || sc.startsWith('SSS1'))
                panelColor = { bg: '#064e3b', border: '#047857', headerText: '#ecfdf5', subText: '#a7f3d0', strongText: '#d1fae5' };
              else if (sc.startsWith('SS2') || sc.startsWith('SSS2'))
                panelColor = { bg: '#134e4a', border: '#0f766e', headerText: '#f0fdfa', subText: '#99f6e4', strongText: '#ccfbf1' };
              else if (sc.startsWith('SS3') || sc.startsWith('SSS3'))
                panelColor = { bg: '#14532d', border: '#15803d', headerText: '#f0fdf4', subText: '#86efac', strongText: '#dcfce7' };
              else if (sc.startsWith('SS') || sc.startsWith('SSS'))
                panelColor = { bg: '#064e3b', border: '#047857', headerText: '#ecfdf5', subText: '#a7f3d0', strongText: '#d1fae5' };
              return (
            <div
              className="p-5 rounded-2xl space-y-4"
              style={{ backgroundColor: panelColor.bg, border: `1px solid ${panelColor.border}` }}
            >
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pb-3" style={{ borderBottom: `1px solid ${panelColor.border}` }}>
                <p className="text-xs font-black uppercase tracking-wider" style={{ color: panelColor.headerText }}>
                  Enrolled in {selectedClass}: <span style={{ color: panelColor.subText }}>{targetStudents.length} Students</span>
                </p>
                <div className="flex gap-3 text-xs font-bold" style={{ color: panelColor.subText }}>
                  <span>🎓 Returning: <strong style={{ color: panelColor.strongText }}>{returningCount}</strong></span>
                  <span>•</span>
                  <span>🌟 New Intakes: <strong style={{ color: panelColor.strongText }}>{intakeCount}</strong></span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-black uppercase tracking-wider block mb-2" style={{ color: panelColor.subText }}>
                  When Applying Fee to Class Students:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-2.5 ${
                    syncMode === 'smart' ? 'border-indigo-600 bg-white shadow-sm' : 'border-slate-200 bg-slate-100/60'
                  }`}>
                    <input 
                      type="radio" 
                      name="syncMode" 
                      value="smart" 
                      checked={syncMode === 'smart'} 
                      onChange={() => setSyncMode('smart')}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-xs font-black text-slate-800">⚡ Smart Sync (Auto)</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Returning get ₦{Number(schoolFee || 0).toLocaleString()}, New Intakes get ₦{Number(prospectiveTotal || 0).toLocaleString()}
                      </p>
                    </div>
                  </label>

                  <label className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-2.5 ${
                    syncMode === 'returning_all' ? 'border-indigo-600 bg-white shadow-sm' : 'border-slate-200 bg-slate-100/60'
                  }`}>
                    <input 
                      type="radio" 
                      name="syncMode" 
                      value="returning_all" 
                      checked={syncMode === 'returning_all'} 
                      onChange={() => setSyncMode('returning_all')}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-xs font-black text-slate-800">🎓 School Fee to ALL</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Sets ₦{Number(schoolFee || 0).toLocaleString()} for every student in {selectedClass}
                      </p>
                    </div>
                  </label>

                  <label className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-2.5 ${
                    syncMode === 'intake_all' ? 'border-indigo-600 bg-white shadow-sm' : 'border-slate-200 bg-slate-100/60'
                  }`}>
                    <input 
                      type="radio" 
                      name="syncMode" 
                      value="intake_all" 
                      checked={syncMode === 'intake_all'} 
                      onChange={() => setSyncMode('intake_all')}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-xs font-black text-slate-800">🌟 Intake Fee to ALL</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Sets ₦{Number(prospectiveTotal || 0).toLocaleString()} for every student in {selectedClass}
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
              );
            })()}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button 
                type="button"
                onClick={handleSaveFeeSettingsOnly}
                disabled={savingSettingsOnly || saving}
                className="flex-1 px-6 py-4 rounded-xl border-2 border-slate-200 hover:border-indigo-500 bg-white text-slate-700 hover:text-indigo-600 font-bold transition-all flex items-center justify-center gap-2 text-sm shadow-sm"
              >
                {savingSettingsOnly ? <Loader2 size={18} className="animate-spin" /> : <Settings size={18} />}
                Save Fee Setting Only
              </button>

              <button 
                type="submit" 
                disabled={saving || savingSettingsOnly} 
                className="flex-1 bg-indigo-600 text-white font-black py-4 rounded-xl hover:bg-indigo-700 transition flex justify-center items-center gap-2 shadow-lg shadow-indigo-200 text-sm"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />} 
                Save & Apply to Enrolled Students
              </button>
            </div>
          </form>
        </div>

        {/* Global Class Fee Master Matrix Table */}
        <div className="card-white p-6 sm:p-8 border border-slate-200 shadow-sm rounded-3xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-slate-100">
            <div>
              <h4 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Layers size={20} className="text-indigo-600" />
                Active Class Fee Schedule Matrix
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Overview of configured fees across all classes. Click "Configure" to modify any class.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="py-3 px-4">Class</th>
                  <th className="py-3 px-4">Section</th>
                  <th className="py-3 px-4">Enrolled Students</th>
                  <th className="py-3 px-4">Returning School Fee</th>
                  <th className="py-3 px-4">New Intake Prospective Total</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="text-xs font-bold">
                {classes.map((cls) => {
                  const cfg = getClassFees(cls, feeSettings);
                  const clsStudents = allStudents.filter(s => (s.className || s.class_name || s.CLASS) === cls);
                  const isSelected = selectedClass === cls;

                  // Inline hex colors — immune to Tailwind JIT purging
                  const c = cls.toUpperCase().replace(/\s+/g, '');
                  let colors = { row: '#1e293b', text: '#f1f5f9', sub: '#94a3b8', badge: '#334155', badgeText: '#e2e8f0', btn: '#475569' };

                  if (c.startsWith('NURSERY') || c.startsWith('NUR'))
                    colors = { row: '#831843', text: '#fdf2f8', sub: '#fbcfe8', badge: '#9d174d', badgeText: '#fce7f3', btn: '#be185d' };
                  else if (c.startsWith('BASIC1') || c.startsWith('BASIC2') || c.startsWith('BASIC3'))
                    colors = { row: '#1e3a8a', text: '#eff6ff', sub: '#bfdbfe', badge: '#1d4ed8', badgeText: '#dbeafe', btn: '#2563eb' };
                  else if (c.startsWith('BASIC4') || c.startsWith('BASIC5'))
                    colors = { row: '#164e63', text: '#ecfeff', sub: '#a5f3fc', badge: '#0e7490', badgeText: '#cffafe', btn: '#0891b2' };
                  else if (c.startsWith('BASIC'))
                    colors = { row: '#0c4a6e', text: '#f0f9ff', sub: '#bae6fd', badge: '#0369a1', badgeText: '#e0f2fe', btn: '#0284c7' };
                  else if (c.startsWith('JSS'))
                    colors = { row: '#4c1d95', text: '#f5f3ff', sub: '#ddd6fe', badge: '#6d28d9', badgeText: '#ede9fe', btn: '#7c3aed' };
                  else if (c.startsWith('SS1') || c.startsWith('SSS1'))
                    colors = { row: '#064e3b', text: '#ecfdf5', sub: '#a7f3d0', badge: '#047857', badgeText: '#d1fae5', btn: '#059669' };
                  else if (c.startsWith('SS2') || c.startsWith('SSS2'))
                    colors = { row: '#134e4a', text: '#f0fdfa', sub: '#99f6e4', badge: '#0f766e', badgeText: '#ccfbf1', btn: '#0d9488' };
                  else if (c.startsWith('SS3') || c.startsWith('SSS3'))
                    colors = { row: '#14532d', text: '#f0fdf4', sub: '#86efac', badge: '#15803d', badgeText: '#dcfce7', btn: '#16a34a' };
                  else if (c.startsWith('SS') || c.startsWith('SSS'))
                    colors = { row: '#064e3b', text: '#ecfdf5', sub: '#a7f3d0', badge: '#047857', badgeText: '#d1fae5', btn: '#059669' };

                  return (
                    <tr
                      key={cls}
                      style={{
                        backgroundColor: colors.row,
                        borderBottom: '1px solid rgba(255,255,255,0.08)',
                        outline: isSelected ? '2px solid rgba(255,255,255,0.3)' : 'none',
                        outlineOffset: '-2px'
                      }}
                    >
                      <td className="py-3 px-4">
                        <span style={{ color: colors.text }} className="font-black text-sm">{cls}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: colors.badge, color: colors.badgeText }}
                        >
                          {cfg.sectionTitle}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono" style={{ color: colors.sub }}>
                        {clsStudents.length} Students
                      </td>
                      <td className="py-3 px-4 font-mono font-extrabold text-sm" style={{ color: colors.badgeText }}>
                        ₦{cfg.schoolFee.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-mono font-extrabold text-sm" style={{ color: colors.badgeText }}>
                        ₦{cfg.prospectiveTotal.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedClass(cls);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="px-3 py-1.5 rounded-lg font-black text-xs text-white transition-colors"
                          style={{ backgroundColor: colors.btn }}
                        >
                          Configure
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const PrintReceiptView = () => {
    const [selectedClass, setSelectedClass] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [printSession, setPrintSession] = useState('2025/2026');
    const [printTerm, setPrintTerm] = useState('First Term');

    const targetStudents = allStudents.filter(s => {
      const matchClass = selectedClass ? (s.className || s.class_name || s.CLASS) === selectedClass : true;
      const name = s.name || s['STUDENT NAME'] || '';
      const matchSearch = name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchClass && matchSearch;
    });

    const handlePrint = (student) => {
      const pFee = parseFloat(student.paidFee) || parseFloat(student.paidAmount) || 0;
      const eFee = parseFloat(student.expectedFee) || 0;
      const bal = eFee - pFee;
      
      const txnId = student.lastTransactionId || "TXN-" + Math.floor(10000000 + Math.random() * 90000000);
      const serialNo = student.lastSerialNo || "SN-" + Math.floor(100000 + Math.random() * 900000);
      const term = printTerm;
      const session = printSession;
      const qrData = `Receipt: ${student.name || student['STUDENT NAME']} | ${term} ${session} | Reg: ${student.regNo || 'N/A'} | Paid: ₦${pFee} | Txn: ${txnId}`;

      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <html>
          <head>
            <title>Receipt - ${student.name || student['STUDENT NAME']}</title>
            <style>
              body { font-family: 'Arial', sans-serif; padding: 40px; color: #1e293b; }
              .receipt-box { border: 2px solid #e2e8f0; border-radius: 16px; padding: 40px; max-width: 600px; margin: 0 auto; }
              .header { text-align: center; border-bottom: 2px dashed #cbd5e1; padding-bottom: 20px; margin-bottom: 30px; }
              .school-name { font-size: 24px; font-weight: 900; margin-bottom: 5px; color: #0f172a; text-transform: uppercase; }
              .title { font-size: 14px; font-weight: bold; letter-spacing: 2px; color: #64748b; text-transform: uppercase; }
              .row { display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 16px; }
              .label { color: #64748b; font-weight: bold; }
              .value { font-weight: 900; color: #0f172a; }
              .total-box { margin-top: 30px; background: #f8fafc; padding: 20px; border-radius: 12px; }
              .total-row { display: flex; justify-content: space-between; font-size: 20px; font-weight: 900; }
              .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #94a3b8; }
              .signature { margin-top: 45px; border-top: 1px solid #cbd5e1; width: 200px; padding-top: 10px; text-align: center; float: right; font-weight: bold; }
              .qr-barcode-section { display: flex; justify-content: space-between; align-items: center; margin-top: 35px; padding-top: 25px; border-top: 2px dashed #e2e8f0; }
              .barcode-visual { font-family: 'Courier New', monospace; font-size: 24px; letter-spacing: 1px; font-weight: bold; margin-bottom: 2px; }
            </style>
          </head>
          <body>
            <div class="receipt-box">
              <div class="header">
                <div class="school-name">${schoolName || 'School Name'}</div>
                <div class="title">Official Payment Receipt</div>
              </div>
              <div class="row">
                <span class="label">Date Printed:</span>
                <span class="value">${new Date().toLocaleDateString()}</span>
              </div>
              <div class="row">
                <span class="label">Session:</span>
                <span class="value">${session}</span>
              </div>
              <div class="row">
                <span class="label">Term:</span>
                <span class="value">${term}</span>
              </div>
              <div class="row">
                <span class="label">Serial No:</span>
                <span class="value">${serialNo}</span>
              </div>
              <div class="row">
                <span class="label">Transaction ID:</span>
                <span class="value">${txnId}</span>
              </div>
              <div class="row">
                <span class="label">Student Name:</span>
                <span class="value">${student.name || student['STUDENT NAME']}</span>
              </div>
              <div class="row">
                <span class="label">Reg Number:</span>
                <span class="value">${student.regNo || student.REGNO || 'N/A'}</span>
              </div>
              <div class="row">
                <span class="label">Class:</span>
                <span class="value">${student.className || student.class_name || student.CLASS}</span>
              </div>
              
              <div class="total-box">
                <div class="row">
                  <span class="label">Expected Fee:</span>
                  <span class="value">₦${eFee.toLocaleString()}</span>
                </div>
                <div class="row">
                  <span class="label">Amount Paid:</span>
                  <span class="value" style="color: #10b981;">₦${pFee.toLocaleString()}</span>
                </div>
                <div class="total-row" style="margin-top: 15px; padding-top: 15px; border-top: 2px dashed #cbd5e1;">
                  <span>Outstanding Balance:</span>
                  <span style="color: ${bal > 0 ? '#e11d48' : '#10b981'};">₦${Math.max(0, bal).toLocaleString()}</span>
                </div>
              </div>

              <div class="qr-barcode-section">
                <div>
                  <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(qrData)}" alt="QR Code" style="width: 80px; height: 80px;" />
                  <div style="font-size: 9px; color: #94a3b8; margin-top: 4px; text-align: center;">Scan to Verify</div>
                </div>
                <div style="text-align: right;">
                  <div class="barcode-visual">||| | |||| | || ||| ||</div>
                  <div style="font-size: 10px; color: #94a3b8; font-family: monospace;">SERIAL: ${serialNo}</div>
                </div>
              </div>

              <div class="signature">
                Bursar's Signature
              </div>
              <div style="clear: both;"></div>

              <div class="footer">
                Thank you for your payment.<br/>
                This is a computer generated receipt.
              </div>
            </div>
            <script>window.print();</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    };

    return (
      <div className="card-white p-6 mt-8 shadow-sm rounded-3xl border border-slate-200">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Printer size={20} className="text-emerald-500" /> Receipt Generator
          </h3>
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <select value={printSession} onChange={e => setPrintSession(e.target.value)}
              className="px-4 py-2 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-sm">
              {SESSIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={printTerm} onChange={e => setPrintTerm(e.target.value)}
              className="px-4 py-2 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-sm">
              {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select 
              value={selectedClass} 
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-4 py-2 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-sm"
            >
              <option value="">All Classes</option>
              {classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input 
              type="text"
              placeholder="Search student..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-sm w-full md:w-48"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Student</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Class</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Paid / Expected</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {targetStudents.slice(0, 50).map(s => (
                <tr key={s.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-800">{s.name || s['STUDENT NAME']}</p>
                    <p className="text-xs text-slate-400 font-medium">{s.regNo || s.REGNO}</p>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-600">{s.className || s.class_name || s.CLASS}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm font-black">
                      <span className="text-emerald-600">₦{(parseFloat(s.paidFee) || 0).toLocaleString()}</span>
                      <span className="text-slate-300">/</span>
                      <span className="text-slate-600">₦{(parseFloat(s.expectedFee) || 0).toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => {
                          setPreSelectedStudent(s);
                          navigateTo('cashpay');
                        }}
                        className="px-4 py-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg text-xs font-black uppercase tracking-wider transition-colors"
                      >
                        Pay
                      </button>
                      <button 
                        onClick={() => handlePrint(s)}
                        className="px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-xs font-black uppercase tracking-wider transition-colors"
                      >
                        Print
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {targetStudents.length === 0 && (
                <tr><td colSpan="4" className="text-center py-8 text-slate-400 font-bold">No students found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const NewIntakesView = () => {
    const [filterClass, setFilterClass] = useState('All');
    const newIntakes = allStudents.filter(s => {
      return s.studentType === 'new_intake' || s.isNewIntake === true || String(s.studentType || '').toLowerCase().includes('new');
    });
    
    const filteredIntakes = newIntakes.filter(s => {
      if (filterClass === 'All') return true;
      return (s.className || s.class_name || s.CLASS) === filterClass;
    });

    return (
      <div className="card-white p-6 mt-8 shadow-sm rounded-3xl border border-blue-100 bg-gradient-to-b from-white to-blue-50/30">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
              <UserCheck size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800">New Intakes List</h2>
              <p className="text-slate-500 font-medium text-sm">Admitted students classified as new intakes</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              value={filterClass}
              onChange={e => setFilterClass(e.target.value)}
              className="flex-1 md:flex-none px-4 py-2.5 bg-white border-2 border-blue-100 rounded-xl font-bold text-blue-900 outline-none focus:border-blue-300 cursor-pointer text-sm"
            >
              <option value="All">All Classes</option>
              {classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="px-4 py-2.5 bg-blue-600 text-white font-black rounded-xl text-sm shadow-md">
              Total: {filteredIntakes.length}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-sm">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-400 font-bold uppercase text-[11px] tracking-wider">
                <th className="py-4 px-4">Student Name</th>
                <th className="py-4 px-4">Reg No</th>
                <th className="py-4 px-4">Class</th>
                <th className="py-4 px-4">Expected Fee</th>
                <th className="py-4 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredIntakes.map(s => {
                const config = getClassFees(s.className || s.class_name || s.CLASS, feeSettings);
                return (
                  <tr key={s.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="py-3.5 px-4 font-black text-slate-700">{s.studentName || s.name || s.firstName || 'Unknown'}</td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-xs font-bold">{s.regNo || 'N/A'}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                        {s.className || s.class_name || s.CLASS}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-blue-600 font-black">{formatNaira(config.prospectiveTotal)}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 flex items-center gap-1 w-max">
                        <CheckCircle2 size={12} /> New Intake
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filteredIntakes.length === 0 && (
                <tr><td colSpan="5" className="text-center py-8 text-slate-400 font-bold">No new intakes found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const DebtorsView = () => {
    const [filterClass, setFilterClass] = useState('All');
    const allDebtors = stats?.debtorsList || [];
    
    const debtors = allDebtors.filter(s => {
      if (filterClass === 'All') return true;
      return (s.className || s.class_name || s.CLASS) === filterClass;
    });

    const printDebtors = () => {
      const w = window.open('', '_blank');
      w.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Debtors List - ${filterClass}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #1e293b; max-width: 900px; margin: 0 auto; }
            h1 { text-align: center; color: #e11d48; margin-bottom: 5px; text-transform: uppercase; }
            h3 { text-align: center; color: #64748b; margin-top: 0; margin-bottom: 40px; }
            table { border-collapse: collapse; width: 100%; font-size: 14px; }
            th, td { border: 1px solid #cbd5e1; padding: 12px; text-align: left; }
            th { background-color: #f8fafc; font-weight: bold; color: #475569; text-transform: uppercase; }
            .right { text-align: right; }
            .total { font-weight: bold; font-size: 16px; background-color: #fff1f2; color: #e11d48; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>${schoolName || 'School Name'} - Debtors List</h1>
          <h3>Class: ${filterClass} (${debtors.length} Students)</h3>
          <table>
            <thead>
              <tr>
                <th>S/N</th>
                <th>Name</th>
                <th>Reg No</th>
                <th>Class</th>
                <th class="right">Outstanding (₦)</th>
              </tr>
            </thead>
            <tbody>
              ${debtors.map((d, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${d.name || d['STUDENT NAME']}</td>
                  <td>${d.regNo || d.REGNO || 'N/A'}</td>
                  <td>${d.className || d.CLASS}</td>
                  <td class="right">${(d.balance || 0).toLocaleString()}</td>
                </tr>
              `).join('')}
              <tr class="total">
                <td colspan="4" class="right">Total Expected Debt:</td>
                <td class="right">₦${debtors.reduce((sum, d) => sum + (d.balance || 0), 0).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
          <script>window.print();</script>
        </body>
        </html>
      `);
      w.document.close();
    };

    return (
      <div className="card-white p-6 mt-8 shadow-sm rounded-3xl border border-rose-100 bg-gradient-to-b from-white to-rose-50/30">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-black text-rose-900 flex items-center gap-2">
              <AlertTriangle size={20} className="text-rose-600" /> Debtors List
            </h3>
            <div className="px-4 py-2 bg-rose-100 text-rose-700 rounded-xl text-sm font-black">
              {debtors.length} Students Owing
            </div>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <select 
              value={filterClass} 
              onChange={e => setFilterClass(e.target.value)}
              className="flex-1 md:flex-none px-4 py-2.5 bg-white border-2 border-rose-100 rounded-xl font-bold text-rose-900 outline-none focus:border-rose-300 cursor-pointer text-sm"
            >
              <option value="All">All Classes</option>
              {classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            
            <button 
              onClick={printDebtors}
              className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black tracking-wide text-sm transition-colors shadow-lg shadow-rose-200"
            >
              <Printer size={18} /> Print / PDF
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-rose-50/50">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-rose-400 uppercase tracking-widest">Student</th>
                <th className="px-6 py-4 text-[10px] font-black text-rose-400 uppercase tracking-widest">Class</th>
                <th className="px-6 py-4 text-[10px] font-black text-rose-400 uppercase tracking-widest text-right">Outstanding Balance</th>
                <th className="px-6 py-4 text-[10px] font-black text-rose-400 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rose-50">
              {debtors.map(s => {
                const bal = s.balance || 0;
                return (
                  <tr key={s.id} className="hover:bg-rose-50/50">
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-800">{s.name || s['STUDENT NAME']}</p>
                      <p className="text-xs text-slate-400 font-medium">{s.regNo || s.REGNO}</p>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-600">{s.className || s.class_name || s.CLASS}</td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-black text-rose-600">₦{bal.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => {
                          setPreSelectedStudent(s);
                          navigateTo('cashpay');
                        }}
                        className="px-4 py-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg text-xs font-black uppercase tracking-wider transition-colors"
                      >
                        Pay
                      </button>
                    </td>
                  </tr>
                );
              })}
              {debtors.length === 0 && (
                <tr><td colSpan="3" className="text-center py-12 text-emerald-600 font-black text-lg">🎉 No Debtors! All expected fees are cleared.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const MessageHubView = () => {
    return (
      <div className="card-white p-12 text-center space-y-6 mt-8 border border-slate-200 rounded-3xl shadow-sm">
         <div className="w-20 h-20 bg-purple-50 text-purple-600 rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 shadow-inner">
            <FileText size={32} />
         </div>
         <h3 className="text-2xl font-black text-slate-900">Payment Tellers Inbox</h3>
         <p className="text-slate-500 max-w-md mx-auto leading-relaxed">
           This hub will receive payment tellers and receipts uploaded by students/parents from their portal.
         </p>
         <div className="mt-8">
           {paymentMessages.length === 0 ? (
             <div className="text-slate-400 font-bold bg-slate-50 py-8 rounded-2xl border-2 border-dashed border-slate-200">
               No payment receipts submitted yet.
             </div>
           ) : (
             <div className="text-left space-y-4">
               {paymentMessages.map(msg => (
                 <div key={msg.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                   <p className="font-bold text-slate-800">{msg.studentName} ({msg.className})</p>
                   <p className="text-sm text-slate-600 mt-1">{msg.message}</p>
                 </div>
               ))}
             </div>
           )}
         </div>
      </div>
    );
  };

  const SESSIONS = ['2024/2025', '2025/2026', '2026/2027', '2027/2028'];
  const TERMS = ['First Term', 'Second Term', 'Third Term'];

  const CashPaymentView = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStudent, setSelectedStudent] = useState(preSelectedStudent);
    const [cashAmount, setCashAmount] = useState('');
    const [discountAmount, setDiscountAmount] = useState('');
    const [paymentTerm, setPaymentTerm] = useState('First Term');
    const [paymentSession, setPaymentSession] = useState('2025/2026');
    const [saving, setSaving] = useState(false);
    const [receipt, setReceipt] = useState(null);

    useEffect(() => {
      if (preSelectedStudent) {
        setSelectedStudent(preSelectedStudent);
      }
    }, [preSelectedStudent]);

    const filtered = allStudents.filter(s => {
      const name = (s.name || s['STUDENT NAME'] || '').toLowerCase();
      const reg = (s.regNo || s.REGNO || '').toLowerCase();
      return (name.includes(searchTerm.toLowerCase()) || reg.includes(searchTerm.toLowerCase())) && searchTerm.length > 0;
    }).slice(0, 15);

    const handlePay = async () => {
      if (!selectedStudent || !cashAmount) return;
      const amount = parseFloat(cashAmount);
      const discount = parseFloat(discountAmount) || 0;
      if (isNaN(amount) || amount <= 0) { alert('Enter a valid amount.'); return; }
      setSaving(true);
      try {
        const oldPaid = parseFloat(selectedStudent.paidFee) || parseFloat(selectedStudent.paidAmount) || 0;
        const newPaid = oldPaid + amount;
        const oldExpected = parseFloat(selectedStudent.expectedFee) || 0;
        const newExpected = Math.max(0, oldExpected - discount);
        const oldDiscountApplied = parseFloat(selectedStudent.discountApplied) || 0;
        const newDiscountApplied = oldDiscountApplied + discount;
        
        const txnId = 'TXN-' + Math.floor(10000000 + Math.random() * 90000000);
        const serialNo = 'SN-' + Math.floor(100000 + Math.random() * 900000);
        const ref = doc(db, 'students', selectedStudent.id);
        const isPendingAdmission = selectedStudent.status === 'pending_activation' || selectedStudent.requiresAdminConfirmation || selectedStudent.admissionConfirmed === false || selectedStudent.paymentConfirmed === false;
        await updateDoc(ref, {
          paidFee: newPaid, paidAmount: newPaid,
          expectedFee: newExpected,
          discountApplied: newDiscountApplied,
          lastPaymentDate: new Date().toLocaleDateString('en-NG'),
          lastTransactionId: txnId, lastSerialNo: serialNo,
          lastPaymentTerm: paymentTerm, lastPaymentSession: paymentSession,
          ...(isPendingAdmission ? {
            paymentConfirmed: true,
            admissionConfirmed: true,
            requiresAdminConfirmation: false,
            classActivated: true,
            status: 'active',
            activatedAt: serverTimestamp(),
            activationConfirmedBy: currentAdmin?.name || 'Bursar',
            activationConfirmedRole: 'bursar',
          } : {}),
        });
        await addDoc(collection(db, 'payment_messages'), {
          studentName: selectedStudent.name || selectedStudent['STUDENT NAME'],
          className: selectedStudent.className || selectedStudent.class_name || selectedStudent.CLASS,
          regNo: selectedStudent.regNo || selectedStudent.REGNO,
          amount, discount, method: 'Cash', term: paymentTerm, session: paymentSession,
          transactionId: txnId, serialNo,
          message: `Cash payment of \u20a6${amount.toLocaleString()} received for ${paymentTerm}, ${paymentSession}.${discount > 0 ? ` A discount of \u20a6${discount.toLocaleString()} was applied.` : ''}`,
          createdAt: serverTimestamp(),
        });
        setReceipt({ student: selectedStudent, amount, discount, newPaid, date: new Date().toLocaleDateString('en-NG'), term: paymentTerm, session: paymentSession, txnId, serialNo });
        fetchFinancialData();
        setCashAmount(''); setDiscountAmount(''); setSelectedStudent(null); setSearchTerm('');
        setPreSelectedStudent(null);
      } catch (e) { console.error(e); alert('Payment failed.'); }
      finally { setSaving(false); }
    };

    const printReceipt = () => {
      const s = receipt.student;
      const txnId = receipt.txnId || s.lastTransactionId || 'TXN-' + Math.floor(10000000 + Math.random() * 90000000);
      const serialNo = receipt.serialNo || s.lastSerialNo || 'SN-' + Math.floor(100000 + Math.random() * 900000);
      const term = receipt.term || s.lastPaymentTerm || 'N/A';
      const session = receipt.session || s.lastPaymentSession || 'N/A';
      const qrData = `Receipt: ${s.name || s['STUDENT NAME']} | ${term} ${session} | Amount: ₦${receipt.amount.toLocaleString()} | Txn: ${txnId}`;

      const w = window.open('', '_blank');
      w.document.write(`<!DOCTYPE html><html><head><title>Receipt</title><style>
        body{font-family:Arial,sans-serif;padding:40px;color:#1e293b;max-width:600px;margin:0 auto}
        .hd{text-align:center;border-bottom:2px dashed #cbd5e1;padding-bottom:20px;margin-bottom:24px}
        .school{font-size:22px;font-weight:900;text-transform:uppercase}
        .sub{font-size:12px;letter-spacing:2px;color:#64748b;text-transform:uppercase;margin-top:4px}
        .row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:15px}
        .lbl{color:#64748b;font-weight:700}.val{font-weight:900;color:#0f172a}
        .total{background:#f8fafc;border-radius:12px;padding:18px;margin-top:20px;display:flex;justify-content:space-between;font-size:20px;font-weight:900}
        .sig{border-top:1px solid #cbd5e1;width:180px;padding-top:8px;text-align:center;font-weight:700;margin-top:40px;float:right;font-size:13px}
        .qr-barcode-section { display: flex; justify-content: space-between; align-items: center; margin-top: 30px; padding-top: 20px; border-top: 2px dashed #cbd5e1; }
        .barcode-visual { font-family: 'Courier New', monospace; font-size: 24px; letter-spacing: 1px; font-weight: bold; margin-bottom: 2px; }
      </style></head><body>
        <div class="hd"><div class="school">${schoolName||'School Name'}</div><div class="sub">Official Cash Payment Receipt</div></div>
        <div class="row"><span class="lbl">Date:</span><span class="val">${receipt.date}</span></div>
        <div class="row"><span class="lbl">Session:</span><span class="val">${session}</span></div>
        <div class="row"><span class="lbl">Term:</span><span class="val">${term}</span></div>
        <div class="row"><span class="lbl">Serial No:</span><span class="val">${serialNo}</span></div>
        <div class="row"><span class="lbl">Transaction ID:</span><span class="val">${txnId}</span></div>
        <div class="row"><span class="lbl">Student:</span><span class="val">${s.name||s['STUDENT NAME']}</span></div>
        <div class="row"><span class="lbl">Reg No:</span><span class="val">${s.regNo||s.REGNO||'N/A'}</span></div>
        <div class="row"><span class="lbl">Class:</span><span class="val">${s.className||s.CLASS||'N/A'}</span></div>
        <div class="row"><span class="lbl">Method:</span><span class="val">CASH</span></div>
        ${receipt.discount > 0 ? `<div class="row"><span class="lbl">Discount Applied:</span><span class="val" style="color:#ef4444">-\u20a6${receipt.discount.toLocaleString()}</span></div>` : ''}
        <div class="total"><span>Amount Paid:</span><span style="color:#10b981">\u20a6${receipt.amount.toLocaleString()}</span></div>
        <div class="row" style="margin-top:12px"><span class="lbl">Total Paid to Date:</span><span class="val">\u20a6${receipt.newPaid.toLocaleString()}</span></div>
        
        <div class="qr-barcode-section">
          <div>
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(qrData)}" alt="QR Code" style="width: 80px; height: 80px;" />
            <div style="font-size: 9px; color: #94a3b8; margin-top: 4px; text-align: center;">Scan to Verify</div>
          </div>
          <div style="text-align: right;">
            <div class="barcode-visual">||| | |||| | || ||| ||</div>
            <div style="font-size: 10px; color: #94a3b8; font-family: monospace;">SERIAL: ${serialNo}</div>
          </div>
        </div>

        <div class="sig">Bursar's Signature</div>
        <div style="clear:both;margin-top:40px;text-align:center;font-size:11px;color:#94a3b8">Computer-generated receipt \u2014 ${schoolName||'School Name'} Bursary</div>
        <script>window.print();</script></body></html>`);
      w.document.close();
    };

    return (
      <div className="card-white p-8 mt-8 border border-slate-200 rounded-3xl shadow-sm max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8 border-b border-slate-100 pb-6">
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center"><Banknote size={24} /></div>
          <div><h3 className="text-xl font-black text-slate-900">Cash Payment Entry</h3><p className="text-sm text-slate-500">Record cash received and print a receipt.</p></div>
        </div>
        {receipt ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto"><CheckCircle size={32} /></div>
            <h4 className="text-xl font-black text-slate-900">Payment Recorded!</h4>
            <p className="text-slate-500">\u20a6{receipt.amount.toLocaleString()} saved for {receipt.student.name||receipt.student['STUDENT NAME']}.</p>
            <div className="flex gap-3 justify-center mt-6">
              <button onClick={printReceipt} className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-indigo-600 transition-all"><Printer size={16}/> Print Receipt</button>
              <button onClick={() => { setReceipt(null); setPreSelectedStudent(null); }} className="px-6 py-3 border-2 border-slate-200 rounded-xl font-bold text-sm text-slate-600 hover:border-indigo-400 transition-all">New Payment</button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Search Student</label>
              <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Name or Reg No..."
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 outline-none font-bold text-slate-800 transition-all" />
              {filtered.length > 0 && (
                <div className="mt-1 border border-slate-200 rounded-xl overflow-hidden shadow-lg bg-white max-h-48 overflow-y-auto relative z-10">
                  {filtered.map(s => (
                    <button key={s.id} type="button" onClick={() => { setSelectedStudent(s); setPreSelectedStudent(s); setSearchTerm(''); }}
                      className="w-full text-left px-4 py-3 hover:bg-indigo-50 transition-colors border-b border-slate-100 last:border-0">
                      <p className="font-bold text-slate-800 text-sm">{s.name||s['STUDENT NAME']}</p>
                      <p className="text-xs text-slate-400">{s.regNo||s.REGNO} \u2022 {s.className||s.CLASS}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedStudent && (
              <div className="bg-slate-900 rounded-2xl p-5 border border-slate-700 flex items-center justify-between shadow-xl">
                <div>
                  <p className="font-black text-white text-lg">{selectedStudent.name||selectedStudent['STUDENT NAME']}</p>
                  <p className="text-sm text-slate-400 font-bold mt-0.5">{selectedStudent.regNo||selectedStudent.REGNO} \u2022 {selectedStudent.className||selectedStudent.CLASS}</p>
                  <p className="text-sm text-emerald-400 font-black mt-2">
                    Balance: ₦{Math.max(0, (parseFloat(selectedStudent.expectedFee) || parseFloat(getExpectedFeeForStudent(selectedStudent.className || selectedStudent.CLASS || 'JSS1', selectedStudent.studentType === 'new_intake' || selectedStudent.isNewIntake, feeSettings)) || 0) - (parseFloat(selectedStudent.paidFee)||parseFloat(selectedStudent.paidAmount)||0) - (parseFloat(discountAmount)||0)).toLocaleString()}
                  </p>
                </div>
                <button onClick={() => { setSelectedStudent(null); setPreSelectedStudent(null); }} className="text-slate-500 hover:text-rose-400 text-2xl font-black bg-slate-800 w-10 h-10 rounded-full flex items-center justify-center transition-colors">\u2715</button>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Session</label>
                <select value={paymentSession} onChange={e => setPaymentSession(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 outline-none font-bold text-slate-900 transition-all">
                  {SESSIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Term</label>
                <select value={paymentTerm} onChange={e => setPaymentTerm(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 outline-none font-bold text-slate-900 transition-all">
                  {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Cash Amount (\u20a6)</label>
                <input type="number" value={cashAmount} onChange={e => setCashAmount(e.target.value)} placeholder="Enter amount received"
                  className="w-full px-4 py-4 rounded-xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 outline-none font-black text-2xl text-slate-900 transition-all" />
              </div>
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Discount (\u20a6) <span className="font-normal lowercase text-[10px]">(optional)</span></label>
                <input type="number" value={discountAmount} onChange={e => setDiscountAmount(e.target.value)} placeholder="Enter discount"
                  className="w-full px-4 py-4 rounded-xl bg-slate-50 border-2 border-transparent focus:border-rose-400 outline-none font-black text-2xl text-slate-900 transition-all" />
              </div>
            </div>
            <button disabled={!selectedStudent||!cashAmount||saving} onClick={handlePay}
              className="w-full bg-green-600 text-white font-black py-4 rounded-xl hover:bg-green-700 transition-all shadow-lg disabled:opacity-40 flex items-center justify-center gap-2">
              {saving ? <Loader2 size={20} className="animate-spin"/> : <Banknote size={20}/>} Record Cash Payment
            </button>
          </div>
        )}
      </div>
    );
  };

  const RegisterStudentView = () => {
    const [form, setForm] = useState({ 
      name: '', 
      regNo: '', 
      className: classes[0] || 'JSS1', 
      gender: 'Male', 
      phone: '', 
      guardianName: '',
      studentType: 'returning', // 'returning' | 'new_intake'
      expectedFee: '',
      discount: ''
    });
    const [saving, setSaving] = useState(false);
    const [done, setDone] = useState(null);

    // Update expected fee automatically when className, studentType, or discount changes
    useEffect(() => {
      const cls = form.className || 'JSS1';
      const isIntake = form.studentType === 'new_intake';
      const baseFee = getExpectedFeeForStudent(cls, isIntake, feeSettings);
      const discountVal = parseFloat(form.discount) || 0;
      const finalFee = Math.max(0, baseFee - discountVal);
      setForm(prev => ({ ...prev, expectedFee: String(finalFee) }));
    }, [form.className, form.studentType, form.discount, feeSettings]);

    const generateRegNo = () => {
      const year = new Date().getFullYear();
      const code = getClassCode(form.className);
      const rand = Math.floor(Math.random() * 899 + 100);
      return `BDS/${code}/${year}/${formatRegNumberSuffix(rand)}`;
    };

    const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

    const handleRegister = async e => {
      e.preventDefault();
      setSaving(true);
      try {
        await ensureFirebaseAuth();
        const regNo = form.regNo || generateRegNo();
        const finalExpected = parseFloat(form.expectedFee) || getExpectedFeeForStudent(form.className, form.studentType === 'new_intake', feeSettings);

        await addDoc(collection(db, 'students'), {
          name: form.name, 
          regNo, 
          className: form.className,
          gender: form.gender, 
          guardianPhone: form.phone, 
          guardianName: form.guardianName,
          studentType: form.studentType,
          isNewIntake: form.studentType === 'new_intake',
          paidFee: 0, 
          paidAmount: 0,
          expectedFee: finalExpected, 
          discountApplied: parseFloat(form.discount) || 0,
          createdAt: serverTimestamp(), 
          createdBy: 'bursar',
        });

        await fetchFinancialData();
        setDone({ regNo, name: form.name, expectedFee: finalExpected, type: form.studentType });
        setForm({ 
          name: '', 
          regNo: '', 
          className: form.className, 
          gender: 'Male', 
          phone: '', 
          guardianName: '',
          studentType: 'returning',
          discount: '',
          expectedFee: String(getExpectedFeeForStudent(form.className, false, feeSettings))
        });
      } catch (e) { 
        console.error(e); 
        alert('Registration failed.'); 
      } finally { 
        setSaving(false); 
      }
    };

    const activeFeeConfig = getClassFees(form.className || 'JSS1', feeSettings);

    return (
      <div className="card-white p-6 sm:p-8 mt-8 border border-slate-200 rounded-3xl shadow-sm max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8 border-b border-slate-100 pb-6">
          <div className="w-12 h-12 bg-violet-50 text-violet-600 rounded-2xl flex items-center justify-center shadow-inner">
            <UserPlus size={26}/>
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900">Register Student & Fee Assignment</h3>
            <p className="text-xs sm:text-sm text-slate-500">
              Enroll returning or new intake students with automatic fee tier assignment.
            </p>
          </div>
        </div>

        {done && (
          <div className="mb-6 p-5 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-1 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-800 font-black text-sm">
                <CheckCircle size={18} className="text-emerald-600"/>
                <span>Student Enrolled Successfully!</span>
              </div>
              <button onClick={() => setDone(null)} className="text-emerald-700 font-bold text-xs underline">
                Dismiss
              </button>
            </div>
            <p className="text-xs text-emerald-700">
              <strong>{done.name}</strong> • Reg No: <span className="font-mono font-black">{done.regNo}</span> • Expected Fee: <strong>₦{Number(done.expectedFee).toLocaleString()}</strong> ({done.type === 'new_intake' ? '🌟 New Intake' : '🎓 Returning Student'})
            </p>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-6">
          {/* Student Intake Category (Returning vs New Intake) */}
          <div>
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2.5 block">
              1. Student Intake Category
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option: Returning Student */}
              <label className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                form.studentType === 'returning' 
                  ? 'border-indigo-600 bg-indigo-50/50 shadow-sm' 
                  : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
              }`}>
                <input 
                  type="radio" 
                  name="studentType" 
                  value="returning" 
                  checked={form.studentType === 'returning'} 
                  onChange={() => setForm({ ...form, studentType: 'returning' })}
                  className="mt-1"
                />
                <div>
                  <p className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    🎓 Returning Student
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Pays <strong>School Fee Only</strong> (₦{activeFeeConfig.schoolFee.toLocaleString()})
                  </p>
                </div>
              </label>

              {/* Option: New Intake */}
              <label className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                form.studentType === 'new_intake' 
                  ? 'border-amber-500 bg-amber-50/50 shadow-sm' 
                  : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
              }`}>
                <input 
                  type="radio" 
                  name="studentType" 
                  value="new_intake" 
                  checked={form.studentType === 'new_intake'} 
                  onChange={() => setForm({ ...form, studentType: 'new_intake' })}
                  className="mt-1"
                />
                <div>
                  <p className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    🌟 New Intake / Fresh Admission
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Pays <strong>Total Prospective Fee</strong> (₦{activeFeeConfig.prospectiveTotal.toLocaleString()})
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Student Info Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Full Name</label>
              <input 
                type="text" 
                name="name" 
                value={form.name} 
                onChange={handleChange} 
                placeholder="e.g. John Emmanuel Doe" 
                required
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-slate-200 focus:border-violet-500 outline-none font-bold text-slate-800 transition-all text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">
                Reg Number <span className="text-slate-400 font-normal text-[10px]">(auto if blank)</span>
              </label>
              <input 
                type="text" 
                name="regNo" 
                value={form.regNo} 
                onChange={handleChange} 
                placeholder="BDS/JSS1/2026/001" 
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-slate-200 focus:border-violet-500 outline-none font-bold text-slate-800 transition-all text-sm font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Class Section</label>
              <select 
                name="className" 
                value={form.className} 
                onChange={handleChange} 
                required
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-slate-200 focus:border-violet-500 outline-none font-bold text-slate-800 transition-all cursor-pointer text-sm"
              >
                {classes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Gender</label>
              <select 
                name="gender" 
                value={form.gender} 
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-slate-200 focus:border-violet-500 outline-none font-bold text-slate-800 transition-all cursor-pointer text-sm"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Guardian's Name</label>
              <input 
                type="text" 
                name="guardianName" 
                value={form.guardianName} 
                onChange={handleChange} 
                placeholder="Mr. & Mrs. Doe" 
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-slate-200 focus:border-violet-500 outline-none font-bold text-slate-800 transition-all text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Guardian's Phone</label>
              <input 
                type="tel" 
                name="phone" 
                value={form.phone} 
                onChange={handleChange} 
                placeholder="08012345678" 
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-slate-200 focus:border-violet-500 outline-none font-bold text-slate-800 transition-all text-sm"
              />
            </div>
          </div>

          {/* Computed Expected Fee Tier Card */}
          <div className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-200 space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
                Expected Fee for {form.className} ({form.studentType === 'new_intake' ? '🌟 New Intake' : '🎓 Returning'})
              </label>
              <span className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                form.studentType === 'new_intake' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'
              }`}>
                Base Fee: ₦{Number(getExpectedFeeForStudent(form.className || 'JSS1', form.studentType === 'new_intake', feeSettings)).toLocaleString()}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2 block">
                  Discount Amount
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-sm text-slate-400">₦</span>
                  <input 
                    type="number" 
                    name="discount"
                    value={form.discount} 
                    onChange={handleChange}
                    placeholder="e.g. 5000"
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-white border border-slate-300 focus:border-violet-600 outline-none font-black text-slate-900 text-base"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2 block">
                  Final Expected Fee
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-sm text-slate-400">₦</span>
                  <input 
                    type="number" 
                    name="expectedFee"
                    value={form.expectedFee} 
                    onChange={handleChange}
                    placeholder="Expected Fee"
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-white border border-slate-300 focus:border-violet-600 outline-none font-black text-slate-900 text-base"
                    required
                  />
                </div>
              </div>
            </div>
            <p className="text-[10px] text-slate-400">
              Automatically pre-loaded based on <strong>{form.className}</strong> Fee Settings minus any discount. You can manually adjust the final fee if special concessions apply.
            </p>
          </div>

          <button 
            type="submit" 
            disabled={saving}
            className="w-full bg-violet-600 text-white font-black py-4 rounded-xl hover:bg-violet-700 transition-all shadow-lg shadow-violet-200 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
          >
            {saving ? <Loader2 size={20} className="animate-spin"/> : <UserPlus size={20}/>} 
            Enroll Student & Set Expected Fee
          </button>
        </form>
      </div>
    );
  };

  const BulkPayView = () => {
    const [csvData, setCsvData] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [previewRows, setPreviewRows] = useState([]);

    const handleFileChange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const rows = results.data.map(row => {
            const regNo = (row['Reg No'] || row['regNo'] || '').trim();
            const amount = parseFloat(row['Amount'] || row['amount'] || 0);
            const term = (row['Term'] || row['term'] || 'First Term').trim();
            const session = (row['Session'] || row['session'] || '2025/2026').trim();

            const student = allStudents.find(s => 
              (s.regNo || s.REGNO || '').trim().toLowerCase() === regNo.toLowerCase()
            );

            const oldPaid = student ? (parseFloat(student.paidFee) || parseFloat(student.paidAmount) || 0) : 0;
            const expected = student ? (parseFloat(student.expectedFee) || 0) : 0;
            const newPaid = oldPaid + amount;
            const newBalance = Math.max(0, expected - newPaid);

            return {
              regNo,
              amount,
              term,
              session,
              studentName: student ? (student.name || student['STUDENT NAME']) : 'Student Not Found',
              studentId: student ? student.id : null,
              newPaid,
              balance: newBalance,
              isValid: !!student
            };
          });

          setPreviewRows(rows);
        }
      });
    };

    const handleUploadPayments = async () => {
      if (previewRows.length === 0) return;
      const validRows = previewRows.filter(r => r.isValid && r.amount > 0);
      if (validRows.length === 0) {
        alert('No valid student payment rows found to process.');
        return;
      }

      setUploading(true);
      try {
        const batch = writeBatch(db);
        let count = 0;

        for (const row of validRows) {
          const studentRef = doc(db, 'students', row.studentId);
          batch.update(studentRef, {
            paidFee: row.newPaid,
            paidAmount: row.newPaid,
            lastPaymentDate: new Date().toLocaleDateString('en-NG'),
            lastTransactionId: 'TXN-BULK-' + Math.floor(10000000 + Math.random() * 90000000),
            lastSerialNo: 'SN-BULK-' + Math.floor(100000 + Math.random() * 900000),
            lastPaymentTerm: row.term,
            lastPaymentSession: row.session
          });

          const msgRef = doc(collection(db, 'payment_messages'));
          batch.set(msgRef, {
            studentName: row.studentName,
            regNo: row.regNo,
            amount: row.amount,
            method: 'Bulk Upload',
            term: row.term,
            session: row.session,
            message: `Bulk payment upload of ₦${row.amount.toLocaleString()} processed for ${row.term} (${row.session}).`,
            createdAt: serverTimestamp()
          });

          count++;
          if (count % 400 === 0) {
            await batch.commit();
          }
        }

        await batch.commit();
        await fetchFinancialData();
        setStatus({ type: 'success', message: `Processed bulk payments for ${validRows.length} students.` });
        setPreviewRows([]);
      } catch (err) {
        console.error(err);
        setStatus({ type: 'error', message: 'Failed to process bulk upload.' });
      } finally {
        setUploading(false);
      }
    };

    return (
      <div className="card-white p-8 mt-8 border border-slate-200 rounded-3xl shadow-sm max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8 border-b border-slate-100 pb-6">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <FileSpreadsheet size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900">Bulk Fee Payments Upload</h3>
            <p className="text-sm text-slate-500">Upload a CSV containing Reg No, Amount, Term, and Session columns to apply payments in batch.</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="border-2 border-dashed border-slate-200 hover:border-indigo-500 rounded-2xl p-8 text-center transition-all bg-slate-50 cursor-pointer relative">
            <input type="file" accept=".csv" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
            <FileSpreadsheet className="mx-auto text-slate-400 mb-4" size={48} />
            <p className="font-bold text-slate-700">Click to upload or drag & drop CSV file</p>
            <p className="text-xs text-slate-400 mt-1">Columns required: "Reg No", "Amount", "Term", "Session"</p>
          </div>

          {previewRows.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-black text-slate-800 text-sm uppercase tracking-wider">Upload Preview ({previewRows.length} Rows)</h4>
              <div className="overflow-x-auto max-h-96 border border-slate-100 rounded-2xl">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-xs font-black text-slate-400 uppercase">Reg No</th>
                      <th className="px-4 py-3 text-xs font-black text-slate-400 uppercase">Student Name</th>
                      <th className="px-4 py-3 text-xs font-black text-slate-400 uppercase">Amount</th>
                      <th className="px-4 py-3 text-xs font-black text-slate-400 uppercase">Term</th>
                      <th className="px-4 py-3 text-xs font-black text-slate-400 uppercase">Session</th>
                      <th className="px-4 py-3 text-xs font-black text-slate-400 uppercase">New Balance</th>
                      <th className="px-4 py-3 text-xs font-black text-slate-400 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-sm">
                    {previewRows.map((r, i) => (
                      <tr key={i} className={r.isValid ? "hover:bg-slate-50" : "bg-rose-50/50"}>
                        <td className="px-4 py-3 font-mono font-bold text-xs">{r.regNo}</td>
                        <td className="px-4 py-3 font-bold text-slate-700">{r.studentName}</td>
                        <td className="px-4 py-3 font-black text-emerald-600">₦{r.amount.toLocaleString()}</td>
                        <td className="px-4 py-3 font-bold text-slate-500">{r.term}</td>
                        <td className="px-4 py-3 font-bold text-slate-500">{r.session}</td>
                        <td className="px-4 py-3 font-black text-slate-600">₦{r.balance.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${r.isValid ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                            {r.isValid ? 'Valid' : 'Not Found'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button onClick={handleUploadPayments} disabled={uploading}
                className="w-full bg-indigo-600 text-white font-black py-4 rounded-xl hover:bg-indigo-700 transition flex justify-center items-center gap-2">
                {uploading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                Confirm and Process Payments
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const AnalysisView = () => {
    const dynamicClasses = getUniqueClasses([
      ...classes,
      ...allStudents.map(s => s.className || s.class_name || s.CLASS || '').filter(Boolean),
      ...DEFAULT_CLASSES
    ]);

    const classBreakdown = dynamicClasses.map(cls => {
      const students = allStudents.filter(s => {
        const c = normalizeClassName(s.className || s.class_name || s.CLASS || '');
        return c === cls;
      });
      const expected = students.reduce((sum, s) => sum + (parseFloat(s.expectedFee) || 0), 0);
      const collected = students.reduce((sum, s) => sum + (parseFloat(s.paidFee) || parseFloat(s.paidAmount) || 0), 0);
      return { cls, students: students.length, expected, collected, balance: Math.max(0, expected - collected) };
    });

    const collectedPct = stats.totalExpected > 0 ? Math.round((stats.totalCollected / stats.totalExpected) * 100) : 0;
    const r = 60, cx = 75, cy = 75;
    const angle = (collectedPct / 100) * 2 * Math.PI;
    const x1 = cx + r * Math.sin(angle);
    const y1 = cy - r * Math.cos(angle);
    const largeArc = collectedPct > 50 ? 1 : 0;

    return (
      <div className="space-y-8 mt-6">
        <SchoolManagementDashboard userRole="bursar" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pie Chart */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col items-center">
            <h4 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-4 text-center">Collection Ratio</h4>
            <svg width="150" height="150" viewBox="0 0 150 150">
              <circle cx={cx} cy={cy} r={r} fill="#f1f5f9" />
              {collectedPct > 0 && collectedPct < 100 && (
                <path d={`M ${cx} ${cy - r} A ${r} ${r} 0 ${largeArc} 1 ${x1} ${y1} L ${cx} ${cy} Z`} fill="#10b981" />
              )}
              {collectedPct >= 100 && <circle cx={cx} cy={cy} r={r} fill="#10b981" />}
              <circle cx={cx} cy={cy} r={40} fill="white" />
              <text x={cx} y={cy + 6} textAnchor="middle" fontSize="16" fontWeight="900" fill="#0f172a"><AnimatedCounter end={collectedPct} />%</text>
            </svg>
            <div className="flex gap-4 mt-2 text-xs font-bold">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"/> Collected</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-slate-200 inline-block"/> Outstanding</span>
            </div>
            <div className="mt-3 text-center text-sm font-bold text-slate-600">
              <p>Total Revenue Expected: ₦{stats.totalExpected.toLocaleString()}</p>
              <p>Total Revenue Collected: ₦{stats.totalCollected.toLocaleString()}</p>
              <p>Outstanding Balance: ₦{stats.totalOutstanding.toLocaleString()}</p>
            </div>
          </div>

          {/* Bar Chart by Class */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <h4 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-4">Collection by Class</h4>
            <div className="space-y-4">
              {classBreakdown.map(c => (
                <div key={c.cls}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-black text-slate-600">{c.cls}</span>
                    <span className="text-xs font-bold text-slate-400">₦{c.collected.toLocaleString()} / ₦{c.expected.toLocaleString()} ({c.expected > 0 ? Math.round((c.collected / c.expected) * 100) : 0}%)</span>
                  </div>
                  <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-700"
                      style={{ width: c.expected > 0 ? `${Math.min(100, Math.round((c.collected / c.expected) * 100))}%` : '0%' }} />
                  </div>
                </div>
              ))}
              {classBreakdown.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No fee data yet.</p>}
            </div>
          </div>
        </div>

        {/* Historical Entry Chart */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <h4 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-1">Historical Fee Comparison</h4>
          <p className="text-xs text-slate-400 mb-4">Enter and review previous sessions' totals to track growth trends.</p>
          <OldFeesAnalytics currentCollected={stats.totalCollected} currentExpected={stats.totalExpected} />
        </div>

        {/* Payment Reset Date & Security Audit Log in Analysis Report */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900">Payment Reset & Security Audit Trail</h4>
                <p className="text-xs text-slate-500">Official log of payment wipes authorized via Admin Inbox 4-Digit PIN.</p>
              </div>
            </div>
            <button 
              onClick={handleRequestResetPin}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs transition"
            >
              <Key size={14} /> Request Payment Reset PIN
            </button>
          </div>

          {/* Last Reset Banner */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Clock size={20} className="text-indigo-600 shrink-0" />
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Last Payment Reset Recorded</span>
                <span className="text-sm font-black text-slate-800">
                  {lastResetInfo ? lastResetInfo.formattedDate : 'No Payment Resets Recorded Yet'}
                </span>
              </div>
            </div>
            {lastResetInfo && (
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black flex items-center gap-1">
                  <CheckCheck size={14} /> Admin 2FA PIN Verified
                </span>
                <span className="text-xs font-bold text-slate-500">
                  By {lastResetInfo.bursarName} ({lastResetInfo.studentsCount} students reset)
                </span>
              </div>
            )}
          </div>

          {/* Historical Resets Table */}
          {(resetsHistory || []).length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-black uppercase">
                    <th className="py-2.5 px-3">Date & Time</th>
                    <th className="py-2.5 px-3">Bursar / Requester</th>
                    <th className="py-2.5 px-3">Students Reset</th>
                    <th className="py-2.5 px-3">Wiped Collections</th>
                    <th className="py-2.5 px-3">Security 2FA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {(resetsHistory || []).map((rh) => (
                    <tr key={rh.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-bold text-slate-900">{rh.formattedDate}</td>
                      <td className="py-3 px-3">{rh.bursarName}</td>
                      <td className="py-3 px-3 font-bold">{rh.studentsCount} Students</td>
                      <td className="py-3 px-3 font-mono font-bold text-rose-600">₦{(rh.wipedCollected || 0).toLocaleString()}</td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          <CheckCheck size={12} /> Admin PIN Verified
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-4 italic">No payment reset records found in the audit history.</p>
          )}
        </div>
      </div>
    );
  };

  const StaffPayView = () => {
    const [staffList, setStaffList] = useState([]);
    const [payments, setPayments] = useState([]);
    const [selectedStaff, setSelectedStaff] = useState(null);
    const [salaryAmount, setSalaryAmount] = useState('');
    const [payMethod, setPayMethod] = useState('Transfer');
    const [payMonth, setPayMonth] = useState('January');
    const [payYear, setPayYear] = useState('2026');
    const [saving, setSaving] = useState(false);
    const [loadingStaff, setLoadingStaff] = useState(true);

    const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const YEARS = ['2025', '2026', '2027', '2028'];

    const fetchStaffData = async () => {
      setLoadingStaff(true);
      try {
        await ensureFirebaseAuth();
        const snap = await getDocs(collection(db, 'staff'));
        setStaffList(snap.docs.map(d => ({ id: d.id, ...d.data() })));

        try {
          const paySnap = await getDocs(collection(db, 'staff_payments'));
          setPayments(paySnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => b.createdAt?.seconds - a.createdAt?.seconds));
        } catch (payErr) {
          console.warn("Could not fetch staff payments:", payErr);
          setPayments([]);
        }
      } catch (err) {
        console.error(err);
        setStatus({
          type: 'error',
          message: (typeof navigator !== 'undefined' && !navigator.onLine)
            ? 'Offline: Showing cached staff payroll data.'
            : 'Access denied: Unable to fetch staff database.'
        });
      } finally {
        setLoadingStaff(false);
      }
    };

    useEffect(() => {
      fetchStaffData();
    }, []);

    const handlePayStaff = async () => {
      if (!selectedStaff || !salaryAmount) return;
      const amt = parseFloat(salaryAmount);
      if (isNaN(amt) || amt <= 0) { alert('Enter a valid salary amount.'); return; }

      setSaving(true);
      try {
        const payload = {
          staffId: selectedStaff.staffId || 'N/A',
          name: selectedStaff.name,
          role: selectedStaff.role || 'N/A',
          amount: amt,
          month: payMonth,
          year: payYear,
          method: payMethod,
          date: new Date().toLocaleDateString('en-NG'),
          createdAt: serverTimestamp()
        };

        await addDoc(collection(db, 'staff_payments'), payload);
        alert(`Successfully recorded manual salary payment of ₦${amt.toLocaleString()} for ${selectedStaff.name}.`);
        setSalaryAmount('');
        setSelectedStaff(null);
        fetchStaffData();
      } catch (err) {
        console.error(err);
        alert('Failed to record staff payment.');
      } finally {
        setSaving(false);
      }
    };

    return (
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-8">
        <div className="xl:col-span-2 bg-white p-6 border border-slate-200 rounded-3xl shadow-sm">
          <h3 className="text-lg font-black text-slate-900 mb-6">Staff Payroll Directory</h3>
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 sticky top-0 text-xs font-black uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3">Staff ID</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {staffList.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-bold text-xs">{s.staffId}</td>
                    <td className="px-4 py-3 font-bold text-slate-700">{s.name}</td>
                    <td className="px-4 py-3 font-bold text-slate-500">{s.role || 'N/A'}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setSelectedStaff(s)}
                        className="px-4 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-xs font-black uppercase transition-colors">
                        Pay Salary
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="text-lg font-black text-slate-900 mt-10 mb-4 border-t pt-6">Salary Disbursement Log</h3>
          <div className="overflow-x-auto max-h-60 border border-slate-100 rounded-2xl">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-slate-50 text-xs font-black uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Staff Name</th>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map(p => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 font-bold text-slate-400">{p.date}</td>
                    <td className="px-4 py-3 font-bold text-slate-700">{p.name}</td>
                    <td className="px-4 py-3 font-bold text-slate-500">{p.month} {p.year}</td>
                    <td className="px-4 py-3 font-bold text-slate-500">{p.method}</td>
                    <td className="px-4 py-3 text-right font-black text-rose-600">₦{p.amount.toLocaleString()}</td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr><td colSpan="5" className="text-center py-6 text-slate-400 font-bold italic">No salary payments recorded yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white p-6 border border-slate-200 rounded-3xl shadow-sm h-fit">
          <h3 className="text-lg font-black text-slate-900 mb-6">Manual Salary Entry</h3>
          {selectedStaff ? (
            <div className="space-y-6">
              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
                <p className="font-black text-indigo-900">{selectedStaff.name}</p>
                <p className="text-xs text-indigo-600 font-bold">Role: {selectedStaff.role || 'N/A'} • ID: {selectedStaff.staffId}</p>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Disbursement Period</label>
                <div className="grid grid-cols-2 gap-3">
                  <select value={payMonth} onChange={e => setPayMonth(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 outline-none text-sm font-bold">
                    {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <select value={payYear} onChange={e => setPayYear(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 outline-none text-sm font-bold">
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Payment Method</label>
                <select value={payMethod} onChange={e => setPayMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 outline-none text-sm font-bold">
                  <option value="Transfer">Bank Transfer</option>
                  <option value="Cash">Cash payment</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Salary Amount (₦)</label>
                <input type="number" value={salaryAmount} onChange={e => setSalaryAmount(e.target.value)} placeholder="e.g. 150000"
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 outline-none font-black text-lg text-slate-900" />
              </div>

              <div className="flex gap-2">
                <button onClick={() => setSelectedStaff(null)} className="flex-1 py-3 border-2 border-slate-200 rounded-xl font-bold text-sm text-slate-500">Cancel</button>
                <button onClick={handlePayStaff} disabled={saving}
                  className="flex-1 bg-green-600 text-white font-black py-3 rounded-xl hover:bg-green-700 transition flex justify-center items-center gap-2">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : 'Record Salary'}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 font-bold italic">
              Select a staff member from the list to start salary entry.
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full border-2 border-indigo-100 bg-indigo-50 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
            {currentAdmin?.photo ? (
              <img src={currentAdmin.photo} alt="Profile" className="w-full h-full object-cover rounded-full" />
            ) : (
              <User size={28} className="text-indigo-600" />
            )}
          </div>
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              Treasury Master
            </h2>
            <p className="text-slate-500 font-medium mt-2">Welcome back, {currentAdmin?.name || 'GTI'}. Centralized financial intelligence and fee management.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleRequestResetPin}
            className="flex items-center gap-2 bg-rose-600 text-white px-6 py-3.5 rounded-2xl font-bold hover:bg-rose-700 transition-all active:scale-95 text-sm shadow-xl shadow-rose-200"
          >
            <ShieldAlert size={18} />
            Reset All Fees
          </button>
          <button 
            onClick={async () => {
              const conf = window.confirm('Are you sure you want to HARD CLEAR ALL fees (expected and collected) to 0 for all students?');
              if (!conf) return;
              try {
                const { writeBatch, doc } = await import('firebase/firestore');
                let batch = writeBatch(db);
                let count = 0;
                for (const student of allStudents) {
                  batch.update(doc(db, 'students', student.id), { paidFee: 0, paidAmount: 0, expectedFee: 0 });
                  count++;
                  if (count % 300 === 0) {
                    await batch.commit();
                    batch = writeBatch(db);
                  }
                }
                if (count % 300 !== 0) await batch.commit();
                alert(`Successfully cleared all fees (expected & collected) for ${count} students.`);
              } catch (e) {
                console.error(e);
                alert('Error clearing fees: ' + e.message);
              }
            }}
            className="flex items-center gap-2 bg-orange-600 text-white px-6 py-3.5 rounded-2xl font-bold hover:bg-orange-700 transition-all active:scale-95 text-sm shadow-xl shadow-orange-200"
          >
            <RefreshCw size={18} />
            Hard Clear ALL Fees
          </button>
        </div>
      </div>

      {/* Premium Navigation Tabs — Horizontally Scrollable Pills with Glassmorphism */}
      <div className="flex overflow-x-auto hide-scrollbar gap-2 md:gap-3 p-2 bg-slate-100/70 backdrop-blur-md rounded-xl md:rounded-2xl w-full border border-white/60 shadow-inner">
        {sidebarTabs.map((tab, index) => (
          <button
            key={tab.id}
            onClick={() => navigateTo(tab.id)}
            className={`flex items-center gap-2 md:gap-2.5 px-3.5 py-2.5 md:px-5 md:py-3 min-w-max rounded-xl transition-all duration-300 font-bold text-[13px] md:text-sm tracking-wide ${
              activeView === tab.id 
                ? 'bg-white text-green-700 shadow-sm ring-1 ring-slate-200/60 transform scale-[1.02]' 
                : index < 4 
                    ? 'text-green-600 hover:bg-white/60 hover:text-green-800 hover:shadow-sm' 
                    : 'text-orange-500 hover:bg-white/60 hover:text-orange-700 hover:shadow-sm'
            }`}
          >
            <div className={`transition-colors duration-300 ${
              activeView === tab.id 
                ? 'text-green-600' 
                : index < 4 
                    ? 'text-green-500 group-hover:text-green-600' 
                    : 'text-orange-400 group-hover:text-orange-500'
            }`}>
              <tab.icon className="w-4 h-4 md:w-[18px] md:h-[18px]" strokeWidth={activeView === tab.id ? 2.5 : 2} />
            </div>
            <span className="whitespace-nowrap">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Dynamic Content Area */}
      {loading && activeView !== 'overview' ? (
        <div className="flex justify-center items-center py-24">
          <Loader2 size={40} className="animate-spin text-indigo-600" />
        </div>
      ) : (
        <div className="tab-content-animate" key={activeView}>
          
          {activeView === 'overview' && (
            <div className="space-y-8">
              {/* Stats Grid with Analytics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                {statCards.map((stat, idx) => (
                  <div key={idx} className={`p-6 rounded-3xl border border-slate-100 bg-white shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group overflow-hidden relative`}>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                      <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
                        <stat.icon size={24} />
                      </div>
                    </div>
                    <div className="relative z-10">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                      <h3 className="text-3xl font-black text-slate-900">{typeof stat.value === 'number' && idx !== 5 ? '₦' : ''}{stat.value.toLocaleString()}</h3>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-8 rounded-[2.5rem] relative overflow-hidden shadow-2xl">
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-10">
                    <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                      <Briefcase size={24} />
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Budget Performance</p>
                      <p className="text-sm font-bold">Current Session</p>
                    </div>
                  </div>
                  <h3 className="text-slate-400 text-xs font-bold tracking-widest uppercase mb-2">Total Expected Revenue</h3>
                  <div className="text-4xl font-black mb-10">₦{stats.totalExpected.toLocaleString()}</div>
                  <div className="space-y-6 max-w-2xl">
                    <div>
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2 text-slate-400">
                        <span>Collection Progress</span>
                        <span>{stats.totalExpected > 0 ? Math.round((stats.totalCollected / stats.totalExpected) * 100) : 0}% (₦{stats.totalCollected.toLocaleString()} / ₦{stats.totalExpected.toLocaleString()})</span>
                      </div>
                      <div className="h-3 w-full bg-slate-700/50 rounded-full overflow-hidden border border-slate-600/50 p-0.5">
                        <div 
                          style={{ width: `${stats.totalExpected > 0 ? Math.round((stats.totalCollected / stats.totalExpected) * 100) : 0}%` }} 
                          className="h-full bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute -right-20 -top-20 w-64 h-64 bg-indigo-500 rounded-full blur-[80px] opacity-20"></div>
              </div>
            </div>
          )}

          {activeView === 'overview' && (() => {
            const classBreakdown = classes.map(cls => {
              const students = allStudents.filter(s => {
                const c = s.className || s.class_name || s.CLASS || '';
                return c.replace(/\s+/g, '').toUpperCase() === cls.replace(/\s+/g, '').toUpperCase();
              });
              const expected = students.reduce((sum, s) => sum + (parseFloat(s.expectedFee) || 0), 0);
              const collected = students.reduce((sum, s) => sum + (parseFloat(s.paidFee) || parseFloat(s.paidAmount) || 0), 0);
              return { cls, students: students.length, expected, collected };
            });

            // Section color helper — dark themed, unique per level
            const getClassColors = (cls) => {
              const c = cls.toUpperCase().replace(/\s+/g, '');
              if (c.startsWith('NURSERY') || c.startsWith('NUR'))  return { bg: 'bg-pink-900',   bar: 'from-pink-400 to-pink-600',   badge: 'bg-pink-900 text-pink-200',   label: 'Nursery' };
              if (c.startsWith('BASIC1') || c.startsWith('BASIC2') || c.startsWith('BASIC3')) return { bg: 'bg-blue-900', bar: 'from-blue-400 to-blue-600', badge: 'bg-blue-900 text-blue-200', label: 'Basic (Lower)' };
              if (c.startsWith('BASIC4') || c.startsWith('BASIC5')) return { bg: 'bg-cyan-900',   bar: 'from-cyan-400 to-cyan-600',   badge: 'bg-cyan-900 text-cyan-200',   label: 'Basic (Upper)' };
              if (c.startsWith('BASIC')) return { bg: 'bg-sky-900',    bar: 'from-sky-400 to-sky-600',   badge: 'bg-sky-900 text-sky-200',   label: 'Basic' };
              if (c.startsWith('JSS1') || c.startsWith('JSS2') || c.startsWith('JSS3')) return { bg: 'bg-violet-900',  bar: 'from-violet-400 to-violet-600',  badge: 'bg-violet-900 text-violet-200', label: 'JSS' };
              if (c.startsWith('JSS'))  return { bg: 'bg-purple-900', bar: 'from-purple-400 to-purple-600', badge: 'bg-purple-900 text-purple-200', label: 'JSS' };
              if (c.startsWith('SS1') || c.startsWith('SSS1')) return { bg: 'bg-emerald-900', bar: 'from-emerald-400 to-emerald-600', badge: 'bg-emerald-900 text-emerald-200', label: 'SS' };
              if (c.startsWith('SS2') || c.startsWith('SSS2')) return { bg: 'bg-teal-900',    bar: 'from-teal-400 to-teal-600',    badge: 'bg-teal-900 text-teal-200',    label: 'SS' };
              if (c.startsWith('SS3') || c.startsWith('SSS3')) return { bg: 'bg-green-900',   bar: 'from-green-400 to-green-600',  badge: 'bg-green-900 text-green-200',  label: 'SS' };
              if (c.startsWith('SS') || c.startsWith('SSS')) return { bg: 'bg-emerald-900',  bar: 'from-emerald-400 to-emerald-600', badge: 'bg-emerald-900 text-emerald-200', label: 'SS' };
              return { bg: 'bg-slate-800', bar: 'from-slate-400 to-slate-600', badge: 'bg-slate-800 text-slate-200', label: '' };
            };

            const collectedPct = stats.totalExpected > 0 ? Math.round((stats.totalCollected / stats.totalExpected) * 100) : 0;
            const r = 60, cx = 75, cy = 75;
            const angle = (collectedPct / 100) * 2 * Math.PI;
            const x1 = cx + r * Math.sin(angle);
            const y1 = cy - r * Math.cos(angle);
            const largeArc = collectedPct > 50 ? 1 : 0;
            return (
              <div className="space-y-8 mt-6" key="analytics">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col items-center">
                    <h4 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-4 text-center">Collection Ratio</h4>
                    <svg width="150" height="150" viewBox="0 0 150 150">
                      <circle cx={cx} cy={cy} r={r} fill="#f1f5f9" />
                      {collectedPct > 0 && collectedPct < 100 && (
                        <path d={`M ${cx} ${cy - r} A ${r} ${r} 0 ${largeArc} 1 ${x1} ${y1} L ${cx} ${cy} Z`} fill="#10b981" />
                      )}
                      {collectedPct >= 100 && <circle cx={cx} cy={cy} r={r} fill="#10b981" />}
                      <circle cx={cx} cy={cy} r={40} fill="white" />
                      <text x={cx} y={cy + 6} textAnchor="middle" fontSize="16" fontWeight="900" fill="#0f172a"><AnimatedCounter end={collectedPct} />%</text>
                    </svg>
                    <div className="flex gap-4 mt-2 text-xs font-bold">
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"/> Collected</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-slate-200 inline-block"/> Outstanding</span>
                    </div>
                    <div className="mt-3 text-center">
                      <p className="text-xs text-slate-400">Collected: <span className="font-black text-emerald-600">₦{stats.totalCollected.toLocaleString()}</span></p>
                      <p className="text-xs text-slate-400">Outstanding: <span className="font-black text-rose-500">₦{stats.totalOutstanding.toLocaleString()}</span></p>
                    </div>
                  </div>
                  <div className="lg:col-span-2 bg-slate-900 rounded-3xl shadow-sm p-6">
                    <h4 className="text-sm font-black text-slate-300 uppercase tracking-widest mb-5">Collection by Class</h4>
                    <div className="space-y-3">
                      {classBreakdown.map(c => {
                        const colors = getClassColors(c.cls);
                        const pct = c.expected > 0 ? Math.min(100, Math.round((c.collected / c.expected) * 100)) : 0;
                        return (
                          <div key={c.cls} className={`rounded-xl px-3 py-2 ${colors.bg} bg-opacity-80`}>
                            <div className="flex justify-between items-center mb-1.5">
                              <span className="text-xs font-black text-white">{c.cls}</span>
                              <span className="text-xs font-bold text-slate-400">₦{c.collected.toLocaleString()} / ₦{c.expected.toLocaleString()}</span>
                            </div>
                            <div className="h-2.5 w-full bg-black/30 rounded-full overflow-hidden">
                              <div className={`h-full bg-gradient-to-r ${colors.bar} rounded-full`}
                                style={{ width: `${pct}%` }} />
                            </div>
                            <div className="text-right text-[10px] font-bold text-slate-400 mt-0.5">{pct}%</div>
                          </div>
                        );
                      })}
                      {classBreakdown.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No fee data yet.</p>}
                    </div>
                  </div>
                </div>
                <OldFeesAnalytics currentCollected={stats.totalCollected} currentExpected={stats.totalExpected} />
              </div>
            );
          })()}

          {activeView === 'overview' && (
            <div className="mt-12 bg-rose-50 border border-rose-200 rounded-3xl p-8 flex flex-col items-center text-center max-w-xl mx-auto shadow-sm">
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldAlert size={32} />
              </div>
              <h4 className="text-xl font-black text-rose-900 mb-2">Emergency Fee Reset</h4>
              <p className="text-sm text-rose-700 mb-6">This action will instantly wipe all expected and paid fee records for EVERY student in the database, setting them to ₦0. For maximum security, a 4-digit PIN is sent to the Admin Inbox.</p>
              <button 
                onClick={handleRequestResetPin}
                className="bg-rose-600 hover:bg-rose-700 text-white font-black px-8 py-3 rounded-xl transition-all shadow-lg hover:shadow-xl active:scale-95 flex items-center gap-2 mx-auto"
              >
                <Key size={18} /> Request Admin PIN & Reset ALL Fees
              </button>
            </div>
          )}

          {activeView === 'expenses' && <ExpensesView />}
          {activeView === 'classmanage' && <ClassManagement isBursar={true} />}
          {activeView === 'feesetting' && <FeeSettingView />}
          {activeView === 'receipts' && <PrintReceiptView />}
          {activeView === 'debtors' && <DebtorsView />}
          {activeView === 'newintakes' && <NewIntakesView />}
          {activeView === 'store' && <StoreView allStudents={allStudents} />}
          {activeView === 'dailyincome' && <DailyIncomeView />}
          {activeView === 'messages' && <MessageHubView />}
          {activeView === 'cashpay' && <CashPaymentView />}
          {activeView === 'register' && <RegisterStudentView />}
          {activeView === 'bulkpay' && <BulkPayView />}
          {activeView === 'analysis' && <AnalysisView />}
          {activeView === 'staffpay' && <StaffPayView />}

        </div>
      )}

      {/* 2FA Admin PIN Verification Modal for Payment Reset */}
      {showPinModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                  <Lock size={20} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-lg">Admin 2FA Authorization</h3>
                  <p className="text-xs text-slate-500 font-bold">Payment Reset Security Check</p>
                </div>
              </div>
              <button 
                onClick={() => setShowPinModal(false)} 
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X size={16} />
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 mb-5 text-amber-900 text-xs font-medium leading-relaxed">
              🛡️ **Max Security Protocol Active**<br />
              A **4-Digit Authorization PIN** has been sent to the **Admin Inbox** and can also be sent directly to Admin WhatsApp (**+234 9066202949**).
            </div>

            {resetWhatsAppUrl && (
              <a
                href={resetWhatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full mb-4 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition shadow-md shadow-emerald-200 flex items-center justify-center gap-2"
              >
                <MessageSquare size={16} /> Send PIN to Admin WhatsApp (+234 9066202949)
              </a>
            )}

            <form onSubmit={handleVerifyPinAndResetFees} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 text-center">
                  Enter 4-Digit Authorization PIN
                </label>
                <input 
                  type="text" 
                  maxLength={4}
                  autoFocus
                  value={enteredPin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setEnteredPin(val);
                    if (pinError) setPinError('');
                  }}
                  placeholder="••••"
                  className="w-full text-center text-3xl font-mono font-black tracking-[0.5em] py-3 rounded-2xl bg-slate-50 border-2 border-slate-200 focus:border-rose-500 outline-none transition"
                />
                {pinError && (
                  <p className="text-xs text-rose-600 font-bold mt-2 text-center flex items-center justify-center gap-1">
                    <AlertCircle size={14} /> {pinError}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={handleRequestResetPin}
                  disabled={pinSending}
                  className="text-indigo-600 hover:text-indigo-800 font-black flex items-center gap-1"
                >
                  <RefreshCw size={12} className={pinSending ? "animate-spin" : ""} /> Resend PIN to Admin Inbox
                </button>
                <span className="text-slate-400 font-bold">Valid for 15 mins</span>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPinModal(false)}
                  className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pinSending || enteredPin.length !== 4}
                  className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs transition shadow-lg shadow-rose-200 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {pinSending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                  Verify & Reset Fees
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {status.message && (
        <div className={`fixed bottom-8 right-8 p-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-8 ${
          status.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
        } text-white z-50`}>
          {status.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span className="font-bold tracking-tight">{status.message}</span>
        </div>
      )}
    </div>
  );
};

export default BursarDashboard;