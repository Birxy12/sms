import React, { useState, useEffect } from 'react';
import { useStudentAuth } from '../../context/StudentAuthContext';
import { db } from '../../lib/firebase';
import { doc, getDoc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import FBNCheckout from 'firstchekout';
import { useTheme } from '../../context/ThemeContext';
import { DollarSign, CreditCard, Clock, AlertTriangle, CheckCircle, ArrowRight, Printer, X } from 'lucide-react';
import ReceiptScanner from '../../components/ReceiptScanner';

const StudentFees = () => {
  const { currentStudent } = useStudentAuth();
  const { primaryColor, currentSession } = useTheme();
  const [feeData, setFeeData] = useState({ expected: 0, paid: 0, lastDate: 'N/A', term: 'First Term', session: '', txnId: '', serialNo: '' });
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    const fetchFeeInfo = async () => {
      try {
        if (!currentStudent?.id) return;
        
        // Fetch fresh data from Firestore instead of relying on cached currentStudent
        const studentRef = doc(db, 'students', currentStudent.id);
        const studentSnap = await getDoc(studentRef);
        
        let expected = 0;
        let paid = 0;
        let lastDate = 'N/A';
        let term = 'First Term';
        let session = currentSession || '2025/2026';
        let txnId = '';
        let serialNo = '';

        if (studentSnap.exists()) {
          const sData = studentSnap.data();
          expected = parseFloat(sData.expectedFee) || 0;
          paid = parseFloat(sData.paidFee) || parseFloat(sData.paidAmount) || 0;
          lastDate = sData.lastPaymentDate || 'N/A';
          term = sData.lastPaymentTerm || 'First Term';
          session = sData.lastPaymentSession || currentSession || '2025/2026';
          txnId = sData.lastTransactionId || '';
          serialNo = sData.lastSerialNo || '';
        }

        setFeeData({
          expected,
          paid,
          lastDate,
          term,
          session,
          txnId,
          serialNo
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

  // Set default payAmount when outstanding balance is fetched
  useEffect(() => {
    if (balance > 0) {
      setPayAmount(balance.toString());
    } else {
      setPayAmount('');
    }
  }, [feeData.expected, feeData.paid]);

  const handleOnlinePayment = async () => {
    const amount = parseFloat(payAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }
    if (amount > balance) {
      alert(`Payment amount cannot exceed the outstanding balance of ₦${balance.toLocaleString()}`);
      return;
    }

    setPaying(true);

    try {
      // 1. Generate unique 12-character transaction reference
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let txnRef = '';
      for (let i = 0; i < 12; i++) {
        txnRef += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      // 2. Formulate customer name split
      const nameParts = (currentStudent?.name || 'Student User').trim().split(' ');
      const firstname = nameParts[0] || 'Student';
      const lastname = nameParts.slice(1).join(' ') || 'User';

      const live = import.meta.env.VITE_FBN_LIVE === 'true';
      const publicKey = import.meta.env.VITE_FBN_PUBLIC_KEY || 'sb-pk-placeholder-key';
      
      const baseFrame = live 
        ? 'https://checkout.firstchekout.com' 
        : 'https://sandbox.firstchekout.com';
      const initiatePaymentURI = live 
        ? 'https://checkout.firstchekout.com/api/v1/checkout/initialize' 
        : 'https://sandbox.firstchekout.com/api/v1/checkout/initialize';

      const txn = {
        live,
        ref: txnRef,
        amount: amount,
        fees: [{ amount: amount, label: 'School Fee' }],
        customer: {
          firstname,
          lastname,
          email: currentStudent?.email || 'student@school.com',
          id: currentStudent?.id || 'anonymous_id',
        },
        publicKey,
        description: `School Fee Payment - ${feeData.term || 'First Term'} (${feeData.session || currentSession || '2025/2026'})`,
        currency: 'NGN',
        meta: {
          studentId: currentStudent?.id || '',
          regNo: currentStudent?.regNo || '',
          term: feeData.term || 'First Term',
          session: feeData.session || currentSession || '2025/2026',
        },
        callback: async (res) => {
          console.log('FBN Callback:', res);
          // FBNChekOut returns success status on payment completion
          if (res.status === 'success' || res.status === 'successful' || res.event === 'success') {
            try {
              const oldPaid = parseFloat(feeData.paid) || 0;
              const newPaid = oldPaid + amount;
              const serialNo = 'SN-' + Math.floor(100000 + Math.random() * 900000);

              const studentRef = doc(db, 'students', currentStudent.id);
              await updateDoc(studentRef, {
                paidFee: newPaid,
                paidAmount: newPaid,
                lastPaymentDate: new Date().toLocaleDateString('en-NG'),
                lastTransactionId: res.reference || txnRef,
                lastSerialNo: serialNo,
                lastPaymentTerm: feeData.term || 'First Term',
                lastPaymentSession: feeData.session || currentSession || '2025/2026',
              });

              await addDoc(collection(db, 'payment_messages'), {
                studentName: currentStudent.name || currentStudent['STUDENT NAME'] || 'Student',
                className: currentStudent.className || currentStudent.class_name || currentStudent.CLASS || 'N/A',
                regNo: currentStudent.regNo || currentStudent.REGNO || 'N/A',
                amount,
                method: 'Online Payment (FirstChekOut)',
                term: feeData.term || 'First Term',
                session: feeData.session || currentSession || '2025/2026',
                transactionId: res.reference || txnRef,
                serialNo,
                message: `Online payment of ₦${amount.toLocaleString()} received via FirstChekOut.`,
                createdAt: serverTimestamp(),
              });

              setFeeData(prev => ({
                ...prev,
                paid: newPaid,
                lastDate: new Date().toLocaleDateString('en-NG'),
                txnId: res.reference || txnRef,
                serialNo
              }));

              alert('Payment Successful! Your school fee record has been updated.');
            } catch (err) {
              console.error('Error updating records after payment:', err);
              alert('Payment succeeded but there was an error updating your dashboard. Please contact the Bursar.');
            }
          } else {
            alert(`Payment status: ${res.status || 'Failed'}. Please try again.`);
          }
          setPaying(false);
        },
        onClose: () => {
          console.log('Payment modal closed');
          setPaying(false);
        }
      };

      const addressUrl = {
        BaseFrame: baseFrame,
        InitiatePaymentURI: initiatePaymentURI
      };

      await FBNCheckout.initiateTransactionAsync(txn, addressUrl);

    } catch (error) {
      console.error('Error starting FirstChekOut payment:', error);
      alert('Failed to initialize payment gateway: ' + error.message);
      setPaying(false);
    }
  };

  const handlePrintReceipt = () => {
    const pFee = feeData.paid;
    const eFee = feeData.expected;
    const bal = eFee - pFee;
    const term = feeData.term || 'First Term';
    const session = feeData.session || currentSession || '2025/2026';
    const txnId = feeData.txnId || 'TXN-' + Math.floor(10000000 + Math.random() * 90000000);
    const serialNo = feeData.serialNo || 'SN-' + Math.floor(100000 + Math.random() * 900000);
    const qrData = `Receipt: ${currentStudent?.name || 'Student'} | ${term} ${session} | Reg: ${currentStudent?.regNo || 'N/A'} | Paid: ₦${pFee} | Txn: ${txnId}`;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt - ${currentStudent?.name || 'Student'}</title>
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
              <div class="school-name">Bonus Dominus School</div>
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
              <span class="value">${currentStudent?.name || 'Student'}</span>
            </div>
            <div class="row">
              <span class="label">Reg Number:</span>
              <span class="value">${currentStudent?.regNo || 'N/A'}</span>
            </div>
            <div class="row">
              <span class="label">Class:</span>
              <span class="value">${currentStudent?.className || 'N/A'}</span>
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
              Bursar Signature
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
          className="flex items-center gap-2 bg-white dark:bg-slate-800 dark:text-white border-2 border-slate-200 dark:border-slate-700 px-5 py-2.5 rounded-2xl font-black text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95 no-print"
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
          <p className="text-xs font-bold text-indigo-200">Current Session: {currentSession}</p>
        </div>

        <div className={`lg:col-span-1 p-8 rounded-3xl shadow-lg relative overflow-hidden ${isCleared ? 'bg-emerald-600 shadow-emerald-100' : 'bg-rose-600 shadow-rose-100'} text-white transition-all`}>
           <CreditCard size={80} style={{ position: 'absolute', right: '-10px', top: '-10px', opacity: 0.15 }} />
           <p className="text-xs font-black opacity-80 uppercase tracking-widest mb-4">Outstanding Balance</p>
           <h3 className="text-4xl font-black mb-1">₦{balance.toLocaleString()}</h3>
           <p className="text-xs font-bold opacity-80">{isCleared ? 'Status: Fully Cleared' : 'Status: Payment Pending'}</p>
        </div>

        <div className="lg:col-span-1 bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col justify-center">
           <div className="flex justify-between items-end mb-4">
              <div>
                <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Payment Progress</p>
                <h3 className="text-2xl font-black text-slate-800 dark:text-white">{percentPaid}%</h3>
              </div>
              <span className={`text-[10px] font-black px-3 py-1 rounded-full ${isCleared ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                {percentPaid === 100 ? 'COMPLETED' : 'IN PROGRESS'}
              </span>
           </div>
           <div className="h-3 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-1000 ${isCleared ? 'bg-emerald-500' : 'bg-indigo-500'}`} 
                style={{ width: `${percentPaid}%` }} 
              />
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Recent Transactions */}
        <div className="card-white dark:bg-slate-800 dark:border-slate-700 overflow-hidden rounded-3xl border border-slate-200 shadow-sm">
          <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
             <Clock size={20} className="text-indigo-600 dark:text-indigo-400" />
             <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-tight">Payment History</h3>
          </div>
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                <tr>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {feeData.paid > 0 ? (
                  <tr>
                    <td className="px-6 py-5">
                      <p className="text-sm font-black text-slate-800 dark:text-slate-200">Bank Deposit / Transfer</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Recorded via Bursar Office</p>
                    </td>
                    <td className="px-6 py-5 text-sm font-bold text-slate-500 dark:text-slate-400">{feeData.lastDate}</td>
                    <td className="px-6 py-5 text-right font-black text-emerald-600 dark:text-emerald-400">₦{feeData.paid.toLocaleString()}</td>
                    <td className="px-6 py-5 text-right">
                      <button 
                        onClick={handlePrintReceipt}
                        className="inline-flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all"
                      >
                        <Printer size={12} /> Receipt
                      </button>
                    </td>
                  </tr>
                ) : (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center text-slate-400 dark:text-slate-500 font-bold italic">
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
          <div className="card-white dark:bg-slate-800 dark:border-slate-700 rounded-3xl border border-slate-200 shadow-sm p-8 border-t-4 border-t-emerald-500">
            <h4 className="text-lg font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <CreditCard size={20} className="text-emerald-500" />
              Pay Online (FirstChekOut)
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
              Pay your fees instantly using First Bank's secure payment gateway. Supports cards, bank transfers, USSD, and direct bank account debit.
            </p>
            
            {!isCleared ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Amount to Pay (₦)</label>
                  <input
                    type="number"
                    max={balance}
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 font-black text-slate-800 dark:text-white text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <button
                  onClick={handleOnlinePayment}
                  disabled={paying}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 px-6 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 dark:shadow-none hover:shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {paying ? 'Processing Checkout...' : `Pay ₦${parseFloat(payAmount || 0).toLocaleString()} Now`}
                </button>
              </div>
            ) : (
              <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 p-4 rounded-2xl text-sm font-bold text-center">
                All school fees for this term are fully cleared. No payments pending!
              </div>
            )}
          </div>

          <div className="card-white dark:bg-slate-800 dark:border-slate-700 rounded-3xl border border-slate-200 shadow-sm p-8 border-t-4 border-t-indigo-500">
            <h4 className="text-lg font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <AlertTriangle size={20} className="text-amber-500" />
              Payment Instructions
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
              To settle your outstanding balance, please proceed with a bank transfer to the school's official account listed below. Ensure you include your <strong className="dark:text-white">Registration Number</strong> in the transaction description.
            </p>
            
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-6 space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 dark:text-slate-400 font-bold">Bank Name</span>
                <span className="text-slate-900 dark:text-white font-black uppercase">First Bank of Nigeria</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 dark:text-slate-400 font-bold">Account Name</span>
                <span className="text-slate-900 dark:text-white font-black uppercase">Bonus Dominus School</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 dark:text-slate-400 font-bold">Account Number</span>
                <span className="text-slate-900 dark:text-white font-black font-mono text-lg">2022829027</span>
              </div>
            </div>

            <button 
              onClick={() => setShowScanner(true)}
              className="mt-6 w-full flex items-center gap-3 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-700 p-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-600 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider transition-all group"
            >
              <CheckCircle size={14} className="text-emerald-500" />
              Scan & Upload Receipt
              <ArrowRight size={12} className="ml-auto group-hover:translate-x-1 transition-transform" />
            </button>
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

      {/* Receipt Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 relative">
            <div className="p-6 border-b border-slate-100 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black m-0">Receipt Scanner</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest m-0">Upload or capture your payment evidence</p>
              </div>
              <button 
                onClick={() => setShowScanner(false)} 
                className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-rose-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 bg-slate-50">
              <ReceiptScanner 
                onComplete={(result) => {
                  console.log('Upload Complete:', result);
                  setShowScanner(false);
                  alert('Receipt uploaded successfully! Our bursar will review it shortly.');
                }}
                messageHubConfig={{
                  type: 'rest',
                  endpoint: import.meta.env.VITE_MESSAGE_HUB_URL,
                  apiKey: import.meta.env.VITE_MESSAGE_HUB_API_KEY,
                  topic: 'receipt.uploads'
                }}
                userId={currentStudent?.id || 'anonymous'}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentFees;


