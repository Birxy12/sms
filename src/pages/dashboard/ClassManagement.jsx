import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, getDocs, where, doc, setDoc, getDoc } from 'firebase/firestore';
import { Layers, Users, BookOpen, ChevronRight, GraduationCap, ArrowUpRight, TrendingUp, Info, UserCheck, X, Calendar, CheckSquare, Square } from 'lucide-react';

const ClassManagement = () => {
  const [classStats, setClassStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState([]);
  const [savingTeacher, setSavingTeacher] = useState('');

  // Modal State
  const [selectedClass, setSelectedClass] = useState(null);
  const [classStudents, setClassStudents] = useState([]);
  const [attendanceDate, setAttendanceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [presentStudents, setPresentStudents] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceSaving, setAttendanceSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('attendance');
  const [performanceData, setPerformanceData] = useState({ maleAvg: 0, femaleAvg: 0, overallAvg: 0 });
  const [performanceLoading, setPerformanceLoading] = useState(false);

  const classes = ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2 ART', 'SS2 SCIENCE', 'SS3 ART', 'SS3 SCIENCE'];

  const fetchClassStats = async () => {
    setLoading(true);
    try {
      const staffSnap = await getDocs(collection(db, 'staff'));
      const staffList = staffSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setStaff(staffList);

      const classesSnap = await getDocs(collection(db, 'classes'));
      const classesData = {};
      classesSnap.docs.forEach(d => {
        classesData[d.id] = d.data();
      });

      const stats = await Promise.all(classes.map(async (className) => {
        // Count students in this class
        const studentsQuery = query(collection(db, 'students'), where('className', '==', className));
        const studentsSnap = await getDocs(studentsQuery);
        
        // Count subjects for this class
        const subjectsQuery = query(collection(db, 'subjects'), where('class', '==', className));
        const subjectsSnap = await getDocs(subjectsQuery);

        return {
          name: className,
          studentCount: studentsSnap.size,
          subjectCount: subjectsSnap.size,
          formTeacherId: classesData[className]?.formTeacherId || '',
          id: className
        };
      }));
      setClassStats(stats);
    } catch (error) {
      console.error('Error fetching class stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignTeacher = async (className, teacherId) => {
    setSavingTeacher(className);
    try {
      const teacher = staff.find(s => s.id === teacherId);
      const formTeacherName = teacher ? teacher.name : '';
      await setDoc(doc(db, 'classes', className), {
        formTeacherId: teacherId,
        formTeacherName: formTeacherName,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      setClassStats(prev => prev.map(c => 
        c.id === className ? { ...c, formTeacherId: teacherId } : c
      ));
    } catch (e) {
      console.error("Error assigning teacher", e);
      alert("Failed to assign form teacher.");
    } finally {
      setSavingTeacher('');
    }
  };

  useEffect(() => {
    fetchClassStats();
  }, []);

  const openManageDetails = async (className) => {
    setSelectedClass(className);
    setAttendanceLoading(true);
    setActiveTab('attendance');
    try {
      const q = query(collection(db, 'students'), where('className', '==', className));
      const snap = await getDocs(q);
      const studentsList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setClassStudents(studentsList);
      
      await fetchAttendance(className, attendanceDate);
      await fetchPerformance(className, studentsList);
    } catch (error) {
      console.error(error);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const fetchPerformance = async (className, studentsList) => {
    setPerformanceLoading(true);
    try {
      const q = query(collection(db, 'marks'), where('c', '==', className));
      const snap = await getDocs(q);
      
      let maleTotal = 0, maleCount = 0;
      let femaleTotal = 0, femaleCount = 0;

      const genderMap = {};
      studentsList.forEach(s => {
        if (s.regNo) genderMap[s.regNo] = s.gender;
      });

      snap.docs.forEach(doc => {
        const data = doc.data();
        const regNo = data.r || data.regNo;
        const gender = genderMap[regNo];
        const avg = data.m?._meta?.avg || data.marks?._meta?.average || 0;
        
        if (avg > 0) {
          if (gender === 'Male') {
            maleTotal += Number(avg);
            maleCount++;
          } else if (gender === 'Female') {
            femaleTotal += Number(avg);
            femaleCount++;
          }
        }
      });

      setPerformanceData({
        maleAvg: maleCount > 0 ? (maleTotal / maleCount).toFixed(1) : 0,
        femaleAvg: femaleCount > 0 ? (femaleTotal / femaleCount).toFixed(1) : 0,
        overallAvg: (maleCount + femaleCount) > 0 ? ((maleTotal + femaleTotal) / (maleCount + femaleCount)).toFixed(1) : 0
      });
    } catch (e) {
      console.error(e);
    } finally {
      setPerformanceLoading(false);
    }
  };

  const fetchAttendance = async (className, date) => {
    setAttendanceLoading(true);
    try {
      const docRef = doc(db, 'attendance', `${className}_${date}`);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setPresentStudents(snap.data().presentStudents || []);
      } else {
        setPresentStudents([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const handleDateChange = (e) => {
    const newDate = e.target.value;
    setAttendanceDate(newDate);
    if (selectedClass) {
      fetchAttendance(selectedClass, newDate);
    }
  };

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
    setAttendanceSaving(true);
    try {
      const docRef = doc(db, 'attendance', `${selectedClass}_${attendanceDate}`);
      await setDoc(docRef, {
        className: selectedClass,
        date: attendanceDate,
        presentStudents,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      alert('Attendance saved successfully!');
    } catch (error) {
      console.error(error);
      alert('Failed to save attendance.');
    } finally {
      setAttendanceSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight text-left">Class Management</h2>
          <p className="text-slate-500 text-left">Overview of school structure, student distribution, and academic capacity.</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 border border-emerald-100">
            <TrendingUp size={16} />
            Academic Session 2025/2026
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
          [1,2,3,4].map(i => <div key={i} className="h-48 bg-slate-100 animate-pulse rounded-3xl"></div>)
        ) : classStats.map((cls) => (
          <div key={cls.id} className="group relative bg-white p-8 rounded-3xl shadow-sm border border-slate-200 hover:border-indigo-500 transition-all hover:shadow-xl hover:shadow-indigo-50 hover:-translate-y-1">
            <div className="flex justify-between items-start mb-6 text-left">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
                <Layers size={24} />
              </div>
              <span className="text-xs font-black text-slate-300 uppercase tracking-widest">{cls.name.includes('SS') ? 'Senior' : 'Junior'}</span>
            </div>
            
            <div className="space-y-4 text-left">
              <h3 className="text-2xl font-black text-slate-900">{cls.name}</h3>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-slate-400" />
                  <span className="text-sm font-bold text-slate-700">{cls.studentCount} Students</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen size={16} className="text-slate-400" />
                  <span className="text-sm font-bold text-slate-700">{cls.subjectCount} Subjects</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 text-left">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 mb-2">
                <UserCheck size={14} /> Class/Form Teacher
              </label>
              <select
                value={cls.formTeacherId}
                onChange={(e) => handleAssignTeacher(cls.id, e.target.value)}
                disabled={savingTeacher === cls.id}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all"
              >
                <option value="">-- Select Teacher --</option>
                {staff.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {savingTeacher === cls.id && <p className="text-xs text-indigo-500 mt-1 font-bold animate-pulse">Saving...</p>}
            </div>

            <button 
              onClick={() => openManageDetails(cls.id)}
              className="mt-6 w-full py-3 bg-slate-50 text-slate-600 rounded-xl font-bold flex items-center justify-center gap-2 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
              Manage Details <ArrowUpRight size={16} />
            </button>
          </div>
        ))}
      </div>

      <div className="bg-indigo-900 text-white p-8 rounded-[2rem] relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
        <div className="relative z-10 text-left">
          <h4 className="text-indigo-200 text-xs font-black uppercase tracking-widest mb-2">Capacity Insight</h4>
          <h3 className="text-2xl font-bold mb-4">Class Balanced Distribution is at <span className="text-emerald-400">92%</span></h3>
          <p className="text-indigo-300 max-w-md text-sm">Most classes are currently operating at optimal capacity. Consider adding more desks to SS2 Science upcoming term.</p>
        </div>
        <div className="relative z-10">
          <button className="bg-white text-indigo-900 px-8 py-3 rounded-2xl font-black hover:bg-indigo-50 transition-all shadow-xl active:scale-95">Download Capacity Report</button>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full -ml-16 -mb-16 blur-2xl"></div>
      </div>

      <div className="card-white p-6 border-l-4 border-l-indigo-500 bg-indigo-50/30 flex items-start gap-4">
        <Info size={24} className="text-indigo-600 mt-1" />
        <div className="text-left">
          <h5 className="font-bold text-indigo-900">System Note</h5>
          <p className="text-sm text-indigo-700">Class names are standardized across the portal. Any changes to these names will require an administrator to update the global registry in the database settings.</p>
        </div>
      </div>

      {/* Manage Details Modal */}
      {selectedClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 bg-indigo-900 text-white flex justify-between items-center shrink-0">
              <div className="text-left">
                <h3 className="text-2xl font-black m-0">{selectedClass} Management</h3>
                <p className="text-indigo-200 text-sm mt-1">Class Analysis & Attendance</p>
              </div>
              <button onClick={() => setSelectedClass(null)} className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-rose-500 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 bg-white px-6 shrink-0">
              {['attendance', 'demographics', 'performance'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-4 text-sm font-bold uppercase tracking-widest transition-colors ${
                    activeTab === tab 
                      ? 'border-b-2 border-indigo-600 text-indigo-600' 
                      : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50 text-left">
              {attendanceLoading && classStudents.length === 0 ? (
                 <div className="flex justify-center p-10"><div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div></div>
              ) : (
                <div className="space-y-8">
                  {/* Demographics Tab */}
                  {activeTab === 'demographics' && (
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Demographics Breakdown</h4>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-8">
                        <div className="flex-1 bg-blue-50 p-6 rounded-xl border border-blue-100 flex flex-col items-center justify-center gap-2">
                          <span className="font-bold text-blue-700 uppercase tracking-widest text-xs">Male Students</span>
                          <span className="text-5xl font-black text-blue-800">{classStudents.filter(s => s.gender === 'Male').length}</span>
                        </div>
                        <div className="flex-1 bg-pink-50 p-6 rounded-xl border border-pink-100 flex flex-col items-center justify-center gap-2">
                          <span className="font-bold text-pink-700 uppercase tracking-widest text-xs">Female Students</span>
                          <span className="text-5xl font-black text-pink-800">{classStudents.filter(s => s.gender === 'Female').length}</span>
                        </div>
                        <div className="flex-1 bg-slate-100 p-6 rounded-xl border border-slate-200 flex flex-col items-center justify-center gap-2">
                          <span className="font-bold text-slate-700 uppercase tracking-widest text-xs">Total</span>
                          <span className="text-5xl font-black text-slate-800">{classStudents.length}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Performance Tab */}
                  {activeTab === 'performance' && (
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Performance by Gender</h4>
                      {performanceLoading ? (
                        <div className="flex justify-center p-6"><div className="animate-spin h-6 w-6 border-4 border-indigo-600 border-t-transparent rounded-full"></div></div>
                      ) : (
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-8">
                          <div className="flex-1 bg-emerald-50 p-6 rounded-xl border border-emerald-100 flex flex-col items-center justify-center gap-2">
                            <span className="font-bold text-emerald-700 uppercase tracking-widest text-xs">Class Average</span>
                            <span className="text-5xl font-black text-emerald-800">{performanceData.overallAvg}%</span>
                          </div>
                          <div className="flex-1 bg-blue-50 p-6 rounded-xl border border-blue-100 flex flex-col items-center justify-center gap-2">
                            <span className="font-bold text-blue-700 uppercase tracking-widest text-xs">Male Average</span>
                            <span className="text-5xl font-black text-blue-800">{performanceData.maleAvg}%</span>
                          </div>
                          <div className="flex-1 bg-pink-50 p-6 rounded-xl border border-pink-100 flex flex-col items-center justify-center gap-2">
                            <span className="font-bold text-pink-700 uppercase tracking-widest text-xs">Female Average</span>
                            <span className="text-5xl font-black text-pink-800">{performanceData.femaleAvg}%</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Attendance Tracker Tab */}
                  {activeTab === 'attendance' && (
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-6 gap-4">
                      <div>
                        <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-2">Daily Attendance</h4>
                        <div className="flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-lg">
                          <Calendar size={16} className="text-slate-500" />
                          <input 
                            type="date" 
                            value={attendanceDate}
                            onChange={handleDateChange}
                            className="bg-transparent border-none outline-none text-sm font-bold text-slate-700"
                          />
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button 
                          onClick={toggleAllAttendance}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-colors"
                        >
                          Toggle All
                        </button>
                        <button 
                          onClick={saveAttendance}
                          disabled={attendanceSaving}
                          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                          {attendanceSaving ? 'Saving...' : 'Save Attendance'}
                        </button>
                      </div>
                    </div>

                    {attendanceLoading ? (
                      <div className="flex justify-center p-6"><div className="animate-spin h-6 w-6 border-4 border-indigo-600 border-t-transparent rounded-full"></div></div>
                    ) : (
                      <div className="overflow-x-auto border border-slate-200 rounded-xl">
                        <table className="w-full text-left">
                          <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <tr>
                              <th className="px-6 py-4">Reg Number</th>
                              <th className="px-6 py-4">Student Name</th>
                              <th className="px-6 py-4">Gender</th>
                              <th className="px-6 py-4 text-right">Present</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {classStudents.map(student => {
                              const isPresent = presentStudents.includes(student.id);
                              return (
                                <tr key={student.id} className={`hover:bg-slate-50 transition-colors ${isPresent ? 'bg-emerald-50/30' : ''}`}>
                                  <td className="px-6 py-4 text-xs font-bold text-slate-500">{student.regNo}</td>
                                  <td className="px-6 py-4 text-sm font-black text-slate-800">{student.name}</td>
                                  <td className="px-6 py-4 text-xs font-bold text-slate-500">{student.gender}</td>
                                  <td className="px-6 py-4 text-right">
                                    <button 
                                      onClick={() => toggleAttendance(student.id)}
                                      className={`w-8 h-8 rounded-lg flex items-center justify-center ml-auto transition-colors ${isPresent ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                                    >
                                      {isPresent ? <CheckSquare size={18} /> : <Square size={18} />}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                            {classStudents.length === 0 && (
                              <tr>
                                <td colSpan="4" className="px-6 py-8 text-center text-slate-400 font-bold text-sm">
                                  No students enrolled in this class yet.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassManagement;
