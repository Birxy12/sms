import React, { useState, useEffect } from 'react';
import { db, storage } from '../../lib/firebase';
import { collection, query, getDocs, addDoc, doc, updateDoc, deleteDoc, orderBy, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useNavigate } from 'react-router-dom';
import { Users, UserPlus, GraduationCap, Mail, Search, Trash2, Edit2, CheckCircle, AlertCircle, Loader2, X, Filter, BookOpen, Camera, Upload, Award } from 'lucide-react';

const StudentManagement = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentStudent, setCurrentStudent] = useState({ name: '', regNo: '', className: 'JSS1', gender: 'Male', email: '' });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

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

  useEffect(() => {
    fetchStudents();
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

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
      setStatus({ type: 'error', message: 'Image size must be less than 2MB' });
      return;
    }

    setUploading(true);
    try {
      const storageRef = ref(storage, `students/passports/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setCurrentStudent(prev => ({ ...prev, photo: url }));
      setStatus({ type: 'success', message: 'Passport uploaded successfully!' });
    } catch (error) {
      console.error("Upload error:", error);
      setStatus({ type: 'error', message: 'Failed to upload passport.' });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEditing) {
        await updateDoc(doc(db, 'students', currentStudent.id), currentStudent);
        setStatus({ type: 'success', message: 'Student updated successfully!' });
      } else {
        await addDoc(collection(db, 'students'), {
          ...currentStudent,
          createdAt: new Date().toISOString()
        });
        setStatus({ type: 'success', message: 'Student registered successfully!' });
      }
      setShowModal(false);
      fetchStudents();
    } catch (error) {
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
        <button 
          onClick={() => { setIsEditing(false); setCurrentStudent({ name: '', regNo: '', className: 'JSS1', gender: 'Male', email: '' }); setShowModal(true); }}
          className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95"
        >
          <UserPlus size={20} />
          Enroll New Student
        </button>
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 bg-indigo-600 text-white flex justify-between items-center">
              <h3 className="text-2xl font-black">{isEditing ? 'Edit Student' : 'Student Enrollment'}</h3>
              <button onClick={() => setShowModal(false)} className="hover:opacity-50 transition-opacity"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-8 space-y-6 text-left">
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
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
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
                      value={currentStudent.regNo}
                      onChange={(e) => setCurrentStudent({...currentStudent, regNo: e.target.value.toUpperCase()})}
                      placeholder="e.g. BDS/25/001"
                      className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white outline-none transition-all font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Assigned Class</label>
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
    </div>
  );
};

export default StudentManagement;
