import React, { useState, useEffect } from 'react';
import { useStudentAuth } from '../../context/StudentAuthContext';
import { db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useTheme } from '../../context/ThemeContext';
import { DollarSign, CreditCard, Clock, AlertTriangle, CheckCircle, ArrowRight, Printer } from 'lucide-react';

const StudentFees = () => {
  const { currentStudent } = useStudentAuth();
  const { primaryColor } = useTheme();
  const [feeData, setFeeData] = useState({ expected: 0, paid: 0, lastDate: 'N/A' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeeInfo = async () => {
      try {
        // 1. Get Global Fee Settings
        const feeSnap = await getDoc(doc(db, 'settings', 'fees'));
        const fees = feeSnap.exists() ? feeSnap.data() : {};
        
        const studentClass = currentStudent?.className || currentStudent?.classId || '';
        const expected = fees[studentClass] || fees['default'] || 45000;

        setFeeData({
          expected: expected,
          paid: currentStudent?.paidFee || 0,
          lastDate: currentStudent?.lastPaymentDate || 'N/A'
        });
      } catch (error) {
        console.error('Error fetching fees:', error);
      } finally {
        setLoading(false);
      }
    };

    if (currentStudent) fetchFeeInfo();
  }, [currentStudent]);

  const balance = feeData.expected - feeData.paid;
  const isCleared = balance <= 0;
  const percentPaid = Math.min(100, Math.round((feeData.paid / feeData.expected) * 100)) || 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: primaryColor }}></div>
      </div>
    );
  }

  return (
    <div className="dashboard-wrapper max-w-5xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 style={{ fontWeight: '900', fontSize: '28px', color: '#1e293b', margin: 0 }}>Financial Ledger</h2>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>Track your school fee payments and balance.</p>
        </div>
        <button 
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-white border-2 border-slate-200 px-5 py-2.5 rounded-2xl font-black text-slate-700 hover:bg-slate-50 transition-all active:scale-95 no-print"
        >
          <Printer size={18} /> Print Statement
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* KPI Cards */}
        <div className="lg:col-span-1 bg-indigo-600 p-8 rounded-3xl shadow-lg shadow-indigo-100 text-white relative overflow-hidden">
          <DollarSign size={80} style={{ position: 'absolute', right: '-10px', top: '-10px', opacity: 0.15 }} />
          <p className="text-xs font-black text-indigo-100 uppercase tracking-widest mb-4">Total Required</p>
          <h3 className="text-4xl font-black mb-1">₦{feeData.expected.toLocaleString()}</h3>
          <p className="text-xs font-bold text-indigo-200">Current Session: 2025/2026</p>
        </div>

        <div className={`lg:col-span-1 p-8 rounded-3xl shadow-lg relative overflow-hidden ${isCleared ? 'bg-emerald-600 shadow-emerald-100' : 'bg-rose-600 shadow-rose-100'} text-white transition-all`}>
           <CreditCard size={80} style={{ position: 'absolute', right: '-10px', top: '-10px', opacity: 0.15 }} />
           <p className="text-xs font-black opacity-80 uppercase tracking-widest mb-4">Outstanding Balance</p>
           <h3 className="text-4xl font-black mb-1">₦{balance.toLocaleString()}</h3>
           <p className="text-xs font-bold opacity-80">{isCleared ? 'Status: Fully Cleared' : 'Status: Payment Pending'}</p>
        </div>

        <div className="lg:col-span-1 bg-white p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col justify-center">
           <div className="flex justify-between items-end mb-4">
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Payment Progress</p>
                <h3 className="text-2xl font-black text-slate-800">{percentPaid}%</h3>
              </div>
              <span className={`text-[10px] font-black px-3 py-1 rounded-full ${isCleared ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                {percentPaid === 100 ? 'COMPLETED' : 'IN PROGRESS'}
              </span>
           </div>
           <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-1000 ${isCleared ? 'bg-emerald-500' : 'bg-indigo-500'}`} 
                style={{ width: `${percentPaid}%` }} 
              />
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Recent Transactions */}
        <div className="card-white overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center gap-3">
             <Clock size={20} className="text-indigo-600" />
             <h3 className="font-black text-slate-800 uppercase tracking-tight">Payment History</h3>
          </div>
          <div className="p-0">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <tr>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {feeData.paid > 0 ? (
                  <tr>
                    <td className="px-6 py-5">
                      <p className="text-sm font-black text-slate-800">Bank Deposit / Transfer</p>
                      <p className="text-[11px] text-slate-500">Recorded via Bursar Office</p>
                    </td>
                    <td className="px-6 py-5 text-sm font-bold text-slate-500">{feeData.lastDate}</td>
                    <td className="px-6 py-5 text-right font-black text-emerald-600">₦{feeData.paid.toLocaleString()}</td>
                  </tr>
                ) : (
                  <tr>
                    <td colSpan="3" className="px-6 py-12 text-center text-slate-400 font-bold italic">
                      No payment records found for this student.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment Instructions */}
        <div className="space-y-6">
          <div className="card-white p-8 border-t-4 border-t-indigo-500">
            <h4 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
              <AlertTriangle size={20} className="text-amber-500" />
              Payment Instructions
            </h4>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              To settle your outstanding balance, please proceed with a bank transfer to the school's official account listed below. Ensure you include your <strong>Registration Number</strong> in the transaction description.
            </p>
            
            <div className="bg-slate-50 rounded-2xl p-6 space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 font-bold">Bank Name</span>
                <span className="text-slate-900 font-black uppercase">First Bank of Nigeria</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 font-bold">Account Name</span>
                <span className="text-slate-900 font-black uppercase">Bonus Dominus School</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 font-bold">Account Number</span>
                <span className="text-slate-900 font-black font-mono text-lg">2041234567</span>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <CheckCircle size={14} className="text-emerald-500" />
              Scan & Upload Receipt via Message Hub
              <ArrowRight size={12} className="ml-auto" />
            </div>
          </div>

          <div className="card-white p-6 bg-slate-900 text-white flex items-center justify-between group cursor-pointer hover:bg-black transition-all">
             <div>
               <h4 className="font-black text-white m-0">Need a Scholarship?</h4>
               <p className="text-xs text-slate-400 m-0">Apply for the 2026 Academic Grant</p>
             </div>
             <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-indigo-500 transition-all">
               <ArrowRight size={20} />
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentFees;

