import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Loader2, Camera, AlertCircle, Check, User, Mail, Phone, Calendar, Hash, Home, GraduationCap, ChevronRight } from 'lucide-react';
import GlobalPhotoUploader from './GlobalPhotoUploader';

// ── Small reusable components ──
const FieldError = ({ message }) => (
  <span className="flex items-center gap-1 mt-1.5 text-[11px] font-semibold text-rose-500 animate-in slide-in-from-top-1">
    <AlertCircle size={12} />
    {message}
  </span>
);

const InputIcon = ({ icon: Icon }) => (
  <Icon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
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
  const firstInputRef = useRef(null);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [shake, setShake] = useState(false);

  // ── Focus trap + ESC to close ──
  useEffect(() => {
    if (!showModal) return;

    // Auto-focus first field
    setTimeout(() => firstInputRef.current?.focus(), 100);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowModal(false);
        return;
      }
      // Focus trap
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [showModal, setShowModal]);

  // ── Validation ──
  const validate = useCallback((data) => {
    const errs = {};
    if (!data.name?.trim()) errs.name = 'Full name is required';
    else if (data.name.trim().length < 2) errs.name = 'Name is too short';
    
    if (!isEditing) {
      if (!data.regNo?.trim()) errs.regNo = 'Registration number is required';
      else if (!/^[^\s]+$/.test(data.regNo)) errs.regNo = 'No spaces allowed';
    }
    
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errs.email = 'Invalid email address';
    }
    
    if (data.phone && !/^[+\d\s()-]{7,}$/.test(data.phone)) {
      errs.phone = 'Invalid phone number';
    }
    
    return errs;
  }, [isEditing]);

  // Live validation on change
  useEffect(() => {
    if (Object.keys(touched).length > 0) {
      setErrors(validate(currentStudent));
    }
  }, [currentStudent, touched, validate]);

  const markTouched = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const onSubmit = (e) => {
    e.preventDefault();
    const allTouched = {
      name: true,
      regNo: true,
      email: true,
      phone: true,
      className: true
    };
    setTouched(allTouched);
    const validationErrors = validate(currentStudent);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    handleSave(e);
  };

  if (!showModal) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop with click-to-close */}
      <div 
        className="absolute inset-0 bg-slate-950/30 backdrop-blur-sm transition-opacity animate-in fade-in duration-300"
        onClick={() => setShowModal(false)}
      />

      {/* Modal Panel */}
      <div 
        ref={modalRef}
        className={`
          relative bg-white w-full max-w-lg h-full shadow-2xl 
          rounded-l-3xl flex flex-col overflow-hidden
          animate-in slide-in-from-right duration-500 ease-out
          ${shake ? 'animate-in zoom-in-95 duration-100' : ''}
        `}
      >
        {/* ═══════ Header ═══════ */}
        <header className="relative bg-white px-8 pt-8 pb-6 border-b border-slate-100">
          {/* Close button — absolute top-right */}
          <button 
            onClick={() => setShowModal(false)}
            className="absolute top-6 right-6 p-2 rounded-xl hover:bg-slate-100 transition-all text-slate-400 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-200"
            aria-label="Close modal"
          >
            <X size={18} strokeWidth={2} />
          </button>

          <div className="pr-12">
            {/* Breadcrumb label */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Students</span>
              <ChevronRight size={12} className="text-slate-300" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                {isEditing ? 'Edit Record' : 'New Enrollment'}
              </span>
            </div>

            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              {isEditing ? 'Edit Student' : 'Enroll Student'}
            </h2>
            <p className="text-sm text-slate-500 mt-1.5">
              {isEditing 
                ? 'Update student information below. All fields marked with * are required.' 
                : 'Complete the form to register a new student.'}
            </p>
          </div>

          {/* Optional: Stepper progress */}
          <div className="flex items-center gap-3 mt-5">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center">
                <Check size={10} strokeWidth={3} className="text-white" />
              </div>
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Identity</span>
            </div>
            <div className="flex-1 h-px bg-slate-200" />
            <div className="flex items-center gap-1.5 opacity-40">
              <div className="w-6 h-6 rounded-full border-2 border-slate-300 flex items-center justify-center text-[10px] font-bold text-slate-400">
                2
              </div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Contact</span>
            </div>
          </div>
        </header>

        {/* ═══════ Body ═══════ */}
        <div className="flex-1 overflow-y-auto bg-slate-50/50">
          <form id="student-form" onSubmit={onSubmit} className="p-6 space-y-6" noValidate>
            
            {/* ── Photo Upload ── */}
            <section className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Camera size={14} className="text-slate-400" />
                <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                  Student Photo
                </h3>
              </div>
              <GlobalPhotoUploader
                photoUrl={currentStudent.photo}
                uploading={uploading}
                onPhotoSelect={handlePhotoSelect}
                label="Upload Photo"
                recommendedText="Square JPG/PNG · Max 2MB"
              />
            </section>

            {/* ── Identity ── */}
            <section className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <User size={14} className="text-slate-400" />
                <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                  Identity Information
                </h3>
              </div>

              {/* Full Name */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    ref={firstInputRef}
                    type="text"
                    value={currentStudent.name || ''}
                    onChange={(e) => setCurrentStudent({...currentStudent, name: e.target.value})}
                    onBlur={() => markTouched('name')}
                    placeholder="e.g. John Doe"
                    aria-invalid={!!errors.name}
                    aria-describedby={errors.name ? 'name-error' : undefined}
                    className={`
                      w-full pl-10 pr-4 py-3 rounded-xl border text-sm font-semibold outline-none transition-all
                      ${errors.name && touched.name
                        ? 'bg-rose-50 border-rose-300 text-rose-900 focus:border-rose-500 focus:ring-4 focus:ring-rose-100 placeholder:text-rose-300'
                        : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 focus:bg-white placeholder:text-slate-300'
                      }
                    `}
                  />
                  <InputIcon icon={User} />
                </div>
                {errors.name && touched.name && <FieldError message={errors.name} />}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Reg Number */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">
                    Reg Number {!isEditing && <span className="text-rose-500">*</span>}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      readOnly={isEditing}
                      value={currentStudent.regNo || ''}
                      onChange={(e) => !isEditing && setCurrentStudent({...currentStudent, regNo: e.target.value.toUpperCase()})}
                      onBlur={() => markTouched('regNo')}
                      placeholder="BDS/25/001"
                      aria-invalid={!!errors.regNo}
                      aria-describedby={errors.regNo ? 'regno-error' : undefined}
                      className={`
                        w-full pl-10 pr-4 py-3 rounded-xl border text-sm font-semibold outline-none transition-all uppercase
                        ${isEditing 
                          ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' 
                          : errors.regNo && touched.regNo
                            ? 'bg-rose-50 border-rose-300 text-rose-900 focus:border-rose-500 focus:ring-4 focus:ring-rose-100'
                            : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 focus:bg-white'
                        }
                      `}
                    />
                    <InputIcon icon={Hash} />
                  </div>
                  {errors.regNo && touched.regNo && <FieldError message={errors.regNo} />}
                </div>

                {/* Class */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">
                    {isEditing ? 'Change Class' : 'Assigned Class'}
                  </label>
                  <div className="relative">
                    <select
                      value={currentStudent.className || ''}
                      onChange={(e) => setCurrentStudent({...currentStudent, className: e.target.value})}
                      className="w-full pl-10 pr-8 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 focus:bg-white outline-none transition-all text-sm font-semibold text-slate-800 cursor-pointer appearance-none"
                    >
                      {classes.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <GraduationCap size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Gender */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">
                    Gender
                  </label>
                  <div className="relative">
                    <select
                      value={currentStudent.gender || 'Male'}
                      onChange={(e) => setCurrentStudent({...currentStudent, gender: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 focus:bg-white outline-none transition-all text-sm font-semibold text-slate-800 cursor-pointer appearance-none"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                </div>

                {/* House */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">
                    House / Wing
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={currentStudent.house || ''}
                      onChange={(e) => setCurrentStudent({...currentStudent, house: e.target.value})}
                      placeholder="e.g. Blue House"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 focus:bg-white outline-none transition-all text-sm font-semibold text-slate-800 placeholder:text-slate-300"
                    />
                    <InputIcon icon={Home} />
                  </div>
                </div>
              </div>
            </section>

            {/* ── Contact ── */}
            <section className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <Mail size={14} className="text-slate-400" />
                <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                  Contact & Personal
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Phone */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">
                    Phone Number
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={currentStudent.phone || ''}
                      onChange={(e) => setCurrentStudent({...currentStudent, phone: e.target.value})}
                      onBlur={() => markTouched('phone')}
                      placeholder="+234 800 000 0000"
                      aria-invalid={!!errors.phone}
                      aria-describedby={errors.phone ? 'phone-error' : undefined}
                      className={`
                        w-full pl-10 pr-4 py-3 rounded-xl border text-sm font-semibold outline-none transition-all
                        ${errors.phone && touched.phone
                          ? 'bg-rose-50 border-rose-300 text-rose-900 focus:border-rose-500 focus:ring-4 focus:ring-rose-100 placeholder:text-rose-300'
                          : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 focus:bg-white placeholder:text-slate-300'
                        }
                      `}
                    />
                    <InputIcon icon={Phone} />
                  </div>
                  {errors.phone && touched.phone && <FieldError message={errors.phone} />}
                </div>

                {/* DOB */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">
                    Date of Birth
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={formatDateForInput(currentStudent.dob)}
                      onChange={(e) => setCurrentStudent({...currentStudent, dob: e.target.value})}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 focus:bg-white outline-none transition-all text-sm font-semibold text-slate-800"
                    />
                    <InputIcon icon={Calendar} />
                  </div>
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">
                  Guardian Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={currentStudent.email || ''}
                    onChange={(e) => setCurrentStudent({...currentStudent, email: e.target.value})}
                    onBlur={() => markTouched('email')}
                    placeholder="parent@school.edu"
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? 'email-error' : undefined}
                    className={`
                      w-full pl-10 pr-4 py-3 rounded-xl border text-sm font-semibold outline-none transition-all
                      ${errors.email && touched.email
                        ? 'bg-rose-50 border-rose-300 text-rose-900 focus:border-rose-500 focus:ring-4 focus:ring-rose-100 placeholder:text-rose-300'
                        : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 focus:bg-white placeholder:text-slate-300'
                      }
                    `}
                  />
                  <InputIcon icon={Mail} />
                </div>
                {errors.email && touched.email && <FieldError message={errors.email} />}
              </div>
            </section>

            {/* Validation summary for screen readers */}
            {Object.keys(errors).length > 0 && Object.keys(touched).length > 0 && (
              <div className="sr-only" role="alert">
                Form contains errors. Please review the fields above.
              </div>
            )}
          </form>
        </div>

        {/* ═══════ Footer ═══════ */}
        <footer className="px-6 py-5 border-t border-slate-100 bg-white flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setShowModal(false)}
            className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 active:bg-slate-300 transition-all text-sm active:scale-[0.98]"
          >
            Cancel
          </button>
          <button
            form="student-form"
            type="submit"
            disabled={saving}
            className="flex-[2] py-3 px-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 active:bg-indigo-800 shadow-lg shadow-indigo-200 transition-all text-sm active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Saving…</span>
              </>
            ) : (
              <>
                <Check size={16} />
                <span>{isEditing ? 'Save Changes' : 'Enroll Student'}</span>
              </>
            )}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default StudentFormModal;