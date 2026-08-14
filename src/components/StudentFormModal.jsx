import React from 'react';
import { X, Loader2 } from 'lucide-react';
import GlobalPhotoUploader from './GlobalPhotoUploader';

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
  if (!showModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">

        {/* ── Header ── */}
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-8 py-6 shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-400 mb-1">
                {isEditing ? 'Edit Record' : 'New Enrollment'}
              </p>
              <h3 className="text-xl font-black text-white">{isEditing ? 'Edit Student' : 'Student Enrollment'}</h3>
              <p className="text-xs text-slate-400 mt-1">Fill in the details below and save</p>
            </div>
            <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-white/10 transition-colors text-slate-400 hover:text-white">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto flex-1 custom-scrollbar bg-slate-50" style={{ minHeight: 0 }}>
          <form id="student-form" onSubmit={handleSave} className="p-5 space-y-4 text-left">

            {/* Photo Upload */}
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Student Photo</p>
              <GlobalPhotoUploader
                photoUrl={currentStudent.photo}
                uploading={uploading}
                onPhotoSelect={handlePhotoSelect}
                label="Student Photo"
                recommendedText="Square image · Max 2MB"
              />
            </div>

            {/* Identity Section */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pb-3 border-b border-slate-100">Identity</p>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Full Name *</label>
                <input
                  type="text" required
                  value={currentStudent.name || ''}
                  onChange={(e) => setCurrentStudent({...currentStudent, name: e.target.value})}
                  placeholder="Enter student's full name"
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 focus:bg-white outline-none transition-all text-sm font-semibold text-slate-800 placeholder:text-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Reg Number *</label>
                  <input
                    type="text" required
                    readOnly={isEditing}
                    value={currentStudent.regNo || ''}
                    onChange={(e) => !isEditing && setCurrentStudent({...currentStudent, regNo: e.target.value.toUpperCase()})}
                    placeholder="e.g. BDS/25/001"
                    className={`w-full px-4 py-3 rounded-xl border outline-none transition-all text-sm font-semibold ${isEditing ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-50 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 focus:bg-white text-slate-800'}`}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">
                    {isEditing ? 'Change Class' : 'Assigned Class'}
                  </label>
                  <select
                    value={currentStudent.className || ''}
                    onChange={(e) => setCurrentStudent({...currentStudent, className: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 focus:bg-white outline-none transition-all text-sm font-semibold text-slate-800 cursor-pointer"
                  >
                    {classes.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Gender</label>
                  <select
                    value={currentStudent.gender || 'Male'}
                    onChange={(e) => setCurrentStudent({...currentStudent, gender: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 focus:bg-white outline-none transition-all text-sm font-semibold text-slate-800 cursor-pointer"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">House / Wing</label>
                  <input
                    type="text"
                    value={currentStudent.house || ''}
                    onChange={(e) => setCurrentStudent({...currentStudent, house: e.target.value})}
                    placeholder="e.g. Blue House"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 focus:bg-white outline-none transition-all text-sm font-semibold text-slate-800 placeholder:text-slate-300"
                  />
                </div>
              </div>
            </div>

            {/* Contact Section */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pb-3 border-b border-slate-100">Contact & Personal</p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Phone Number</label>
                  <input
                    type="tel"
                    value={currentStudent.phone || ''}
                    onChange={(e) => setCurrentStudent({...currentStudent, phone: e.target.value})}
                    placeholder="+234..."
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 focus:bg-white outline-none transition-all text-sm font-semibold text-slate-800 placeholder:text-slate-300"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Date of Birth</label>
                  <input
                    type="date"
                    value={formatDateForInput(currentStudent.dob)}
                    onChange={(e) => setCurrentStudent({...currentStudent, dob: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 focus:bg-white outline-none transition-all text-sm font-semibold text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Guardian Email</label>
                <input
                  type="email"
                  value={currentStudent.email || ''}
                  onChange={(e) => setCurrentStudent({...currentStudent, email: e.target.value})}
                  placeholder="parent@email.com"
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 focus:bg-white outline-none transition-all text-sm font-semibold text-slate-800 placeholder:text-slate-300"
                />
              </div>
            </div>

          </form>
        </div>

        {/* ── Pinned Footer ── */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setShowModal(false)}
            className="flex-1 py-3.5 bg-slate-100 text-slate-600 rounded-2xl font-black hover:bg-slate-200 transition-all text-sm active:scale-95"
          >
            Cancel
          </button>
          <button
            form="student-form"
            type="submit"
            disabled={saving}
            className="flex-[2] py-3.5 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all text-sm active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : null}
            {saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Enroll Student'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default StudentFormModal;
