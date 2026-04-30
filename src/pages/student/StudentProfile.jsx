import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useStudentAuth } from '../../context/StudentAuthContext';
import { useTheme } from '../../context/ThemeContext';
import { db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { uploadFileToSupabase } from '../../lib/supabase';
import { User, Mail, GraduationCap, MapPin, Calendar, CheckCircle, Edit2, Save, X, Hash, UserCircle, Camera, Upload, Loader2 } from 'lucide-react';

const StudentProfile = () => {
  const { currentStudent, updateProfile } = useStudentAuth();
  const { primaryColor } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(currentStudent?.name || '');
  const [phone, setPhone] = useState(currentStudent?.phone || '');
  const [dob, setDob] = useState(currentStudent?.dob || '');
  const [email, setEmail] = useState(currentStudent?.email || '');
  const [gender, setGender] = useState(currentStudent?.gender || '');
  const [saving, setSaving] = useState(false);
  const [canEdit, setCanEdit] = useState(true);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const [stats, setStats] = useState({
    lastLogin: null,
    profileCompletion: 0,
    daysSinceUpdate: 0
  });
  const fileInputRef = useRef(null);
  const statusTimerRef = useRef(null);
  const cardRef = useRef(null);

  // ── Derived state ──
  const hasChanges = name !== (currentStudent?.name || '') ||
                     phone !== (currentStudent?.phone || '') ||
                     dob !== (currentStudent?.dob || '') ||
                     email !== (currentStudent?.email || '') ||
                     gender !== (currentStudent?.gender || '') ||
                     avatarFile !== null;

  const isFormValid = name.trim().length >= 2 &&
                      (!phone || /^[+]?[\d\s-]{7,15}$/.test(phone)) &&
                      (!dob || new Date(dob) < new Date());

  const fetchPermissions = async () => {
    try {
      const docSnap = await getDoc(doc(db, 'settings', 'student_permissions'));
      if (docSnap.exists()) {
        setCanEdit(docSnap.data().allowProfileEdit ?? true);
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, [currentStudent]);

  // ── Profile completion calculation ──
  useEffect(() => {
    const fields = ['name', 'phone', 'dob', 'email', 'gender', 'house', 'photo'];
    const filled = fields.filter(f => currentStudent?.[f]).length;
    setStats(prev => ({
      ...prev,
      profileCompletion: Math.round((filled / fields.length) * 100)
    }));
  }, [currentStudent]);

  // ── Status auto-dismiss ──
  useEffect(() => {
    if (status.message) {
      statusTimerRef.current = setTimeout(() => {
        setStatus({ type: '', message: '' });
      }, 4000);
    }
    return () => {
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    };
  }, [status.message]);

  // ── Save handler ──
  const handleSave = useCallback(async (e) => {
    e?.preventDefault();

    const newErrors = {
      name: validateField('name', name),
      phone: validateField('phone', phone),
      dob: validateField('dob', dob),
    };
    setErrors(newErrors);
    setTouched({ name: true, phone: true, dob: true });

    if (Object.values(newErrors).some(Boolean)) {
      setStatus({ type: 'error', message: 'Please fix the errors before saving' });
      return;
    }

    setSaving(true);
    let photoUrl = currentStudent?.photo;

    if (avatarFile) {
      setUploadingAvatar(true);
      try {
        const uploadResult = await uploadFileToSupabase(avatarFile, 'avatars', `${currentStudent?.id}/avatar`);
        if (uploadResult?.url) photoUrl = uploadResult.url;
      } catch {
        setStatus({ type: 'error', message: 'Failed to upload photo. Profile saved without photo.' });
      }
      setUploadingAvatar(false);
    }

    const result = await updateProfile({ name, phone, dob, email, gender, photo: photoUrl });
    if (result.success) {
      setStatus({ type: 'success', message: 'Profile updated successfully!' });
      setIsEditing(false);
      setAvatarFile(null);
      setAvatarPreview(null);
    } else {
      setStatus({ type: 'error', message: result.message || 'Failed to update profile' });
    }
    setSaving(false);
  }, [name, phone, dob, email, gender, avatarFile, currentStudent, validateField, updateProfile]);

  // ── Cancel handler ──
  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setName(currentStudent?.name || '');
    setPhone(currentStudent?.phone || '');
    setDob(currentStudent?.dob || '');
    setEmail(currentStudent?.email || '');
    setGender(currentStudent?.gender || '');
    setAvatarFile(null);
    setAvatarPreview(null);
    setErrors({});
    setTouched({});
    setShowConfirmCancel(false);
  }, [currentStudent]);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isEditing) {
        if (hasChanges) {
          setShowConfirmCancel(true);
        } else {
          handleCancel();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && isEditing) {
        e.preventDefault();
        if (isFormValid && !saving) handleSave(e);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditing, hasChanges, isFormValid, saving, handleCancel, handleSave]);

  // ── Validation ──
  const validateField = useCallback((field, value) => {
    switch (field) {
      case 'name':
        return value.trim().length < 2 ? 'Name must be at least 2 characters' : '';
      case 'phone':
        return value && !/^[+]?[\d\s-]{7,15}$/.test(value) ? 'Invalid phone number format' : '';
      case 'dob':
        return value && new Date(value) > new Date() ? 'Date cannot be in the future' : '';
      default:
        return '';
    }
  }, []);

  const handleBlur = (field, value) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    setErrors(prev => ({ ...prev, [field]: validateField(field, value) }));
  };

  const handleChange = (field, value) => {
    switch (field) {
      case 'name': setName(value); break;
      case 'phone': setPhone(value); break;
      case 'dob': setDob(value); break;
      case 'email': setEmail(value); break;
      case 'gender': setGender(value); break;
    }
    if (touched[field]) {
      setErrors(prev => ({ ...prev, [field]: validateField(field, value) }));
    }
  };

  // ── Avatar upload ──
  const handleAvatarClick = () => {
    if (isEditing && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 2 * 1024 * 1024;

    if (!validTypes.includes(file.type)) {
      setStatus({ type: 'error', message: 'Only JPG, PNG, or WebP images allowed' });
      return;
    }
    if (file.size > maxSize) {
      setStatus({ type: 'error', message: 'Image must be under 2MB' });
      return;
    }

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result);
    reader.readAsDataURL(file);
  };


  // ── Copy to clipboard ──
  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text).then(() => {
      setStatus({ type: 'success', message: `${label} copied to clipboard!` });
    });
  };

  const infoFields = [
    { label: 'Registration Number', value: currentStudent?.regNo || 'N/A', icon: Hash, copyable: true },
    { label: 'Current Class', value: currentStudent?.className || 'N/A', icon: GraduationCap },
    { label: 'Gender', value: currentStudent?.gender || 'N/A', icon: UserCircle },
    { label: 'Email', value: currentStudent?.email || 'N/A', icon: Mail, copyable: true },
    { label: 'Date of Birth', value: currentStudent?.dob || 'N/A', icon: Calendar },
    { label: 'House', value: currentStudent?.house || 'N/A', icon: MapPin },
  ];

  return (
    <div className="dashboard-wrapper max-w-5xl mx-auto animate-in fade-in duration-500">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 style={{ fontWeight: '900', fontSize: '28px', color: '#1e293b', margin: 0 }}>My Profile</h2>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>
            View and manage your academic identity.
            <span className="ml-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              {stats.profileCompletion}% Complete
            </span>
          </p>
        </div>
        {!isEditing ? (
          <div className="flex flex-col items-end gap-1">
            <button
              onClick={() => {
                if (canEdit) {
                  setIsEditing(true);
                } else {
                  setStatus({ type: 'error', message: 'Profile editing is currently disabled by administration.' });
                }
              }}
              disabled={!canEdit}
              className={`flex items-center gap-2 border-2 px-5 py-2.5 rounded-2xl font-black transition-all active:scale-95 shadow-sm ${
                canEdit 
                  ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-indigo-300' 
                  : 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed opacity-60'
              }`}
            >
              <Edit2 size={18} /> Edit Profile
            </button>
            {!canEdit && <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest animate-pulse">Editing Locked</p>}
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => hasChanges ? setShowConfirmCancel(true) : handleCancel()}
              className="px-5 py-2.5 rounded-2xl font-black text-slate-500 hover:bg-slate-100 hover:text-rose-600 transition-all flex items-center gap-1"
            >
              <X size={16} /> Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || uploadingAvatar || !isFormValid}
              className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-2xl font-black hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving || uploadingAvatar ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Save size={18} />
              )}
              {uploadingAvatar ? 'Uploading...' : saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      {/* ── Unsaved changes warning ── */}
      {isEditing && hasChanges && (
        <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-bold flex items-center gap-2 animate-in fade-in">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          You have unsaved changes. Press Ctrl+S to save, or Escape to cancel.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── Profile Card ── */}
        <div className="lg:col-span-1">
          <div ref={cardRef} className="card-white text-center p-0 relative overflow-hidden">

            {/* Banner / Passport Photo */}
            <div className="relative" style={{ height: '140px' }}>
              {currentStudent?.photo ? (
                <img
                  src={currentStudent.photo}
                  alt="Passport"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, ${primaryColor}40, ${primaryColor}15)` }} />
              )}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.35))' }} />
            </div>

            {/* Avatar with upload */}
            <div style={{ marginTop: '-28px', position: 'relative', zIndex: 10 }} className="flex justify-center mb-3">
              <div
                onClick={handleAvatarClick}
                className={`w-14 h-14 rounded-full border-4 border-white shadow-lg bg-indigo-600 flex items-center justify-center overflow-hidden ${isEditing ? 'cursor-pointer hover:ring-4 hover:ring-indigo-200 transition-all' : ''}`}
              >
                {avatarPreview || currentStudent?.photo ? (
                  <img
                    src={avatarPreview || currentStudent.photo}
                    alt="Avatar"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span className="text-xl font-black text-white">{currentStudent?.name?.[0]?.toUpperCase() || '?'}</span>
                )}
                {isEditing && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <Camera size={16} className="text-white" />
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            <div className="relative z-10 px-6 pb-8 text-center">
              {isEditing ? (
                <form onSubmit={handleSave} className="space-y-3 mb-4">
                  <div>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      onBlur={() => handleBlur('name', name)}
                      placeholder="Full Name"
                      className={`w-full text-center px-4 py-2.5 rounded-xl border-2 ${errors.name && touched.name ? 'border-rose-400 bg-rose-50' : 'border-indigo-500 bg-white'} font-black text-slate-800 outline-none transition-colors`}
                    />
                    {errors.name && touched.name && (
                      <p className="text-xs text-rose-500 font-bold mt-1">{errors.name}</p>
                    )}
                  </div>
                  <div>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      onBlur={() => handleBlur('phone', phone)}
                      placeholder="Phone Number"
                      className={`w-full text-center px-4 py-2.5 rounded-xl border-2 ${errors.phone && touched.phone ? 'border-rose-400 bg-rose-50' : 'border-indigo-500 bg-white'} font-black text-slate-800 outline-none transition-colors`}
                    />
                    {errors.phone && touched.phone && (
                      <p className="text-xs text-rose-500 font-bold mt-1">{errors.phone}</p>
                    )}
                  </div>
                  <div>
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => handleChange('dob', e.target.value)}
                      onBlur={() => handleBlur('dob', dob)}
                      className={`w-full text-center px-4 py-2.5 rounded-xl border-2 ${errors.dob && touched.dob ? 'border-rose-400 bg-rose-50' : 'border-indigo-500 bg-white'} font-black text-slate-800 outline-none transition-colors`}
                    />
                    {errors.dob && touched.dob && (
                      <p className="text-xs text-rose-500 font-bold mt-1">{errors.dob}</p>
                    )}
                  </div>
                  <div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      placeholder="Email Address"
                      className="w-full text-center px-4 py-2.5 rounded-xl border-2 border-indigo-500 bg-white font-black text-slate-800 outline-none"
                    />
                  </div>
                  <div>
                    <select
                      value={gender}
                      onChange={(e) => handleChange('gender', e.target.value)}
                      className="w-full text-center px-4 py-2.5 rounded-xl border-2 border-indigo-500 bg-white font-black text-slate-800 outline-none appearance-none"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                </form>
              ) : (
                <>
                  <h3 className="text-lg font-black text-slate-900 mb-1 leading-tight">{currentStudent?.name}</h3>
                  <p className="text-sm font-bold text-slate-600 mb-1">{currentStudent?.phone || 'No Phone Number'}</p>
                  <p className="text-xs font-bold text-slate-500 mb-3">{currentStudent?.dob || 'No DOB'}</p>
                </>
              )}
              <p className="text-xs font-bold text-indigo-500 tracking-widest uppercase mb-5 px-2 py-1 bg-indigo-50 rounded-full inline-block">{currentStudent?.className}</p>

              <div className="grid grid-cols-2 gap-2 pt-4 border-t border-slate-100">
                <div className="bg-slate-50 p-3 rounded-2xl text-center hover:bg-emerald-50 transition-colors">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Status</p>
                  <span className="text-xs font-black text-emerald-600 flex items-center justify-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Active
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl text-center hover:bg-indigo-50 transition-colors">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Session</p>
                  <span className="text-xs font-black text-slate-700">2025/26</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Detailed Info ── */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          {infoFields.map((field, idx) => (
            <div
              key={idx}
              onClick={() => field.copyable && field.value !== 'N/A' && copyToClipboard(field.value, field.label)}
              className={`card-white flex items-center gap-4 p-6 group hover:border-indigo-200 transition-all ${field.copyable && field.value !== 'N/A' ? 'cursor-pointer hover:shadow-md' : ''}`}
            >
              <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all flex items-center justify-center flex-shrink-0">
                <field.icon size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{field.label}</p>
                <p className="text-sm font-black text-slate-800 truncate">{field.value}</p>
              </div>
              {field.copyable && field.value !== 'N/A' && (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-400">
                  <Upload size={14} className="rotate-180" />
                </div>
              )}
            </div>
          ))}

          {/* Profile Completion Bar */}
          <div className="md:col-span-2 card-white p-6">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-sm font-black text-slate-700">Profile Completion</h4>
              <span className="text-xs font-black text-indigo-600">{stats.profileCompletion}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${stats.profileCompletion}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-2 font-medium">
              {stats.profileCompletion < 100
                ? 'Complete your profile to unlock all features.'
                : 'Your profile is fully complete!'}
            </p>
          </div>

          {/* Academic Commitment */}
          <div className="md:col-span-2 card-white p-6 border-l-4 border-l-indigo-500 bg-indigo-50/20">
            <h4 className="text-sm font-black text-indigo-900 mb-2 uppercase tracking-wide">Academic Commitment</h4>
            <p className="text-sm text-indigo-700 leading-relaxed">
              You are currently enrolled as a full-time student at Bonus Dominus Secondary School.
              Please ensure your profile information is accurate for your official academic transcripts.
            </p>
          </div>
        </div>
      </div>

      {/* ── Confirm Cancel Modal ── */}
      {showConfirmCancel && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full mx-4 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-lg font-black text-slate-900 mb-2">Discard Changes?</h3>
            <p className="text-sm text-slate-600 mb-6">You have unsaved changes. Are you sure you want to discard them?</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirmCancel(false)}
                className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-all"
              >
                Keep Editing
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 rounded-xl font-bold bg-rose-600 text-white hover:bg-rose-700 transition-all"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Status Toast ── */}
      {status.message && (
        <div className={`fixed bottom-8 right-8 p-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-8 ${
          status.type === 'success' ? 'bg-indigo-600' : 'bg-rose-600'
        } text-white z-50`}>
          <CheckCircle size={20} />
          <span className="font-bold tracking-tight">{status.message}</span>
          <button
            onClick={() => setStatus({ type: '', message: '' })}
            className="ml-2 opacity-70 hover:opacity-100 transition-opacity"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default StudentProfile;