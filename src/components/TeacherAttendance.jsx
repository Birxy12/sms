import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { useAdminAuth } from '../context/AdminAuthContext';
import { Calendar, CheckSquare, Square, Loader2, Save, Users, AlertCircle } from 'lucide-react';

const TeacherAttendance = () => {
  const { currentAdmin } = useAdminAuth();
  const [assignedClasses, setAssignedClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [classStudents, setClassStudents] = useState([]);
  const [attendanceDate, setAttendanceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [presentStudents, setPresentStudents] = useState([]);
  
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchAssignedClasses = async () => {
      if (!currentAdmin?.id) return;
      try {
        const q = query(collection(db, 'classes'), where('formTeacherId', '==', currentAdmin.id));
        const snap = await getDocs(q);
        const classes = snap.docs.map(doc => doc.id);
        setAssignedClasses(classes);
        if (classes.length > 0) {
          setSelectedClass(classes[0]);
        }
      } catch (error) {
        console.error("Error fetching assigned classes:", error);
      } finally {
        setLoadingInitial(false);
      }
    };
    fetchAssignedClasses();
  }, [currentAdmin]);

  useEffect(() => {
    if (!selectedClass) return;
    
    const fetchClassData = async () => {
      setLoadingStudents(true);
      try {
        // 1. Fetch Students
        const studentsQuery = query(collection(db, 'students'), where('className', '==', selectedClass));
        const studentsSnap = await getDocs(studentsQuery);
        const studentsList = studentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        // Sort alphabetically by name
        studentsList.sort((a, b) => a.name.localeCompare(b.name));
        setClassStudents(studentsList);

        // 2. Fetch Attendance for selected Date
        const docRef = doc(db, 'attendance', `${selectedClass}_${attendanceDate}`);
        const attSnap = await getDoc(docRef);
        if (attSnap.exists()) {
          setPresentStudents(attSnap.data().presentStudents || []);
        } else {
          setPresentStudents([]);
        }
      } catch (error) {
        console.error("Error fetching class data:", error);
      } finally {
        setLoadingStudents(false);
      }
    };
    
    fetchClassData();
  }, [selectedClass, attendanceDate]);

  const toggleAttendance = (studentId) => {
    setPresentStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const toggleAllAttendance = () => {
    if (presentStudents.length === classStudents.length) {
      setPresentStudents([]);
    } else {
      setPresentStudents(classStudents.map(s => s.id));
    }
  };

  const saveAttendance = async () => {
    if (!selectedClass) return;
    setSaving(true);
    try {
      const docRef = doc(db, 'attendance', `${selectedClass}_${attendanceDate}`);
      await setDoc(docRef, {
        className: selectedClass,
        date: attendanceDate,
        presentStudents,
        recordedBy: currentAdmin.name,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      alert('Attendance saved successfully!');
    } catch (error) {
      console.error(error);
      alert('Failed to save attendance.');
    } finally {
      setSaving(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  if (assignedClasses.length === 0) {
    return (
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 mb-4">
          <AlertCircle size={32} />
        </div>
        <h3 className="text-xl font-black text-slate-800 mb-2">No Assigned Classes</h3>
        <p className="text-slate-500 max-w-sm">You are not currently assigned as a form teacher to any class. Please contact the administrator if you believe this is an error.</p>
      </div>
    );
  }

  const attendancePercentage = classStudents.length === 0 ? 0 : Math.round((presentStudents.length / classStudents.length) * 100);

  return (
    <div className="space-y-6">
      {/* Enterprise Style Header Card */}
      <div style={{
        background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #2563eb 100%)',
        borderRadius: '24px',
        padding: '32px 36px',
        color: '#fff',
        boxShadow: '0 20px 60px rgba(79,70,229,0.15)'
      }}>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4">
            <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <Users className="text-white" /> Daily Attendance Registry
            </h3>
            
            <div className="flex flex-wrap items-center gap-4">
              {/* Class Selector (if multiple) */}
              {assignedClasses.length > 1 ? (
                <select 
                  value={selectedClass} 
                  onChange={(e) => setSelectedClass(e.target.value)}
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#fff',
                    borderRadius: '12px',
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    outline: 'none'
                  }}
                >
                  {assignedClasses.map(c => <option key={c} value={c} style={{color: '#000'}}>{c}</option>)}
                </select>
              ) : (
                <div style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#fff',
                  borderRadius: '12px',
                  padding: '8px 16px',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}>
                  Class: {selectedClass}
                </div>
              )}

              {/* Date Selector */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '12px',
                padding: '8px 16px'
              }}>
                <Calendar size={16} className="text-white" />
                <input 
                  type="date" 
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: '#fff',
                    cursor: 'pointer'
                  }}
                />
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-3">
            <div className="text-right">
              <p className="text-[10px] font-black text-indigo-100 uppercase tracking-widest mb-1">Present Today</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">{presentStudents.length}</span>
                <span className="text-sm font-bold text-indigo-200">/ {classStudents.length}</span>
              </div>
            </div>
            
            {/* Minimal Progress Bar */}
            <div className="w-48 h-2 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white transition-all duration-700" 
                style={{ width: `${attendancePercentage}%` }} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Enterprise Pro Data Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h4 className="text-sm font-bold text-slate-800">Student Roster</h4>
            <p className="text-xs text-slate-500 font-medium mt-1">Select students to mark them as present.</p>
          </div>
          <button 
            onClick={toggleAllAttendance}
            className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg transition-colors"
          >
            {presentStudents.length === classStudents.length ? 'Mark All Absent' : 'Mark All Present'}
          </button>
        </div>

        {loadingStudents ? (
          <div className="flex justify-center p-20">
            <Loader2 className="animate-spin text-indigo-600" size={32} />
          </div>
        ) : classStudents.length === 0 ? (
          <div className="p-16 text-center text-slate-400 font-medium">
            No students found in {selectedClass}.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[60vh] scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-50">
            <table className="w-full text-left min-w-[600px] border-collapse">
              <thead className="bg-white text-[10px] font-black text-slate-400 uppercase tracking-widest sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-6 py-4 border-b border-slate-200 bg-white">Student Info</th>
                  <th className="px-6 py-4 border-b border-slate-200 bg-white">Gender</th>
                  <th className="px-6 py-4 border-b border-slate-200 bg-white">Status</th>
                  <th className="px-6 py-4 border-b border-slate-200 bg-white text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classStudents.map(student => {
                  const isPresent = presentStudents.includes(student.id);
                  return (
                    <tr 
                      key={student.id} 
                      onClick={() => toggleAttendance(student.id)}
                      className={`group cursor-pointer transition-colors ${isPresent ? 'bg-emerald-50/20 hover:bg-emerald-50/40' : 'hover:bg-slate-50'}`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black overflow-hidden transition-colors ${isPresent ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                            {student.photo ? (
                              <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
                            ) : (
                              student.name[0]
                            )}
                          </div>
                          <div>
                            <p className={`font-black text-sm transition-colors ${isPresent ? 'text-slate-900' : 'text-slate-700'}`}>{student.name}</p>
                            <p className="text-xs font-mono font-bold text-slate-400">{student.regNo}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${student.gender === 'Male' ? 'text-blue-500' : 'text-pink-500'}`}>{student.gender}</span>
                      </td>
                      <td className="px-6 py-4">
                        {isPresent ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700">
                            Present
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 group-hover:bg-slate-200 transition-colors">
                            Absent
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          className={`w-8 h-8 rounded-lg inline-flex items-center justify-center transition-all ${
                            isPresent 
                              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200 scale-105' 
                              : 'bg-white border-2 border-slate-200 text-transparent group-hover:border-indigo-400'
                          }`}
                        >
                          <CheckSquare size={16} className={isPresent ? 'opacity-100' : 'opacity-0'} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Action Footer */}
        {classStudents.length > 0 && !loadingStudents && (
          <div className="p-6 border-t border-slate-100 bg-white flex justify-end">
            <button 
              onClick={saveAttendance}
              disabled={saving}
              className="px-8 py-3.5 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl font-black shadow-lg shadow-slate-200 hover:shadow-indigo-200 transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {saving ? 'Saving Records...' : 'Save Attendance'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherAttendance;
