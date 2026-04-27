import React, { useState, useRef } from 'react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useStudentAuth } from '../../context/StudentAuthContext';
import { 
  User, Mail, Shield, CheckCircle, AlertCircle, Loader2, Save, 
  ArrowLeft, Camera, Lock, Eye, EyeOff, UploadCloud, Trash2 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { uploadFileToSupabase } from '../../lib/supabase';

const ProfileSettings = () => {
  const { currentAdmin, updateProfile: updateAdminProfile } = useAdminAuth();
  const { currentStudent, updateProfile: updateStudentProfile } = useStudentAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const user = currentAdmin || currentStudent;
  const isStudent = !!currentStudent;
  const isStaff = !!currentAdmin;
  
  // Basic Info State
  const [name, setName] = useState(user?.name || user?.['STUDENT NAME'] || '');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  // Password State
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [showPasswords, setShowPasswords] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Photo State
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoURL, setPhotoURL] = useState(user?.photo || user?.photoURL || '');

  // Detect if staff is using default password (134)
  const isUsingDefaultPassword = isStaff && !user.password;

  const handleSaveInfo = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatus({ type: '', message: '' });

    const updateFn = isStudent ? updateStudentProfile : updateAdminProfile;
    const result = await updateFn({ name });

    if (result.success) {
      setStatus({ type: 'success', message: 'Profile information updated!' });
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
    // For simplicity in this mock-up, we update the 'password' field in Firestore
    const result = await updateFn({ password: passwords.new });

    if (result.success) {
      setStatus({ type: 'success', message: 'Password updated successfully!' });
      setPasswords({ current: '', new: '', confirm: '' });
      setTimeout(() => setStatus({ type: '', message: '' }), 3000);
    } else {
      setStatus({ type: 'error', message: result.message });
    }
    setChangingPassword(false);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setStatus({ type: 'error', message: 'File too large. Max 2MB.' });
      return;
    }

    setUploadingPhoto(true);
    try {
      const url = await uploadFileToSupabase(file, 'images', 'profiles/');
      
      const updateFn = isStudent ? updateStudentProfile : updateAdminProfile;
      await updateFn({ photo: url, photoURL: url });
      
      setPhotoURL(url);
      setStatus({ type: 'success', message: 'Profile picture updated!' });
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
        <p className="text-slate-500 mb-6">Please log in to your account to view and edit settings.</p>
        <button onClick={() => navigate('/')} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold">Go to Login</button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-8">
        <button onClick={() => navigate(-1)} className="p-2.5 hover:bg-slate-100 rounded-2xl transition-colors">
          <ArrowLeft size={24} className="text-slate-600" />
        </button>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Account Settings</h2>
        <div className="w-10"></div>
      </div>

      {isUsingDefaultPassword && (
        <div className="mb-8 p-6 bg-amber-50 border-2 border-amber-200 rounded-3xl flex items-start gap-4 animate-pulse">
          <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl">
            <Shield size={24} />
          </div>
          <div>
            <h4 className="font-black text-amber-900 text-lg">Action Required: Change Password</h4>
            <p className="text-amber-700 font-bold text-sm">You are still using the default password (134). For security reasons, please update your password below.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar: Profile Photo */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 text-center sticky top-8 overflow-hidden">

            {/* Cover / Photo Banner */}
            <div className="relative" style={{ height: '120px' }}>
              {photoURL ? (
                <img src={photoURL} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #6366f140, #6366f115)' }} />
              )}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.35))' }} />
              {/* Click to upload */}
              <label
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer transition-opacity opacity-0 hover:opacity-100"
                style={{ background: 'rgba(0,0,0,0.45)', color: 'white' }}
              >
                {uploadingPhoto ? <Loader2 size={24} className="animate-spin" /> : <Camera size={24} />}
                <span style={{ fontSize: '10px', fontWeight: 900, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '2px' }}>
                  {uploadingPhoto ? 'Uploading…' : 'Change Photo'}
                </span>
              </label>
              <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} className="hidden" accept="image/*" />
            </div>

            {/* Avatar circle overlapping banner */}
            <div style={{ marginTop: '-28px', position: 'relative', zIndex: 10 }} className="flex justify-center mb-3">
              <div className="w-14 h-14 rounded-full border-4 border-white shadow-lg bg-indigo-100 flex items-center justify-center overflow-hidden">
                {photoURL ? (
                  <img src={photoURL} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl font-black text-indigo-600">{(name[0] || '?').toUpperCase()}</span>
                )}
              </div>
            </div>

            <div className="px-8 pb-8">
              <h3 className="text-xl font-black text-slate-900 mb-1">{name}</h3>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">
                {isStudent ? 'Student Account' : (currentAdmin.role === 'admin' ? 'Super Admin' : 'Staff Member')}
              </p>
              
              <div className="pt-6 border-t border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{isStudent ? 'REG NO' : 'STAFF ID'}</span>
                  <span className="text-sm font-black text-slate-700 bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">{user.regNo || user.staffId || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">STATUS</span>
                  <span className="text-emerald-600 font-black text-[10px] flex items-center gap-1 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-tighter">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div> Verified
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content: Forms */}
        <div className="lg:col-span-8 space-y-8">
          {/* General Information */}
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <User size={20} />
              </div>
              <h4 className="text-lg font-black text-slate-800">Personal Information</h4>
            </div>

            <form onSubmit={handleSaveInfo} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 ml-1 uppercase tracking-widest">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none transition-all font-bold text-slate-700 shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-2 opacity-60">
                <label className="text-xs font-black text-slate-500 ml-1 uppercase tracking-widest">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input 
                    type="email" 
                    value={user.email || 'N/A'} 
                    disabled 
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-100 border-none text-slate-500 cursor-not-allowed font-bold"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={saving || name === (user.name || user['STUDENT NAME'])}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-2xl font-black hover:bg-black transition-all shadow-xl disabled:opacity-40 disabled:shadow-none active:scale-[0.98]"
              >
                {saving ? <Loader2 size={24} className="animate-spin" /> : <>
                  <Save size={20} />
                  Update Name
                </>}
              </button>
            </form>
          </div>

          {/* Security / Password */}
          <div className={`bg-white p-8 rounded-[2rem] shadow-sm border-2 ${isUsingDefaultPassword ? 'border-amber-400' : 'border-slate-200'}`}>
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${isUsingDefaultPassword ? 'bg-amber-100 text-amber-600' : 'bg-indigo-50 text-indigo-600'}`}>
                  <Lock size={20} />
                </div>
                <h4 className="text-lg font-black text-slate-800">Account Security</h4>
              </div>
              <button 
                type="button" 
                onClick={() => setShowPasswords(!showPasswords)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPasswords ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 ml-1 uppercase tracking-widest">New Password</label>
                  <input 
                    type={showPasswords ? "text" : "password"} 
                    value={passwords.new}
                    onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                    required
                    placeholder="Min 3 characters"
                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none transition-all font-bold text-slate-700 shadow-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 ml-1 uppercase tracking-widest">Confirm Password</label>
                  <input 
                    type={showPasswords ? "text" : "password"} 
                    value={passwords.confirm}
                    onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                    required
                    placeholder="Repeat new password"
                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none transition-all font-bold text-slate-700 shadow-sm"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={changingPassword || !passwords.new || passwords.new !== passwords.confirm}
                className={`w-full flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-black transition-all shadow-xl active:scale-[0.98] disabled:opacity-40 disabled:shadow-none ${
                  isUsingDefaultPassword ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
                }`}
              >
                {changingPassword ? <Loader2 size={24} className="animate-spin" /> : <>
                  <Shield size={20} />
                  {isUsingDefaultPassword ? 'Update Default Password' : 'Change Password'}
                </>}
              </button>
            </form>
          </div>

          {/* Toast Notifications */}
          {status.message && (
            <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 p-5 rounded-[1.5rem] flex items-center gap-3 shadow-2xl z-50 animate-in slide-in-from-bottom-8 duration-300 min-w-[320px] ${
              status.type === 'success' ? 'bg-slate-900 text-white' : 'bg-rose-600 text-white'
            }`}>
              {status.type === 'success' ? <CheckCircle size={22} className="text-emerald-400" /> : <AlertCircle size={22} />}
              <p className="font-black text-sm tracking-tight">{status.message}</p>
              <button onClick={() => setStatus({type:'', message:''})} className="ml-auto p-1 hover:bg-white/10 rounded-lg">
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;
