import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Printer, Search, Loader2, Edit, Trash2, X, Check, MoreVertical } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { useTheme } from '../context/ThemeContext';

const AdminAdmissionPortal = () => {
  const [admissions, setAdmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [printingId, setPrintingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editStatus, setEditStatus] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const { schoolName, schoolLogo, primaryColor } = useTheme();

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
    return () => unsub();
  }, []);

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

  const handleUpdateStatus = async (id) => {
    if (!editStatus) return;
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, 'admissions', id), {
        status: editStatus,
        updatedAt: new Date().toISOString()
      });
      setEditingId(null);
      setEditStatus('');
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
    if (s === 'approved' || s === 'admitted' || s === 'accepted') return 'bg-emerald-100 text-emerald-700';
    if (s === 'rejected' || s === 'declined') return 'bg-rose-100 text-rose-700';
    if (s === 'interview') return 'bg-blue-100 text-blue-700';
    return 'bg-amber-100 text-amber-700'; // pending
  };

  const filteredAdmissions = admissions.filter(a => {
    const s = searchTerm.toLowerCase();
    const name = (a.studentName || a.fullName || a.applicantName || '').toLowerCase();
    const appNo = (a.applicationNumber || a.id || '').toLowerCase();
    return name.includes(s) || appNo.includes(s);
  });

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Admission Portal</h2>
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
                <th className="pb-3 px-4">Status</th>
                <th className="pb-3 px-4">Date Applied</th>
                <th className="pb-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAdmissions.map((adm) => (
                <tr key={adm.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-4 px-4 font-mono text-sm text-slate-700 dark:text-slate-300">
                    {adm.applicationNumber || adm.id.substring(0, 8).toUpperCase()}
                  </td>
                  <td className="py-4 px-4 font-medium text-slate-800 dark:text-slate-200">
                    {adm.studentName || adm.fullName || adm.applicantName || 'Unknown Applicant'}
                  </td>
                  <td className="py-4 px-4 text-sm text-slate-600 dark:text-slate-400">
                    <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg font-medium">
                      {adm.targetClass || adm.appliedClass || adm.class || adm.className || 'N/A'}
                    </span>
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
                          <option value="Interview">Interview</option>
                          <option value="Approved">Approved</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                        <button onClick={() => handleUpdateStatus(adm.id)} disabled={isUpdating} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
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
                    {adm.createdAt ? new Date(adm.createdAt).toLocaleDateString() : 'N/A'}
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
                          <button
                            onClick={() => {
                              handleDelete(adm.id, adm.studentName || adm.fullName || adm.applicantName || 'Applicant');
                              setActiveDropdown(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 flex items-center gap-2 transition-colors border-t border-slate-100 dark:border-slate-700 mt-1 pt-2"
                          >
                            <Trash2 size={14} /> Delete
                          </button>
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
                        <div style={{ fontWeight: '600' }}>{adm.applicationNumber || adm.id.toUpperCase()}</div>
                        
                        <div style={{ fontWeight: 'bold', color: '#64748b' }}>Applicant Name:</div>
                        <div>{adm.studentName || adm.fullName || adm.applicantName || 'N/A'}</div>
                        
                        <div style={{ fontWeight: 'bold', color: '#64748b' }}>Target Class:</div>
                        <div>{adm.targetClass || adm.appliedClass || adm.class || adm.className || 'N/A'}</div>
                        
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminAdmissionPortal;
