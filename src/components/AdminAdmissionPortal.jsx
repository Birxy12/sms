import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, getDocs, where } from 'firebase/firestore';
import { Printer, Search, Loader2, Edit, Trash2, X, Check, MoreVertical } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { useTheme } from '../context/ThemeContext';
import { ensureStudentEnrolled } from '../utils/studentEnroller';
import QRCodeDisplay from './QRCodeDisplay';
import { getApplicantFeeBreakdown, formatNaira } from '../utils/prospectusFees';
import { getDoc } from 'firebase/firestore';
import AnalyticsReportModal from './AnalyticsReportModal';

const AdminAdmissionPortal = () => {
  const [admissions, setAdmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [printingId, setPrintingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editStatus, setEditStatus] = useState('');
  const [editName, setEditName] = useState('');
  const [editExamStatus, setEditExamStatus] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [feeSettings, setFeeSettings] = useState({});
  const { schoolName, schoolLogo, primaryColor } = useTheme();

  // Tab & Filter States
  const [activeTab, setActiveTab] = useState('All');
  const [filterClass, setFilterClass] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [showAnalysis, setShowAnalysis] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveDropdown(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'admissions'));
    const unsub = onSnapshot(q, (snap) => {
      const ads = [];
      snap.forEach(doc => {
        ads.push({ id: doc.id, ...doc.data() });
      });
      ads.sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return db - da;
      });
      setAdmissions(ads);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching admissions:', error);
      setLoading(false);
    });
    
    // Fetch fee settings for letter rendering
    getDoc(doc(db, 'settings', 'fees')).then(snap => {
      if (snap.exists()) setFeeSettings(snap.data() || {});
    }).catch(console.error);

    return () => unsub();
  }, []);

  const formatDate = (dateVal) => {
    if (!dateVal) return 'N/A';
    try {
      if (typeof dateVal.toDate === 'function') return dateVal.toDate().toLocaleDateString();
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return 'Invalid Date';
      return d.toLocaleDateString();
    } catch { return 'Invalid Date'; }
  };

  const handlePrint = async (admission) => {
    setPrintingId(admission.id);
    try {
      const element = document.getElementById(`slip-${admission.id}`);
      if (!element) return;
      element.style.display = 'block';

      const opt = {
        margin: 10,
        filename: `Admission-Slip-${admission.applicationNumber || admission.id}.pdf`,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await html2pdf().set(opt).from(element).save();
      
      element.style.display = 'none';
    } catch (err) {
      console.error('Print failed:', err);
      alert('Failed to generate admission slip.');
    } finally {
      setPrintingId(null);
    }
  };

  const handlePrintLetter = (admission) => {
    const element = document.getElementById(`letter-${admission.id}`);
    if (!element) return;
    const printWindow = window.open('', '_blank', 'width=900,height=900');
    if (!printWindow) {
      window.alert('Please allow pop-ups to print the admission letter.');
      return;
    }
    const letterMarkup = element.innerHTML;
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Admission Letter</title><style>body{margin:0;padding:24px;background:#fff;color:#111827;font-family:Arial,sans-serif}*{box-sizing:border-box}img{max-width:100%}</style></head><body>${letterMarkup}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
  };

  const handleDownloadLetterPdf = async (admission) => {
    setPrintingId(admission.id + '-letter');
    try {
      const element = document.getElementById(`letter-${admission.id}`);
      if (!element) return;
      element.style.display = 'block';

      const opt = {
        margin: [10, 10, 10, 10],
        filename: `Admission-Letter-${admission.applicationNumber || admission.id}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await html2pdf().set(opt).from(element).save();
      element.style.display = 'none';
    } catch (err) {
      console.error('PDF download failed:', err);
      alert('Failed to generate admission letter.');
    } finally {
      setPrintingId(null);
    }
  };

  const handleUpdateStatus = async (id, adm) => {
    if (!editStatus) return;
    setIsUpdating(true);
    try {
      let regNo = adm.regNo || null;
      if (editStatus === 'Admitted' && !regNo) {
        // Enforce regNo generation if missing
        regNo = await ensureStudentEnrolled({
          ...adm,
          fullName: editName || adm.studentName || adm.fullName || adm.applicantName
        }, 'granted', regNo);
      }

      await updateDoc(doc(db, 'admissions', id), {
        status: editStatus,
        cbtCompleted: editExamStatus,
        studentName: editName || adm.studentName || adm.fullName || adm.applicantName,
        regNo: regNo,
        updatedAt: new Date().toISOString()
      });
      setEditingId(null);
      setEditStatus('');
      setEditName('');
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to completely delete the admission record for ${name}? This action cannot be undone.`)) return;
    
    try {
      await deleteDoc(doc(db, 'admissions', id));
    } catch (error) {
      console.error('Error deleting record:', error);
      alert('Failed to delete record.');
    }
  };

  const getStatusStyle = (status) => {
    const s = (status || 'pending').toLowerCase();
    if (s === 'admitted' || s === 'approved' || s === 'accepted') return 'bg-emerald-100 text-emerald-700';
    if (s === 'not admitted' || s === 'rejected' || s === 'declined') return 'bg-rose-100 text-rose-700';
    return 'bg-amber-100 text-amber-700'; // pending
  };

  const filteredAdmissions = admissions.filter(a => {
    const s = searchTerm.toLowerCase();
    const name = (a.studentName || a.fullName || a.applicantName || '').toLowerCase();
    const appNo = (a.appNo || a.applicationNumber || a.id || '').toLowerCase();
    const matchesSearch = name.includes(s) || appNo.includes(s);
    if (!matchesSearch) return false;

    if (activeTab === 'Admitted') {
      const isAdmitted = a.status?.toLowerCase() === 'admitted' || a.status?.toLowerCase() === 'granted';
      if (!isAdmitted) return false;
      const targetClass = a.classApplyingFor || a.targetClass || a.appliedClass || a.class || a.className;
      if (filterClass && targetClass !== filterClass) return false;
      if (filterYear && a.createdAt) {
         const year = new Date(a.createdAt.toDate ? a.createdAt.toDate() : a.createdAt).getFullYear().toString();
         if (filterYear !== year) return false;
      }
      return true;
    }

    if (activeTab === 'PendingCBT') {
      return !a.cbtCompleted;
    }

    return true; // All
  });

  const totalAdmittedCount = admissions.filter(a => a.status?.toLowerCase() === 'admitted' || a.status?.toLowerCase() === 'granted').length;
  const totalPendingCBTCount = admissions.filter(a => !a.cbtCompleted).length;

  const analysisData = {
    kpis: [
      { title: 'Total Admissions', value: admissions.length, change: '100%', isPositive: true },
      { title: 'Total Admitted', value: totalAdmittedCount, change: `${Math.round((totalAdmittedCount/Math.max(1, admissions.length))*100)}%`, isPositive: true },
      { title: 'Pending CBT', value: totalPendingCBTCount, change: `${Math.round((totalPendingCBTCount/Math.max(1, admissions.length))*100)}%`, isPositive: false },
      { title: 'Filtered View', value: filteredAdmissions.length, change: 'Current Selection', isPositive: true }
    ],
    enrollmentTrend: filteredAdmissions.slice(0, 10).map(a => ({
      period: (a.studentName || a.fullName || a.applicantName || 'Unknown'),
      students: a.cbtPercentage || 0,
      teachers: a.status || 'Pending'
    }))
  };

  const getAvailableClasses = () => {
    const classes = new Set();
    admissions.forEach(a => {
      const c = a.classApplyingFor || a.targetClass || a.appliedClass || a.class || a.className;
      if (c) classes.add(c);
    });
    return Array.from(classes).sort();
  };

  const getAvailableYears = () => {
    const years = new Set();
    admissions.forEach(a => {
      if (a.createdAt) {
        years.add(new Date(a.createdAt.toDate ? a.createdAt.toDate() : a.createdAt).getFullYear().toString());
      }
    });
    return Array.from(years).sort((a,b)=>b-a);
  };

  const handleFixStatuses = async () => {
    if (!window.confirm("This will auto-update the Admission Status for all students who scored 40% and above. Proceed?")) return;
    setIsUpdating(true);
    try {
      let updated = 0;
      for (const adm of admissions) {
        if (adm.cbtCompleted && typeof adm.cbtPercentage === 'number') {
          const correctStatus = adm.cbtPercentage >= 40 ? 'Admitted' : 'Not Admitted';
          const needsRegNo = correctStatus === 'Admitted' && !adm.regNo;
          
          if (adm.status !== correctStatus || needsRegNo) {
            let regNo = adm.regNo || null;
            if (correctStatus === 'Admitted' && !regNo) {
               regNo = await ensureStudentEnrolled(adm, 'granted', regNo);
            }
            await updateDoc(doc(db, 'admissions', adm.id), {
              status: correctStatus,
              admissionStatus: adm.cbtPercentage >= 40 ? 'granted' : 'rejected',
              regNo: regNo
            });
            updated++;
          }
        } else if (adm.status === 'Admitted' && !adm.regNo) {
          // Manual admits without RegNo
          const regNo = await ensureStudentEnrolled(adm, 'granted', null);
          await updateDoc(doc(db, 'admissions', adm.id), { regNo });
          updated++;
        }
      }

      // Also fix any newly admitted students who are stuck in 'pending_activation'
      let studentsUpdated = 0;
      const qStud = query(collection(db, 'students'), where('isNewIntake', '==', true));
      const studSnap = await getDocs(qStud);
      for (const st of studSnap.docs) {
        const sdata = st.data();
        if (sdata.status === 'pending_activation' || sdata.classActivated === false) {
          await updateDoc(doc(db, 'students', st.id), {
            status: 'active',
            classActivated: true,
            admissionConfirmed: true,
            requiresAdminConfirmation: false
          });
          studentsUpdated++;
        }
      }

      alert(`Successfully updated ${updated} admission records and activated ${studentsUpdated} student profiles.`);
    } catch (e) {
      console.error('Error fixing records:', e);
      alert('Error updating records.');
    }
    setIsUpdating(false);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            Admission Portal
            <button
              onClick={handleFixStatuses}
              disabled={isUpdating}
              className="text-xs px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors shadow-sm flex items-center gap-1"
            >
              {isUpdating ? 'Generating...' : 'Auto-Gen Missing RegNos'}
            </button>
          </h2>
          <p className="text-sm text-slate-500">Manage student applications and print admission slips.</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search applicants..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Tabs and Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('All')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeTab === 'All' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            All Applications ({admissions.length})
          </button>
          <button
            onClick={() => setActiveTab('Admitted')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeTab === 'Admitted' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Admitted ({totalAdmittedCount})
          </button>
          <button
            onClick={() => setActiveTab('PendingCBT')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeTab === 'PendingCBT' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Pending CBT ({totalPendingCBTCount})
          </button>
        </div>

        <div className="flex gap-2 items-center">
          {activeTab === 'Admitted' && (
            <>
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none"
              >
                <option value="">All Classes</option>
                {getAvailableClasses().map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none"
              >
                <option value="">All Years</option>
                {getAvailableYears().map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </>
          )}
          <button
            onClick={() => setShowAnalysis(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition-all shadow-md"
          >
            View Analysis
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center items-center text-slate-400">
          <Loader2 className="animate-spin" size={32} />
        </div>
      ) : filteredAdmissions.length === 0 ? (
        <div className="py-12 text-center text-slate-500">
          No admission records found.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-400">
                <th className="pb-3 px-4">Application No.</th>
                <th className="pb-3 px-4">Applicant Name</th>
                <th className="pb-3 px-4">Target Class</th>
                <th className="pb-3 px-4">Reg No.</th>
                <th className="pb-3 px-4">Exam Status</th>
                <th className="pb-3 px-4">Score (%)</th>
                <th className="pb-3 px-4">Admission Status</th>
                <th className="pb-3 px-4">Date Applied</th>
                <th className="pb-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAdmissions.map((adm) => (
                <tr key={adm.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-4 px-4 font-mono text-sm text-slate-700 dark:text-slate-300">
                    {adm.appNo || adm.applicationNumber || adm.id.substring(0, 8).toUpperCase()}
                  </td>
                  <td className="py-4 px-4 font-medium text-slate-800 dark:text-slate-200">
                    {editingId === adm.id ? (
                      <input
                        type="text"
                        className="px-2 py-1 border border-slate-300 rounded text-xs focus:outline-none w-full max-w-[150px]"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        disabled={isUpdating}
                        placeholder="Applicant Name"
                      />
                    ) : (
                      adm.studentName || adm.fullName || adm.applicantName || 'Unknown Applicant'
                    )}
                  </td>
                  <td className="py-4 px-4 text-sm text-slate-600 dark:text-slate-400">
                    <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg font-medium">
                      {adm.classApplyingFor || adm.targetClass || adm.appliedClass || adm.class || adm.className || 'N/A'}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-sm font-mono text-slate-700 dark:text-slate-300">
                    {adm.status?.toLowerCase() === 'admitted' || adm.status?.toLowerCase() === 'granted' ? (adm.regNo || 'Pending') : 'N/A'}
                  </td>
                  <td className="py-4 px-4 text-sm font-medium">
                    {editingId === adm.id ? (
                      <select
                        className="px-2 py-1 border border-slate-300 rounded text-xs focus:outline-none"
                        value={editExamStatus}
                        onChange={(e) => setEditExamStatus(e.target.value === 'true')}
                        disabled={isUpdating}
                      >
                        <option value="false">Pending</option>
                        <option value="true">Taken</option>
                      </select>
                    ) : adm.cbtCompleted ? (
                      <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                        Taken {adm.examTakenDate ? `on ${formatDate(adm.examTakenDate)}` : ''}
                      </span>
                    ) : (
                      <span className="text-amber-600 bg-amber-50 px-2 py-1 rounded">Pending</span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-sm font-medium">
                    {adm.cbtCompleted && typeof adm.cbtPercentage === 'number' ? (
                      <span className="text-slate-700 dark:text-slate-300 font-bold">
                        {adm.cbtPercentage}%
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-sm font-medium">
                    {editingId === adm.id ? (
                      <div className="flex items-center gap-1">
                        <select
                          className="px-2 py-1 border border-slate-300 rounded text-xs focus:outline-none"
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value)}
                          disabled={isUpdating}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Admitted">Admitted</option>
                          <option value="Not Admitted">Not Admitted</option>
                        </select>
                        <button onClick={() => handleUpdateStatus(adm.id, adm)} disabled={isUpdating} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                          <Check size={14} />
                        </button>
                        <button onClick={() => setEditingId(null)} disabled={isUpdating} className="p-1 text-rose-600 hover:bg-rose-50 rounded">
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <span className={`px-2.5 py-1 rounded-lg text-xs uppercase tracking-wider ${getStatusStyle(adm.status)}`}>
                        {adm.status || 'Pending'}
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-sm text-slate-500">
                    {formatDate(adm.createdAt)}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setActiveDropdown(activeDropdown === adm.id ? null : adm.id)}
                        className="inline-flex items-center justify-center w-8 h-8 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 rounded-lg transition-colors"
                      >
                        <MoreVertical size={16} />
                      </button>

                      {activeDropdown === adm.id && (
                        <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 z-10 py-1 overflow-hidden animate-in fade-in zoom-in duration-200">
                          {editingId !== adm.id && (
                            <button
                              onClick={() => {
                                setEditingId(adm.id);
                                setEditStatus(adm.status || 'Pending');
                                setEditExamStatus(adm.cbtCompleted || false);
                                setEditName(adm.studentName || adm.fullName || adm.applicantName || '');
                                setActiveDropdown(null);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-2 transition-colors"
                            >
                              <Edit size={14} /> Edit Status
                            </button>
                          )}
                          <button
                            onClick={() => {
                              handlePrint(adm);
                              setActiveDropdown(null);
                            }}
                            disabled={printingId === adm.id}
                            className="w-full text-left px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-2 transition-colors disabled:opacity-50"
                          >
                            {printingId === adm.id ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
                            Print Slip
                          </button>
                          {adm.status?.toLowerCase() === 'admitted' && (
                            <>
                              <button
                                onClick={() => {
                                  handlePrintLetter(adm);
                                  setActiveDropdown(null);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-2 transition-colors"
                              >
                                <Printer size={14} /> Print Letter
                              </button>
                              <button
                                onClick={() => {
                                  handleDownloadLetterPdf(adm);
                                  setActiveDropdown(null);
                                }}
                                disabled={printingId === adm.id + '-letter'}
                                className="w-full text-left px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-2 transition-colors disabled:opacity-50"
                              >
                                {printingId === adm.id + '-letter' ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
                                Download Letter
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => {
                              handleDelete(adm.id, adm.studentName || adm.fullName || adm.applicantName || 'Applicant');
                              setActiveDropdown(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 flex items-center gap-2 transition-colors border-t border-slate-100 dark:border-slate-700 mt-1 pt-2"
                          >
                            <Trash2 size={14} /> Delete
                          </button>
                          
                          {(!adm.regNo && (adm.status?.toLowerCase() === 'admitted' || adm.status?.toLowerCase() === 'granted')) && (
                            <button
                              onClick={async () => {
                                setActiveDropdown(null);
                                setIsUpdating(true);
                                try {
                                  const reg = await ensureStudentEnrolled(adm, 'granted', null);
                                  await updateDoc(doc(db, 'admissions', adm.id), { regNo: reg });
                                  alert(`Student moved to class! Reg No generated: ${reg}`);
                                } catch (e) {
                                  console.error(e);
                                  alert('Failed to generate Reg No / Move to Class');
                                }
                                setIsUpdating(false);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 flex items-center gap-2 transition-colors border-t border-slate-100 dark:border-slate-800"
                            >
                              <Check size={14} /> Move to Class / Gen RegNo
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Hidden Slip Template for PDF Generation */}
                    <div id={`slip-${adm.id}`} style={{ display: 'none', padding: '40px', fontFamily: 'sans-serif', color: '#1e293b' }}>
                      <div style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '2px solid #e2e8f0', paddingBottom: '20px' }}>
                        {schoolLogo && <img src={schoolLogo} alt="School Logo" style={{ height: '80px', marginBottom: '10px', objectFit: 'contain' }} crossOrigin="anonymous" />}
                        <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 5px 0', color: primaryColor || '#1e3a8a' }}>{schoolName || 'School Management System'}</h1>
                        <h2 style={{ fontSize: '18px', margin: '0', color: '#475569' }}>Admission Slip</h2>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '15px', fontSize: '16px', lineHeight: '1.6' }}>
                        <div style={{ fontWeight: 'bold', color: '#64748b' }}>Application No:</div>
                        <div style={{ fontWeight: '600' }}>{adm.appNo || adm.applicationNumber || adm.id.toUpperCase()}</div>
                        
                        <div style={{ fontWeight: 'bold', color: '#64748b' }}>Applicant Name:</div>
                        <div>{adm.studentName || adm.fullName || adm.applicantName || 'N/A'}</div>
                        
                        <div style={{ fontWeight: 'bold', color: '#64748b' }}>Target Class:</div>
                        <div>{adm.classApplyingFor || adm.targetClass || adm.appliedClass || adm.class || adm.className || 'N/A'}</div>
                        
                        <div style={{ fontWeight: 'bold', color: '#64748b' }}>Date Applied:</div>
                        <div>{adm.createdAt ? new Date(adm.createdAt).toLocaleString() : 'N/A'}</div>
                        
                        {adm.parentName && (
                          <>
                            <div style={{ fontWeight: 'bold', color: '#64748b' }}>Parent/Guardian:</div>
                            <div>{adm.parentName}</div>
                          </>
                        )}
                        {adm.contactPhone && (
                          <>
                            <div style={{ fontWeight: 'bold', color: '#64748b' }}>Contact Phone:</div>
                            <div>{adm.contactPhone}</div>
                          </>
                        )}
                      </div>
                      <div style={{ marginTop: '50px', paddingTop: '20px', borderTop: '1px dashed #cbd5e1', textAlign: 'center', fontSize: '14px', color: '#64748b' }}>
                        <p>Please present this slip at the school administrative office for the next steps in your admission process.</p>
                      </div>
                    </div>

                    {/* Hidden Letter Template for PDF Generation */}
                    <div id={`letter-${adm.id}`} style={{ display: 'none', padding: '0', fontFamily: '"Times New Roman", Times, serif', color: '#111827', background: '#fff', position: 'relative' }}>
                      <div style={{ border: '8px double #1e3a8a', padding: '40px', margin: '20px', minHeight: '1020px', position: 'relative' }}>
                        {/* Watermark */}
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-45deg)', fontSize: '80px', color: 'rgba(30, 58, 138, 0.03)', fontWeight: 'bold', whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 0 }}>
                          {schoolName?.toUpperCase() || 'OFFICIAL'}
                        </div>
                        
                        <div style={{ position: 'relative', zIndex: 1 }}>
                          {/* Header section */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #1e3a8a', paddingBottom: '20px', marginBottom: '25px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                              {schoolLogo && <img src={schoolLogo} alt="Logo" style={{ width: 85, height: 85, objectFit: 'contain' }} crossOrigin="anonymous" />}
                              <div>
                                <h1 style={{ color: '#1e3a8a', fontWeight: 900, fontSize: 24, textTransform: 'uppercase', margin: 0, fontFamily: 'Arial, sans-serif' }}>{schoolName || 'School Management System'}</h1>
                                <p style={{ color: '#475569', fontSize: 13, margin: '6px 0 0', fontFamily: 'Arial, sans-serif', letterSpacing: '2px', fontWeight: 700 }}>OFFICE OF THE REGISTRAR</p>
                              </div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                              <QRCodeDisplay 
                                value={`ADMISSION LETTER\nName: ${adm.studentName || adm.fullName || adm.applicantName}\nClass: ${adm.classApplyingFor || adm.targetClass}\nApp No: ${adm.appNo || adm.applicationNumber || adm.id}\nReg No: ${adm.regNo || 'Pending'}`} 
                                size={75} 
                                includeMargin={false}
                              />
                              <p style={{ color: '#64748b', fontSize: 10, fontFamily: 'Arial, sans-serif', marginTop: '6px', fontWeight: 'bold' }}>VERIFY</p>
                            </div>
                          </div>

                          {/* Date & Ref */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'Arial, sans-serif', fontSize: 13, marginBottom: '30px' }}>
                            <div><strong>REF NO:</strong> {adm.appNo || adm.applicationNumber || adm.id.substring(0, 8).toUpperCase()}</div>
                            <div><strong>DATE:</strong> {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                          </div>

                          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                            <h2 style={{ fontSize: 20, fontWeight: 'bold', color: '#1e3a8a', margin: 0, textDecoration: 'underline', letterSpacing: '1px' }}>OFFER OF PROVISIONAL ADMISSION</h2>
                          </div>

                          <div style={{ fontSize: '15px', lineHeight: '1.8' }}>
                            {(() => {
                              const letterTargetClass = adm.classApplyingFor || adm.targetClass || '';
                              const letterFeeDetails = getApplicantFeeBreakdown(letterTargetClass, feeSettings);
                              
                              return (
                                <>
                                  <p style={{ marginBottom: '20px' }}>Dear <strong>{adm.studentName || adm.fullName || adm.applicantName || 'Applicant'}</strong>,</p>
                                  
                                  <p style={{ marginBottom: '20px', textAlign: 'justify' }}>
                                    Following your successful performance in the General Assessment Examination (where you scored <strong>{typeof adm.cbtPercentage === 'number' ? `${adm.cbtPercentage}%` : 'satisfactorily'}</strong>), we are pleased to inform you that you have been offered provisional admission into <strong>{schoolName || 'our prestigious institution'}</strong>.
                                  </p>

                                  <p style={{ marginBottom: '20px', textAlign: 'justify' }}>
                                    You have been admitted into <strong>{letterTargetClass || 'your selected class'}</strong> for the upcoming academic session. Your student profile has been automatically provisioned, and your official Registration Number is <strong>{adm.regNo || 'Pending Issuance'}</strong>.
                                  </p>

                                  <p style={{ marginBottom: '25px', textAlign: 'justify' }}>
                                    Please note that this admission remains provisional until you have completed your registration and paid the required fees. You are expected to bring this letter along with your Birth Certificate, Previous School Report Card, and two (2) recent passport photographs to the Bursary to finalise your enrollment.
                                  </p>
                                  
                                  <div style={{ border: '1px solid #cbd5e1', borderRadius: '0px', marginBottom: '30px' }}>
                                    <div style={{ background: '#f1f5f9', padding: '10px 15px', borderBottom: '1px solid #cbd5e1', fontWeight: 'bold', fontFamily: 'Arial, sans-serif', fontSize: '13px', color: '#334155', textTransform: 'uppercase' }}>
                                      Applicant & Fee Summary
                                    </div>
                                    <div style={{ padding: '15px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 30px', fontFamily: 'Arial, sans-serif', fontSize: '13px' }}>
                                      {[
                                        ['Full Name', adm.studentName || adm.fullName || adm.applicantName],
                                        ['Class Admitted', letterTargetClass],
                                        ['Section', `${letterFeeDetails.sectionTitle}`],
                                        ['Admission Status', 'GRANTED'],
                                        ...(adm.regNo ? [['Registration No.', adm.regNo]] : []),
                                        ['Application No.', adm.appNo || adm.applicationNumber || adm.id],
                                      ].map(([label, value]) => (
                                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dotted #cbd5e1', paddingBottom: '4px' }}>
                                          <span style={{ color: '#64748b' }}>{label}:</span>
                                          <span style={{ fontWeight: 'bold', color: '#0f172a' }}>{value || '—'}</span>
                                        </div>
                                      ))}
                                    </div>
                                    <div style={{ background: '#1e3a8a', color: '#fff', padding: '10px 15px', fontFamily: 'Arial, sans-serif', fontSize: '13px', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                                      <span>TOTAL APPROVED NEW INTAKE FEE:</span>
                                      <span>{formatNaira(letterFeeDetails.total)}</span>
                                    </div>
                                  </div>
                                </>
                              );
                            })()}
                            
                            <p style={{ marginBottom: '40px' }}>Congratulations on your admission, and we look forward to welcoming you.</p>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '60px' }}>
                              <div style={{ textAlign: 'center' }}>
                                <div style={{ height: 1, width: 200, background: '#1e293b', marginBottom: 8 }} />
                                <p style={{ fontSize: 13, fontWeight: 'bold', fontFamily: 'Arial, sans-serif', margin: 0 }}>STUDENT / PARENT SIGNATURE</p>
                              </div>
                              <div style={{ textAlign: 'center' }}>
                                <div style={{ height: 1, width: 200, background: '#1e293b', marginBottom: 8 }} />
                                <p style={{ fontSize: 13, fontWeight: 'bold', fontFamily: 'Arial, sans-serif', margin: 0 }}>Admission Officer: Anyaegbu Emmanuel</p>
                                <p style={{ fontSize: 11, color: '#64748b', fontFamily: 'Arial, sans-serif', margin: '4px 0 0' }}>For: {schoolName || 'Management'}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {showAnalysis && (
        <AnalyticsReportModal
          isOpen={showAnalysis}
          onClose={() => setShowAnalysis(false)}
          role="admin"
          roleConfig={{ label: 'Admission Operations', color: '#4f46e5' }}
          data={analysisData}
          schoolName={schoolName}
          schoolLogo={schoolLogo}
        />
      )}
    </div>
  );
};

export default AdminAdmissionPortal;
