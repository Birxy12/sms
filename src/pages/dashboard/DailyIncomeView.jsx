import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, getDocs, orderBy, where, Timestamp } from 'firebase/firestore';
import { BarChart3, TrendingUp, Calendar, Loader2, ArrowRight, Wallet, ShoppingBag } from 'lucide-react';
import { formatNaira } from '../../utils/prospectusFees';

const DailyIncomeView = () => {
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('today'); // 'today', 'week', 'month'
  
  const [feesIncome, setFeesIncome] = useState(0);
  const [storeIncome, setStoreIncome] = useState(0);
  const [feeTransactions, setFeeTransactions] = useState([]);
  const [storeTransactions, setStoreTransactions] = useState([]);

  useEffect(() => {
    fetchIncomeData();
  }, [dateFilter]);

  const fetchIncomeData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      let startDate = new Date();
      
      if (dateFilter === 'today') {
        startDate.setHours(0, 0, 0, 0);
      } else if (dateFilter === 'week') {
        startDate.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
        startDate.setHours(0, 0, 0, 0);
      } else if (dateFilter === 'month') {
        startDate.setDate(1); // Start of month
        startDate.setHours(0, 0, 0, 0);
      }
      
      const startTimestamp = Timestamp.fromDate(startDate);

      // Fetch Fee Payments
      const feesQ = query(
        collection(db, 'payment_messages'),
        where('createdAt', '>=', startTimestamp),
        orderBy('createdAt', 'desc')
      );
      const feesSnap = await getDocs(feesQ);
      let totalFees = 0;
      const fTxns = [];
      feesSnap.forEach(doc => {
        const data = doc.data();
        totalFees += Number(data.amount || 0);
        fTxns.push({ id: doc.id, type: 'Fee', ...data });
      });

      // Fetch Store Sales (Trading Income)
      const storeQ = query(
        collection(db, 'store_sales'),
        where('createdAt', '>=', startTimestamp),
        orderBy('createdAt', 'desc')
      );
      const storeSnap = await getDocs(storeQ);
      let totalStore = 0;
      const sTxns = [];
      storeSnap.forEach(doc => {
        const data = doc.data();
        totalStore += Number(data.totalAmount || 0);
        sTxns.push({ id: doc.id, type: 'Store', ...data });
      });

      setFeesIncome(totalFees);
      setStoreIncome(totalStore);
      setFeeTransactions(fTxns);
      setStoreTransactions(sTxns);
    } catch (err) {
      console.error("Error fetching income data:", err);
    } finally {
      setLoading(false);
    }
  };

  const totalIncome = feesIncome + storeIncome;

  return (
    <div className="space-y-6">
      {/* Header and Filter */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center">
            <BarChart3 className="mr-3 text-emerald-500" /> Income Report
          </h2>
          <p className="text-slate-500 mt-1 font-medium">Overview of school fees and trading income.</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
          <button
            onClick={() => setDateFilter('today')}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${dateFilter === 'today' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-200'}`}
          >
            Today
          </button>
          <button
            onClick={() => setDateFilter('week')}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${dateFilter === 'week' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-200'}`}
          >
            This Week
          </button>
          <button
            onClick={() => setDateFilter('month')}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${dateFilter === 'month' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-200'}`}
          >
            This Month
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-emerald-600" size={40} /></div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 p-6 rounded-3xl text-white shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-20">
                <TrendingUp size={80} />
              </div>
              <div className="relative z-10">
                <p className="text-emerald-100 font-bold mb-1 uppercase tracking-wider text-xs">Total Income</p>
                <h3 className="text-3xl font-black tracking-tight">{formatNaira(totalIncome)}</h3>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-slate-400 font-bold mb-1 uppercase tracking-wider text-xs">School Fees</p>
                <h3 className="text-2xl font-black text-slate-800">{formatNaira(feesIncome)}</h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center">
                <Wallet size={24} />
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-slate-400 font-bold mb-1 uppercase tracking-wider text-xs">Store & Trading</p>
                <h3 className="text-2xl font-black text-slate-800">{formatNaira(storeIncome)}</h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-500 flex items-center justify-center">
                <ShoppingBag size={24} />
              </div>
            </div>
          </div>

          {/* Breakdown Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Fees Table */}
            <div className="bg-white border border-slate-100 shadow-sm rounded-3xl overflow-hidden flex flex-col">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-black text-slate-800 flex items-center">
                  <Wallet className="mr-2 text-blue-500" size={20} /> Fee Collections
                </h3>
                <span className="text-xs font-bold text-slate-400 bg-white px-3 py-1 rounded-full shadow-sm border border-slate-100">
                  {feeTransactions.length} records
                </span>
              </div>
              <div className="p-0 overflow-auto flex-1 max-h-96">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3">Class</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {feeTransactions.map(txn => (
                      <tr key={txn.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-700 text-sm">{txn.studentName}</p>
                          <p className="text-xs text-slate-400 font-mono">{txn.regNo}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-bold">{txn.className}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-black text-emerald-600">
                          {formatNaira(txn.amount)}
                        </td>
                      </tr>
                    ))}
                    {feeTransactions.length === 0 && (
                      <tr>
                        <td colSpan="3" className="px-4 py-8 text-center text-slate-400 font-medium">No fee transactions found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Store Table */}
            <div className="bg-white border border-slate-100 shadow-sm rounded-3xl overflow-hidden flex flex-col">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-black text-slate-800 flex items-center">
                  <ShoppingBag className="mr-2 text-purple-500" size={20} /> Store Sales
                </h3>
                <span className="text-xs font-bold text-slate-400 bg-white px-3 py-1 rounded-full shadow-sm border border-slate-100">
                  {storeTransactions.length} records
                </span>
              </div>
              <div className="p-0 overflow-auto flex-1 max-h-96">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      <th className="px-4 py-3">Item</th>
                      <th className="px-4 py-3">Reference</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {storeTransactions.map(txn => (
                      <tr key={txn.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-700 text-sm">{txn.itemName}</p>
                          <p className="text-xs text-slate-400">{txn.quantity} x {formatNaira(txn.unitPrice)}</p>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-500 text-sm">
                          {txn.studentRef}
                        </td>
                        <td className="px-4 py-3 text-right font-black text-emerald-600">
                          {formatNaira(txn.totalAmount)}
                        </td>
                      </tr>
                    ))}
                    {storeTransactions.length === 0 && (
                      <tr>
                        <td colSpan="3" className="px-4 py-8 text-center text-slate-400 font-medium">No store sales found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DailyIncomeView;
