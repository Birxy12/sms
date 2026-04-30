import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, getDocs, orderBy, where, doc, getDoc, setDoc } from 'firebase/firestore';
import { 
  Wallet, DollarSign, TrendingUp, TrendingDown, Users, 
  Search, Filter, Download, Plus, ArrowUpRight, 
  ArrowDownRight, Calendar, FileText, CheckCircle, AlertCircle, Loader2
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const BursarDashboard = () => {
  const { primaryColor } = useTheme();
  const [activeView, setActiveView] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [searchTerm, setSearchTerm] = useState('');
  
  // Financial stats initialized to zero as requested
  const [stats, setStats] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    outstandingFees: 0,
    salariesPaid: 0,
    netBalance: 0
  });

  const [transactions, setTransactions] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [bursarStamp, setBursarStamp] = useState(null);

  useEffect(() => {
    // Simulate loading data or fetch from Firestore
    const fetchData = async () => {
      setLoading(true);
      try {
        // Here you would normally fetch real data from Firestore
        // For now, we initialize to 0 as requested
        setStats({
          totalIncome: 0,
          totalExpenses: 0,
          outstandingFees: 0,
          salariesPaid: 0,
          netBalance: 0
        });
        
        // Fetch any existing transactions if needed
        // const transSnap = await getDocs(query(collection(db, 'transactions'), orderBy('date', 'desc')));
        // setTransactions(transSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      } catch (error) {
        console.error("Error fetching financial data:", error);
        setStatus({ type: 'error', message: 'Failed to load financial records.' });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const statCards = [
    { label: 'Total Income', value: stats.totalIncome, icon: TrendingUp, color: '#10b981', bg: 'bg-emerald-50' },
    { label: 'Total Expenses', value: stats.totalExpenses, icon: TrendingDown, color: '#ef4444', bg: 'bg-rose-50' },
    { label: 'Salaries Paid', value: stats.salariesPaid, icon: Wallet, color: '#6366f1', bg: 'bg-indigo-50' },
    { label: 'Outstanding Fees', value: stats.outstandingFees, icon: AlertCircle, color: '#f59e0b', bg: 'bg-amber-50' },
  ];

  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Financial Treasury</h2>
          <p className="text-slate-500">Manage school fees, expenses, and payroll accounting.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95">
            <Plus size={20} />
            Record Payment
          </button>
          <button className="flex items-center gap-2 bg-white border-2 border-slate-200 px-5 py-3 rounded-2xl font-bold text-slate-700 hover:bg-slate-50 transition-all active:scale-95">
            <Download size={20} />
            Export Report
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, idx) => (
          <div key={idx} className={`p-6 rounded-3xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-all group`}>
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color === '#10b981' ? 'text-emerald-600' : stat.color === '#ef4444' ? 'text-rose-600' : stat.color === '#6366f1' ? 'text-indigo-600' : 'text-amber-600'}`}>
                <stat.icon size={24} />
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">MTD</span>
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
            <h3 className="text-2xl font-black text-slate-900">₦{stat.value.toLocaleString()}</h3>
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Recent Transactions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card-white overflow-hidden p-0">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-black text-slate-800 uppercase tracking-tight">Recent Transactions</h3>
              <div className="flex gap-2">
                <button 
                  onClick={() => setActiveView('all')}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${activeView === 'all' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white border border-slate-200 text-slate-600'}`}
                >
                  ALL
                </button>
                <button 
                  onClick={() => setActiveView('income')}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${activeView === 'income' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : 'bg-white border border-slate-200 text-slate-600'}`}
                >
                  INCOME
                </button>
                <button 
                  onClick={() => setActiveView('expense')}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${activeView === 'expense' ? 'bg-rose-600 text-white shadow-lg shadow-rose-100' : 'bg-white border border-slate-200 text-slate-600'}`}
                >
                  EXPENSE
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    <th className="px-6 py-4">Reference</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {transactions.length > 0 ? transactions.map((t, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900 text-sm">#{t.id?.slice(-6).toUpperCase()}</p>
                        <p className="text-[10px] text-slate-400 font-bold">{t.date}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold text-slate-600">{t.category}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-600">
                          <CheckCircle size={10} /> Completed
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className={`font-black ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {t.type === 'income' ? '+' : '-'} ₦{t.amount?.toLocaleString()}
                        </p>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="4" className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center gap-3 opacity-20">
                          <FileText size={48} />
                          <p className="text-sm font-bold uppercase tracking-widest">No transactions recorded</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Summaries */}
        <div className="space-y-6">
          <div className="card-white">
            <h3 className="font-black text-slate-800 uppercase tracking-tight mb-6">Financial Overview</h3>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-500 uppercase mb-2">
                  <span>Fee Collection Progress</span>
                  <span>0%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div style={{ width: '0%' }} className="h-full bg-indigo-600 transition-all duration-1000"></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 text-center">Invoiced</p>
                  <p className="text-sm font-black text-slate-800 text-center">₦0</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 text-center">Collected</p>
                  <p className="text-sm font-black text-emerald-600 text-center">₦0</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-indigo-600 p-8 rounded-3xl text-white shadow-xl shadow-indigo-100 relative overflow-hidden">
            <div className="relative z-10">
              <h4 className="text-indigo-200 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Cash Reserve</h4>
              <h2 className="text-4xl font-black mb-6">₦0.00</h2>
              <button className="w-full bg-white text-indigo-600 py-3 rounded-2xl font-black text-xs hover:bg-indigo-50 transition-all">
                Transfer to Bank
              </button>
            </div>
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
          </div>
        </div>
      </div>

      {status.message && (
        <div className={`fixed bottom-8 right-8 p-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-8 ${
          status.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
        } text-white`}>
          {status.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span className="font-bold tracking-tight">{status.message}</span>
        </div>
      )}
    </div>
  );
};

export default BursarDashboard;