import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { Link } from 'react-router-dom';
import { collection, getDocs, updateDoc, doc, setDoc, getDoc } from 'firebase/firestore';
import { DollarSign, AlertTriangle, Users, Mail, CheckCircle, Search, CreditCard, ChevronRight, Upload, Settings, X, FileText, Loader2, Printer, TrendingUp } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import bdsLogo from '../../assets/bdslogo.jpg';
import * as XLSX from 'xlsx';
import '../../assets/BursarDashboard.css';

const BursarDashboard = () => {
  const { schoolName, schoolLogo, bursarSignature, bursarStamp } = useTheme();
  const [students, setStudents] = useState([]);
  const [staff, setStaff] = useState([]);
  const [feeSettings, setFeeSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [status, setStatus] = useState({ message: '', type: '' });
  
  // Modal states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [activeView, setActiveView] = useState('ledgers'); // 'ledgers' or 'debtors'
  const [printMode, setPrintMode] = useState('none'); // 'none', 'receipt', 'list'
  const [selectedClass, setSelectedClass] = useState('All');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Get Fee Settings
      const feeSnap = await getDoc(doc(db, 'settings', 'fees'));
      const fees = feeSnap.exists() ? feeSnap.data() : { 
        'JSS 1': 45000, 'JSS 2': 45000, 'JSS 3': 45000, 
        'SS 1': 55000, 'SS 2 ART': 55000, 'SS 2 SCIENCE': 60000,
        'SS 3 ART': 55000, 'SS 3 SCIENCE': 60000, 'default': 45000 
      };
      setFeeSettings(fees);

      // 2. Get Students
      const stuSnap = await getDocs(collection(db, 'students'));
      const stuData = stuSnap.docs.map(doc => {
        const data = doc.data();
        const studentClass = data.className || data.classId || 'Unassigned';
        const expected = fees[studentClass] || fees['default'] || 45000;
        
        return {
          id: doc.id,
          name: data.name || data['STUDENT NAME'] || 'Unknown',
          regNo: data.regNo || data['REG NO'] || data.id,
          class: studentClass,
          expectedFee: expected,
          paidFee: data.paidFee || 0,
          lastPaymentDate: data.lastPaymentDate || 'N/A'
        };
      });

      // 3. Get Staff
      const stSnap = await getDocs(collection(db, 'staff'));
      const stData = stSnap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          role: data.role,
          salary: data.salary || 0
        };
      });

      setStudents(stuData);
      setStaff(stData);
      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  useEffect(() => {
    // Calling async fetchData to avoid synchronous setState warnings in effect
    const initialize = async () => {
      await fetchData();
    };
    initialize();
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(10);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        setUploadProgress(30);
        let count = 0;
        const total = data.length;

        for (const row of data) {
          const regNo = (row['reg no'] || row['Reg No'] || row['REG NO'] || '').toString().trim();
          const amount = parseFloat(row['amount deposited'] || row['Amount'] || 0);
          const date = row['date paid'] || new Date().toISOString().split('T')[0];
          
          if (regNo && amount > 0) {
            // Find student by regNo
            const student = students.find(s => s.regNo === regNo);
            if (student) {
              const studentRef = doc(db, 'students', student.id);
              const newPaid = (student.paidFee || 0) + amount;
              await updateDoc(studentRef, { 
                paidFee: newPaid,
                lastPaymentDate: date
              });
              count++;
            }
          }
          setUploadProgress(30 + Math.floor((count / total) * 60));
        }

        setUploadProgress(100);
        setStatus({ type: 'success', message: `Successfully updated ${count} student records.` });
        setTimeout(() => {
          setIsUploading(false);
          setShowUploadModal(false);
          fetchData();
        }, 1500);
      } catch (error) {
        console.error(error);
        setStatus({ type: 'error', message: 'Error processing Excel file.' });
        setIsUploading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const saveFeeSettings = async (newSettings) => {
    try {
      await setDoc(doc(db, 'settings', 'fees'), newSettings);
      setFeeSettings(newSettings);
      setShowSettingsModal(false);
      setStatus({ type: 'success', message: 'School fees updated successfully.' });
      fetchData();
    } catch (e) {
      console.error(e);
      setStatus({ type: 'error', message: 'Failed to save settings.' });
    }
  };

  const handleReceivePayment = async (student, amount) => {
    try {
      const studentRef = doc(db, 'students', student.id);
      const newPaid = (student.paidFee || 0) + amount;
      await updateDoc(studentRef, { 
        paidFee: newPaid,
        lastPaymentDate: new Date().toISOString().split('T')[0]
      });
      
      setStatus({ type: 'success', message: `Payment of ₦${amount.toLocaleString()} recorded for ${student.name}` });
      fetchData();
    } catch (e) {
      console.error(e);
      setStatus({ type: 'error', message: 'Failed to process payment.' });
    }
  };

  // Calculations
  const totalExpected = students.reduce((sum, stu) => sum + stu.expectedFee, 0);
  const totalCollected = students.reduce((sum, stu) => sum + (stu.paidFee || 0), 0);
  const totalPending = totalExpected - totalCollected;
  const targetMetPercent = Math.round((totalCollected / totalExpected) * 100) || 0;

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         s.regNo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = selectedClass === 'All' || s.class === selectedClass;
    return matchesSearch && matchesClass;
  });

  const classList = [...new Set(students.map(s => s.class))].sort();

  const handlePrintReceipt = (student) => {
    setSelectedStudent(student);
    setPrintMode('receipt');
    setTimeout(() => {
      window.print();
      setPrintMode('none');
    }, 400);
  };

  const handleExportToExcel = () => {
    try {
      const filtered = selectedClass === 'All' ? students : students.filter(s => s.class === selectedClass);
      const rows = filtered.map((s, idx) => ({
        'S/N': idx + 1,
        'STUDENT NAME': s.name,
        'REG NO': s.regNo,
        'CLASS': s.class,
        'EXPECTED FEE (₦)': s.expectedFee,
        'AMOUNT PAID (₦)': s.paidFee || '',
        'BALANCE (₦)': s.expectedFee - (s.paidFee || 0),
        'PAYMENT DATE': s.lastPaymentDate !== 'N/A' ? s.lastPaymentDate : '',
        'STATUS': s.paidFee >= s.expectedFee ? 'FULLY PAID' : s.paidFee > 0 ? 'PARTIAL' : 'NOT PAID'
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [
        { wch: 5 }, { wch: 30 }, { wch: 15 }, { wch: 14 },
        { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 15 }, { wch: 12 }
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Fee Collection');
      const filename = `fee-collection-${selectedClass.replace(/\s/g, '-')}-${new Date().toISOString().slice(0,10)}.xlsx`;
      XLSX.writeFile(wb, filename);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export Excel file. Please try again.");
    }
  };

  const handlePrintList = () => {
    setPrintMode('list');
    setTimeout(() => {
      window.print();
      setPrintMode('none');
    }, 400);
  };



  // Class-wise collection stats for bar chart
  const classCollectionStats = classList.map(cls => {
    const classStudents = students.filter(s => s.class === cls);
    const expected = classStudents.reduce((sum, s) => sum + s.expectedFee, 0);
    const collected = classStudents.reduce((sum, s) => sum + s.paidFee, 0);
    const percent = expected > 0 ? Math.round((collected / expected) * 100) : 0;
    return { name: cls, percent, expected, collected };
  });

  // Payment status distribution for pie chart
  const paymentStatusStats = {
    fullyPaid: students.filter(s => s.paidFee >= s.expectedFee).length,
    partiallyPaid: students.filter(s => s.paidFee > 0 && s.paidFee < s.expectedFee).length,
    notPaid: students.filter(s => s.paidFee === 0).length,
  };

  const totalStudents = students.length;
  const fullyPaidPercent = totalStudents > 0 ? (paymentStatusStats.fullyPaid / totalStudents) * 100 : 0;
  const partiallyPaidPercent = totalStudents > 0 ? (paymentStatusStats.partiallyPaid / totalStudents) * 100 : 0;
  const notPaidPercent = totalStudents > 0 ? (paymentStatusStats.notPaid / totalStudents) * 100 : 0;

  return (
    <div className="animate-in fade-in duration-500">
      {/* Main Dashboard UI - Hidden when printing */}
      <div className="p-4 md:p-8 space-y-8 no-print">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Finance Command Center</h2>
          <p className="text-slate-500 font-medium">Bursar's hub for school fees, warnings, and payroll.</p>
        </div>
        <div className="flex gap-3">
          <Link 
            to="/profile"
            className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2.5 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
          >
            <Users size={18} /> My Profile
          </Link>
          <button 
            onClick={() => setShowSettingsModal(true)}
            className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2.5 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
          >
            <Settings size={18} /> Set Fees
          </button>
          <button 
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
          >
            <Upload size={18} /> Bulk Upload Fees
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-emerald-600 p-6 rounded-3xl shadow-lg relative overflow-hidden flex flex-col justify-between h-40">
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <DollarSign size={80} color="white" />
          </div>
          <p className="text-[10px] font-bold text-emerald-100 tracking-widest uppercase relative z-10">Total Collected</p>
          <h3 className="text-3xl font-black text-white relative z-10">₦{totalCollected.toLocaleString()}</h3>
          <div className="text-[10px] font-bold text-emerald-200/60 mt-2">Target: ₦{totalExpected.toLocaleString()}</div>
        </div>
        
        <div className="bg-rose-600 p-6 rounded-3xl shadow-lg relative overflow-hidden flex flex-col justify-between h-40">
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <AlertTriangle size={80} color="white" />
          </div>
          <p className="text-[10px] font-bold text-rose-100 tracking-widest uppercase relative z-10">Pending Fees</p>
          <h3 className="text-3xl font-black text-white relative z-10">₦{totalPending.toLocaleString()}</h3>
          <div className="text-[10px] font-bold text-rose-200/60 mt-2">Total Debtors: {paymentStatusStats.partiallyPaid + paymentStatusStats.notPaid}</div>
        </div>

        <div className="bg-slate-900 p-6 rounded-3xl shadow-lg flex flex-col justify-center h-40 sm:col-span-2 lg:col-span-1">
          <div className="flex justify-between items-end mb-4">
            <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Collection Rate</p>
            <span className="text-2xl font-black text-white leading-none">{targetMetPercent}%</span>
          </div>
          <div className="h-4 w-full bg-slate-800 rounded-full overflow-hidden shadow-inner p-1">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
              style={{ width: `${targetMetPercent}%` }}
            ></div>
          </div>
          <div className="flex justify-between mt-3">
             <span className="text-[9px] font-black text-slate-500 uppercase">0%</span>
             <span className="text-[9px] font-black text-slate-500 uppercase">Term Progress: 65%</span>
             <span className="text-[9px] font-black text-slate-500 uppercase">100%</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col justify-center h-40">
          <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-2">View & Export</p>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveView(activeView === 'ledgers' ? 'debtors' : 'ledgers')}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${activeView === 'debtors' ? 'bg-rose-600 text-white shadow-lg shadow-rose-100' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {activeView === 'debtors' ? 'Back to Ledgers' : 'Debtor List'}
            </button>
            <button
              onClick={handlePrintList}
              title="Print current list"
              className="px-4 py-3 bg-slate-900 text-white rounded-xl hover:bg-black transition-all shadow-lg shadow-slate-200"
            >
              <Printer size={16} />
            </button>
            <button
              onClick={handleExportToExcel}
              title="Download fee collection Excel template"
              className="px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
            >
              <FileText size={16} />
            </button>
          </div>
        </div>
      </div>


      {/* Visual Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Class-wise Collection Bar Chart */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
           <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
             <TrendingUp size={16} className="text-indigo-600" /> Class Collection Metrics (%)
           </h4>
           <div className="space-y-4">
             {classCollectionStats.map((stat, idx) => (
               <div key={idx} className="space-y-1">
                 <div className="flex justify-between items-center text-xs">
                   <span className="font-bold text-slate-600">{stat.name}</span>
                   <span className="font-black text-slate-900">{stat.percent}% <span className="text-[10px] font-medium text-slate-400 ml-1">(₦{stat.collected.toLocaleString()})</span></span>
                 </div>
                 <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-600 rounded-full transition-all duration-1000"
                      style={{ width: `${stat.percent}%`, opacity: 0.3 + (stat.percent / 150) }}
                    ></div>
                 </div>
               </div>
             ))}
           </div>
        </div>

        {/* Payment Status Pie Chart Visual */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center gap-8">
           <div className="relative w-40 h-40 flex-shrink-0">
             <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
               {/* Background Circle */}
               <circle cx="18" cy="18" r="15.9" fill="transparent" stroke="#f1f5f9" strokeWidth="3.5"></circle>
               
               {/* Fully Paid Segment */}
               <circle 
                 cx="18" cy="18" r="15.9" 
                 fill="transparent" 
                 stroke="#10b981" 
                 strokeWidth="3.5" 
                 strokeDasharray={`${fullyPaidPercent} 100`} 
                 className="transition-all duration-1000"
               ></circle>
               
               {/* Partially Paid Segment */}
               <circle 
                 cx="18" cy="18" r="15.9" 
                 fill="transparent" 
                 stroke="#f59e0b" 
                 strokeWidth="3.5" 
                 strokeDasharray={`${partiallyPaidPercent} 100`} 
                 strokeDashoffset={`-${fullyPaidPercent}`}
                 className="transition-all duration-1000"
               ></circle>

               {/* Not Paid Segment */}
               <circle 
                 cx="18" cy="18" r="15.9" 
                 fill="transparent" 
                 stroke="#ef4444" 
                 strokeWidth="3.5" 
                 strokeDasharray={`${notPaidPercent} 100`} 
                 strokeDashoffset={`-${fullyPaidPercent + partiallyPaidPercent}`}
                 className="transition-all duration-1000"
               ></circle>
             </svg>
             <div className="absolute inset-0 flex flex-col items-center justify-center">
               <span className="text-2xl font-black text-slate-800">{totalStudents}</span>
               <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Total Students</span>
             </div>
           </div>

           <div className="flex-1 space-y-4 w-full">
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-2">Payment Distribution</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50 border border-emerald-100">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                    <span className="text-xs font-bold text-emerald-700">Fully Paid</span>
                  </div>
                  <span className="text-xs font-black text-emerald-800">{paymentStatusStats.fullyPaid} Students</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-50 border border-amber-100">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                    <span className="text-xs font-bold text-amber-700">Partially Paid</span>
                  </div>
                  <span className="text-xs font-black text-amber-800">{paymentStatusStats.partiallyPaid} Students</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-rose-50 border border-rose-100">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                    <span className="text-xs font-bold text-rose-700">Not Paid</span>
                  </div>
                  <span className="text-xs font-black text-rose-800">{paymentStatusStats.notPaid} Students</span>
                </div>
              </div>
           </div>
        </div>
      </div>

      {status.message && (
        <div className={`p-4 rounded-xl flex items-center gap-3 font-bold text-sm animate-in slide-in-from-top-4 ${status.type === 'error' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
          {status.type === 'error' ? <AlertTriangle size={20} /> : <CheckCircle size={20} />}
          {status.message}
          <button onClick={() => setStatus({})} className="ml-auto hover:opacity-50"><X size={16} /></button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left Col: Fee Management Table */}
        <div className="xl:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[650px]">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <DollarSign className="text-indigo-600" /> {activeView === 'debtors' ? 'Class Debtor List' : 'Student Financial Ledgers'}
            </h3>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="flex gap-2">
                <select 
                  value={selectedClass} 
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="px-4 py-2 rounded-xl bg-slate-50 border-2 border-slate-100 font-bold text-slate-700 outline-none focus:border-indigo-500"
                >
                  <option value="All">All Classes</option>
                  {classList.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button 
                  onClick={handlePrintList}
                  className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl font-bold hover:bg-black transition-all"
                >
                  <Printer size={16} /> Print {activeView === 'debtors' ? 'Debtors' : 'Class List'}
                </button>
              </div>
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                  type="text" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border-none outline-none text-xs transition-all focus:ring-2 focus:ring-indigo-500 font-bold"
                />
              </div>
            </div>
          </div>
          
          <div className="overflow-y-auto flex-1 p-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 size={40} className="animate-spin text-indigo-600" />
                <p className="font-bold text-slate-400">Loading student ledgers...</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-20">
                <Search size={48} className="mx-auto text-slate-200 mb-4" />
                <p className="font-bold text-slate-400">No students found matching your search.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredStudents.map(student => {
                  const isCleared = student.paidFee >= student.expectedFee;
                  const balance = student.expectedFee - student.paidFee;
                  
                  return (
                    <div key={student.id} className={`p-4 rounded-2xl border-2 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all hover:shadow-md ${isCleared ? 'border-emerald-100 bg-emerald-50/20' : 'border-rose-100 bg-rose-50/20'}`}>
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${isCleared ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                          {student.name[0]}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{student.name}</p>
                          <p className="text-xs font-bold text-slate-500">{student.regNo} &bull; {student.class}</p>
                          <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase">Last Payment: {student.lastPaymentDate}</p>
                        </div>
                      </div>
                      
                      <div className="flex flex-col md:flex-row items-start md:items-center gap-6 w-full md:w-auto">
                        <div className="text-left md:text-right">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {isCleared ? 'Account Cleared' : `Outstanding / Total`}
                          </p>
                          <div className="flex items-center md:justify-end gap-1.5">
                             <p className={`text-xl font-black ${isCleared ? 'text-emerald-600' : 'text-rose-600'}`}>
                               ₦{isCleared ? '0' : balance.toLocaleString()}
                             </p>
                             <span className="text-[10px] font-medium text-slate-400">/ ₦{student.expectedFee.toLocaleString()}</span>
                          </div>
                        </div>
                        
                        <div className="flex gap-2 w-full md:w-auto">
                          {!isCleared && (
                            <button 
                              onClick={() => {
                                const amt = prompt(`Enter payment amount for ${student.name} (Balance: ₦${balance})`, balance);
                                if (amt) handleReceivePayment(student, parseFloat(amt));
                              }}
                              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-xl text-xs font-black transition-all shadow-lg shadow-emerald-100 active:scale-95"
                            >
                              <CreditCard size={14} /> Pay Fee
                            </button>
                          )}
                          {student.paidFee > 0 && (
                            <button 
                              onClick={() => handlePrintReceipt(student)}
                              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 px-5 py-3 rounded-xl text-xs font-black hover:bg-slate-50 transition-all no-print"
                            >
                              <Printer size={14} /> Receipt
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Staff Payroll Assignment */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[650px]">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <Users className="text-indigo-600" /> Staff Payroll Assignment
            </h3>
            <p className="text-xs text-slate-500 mt-1">Assign monthly salary metrics to faculty members.</p>
          </div>
          
          <div className="overflow-y-auto flex-1 p-4 space-y-4">
            {loading ? (
              <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin text-indigo-600" /></div>
            ) : staff.length === 0 ? (
              <div className="text-center py-20 font-bold text-slate-400 italic">No staff found.</div>
            ) : staff.map(s => (
              <div key={s.id} className="p-5 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col gap-4 group hover:border-indigo-200 transition-all">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-black text-slate-800 text-sm group-hover:text-indigo-600 transition-colors">{s.name}</p>
                    <span className={`text-[9px] uppercase font-black tracking-[0.2em] px-2 py-0.5 rounded-md border mt-1 inline-block ${s.role === 'admin' || s.role === 'principal' ? 'border-amber-200 text-amber-600 bg-amber-50' : 'border-indigo-200 text-indigo-600 bg-indigo-50'}`}>
                      {s.role}
                    </span>
                  </div>
                </div>
                
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-lg">₦</div>
                  <input 
                    type="number"
                    value={s.salary || ''}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      const staffRef = doc(db, 'staff', s.id);
                      updateDoc(staffRef, { salary: val });
                      setStaff(prev => prev.map(item => item.id === s.id ? {...item, salary: val} : item));
                    }}
                    placeholder="Set monthly salary"
                    className="w-full pl-10 pr-4 py-3.5 rounded-2xl border-2 border-transparent bg-white shadow-sm focus:border-indigo-500 font-black text-slate-700 outline-none transition-all placeholder:text-slate-300"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 relative">
            <button onClick={() => setShowUploadModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600"><X size={24} /></button>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Upload size={32} />
              </div>
              <h3 className="text-2xl font-black text-slate-900">Bulk Fee Upload</h3>
              <p className="text-slate-500 text-sm">Upload Excel file with columns: <br/> <strong>reg no, student name, amount deposited, date paid</strong></p>
            </div>

            <div className="space-y-6">
              {!isUploading ? (
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center hover:border-indigo-400 transition-all cursor-pointer relative">
                  <input 
                    type="file" 
                    accept=".xlsx, .xls" 
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <FileText className="mx-auto text-slate-300 mb-2" size={40} />
                  <p className="text-sm font-bold text-slate-500">Click to browse or drag Excel here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between text-sm font-bold text-slate-700">
                    <span>Processing records...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-600 transition-all" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                  <p className="text-xs text-center text-slate-400 flex items-center justify-center gap-2">
                    <Loader2 size={12} className="animate-spin" /> Do not close this window
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in no-print">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8 relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowSettingsModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600"><X size={24} /></button>
            <h3 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-2"><Settings className="text-indigo-600" /> Class Fee Configuration</h3>
            
            <div className="space-y-4">
              {Object.keys(feeSettings).filter(k => k !== 'default').map(cls => (
                <div key={cls} className="flex items-center gap-4">
                  <label className="w-32 font-bold text-slate-600 text-sm">{cls}</label>
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₦</span>
                    <input 
                      type="number" 
                      value={feeSettings[cls]} 
                      onChange={e => setFeeSettings({...feeSettings, [cls]: parseFloat(e.target.value) || 0})}
                      className="w-full pl-8 pr-4 py-2 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none font-bold"
                    />
                  </div>
                </div>
              ))}
              <div className="pt-4 border-t border-slate-100">
                <label className="block font-bold text-slate-600 text-sm mb-2">Default Fee (for other classes)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₦</span>
                  <input 
                    type="number" 
                    value={feeSettings['default']} 
                    onChange={e => setFeeSettings({...feeSettings, 'default': parseFloat(e.target.value) || 0})}
                    className="w-full pl-8 pr-4 py-2 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none font-bold"
                  />
                </div>
              </div>
              <button 
                onClick={() => saveFeeSettings(feeSettings)}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black mt-6 hover:bg-black transition-all active:scale-95 shadow-xl"
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal (Screen Only — no-print) */}
      {showReceiptModal && selectedStudent && (
        <div className="no-print fixed inset-0 z-[100] flex items-center justify-center bg-white sm:bg-slate-900/40 p-0 sm:p-4">
          <div className="bg-white w-full max-w-lg p-8 rounded-none sm:rounded-3xl shadow-none sm:shadow-2xl relative border sm:border-none">
            <button onClick={() => setShowReceiptModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={24} /></button>
            <div className="flex flex-col items-center border-b-2 border-dashed border-slate-200 pb-6 mb-6">
              <div className="flex items-center gap-4 mb-4">
                <img src={schoolLogo || bdsLogo} alt="School Logo" style={{ height: '64px', width: '64px', objectFit: 'contain', borderRadius: '8px' }} />
                <div className="text-left">
                  <h2 className="text-lg font-black text-slate-900 leading-tight uppercase">{schoolName || 'BONUS DOMINUS NURSERY & PRIMARY'}</h2>
                  <p className="text-[10px] font-bold text-slate-500">EXCELLENCE IN LEARNING & CHARACTER</p>
                </div>
              </div>
              <h1 className="text-xl font-black uppercase tracking-tight text-slate-800">Official Payment Receipt</h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">Transaction ID: {selectedStudent.id.slice(-6).toUpperCase()}{selectedStudent.lastPaymentDate.replace(/-/g, '')}</p>
            </div>
            <div className="space-y-4 mb-8">
              <div className="flex justify-between"><span className="text-slate-500 font-bold uppercase text-xs">Payer Name</span><span className="font-black text-slate-900">{selectedStudent.name}</span></div>
              <div className="flex justify-between"><span className="text-slate-500 font-bold uppercase text-xs">Registration No</span><span className="font-black text-slate-900">{selectedStudent.regNo}</span></div>
              <div className="flex justify-between"><span className="text-slate-500 font-bold uppercase text-xs">Class</span><span className="font-black text-slate-900">{selectedStudent.class}</span></div>
              <div className="flex justify-between"><span className="text-slate-500 font-bold uppercase text-xs">Payment Date</span><span className="font-black text-slate-900">{selectedStudent.lastPaymentDate}</span></div>
            </div>
            <div className="bg-slate-50 p-6 rounded-2xl border-2 border-slate-100 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-black uppercase text-xs">Amount Paid</span>
                <span className="text-3xl font-black text-emerald-600">₦{selectedStudent.paidFee.toLocaleString()}</span>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between items-center">
                <span className="text-slate-500 font-bold uppercase text-xs">Outstanding Balance</span>
                <span className="font-black text-rose-600">₦{(selectedStudent.expectedFee - selectedStudent.paidFee).toLocaleString()}</span>
              </div>
            </div>
            <button
              onClick={() => handlePrintReceipt(selectedStudent)}
              className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-3 rounded-2xl font-black hover:bg-black transition-all"
            >
              <Printer size={18} /> Print Receipt
            </button>
          </div>
        </div>
      )}

      {/* ── Return early if printing ── */}
      {printMode === 'receipt' && selectedStudent && (
        <div className="bursar-print-receipt-area">
          <style>{`
            @media print {
              @page { size: A4 portrait; margin: 15mm; }
              body { background: white !important; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .bursar-print-receipt-area { display: block !important; width: 100%; position: relative; }
            }
            .bursar-print-receipt-area { display: block !important; width: 100%; max-width: 600px; margin: 0 auto; padding: 20px; font-family: sans-serif; }
          `}</style>
          <div style={{ maxWidth: '600px', margin: '0 auto', padding: '40px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', borderBottom: '2px dashed #cbd5e1', paddingBottom: '24px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                <img src={schoolLogo || bdsLogo} alt="Logo" style={{ height: '72px', width: '72px', objectFit: 'contain', borderRadius: '8px' }} />
                <div style={{ textAlign: 'left' }}>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 900, textTransform: 'uppercase', color: '#0f172a' }}>{schoolName || 'BONUS DOMINUS NURSERY & PRIMARY'}</h2>
                  <p style={{ margin: '4px 0 0', fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>EXCELLENCE IN LEARNING & CHARACTER</p>
                </div>
              </div>
              <h1 style={{ margin: '8px 0 4px', fontSize: '22px', fontWeight: 900, textTransform: 'uppercase', color: '#1e293b' }}>Official Payment Receipt</h1>
              <p style={{ margin: 0, fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Transaction ID: {selectedStudent.id.slice(-6).toUpperCase()}{selectedStudent.lastPaymentDate.replace(/-/g, '')}</p>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
              <tbody>
                {[['Payer Name', selectedStudent.name], ['Registration No', selectedStudent.regNo], ['Class', selectedStudent.class], ['Payment Date', selectedStudent.lastPaymentDate]].map(([label, value]) => (
                  <tr key={label} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px 0', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', width: '40%' }}>{label}</td>
                    <td style={{ padding: '10px 0', fontSize: '13px', fontWeight: 900, color: '#0f172a', textAlign: 'right' }}>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ background: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>Amount Paid</span>
                <span style={{ fontSize: '28px', fontWeight: 900, color: '#059669' }}>₦{selectedStudent.paidFee.toLocaleString()}</span>
              </div>
              <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '12px', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Outstanding Balance</span>
                <span style={{ fontSize: '16px', fontWeight: 900, color: '#e11d48' }}>₦{(selectedStudent.expectedFee - selectedStudent.paidFee).toLocaleString()}</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '32px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ height: '40px', width: '120px', borderBottom: '2px solid #0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {bursarSignature && <img src={bursarSignature} alt="Sig" style={{ height: '100%', objectFit: 'contain' }} />}
                </div>
                <p style={{ fontSize: '8px', fontWeight: 900, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '2px', color: '#94a3b8' }}>Bursar Signature</p>
              </div>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', border: '2px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', opacity: 0.6 }}>
                {bursarStamp ? <img src={bursarStamp} alt="Stamp" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <p style={{ fontSize: '7px', fontWeight: 900, textTransform: 'uppercase', color: '#cbd5e1', textAlign: 'center' }}>Authorized Bursar</p>}
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', color: '#94a3b8' }}>Verify Slip</p>
                <p style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: 700, letterSpacing: '3px', marginTop: '4px' }}>{selectedStudent.regNo}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {printMode === 'list' && (
        <div className="bursar-debtors-print-area">
          <style>{`
            @media print {
              @page { size: A4 portrait; margin: 15mm; }
              body { background: white !important; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .bursar-debtors-print-area { display: block !important; width: 100%; position: relative; }
            }
            .bursar-debtors-print-area { display: block !important; width: 100%; padding: 20px; font-family: sans-serif; color: black; }
          `}</style>
          <div className="flex flex-col items-center text-center mb-10 border-b-4 border-slate-900 pb-8">
            <div className="flex items-center gap-6 mb-4">
               <img src={schoolLogo || bdsLogo} alt="Logo" className="w-24 h-24 object-contain" />
               <div className="text-left">
                  <h1 className="text-4xl font-black uppercase tracking-tighter leading-none">{schoolName || 'BONUS DOMINUS NURSERY & PRIMARY'}</h1>
                  <h2 className="text-xl font-bold text-slate-600 mt-2 uppercase">Official {activeView === 'debtors' ? 'Debtors Analysis' : 'Class List'} Report</h2>
               </div>
            </div>
            <p className="font-bold text-slate-500">Document Generated: {new Date().toLocaleDateString()}</p>
            <div className="mt-4 flex gap-4">
              <div className="bg-slate-900 text-white px-6 py-2 rounded-full font-black uppercase text-sm">
                Class: {selectedClass}
              </div>
              <div className="bg-slate-100 text-slate-900 px-6 py-2 rounded-full font-black uppercase text-sm border-2 border-slate-900">
                Verified Document
              </div>
            </div>
          </div>
          <table className="w-full border-collapse border-2 border-slate-900">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-900 p-3 text-left">S/N</th>
                <th className="border border-slate-900 p-3 text-left">Student Name</th>
                <th className="border border-slate-900 p-3 text-left">Reg No</th>
                <th className="border border-slate-900 p-3 text-right">Paid</th>
                <th className="border border-slate-900 p-3 text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {(activeView === 'debtors' ? filteredStudents.filter(s => s.paidFee < s.expectedFee) : filteredStudents).map((s, idx) => (
                <tr key={s.id}>
                  <td className="border border-slate-900 p-3 text-center">{idx + 1}</td>
                  <td className="border border-slate-900 p-3 font-bold">{s.name}</td>
                  <td className="border border-slate-900 p-3">{s.regNo}</td>
                  <td className="border border-slate-900 p-3 text-right">₦{s.paidFee.toLocaleString()}</td>
                  <td className="border border-slate-900 p-3 text-right font-black">₦{(s.expectedFee - s.paidFee).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-10 pt-10 border-t-2 border-dashed flex justify-between">
            <div className="text-center">
              <div className="w-40 border-b border-black h-10"></div>
              <p className="text-xs font-bold mt-2 uppercase">Bursar's Signature</p>
            </div>
            <div className="text-center">
              <div className="w-40 border-b border-black h-10"></div>
              <p className="text-xs font-bold mt-2 uppercase">Principal's Approval</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BursarDashboard;
