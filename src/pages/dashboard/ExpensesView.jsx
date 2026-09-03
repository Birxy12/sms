import React, { useState, useMemo } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useFinance } from '../../context/FinanceContext';
import { formatNaira } from '../../utils/prospectusFees';
import { Plus, List, Loader2, Calendar, Clock, Receipt, Tags, Activity, CalendarDays, BarChart2, CheckCircle } from 'lucide-react';

const EXPENSE_CATEGORIES = [
  'Salaries & Wages',
  'Maintenance & Repairs',
  'Utilities (Power/Water)',
  'Operations & Logistics',
  'Office Supplies',
  'Events & Programs',
  'Miscellaneous'
];

const ExpensesView = () => {
  const { currentAdmin } = useAdminAuth();
  const { financeData } = useFinance();
  const [activeTab, setActiveTab] = useState('enter'); // 'enter' | 'view'
  
  // Form State
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [expenseTime, setExpenseTime] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // View State
  const [timeFilter, setTimeFilter] = useState('daily'); // 'daily', 'weekly', 'monthly', 'yearly'

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || !description) return;
    
    setIsSubmitting(true);
    setMessage({ type: '', text: '' });
    
    try {
      await addDoc(collection(db, 'bursar_expenses'), {
        amount: parseFloat(amount),
        description,
        category,
        date: expenseDate,
        time: expenseTime,
        timestamp: serverTimestamp(),
        recordedBy: currentAdmin?.id || 'admin',
        recordedByName: currentAdmin?.name || 'Admin'
      });
      
      setMessage({ type: 'success', text: 'Expense recorded successfully!' });
      setAmount('');
      setDescription('');
      
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error saving expense:', error);
      setMessage({ type: 'error', text: 'Failed to record expense. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredExpenses = useMemo(() => {
    const now = new Date();
    return (financeData?.allExpenses || []).filter(exp => {
      if (!exp.date) return false;
      const expDate = new Date(exp.date);
      
      if (timeFilter === 'daily') {
        return expDate.toDateString() === now.toDateString();
      } else if (timeFilter === 'weekly') {
        const diff = now.getTime() - expDate.getTime();
        return diff <= (7 * 24 * 60 * 60 * 1000);
      } else if (timeFilter === 'monthly') {
        return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear();
      } else if (timeFilter === 'yearly') {
        return expDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [financeData?.allExpenses, timeFilter]);

  const totalFiltered = useMemo(() => {
    return filteredExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);
  }, [filteredExpenses]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <Receipt className="text-indigo-600" />
            School Expenses
          </h2>
          <p className="text-sm text-slate-500 mt-1">Manage, record, and track all institutional spending.</p>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('enter')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${
              activeTab === 'enter' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Plus size={16} /> Enter Expense
          </button>
          <button
            onClick={() => setActiveTab('view')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${
              activeTab === 'view' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <List size={16} /> View Expenses
          </button>
        </div>
      </div>

      {activeTab === 'enter' && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-100 max-w-2xl mx-auto">
          <h3 className="text-xl font-bold text-slate-800 mb-6">Record New Expense</h3>
          
          {message.text && (
            <div className={`p-4 rounded-xl mb-6 font-medium text-sm flex items-center gap-2 ${
              message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}>
              <CheckCircle size={18} />
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Amount (₦)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                placeholder="e.g. 50000"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Description / Purpose</label>
              <textarea
                required
                rows="3"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium resize-none"
                placeholder="What was this expense for?"
              ></textarea>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Category</label>
              <div className="relative">
                <Tags className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium appearance-none"
                >
                  {EXPENSE_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Date</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="date"
                    required
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Time</label>
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="time"
                    required
                    value={expenseTime}
                    onChange={(e) => setExpenseTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-xl transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? <Loader2 className="animate-spin" /> : <Plus size={20} />}
              Save Expense Record
            </button>
          </form>
        </div>
      )}

      {activeTab === 'view' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
              <span className="font-bold text-slate-600">Analyze By:</span>
              <div className="flex flex-wrap gap-2">
                {['daily', 'weekly', 'monthly', 'yearly'].map(filter => (
                  <button
                    key={filter}
                    onClick={() => setTimeFilter(filter)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold capitalize transition-all ${
                      timeFilter === filter 
                        ? 'bg-indigo-100 text-indigo-700' 
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-rose-500 to-rose-600 p-6 rounded-2xl shadow-lg shadow-rose-200 text-white flex flex-col justify-center">
              <div className="flex items-center gap-2 opacity-80 mb-1">
                <BarChart2 size={18} />
                <span className="text-sm font-bold uppercase tracking-wider">{timeFilter} Total</span>
              </div>
              <div className="text-3xl font-black">{formatNaira(totalFiltered)}</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {filteredExpenses.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 mb-4">
                  <Activity size={32} />
                </div>
                <h4 className="text-lg font-bold text-slate-800">No expenses found</h4>
                <p className="text-slate-500 mt-1">There are no recorded expenses for this {timeFilter} period.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-black uppercase text-slate-500 tracking-wider">
                      <th className="p-4">Date & Time</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">Description</th>
                      <th className="p-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredExpenses.map(exp => (
                      <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-slate-800">{exp.date}</div>
                          <div className="text-xs text-slate-500">{exp.time}</div>
                        </td>
                        <td className="p-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                            {exp.category}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="font-medium text-slate-700 max-w-xs truncate" title={exp.description}>
                            {exp.description}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">By {exp.recordedByName || 'Admin'}</div>
                        </td>
                        <td className="p-4 text-right">
                          <div className="font-black text-rose-600">{formatNaira(exp.amount)}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpensesView;
