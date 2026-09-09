import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { ensureFirebaseAuth } from '../../lib/ensureAuth';
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { Banknote, Users, CheckCircle, Loader2, List, Plus } from 'lucide-react';
import { formatNaira } from '../../utils/prospectusFees';

const StaffLoanView = () => {
  const [activeTab, setActiveTab] = useState('list'); // 'list' or 'grant'
  const [staffList, setStaffList] = useState([]);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ type: '', message: '' });

  // Grant Loan State
  const [selectedStaff, setSelectedStaff] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [loanReason, setLoanReason] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      await ensureFirebaseAuth();
      // Fetch Staff
      const staffSnap = await getDocs(collection(db, 'staff'));
      const staffData = staffSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setStaffList(staffData);

      // Fetch Loans
      const loanSnap = await getDocs(collection(db, 'bursar_staff_loans'));
      const loanData = loanSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);
      setLoans(loanData);
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', message: 'Failed to fetch loan data.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleGrantLoan = async (e) => {
    e.preventDefault();
    if (!selectedStaff || !loanAmount) return;

    setSaving(true);
    try {
      const staffMember = staffList.find(s => s.id === selectedStaff);
      
      await addDoc(collection(db, 'bursar_staff_loans'), {
        staffId: staffMember.staffId || staffMember.id,
        staffDocId: staffMember.id,
        staffName: staffMember.name || staffMember.firstName + ' ' + staffMember.lastName,
        amount: Number(loanAmount),
        reason: loanReason,
        createdAt: serverTimestamp(),
      });

      setStatus({ type: 'success', message: 'Loan granted successfully!' });
      setTimeout(() => setStatus({ type: '', message: '' }), 3000);
      
      setLoanAmount('');
      setLoanReason('');
      setSelectedStaff('');
      
      // Switch back to list and refresh
      setActiveTab('list');
      fetchData();
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', message: 'Failed to record loan.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-blue-600" size={32} /></div>;
  }

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('list')}
          className={`flex items-center gap-2 px-4 py-2 font-bold rounded-lg transition-all ${
            activeTab === 'list' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <List size={18} /> Loan History
        </button>
        <button
          onClick={() => setActiveTab('grant')}
          className={`flex items-center gap-2 px-4 py-2 font-bold rounded-lg transition-all ${
            activeTab === 'grant' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Plus size={18} /> Grant Loan to Staff
        </button>
      </div>

      {status.message && (
        <div className={`p-4 font-bold rounded-xl flex items-center gap-2 ${status.type === 'error' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
          <CheckCircle size={20} /> {status.message}
        </div>
      )}

      {activeTab === 'list' && (
        <div className="card-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
            <Banknote className="text-blue-600" /> Staff Loan Records
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-wider">
                  <th className="py-3 px-4 rounded-l-xl">Date</th>
                  <th className="py-3 px-4">Staff ID</th>
                  <th className="py-3 px-4">Staff Name</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4 rounded-r-xl">Loan Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loans.map(loan => (
                  <tr key={loan.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-sm text-slate-500">
                      {loan.createdAt ? loan.createdAt.toDate().toLocaleDateString() : 'Just now'}
                    </td>
                    <td className="py-3 px-4 font-mono text-sm text-slate-500">
                      {loan.staffId}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-xs">
                        {loan.staffName?.charAt(0)}
                      </div>
                      {loan.staffName}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {loan.reason || '-'}
                    </td>
                    <td className="py-3 px-4 font-black text-rose-600">
                      {formatNaira(loan.amount)}
                    </td>
                  </tr>
                ))}
                {loans.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center py-8 text-slate-400 font-bold">
                      No loan records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'grant' && (
        <div className="card-white p-6 rounded-3xl border border-slate-100 shadow-sm max-w-2xl">
          <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
            <Users className="text-blue-600" /> Grant New Loan
          </h2>

          <form onSubmit={handleGrantLoan} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Select Staff</label>
              <select 
                value={selectedStaff} 
                onChange={e => setSelectedStaff(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors"
                required
              >
                <option value="" disabled>-- Select Staff Member --</option>
                {staffList.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name || s.firstName + ' ' + s.lastName} ({s.staffId || 'No ID'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Loan Amount (₦)</label>
              <input 
                type="number" 
                value={loanAmount} 
                onChange={e => setLoanAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Reason / Description (Optional)</label>
              <input 
                type="text" 
                value={loanReason} 
                onChange={e => setLoanReason(e.target.value)}
                placeholder="e.g. Medical emergency, Salary advance"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="pt-4 border-t border-slate-100">
              <button 
                type="submit" 
                disabled={saving || !selectedStaff || !loanAmount}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl transition-all flex items-center justify-center shadow-lg hover:shadow-xl active:scale-95 disabled:opacity-50"
              >
                {saving ? <Loader2 className="animate-spin mr-2" size={20} /> : <Plus className="mr-2" size={20} />}
                Confirm & Grant Loan
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};

export default StaffLoanView;
