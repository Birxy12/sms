import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useStudentAuth } from '../../context/StudentAuthContext';
import { useTheme } from '../../context/ThemeContext';
import { db } from '../../lib/firebase';
import { uploadAvatar } from '../../lib/supabase';
import { 
  User, Mail, GraduationCap, MapPin, Calendar, CheckCircle, 
  Edit2, Save, X, Hash, UserCircle, Camera, Upload, 
  Loader2, Phone, Briefcase, Award, Shield, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ImageCropperModal from '../../components/ImageCropperModal';

const StudentProfile = () => {
  const { currentStudent, updateProfile } = useStudentAuth();
  const { primaryColor } = useTheme();
  
  // -- State Management --
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const canEdit = true; // Always allow student profile editing
  const [status, setStatus] = useState({ type: '', message: '' });
  
  // -- Date Formatting --
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    if (dateString.includes('/')) {
      const parts = dateString.split('/');
      if (parts.length === 3) {
        if (parts[0].length === 4) return dateString.replace(/\//g, '-');
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    return dateString;
  };

  const [formData, setFormData] = useState({
    name: currentStudent?.name || '',
    phone: currentStudent?.phone || '',
    dob: formatDateForInput(currentStudent?.dob || ''),
    email: currentStudent?.email || '',
    gender: currentStudent?.gender || '',
    house: currentStudent?.house || ''
  });

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const [stats, setStats] = useState({
    profileCompletion: 0,
    academicStatus: 'Active'
  });
  const [showCropper, setShowCropper] = useState(false);
  const [cropperFile, setCropperFile] = useState(null);

  const fileInputRef = useRef(null);
  const statusTimerRef = useRef(null);

  // -- Helpers --
  const hasChanges = formData.name !== (currentStudent?.name || '') ||
                     formData.phone !== (currentStudent?.phone || '') ||
                     formData.dob !== formatDateForInput(currentStudent?.dob || '') ||
                     formData.email !== (currentStudent?.email || '') ||
                     formData.gender !== (currentStudent?.gender || '') ||
                     formData.house !== (currentStudent?.house || '') ||
                     avatarFile !== null;

  const validateField = useCallback((field, value) => {
    switch (field) {
      case 'name': return value.trim().length < 2 ? 'Name is too short' : '';
      case 'phone': return value && !/^[+]?[\d\s-]{7,15}$/.test(value) ? 'Invalid format' : '';
      case 'dob': return value && new Date(value) > new Date() ? 'Invalid date' : '';
      default: return '';
    }
  }, []);

  const isFormValid = !validateField('name', formData.name) && 
                      !validateField('phone', formData.phone);

  // -- Effects --
  // Note: canEdit is always true — students can always edit their profile.


  useEffect(() => {
    const fields = ['name', 'phone', 'dob', 'email', 'gender', 'photo'];
    const filled = fields.filter(f => currentStudent?.[f]).length;
    setStats(prev => ({ ...prev, profileCompletion: Math.round((filled / fields.length) * 100) }));
  }, [currentStudent]);

  useEffect(() => {
    if (currentStudent && !isEditing) {
      setFormData({
        name: currentStudent.name || '',
        phone: currentStudent.phone || '',
        dob: formatDateForInput(currentStudent.dob || ''),
        email: currentStudent.email || '',
        gender: currentStudent.gender || '',
        house: currentStudent.house || ''
      });
    }
  }, [currentStudent, isEditing]);

  useEffect(() => {
    if (status.message) {
      statusTimerRef.current = setTimeout(() => setStatus({ type: '', message: '' }), 4000);
    }
    return () => statusTimerRef.current && clearTimeout(statusTimerRef.current);
  }, [status.message]);

  // -- Handlers --
  const handleSave = useCallback(async (e) => {
    e?.preventDefault();
    if (!isFormValid) return;
    
    setSaving(true);
    let photoUrl = currentStudent?.photo || null;

    if (avatarFile) {
      setUploadingAvatar(true);
      try {
        const uploadResult = await uploadAvatar(avatarFile, currentStudent?.id);
        if (uploadResult) photoUrl = uploadResult;
      } catch (error) {
        setStatus({ type: 'error', message: 'Photo upload failed. Check Supabase Storage RLS policies.' });
        setSaving(false);
        setUploadingAvatar(false);
        return; // Halt save if avatar fails to upload
      }
      setUploadingAvatar(false);
    }

    const payload = { ...formData };
    if (photoUrl) payload.photo = photoUrl;

    const result = await updateProfile(payload);
    if (result.success) {
      setStatus({ type: 'success', message: 'Profile synchronized successfully' });
      setIsEditing(false);
      setAvatarFile(null);
      setAvatarPreview(null);
    } else {
      setStatus({ type: 'error', message: result.message || 'Sync failed' });
    }
    setSaving(false);
  }, [formData, avatarFile, currentStudent, isFormValid, updateProfile]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setFormData({
      name: currentStudent?.name || '',
      phone: currentStudent?.phone || '',
      dob: formatDateForInput(currentStudent?.dob || ''),
      email: currentStudent?.email || '',
      gender: currentStudent?.gender || ''
    });
    setAvatarFile(null);
    setAvatarPreview(null);
    setErrors({});
    setTouched({});
    setShowConfirmCancel(false);
  }, [currentStudent]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isEditing) hasChanges ? setShowConfirmCancel(true) : handleCancel();
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && isEditing) {
        e.preventDefault();
        if (isFormValid && !saving) handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditing, hasChanges, isFormValid, saving, handleCancel, handleSave]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setStatus({ type: 'error', message: 'Max 2MB allowed' });
      return;
    }
    
    setCropperFile(file);
    setShowCropper(true);
    // Reset input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCroppedImage = (file) => {
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result);
    reader.readAsDataURL(file);
  };

  // -- Internal Components --
  const StatCard = ({ label, value, icon: Icon, color }) => (
    <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${color}`}>
          <Icon size={22} className="group-hover:scale-110 transition-transform" />
        </div>
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
          <p className="text-lg font-black text-slate-800 tracking-tight">{value}</p>
        </div>
      </div>
    </div>
  );

  const SectionHeader = ({ title, icon: Icon }) => (
    <div className="flex items-center gap-2 mb-6 px-1">
      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
        <Icon size={16} />
      </div>
      <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">{title}</h3>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-700">
      
      {/* 1. Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Academic Identity</h1>
          <p className="text-slate-500 text-sm font-medium">Manage your professional student profile and credentials.</p>
        </div>
        
        <div className="flex items-center gap-3">
          {!isEditing ? (
            <button
              onClick={() => canEdit ? setIsEditing(true) : setStatus({ type: 'error', message: 'Editing locked by admin' })}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black transition-all active:scale-95 shadow-sm border-2 ${
                canEdit 
                ? 'bg-slate-900 text-white border-slate-900 hover:bg-indigo-600 hover:border-indigo-600' 
                : 'bg-slate-100 text-slate-400 border-slate-100 cursor-not-allowed'
              }`}
            >
              <Edit2 size={18} /> {canEdit ? 'Edit Profile' : 'Editing Restricted'}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => hasChanges ? setShowConfirmCancel(true) : handleCancel()}
                className="px-6 py-3 rounded-2xl font-black text-slate-500 hover:bg-slate-100 transition-all"
              >
                Discard
              </button>
              <button 
                onClick={handleSave}
                disabled={saving || !isFormValid}
                className="flex items-center gap-3 bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Shield size={18} />}
                {saving ? 'Synchronizing...' : 'Save & Secure'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Hero Identity Card */}
      <div className="relative group">
        <div className="h-48 md:h-64 rounded-[40px] overflow-hidden relative shadow-2xl">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-slate-900" style={{ 
            backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)',
            backgroundSize: '24px 24px'
          }} />
          <div className="absolute inset-0 bg-gradient-to-tr from-slate-900 via-transparent to-indigo-500/20" />
          
          <div className="absolute bottom-8 left-8 md:left-12 flex items-end gap-6 md:gap-8">
            {/* Avatar Stack */}
            <div className="relative group/avatar">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-slate-900 shadow-2xl bg-white overflow-hidden relative">
                {avatarPreview || currentStudent?.photo ? (
                  <img src={avatarPreview || currentStudent.photo} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-indigo-50 flex items-center justify-center text-indigo-600 text-4xl font-black">
                    {currentStudent?.name?.[0]}
                  </div>
                )}
                {isEditing && (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-slate-900/60 flex flex-col items-center justify-center text-white opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer backdrop-blur-sm"
                  >
                    <Camera size={24} className="mb-1" />
                    <span className="text-[8px] font-black uppercase tracking-widest">Update</span>
                  </div>
                )}
              </div>
              <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
              
              {/* Badge */}
              <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1.5 rounded-full border-4 border-slate-900 shadow-lg">
                <CheckCircle size={14} />
              </div>
            </div>

            <div className="mb-2 md:mb-4">
              <h2 className="text-2xl md:text-4xl font-black text-white tracking-tighter uppercase leading-none">
                {currentStudent?.name}
              </h2>
              <div className="flex items-center gap-3 mt-3">
                <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-white/80 text-[10px] font-black uppercase tracking-widest border border-white/10">
                  {currentStudent?.className}
                </span>
                <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-white/80 text-[10px] font-black uppercase tracking-widest border border-white/10">
                  ID: {currentStudent?.regNo}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Metrics & Quick Info (4 cols) */}
        <div className="lg:col-span-4 space-y-8">
          
          <div className="grid grid-cols-1 gap-4">
            <StatCard 
              label="Profile Completion" 
              value={`${stats.profileCompletion}%`} 
              icon={Award} 
              color="bg-amber-50 text-amber-600" 
            />
            <StatCard 
              label="Academic Status" 
              value={stats.academicStatus} 
              icon={Shield} 
              color="bg-emerald-50 text-emerald-600" 
            />
            <StatCard 
              label="House Member" 
              value={currentStudent?.house || 'N/A'} 
              icon={MapPin} 
              color="bg-indigo-50 text-indigo-600" 
            />
          </div>

          <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm space-y-6">
            <SectionHeader title="Contact Access" icon={Phone} />
            
            <div className="space-y-6">
              <div className="group">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Primary Email</p>
                <div className="flex items-center gap-3 text-slate-700 font-bold group-hover:text-indigo-600 transition-colors">
                  <Mail size={16} className="text-slate-300 group-hover:text-indigo-400" />
                  <span className="text-sm truncate">{currentStudent?.email || 'Not verified'}</span>
                </div>
              </div>

              <div className="group">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Active Hotline</p>
                <div className="flex items-center gap-3 text-slate-700 font-bold group-hover:text-indigo-600 transition-colors">
                  <Phone size={16} className="text-slate-300 group-hover:text-indigo-400" />
                  <span className="text-sm">{currentStudent?.phone || 'Emergency contact missing'}</span>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-50">
              <button 
                onClick={() => navigator.clipboard.writeText(currentStudent?.regNo)}
                className="w-full py-4 rounded-2xl bg-slate-50 text-slate-500 font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 hover:text-slate-700 transition-all flex items-center justify-center gap-2"
              >
                <Hash size={14} /> Copy Registration ID
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Data (8 cols) */}
        <div className="lg:col-span-8 space-y-8">
          
          <div className="bg-white rounded-[40px] p-8 md:p-12 border border-slate-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
              <UserCircle size={200} />
            </div>

            <SectionHeader title="Personal Credentials" icon={User} />

            {!isEditing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-8">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Full Legal Name</p>
                    <p className="text-lg font-black text-slate-800 uppercase tracking-tight">{currentStudent?.name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Date of Birth</p>
                    <p className="text-lg font-black text-slate-800 tracking-tight">{currentStudent?.dob || 'Unspecified'}</p>
                  </div>
                </div>
                <div className="space-y-8">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Gender Identity</p>
                    <p className="text-lg font-black text-slate-800 tracking-tight">{currentStudent?.gender || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Academic Level</p>
                    <p className="text-lg font-black text-slate-800 tracking-tight">{currentStudent?.className}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-bottom-4">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Legal Name</label>
                    <input 
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white transition-all font-bold outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Active Phone Number</label>
                    <input 
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white transition-all font-bold outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date of Birth</label>
                    <input 
                      type="date"
                      value={formData.dob}
                      onChange={(e) => setFormData(prev => ({ ...prev, dob: e.target.value }))}
                      className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white transition-all font-bold outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Primary Email Address</label>
                    <input 
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="email@example.com"
                      className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white transition-all font-bold outline-none"
                    />
                  </div>
                </div>

                {/* Read-only fields in edit mode */}
                <div className="md:col-span-2 grid grid-cols-2 gap-8 pt-4 border-t border-slate-50">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1 opacity-50">Gender Identity (Locked)</p>
                    <p className="px-6 py-4 rounded-2xl bg-slate-50 text-slate-400 font-bold border-2 border-transparent cursor-not-allowed uppercase">{currentStudent?.gender || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1 opacity-50">House / Wing (Locked)</p>
                    <p className="px-6 py-4 rounded-2xl bg-slate-50 text-slate-400 font-bold border-2 border-transparent cursor-not-allowed uppercase">{currentStudent?.house || 'N/A'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Verification Banner */}
          <div className="bg-indigo-600 rounded-[32px] p-8 text-white relative overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Shield size={120} />
            </div>
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <h4 className="text-xl font-black uppercase tracking-tight">System Integrity Active</h4>
                <p className="text-indigo-100 text-sm font-medium max-w-md">
                  Your academic records are encrypted and synced with the central administrative database.
                </p>
              </div>
              <div className="flex items-center gap-3 bg-white/10 px-6 py-3 rounded-2xl border border-white/10 backdrop-blur-sm">
                <AlertTriangle size={18} className="text-indigo-200" />
                <span className="text-[10px] font-black uppercase tracking-widest">Verified Student</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 4. Confirm Cancel Dialog */}
      <AnimatePresence>
        {showConfirmCancel && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl border-4 border-slate-900"
            >
              <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight">Discard Sync?</h3>
              <p className="text-slate-500 text-sm font-medium mb-8">You have modified your identity data. Discarding will revert all changes.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowConfirmCancel(false)} className="flex-1 py-4 rounded-2xl font-black text-slate-500 hover:bg-slate-50 transition-all text-xs uppercase">Keep Editing</button>
                <button onClick={handleCancel} className="flex-1 py-4 rounded-2xl font-black bg-rose-600 text-white shadow-lg shadow-rose-100 hover:bg-rose-700 transition-all text-xs uppercase">Discard</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. Status Toast */}
      <AnimatePresence>
        {status.message && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 z-[400] border-2 ${
              status.type === 'success' ? 'bg-slate-900 border-indigo-500 text-white' : 'bg-rose-600 border-rose-700 text-white'
            }`}
          >
            {status.type === 'success' ? <CheckCircle size={20} className="text-indigo-400" /> : <AlertTriangle size={20} />}
            <span className="font-black text-xs uppercase tracking-widest">{status.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Cropper */}
      {showCropper && (
        <ImageCropperModal
          file={cropperFile}
          onClose={() => {
            setShowCropper(false);
            setCropperFile(null);
          }}
          onComplete={handleCroppedImage}
        />
      )}

    </div>
  );
};

export default StudentProfile;