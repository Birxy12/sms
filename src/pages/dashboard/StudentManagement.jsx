import React, { useState, useEffect } from 'react';
import { db, storage } from '../../lib/firebase';
import { ensureFirebaseAuth } from '../../lib/ensureAuth';
import { collection, query, getDocs, addDoc, doc, updateDoc, deleteDoc, orderBy, where, setDoc } from 'firebase/firestore';
import { uploadAvatar } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Users, UserPlus, GraduationCap, Mail, Search, Trash2, Edit2, CheckCircle, AlertCircle, Loader2, X, Filter, BookOpen, Camera, Upload, Award, ArrowUpDown, History, ClipboardList } from 'lucide-react';
import { getSubjectsForClass } from '../../utils/subjectConfig';
import ImageCropperModal from '../../components/ImageCropperModal';

const StudentManagement = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentStudent, setCurrentStudent] = useState({ 
    name: '', regNo: '', className: 'JSS1', gender: 'Male', email: '', 
    phone: '', dob: '', house: '', photo: ''
  });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [allowProfileEdit, setAllowProfileEdit] = useState(true);
  // Promote/Demote state
  const [promoteModal, setPromoteModal] = useState(null); // { student }
  const [newClass, setNewClass] = useState('');
  const [promoting, setPromoting] = useState(false);

  // Admin Subject Registration state
  const [subjectRegModal, setSubjectRegModal] = useState(null); // { student }
  const [adminSelectedSubjects, setAdminSelectedSubjects] = useState([]);
  const [savingSubjects, setSavingSubjects] = useState(false);

  const openSubjectRegModal = (student) => {
    setSubjectRegModal({ student });
    const available = getSubjectsForClass(student.className);
    setAdminSelectedSubjects(student.registeredSubjects || []);
  };

  const toggleAdminSubject = (subject) => {
    setAdminSelectedSubjects(prev =>
      prev.includes(subject)
        ? prev.filter(s => s !== subject)
        : prev.length >= 9
          ? prev // max 9
          : [...prev, subject]
    );
  };

  const saveAdminSubjects = async () => {
    if (adminSelectedSubjects.length !== 9) return;
    setSavingSubjects(true);
    try {
      await updateDoc(doc(db, 'students', subjectRegModal.student.id), {
        registeredSubjects: adminSelectedSubjects,
        updatedAt: new Date().toISOString()
      });
      setStatus({ type: 'success', message: `Subjects saved for ${subjectRegModal.student.name}.` });
      setSubjectRegModal(null);
      fetchStudents();
    } catch (err) {
      setStatus({ type: 'error', message: 'Failed to save subjects.' });
    } finally {
      setSavingSubjects(false);
    }
  };

  const classes = ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2 ART', 'SS2 SCIENCE', 'SS3 ART', 'SS3 SCIENCE'];

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'students'), orderBy('regNo', 'asc'));
      const querySnapshot = await getDocs(q);
      const studentList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStudents(studentList);
    } catch (error) {
      console.error('Error fetching students:', error);
      setStatus({ type: 'error', message: 'Failed to load students.' });
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const docSnap = await getDocs(query(collection(db, 'settings'), where('__name__', '==', 'student_permissions')));
      if (!docSnap.empty) {
        setAllowProfileEdit(docSnap.docs[0].data().allowProfileEdit ?? true);
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
    }
  };

  const toggleProfileEdit = async () => {
    const newValue = !allowProfileEdit;
    setAllowProfileEdit(newValue);
    try {
      await ensureFirebaseAuth(); // Guarantee auth before Firestore write
      await setDoc(doc(db, 'settings', 'student_permissions'), {
        allowProfileEdit: newValue,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      setStatus({ type: 'success', message: `Profile editing ${newValue ? 'enabled' : 'disabled'} for students.` });
    } catch (error) {
      console.error('Error updating permissions:', error);
      setAllowProfileEdit(!newValue);
      setStatus({ type: 'error', message: 'Failed to update permissions.' });
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchPermissions();
  }, []);

  // Auto-generate RegNo when enrolling a new student and class changes
  useEffect(() => {
    if (showModal && !isEditing) {
      const cls = currentStudent.className;
      const classStudentsCount = students.filter(s => s.className === cls).length;
      const nextNum = classStudentsCount + 1;
      const year = new Date().getFullYear().toString().slice(-2);
      const shortClass = cls.replace(/\s+/g, '');
      const generatedRegNo = `BDS/${year}/${shortClass}/${String(nextNum).padStart(3, '0')}`;
      
      setCurrentStudent(prev => ({ ...prev, regNo: generatedRegNo }));
    }
  }, [currentStudent.className, showModal, isEditing, students]);

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
      setStatus({ type: 'error', message: 'Image size must be less than 2MB' });
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

    setUploading(true);
    try {
      const file = new File([croppedBlob], `avatar_${Date.now()}.jpg`, { type: 'image/jpeg' });
      const url = await uploadAvatar(file, currentStudent.regNo || 'new-student');
      setCurrentStudent(prev => ({ ...prev, photo: url }));
      setStatus({ type: 'success', message: 'Passport uploaded to Supabase successfully!' });
    } catch (error) {
      console.error("Upload error:", error);
      setStatus({ type: 'error', message: 'Upload failed. Ensure the "avatars" bucket exists and is public in Supabase.' });
    } finally {
      setStatus(prev => prev.type === 'error' ? prev : { type: 'success', message: 'Passport uploaded successfully!' });
      setUploading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { id, ...saveData } = currentStudent;
      if (isEditing) {
        await updateDoc(doc(db, 'students', id), saveData);
        setStatus({ type: 'success', message: 'Student updated successfully!' });
      } else {
        await addDoc(collection(db, 'students'), {
          ...saveData,
          createdAt: new Date().toISOString()
        });
        setStatus({ type: 'success', message: 'Student registered successfully!' });
      }
      setShowModal(false);
      fetchStudents();
    } catch (error) {
      console.error('Save error:', error);
      setStatus({ type: 'error', message: 'Error saving student record.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this record?')) return;
    try {
      await deleteDoc(doc(db, 'students', id));
      fetchStudents();
      setStatus({ type: 'success', message: 'Student deleted.' });
    } catch (error) {
      setStatus({ type: 'error', message: 'Error deleting record.' });
    }
  };

  const handlePromote = async () => {
    if (!newClass || newClass === promoteModal.student.className) {
      setStatus({ type: 'error', message: 'Please select a different class.' });
      return;
    }
    setPromoting(true);
    const student = promoteModal.student;
    const oldClass = student.className;
    const historyEntry = {
      from: oldClass,
      to: newClass,
      date: new Date().toISOString(),
      changedBy: 'Admin'
    };
    const updatedHistory = [...(student.classHistory || []), historyEntry];
    try {
      await updateDoc(doc(db, 'students', student.id), {
        className: newClass,
        classHistory: updatedHistory,
        updatedAt: new Date().toISOString()
      });
      setStatus({ type: 'success', message: `${student.name} moved from ${oldClass} to ${newClass}. Reg No preserved.` });
      setPromoteModal(null);
      fetchStudents();
    } catch (error) {
      console.error('Promote error:', error);
      setStatus({ type: 'error', message: 'Failed to update student class.' });
    } finally {
      setPromoting(false);
    }
  };

  const filteredStudents = students.filter(s => 
    (s.name?.toLowerCase().includes(searchTerm.toLowerCase()) || s.regNo?.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (selectedClass === 'All' || s.className === selectedClass)
  );

  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Student Records</h2>
          <p className="text-slate-500">Manage enrollment, class assignments, and individual student profiles.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="bg-white border border-slate-200 px-6 py-3 rounded-xl flex items-center gap-4 shadow-sm hover:border-indigo-200 transition-colors group">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1 group-hover:text-indigo-600">Portal Governance</span>
              <span className="text-sm font-bold text-slate-700">Self-Service Profile Edit</span>
              <span className="text-[9px] font-medium text-slate-400 mt-1 italic">Restricted to identity & contact fields</span>
            </div>
            <button 
              onClick={toggleProfileEdit}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all focus:outline-none ${allowProfileEdit ? 'bg-indigo-600 ring-4 ring-indigo-50' : 'bg-slate-200'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${allowProfileEdit ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          <button 
            onClick={() => { 
              setIsEditing(false); 
              setCurrentStudent({ 
                name: '', regNo: '', className: 'JSS1', gender: 'Male', email: '',
                phone: '', dob: '', house: '', photo: ''
              }); 
              setShowModal(true); 
            }}
            className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95"
          >
            <UserPlus size={20} />
            Enroll New Student
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Find by name or registration number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <select 
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold appearance-none"
          >
            <option value="All">All Classes</option>
            {classes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto text-left">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[11px] font-black uppercase tracking-widest border-b border-slate-100">
                <th className="px-8 py-5">Full Name</th>
                <th className="px-6 py-5">Reg Number</th>
                <th className="px-6 py-5">Current Class</th>
                <th className="px-6 py-5">Gender</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="5" className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-indigo-600" /></td></tr>
              ) : filteredStudents.length > 0 ? filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-indigo-50/30 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black overflow-hidden">
                        {student.photo ? (
                          <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
                        ) : (
                          student.name[0]
                        )}
                      </div>
                      <p className="font-bold text-slate-900">{student.name}</p>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-xs font-mono font-bold text-slate-600">{student.regNo}</span>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full uppercase">{student.className}</span>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${student.gender === 'Male' ? 'text-blue-500' : 'text-pink-500'}`}>{student.gender}</span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => navigate(`/admin/student-results?regNo=${encodeURIComponent(student.regNo)}&className=${encodeURIComponent(student.className)}&name=${encodeURIComponent(student.name)}`)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg" title="View Results"><Award size={16} /></button>
                      <button onClick={() => { setPromoteModal({ student }); setNewClass(student.className); }} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-white rounded-lg" title="Promote / Demote"><ArrowUpDown size={16} /></button>
                      {(student.className?.startsWith('SS2') || student.className?.startsWith('SS3')) && (
                        <button onClick={() => openSubjectRegModal(student)} className="p-2 text-slate-400 hover:text-pink-600 hover:bg-white rounded-lg" title="Subject Registration"><ClipboardList size={16} /></button>
                      )}
                      <button onClick={() => { setIsEditing(true); setCurrentStudent(student); setShowModal(true); }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg" title="Edit Student"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(student.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg" title="Delete Student"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="5" className="py-20 text-center text-slate-400 font-medium">No students found matching filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Promote / Demote Modal */}
      {promoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black">Promote / Demote Student</h3>
                <p className="text-emerald-100 text-xs mt-1">Registration number will be preserved</p>
              </div>
              <button onClick={() => setPromoteModal(null)} className="hover:opacity-50 transition-opacity"><X size={24} /></button>
            </div>
            <div className="p-8 space-y-6">
              {/* Student Info */}
              <div className="flex items-center gap-4 bg-slate-50 rounded-2xl p-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-lg overflow-hidden">
                  {promoteModal.student.photo ? <img src={promoteModal.student.photo} alt="" className="w-full h-full object-cover" /> : promoteModal.student.name[0]}
                </div>
                <div className="text-left">
                  <p className="font-black text-slate-900">{promoteModal.student.name}</p>
                  <p className="text-xs font-mono text-slate-500">{promoteModal.student.regNo}</p>
                </div>
              </div>

              {/* Class change */}
              <div className="grid grid-cols-2 gap-4 items-center">
                <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 text-center">
                  <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Current Class</p>
                  <p className="text-lg font-black text-rose-700">{promoteModal.student.className}</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-center">
                  <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">New Class</p>
                  <select
                    value={newClass}
                    onChange={(e) => setNewClass(e.target.value)}
                    className="w-full text-center font-black text-emerald-700 bg-transparent outline-none text-sm border-b-2 border-emerald-300 focus:border-emerald-600 transition-colors"
                  >
                    {classes.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* History */}
              {promoteModal.student.classHistory?.length > 0 && (
                <div className="text-left">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1"><History size={12} /> Transfer History</p>
                  <div className="space-y-1 max-h-28 overflow-y-auto">
                    {[...promoteModal.student.classHistory].reverse().map((h, i) => (
                      <div key={i} className="flex items-center justify-between text-xs px-3 py-1.5 bg-slate-50 rounded-lg">
                        <span className="font-bold text-slate-600">{h.from} → {h.to}</span>
                        <span className="text-slate-400">{new Date(h.date).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={handlePromote}
                disabled={promoting || newClass === promoteModal.student.className}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 transition-all active:scale-95 disabled:opacity-50"
              >
                {promoting ? <Loader2 size={18} className="animate-spin" /> : <ArrowUpDown size={18} />}
                {promoting ? 'Moving Student...' : 'Confirm Transfer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Subject Registration Modal */}
      {subjectRegModal && (() => {
        const availableSubjects = getSubjectsForClass(subjectRegModal.student.className);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-pink-600 to-rose-700 text-white flex justify-between items-center flex-shrink-0">
                <div>
                  <h3 className="text-xl font-black">Subject Registration</h3>
                  <p className="text-pink-100 text-xs mt-1">{subjectRegModal.student.name} — {subjectRegModal.student.className}</p>
                </div>
                <button onClick={() => setSubjectRegModal(null)} className="hover:opacity-50 transition-opacity"><X size={24} /></button>
              </div>

              {/* Subjects Grid */}
              <div className="p-6 overflow-y-auto flex-1">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-bold text-slate-600">Select exactly 9 subjects</p>
                  <span className={`text-sm font-black px-3 py-1 rounded-full ${
                    adminSelectedSubjects.length === 9 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}>{adminSelectedSubjects.length} / 9</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {availableSubjects.map((subject, idx) => {
                    const isSelected = adminSelectedSubjects.includes(subject);
                    const isDisabled = !isSelected && adminSelectedSubjects.length >= 9;
                    return (
                      <div
                        key={idx}
                        onClick={() => !isDisabled && toggleAdminSubject(subject)}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-pink-500 bg-pink-50'
                            : isDisabled
                              ? 'border-slate-100 bg-slate-50 opacity-40 cursor-not-allowed'
                              : 'border-slate-200 hover:border-pink-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center transition-colors ${
                          isSelected ? 'bg-pink-600 text-white' : 'bg-slate-200'
                        }`}>
                          {isSelected && <CheckCircle size={12} />}
                        </div>
                        <span className={`text-xs font-bold leading-tight ${
                          isSelected ? 'text-pink-900' : 'text-slate-700'
                        }`}>{subject}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between flex-shrink-0">
                <p className="text-xs text-slate-400 font-medium">
                  {subjectRegModal.student.registeredSubjects?.length > 0
                    ? `Previously: ${subjectRegModal.student.registeredSubjects.length} subjects registered`
                    : 'No subjects registered yet'}
                </p>
                <div className="flex gap-3">
                  <button onClick={() => setSubjectRegModal(null)} className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-black hover:bg-slate-200 transition-all">Cancel</button>
                  <button
                    onClick={saveAdminSubjects}
                    disabled={savingSubjects || adminSelectedSubjects.length !== 9}
                    className="px-6 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-black flex items-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-pink-100 active:scale-95"
                  >
                    {savingSubjects ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                    {savingSubjects ? 'Saving...' : 'Save Registration'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-100 bg-indigo-600 text-white flex justify-between items-center shrink-0">
              <h3 className="text-2xl font-black">{isEditing ? 'Edit Student' : 'Student Enrollment'}</h3>
              <button onClick={() => setShowModal(false)} className="hover:opacity-50 transition-opacity"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-8 space-y-6 text-left overflow-y-auto flex-1 custom-scrollbar">
              <div className="flex justify-center mb-6">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden group-hover:border-indigo-400 transition-all">
                    {uploading ? (
                      <Loader2 className="animate-spin text-indigo-600" />
                    ) : currentStudent.photo ? (
                      <img src={currentStudent.photo} alt="Passport" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="text-slate-400" size={32} />
                    )}
                  </div>
                  <label className="absolute -bottom-2 -right-2 bg-indigo-600 text-white p-2 rounded-xl cursor-pointer shadow-lg hover:bg-indigo-700 transition-all">
                    <Upload size={16} />
                    <input type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
                  </label>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Full Name</label>
                  <input 
                    type="text" required 
                    value={currentStudent.name}
                    onChange={(e) => setCurrentStudent({...currentStudent, name: e.target.value})}
                    placeholder="Enter student's full name"
                    className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white outline-none transition-all font-bold"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Reg Number</label>
                    <input 
                      type="text" required 
                      readOnly={isEditing}
                      value={currentStudent.regNo}
                      onChange={(e) => !isEditing && setCurrentStudent({...currentStudent, regNo: e.target.value.toUpperCase()})}
                      placeholder="e.g. BDS/25/001"
                      className={`w-full px-5 py-3.5 rounded-2xl border-2 border-transparent outline-none transition-all font-bold ${isEditing ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-slate-50 focus:border-indigo-600 focus:bg-white'}`}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">{isEditing ? 'Change Class (Promote/Demote)' : 'Assigned Class'}</label>
                    <select 
                      value={currentStudent.className}
                      onChange={(e) => setCurrentStudent({...currentStudent, className: e.target.value})}
                      className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white outline-none transition-all font-bold"
                    >
                      {classes.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Gender</label>
                    <select 
                      value={currentStudent.gender}
                      onChange={(e) => setCurrentStudent({...currentStudent, gender: e.target.value})}
                      className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white outline-none transition-all font-bold"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">House / Wing</label>
                    <input 
                      type="text" 
                      value={currentStudent.house || ''}
                      onChange={(e) => setCurrentStudent({...currentStudent, house: e.target.value})}
                      placeholder="e.g. Blue House"
                      className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white outline-none transition-all font-bold"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Phone Number</label>
                    <input 
                      type="tel" 
                      value={currentStudent.phone || ''}
                      onChange={(e) => setCurrentStudent({...currentStudent, phone: e.target.value})}
                      placeholder="+234..."
                      className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white outline-none transition-all font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Date of Birth</label>
                    <input 
                      type="date" 
                      value={currentStudent.dob && currentStudent.dob.includes('/') 
                        ? currentStudent.dob.split('/').reverse().join('-') 
                        : (currentStudent.dob || '')}
                      onChange={(e) => setCurrentStudent({...currentStudent, dob: e.target.value})}
                      className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white outline-none transition-all font-bold"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Guardian Email</label>
                  <input 
                    type="email" 
                    value={currentStudent.email}
                    onChange={(e) => setCurrentStudent({...currentStudent, email: e.target.value})}
                    placeholder="parent@email.com"
                    className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white outline-none transition-all font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-slate-100 text-slate-600 px-6 py-4 rounded-2xl font-black hover:bg-slate-200 transition-all">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-indigo-600 text-white px-6 py-4 rounded-2xl font-black hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all disabled:opacity-50">
                  {saving ? <Loader2 size={24} className="animate-spin mx-auto" /> : isEditing ? 'Save Changes' : 'Enroll Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {status.message && (
        <div className={`fixed bottom-8 right-8 p-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-8 ${
          status.type === 'success' ? 'bg-indigo-600' : 'bg-rose-600'
        } text-white`}>
          <CheckCircle size={20} />
          <span className="font-bold tracking-tight">{status.message}</span>
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

export default StudentManagement;
