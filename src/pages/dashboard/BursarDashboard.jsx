import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, getDocs, orderBy, where, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { 
  Wallet, DollarSign, TrendingUp, TrendingDown, Users, 
  Search, Download, Plus, ArrowUpRight, 
  CheckCircle, AlertCircle, Loader2, Briefcase, Settings, Printer, MessageSquare, AlertTriangle, FileText
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const BursarDashboard = () => {
  const { primaryColor, schoolName } = useTheme();
  const [activeView, setActiveView] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ type: '', message: '' });
  
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
    { id: 'receipts', label: 'Print Receipt', icon: Printer, color: 'emerald' },
    { id: 'messages', label: 'Message Hub', icon: MessageSquare, color: 'purple' },
    { id: 'debtors', label: 'Debtors', icon: AlertTriangle, color: 'rose' },
  ];

  // --- Sub-Components for Tabs ---

  const FeeSettingView = () => {
    const [selectedClass, setSelectedClass] = useState('');
    const [feeAmount, setFeeAmount] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSetFee = async (e) => {
      e.preventDefault();
      if (!selectedClass || !feeAmount) return;
      if (!window.confirm(`Set fee of ₦${feeAmount} for ALL students in ${selectedClass}?`)) return;

      setSaving(true);
      try {
        const batch = writeBatch(db);
        const targetStudents = allStudents.filter(s => 
          (s.className || s.class_name || s.CLASS) === selectedClass
        );

        targetStudents.forEach(s => {
          const ref = doc(db, 'students', s.id);
          batch.update(ref, { expectedFee: parseFloat(feeAmount) });
        });

        if (targetStudents.length > 0) {
          await batch.commit();
          await fetchFinancialData();
          setStatus({ type: 'success', message: `Updated fee for ${targetStudents.length} students in ${selectedClass}.` });
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

    const targetStudents = allStudents.filter(s => {
      const matchClass = selectedClass ? (s.className || s.class_name || s.CLASS) === selectedClass : true;
      const name = s.name || s['STUDENT NAME'] || '';
      const matchSearch = name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchClass && matchSearch;
    });

    const handlePrint = (student) => {
      const pFee = parseFloat(student.paidFee) || 0;
      const eFee = parseFloat(student.expectedFee) || 0;
      const bal = eFee - pFee;

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
              .signature { margin-top: 50px; border-top: 1px solid #cbd5e1; width: 200px; padding-top: 10px; text-align: center; float: right; font-weight: bold;}
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
          <div className="flex gap-2 w-full md:w-auto">
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
                    <button 
                      onClick={() => handlePrint(s)}
                      className="px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-xs font-black uppercase tracking-wider transition-colors"
                    >
                      Print
                    </button>
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
      const pFee = parseFloat(s.paidFee) || 0;
      return eFee > 0 && pFee < eFee;
    }).sort((a, b) => {
      const balA = (parseFloat(a.expectedFee) || 0) - (parseFloat(a.paidFee) || 0);
      const balB = (parseFloat(b.expectedFee) || 0) - (parseFloat(b.paidFee) || 0);
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
              </tr>
            </thead>
            <tbody className="divide-y divide-rose-50">
              {debtors.map(s => {
                const bal = (parseFloat(s.expectedFee) || 0) - (parseFloat(s.paidFee) || 0);
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

          {activeView === 'feesetting' && <FeeSettingView />}
          {activeView === 'receipts' && <PrintReceiptView />}
          {activeView === 'debtors' && <DebtorsView />}
          {activeView === 'messages' && <MessageHubView />}

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