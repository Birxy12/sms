import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Loader2, Camera, Upload } from 'lucide-react';
import StudentAvatar from './StudentAvatar';

const FieldError = ({ message }) => (
  <span style={{ display: 'block', marginTop: '4px', fontSize: '11px', fontWeight: 600, color: '#ef4444' }}>
    {message}
  </span>
);

const StudentFormModal = ({
  showModal,
  setShowModal,
  isEditing,
  currentStudent,
  setCurrentStudent,
  uploading,
  handlePhotoSelect,
  classes,
  handleSave,
  saving,
  formatDateForInput
}) => {
  const modalRef = useRef(null);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  useEffect(() => {
    if (!showModal) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setShowModal(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [showModal, setShowModal]);

  const validate = useCallback((data) => {
    const errs = {};
    if (!data.name?.trim()) errs.name = 'Full name is required';
    if (!isEditing && !data.regNo?.trim()) errs.regNo = 'Registration number is required';
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errs.email = 'Invalid email';
    if (data.phone && !/^[+\d\s()-]{7,}$/.test(data.phone)) errs.phone = 'Invalid phone';
    return errs;
  }, [isEditing]);

  useEffect(() => {
    if (Object.keys(touched).length > 0) setErrors(validate(currentStudent));
  }, [currentStudent, touched, validate]);

  const markTouched = (field) => setTouched(prev => ({ ...prev, [field]: true }));

  const onSubmit = (e) => {
    e.preventDefault();
    const allTouched = { name: true, regNo: true, email: true, phone: true };
    setTouched(allTouched);
    const validationErrors = validate(currentStudent);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    handleSave(e);
  };

  if (!showModal) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)', padding: 16, boxSizing: 'border-box' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onClick={() => setShowModal(false)} />
      
      <div 
        ref={modalRef}
        style={{ position: 'relative', backgroundColor: '#fff', width: '100%', maxWidth: 500, borderRadius: 24, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflow: 'hidden' }}
      >
        <div style={{ padding: '24px 28px', borderBottom: '1px solid #f1f5f9', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', margin: 0 }}>
            {isEditing ? 'Edit Profile' : 'Enroll Student'}
          </h2>
          <div className="flex items-center gap-4">
            <button form="student-form" type="submit" disabled={saving} className="sm:hidden" style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', background: 'rgb(79, 70, 229)', color: 'white', fontWeight: 800, fontSize: '12px', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: 'rgba(79, 70, 229, 0.3) 0px 4px 16px', opacity: saving ? 0.7 : 1 }}>
              {saving && <Loader2 size={12} className="animate-spin" />}
              Save
            </button>
            <button type="button" onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}>
              <X size={20} />
            </button>
          </div>
        </div>

        <form id="student-form" onSubmit={onSubmit} style={{ padding: '24px 28px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, minHeight: 0, WebkitOverflowScrolling: 'touch' }} noValidate>
          
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '16px', padding: '14px 16px', background: 'rgb(248, 250, 252)', borderRadius: '14px', border: '1.5px dashed rgb(199, 210, 254)', width: '100%', boxSizing: 'border-box' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '12px', overflow: 'hidden', flexShrink: 0, background: 'rgb(226, 232, 240)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'rgba(0, 0, 0, 0.1) 0px 2px 8px' }}>
              {currentStudent.photo ? (
                <img src={currentStudent.photo} alt="Student" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : currentStudent.name ? (
                <StudentAvatar gender={currentStudent.gender} size="100%" />
              ) : (
                <Camera size={24} style={{ color: 'rgb(203, 213, 225)' }} />
              )}
            </div>
            <div style={{ flex: '1 1 0%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: 'rgb(100, 116, 139)' }}>
                {uploading ? 'Uploading...' : (currentStudent.photo ? 'Portrait uploaded' : 'No Portrait yet')}
              </p>
              <p style={{ margin: 0, fontSize: '10px', color: 'rgb(148, 163, 184)', fontWeight: 500 }}>Square image · Max 2MB</p>
              <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', background: 'rgb(79, 70, 229)', color: 'rgb(255, 255, 255)', borderRadius: '8px', fontWeight: 700, fontSize: '11px', cursor: uploading ? 'not-allowed' : 'pointer', boxShadow: 'rgba(79, 70, 229, 0.25) 0px 2px 8px', opacity: uploading ? 0.7 : 1, transition: 'transform 0.15s, opacity 0.15s', whiteSpace: 'nowrap' }}>
                  {uploading ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
                  {uploading ? 'Uploading...' : 'Upload'}
                  <input type="file" accept="image/*" onChange={handlePhotoSelect} disabled={uploading} style={{ display: 'none' }} />
                </label>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="space-y-1.5">
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'rgb(100, 116, 139)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Full Name</label>
              <input type="text" placeholder="e.g. Samuel Adebayo" value={currentStudent.name || ''} onChange={(e) => setCurrentStudent({...currentStudent, name: e.target.value})} onBlur={() => markTouched('name')} style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1.5px solid rgb(226, 232, 240)', fontSize: '13px', fontWeight: 500, background: 'rgb(248, 250, 252)', outline: 'none', boxSizing: 'border-box', color: 'rgb(30, 41, 59)' }} />
              {errors.name && touched.name && <FieldError message={errors.name} />}
            </div>
            
            <div className="space-y-1.5">
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'rgb(100, 116, 139)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Reg Number</label>
              <input type="text" readOnly={isEditing} placeholder="BDS/25/001" value={currentStudent.regNo || ''} onChange={(e) => !isEditing && setCurrentStudent({...currentStudent, regNo: e.target.value.toUpperCase()})} onBlur={() => markTouched('regNo')} style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1.5px solid rgb(226, 232, 240)', fontSize: '13px', fontWeight: 500, background: isEditing ? '#f1f5f9' : 'rgb(248, 250, 252)', outline: 'none', boxSizing: 'border-box', color: 'rgb(30, 41, 59)' }} />
              {errors.regNo && touched.regNo && <FieldError message={errors.regNo} />}
            </div>
            
            <div className="space-y-1.5">
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'rgb(100, 116, 139)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Class Section</label>
              <select value={currentStudent.className || ''} onChange={(e) => setCurrentStudent({...currentStudent, className: e.target.value})} style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1.5px solid rgb(226, 232, 240)', fontSize: '13px', fontWeight: 500, background: 'rgb(248, 250, 252)', outline: 'none', boxSizing: 'border-box', color: 'rgb(30, 41, 59)' }}>
                {classes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'rgb(100, 116, 139)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>Gender</label>
              <select value={currentStudent.gender || 'Male'} onChange={(e) => setCurrentStudent({...currentStudent, gender: e.target.value})} style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1.5px solid rgb(226, 232, 240)', fontSize: '13px', fontWeight: 500, background: 'rgb(248, 250, 252)', outline: 'none', boxSizing: 'border-box', color: 'rgb(30, 41, 59)' }}>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'rgb(100, 116, 139)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date of Birth</label>
            <input type="date" value={formatDateForInput(currentStudent.dob)} onChange={(e) => setCurrentStudent({...currentStudent, dob: e.target.value})} style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1.5px solid rgb(226, 232, 240)', fontSize: '13px', fontWeight: 500, background: 'rgb(248, 250, 252)', outline: 'none', boxSizing: 'border-box', color: 'rgb(30, 41, 59)' }} />
          </div>

          <div className="space-y-1.5">
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'rgb(100, 116, 139)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>House / Wing</label>
            <input type="text" placeholder="e.g. Blue House" value={currentStudent.house || ''} onChange={(e) => setCurrentStudent({...currentStudent, house: e.target.value})} style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1.5px solid rgb(226, 232, 240)', fontSize: '13px', fontWeight: 500, background: 'rgb(248, 250, 252)', outline: 'none', boxSizing: 'border-box', color: 'rgb(30, 41, 59)' }} />
          </div>
          
          <div className="space-y-1.5">
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'rgb(100, 116, 139)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Phone Number</label>
            <input type="tel" placeholder="+234 800 000 0000" value={currentStudent.phone || ''} onChange={(e) => setCurrentStudent({...currentStudent, phone: e.target.value})} onBlur={() => markTouched('phone')} style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1.5px solid rgb(226, 232, 240)', fontSize: '13px', fontWeight: 500, background: 'rgb(248, 250, 252)', outline: 'none', boxSizing: 'border-box', color: 'rgb(30, 41, 59)' }} />
            {errors.phone && touched.phone && <FieldError message={errors.phone} />}
          </div>

          <div className="space-y-1.5">
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'rgb(100, 116, 139)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Guardian Email</label>
            <input type="email" placeholder="parent@school.edu" value={currentStudent.email || ''} onChange={(e) => setCurrentStudent({...currentStudent, email: e.target.value})} onBlur={() => markTouched('email')} style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1.5px solid rgb(226, 232, 240)', fontSize: '13px', fontWeight: 500, background: 'rgb(248, 250, 252)', outline: 'none', boxSizing: 'border-box', color: 'rgb(30, 41, 59)' }} />
            {errors.email && touched.email && <FieldError message={errors.email} />}
          </div>

          <div className="hidden sm:flex" style={{ gap: '10px', justifyContent: 'flex-end', paddingTop: '8px', borderTop: '1px solid rgb(241, 245, 249)', margin: '4px 0 0 0', flexShrink: 0 }}>
            <button type="button" onClick={() => setShowModal(false)} style={{ padding: '11px 22px', borderRadius: '12px', border: 'none', background: 'rgb(241, 245, 249)', color: 'rgb(100, 116, 139)', fontWeight: 800, fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ padding: '11px 24px', borderRadius: '12px', border: 'none', background: 'rgb(79, 70, 229)', color: 'white', fontWeight: 900, fontSize: '13px', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: 'rgba(79, 70, 229, 0.3) 0px 4px 16px', opacity: saving ? 0.7 : 1 }}>
              {saving && <Loader2 size={14} className="animate-spin" />}
              {isEditing ? 'Save Profile' : 'Enroll Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentFormModal;