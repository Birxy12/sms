import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, getDocs, addDoc, doc, updateDoc, deleteDoc, orderBy, limit, where, getDoc } from 'firebase/firestore';
import { Users, UserPlus, Mail, Phone, Briefcase, Trash2, Edit2, CheckCircle, AlertCircle, Loader2, X, Search, ShieldCheck, Wallet, MoreVertical, Key, Lock, Camera, Upload } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { uploadAvatar } from '../../lib/supabase';
import ImageCropperModal from '../../components/ImageCropperModal';
import GlobalPhotoUploader from '../../components/GlobalPhotoUploader';

const StaffManagement = () => {
  const { currentAdmin, adminResetCredentials } = useAdminAuth();
  const isAdmin = currentAdmin?.role === 'admin' || currentAdmin?.isSuperAdmin;

  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentStaff, setCurrentStaff] = useState({ name: '', email: '', phone: '', department: 'Science', role: 'teacher', photo: '' });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [saving, setSaving] = useState(false);

  // Advanced admin actions state
  const [activeActionStaff, setActiveActionStaff] = useState(null);
  const [resetPasswordStaff, setResetPasswordStaff] = useState(null);
  const [newPasswordVal, setNewPasswordVal] = useState('');

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [activeDropdown, setActiveDropdown] = useState(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.dropdown-container')) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Fetch staff list
  const fetchStaffData = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'staff'), orderBy('staffId', 'asc'));
      const querySnapshot = await getDocs(q);
      const staffList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setStaff(staffList);
    } catch (error) {
      console.error('Error fetching staff:', error);
      setStatus({ type: 'error', message: 'Failed to load staff records.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffData();
  }, []);

  // Auto-generate Staff ID — finds true numeric max across ALL records to avoid duplicates
  const generateStaffId = async () => {
    // Fetch every staff document so we can find the real numeric maximum
    const allSnap = await getDocs(collection(db, 'staff'));
    let maxNum = 0;
    allSnap.docs.forEach(d => {
      const sid = d.data().staffId || '';
      // Expected format: BDS/STAFF/001  —  grab everything after the last '/'
      const parts = sid.split('/');
      const num = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    });

    // Increment and verify the candidate is not already taken (anti-race guard)
    let candidate;
    let attempts = 0;
    do {
      maxNum += 1;
      attempts += 1;
      candidate = `BDS/STAFF/${String(maxNum).padStart(3, '0')}`;
      // Check if this ID is already in use
      const colRef = collection(db, 'staff');
      const check = await getDocs(query(colRef, where('staffId', '==', candidate)));
      if (check.empty) break; // ID is free
    } while (attempts < 20); // safety cap

    return candidate;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatus({ type: 'info', message: 'Saving staff record...' });

    try {
      if (isEditing) {
        const staffRef = doc(db, 'staff', currentStaff.id);
        const updateData = { ...currentStaff };
        // If password is empty during edit, don't update it
        if (!updateData.password) {
          delete updateData.password;
        }
        await updateDoc(staffRef, updateData);
        setStatus({ type: 'success', message: 'Staff updated successfully!' });
      } else {
        const staffId = await generateStaffId();
        await addDoc(collection(db, 'staff'), {
          ...currentStaff,
          staffId,
          password: currentStaff.password, // Set the password directly without fallback
          createdAt: new Date().toISOString()
        });
        setStatus({ type: 'success', message: `Staff added successfully! New ID: ${staffId}` });
      }
      setShowModal(false);
      fetchStaffData();
    } catch (error) {
      console.error('Save error:', error);
      setStatus({ type: 'error', message: 'Error saving record: ' + error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this staff member?')) return;
    try {
      await deleteDoc(doc(db, 'staff', id));
      fetchStaffData();
      setStatus({ type: 'success', message: 'Staff deleted successfully!' });
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', message: 'Error deleting staff.' });
    }
  };

  const handleResetPin = async (person) => {
    if (!window.confirm(`Are you sure you want to reset the login PIN for ${person.name}? They will be required to set a new PIN on next login.`)) return;
    try {
      setSaving(true);
      const res = await adminResetCredentials(person.id, { clearPin: true });
      if (res.success) {
        setStatus({ type: 'success', message: `PIN for ${person.name} has been cleared and reset successfully!` });
      } else {
        setStatus({ type: 'error', message: res.message || 'Failed to reset PIN.' });
      }
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', message: 'Error resetting PIN.' });
    } finally {
      setSaving(false);
    }
  };

  const openResetPasswordModal = (person) => {
    setResetPasswordStaff(person);
    const tempPass = Math.random().toString(36).slice(-8).toUpperCase();
    setNewPasswordVal(tempPass);
  };

  const handleConfirmResetPassword = async (e) => {
    e.preventDefault();
    if (!newPasswordVal.trim()) return;
    setSaving(true);
    try {
      const res = await adminResetCredentials(resetPasswordStaff.id, { newPassword: newPasswordVal });
      if (res.success) {
        setStatus({ type: 'success', message: `Password for ${resetPasswordStaff.name} reset successfully to "${newPasswordVal}"` });
        setResetPasswordStaff(null);
      } else {
        setStatus({ type: 'error', message: res.message || 'Failed to reset password.' });
      }
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', message: 'Error resetting password.' });
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setStatus({ type: 'error', message: 'Image size must be less than 2MB' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setCropImageSrc(reader.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCropComplete = async (croppedBlob) => {
    setCropImageSrc(null);
    if (!croppedBlob) return;

    setUploadingPhoto(true);
    try {
      const file = new File([croppedBlob], `avatar_${Date.now()}.jpg`, { type: 'image/jpeg' });
      const staffIdForUpload = currentStaff.staffId || 'new-staff';
      const url = await uploadAvatar(file, staffIdForUpload);
      setCurrentStaff(prev => ({ ...prev, photo: url }));
      setStatus({ type: 'success', message: 'Profile picture uploaded successfully!' });
    } catch (error) {
      console.error("Upload error:", error);
      setStatus({ type: 'error', message: 'Upload failed.' });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const filteredStaff = staff.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.staffId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Staff Management</h2>
          <p className="text-slate-500">Add, edit and manage teacher records and assignments.</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => { setIsEditing(false); setCurrentStaff({ name: '', email: '', phone: '', department: 'Science', role: 'teacher', photo: '' }); setShowModal(true); }}
            className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95"
          >
            <UserPlus size={20} />
            Add New Staff
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {[
          { label: 'Total Staff', value: staff.length, icon: Users, color: 'indigo' },
          { label: 'Teachers', value: staff.filter(s => s.role === 'teacher').length, icon: Briefcase, color: 'blue' },
          { label: 'Admins', value: staff.filter(s => s.role === 'admin').length, icon: ShieldCheck, color: 'rose' },
          { label: 'Principals', value: staff.filter(s => s.role === 'principal').length, icon: ShieldCheck, color: 'purple' },
          { label: 'Bursars', value: staff.filter(s => s.role === 'bursar').length, icon: Wallet, color: 'emerald' },
        ].map((stat, i) => (
          <div key={i} className={`bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow`}>
            <div className={`p-4 rounded-xl bg-${stat.color}-50 text-${stat.color}-600`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">{stat.label}</p>
              <h4 className="text-xl font-bold text-slate-900">{stat.value}</h4>
            </div>
          </div>
        ))}
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search by name or staff ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-400 transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-xs font-bold uppercase tracking-wider text-left border-b border-slate-100">
                <th className="px-8 py-5">Staff Member</th>
                <th className="px-6 py-5">Staff ID</th>
                <th className="px-6 py-5">Department</th>
                <th className="px-6 py-5">Role</th>
                {isAdmin && <th className="px-8 py-5 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-20 text-center text-slate-400">
                    <Loader2 size={32} className="animate-spin mx-auto mb-4" />
                    <p className="font-medium">Loading staff records...</p>
                  </td>
                </tr>
              ) : filteredStaff.length > 0 ? filteredStaff.map((person) => (
                <tr 
                  key={person.id} 
                  className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                >
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 overflow-hidden border border-slate-200 text-[10px]">
                        {person.photo ? (
                          <img src={person.photo} alt={person.name} className="w-full h-full object-cover rounded-full" />
                        ) : (
                          person.name[0]
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{person.name}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1"><Mail size={12} /> {person.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-xs font-mono bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full">{person.staffId}</span>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-sm font-medium text-slate-700">{person.department}</p>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`text-xs px-3 py-1 rounded-full font-bold capitalize ${
                      person.role === 'admin' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 
                      person.role === 'principal' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                      person.role === 'bursar' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                      'bg-blue-50 text-blue-700 border border-blue-100'
                    }`}>
                      {person.role}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-8 py-5 text-right relative dropdown-container">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === person.id ? null : person.id); }}
                        className="p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors focus:outline-none"
                      >
                        <MoreVertical size={16} />
                      </button>

                      {activeDropdown === person.id && (
                        <div className="absolute right-12 top-0 mt-2 w-48 bg-white/95 backdrop-blur-xl shadow-2xl border border-slate-100 p-1.5 rounded-2xl z-50 flex flex-col gap-0.5">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setActiveDropdown(null); setActiveActionStaff(person); }} 
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 transition-colors text-xs font-bold text-left w-full"
                          >
                            <Users size={15} strokeWidth={2.5} /> View Profile
                          </button>
                          
                          <button 
                            onClick={(e) => { e.stopPropagation(); setActiveDropdown(null); setIsEditing(true); setCurrentStaff(person); setShowModal(true); }} 
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-blue-50 text-slate-600 hover:text-blue-600 transition-colors text-xs font-bold text-left w-full"
                          >
                            <Edit2 size={15} strokeWidth={2.5} /> Edit Staff
                          </button>
                          
                          <button 
                            onClick={(e) => { e.stopPropagation(); setActiveDropdown(null); openResetPasswordModal(person); }} 
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 text-slate-600 hover:text-slate-800 transition-colors text-xs font-bold text-left w-full"
                          >
                            <Lock size={15} strokeWidth={2.5} /> Reset Password
                          </button>
                          
                          <button 
                            onClick={(e) => { e.stopPropagation(); setActiveDropdown(null); handleResetPin(person); }} 
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-amber-50 text-slate-600 hover:text-amber-600 transition-colors text-xs font-bold text-left w-full"
                          >
                            <Key size={15} strokeWidth={2.5} /> Reset PIN
                          </button>
                          
                          <div className="w-full h-px bg-slate-100 my-1"></div>
                          
                          <button 
                            onClick={(e) => { e.stopPropagation(); setActiveDropdown(null); handleDelete(person.id); }} 
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-rose-50 text-slate-600 hover:text-rose-600 transition-colors text-xs font-bold text-left w-full"
                          >
                            <Trash2 size={15} strokeWidth={2.5} /> Delete Staff
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" className="py-20 text-center text-slate-400">
                    No staff records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Status Notifications */}
      {status.message && (
        <div className={`fixed bottom-8 right-8 p-4 rounded-2xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-8 ${
          status.type === 'success' ? 'bg-emerald-600 text-white' : 
          status.type === 'error' ? 'bg-rose-600 text-white' : 
          'bg-indigo-600 text-white'
        }`}>
          {status.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <p className="font-bold text-sm">{status.message}</p>
          <button onClick={() => setStatus({})} className="ml-4 hover:opacity-50"><X size={16} /></button>
        </div>
      )}

      {/* Modal Backdrop */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)', padding: 16, boxSizing: 'border-box' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onClick={() => setShowModal(false)} />
          
          <div style={{ position: 'relative', backgroundColor: '#fff', width: '100%', maxWidth: 500, borderRadius: 24, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflow: 'hidden' }}>
            <div style={{ padding: '24px 28px', borderBottom: '1px solid #f1f5f9', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', margin: 0 }}>
                {isEditing ? 'Edit Profile' : 'Add New Staff'}
              </h2>
              <div className="flex items-center gap-4">
                <button form="staff-form" type="submit" disabled={saving} className="sm:hidden" style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', background: 'rgb(79, 70, 229)', color: 'white', fontWeight: 800, fontSize: '12px', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: 'rgba(79, 70, 229, 0.3) 0px 4px 16px', opacity: saving ? 0.7 : 1 }}>
                  {saving && <Loader2 size={12} className="animate-spin" />}
                  Save
                </button>
                <button type="button" onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}>
                  <X size={20} />
                </button>
              </div>
            </div>

            <form id="staff-form" onSubmit={handleSave} style={{ padding: '24px 28px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, minHeight: 0, WebkitOverflowScrolling: 'touch' }} noValidate>
              
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '16px', padding: '14px 16px', background: 'rgb(248, 250, 252)', borderRadius: '14px', border: '1.5px dashed rgb(199, 210, 254)', width: '100%', boxSizing: 'border-box' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '12px', overflow: 'hidden', flexShrink: 0, background: 'rgb(226, 232, 240)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'rgba(0, 0, 0, 0.1) 0px 2px 8px' }}>
                  {currentStaff.photo || currentStaff.name ? (
                    <img src={currentStaff.photo || `https://avatar.iran.liara.run/public/job/teacher?username=${encodeURIComponent(currentStaff.name || 'Staff')}`} alt="Staff" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Camera size={24} style={{ color: 'rgb(203, 213, 225)' }} />
                  )}
                </div>
                <div style={{ flex: '1 1 0%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: 'rgb(100, 116, 139)' }}>
                    {uploadingPhoto ? 'Uploading...' : (currentStaff.photo ? 'Portrait uploaded' : 'No Portrait yet')}
                  </p>
                  <p style={{ margin: 0, fontSize: '10px', color: 'rgb(148, 163, 184)', fontWeight: 500 }}>Square image · Max 2MB</p>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', background: 'rgb(79, 70, 229)', color: 'rgb(255, 255, 255)', borderRadius: '8px', fontWeight: 700, fontSize: '11px', cursor: uploadingPhoto ? 'not-allowed' : 'pointer', boxShadow: 'rgba(79, 70, 229, 0.25) 0px 2px 8px', opacity: uploadingPhoto ? 0.7 : 1, transition: 'transform 0.15s, opacity 0.15s', whiteSpace: 'nowrap' }}>
                      {uploadingPhoto ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
                      {uploadingPhoto ? 'Uploading...' : 'Upload'}
                      <input type="file" accept="image/*" onChange={handlePhotoSelect} disabled={uploadingPhoto} style={{ display: 'none' }} />
                    </label>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="space-y-1.5">
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'rgb(100, 116, 139)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Full Name</label>
                  <input type="text" placeholder="e.g. John Doe" required value={currentStaff.name || ''} onChange={(e) => setCurrentStaff({...currentStaff, name: e.target.value})} style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1.5px solid rgb(226, 232, 240)', fontSize: '13px', fontWeight: 500, background: 'rgb(248, 250, 252)', outline: 'none', boxSizing: 'border-box', color: 'rgb(30, 41, 59)' }} />
                </div>
                
                <div className="space-y-1.5">
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'rgb(100, 116, 139)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Phone Number</label>
                  <input type="tel" placeholder="+1 234 567 890" value={currentStaff.phone || ''} onChange={(e) => setCurrentStaff({...currentStaff, phone: e.target.value})} style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1.5px solid rgb(226, 232, 240)', fontSize: '13px', fontWeight: 500, background: 'rgb(248, 250, 252)', outline: 'none', boxSizing: 'border-box', color: 'rgb(30, 41, 59)' }} />
                </div>
                
                <div className="space-y-1.5">
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'rgb(100, 116, 139)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Department</label>
                  <select value={currentStaff.department || 'Science'} onChange={(e) => setCurrentStaff({...currentStaff, department: e.target.value})} style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1.5px solid rgb(226, 232, 240)', fontSize: '13px', fontWeight: 500, background: 'rgb(248, 250, 252)', outline: 'none', boxSizing: 'border-box', color: 'rgb(30, 41, 59)' }}>
                    <option value="Science">Science</option>
                    <option value="Arts">Arts</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Admin">Administration</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'rgb(100, 116, 139)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Role</label>
                  <select value={currentStaff.role || 'teacher'} onChange={(e) => setCurrentStaff({...currentStaff, role: e.target.value})} style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1.5px solid rgb(226, 232, 240)', fontSize: '13px', fontWeight: 500, background: 'rgb(248, 250, 252)', outline: 'none', boxSizing: 'border-box', color: 'rgb(30, 41, 59)' }}>
                    <option value="teacher">Teacher</option>
                    <option value="admin">Administrator</option>
                    <option value="principal">Principal</option>
                    <option value="bursar">Bursar</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'rgb(100, 116, 139)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email Address</label>
                <input type="email" placeholder="john@school.com" required value={currentStaff.email || ''} onChange={(e) => setCurrentStaff({...currentStaff, email: e.target.value})} style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1.5px solid rgb(226, 232, 240)', fontSize: '13px', fontWeight: 500, background: 'rgb(248, 250, 252)', outline: 'none', boxSizing: 'border-box', color: 'rgb(30, 41, 59)' }} />
              </div>

              <div className="space-y-1.5">
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'rgb(100, 116, 139)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{isEditing ? 'New Password (optional)' : 'Password'}</label>
                <input type="password" placeholder={isEditing ? '••••••••' : 'Enter password'} required={!isEditing} value={currentStaff.password || ''} onChange={(e) => setCurrentStaff({...currentStaff, password: e.target.value})} style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1.5px solid rgb(226, 232, 240)', fontSize: '13px', fontWeight: 500, background: 'rgb(248, 250, 252)', outline: 'none', boxSizing: 'border-box', color: 'rgb(30, 41, 59)' }} />
              </div>

              <div className="hidden sm:flex" style={{ gap: '10px', justifyContent: 'flex-end', paddingTop: '8px', borderTop: '1px solid rgb(241, 245, 249)', margin: '4px 0 0 0', flexShrink: 0 }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '11px 22px', borderRadius: '12px', border: 'none', background: 'rgb(241, 245, 249)', color: 'rgb(100, 116, 139)', fontWeight: 800, fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding: '11px 24px', borderRadius: '12px', border: 'none', background: 'rgb(79, 70, 229)', color: 'white', fontWeight: 900, fontSize: '13px', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: 'rgba(79, 70, 229, 0.3) 0px 4px 16px', opacity: saving ? 0.7 : 1 }}>
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  {isEditing ? 'Save Profile' : 'Add Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPasswordStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center shrink-0">
              <h3 className="text-2xl font-bold text-slate-900">Reset Staff Password</h3>
              <button onClick={() => setResetPasswordStaff(null)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={24} /></button>
            </div>
            <div className="overflow-y-auto flex-1 custom-scrollbar">
              <form id="reset-password-form" onSubmit={handleConfirmResetPassword} className="p-8 space-y-6 text-left">
              <div>
                <p className="text-sm font-medium text-slate-600 mb-4">
                  You are resetting the password for <strong className="text-slate-900">{resetPasswordStaff.name}</strong>. The staff member will be required to change this password on their next login.
                </p>
                
                <label className="block text-sm font-bold text-slate-700 mb-2">Temporary Password</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    required 
                    value={newPasswordVal}
                    onChange={(e) => setNewPasswordVal(e.target.value)}
                    placeholder="Enter new password"
                    className="flex-1 px-5 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none transition-all placeholder:text-slate-300 font-mono font-bold"
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      const tempPass = Math.random().toString(36).slice(-8).toUpperCase();
                      setNewPasswordVal(tempPass);
                    }}
                    className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-all"
                  >
                    Regen
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(newPasswordVal);
                    alert('Password copied to clipboard!');
                  }}
                  className="w-full py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold text-sm transition-all"
                >
                  Copy Password
                </button>
              </div>

              </form>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center gap-4 shrink-0">
              <button 
                type="button"
                onClick={() => setResetPasswordStaff(null)}
                className="flex-1 bg-slate-200 text-slate-700 px-6 py-4 rounded-xl font-bold hover:bg-slate-300 transition-all active:scale-95"
              >
                Cancel
              </button>
              <button 
                form="reset-password-form"
                type="submit" 
                disabled={saving}
                className="flex-1 bg-indigo-600 text-white px-6 py-4 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95 disabled:opacity-50"
              >
                {saving ? <Loader2 className="animate-spin w-5 h-5 mx-auto" /> : 'Confirm Reset'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Staff Details & Actions Card Modal */}
      {activeActionStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
              <h3 className="text-xl font-bold text-slate-900">Staff Member Details</h3>
              <button 
                onClick={() => setActiveActionStaff(null)} 
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar text-center">
              {/* Profile Photo - Circle */}
              <div className="relative w-28 h-28 mx-auto">
                <div className="w-28 h-28 rounded-full bg-slate-100 flex items-center justify-center font-extrabold text-slate-600 overflow-hidden border-4 border-indigo-50 shadow-md">
                  {activeActionStaff.photo ? (
                    <img src={activeActionStaff.photo} alt={activeActionStaff.name} className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <span className="text-3xl">{activeActionStaff.name[0]}</span>
                  )}
                </div>
              </div>

              {/* Staff Main Info */}
              <div>
                <h4 className="text-2xl font-black text-slate-900">{activeActionStaff.name}</h4>
                <p className="text-sm font-mono text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full inline-block mt-2 font-bold">
                  {activeActionStaff.staffId}
                </p>
              </div>

              {/* Staff Detailed Fields */}
              <div className="bg-slate-50 rounded-2xl p-5 text-left space-y-4">
                <div className="flex justify-between items-center text-sm border-b border-slate-200/60 pb-3">
                  <span className="text-slate-400 font-bold flex items-center gap-2"><Briefcase size={16} /> Department</span>
                  <span className="font-extrabold text-slate-800">{activeActionStaff.department}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-slate-200/60 pb-3">
                  <span className="text-slate-400 font-bold flex items-center gap-2"><ShieldCheck size={16} /> Role</span>
                  <span className="font-extrabold text-slate-800 capitalize">{activeActionStaff.role}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-slate-200/60 pb-3">
                  <span className="text-slate-400 font-bold flex items-center gap-2"><Mail size={16} /> Email</span>
                  <span className="font-extrabold text-slate-800 select-all">{activeActionStaff.email}</span>
                </div>
                {activeActionStaff.phone && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400 font-bold flex items-center gap-2"><Phone size={16} /> Phone</span>
                    <span className="font-extrabold text-slate-800 select-all">{activeActionStaff.phone}</span>
                  </div>
                )}
               </div>
            </div>
          </div>
        </div>
      )}

      {cropImageSrc && (
        <ImageCropperModal
          imageSrc={cropImageSrc}
          onCropComplete={handleCropComplete}
          onClose={() => setCropImageSrc(null)}
          aspect={1}
        />
      )}
    </div>
  );
};

export default StaffManagement;
