import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { uploadFileToSupabase } from '../../lib/supabase';
import {
  Plus, Search, Edit, Trash2, Camera, Loader2, X, Upload,
  GraduationCap, Calendar, Heart, MapPin, Mail, Sparkles
} from 'lucide-react';

const EMPTY_FORM = {
  name: '',
  dob: '',
  stateOfOrigin: '',
  hobbies: '',
  ambition: '',
  contact: '',
  className: 'Science',
  photo: ''
};

const FameManagement = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [status, setStatus] = useState({ type: '', message: '' });

  useEffect(() => { fetchStudents(); }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'fame_students'));
      setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
      showStatus('error', 'Failed to load Wall of Fame data.');
    } finally { setLoading(false); }
  };

  const showStatus = (type, message) => {
    setStatus({ type, message });
    setTimeout(() => setStatus({ type: '', message: '' }), 5000);
  };

  const openAdd = () => {
    setIsEditing(false); setEditingId(null);
    setFormData(EMPTY_FORM); setShowModal(true);
  };

  const openEdit = (s) => {
    setIsEditing(true); setEditingId(s.id);
    setFormData({
      name: s.name || '', dob: s.dob || '', stateOfOrigin: s.stateOfOrigin || '',
      hobbies: s.hobbies || '', ambition: s.ambition || '', contact: s.contact || '',
      className: s.className || 'Science', photo: s.photo || ''
    });
    setShowModal(true);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    showStatus('info', 'Uploading portrait to Supabase Storage…');
    try {
      const url = await uploadFileToSupabase(file, 'fame', 'portraits/');
      setFormData(prev => ({ ...prev, photo: url }));
      showStatus('success', 'Portrait uploaded successfully!');
    } catch (err) {
      console.error(err);
      showStatus('error', 'Upload failed. Ensure the "fame" bucket exists and is public in Supabase.');
    } finally { setUploading(false); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name) { showStatus('error', 'Full name is required.'); return; }
    if (!formData.photo) { showStatus('error', 'A portrait photo is required.'); return; }
    setSaving(true);
    try {
      if (isEditing) {
        await updateDoc(doc(db, 'fame_students', editingId), { ...formData, updatedAt: new Date().toISOString() });
        showStatus('success', 'Record updated!');
      } else {
        await addDoc(collection(db, 'fame_students'), { ...formData, createdAt: new Date().toISOString() });
        showStatus('success', 'Graduate added to Wall of Fame!');
      }
      setShowModal(false);
      fetchStudents();
    } catch (err) {
      console.error(err);
      showStatus('error', 'Error saving record.');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this student from the Wall of Fame?')) return;
    try {
      await deleteDoc(doc(db, 'fame_students', id));
      showStatus('success', 'Student removed.');
      fetchStudents();
    } catch { showStatus('error', 'Delete failed.'); }
  };

  const filtered = students.filter(s => {
    const q = searchTerm.toLowerCase();
    const matchSearch = s.name?.toLowerCase().includes(q) || s.ambition?.toLowerCase().includes(q);
    const matchClass = classFilter === 'All' || s.className === classFilter;
    return matchSearch && matchClass;
  });

  const field = (label, key, type = 'text', placeholder = '') => (
    <div className="space-y-1.5">
      <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>
      <input
        type={type}
        value={formData[key]}
        onChange={e => setFormData(p => ({ ...p, [key]: e.target.value }))}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '10px 14px', borderRadius: 12,
          border: '1.5px solid #e2e8f0', fontSize: 13, fontWeight: 500,
          background: '#f8fafc', outline: 'none', boxSizing: 'border-box', color: '#1e293b'
        }}
        onFocus={e => e.target.style.borderColor = '#6366f1'}
        onBlur={e => e.target.style.borderColor = '#e2e8f0'}
      />
    </div>
  );

  return (
    <div style={{ padding: '32px 24px', maxWidth: 1200, margin: '0 auto', fontFamily: "'Inter', sans-serif" }}>

      {/* ── Banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #2563eb 100%)',
        borderRadius: 24, padding: '40px 48px', color: '#fff', marginBottom: 28,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 20, boxShadow: '0 20px 60px rgba(79,70,229,0.25)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
            background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)',
            padding: '4px 14px', borderRadius: 999, width: 'fit-content' }}>
            <Sparkles size={12} style={{ color: '#fcd34d' }} />
            <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1 }}>SS3 GRADUATION FEATURE</span>
          </div>
          <h1 style={{ margin: 0, fontSize: 36, fontWeight: 900, lineHeight: 1.1 }}>Wall of Fame Manager</h1>
          <p style={{ margin: '10px 0 0', color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: 500, maxWidth: 480 }}>
            Upload portraits and manage graduating student profiles. All images are saved to your Supabase Storage.
          </p>
        </div>
        <button onClick={openAdd} style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '14px 28px',
          background: '#fff', color: '#4f46e5', border: 'none', borderRadius: 16,
          fontWeight: 900, fontSize: 13, cursor: 'pointer', boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          transition: 'transform 0.15s'
        }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <Plus size={16} /> Add Graduate
        </button>
      </div>

      {/* ── Status ── */}
      {status.message && (
        <div style={{
          padding: '12px 18px', borderRadius: 14, marginBottom: 20, fontSize: 13, fontWeight: 700,
          background: status.type === 'success' ? '#f0fdf4' : status.type === 'error' ? '#fff1f2' : '#eff6ff',
          color: status.type === 'success' ? '#166534' : status.type === 'error' ? '#9f1239' : '#1e40af',
          border: `1px solid ${status.type === 'success' ? '#bbf7d0' : status.type === 'error' ? '#fecdd3' : '#bfdbfe'}`
        }}>
          {status.message}
        </div>
      )}

      {/* ── Controls ── */}
      <div style={{
        background: '#fff', borderRadius: 20, padding: '16px 20px', marginBottom: 24,
        display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9'
      }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            placeholder="Search by name or ambition…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              width: '100%', padding: '10px 14px 10px 40px', borderRadius: 12,
              border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: 13,
              fontWeight: 500, outline: 'none', boxSizing: 'border-box'
            }}
            onFocus={e => e.target.style.borderColor = '#6366f1'}
            onBlur={e => e.target.style.borderColor = '#e2e8f0'}
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['All', 'Science', 'Art'].map(c => (
            <button key={c} onClick={() => setClassFilter(c)} style={{
              padding: '10px 20px', borderRadius: 12, border: 'none', fontWeight: 800,
              fontSize: 12, cursor: 'pointer', transition: 'all 0.15s',
              background: classFilter === c ? '#4f46e5' : '#f1f5f9',
              color: classFilter === c ? '#fff' : '#64748b',
            }}>
              {c === 'All' ? 'All Classes' : `${c} Class`}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginLeft: 'auto' }}>
          {filtered.length} graduate{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Grid ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <Loader2 size={36} style={{ color: '#4f46e5', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: '#94a3b8', fontWeight: 700 }}>Loading graduates…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 24px', background: '#fff', borderRadius: 24, border: '1px solid #f1f5f9' }}>
          <GraduationCap size={48} style={{ color: '#cbd5e1', margin: '0 auto 16px' }} />
          <h3 style={{ color: '#475569', fontWeight: 900, margin: '0 0 8px' }}>No graduates found</h3>
          <p style={{ color: '#94a3b8', fontSize: 14, maxWidth: 360, margin: '0 auto' }}>
            Try adjusting your search or click "Add Graduate" to register a new SS3 portrait.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
          {filtered.map(s => (
            <div key={s.id} style={{
              background: '#fff', borderRadius: 20, overflow: 'hidden',
              border: '1px solid #f1f5f9', boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              display: 'flex', flexDirection: 'column', transition: 'box-shadow 0.2s'
            }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 8px 32px rgba(79,70,229,0.12)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)'}
            >
              <div style={{ position: 'relative', height: 220, background: '#f1f5f9', overflow: 'hidden' }}>
                <img src={s.photo} alt={s.name} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }}
                  onMouseEnter={e => e.target.style.transform = 'scale(1.06)'}
                  onMouseLeave={e => e.target.style.transform = 'scale(1)'}
                />
                <span style={{
                  position: 'absolute', top: 12, left: 12, padding: '4px 12px', borderRadius: 999,
                  fontSize: 10, fontWeight: 900, letterSpacing: 0.5, textTransform: 'uppercase',
                  background: s.className === 'Science' ? '#2563eb' : '#ea580c', color: '#fff'
                }}>{s.className}</span>
              </div>
              <div style={{ padding: '18px 18px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#1e293b' }}>{s.name}</h3>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Calendar size={12} style={{ color: '#6366f1' }} />{s.dob ? new Date(s.dob).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MapPin size={12} style={{ color: '#6366f1' }} />{s.stateOfOrigin || 'N/A'}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><Heart size={12} style={{ color: '#6366f1' }} />{s.hobbies || 'N/A'}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><Mail size={12} style={{ color: '#6366f1' }} />{s.contact || 'N/A'}</span>
                </div>
                {s.ambition && (
                  <div style={{ padding: '10px 14px', background: '#f5f3ff', borderRadius: 12, borderLeft: '3px solid #6366f1' }}>
                    <span style={{ fontSize: 11, color: '#4f46e5', fontWeight: 700, fontStyle: 'italic' }}>"{s.ambition}"</span>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button onClick={() => openEdit(s)} style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '9px 0', borderRadius: 12, border: '1.5px solid #e2e8f0',
                    background: '#f8fafc', color: '#475569', fontWeight: 800, fontSize: 11, cursor: 'pointer', transition: 'all 0.15s'
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.color = '#4f46e5'; e.currentTarget.style.borderColor = '#c7d2fe'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#475569'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                  ><Edit size={12} /> Edit</button>
                  <button onClick={() => handleDelete(s.id)} style={{
                    padding: '9px 14px', borderRadius: 12, border: '1.5px solid #fee2e2',
                    background: '#fff1f2', color: '#e11d48', cursor: 'pointer', transition: 'all 0.15s'
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#ffe4e6'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#fff1f2'; }}
                  ><Trash2 size={13} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal ── */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.6)',
          backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
        }}>
          <div style={{
            background: '#fff', borderRadius: 24, width: '100%', maxWidth: 560,
            maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
            boxShadow: '0 40px 100px rgba(0,0,0,0.25)'
          }}>
            {/* Modal Header */}
            <div style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', padding: '24px 28px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>
                {isEditing ? 'Edit Graduate Profile' : 'Add New Graduate'}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 999, padding: 8, cursor: 'pointer', color: '#fff', display: 'flex' }}>
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSave} style={{ padding: '24px 28px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Portrait Upload */}
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
                padding: '24px 0', background: '#f8fafc', borderRadius: 16,
                border: '2px dashed #c7d2fe'
              }}>
                <div style={{
                  width: 120, height: 120, borderRadius: 16, overflow: 'hidden',
                  background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}>
                  {uploading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <Loader2 size={24} style={{ color: '#4f46e5', animation: 'spin 1s linear infinite' }} />
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8' }}>Uploading…</span>
                    </div>
                  ) : formData.photo ? (
                    <img src={formData.photo} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Camera size={36} style={{ color: '#cbd5e1' }} />
                  )}
                </div>
                <label style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px',
                  background: '#4f46e5', color: '#fff', borderRadius: 12,
                  fontWeight: 800, fontSize: 12, cursor: uploading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(79,70,229,0.3)', opacity: uploading ? 0.6 : 1
                }}>
                  <Upload size={14} />
                  {formData.photo ? 'Change Portrait' : 'Upload Portrait'}
                  <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} disabled={uploading} />
                </label>
                <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
                  Saved to Supabase Storage · Recommended: Square image &lt; 2MB
                </p>
              </div>

              {/* Two-column fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {field('Full Name', 'name', 'text', 'e.g. Samuel Adebayo')}
                <div className="space-y-1.5">
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>Class Section</label>
                  <select
                    value={formData.className}
                    onChange={e => setFormData(p => ({ ...p, className: e.target.value }))}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 12,
                      border: '1.5px solid #e2e8f0', fontSize: 13, fontWeight: 500,
                      background: '#f8fafc', outline: 'none', boxSizing: 'border-box', color: '#1e293b'
                    }}
                  >
                    <option value="Science">Science Class</option>
                    <option value="Art">Art Class</option>
                  </select>
                </div>
                {field('Date of Birth', 'dob', 'date')}
                {field('State of Origin', 'stateOfOrigin', 'text', 'e.g. Lagos State')}
              </div>

              {field('Hobbies', 'hobbies', 'text', 'e.g. Coding, Chess, Basketball')}
              {field('Future Ambition', 'ambition', 'text', 'e.g. Aerospace Engineer, Surgeon')}
              {field('Contact (Email / Phone)', 'contact', 'text', 'e.g. sam@example.com or +234 812 345 6789')}

              {/* Footer Buttons */}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid #f1f5f9', marginTop: 4 }}>
                <button type="button" onClick={() => setShowModal(false)} style={{
                  padding: '11px 22px', borderRadius: 12, border: 'none',
                  background: '#f1f5f9', color: '#64748b', fontWeight: 800, fontSize: 13, cursor: 'pointer'
                }}>Cancel</button>
                <button type="submit" disabled={saving || uploading} style={{
                  padding: '11px 24px', borderRadius: 12, border: 'none',
                  background: '#4f46e5', color: '#fff', fontWeight: 900, fontSize: 13,
                  cursor: saving || uploading ? 'not-allowed' : 'pointer',
                  opacity: saving || uploading ? 0.7 : 1,
                  display: 'flex', alignItems: 'center', gap: 8,
                  boxShadow: '0 4px 16px rgba(79,70,229,0.3)'
                }}>
                  {saving && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                  {saving ? 'Saving…' : isEditing ? 'Update Profile' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default FameManagement;
