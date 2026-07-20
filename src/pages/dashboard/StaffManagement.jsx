import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, getDocs, addDoc, doc, updateDoc, deleteDoc, orderBy, limit, where, getDoc } from 'firebase/firestore';
import { Users, UserPlus, Mail, Phone, Briefcase, Trash2, Edit2, CheckCircle, AlertCircle, Loader2, X, Search, ShieldCheck, Wallet, MoreVertical, Key, Lock, Camera, Upload } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { uploadAvatar } from '../../lib/supabase';
import ImageCropperModal from '../../components/ImageCropperModal';

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
                  onClick={() => isAdmin && setActiveActionStaff(person)}
                  className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                >
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 overflow-hidden border border-slate-200">
                        {person.photo ? (
                          <img src={person.photo} alt={person.name} className="w-full h-full object-cover" />
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
                    <td className="px-8 py-5 text-right relative" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => setActiveActionStaff(person)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                      >
                        <MoreVertical size={18} />
                      </button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center shrink-0">
              <h3 className="text-2xl font-bold text-slate-900">{isEditing ? 'Edit Staff Profile' : 'Add New Staff Member'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-8 space-y-6 text-left overflow-y-auto flex-1 custom-scrollbar">
              <div className="flex justify-center mb-6">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden group-hover:border-indigo-400 transition-all">
                    {uploadingPhoto ? (
                      <Loader2 className="animate-spin text-indigo-600" />
                    ) : currentStaff.photo ? (
                      <img src={currentStaff.photo} alt="Passport" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="text-slate-400" size={32} />
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 bg-indigo-600 text-white p-2 rounded-full cursor-pointer shadow-lg hover:bg-indigo-700 transition-all">
                    <Upload size={16} />
                    <input type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Full Name</label>
                  <input 
                    type="text" 
                    required 
                    value={currentStaff.name}
                    onChange={(e) => setCurrentStaff({...currentStaff, name: e.target.value})}
                    placeholder="e.g. John Doe"
                    className="w-full px-5 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none transition-all placeholder:text-slate-300 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
                  <input 
                    type="email" 
                    required 
                    value={currentStaff.email}
                    onChange={(e) => setCurrentStaff({...currentStaff, email: e.target.value})}
                    placeholder="john@school.com"
                    className="w-full px-5 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none transition-all placeholder:text-slate-300 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Phone Number</label>
                  <input 
                    type="text" 
                    value={currentStaff.phone}
                    onChange={(e) => setCurrentStaff({...currentStaff, phone: e.target.value})}
                    placeholder="+1 234 567 890"
                    className="w-full px-5 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none transition-all placeholder:text-slate-300 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Department</label>
                  <select 
                    value={currentStaff.department}
                    onChange={(e) => setCurrentStaff({...currentStaff, department: e.target.value})}
                    className="w-full px-5 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none transition-all font-medium"
                  >
                    <option value="Science">Science</option>
                    <option value="Arts">Arts</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Admin">Administration</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Role</label>
                  <select 
                    value={currentStaff.role}
                    onChange={(e) => setCurrentStaff({...currentStaff, role: e.target.value})}
                    className="w-full px-5 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none transition-all font-medium"
                  >
                    <option value="teacher">Teacher</option>
                    <option value="admin">Administrator</option>
                    <option value="principal">Principal</option>
                    <option value="bursar">Bursar</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">{isEditing ? 'New Password (leave blank to keep current)' : 'Password'}</label>
                  <input 
                    type="password" 
                    value={currentStaff.password || ''}
                    onChange={(e) => setCurrentStaff({...currentStaff, password: e.target.value})}
                    placeholder={isEditing ? '••••••••' : 'Enter password'}
                    required={!isEditing}
                    className="w-full px-5 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none transition-all placeholder:text-slate-300 font-medium"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-slate-100 text-slate-600 px-6 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={saving}
                  className="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="animate-spin w-5 h-5 mx-auto" /> : isEditing ? 'Update Record' : 'Create Account'}
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
            
            <form onSubmit={handleConfirmResetPassword} className="p-8 space-y-6 text-left overflow-y-auto flex-1 custom-scrollbar">
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

              <div className="flex items-center gap-4 pt-4 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setResetPasswordStaff(null)}
                  className="flex-1 bg-slate-100 text-slate-600 px-6 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={saving}
                  className="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="animate-spin w-5 h-5 mx-auto" /> : 'Confirm Reset'}
                </button>
              </div>
            </form>
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
                    <img src={activeActionStaff.photo} alt={activeActionStaff.name} className="w-full h-full object-cover" />
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

              {/* Actions Grid */}
              <div className="space-y-3 pt-2 text-left">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Administrative Actions</p>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => { 
                      setIsEditing(true); 
                      setCurrentStaff(activeActionStaff); 
                      setShowModal(true); 
                      setActiveActionStaff(null); 
                    }}
                    className="p-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-2xl font-bold flex flex-col items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95"
                  >
                    <Edit2 size={20} />
                    <span className="text-xs">Edit Profile</span>
                  </button>
                  <button 
                    onClick={() => { 
                      openResetPasswordModal(activeActionStaff); 
                      setActiveActionStaff(null); 
                    }}
                    className="p-4 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-2xl font-bold flex flex-col items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95"
                  >
                    <Lock size={20} />
                    <span className="text-xs">Reset Password</span>
                  </button>
                  <button 
                    onClick={() => { 
                      handleResetPin(activeActionStaff); 
                      setActiveActionStaff(null); 
                    }}
                    className="p-4 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-2xl font-bold flex flex-col items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95"
                  >
                    <Key size={20} />
                    <span className="text-xs">Reset PIN</span>
                  </button>
                  <button 
                    onClick={() => { 
                      handleDelete(activeActionStaff.id); 
                      setActiveActionStaff(null); 
                    }}
                    className="p-4 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-2xl font-bold flex flex-col items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 col-span-2"
                  >
                    <Trash2 size={20} />
                    <span className="text-xs">Delete Staff</span>
                  </button>
                </div>
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
