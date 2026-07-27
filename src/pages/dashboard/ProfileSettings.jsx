import React, { useState, useRef } from 'react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useStudentAuth } from '../../context/StudentAuthContext';
import { 
  User, Mail, Shield, CheckCircle, AlertCircle, Loader2, Save, 
  ArrowLeft, Camera, Lock, Eye, EyeOff, Edit2, X, Trash2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { uploadAvatar } from '../../lib/supabase';
import ImageCropperModal from '../../components/ImageCropperModal';

const ProfileSettings = () => {
  const { currentAdmin, updateProfile: updateAdminProfile } = useAdminAuth();
  const { currentStudent, updateProfile: updateStudentProfile } = useStudentAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const user = currentAdmin || currentStudent;
  const isStudent = !!currentStudent;
  const isStaff = !!currentAdmin;
  const isAdminOrSuper = currentAdmin && (currentAdmin.role === 'admin' || currentAdmin.isSuperAdmin);
  // Bypass default password warning for admins
  const isUsingDefaultPassword = isStaff && !user?.password && !isAdminOrSuper;

  // ── Edit mode ─────────────────────────────────────────────────────────────
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState(user?.name || user?.['STUDENT NAME'] || '');
  const [email, setEmail] = useState(user?.email || '');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  // ── Password ──────────────────────────────────────────────────────────────
  const [passwords, setPasswords] = useState({ new: '', confirm: '' });
  const [showPasswords, setShowPasswords] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // ── Photo ─────────────────────────────────────────────────────────────────
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoURL, setPhotoURL] = useState(user?.photo || user?.photoURL || '');
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [activeTab, setActiveTab] = useState('info');

  // Sync state if user changes/loads later
  React.useEffect(() => {
    if (user) {
      setName(user.name || user['STUDENT NAME'] || '');
      setEmail(user.email || '');
      setPhotoURL(user.photo || user.photoURL || '');
    }
  }, [user]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleCancelEdit = () => {
    setName(user?.name || user?.['STUDENT NAME'] || '');
    setEmail(user?.email || '');
    setEditMode(false);
  };

  const handleSaveInfo = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatus({ type: '', message: '' });
    const updateFn = isStudent ? updateStudentProfile : updateAdminProfile;
    const result = await updateFn({ name, email });
    if (result.success) {
      setStatus({ type: 'success', message: 'Profile updated successfully!' });
      setEditMode(false);
      setTimeout(() => setStatus({ type: '', message: '' }), 3000);
    } else {
      setStatus({ type: 'error', message: result.message });
    }
    setSaving(false);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      setStatus({ type: 'error', message: 'New passwords do not match!' });
      return;
    }
    if (passwords.new.length < 3) {
      setStatus({ type: 'error', message: 'Password must be at least 3 characters.' });
      return;
    }
    setChangingPassword(true);
    setStatus({ type: '', message: '' });
    const updateFn = isStudent ? updateStudentProfile : updateAdminProfile;
    const result = await updateFn({ password: passwords.new });
    if (result.success) {
      setStatus({ type: 'success', message: 'Password updated successfully!' });
      setPasswords({ new: '', confirm: '' });
      setTimeout(() => setStatus({ type: '', message: '' }), 3000);
    } else {
      setStatus({ type: 'error', message: result.message });
    }
    setChangingPassword(false);
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setStatus({ type: 'error', message: 'File too large. Max 2MB.' });
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
      // Use id, staffId, or email slug as upload key so hardcoded admins don't crash
      const uploadKey = isStudent
        ? currentStudent.id
        : (currentAdmin.id || currentAdmin.staffId || currentAdmin.email?.replace(/[^a-z0-9]/gi, '_'));
      const url = await uploadAvatar(file, uploadKey);
      const updateFn = isStudent ? updateStudentProfile : updateAdminProfile;
      await updateFn({ photo: url, photoURL: url });
      setPhotoURL(url);
      setStatus({ type: 'success', message: 'Profile picture updated!' });
      setTimeout(() => setStatus({ type: '', message: '' }), 3000);
    } catch (error) {
      console.error('Upload error:', error);
      setStatus({ type: 'error', message: 'Failed to upload image.' });
    }
    setUploadingPhoto(false);
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4">
          <User size={32} />
        </div>
        <h3 className="text-xl font-bold text-slate-800">Authentication Required</h3>
        <p className="text-slate-500 mb-6">Please log in to view and edit settings.</p>
        <button onClick={() => navigate('/')} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold">Go to Login</button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pb-20 animate-in fade-in duration-500 bg-white min-h-screen">
      {/* Top Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-slate-100">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <ArrowLeft size={24} className="text-slate-700" />
        </button>
        <h2 className="text-lg font-black text-slate-900 tracking-tight">{name}</h2>
        <div className="w-10" />
      </div>

      {/* Profile Info (TikTok style) */}
      <div className="flex flex-col items-center pt-6 px-4">
        {/* Avatar */}
        <div className="relative mb-3 group">
          <div
            className="w-14 h-14 rounded-full border-4 border-white shadow-xl bg-indigo-50 flex items-center justify-center overflow-hidden cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            {uploadingPhoto ? (
              <Loader2 size={32} className="animate-spin text-indigo-500" />
            ) : photoURL ? (
              <img src={photoURL} alt="Avatar" className="w-full h-full object-cover rounded-full" />
            ) : (
              <span className="text-4xl font-black text-indigo-600">{(name[0] || '?').toUpperCase()}</span>
            )}
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 p-2 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-transform active:scale-95"
          >
            <Camera size={16} />
          </button>
          <input type="file" ref={fileInputRef} onChange={handlePhotoSelect} className="hidden" accept="image/*" />
        </div>

        {/* Names */}
        <h1 className="text-2xl font-black text-slate-900">{name}</h1>
        <p className="text-sm font-bold text-slate-500 mt-0.5">@{user.regNo || user.staffId || user.email?.split('@')[0] || 'user'}</p>

        {/* Stats Row */}
        <div className="flex items-center justify-center gap-8 mt-5 mb-6 w-full max-w-sm">
          <div className="flex flex-col items-center">
            <span className="text-lg font-black text-slate-900 capitalize">
              {isStudent ? 'Student' : (currentAdmin?.role || 'Staff')}
            </span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Role</span>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div className="flex flex-col items-center">
            <span className="text-lg font-black text-slate-900">Active</span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Status</span>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div className="flex flex-col items-center">
            <span className="text-lg font-black text-slate-900">{isUsingDefaultPassword ? 'Weak' : 'Secure'}</span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Security</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 mb-4 w-full max-w-sm">
          <button 
            onClick={() => { setActiveTab('info'); setEditMode(true); }}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2.5 rounded-lg transition-colors"
          >
            Edit profile
          </button>
          <button 
            onClick={() => setActiveTab('security')}
            className={`flex-1 font-bold py-2.5 rounded-lg transition-colors ${
              isUsingDefaultPassword ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
            }`}
          >
            Security
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 sticky top-[53px] bg-white/95 backdrop-blur-md z-10">
        <button 
          onClick={() => setActiveTab('info')}
          className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'info' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          Personal Info
        </button>
        <button 
          onClick={() => setActiveTab('security')}
          className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'security' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          Account Security
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-4 mt-2">
        {activeTab === 'info' && (
           <form onSubmit={handleSaveInfo} className="space-y-5 max-w-md mx-auto">
             <div className="space-y-1.5">
               <label className="text-xs font-bold text-slate-500 ml-1">Full Name</label>
               <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!editMode}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-slate-400 focus:bg-white outline-none transition-all font-bold text-slate-800 disabled:opacity-70 disabled:bg-slate-100"
                />
             </div>
             <div className="space-y-1.5">
               <label className="text-xs font-bold text-slate-500 ml-1">Email</label>
               <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!editMode || !isAdminOrSuper}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-slate-400 focus:bg-white outline-none transition-all font-bold text-slate-800 disabled:opacity-70 disabled:bg-slate-100"
                />
                {editMode && !isAdminOrSuper && (
                  <p className="text-[10px] font-bold text-slate-400 ml-1 mt-1">Contact an admin to change your email.</p>
                )}
             </div>
             {editMode && (
               <div className="flex gap-3 pt-4">
                 <button type="button" onClick={handleCancelEdit} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-colors">Cancel</button>
                 <button type="submit" disabled={saving} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex justify-center items-center gap-2 transition-colors">
                   {saving ? <Loader2 size={18} className="animate-spin" /> : 'Save Changes'}
                 </button>
               </div>
             )}
             {!editMode && (
               <button 
                 type="button" 
                 onClick={() => setEditMode(true)}
                 className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold mt-4 transition-colors"
               >
                 Tap to edit information
               </button>
             )}
           </form>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6 max-w-md mx-auto">
            {isUsingDefaultPassword && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex gap-3">
                <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="text-sm font-bold text-amber-900">Update required</p>
                  <p className="text-xs font-medium text-amber-700 mt-0.5">Please change your default password to secure your account.</p>
                </div>
              </div>
            )}
            <form onSubmit={handleChangePassword} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 ml-1">New Password</label>
                <div className="relative">
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    value={passwords.new}
                    onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                    required
                    placeholder="Min 3 characters"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-slate-400 focus:bg-white outline-none transition-all font-bold text-slate-800 pr-12"
                  />
                  <button type="button" onClick={() => setShowPasswords(!showPasswords)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                    {showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 ml-1">Confirm Password</label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={passwords.confirm}
                  onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                  required
                  placeholder="Repeat new password"
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-slate-400 focus:bg-white outline-none transition-all font-bold text-slate-800"
                />
              </div>
              <button
                type="submit"
                disabled={changingPassword || !passwords.new || passwords.new !== passwords.confirm}
                className={`w-full py-3.5 rounded-xl font-bold flex justify-center items-center gap-2 mt-4 transition-all disabled:opacity-50 disabled:shadow-none ${
                  isUsingDefaultPassword ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-lg shadow-amber-200' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-200'
                }`}
              >
                {changingPassword ? <Loader2 size={18} className="animate-spin" /> : 'Update Password'}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Toast */}
      {status.message && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full flex items-center gap-2 shadow-2xl z-50 animate-in slide-in-from-bottom-8 duration-300 ${
          status.type === 'success' ? 'bg-slate-900 text-white' : 'bg-rose-600 text-white'
        }`}>
          {status.type === 'success' ? <CheckCircle size={18} className="text-emerald-400" /> : <AlertCircle size={18} />}
          <p className="font-bold text-sm whitespace-nowrap">{status.message}</p>
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

export default ProfileSettings;
