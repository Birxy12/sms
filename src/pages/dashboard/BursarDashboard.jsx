import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../lib/firebase';
import { ensureFirebaseAuth } from '../../lib/ensureAuth';
import { collection, query, getDocs, orderBy, where, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { 
  Wallet, DollarSign, TrendingUp, TrendingDown, Users, 
  Search, Download, Plus, ArrowUpRight, 
  CheckCircle, AlertCircle, Loader2, Briefcase, Settings, Printer, MessageSquare, AlertTriangle, FileText, UserPlus, Banknote,
  FileSpreadsheet
} from 'lucide-react';
import { addDoc, serverTimestamp } from 'firebase/firestore';
import { useTheme } from '../../context/ThemeContext';
import Papa from 'papaparse';

const OldFeesAnalytics = ({ currentCollected, currentExpected }) => {
  const [oldFees, setOldFees] = useState(() => {
    const saved = localStorage.getItem('historical_fees');
    return saved ? JSON.parse(saved) : [
      { session: '2023/2024', expected: 12000000, collected: 11500000 },
      { session: '2024/2025', expected: 15000000, collected: 14200000 }
    ];
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
          <button onClick={handleClear} className="text-xs text-rose-600 hover:text-rose-800 font-bold">Clear History</button>
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

const BursarDashboard = () => {
  const { primaryColor, schoolName } = useTheme();
  const location = window.location;
  const [activeView, setActiveView] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') || 'overview';
  });
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [preSelectedStudent, setPreSelectedStudent] = useState(null);
  
  // Data state
  const [allStudents, setAllStudents] = useState([]);
  const [paymentMessages, setPaymentMessages] = useState([]);
  const [stats, setStats] = useState({
    totalExpected: 0,
    totalCollected: 0,
    totalOutstanding: 0,
    totalStudents: 0
  });

  const classes = ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2 ART', 'SS2 SCIENCE', 'SS3 ART', 'SS3 SCIENCE'];

  const fetchFinancialData = async () => {
    setLoading(true);
    try {
      await ensureFirebaseAuth();
      const snap = await getDocs(collection(db, 'students'));
      const students = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllStudents(students);

      let expected = 0;
      let collected = 0;
      students.forEach(s => {
        const pFee = parseFloat(s.paidFee) || 0;
        const eFee = parseFloat(s.expectedFee) || 0;
        collected += pFee;
        expected += eFee;
      });

      setStats({
        totalExpected: expected,
        totalCollected: collected,
        totalOutstanding: Math.max(0, expected - collected),
        totalStudents: students.length
      });
      
      // Fetch payment messages (mock structure for now, assuming students send to 'payment_messages')
      try {
        const msgSnap = await getDocs(query(collection(db, 'payment_messages'), orderBy('createdAt', 'desc')));
        setPaymentMessages(msgSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.log("No payment messages collection yet or index missing.");
      }
    } catch (error) {
      console.error(error);
      setStatus({ type: 'error', message: 'Failed to load financial records.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancialData();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab')) {
      setActiveView(params.get('tab'));
    }
  }, [window.location.search]);

  const handleResetFees = async () => {
    if (!window.confirm("CRITICAL WARNING: This will set ALL students' paid and expected fees to 0 Naira. Proceed?")) return;
    
    setLoading(true);
    setStatus({ type: 'info', message: 'Wiping all fee records...' });
    
    try {
      const batch = writeBatch(db);
      let count = 0;
      
      for (const student of allStudents) {
        const ref = doc(db, 'students', student.id);
        batch.update(ref, { paidFee: 0, expectedFee: 0, lastPaymentDate: 'N/A' });
        count++;
        // commit in chunks if needed, but usually school size is < 500
        if (count % 450 === 0) {
          await batch.commit();
        }
      }
      
      if (count % 450 !== 0) {
        await batch.commit();
      }
      
      await fetchFinancialData();
      setStatus({ type: 'success', message: `Successfully cleared fees for ${count} students.` });
    } catch (error) {
      console.error(error);
      setStatus({ type: 'error', message: 'Failed to reset fees.' });
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: 'Total Expected (₦)', value: stats.totalExpected, icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Total Collected (₦)', value: stats.totalCollected, icon: Wallet, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Outstanding (₦)', value: stats.totalOutstanding, icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Total Students', value: stats.totalStudents, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
  ];

  const sidebarTabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp, color: 'indigo' },
    { id: 'feesetting', label: 'Fee Setting', icon: Settings, color: 'blue' },
    { id: 'cashpay', label: 'Cash Payment', icon: Banknote, color: 'green' },
    { id: 'bulkpay', label: 'Bulk Upload', icon: Download, color: 'blue' },
    { id: 'receipts', label: 'Print Receipt', icon: Printer, color: 'emerald' },
    { id: 'register', label: 'Register Student', icon: UserPlus, color: 'violet' },
    { id: 'messages', label: 'Message Hub', icon: MessageSquare, color: 'purple' },
    { id: 'debtors', label: 'Debtors', icon: AlertTriangle, color: 'rose' },
    { id: 'analysis', label: 'Financial Analysis', icon: Briefcase, color: 'indigo' },
    { id: 'staffpay', label: 'Staff Payment', icon: Users, color: 'violet' },
  ];

  // --- Sub-Components for Tabs ---

  const FeeSettingView = () => {
    const [selectedClass, setSelectedClass] = useState('');
    const [feeAmount, setFeeAmount] = useState('');
    const [feeSession, setFeeSession] = useState('2025/2026');
    const [feeTerm, setFeeTerm] = useState('First Term');
    const [saving, setSaving] = useState(false);

    const handleSetFee = async (e) => {
      e.preventDefault();
      if (!selectedClass || !feeAmount) return;
      if (!window.confirm(`Set fee of ₦${feeAmount} for ALL students in ${selectedClass} for ${feeTerm} (${feeSession})?`)) return;

      setSaving(true);
      try {
        const batch = writeBatch(db);
        const targetStudents = allStudents.filter(s => 
          (s.className || s.class_name || s.CLASS) === selectedClass
        );

        targetStudents.forEach(s => {
          const ref = doc(db, 'students', s.id);
          batch.update(ref, { 
            expectedFee: parseFloat(feeAmount),
            lastPaymentTerm: feeTerm,
            lastPaymentSession: feeSession
          });
        });

        if (targetStudents.length > 0) {
          await batch.commit();
          await fetchFinancialData();
          setStatus({ type: 'success', message: `Updated expected fee for ${targetStudents.length} students in ${selectedClass}.` });
        } else {
          setStatus({ type: 'error', message: `No students found in ${selectedClass}.` });
        }
      } catch (err) {
        console.error(err);
        setStatus({ type: 'error', message: 'Failed to set fee.' });
      } finally {
        setSaving(false);
        setFeeAmount('');
      }
    };

    return (
      <div className="card-white p-8 max-w-2xl mx-auto mt-8 border border-slate-200 shadow-sm rounded-3xl">
        <div className="flex items-center gap-4 mb-8 border-b border-slate-100 pb-6">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <Settings size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900">Classwise Fee Setting</h3>
            <p className="text-sm text-slate-500">Set the expected total fee for a specific class.</p>
          </div>
        </div>

        <form onSubmit={handleSetFee} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Select Class</label>
              <select 
                value={selectedClass} 
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 outline-none font-bold"
                required
              >
                <option value="">Choose a class...</option>
                {classes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Expected Fee Amount (₦)</label>
              <input 
                type="number" 
                value={feeAmount} 
                onChange={(e) => setFeeAmount(e.target.value)}
                placeholder="e.g. 45000"
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 outline-none font-bold"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Session / Year</label>
              <select 
                value={feeSession} 
                onChange={(e) => setFeeSession(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 outline-none font-bold"
              >
                {SESSIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Term</label>
              <select 
                value={feeTerm} 
                onChange={(e) => setFeeTerm(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 outline-none font-bold"
              >
                {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <button type="submit" disabled={saving} className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 transition flex justify-center items-center gap-2">
            {saving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />} Apply Fee to Class
          </button>
        </form>
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
                          setActiveView('cashpay');
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

  const DebtorsView = () => {
    const debtors = allStudents.filter(s => {
      const eFee = parseFloat(s.expectedFee) || 0;
      const pFee = parseFloat(s.paidFee) || parseFloat(s.paidAmount) || 0;
      return eFee > 0 && pFee < eFee;
    }).sort((a, b) => {
      const balA = (parseFloat(a.expectedFee) || 0) - (parseFloat(a.paidFee) || parseFloat(a.paidAmount) || 0);
      const balB = (parseFloat(b.expectedFee) || 0) - (parseFloat(b.paidFee) || parseFloat(b.paidAmount) || 0);
      return balB - balA; // highest debt first
    });

    return (
      <div className="card-white p-6 mt-8 shadow-sm rounded-3xl border border-rose-100 bg-gradient-to-b from-white to-rose-50/30">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black text-rose-900 flex items-center gap-2">
            <AlertTriangle size={20} className="text-rose-600" /> Debtors List
          </h3>
          <div className="px-4 py-2 bg-rose-100 text-rose-700 rounded-xl text-sm font-black">
            {debtors.length} Students Owing
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
                const bal = (parseFloat(s.expectedFee) || 0) - (parseFloat(s.paidFee) || parseFloat(s.paidAmount) || 0);
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
                          setActiveView('cashpay');
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
      if (isNaN(amount) || amount <= 0) { alert('Enter a valid amount.'); return; }
      setSaving(true);
      try {
        const oldPaid = parseFloat(selectedStudent.paidFee) || parseFloat(selectedStudent.paidAmount) || 0;
        const newPaid = oldPaid + amount;
        const txnId = 'TXN-' + Math.floor(10000000 + Math.random() * 90000000);
        const serialNo = 'SN-' + Math.floor(100000 + Math.random() * 900000);
        const ref = doc(db, 'students', selectedStudent.id);
        await updateDoc(ref, {
          paidFee: newPaid, paidAmount: newPaid,
          lastPaymentDate: new Date().toLocaleDateString('en-NG'),
          lastTransactionId: txnId, lastSerialNo: serialNo,
          lastPaymentTerm: paymentTerm, lastPaymentSession: paymentSession,
        });
        await addDoc(collection(db, 'payment_messages'), {
          studentName: selectedStudent.name || selectedStudent['STUDENT NAME'],
          className: selectedStudent.className || selectedStudent.class_name || selectedStudent.CLASS,
          regNo: selectedStudent.regNo || selectedStudent.REGNO,
          amount, method: 'Cash', term: paymentTerm, session: paymentSession,
          transactionId: txnId, serialNo,
          message: `Cash payment of \u20a6${amount.toLocaleString()} received for ${paymentTerm}, ${paymentSession}.`,
          createdAt: serverTimestamp(),
        });
        setReceipt({ student: selectedStudent, amount, newPaid, date: new Date().toLocaleDateString('en-NG'), term: paymentTerm, session: paymentSession, txnId, serialNo });
        fetchFinancialData();
        setCashAmount(''); setSelectedStudent(null); setSearchTerm('');
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
              <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100 flex items-center justify-between">
                <div>
                  <p className="font-black text-indigo-900">{selectedStudent.name||selectedStudent['STUDENT NAME']}</p>
                  <p className="text-xs text-indigo-500 font-bold">{selectedStudent.regNo||selectedStudent.REGNO} \u2022 {selectedStudent.className||selectedStudent.CLASS}</p>
                  <p className="text-xs text-indigo-400 mt-1">Balance: ₦{Math.max(0,(parseFloat(selectedStudent.expectedFee)||0)-(parseFloat(selectedStudent.paidFee)||parseFloat(selectedStudent.paidAmount)||0)).toLocaleString()}</p>
                </div>
                <button onClick={() => { setSelectedStudent(null); setPreSelectedStudent(null); }} className="text-slate-400 hover:text-rose-500 text-xl font-bold">\u2715</button>
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
            <div>
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Cash Amount (\u20a6)</label>
              <input type="number" value={cashAmount} onChange={e => setCashAmount(e.target.value)} placeholder="Enter amount received"
                className="w-full px-4 py-4 rounded-xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 outline-none font-black text-2xl text-slate-900 transition-all" />
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
    const [form, setForm] = useState({ name: '', regNo: '', className: '', gender: '', phone: '', guardianName: '' });
    const [saving, setSaving] = useState(false);
    const [done, setDone] = useState(null);

    const generateRegNo = () => {
      const year = new Date().getFullYear();
      const rand = Math.floor(Math.random() * 9000 + 1000);
      return `BDS/${year}/${rand}`;
    };

    const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

    const handleRegister = async e => {
      e.preventDefault();
      setSaving(true);
      try {
        const regNo = form.regNo || generateRegNo();
        await addDoc(collection(db, 'students'), {
          name: form.name, regNo, className: form.className,
          gender: form.gender, guardianPhone: form.phone, guardianName: form.guardianName,
          paidFee: 0, expectedFee: 0, createdAt: serverTimestamp(), createdBy: 'bursar',
        });
        await fetchFinancialData();
        setDone(regNo);
        setForm({ name: '', regNo: '', className: '', gender: '', phone: '', guardianName: '' });
      } catch (e) { console.error(e); alert('Registration failed.'); }
      finally { setSaving(false); }
    };

    return (
      <div className="card-white p-8 mt-8 border border-slate-200 rounded-3xl shadow-sm max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8 border-b border-slate-100 pb-6">
          <div className="w-12 h-12 bg-violet-50 text-violet-600 rounded-xl flex items-center justify-center"><UserPlus size={24}/></div>
          <div><h3 className="text-xl font-black text-slate-900">Register New Student</h3><p className="text-sm text-slate-500">Add a student manually to the database.</p></div>
        </div>
        {done && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
            <CheckCircle size={20} className="text-emerald-600"/>
            <p className="font-black text-emerald-800 text-sm">Registered! Reg No: <span className="font-mono">{done}</span></p>
            <button onClick={() => setDone(null)} className="ml-auto text-emerald-600 font-bold text-xs underline">Register Another</button>
          </div>
        )}
        <form onSubmit={handleRegister} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              { label: 'Full Name', name: 'name', placeholder: 'e.g. John Doe', required: true },
              { label: 'Reg Number (auto if blank)', name: 'regNo', placeholder: 'BDS/2025/001' },
              { label: "Guardian's Name", name: 'guardianName', placeholder: "Mrs. Doe" },
              { label: "Guardian's Phone", name: 'phone', placeholder: '08012345678' },
            ].map(f => (
              <div key={f.name}>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">{f.label}</label>
                <input type="text" name={f.name} value={form[f.name]} onChange={handleChange} placeholder={f.placeholder} required={!!f.required}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-violet-500 outline-none font-bold text-slate-800 transition-all"/>
              </div>
            ))}
            <div>
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Class</label>
              <select name="className" value={form.className} onChange={handleChange} required
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-violet-500 outline-none font-bold text-slate-800 transition-all cursor-pointer">
                <option value="">Select Class</option>
                {classes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Gender</label>
              <select name="gender" value={form.gender} onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-violet-500 outline-none font-bold text-slate-800 transition-all cursor-pointer">
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
          </div>
          <button type="submit" disabled={saving}
            className="w-full bg-violet-600 text-white font-black py-4 rounded-xl hover:bg-violet-700 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <Loader2 size={20} className="animate-spin"/> : <UserPlus size={20}/>} Register Student
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
    const classBreakdown = classes.map(cls => {
      const students = allStudents.filter(s => (s.className || s.class_name || s.CLASS) === cls);
      const expected = students.reduce((sum, s) => sum + (parseFloat(s.expectedFee) || 0), 0);
      const collected = students.reduce((sum, s) => sum + (parseFloat(s.paidFee) || parseFloat(s.paidAmount) || 0), 0);
      return { cls, students: students.length, expected, collected, balance: Math.max(0, expected - collected) };
    }).filter(c => c.students > 0);

    const collectedPct = stats.totalExpected > 0 ? Math.round((stats.totalCollected / stats.totalExpected) * 100) : 0;
    const r = 60, cx = 75, cy = 75;
    const angle = (collectedPct / 100) * 2 * Math.PI;
    const x1 = cx + r * Math.sin(angle);
    const y1 = cy - r * Math.cos(angle);
    const largeArc = collectedPct > 50 ? 1 : 0;

    return (
      <div className="space-y-8 mt-6">
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
              <text x={cx} y={cy + 6} textAnchor="middle" fontSize="16" fontWeight="900" fill="#0f172a">{collectedPct}%</text>
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

        const paySnap = await getDocs(collection(db, 'staff_payments'));
        setPayments(paySnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => b.createdAt?.seconds - a.createdAt?.seconds));
      } catch (err) {
        console.error(err);
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
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200">
              <Wallet size={28} />
            </div>
            Treasury Master
          </h2>
          <p className="text-slate-500 font-medium mt-2">Centralized financial intelligence and fee management.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleResetFees}
            className="flex items-center gap-2 bg-rose-600 text-white px-6 py-3.5 rounded-2xl font-bold hover:bg-rose-700 transition-all active:scale-95 text-sm shadow-xl shadow-rose-200"
          >
            <AlertCircle size={18} />
            Reset All Fees
          </button>
        </div>
      </div>

      {/* Modern Navigation Tabs */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100/50 rounded-2xl w-fit">
        {sidebarTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black transition-all uppercase tracking-wider ${
              activeView === tab.id 
                ? `bg-white text-${tab.color}-600 shadow-sm ring-1 ring-slate-200` 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
                {statCards.map((stat, idx) => (
                  <div key={idx} className={`p-6 rounded-3xl border border-slate-100 bg-white shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group overflow-hidden relative`}>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                      <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
                        <stat.icon size={24} />
                      </div>
                    </div>
                    <div className="relative z-10">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                      <h3 className="text-3xl font-black text-slate-900">{typeof stat.value === 'number' && idx !== 3 ? '₦' : ''}{stat.value.toLocaleString()}</h3>
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
                        <span>{stats.totalExpected > 0 ? Math.round((stats.totalCollected / stats.totalExpected) * 100) : 0}% Collected</span>
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
              const students = allStudents.filter(s => (s.className || s.class_name || s.CLASS) === cls);
              const expected = students.reduce((sum, s) => sum + (parseFloat(s.expectedFee) || 0), 0);
              const collected = students.reduce((sum, s) => sum + (parseFloat(s.paidFee) || parseFloat(s.paidAmount) || 0), 0);
              return { cls, students: students.length, expected, collected };
            }).filter(c => c.students > 0);
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
                      <text x={cx} y={cy + 6} textAnchor="middle" fontSize="16" fontWeight="900" fill="#0f172a">{collectedPct}%</text>
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
                  <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                    <h4 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-4">Collection by Class</h4>
                    <div className="space-y-3">
                      {classBreakdown.map(c => (
                        <div key={c.cls}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-black text-slate-600">{c.cls}</span>
                            <span className="text-xs font-bold text-slate-400">₦{c.collected.toLocaleString()} / ₦{c.expected.toLocaleString()}</span>
                          </div>
                          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full"
                              style={{ width: c.expected > 0 ? `${Math.min(100, Math.round((c.collected / c.expected) * 100))}%` : '0%' }} />
                          </div>
                        </div>
                      ))}
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
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-rose-500 mb-4 shadow-sm">
                <AlertTriangle size={32} />
              </div>
              <h4 className="text-xl font-black text-rose-900 mb-2">Emergency Fee Reset</h4>
              <p className="text-sm text-rose-700 mb-6">This action will instantly wipe all expected and paid fee records for EVERY student in the database, setting them to ₦0. This cannot be undone.</p>
              <button 
                onClick={handleResetFees}
                className="bg-rose-600 hover:bg-rose-700 text-white font-black px-8 py-3 rounded-xl transition-all shadow-lg hover:shadow-xl active:scale-95"
              >
                Reset ALL Fees to ₦0
              </button>
            </div>
          )}

          {activeView === 'feesetting' && <FeeSettingView />}
          {activeView === 'receipts' && <PrintReceiptView />}
          {activeView === 'debtors' && <DebtorsView />}
          {activeView === 'messages' && <MessageHubView />}
          {activeView === 'cashpay' && <CashPaymentView />}
          {activeView === 'register' && <RegisterStudentView />}
          {activeView === 'bulkpay' && <BulkPayView />}
          {activeView === 'analysis' && <AnalysisView />}
          {activeView === 'staffpay' && <StaffPayView />}

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