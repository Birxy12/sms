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
    { label: 'Total Income', value: stats.totalIncome, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
    { label: 'Total Expenses', value: stats.totalExpenses, icon: TrendingDown, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' },
    { label: 'Salaries Paid', value: stats.salariesPaid, icon: Wallet, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
    { label: 'Outstanding Fees', value: stats.outstandingFees, icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
  ];

  const sidebarTabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp, color: 'indigo' },
    { id: 'fees', label: 'Fees & Income', icon: DollarSign, color: 'emerald' },
    { id: 'expenses', label: 'Expense Logs', icon: TrendingDown, color: 'rose' },
    { id: 'payroll', label: 'Staff Payroll', icon: Users, color: 'blue' },
  ];

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
          <p className="text-slate-500 font-medium mt-2">Centralized financial intelligence and payroll management.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3.5 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-95 text-sm">
            <Plus size={18} />
            Add Record
          </button>
          <button className="flex items-center gap-2 bg-white border-2 border-slate-100 px-6 py-3.5 rounded-2xl font-bold text-slate-700 hover:bg-slate-50 transition-all active:scale-95 text-sm shadow-sm">
            <Download size={18} />
            Reports
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

      {/* Stats Grid with Analytics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, idx) => (
          <div key={idx} className={`p-6 rounded-3xl border ${stat.border} bg-white shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group overflow-hidden relative`}>
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
                <stat.icon size={24} />
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Performance</span>
                <span className={`text-[10px] font-black ${stat.color} flex items-center justify-end gap-1`}>
                   <ArrowUpRight size={10} /> 0%
                </span>
              </div>
            </div>
            <div className="relative z-10">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
              <h3 className="text-3xl font-black text-slate-900">₦{stat.value.toLocaleString()}</h3>
            </div>
            
            {/* Sparkline Decorative SVG */}
            <div className="absolute bottom-0 left-0 right-0 h-12 opacity-10 group-hover:opacity-20 transition-opacity">
              <svg viewBox="0 0 100 20" className="w-full h-full preserve-3d">
                <path 
                  d="M0 15 Q 10 5, 20 12 T 40 8 T 60 15 T 80 10 T 100 12" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                  className={stat.color}
                />
              </svg>
            </div>
          </div>
        ))}
      </div>      {/* Dynamic Content Area */}
      <div className="tab-content-animate" key={activeView}>
        {activeView === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="card-white p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-xl font-black text-slate-900">Income Overview</h3>
                    <p className="text-sm text-slate-500">Revenue trends for the current term.</p>
                  </div>
                  <select className="bg-slate-50 border-none rounded-xl px-4 py-2 text-xs font-bold text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option>Last 6 Months</option>
                    <option>Current Term</option>
                  </select>
                </div>
                
                {/* Mock Chart Area */}
                <div className="h-64 flex items-end justify-between gap-4 pt-4 border-b border-slate-100">
                  {[
                    { m: 'Jan', v: 45, c: 'bg-indigo-500' },
                    { m: 'Feb', v: 65, c: 'bg-indigo-500' },
                    { m: 'Mar', v: 85, c: 'bg-indigo-600' },
                    { m: 'Apr', v: 55, c: 'bg-indigo-500' },
                    { m: 'May', v: 95, c: 'bg-indigo-700 shadow-lg shadow-indigo-100' },
                    { m: 'Jun', v: 75, c: 'bg-indigo-500' }
                  ].map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-4 group h-full">
                      <div className="w-full relative flex items-end h-full">
                         <div 
                           className={`w-full rounded-t-xl transition-all duration-700 group-hover:opacity-80 ${d.c}`} 
                           style={{ height: `${d.v}%` }}
                         ></div>
                         <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all font-bold whitespace-nowrap z-20">
                           ₦{(d.v * 10000).toLocaleString()}
                         </div>
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{d.m}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card-white p-0 overflow-hidden">
                <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-xl font-black text-slate-900">Recent Ledger Entries</h3>
                  <button className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-700 transition-colors">View All</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50/50">
                      <tr>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Transaction</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[
                        { title: 'School Fee - SS1', cat: 'Fees', status: 'Completed', amount: '+₦45,000', color: 'emerald' },
                        { title: 'Utility Bills - May', cat: 'Bills', status: 'Pending', amount: '-₦12,500', color: 'amber' },
                        { title: 'Staff Salary - Admin', cat: 'Payroll', status: 'Completed', amount: '-₦150,000', color: 'rose' },
                      ].map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-8 py-6">
                            <p className="text-sm font-black text-slate-800">{item.title}</p>
                            <p className="text-xs text-slate-400 font-medium">May 24, 2026</p>
                          </td>
                          <td className="px-8 py-6">
                            <span className="text-[10px] font-black px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 uppercase tracking-wider">{item.cat}</span>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full bg-${item.color}-500`}></div>
                              <span className={`text-[10px] font-black text-${item.color}-600 uppercase tracking-wider`}>{item.status}</span>
                            </div>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <span className={`text-sm font-black ${item.amount.startsWith('+') ? 'text-emerald-600' : 'text-slate-900'}`}>{item.amount}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-8 rounded-[2.5rem] relative overflow-hidden shadow-2xl">
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-10">
                    <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                      <Briefcase size={24} />
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Budget</p>
                      <p className="text-sm font-bold">Term 3 / 2026</p>
                    </div>
                  </div>
                  <h3 className="text-slate-400 text-xs font-bold tracking-widest uppercase mb-2">Treasury Balance</h3>
                  <div className="text-4xl font-black mb-10">₦4,284,000</div>
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2 text-slate-400">
                        <span>Projected Goal</span>
                        <span>82% reached</span>
                      </div>
                      <div className="h-3 w-full bg-slate-700/50 rounded-full overflow-hidden border border-slate-600/50 p-0.5">
                        <div style={{ width: '82%' }} className="h-full bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
                      </div>
                    </div>
                    <button className="w-full bg-white text-slate-900 py-4 rounded-2xl font-black text-sm hover:bg-slate-50 transition-all active:scale-95 shadow-xl">
                      Allocate Funds
                    </button>
                  </div>
                </div>
                <div className="absolute -right-20 -top-20 w-64 h-64 bg-indigo-500 rounded-full blur-[80px] opacity-20"></div>
              </div>

              <div className="card-white p-8">
                <h3 className="text-lg font-black text-slate-900 mb-6">Financial Distribution</h3>
                <div className="space-y-5">
                  {[
                    { label: 'Personnel Costs', value: 45, color: 'indigo' },
                    { label: 'Infrastructure', value: 25, color: 'emerald' },
                    { label: 'Academic Supplies', value: 20, color: 'amber' },
                    { label: 'Other Expenses', value: 10, color: 'rose' },
                  ].map((item, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <span>{item.label}</span>
                        <span className="text-slate-900">{item.value}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div style={{ width: `${item.value}%` }} className={`h-full bg-${item.color}-500 rounded-full`}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'fees' && (
          <div className="card-white p-16 text-center space-y-6">
             <div className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-[2rem] flex items-center justify-center mx-auto mb-4 shadow-inner">
                <DollarSign size={48} />
             </div>
             <h3 className="text-3xl font-black text-slate-900">Fee Intelligence</h3>
             <p className="text-slate-500 max-w-md mx-auto leading-relaxed">Advanced module for managing student payments, scholarship logic, and automated invoicing.</p>
             <button className="btn-primary px-8 py-4 rounded-2xl shadow-xl shadow-indigo-100 mt-4">Initialize Module</button>
          </div>
        )}

        {activeView === 'expenses' && (
          <div className="card-white p-16 text-center space-y-6">
             <div className="w-24 h-24 bg-rose-50 text-rose-600 rounded-[2rem] flex items-center justify-center mx-auto mb-4 shadow-inner">
                <TrendingDown size={48} />
             </div>
             <h3 className="text-3xl font-black text-slate-900">Expense Audit</h3>
             <p className="text-slate-500 max-w-md mx-auto leading-relaxed">Record operational costs and procurement cycles with automated tax calculations.</p>
             <button className="btn-rose px-8 py-4 rounded-2xl shadow-xl shadow-rose-100 mt-4">Launch Ledger</button>
          </div>
        )}

        {activeView === 'payroll' && (
          <div className="card-white p-16 text-center space-y-6">
             <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-[2rem] flex items-center justify-center mx-auto mb-4 shadow-inner">
                <Users size={48} />
             </div>
             <h3 className="text-3xl font-black text-slate-900">Payroll Terminal</h3>
             <p className="text-slate-500 max-w-md mx-auto leading-relaxed">Centralized staff remuneration portal with tax reporting and bonus management.</p>
             <button className="btn-blue px-8 py-4 rounded-2xl shadow-xl shadow-blue-100 mt-4">Manage Payroll</button>
          </div>
        )}
      </div>    </div>

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