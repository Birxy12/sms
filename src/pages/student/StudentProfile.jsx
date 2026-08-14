import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useStudentAuth } from '../../context/StudentAuthContext';
import { useTheme } from '../../context/ThemeContext';
import { db } from '../../lib/firebase';
import { uploadAvatar } from '../../lib/supabase';
import { 
  User, Mail, GraduationCap, MapPin, Calendar, CheckCircle, 
  Edit2, Save, X, Hash, UserCircle, Camera, Upload, 
  Loader2, Phone, Briefcase, Award, Shield, AlertTriangle, ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import ImageCropperModal from '../../components/ImageCropperModal';
import AvatarSelector from '../../components/AvatarSelector';
import StudentAvatar from '../../components/StudentAvatar';

const StudentProfile = () => {
  const navigate = useNavigate();
  const { currentStudent, updateProfile } = useStudentAuth();
  const { primaryColor } = useTheme();
  
  // -- State Management --
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const canEdit = true; // Always allow student profile editing
  const [status, setStatus] = useState({ type: '', message: '' });
  
  // -- Form State --
  const [formData, setFormData] = useState({ name: '', phone: '', dob: '', email: '', gender: '', house: '' });
  const [selectedAvatarId, setSelectedAvatarId] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  
  // -- Date Formatting --
  const formatDateForInput = (dateVal) => {
    if (!dateVal) return '';
    
    // Handle Firestore Timestamp / object
    if (dateVal && typeof dateVal === 'object') {
      if (typeof dateVal.toDate === 'function') {
        dateVal = dateVal.toDate();
      } else if (typeof dateVal.seconds === 'number') {
        dateVal = new Date(dateVal.seconds * 1000);
      }
    }

    // Handle number (milliseconds timestamp)
    if (typeof dateVal === 'number') {
      dateVal = new Date(dateVal);
    }

    if (dateVal instanceof Date) {
      if (isNaN(dateVal.getTime())) return '';
      const y = dateVal.getFullYear();
      const m = String(dateVal.getMonth() + 1).padStart(2, '0');
      const d = String(dateVal.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    if (typeof dateVal !== 'string') {
      dateVal = String(dateVal);
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
      return dateVal;
    }

    if (dateVal.includes('/')) {
      const parts = dateVal.split('/');
      if (parts.length === 3) {
        if (parts[0].length === 4) return dateVal.replace(/\//g, '-');
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    return dateVal;
  };

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
  const [activeTab, setActiveTab] = useState('info');

  const fileInputRef = useRef(null);
  const statusTimerRef = useRef(null);

  // -- Helpers --
  const hasChanges = formData.name !== (currentStudent?.name || '') ||
                     formData.phone !== (currentStudent?.phone || '') ||
                     formData.dob !== formatDateForInput(currentStudent?.dob || '') ||
                     formData.email !== (currentStudent?.email || '') ||
                     formData.gender !== (currentStudent?.gender || '') ||
                     formData.house !== (currentStudent?.house || '') ||
                     selectedAvatarId !== (currentStudent?.avatarId || '') ||
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
      setSelectedAvatarId(currentStudent.avatarId || '');
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
    payload.avatarId = selectedAvatarId || null;

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
  }, [formData, avatarFile, currentStudent, isFormValid, updateProfile, selectedAvatarId]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setFormData({
      name: currentStudent?.name || '',
      phone: currentStudent?.phone || '',
      dob: formatDateForInput(currentStudent?.dob || ''),
      email: currentStudent?.email || '',
      gender: currentStudent?.gender || '',
      house: currentStudent?.house || ''
    });
    setSelectedAvatarId(currentStudent?.avatarId || '');
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
    <div className={`max-w-3xl mx-auto ${isEditing ? 'pb-32' : 'pb-20'} animate-in fade-in duration-500 bg-white min-h-screen`}>
      {/* Top Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-slate-100">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <ArrowLeft size={24} className="text-slate-700" />
        </button>
        <h2 className="text-lg font-black text-slate-900 tracking-tight">{currentStudent?.name}</h2>
        <div className="w-10" />
      </div>

      {/* Profile Info (TikTok style) */}
      <div className="flex flex-col items-center pt-6 px-4">
        {/* Avatar */}
        <div className="relative mb-3 group/avatar">
          <div
            className="w-12 h-12 rounded-full border-4 border-white shadow-xl bg-indigo-50 flex items-center justify-center overflow-hidden cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            {uploadingAvatar ? (
              <Loader2 size={24} className="animate-spin text-indigo-500" />
            ) : avatarPreview || currentStudent?.photo ? (
              <img src={avatarPreview || currentStudent.photo} alt="Avatar" className="w-full h-full object-cover rounded-full" />
            ) : (
              <StudentAvatar gender={currentStudent?.gender} avatarId={selectedAvatarId || currentStudent?.avatarId} size="100%" />
            )}
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 p-2 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-transform active:scale-95"
          >
            <Camera size={16} />
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
        </div>

        {/* Names */}
        <h1 className="text-2xl font-black text-slate-900 text-center">{currentStudent?.name}</h1>
        <p className="text-sm font-bold text-slate-500 mt-0.5">@{currentStudent?.regNo}</p>

        {/* Stats Row */}
        <div className="flex items-center justify-center gap-6 mt-5 mb-6 w-full max-w-sm">
          <div className="flex flex-col items-center">
            <span className="text-lg font-black text-slate-900">{currentStudent?.className || 'N/A'}</span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Class</span>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div className="flex flex-col items-center">
            <span className="text-lg font-black text-slate-900">{currentStudent?.house || 'None'}</span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">House</span>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div className="flex flex-col items-center">
            <span className="text-lg font-black text-emerald-600">Active</span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Status</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 mb-4 w-full max-w-sm">
          {!isEditing && (
            <button 
              onClick={() => canEdit ? setIsEditing(true) : setStatus({ type: 'error', message: 'Editing locked by admin' })}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2.5 rounded-lg transition-colors"
            >
              Edit profile
            </button>
          )}
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
          onClick={() => setActiveTab('academics')}
          className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'academics' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          Academics
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-4 mt-2">
        {activeTab === 'info' && (
           <div className="space-y-5 max-w-md mx-auto">
             <SectionHeader title="Personal Information" icon={User} />
             
             {isEditing && (
               <div className="space-y-3 mb-8 bg-slate-50 p-5 rounded-3xl border border-slate-100">
                 <label className="text-sm font-black text-slate-800 ml-1 block mb-3">Select 3D Avatar (Optional)</label>
                 <AvatarSelector 
                   genderFilter={currentStudent?.gender} 
                   selected={selectedAvatarId} 
                   onSelect={setSelectedAvatarId} 
                 />
               </div>
             )}

             <div className="space-y-1.5">
               <label className="text-xs font-bold text-slate-500 ml-1">Full Legal Name</label>
               <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  disabled={!isEditing}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-slate-400 focus:bg-white outline-none transition-all font-bold text-slate-800 disabled:opacity-70 disabled:bg-slate-100"
                />
             </div>
             
             <div className="space-y-1.5">
               <label className="text-xs font-bold text-slate-500 ml-1">Date of Birth</label>
               <input
                  type="date"
                  value={formData.dob}
                  onChange={(e) => setFormData(prev => ({ ...prev, dob: e.target.value }))}
                  disabled={!isEditing}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-slate-400 focus:bg-white outline-none transition-all font-bold text-slate-800 disabled:opacity-70 disabled:bg-slate-100"
                />
             </div>

             <div className="space-y-1.5">
               <label className="text-xs font-bold text-slate-500 ml-1">Active Phone Number</label>
               <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  disabled={!isEditing}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-slate-400 focus:bg-white outline-none transition-all font-bold text-slate-800 disabled:opacity-70 disabled:bg-slate-100"
                />
             </div>

             <div className="space-y-1.5">
               <label className="text-xs font-bold text-slate-500 ml-1">Primary Email Address</label>
               <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  disabled={!isEditing}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-slate-400 focus:bg-white outline-none transition-all font-bold text-slate-800 disabled:opacity-70 disabled:bg-slate-100"
                />
             </div>
             
             <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1.5">
                   <label className="text-xs font-bold text-slate-500 ml-1">Gender</label>
                   <input
                      type="text"
                      value={currentStudent?.gender || 'N/A'}
                      disabled
                      className="w-full px-4 py-3 rounded-xl bg-slate-100 border border-transparent font-bold text-slate-500 opacity-70 cursor-not-allowed"
                    />
                 </div>
                 <div className="space-y-1.5">
                   <label className="text-xs font-bold text-slate-500 ml-1">House</label>
                   <input
                      type="text"
                      value={currentStudent?.house || 'N/A'}
                      disabled
                      className="w-full px-4 py-3 rounded-xl bg-slate-100 border border-transparent font-bold text-slate-500 opacity-70 cursor-not-allowed"
                    />
                 </div>
             </div>

             {!isEditing && canEdit && (
               <button 
                 type="button" 
                 onClick={() => setIsEditing(true)}
                 className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold mt-4 transition-colors"
               >
                 Tap to edit information
               </button>
             )}
           </div>
        )}

        {activeTab === 'academics' && (
          <div className="space-y-6 max-w-md mx-auto">
             {/* Verification Banner */}
             <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Shield size={100} />
                </div>
                <div className="relative z-10 space-y-4">
                   <div className="flex items-center gap-2 bg-white/20 w-fit px-3 py-1 rounded-full border border-white/20 backdrop-blur-sm">
                     <AlertTriangle size={14} className="text-indigo-100" />
                     <span className="text-[10px] font-black uppercase tracking-widest text-white">Verified Identity</span>
                   </div>
                   <div>
                     <h4 className="text-lg font-black uppercase tracking-tight">System Integrity Active</h4>
                     <p className="text-indigo-100 text-xs font-medium leading-relaxed mt-1">
                       Your academic records are encrypted and synced with the central administrative database.
                     </p>
                   </div>
                   <button 
                     onClick={() => navigator.clipboard.writeText(currentStudent?.regNo)}
                     className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors w-fit border border-white/10"
                   >
                     <Hash size={14} /> Copy Reg ID
                   </button>
                </div>
             </div>
          </div>
        )}
      </div>

      {/* Floating Action Bar for Editing */}
      <AnimatePresence>
        {isEditing && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-[100] md:pl-64"
          >
            <div className="max-w-3xl mx-auto flex gap-3">
              <button 
                onClick={() => hasChanges ? setShowConfirmCancel(true) : handleCancel()}
                className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition-colors"
              >
                Discard
              </button>
              <button 
                onClick={handleSave}
                disabled={saving || !isFormValid}
                className="flex-[2] py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : 'Save Changes'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm Cancel Dialog */}
      <AnimatePresence>
        {showConfirmCancel && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200"
            >
              <h3 className="text-lg font-black text-slate-900 mb-1">Discard changes?</h3>
              <p className="text-slate-500 text-sm font-medium mb-6">You have modified your data. Discarding will revert all changes.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowConfirmCancel(false)} className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">Keep Editing</button>
                <button onClick={handleCancel} className="flex-1 py-3 rounded-xl font-bold bg-rose-600 text-white hover:bg-rose-700 transition-colors">Discard</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Status Toast */}
      <AnimatePresence>
        {status.message && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full flex items-center gap-2 shadow-2xl z-[400] ${
              status.type === 'success' ? 'bg-slate-900 text-white' : 'bg-rose-600 text-white'
            }`}
          >
            {status.type === 'success' ? <CheckCircle size={18} className="text-emerald-400" /> : <AlertTriangle size={18} />}
            <span className="font-bold text-sm whitespace-nowrap">{status.message}</span>
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