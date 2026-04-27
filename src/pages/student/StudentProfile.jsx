import React, { useState } from 'react';
import { useStudentAuth } from '../../context/StudentAuthContext';
import { useTheme } from '../../context/ThemeContext';
import { db } from '../../lib/firebase';
import { uploadFileToSupabase } from '../../lib/supabase';
import { User, Mail, GraduationCap, MapPin, Calendar, CheckCircle, Edit2, Save, X, Hash, UserCircle, Camera, Upload, Loader2 } from 'lucide-react';

const StudentProfile = () => {
  const { currentStudent, updateProfile } = useStudentAuth();
  const { primaryColor } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(currentStudent?.name || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const result = await updateProfile({ name });
    if (result.success) {
      setStatus({ type: 'success', message: 'Profile updated!' });
      setIsEditing(false);
      setTimeout(() => setStatus({ type: '', message: '' }), 3000);
    } else {
      setStatus({ type: 'error', message: result.message });
    }
    setSaving(false);
  };

  const handlePassportUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setStatus({ type: 'error', message: 'Image size must be less than 2MB' });
      return;
    }

    setUploading(true);
    try {
      const url = await uploadFileToSupabase(file, 'images', 'passports/');
      const result = await updateProfile({ photo: url });
      if (result.success) {
        setStatus({ type: 'success', message: 'Passport updated successfully!' });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error("Upload error:", error);
      setStatus({ type: 'error', message: 'Failed to upload passport.' });
    } finally {
      setUploading(false);
      setTimeout(() => setStatus({ type: '', message: '' }), 3000);
    }
  };

  const infoFields = [
    { label: 'Registration Number', value: currentStudent?.regNo || 'N/A', icon: Hash },
    { label: 'Current Class', value: currentStudent?.className || 'N/A', icon: GraduationCap },
    { label: 'Gender', value: currentStudent?.gender || 'N/A', icon: UserCircle },
    { label: 'Email', value: currentStudent?.email || 'N/A', icon: Mail },
    { label: 'Date of Birth', value: currentStudent?.dob || 'N/A', icon: Calendar },
    { label: 'House', value: currentStudent?.house || 'N/A', icon: MapPin },
  ];

  return (
    <div className="dashboard-wrapper max-w-5xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 style={{ fontWeight: '900', fontSize: '28px', color: '#1e293b', margin: 0 }}>My Profile</h2>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>View and manage your academic identity.</p>
        </div>
        {!isEditing ? (
          <button 
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 bg-white border-2 border-slate-200 px-5 py-2.5 rounded-2xl font-black text-slate-700 hover:bg-slate-50 transition-all active:scale-95"
          >
            <Edit2 size={18} /> Edit Profile
          </button>
        ) : (
          <div className="flex gap-2">
            <button 
              onClick={() => { setIsEditing(false); setName(currentStudent?.name || ''); }}
              className="px-5 py-2.5 rounded-2xl font-black text-slate-500 hover:bg-slate-100 transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-2xl font-black hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50"
            >
              <Save size={18} /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <div className="card-white text-center p-0 relative overflow-hidden">

            {/* ── Banner / Passport Photo ── */}
            <div className="relative" style={{ height: '120px' }}>
              {currentStudent?.photo ? (
                <img
                  src={currentStudent.photo}
                  alt="Passport"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, ${primaryColor}40, ${primaryColor}15)` }} />
              )}
              {/* Dark overlay for readability */}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.35))' }} />

              {/* Camera upload overlay when editing */}
              {isEditing && (
                <label
                  className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer transition-opacity"
                  style={{ background: 'rgba(0,0,0,0.45)', color: 'white' }}
                >
                  <Camera size={28} />
                  <span style={{ fontSize: '10px', fontWeight: 900, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '2px' }}>
                    {uploading ? 'Uploading…' : 'Change Photo'}
                  </span>
                  <input type="file" accept="image/*" onChange={handlePassportUpload} className="hidden" />
                </label>
              )}
            </div>

            {/* ── Avatar initial circle sitting at bottom of banner ── */}
            <div style={{ marginTop: '-28px', position: 'relative', zIndex: 10 }} className="flex justify-center mb-3">
              <div className="w-14 h-14 rounded-full border-4 border-white shadow-lg bg-indigo-600 flex items-center justify-center overflow-hidden">
                {currentStudent?.photo ? (
                  <img src={currentStudent.photo} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span className="text-xl font-black text-white">{currentStudent?.name?.[0]?.toUpperCase() || '?'}</span>
                )}
              </div>
            </div>

            <div className="relative z-10 px-6 pb-8 text-center">
              {isEditing ? (
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-center px-4 py-2.5 rounded-xl border-2 border-indigo-500 bg-white font-black text-slate-800 outline-none mb-1"
                />
              ) : (
                <h3 className="text-lg font-black text-slate-900 mb-1 leading-tight">{currentStudent?.name}</h3>
              )}
              <p className="text-xs font-bold text-indigo-500 tracking-widest uppercase mb-5 px-2 py-1 bg-indigo-50 rounded-full inline-block">{currentStudent?.className}</p>
              
              <div className="grid grid-cols-2 gap-2 pt-4 border-t border-slate-100">
                <div className="bg-slate-50 p-3 rounded-2xl text-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Status</p>
                  <span className="text-xs font-black text-emerald-600 flex items-center justify-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Active
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl text-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Session</p>
                  <span className="text-xs font-black text-slate-700">2025/26</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Info */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          {infoFields.map((field, idx) => (
            <div key={idx} className="card-white flex items-center gap-4 p-6 group hover:border-indigo-200 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all flex items-center justify-center flex-shrink-0">
                <field.icon size={22} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{field.label}</p>
                <p className="text-sm font-black text-slate-800">{field.value}</p>
              </div>
            </div>
          ))}

          {/* Additional Section */}
          <div className="md:col-span-2 card-white p-6 border-l-4 border-l-indigo-500 bg-indigo-50/20">
            <h4 className="text-sm font-black text-indigo-900 mb-2 uppercase tracking-wide">Academic Commitment</h4>
            <p className="text-sm text-indigo-700 leading-relaxed">
              You are currently enrolled as a full-time student at Bonus Dominus Secondary School. 
              Please ensure your profile information is accurate for your official academic transcripts.
            </p>
          </div>
        </div>
      </div>

      {status.message && (
        <div className={`fixed bottom-8 right-8 p-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-8 ${
          status.type === 'success' ? 'bg-indigo-600' : 'bg-rose-600'
        } text-white z-50`}>
          <CheckCircle size={20} />
          <span className="font-bold tracking-tight">{status.message}</span>
        </div>
      )}
    </div>
  );
};

export default StudentProfile;

