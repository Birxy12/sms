import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, getDocs, where, doc, setDoc, getDoc, deleteDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { ensureFirebaseAuth } from '../../lib/ensureAuth';
import { 
  Layers, Users, BookOpen, ChevronRight, GraduationCap, ArrowUpRight, TrendingUp, 
  Info, UserCheck, X, Calendar, CheckSquare, Square, MinusSquare, ChevronDown, Save, Check, 
  Download, Plus, Trash2, UserPlus, UserMinus, ArrowRightLeft, DollarSign, AlertCircle, CheckCircle2, 
  Search, Filter, CreditCard, ArrowRight, Eye, ShieldCheck, Mail, Phone, RefreshCw,
  Sparkles, Award, FileSpreadsheet, AlertTriangle, Loader2
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import BulkStudentEnrollModal from '../../components/BulkStudentEnrollModal';
import { expandStudent, sanitizeFirestoreData } from '../../utils/firestoreSchema';
import { normalizeClassName } from '../../utils/classUtils';

const ClassManagement = () => {
  const { currentSession } = useTheme();
  const [classStats, setClassStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState([]);
  const [savingTeacher, setSavingTeacher] = useState('');
  const [feesConfig, setFeesConfig] = useState({});

  // Bulk Enroll modal state
  const [showBulkEnroll, setShowBulkEnroll] = useState(false);
  const [bulkEnrollTargetClass, setBulkEnrollTargetClass] = useState('JSS1');

  // Add Class modal state
  const [showAddClass, setShowAddClass] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [addingClass, setAddingClass] = useState(false);
  const [deletingClass, setDeletingClass] = useState('');

  // Modal State
  const [selectedClass, setSelectedClass] = useState(null);
  const [classStudents, setClassStudents] = useState([]);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [activeTab, setActiveTab] = useState('students'); // 'students', 'attendance', 'fees', 'demographics'
  const [studentSearch, setStudentSearch] = useState('');
  const [feeFilter, setFeeFilter] = useState('all'); // 'all', 'owing', 'cleared'
  
  // Batch Selection & Removal State
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [batchActionModal, setBatchActionModal] = useState(null); // { type: 'remove' | 'transfer' | 'delete', targetClass?: string, singleStudent?: object }
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [batchToast, setBatchToast] = useState({ show: false, type: 'success', message: '' });

  // Attendance State
  const [attendanceDate, setAttendanceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [presentStudents, setPresentStudents] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceSaving, setAttendanceSaving] = useState(false);
  const [attendanceSavedToast, setAttendanceSavedToast] = useState(false);

  // Analytics State
  const [performanceData, setPerformanceData] = useState({ maleAvg: 0, femaleAvg: 0, overallAvg: 0 });
  const [performanceLoading, setPerformanceLoading] = useState(false);

  const DEFAULT_CLASSES = ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2 ART', 'SS2 SCIENCE', 'SS3 ART', 'SS3 SCIENCE'];
  const [classes, setClasses] = useState(DEFAULT_CLASSES);

  // 1. Fetch Class Stats and Global Info
  const fetchClassStats = async () => {
    setLoading(true);
    try {
      // Fetch Staff
      const staffSnap = await getDocs(collection(db, 'staff'));
      const staffList = staffSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setStaff(staffList);

      // Fetch Global Fees Settings
      try {
        const feeSnap = await getDoc(doc(db, 'settings', 'fees'));
        if (feeSnap.exists()) {
          setFeesConfig(feeSnap.data() || {});
        }
      } catch (err) {
        console.warn('Could not load fees settings:', err);
      }

      // Fetch Classes from Firestore
      const classesSnap = await getDocs(collection(db, 'classes'));
      const classesData = {};
      const customClassNames = [];
      classesSnap.docs.forEach(d => {
        classesData[d.id] = d.data();
        if (!DEFAULT_CLASSES.includes(d.id) && !d.data().deleted) {
          customClassNames.push(d.id);
        }
      });

      // Fetch All Students Once (Fast, 1 read request)
      const studentsSnap = await getDocs(collection(db, 'students'));
      const studentsByClass = {};

      studentsSnap.docs.forEach(doc => {
        const student = expandStudent(doc.data());
        if (!student) return;
        const normClass = normalizeClassName(student.className || '');
        if (!normClass) return;

        if (!studentsByClass[normClass]) {
          studentsByClass[normClass] = [];
        }
        studentsByClass[normClass].push(student);

        // Discover any student classes not yet in classes list (e.g. NURSERY 3)
        if (!DEFAULT_CLASSES.includes(normClass) && !customClassNames.includes(normClass)) {
          customClassNames.push(normClass);
        }
      });

      // Fetch Subjects
      const subjectsSnap = await getDocs(collection(db, 'subjects'));
      const subjectsByClass = {};
      subjectsSnap.docs.forEach(d => {
        const subData = d.data();
        const c = normalizeClassName(subData.class || subData.className || '');
        if (c) {
          subjectsByClass[c] = (subjectsByClass[c] || 0) + 1;
        }
      });

      // Merge defaults + custom classes
      const allClasses = Array.from(new Set([...DEFAULT_CLASSES, ...customClassNames]));
      setClasses(allClasses);

      // Build Stats
      const stats = allClasses.map((className) => {
        const norm = normalizeClassName(className);
        const enrolled = studentsByClass[norm] || [];
        
        let maleCount = 0;
        let femaleCount = 0;
        enrolled.forEach(s => {
          const g = (s.gender || '').toLowerCase();
          if (g === 'f' || g === 'female') femaleCount++;
          else maleCount++;
        });

        return {
          name: className,
          studentCount: enrolled.length,
          maleCount,
          femaleCount,
          subjectCount: subjectsByClass[norm] || 0,
          formTeacherId: classesData[className]?.formTeacherId || '',
          id: className,
          isCustom: !DEFAULT_CLASSES.includes(className)
        };
      });

      setClassStats(stats);
    } catch (error) {
      console.error('Error fetching class stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassStats();
  }, []);

  const handleAddClass = async () => {
    const name = newClassName.trim().toUpperCase();
    if (!name) return;
    if (classes.includes(name)) {
      alert('A class with that name already exists.');
      return;
    }
    setAddingClass(true);
    try {
      await setDoc(doc(db, 'classes', name), {
        name,
        isCustom: true,
        createdAt: new Date().toISOString()
      }, { merge: true });
      setNewClassName('');
      setShowAddClass(false);
      fetchClassStats();
    } catch (e) {
      console.error(e);
      alert('Failed to add class.');
    } finally {
      setAddingClass(false);
    }
  };

  const handleDeleteClass = async (className) => {
    if (!window.confirm(`Delete class "${className}"? This will not remove any students already assigned to it.`)) return;
    setDeletingClass(className);
    try {
      await setDoc(doc(db, 'classes', className), { deleted: true }, { merge: true });
      setClasses(prev => prev.filter(c => c !== className));
      setClassStats(prev => prev.filter(c => c.id !== className));
    } catch (e) {
      console.error(e);
      alert('Failed to delete class.');
    } finally {
      setDeletingClass('');
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

  // Open Class Modal with target tab
  const openManageDetails = async (className, tab = 'students') => {
    setSelectedClass(className);
    setOpenDropdownId(null);
    setAttendanceLoading(true);
    setActiveTab(tab);
    setStudentSearch('');
    setFeeFilter('all');
    try {
      const snap = await getDocs(collection(db, 'students'));
      const normTarget = normalizeClassName(className);
      const studentsList = [];
      snap.docs.forEach(d => {
        const rawData = d.data();
        const expanded = expandStudent(rawData) || {};
        const merged = { id: d.id, ...rawData, ...expanded };
        if (normalizeClassName(merged.className) === normTarget) {
          studentsList.push(merged);
        }
      });
      // Sort alphabetically by name
      studentsList.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setClassStudents(studentsList);
      
      await fetchAttendance(className, attendanceDate);
      await fetchPerformance(className, studentsList);
    } catch (error) {
      console.error('Error opening class details:', error);
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
      setAttendanceSavedToast(true);
      setTimeout(() => setAttendanceSavedToast(false), 3000);
    } catch (error) {
      console.error(error);
      alert('Failed to save attendance.');
    } finally {
      setAttendanceSaving(false);
    }
  };

  // Clear selected student checkboxes when switching class or tab
  useEffect(() => {
    setSelectedStudentIds([]);
  }, [selectedClass, activeTab]);

  // Selection Helper Functions
  const toggleSelectStudent = (id) => {
    if (!id) return;
    setSelectedStudentIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllStudents = () => {
    const currentDisplayedIds = displayedStudents.map(s => s.id).filter(Boolean);
    const allSelected = currentDisplayedIds.length > 0 && currentDisplayedIds.every(id => selectedStudentIds.includes(id));
    if (allSelected) {
      setSelectedStudentIds(prev => prev.filter(id => !currentDisplayedIds.includes(id)));
    } else {
      setSelectedStudentIds(prev => Array.from(new Set([...prev, ...currentDisplayedIds])));
    }
  };

  const clearSelection = () => {
    setSelectedStudentIds([]);
  };

  // 1. Batch Remove / Unassign from Current Class
  const handleConfirmBatchRemove = async (targetIds = selectedStudentIds) => {
    if (!targetIds || targetIds.length === 0) return;
    setBatchProcessing(true);
    try {
      await ensureFirebaseAuth();
      const chunkSize = 400;
      for (let i = 0; i < targetIds.length; i += chunkSize) {
        const chunk = targetIds.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach(id => {
          const studentRef = doc(db, 'students', id);
          batch.update(studentRef, {
            className: '',
            c: '',
            previousClass: selectedClass,
            unassignedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        });
        await batch.commit();
      }

      // Update local state
      setClassStudents(prev => prev.filter(s => !targetIds.includes(s.id)));
      setSelectedStudentIds(prev => prev.filter(id => !targetIds.includes(id)));
      setBatchActionModal(null);
      fetchClassStats();

      setBatchToast({
        show: true,
        type: 'success',
        message: `Successfully removed ${targetIds.length} student(s) from ${selectedClass}.`
      });
      setTimeout(() => setBatchToast({ show: false, type: 'success', message: '' }), 4000);
    } catch (error) {
      console.error('Batch removal error:', error);
      setBatchToast({
        show: true,
        type: 'error',
        message: 'Failed to remove student(s) from class. Please try again.'
      });
      setTimeout(() => setBatchToast({ show: false, type: 'error', message: '' }), 4000);
    } finally {
      setBatchProcessing(false);
    }
  };

  // 2. Batch Transfer / Move to Another Class
  const handleConfirmBatchTransfer = async (targetClass, targetIds = selectedStudentIds) => {
    if (!targetClass || !targetIds || targetIds.length === 0) return;
    setBatchProcessing(true);
    try {
      await ensureFirebaseAuth();
      const normTarget = normalizeClassName(targetClass);
      const chunkSize = 400;
      for (let i = 0; i < targetIds.length; i += chunkSize) {
        const chunk = targetIds.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach(id => {
          const studentRef = doc(db, 'students', id);
          batch.update(studentRef, {
            className: normTarget,
            c: normTarget,
            transferredFrom: selectedClass,
            transferredAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        });
        await batch.commit();
      }

      // Update local state
      setClassStudents(prev => prev.filter(s => !targetIds.includes(s.id)));
      setSelectedStudentIds(prev => prev.filter(id => !targetIds.includes(id)));
      setBatchActionModal(null);
      fetchClassStats();

      setBatchToast({
        show: true,
        type: 'success',
        message: `Successfully moved ${targetIds.length} student(s) to ${normTarget}.`
      });
      setTimeout(() => setBatchToast({ show: false, type: 'success', message: '' }), 4000);
    } catch (error) {
      console.error('Batch transfer error:', error);
      setBatchToast({
        show: true,
        type: 'error',
        message: 'Failed to transfer students. Please try again.'
      });
      setTimeout(() => setBatchToast({ show: false, type: 'error', message: '' }), 4000);
    } finally {
      setBatchProcessing(false);
    }
  };

  // 3. Batch Permanent Delete
  const handleConfirmBatchDelete = async (targetIds = selectedStudentIds) => {
    if (!targetIds || targetIds.length === 0) return;
    setBatchProcessing(true);
    try {
      await ensureFirebaseAuth();
      const chunkSize = 400;
      for (let i = 0; i < targetIds.length; i += chunkSize) {
        const chunk = targetIds.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach(id => {
          const studentRef = doc(db, 'students', id);
          batch.delete(studentRef);
        });
        await batch.commit();
      }

      // Update local state
      setClassStudents(prev => prev.filter(s => !targetIds.includes(s.id)));
      setSelectedStudentIds(prev => prev.filter(id => !targetIds.includes(id)));
      setBatchActionModal(null);
      fetchClassStats();

      setBatchToast({
        show: true,
        type: 'success',
        message: `Permanently deleted ${targetIds.length} student record(s).`
      });
      setTimeout(() => setBatchToast({ show: false, type: 'success', message: '' }), 4000);
    } catch (error) {
      console.error('Batch delete error:', error);
      setBatchToast({
        show: true,
        type: 'error',
        message: 'Failed to delete student record(s).'
      });
      setTimeout(() => setBatchToast({ show: false, type: 'error', message: '' }), 4000);
    } finally {
      setBatchProcessing(false);
    }
  };

  // Fee computations for students in selectedClass
  const feeAnalysis = useMemo(() => {
    let totalExpected = 0;
    let totalCollected = 0;
    let totalDebt = 0;
    let owingCount = 0;
    let clearedCount = 0;

    const studentFees = classStudents.map(s => {
      const fallbackFee = feesConfig[selectedClass] || feesConfig['default'] || 0;
      const expected = parseFloat(s.expectedFee) || parseFloat(fallbackFee) || 0;
      const paid = parseFloat(s.paidFee) || parseFloat(s.paidAmount) || 0;
      const balance = Math.max(0, expected - paid);
      
      let status = 'no_fee';
      if (expected > 0) {
        if (balance === 0) {
          status = 'cleared';
          clearedCount++;
        } else if (paid > 0) {
          status = 'partial';
          owingCount++;
        } else {
          status = 'owing';
          owingCount++;
        }
      }

      totalExpected += expected;
      totalCollected += paid;
      totalDebt += balance;

      return {
        ...s,
        expected,
        paid,
        balance,
        status
      };
    });

    return {
      studentFees,
      totalExpected,
      totalCollected,
      totalDebt,
      owingCount,
      clearedCount
    };
  }, [classStudents, feesConfig, selectedClass]);

  // Filtered Students for Roster & Fees tab
  const displayedStudents = useMemo(() => {
    const term = studentSearch.trim().toLowerCase();
    return feeAnalysis.studentFees.filter(s => {
      const matchesSearch = !term || 
        (s.name || '').toLowerCase().includes(term) || 
        (s.regNo || '').toLowerCase().includes(term);

      if (!matchesSearch) return false;

      if (activeTab === 'fees') {
        if (feeFilter === 'owing') return s.balance > 0;
        if (feeFilter === 'cleared') return s.expected > 0 && s.balance === 0;
      }

      return true;
    });
  }, [feeAnalysis.studentFees, studentSearch, feeFilter, activeTab]);

  // Download Class Roster CSV
  const downloadClassRoster = () => {
    const rows = [
      ['Reg No', 'Student Name', 'Gender', 'Class', 'House', 'Club', 'Phone', 'Email', 'Date of Birth'],
      ...classStudents.map(s => [
        s.regNo || '',
        s.name || '',
        s.gender || 'Male',
        selectedClass,
        s.house || '',
        s.club || '',
        s.phone || '',
        s.email || '',
        s.dob || ''
      ])
    ];
    const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedClass}_Students_Roster.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download Debtors / Fee Report CSV
  const downloadDebtorsReport = () => {
    const rows = [
      ['Reg No', 'Student Name', 'Class', 'Expected Fee (NGN)', 'Paid Amount (NGN)', 'Balance Owing (NGN)', 'Status', 'Phone'],
      ...feeAnalysis.studentFees.map(s => [
        s.regNo || '',
        s.name || '',
        selectedClass,
        s.expected,
        s.paid,
        s.balance,
        s.status.toUpperCase(),
        s.phone || ''
      ])
    ];
    const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedClass}_Fee_Debtors_Report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight text-left">Class Management</h2>
          <p className="text-slate-500 text-left">Overview of school structure, student distribution, attendance, and fee tracking.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 border border-emerald-100">
            <TrendingUp size={16} />
            Academic Session {currentSession}
          </div>
          <button
            onClick={() => {
              setBulkEnrollTargetClass('JSS1');
              setShowBulkEnroll(true);
            }}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
          >
            <UserPlus size={16} /> Bulk Enroll (CSV/Excel)
          </button>
          <button
            onClick={() => setShowAddClass(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
          >
            <Plus size={16} /> Add Class
          </button>
        </div>
      </div>

      {/* Class Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
          [1,2,3,4].map(i => <div key={i} className="h-48 bg-slate-100 animate-pulse rounded-3xl"></div>)
        ) : classStats.map((cls) => (
          <div key={cls.id} className="group relative bg-white p-7 rounded-3xl shadow-sm border border-slate-200 hover:border-indigo-500 transition-all hover:shadow-xl hover:shadow-indigo-50 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-5 text-left">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <Layers size={24} />
                </div>
                <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 uppercase tracking-widest">
                  {cls.name.includes('SS') ? 'Senior' : (cls.name.includes('NURSERY') || cls.name.includes('PRY') || cls.name.includes('BASIC') ? 'Primary' : 'Junior')}
                </span>
              </div>
              
              <div className="space-y-3 text-left">
                <h3 className="text-2xl font-black text-slate-900">{cls.name}</h3>
                <div className="flex items-center gap-5">
                  <div className="flex items-center gap-1.5">
                    <Users size={15} className="text-indigo-500" />
                    <span className="text-sm font-black text-slate-800">{cls.studentCount} Students</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <BookOpen size={15} className="text-slate-400" />
                    <span className="text-xs font-bold text-slate-500">{cls.subjectCount} Subjects</span>
                  </div>
                </div>

                {/* Demographics bar */}
                {cls.studentCount > 0 && (
                  <div className="pt-1">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-wider mb-1">
                      <span className="text-blue-600">Male {Math.round((cls.maleCount / cls.studentCount) * 100)}%</span>
                      <span className="text-pink-600">{Math.round((cls.femaleCount / cls.studentCount) * 100)}% Female</span>
                    </div>
                    <div className="flex h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div style={{ width: `${(cls.maleCount / cls.studentCount) * 100}%` }} className="bg-blue-500 transition-all duration-700"></div>
                      <div style={{ width: `${(cls.femaleCount / cls.studentCount) * 100}%` }} className="bg-pink-500 transition-all duration-700"></div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 text-left">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 mb-1.5">
                  <UserCheck size={13} /> Form Teacher
                </label>
                <select
                  value={cls.formTeacherId}
                  onChange={(e) => handleAssignTeacher(cls.id, e.target.value)}
                  disabled={savingTeacher === cls.id}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all cursor-pointer"
                >
                  <option value="">-- Assign Teacher --</option>
                  {staff.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                {savingTeacher === cls.id && <p className="text-[10px] text-indigo-500 mt-1 font-bold animate-pulse">Saving...</p>}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-5 space-y-2">
              {/* PRIMARY OPEN CLASS BUTTON */}
              <button 
                onClick={() => openManageDetails(cls.id, 'students')}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-100 hover:shadow-lg active:scale-98"
              >
                <Eye size={16} /> Open Class
              </button>

              <div className="relative">
                <button 
                  onClick={() => setOpenDropdownId(openDropdownId === cls.id ? null : cls.id)}
                  className="w-full py-2 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-slate-100"
                >
                  Quick Actions <ChevronDown size={14} className={`transition-transform ${openDropdownId === cls.id ? 'rotate-180' : ''}`} />
                </button>
                
                {openDropdownId === cls.id && (
                  <div className="absolute bottom-full left-0 w-full mb-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-20 animate-in fade-in slide-in-from-bottom-2 text-left">
                    <button onClick={() => openManageDetails(cls.id, 'students')} className="w-full px-4 py-3 text-left text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2 transition-colors border-b border-slate-50">
                      <Users size={15} /> All Students Roster
                    </button>
                    <button onClick={() => openManageDetails(cls.id, 'attendance')} className="w-full px-4 py-3 text-left text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2 transition-colors border-b border-slate-50">
                      <Calendar size={15} /> Take Attendance
                    </button>
                    <button onClick={() => openManageDetails(cls.id, 'fees')} className="w-full px-4 py-3 text-left text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2 transition-colors border-b border-slate-50">
                      <DollarSign size={15} /> Fee Status & Debtors
                    </button>
                    <button onClick={() => openManageDetails(cls.id, 'demographics')} className="w-full px-4 py-3 text-left text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2 transition-colors">
                      <TrendingUp size={15} /> Analytics & Performance
                    </button>
                  </div>
                )}
              </div>

              {/* Delete custom class */}
              {cls.isCustom && (
                <button
                  onClick={() => handleDeleteClass(cls.id)}
                  disabled={deletingClass === cls.id}
                  className="w-full py-1.5 text-[11px] font-bold text-rose-500 hover:bg-rose-50 rounded-lg border border-rose-100 flex items-center justify-center gap-1.5 transition-all"
                >
                  {deletingClass === cls.id ? 'Deleting…' : <><Trash2 size={11} /> Delete Class</>}
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Add Class placeholder card */}
        <button
          onClick={() => setShowAddClass(true)}
          className="group h-full min-h-[260px] bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center gap-3 hover:border-indigo-400 hover:bg-indigo-50 transition-all cursor-pointer p-6"
        >
          <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-200 flex items-center justify-center group-hover:bg-indigo-600 group-hover:border-indigo-600 transition-all">
            <Plus size={22} className="text-slate-400 group-hover:text-white transition-colors" />
          </div>
          <span className="text-sm font-black text-slate-500 group-hover:text-indigo-600 transition-colors">Add New Class</span>
          <p className="text-xs text-slate-400 text-center font-medium">Create a custom class for early years, junior, or senior arms.</p>
        </button>
      </div>

      {/* Add Class Modal */}
      {showAddClass && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-8 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                  <Layers size={20} />
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-black text-slate-900 m-0">Add New Class</h3>
                  <p className="text-xs text-slate-400 m-0">Appears immediately in all portal views</p>
                </div>
              </div>
              <button onClick={() => { setShowAddClass(false); setNewClassName(''); }} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 text-left">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1.5">Class Name</label>
                <input
                  type="text"
                  value={newClassName}
                  onChange={e => setNewClassName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddClass()}
                  placeholder="e.g. NURSERY 3, BASIC 5, SS2 COMMERCE"
                  autoFocus
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-black text-slate-800 outline-none focus:border-indigo-600"
                />
              </div>
              <p className="text-[11px] text-slate-400">Class names are auto-converted to uppercase for registry consistency.</p>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button 
                onClick={() => { setShowAddClass(false); setNewClassName(''); }} 
                className="px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 text-xs hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddClass}
                disabled={addingClass || !newClassName.trim()}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-black text-xs hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5"
              >
                <Plus size={14} />
                {addingClass ? 'Adding…' : 'Create Class'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── OPEN CLASS MODAL (All Students, Attendance, Debtors/Fees, Analytics) ── */}
      {selectedClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-5xl max-h-[92vh] flex flex-col rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 border border-slate-100">
            {/* Modal Header */}
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4 text-left">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                  <Layers size={24} className="text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-black m-0">{selectedClass}</h3>
                    <span className="px-3 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-black text-xs border border-indigo-400/30">
                      {classStudents.length} Students
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs mt-0.5 font-medium">Interactive Class Portal & Management</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedClass(null)} 
                className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-rose-600 transition-colors text-slate-300 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50/80 px-4 sm:px-6 shrink-0 gap-2 overflow-x-auto">
              {[
                { id: 'students', label: 'All Students', icon: Users, badge: classStudents.length },
                { id: 'attendance', label: 'Take Attendance', icon: Calendar, badge: `${presentStudents.length}/${classStudents.length}` },
                { id: 'fees', label: 'Fees & Debtors', icon: DollarSign, badge: feeAnalysis.owingCount > 0 ? `${feeAnalysis.owingCount} Owing` : 'Cleared', badgeColor: feeAnalysis.owingCount > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700' },
                { id: 'demographics', label: 'Demographics & Stats', icon: TrendingUp }
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-3.5 px-4 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
                      isActive 
                        ? 'border-indigo-600 text-indigo-600 bg-white shadow-sm rounded-t-xl' 
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Icon size={16} />
                    <span>{tab.label}</span>
                    {tab.badge && (
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${tab.badgeColor || (isActive ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600')}`}>
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            
            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50/50 text-left custom-scrollbar">
              {attendanceLoading && classStudents.length === 0 ? (
                <div className="flex justify-center p-16">
                  <div className="animate-spin h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
                </div>
              ) : (
                <div>
                  {/* ─────────────────────────────────────────────────────────────
                      TAB 1: ALL STUDENTS ROSTER
                  ───────────────────────────────────────────────────────────── */}
                  {activeTab === 'students' && (() => {
                    const allDisplayedSelected = displayedStudents.length > 0 && displayedStudents.every(s => selectedStudentIds.includes(s.id));
                    const someDisplayedSelected = selectedStudentIds.length > 0 && !allDisplayedSelected;

                    return (
                      <div className="space-y-4 animate-in fade-in">
                        {/* Search & Actions Bar */}
                        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                          <div className="relative flex-1">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <input
                              type="text"
                              placeholder={`Search ${classStudents.length} student(s) by name or Reg No...`}
                              value={studentSearch}
                              onChange={(e) => setStudentSearch(e.target.value)}
                              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={downloadClassRoster}
                              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black flex items-center gap-2 transition-colors cursor-pointer"
                            >
                              <FileSpreadsheet size={15} /> Export Roster (CSV)
                            </button>
                          </div>
                        </div>

                        {/* Batch Action Bar (Appears when 1 or more students are selected) */}
                        {selectedStudentIds.length > 0 && (
                          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-3.5 sm:p-4 rounded-2xl shadow-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 border border-indigo-500/30">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-sm shrink-0 shadow-md shadow-indigo-500/50">
                                {selectedStudentIds.length}
                              </div>
                              <div>
                                <p className="text-xs font-black text-white m-0 flex items-center gap-2">
                                  <span>{selectedStudentIds.length} of {classStudents.length} Student{selectedStudentIds.length > 1 ? 's' : ''} Selected</span>
                                  <span className="text-[10px] font-bold text-indigo-300 bg-indigo-900/60 px-2 py-0.5 rounded-md border border-indigo-700/50">
                                    Batch Mode
                                  </span>
                                </p>
                                <p className="text-[10px] text-indigo-300 m-0 mt-0.5">Apply action across all selected students in {selectedClass}</p>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              {/* Batch Remove Button */}
                              <button
                                onClick={() => setBatchActionModal({ type: 'remove' })}
                                disabled={batchProcessing}
                                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-md shadow-amber-900/20 transition-all cursor-pointer disabled:opacity-50"
                                title="Remove selected students from this class (marks them Unassigned)"
                              >
                                <UserMinus size={14} />
                                <span>Remove from {selectedClass}</span>
                              </button>

                              {/* Batch Transfer Button */}
                              <button
                                onClick={() => setBatchActionModal({ type: 'transfer', targetClass: classes.find(c => c !== selectedClass) || '' })}
                                disabled={batchProcessing}
                                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-md shadow-indigo-900/20 transition-all cursor-pointer disabled:opacity-50"
                                title="Move selected students to another class"
                              >
                                <ArrowRightLeft size={14} />
                                <span>Move to Class…</span>
                              </button>

                              {/* Batch Delete Button */}
                              <button
                                onClick={() => setBatchActionModal({ type: 'delete' })}
                                disabled={batchProcessing}
                                className="px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                                title="Permanently delete selected student records"
                              >
                                <Trash2 size={14} />
                                <span>Delete</span>
                              </button>

                              {/* Deselect All */}
                              <button
                                onClick={clearSelection}
                                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
                                title="Deselect all"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Students List Table / Cards */}
                        {displayedStudents.length === 0 ? (
                          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
                            <Users size={36} className="mx-auto text-slate-300 mb-2" />
                            <h4 className="text-base font-black text-slate-700">No Students Found</h4>
                            <p className="text-xs text-slate-400 mt-1">
                              {classStudents.length === 0 
                                ? `No students have been enrolled in ${selectedClass} yet.`
                                : `No students matched the query "${studentSearch}".`}
                            </p>
                          </div>
                        ) : (
                          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black uppercase text-slate-400 tracking-wider">
                                    <th className="py-3 px-3 w-10 text-center">
                                      <button 
                                        onClick={handleSelectAllStudents} 
                                        className="text-slate-400 hover:text-indigo-600 transition-colors focus:outline-none cursor-pointer flex items-center justify-center mx-auto"
                                        title={allDisplayedSelected ? "Deselect All" : "Select All"}
                                      >
                                        {allDisplayedSelected ? (
                                          <CheckSquare size={16} className="text-indigo-600" />
                                        ) : someDisplayedSelected ? (
                                          <MinusSquare size={16} className="text-indigo-500" />
                                        ) : (
                                          <Square size={16} />
                                        )}
                                      </button>
                                    </th>
                                    <th className="py-3 px-3 w-8">#</th>
                                    <th className="py-3 px-4">Student</th>
                                    <th className="py-3 px-4">Reg No</th>
                                    <th className="py-3 px-4">Gender</th>
                                    <th className="py-3 px-4">House</th>
                                    <th className="py-3 px-4">Club / Society</th>
                                    <th className="py-3 px-4">Contact</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                                  {displayedStudents.map((s, idx) => {
                                    const isSelected = selectedStudentIds.includes(s.id);
                                    return (
                                      <tr 
                                        key={s.id || idx} 
                                        className={`transition-colors cursor-pointer ${
                                          isSelected ? 'bg-indigo-50/70 border-l-4 border-l-indigo-600' : 'hover:bg-slate-50/80'
                                        }`}
                                        onClick={() => toggleSelectStudent(s.id)}
                                      >
                                        <td className="py-3.5 px-3 w-10 text-center" onClick={(e) => e.stopPropagation()}>
                                          <button 
                                            onClick={() => toggleSelectStudent(s.id)}
                                            className="text-slate-300 hover:text-indigo-600 transition-colors focus:outline-none cursor-pointer flex items-center justify-center mx-auto"
                                          >
                                            {isSelected ? (
                                              <CheckSquare size={16} className="text-indigo-600" />
                                            ) : (
                                              <Square size={16} />
                                            )}
                                          </button>
                                        </td>
                                        <td className="py-3.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                                        <td className="py-3.5 px-4">
                                          <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-700 font-black flex items-center justify-center overflow-hidden border border-indigo-100 shrink-0">
                                              {s.photo ? <img src={s.photo} alt={s.name} className="w-full h-full object-cover" /> : (s.name?.[0] || 'S')}
                                            </div>
                                            <div>
                                              <span className="font-extrabold text-slate-900 block">{s.name}</span>
                                              <span className="text-[10px] text-slate-400">{s.dob || 'DOB: Not set'}</span>
                                            </div>
                                          </div>
                                        </td>
                                        <td className="py-3.5 px-4 font-mono font-bold text-indigo-600">{s.regNo || 'Pending'}</td>
                                        <td className="py-3.5 px-4">
                                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                                            s.gender === 'Female' ? 'bg-pink-50 text-pink-700' : 'bg-blue-50 text-blue-700'
                                          }`}>
                                            {s.gender || 'Male'}
                                          </span>
                                        </td>
                                        <td className="py-3.5 px-4 text-slate-600">{s.house || '—'}</td>
                                        <td className="py-3.5 px-4 text-slate-600">{s.club || '—'}</td>
                                        <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                                          {s.phone ? <span>{s.phone}</span> : (s.email ? <span>{s.email}</span> : <span className="text-slate-300">No contact</span>)}
                                        </td>
                                        <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                                          <div className="flex items-center justify-end gap-1">
                                            <button
                                              onClick={() => setBatchActionModal({ type: 'remove', singleStudent: s })}
                                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                                              title={`Remove ${s.name} from ${selectedClass}`}
                                            >
                                              <UserMinus size={15} />
                                            </button>
                                            <button
                                              onClick={() => setBatchActionModal({ type: 'transfer', targetClass: classes.find(c => c !== selectedClass) || '', singleStudent: s })}
                                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                              title={`Move ${s.name} to another class`}
                                            >
                                              <ArrowRightLeft size={15} />
                                            </button>
                                            <button
                                              onClick={() => setBatchActionModal({ type: 'delete', singleStudent: s })}
                                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                              title={`Delete ${s.name}`}
                                            >
                                              <Trash2 size={15} />
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* ─────────────────────────────────────────────────────────────
                      TAB 2: TAKE ATTENDANCE
                  ───────────────────────────────────────────────────────────── */}
                  {activeTab === 'attendance' && (
                    <div className="space-y-4 animate-in fade-in">
                      {/* Attendance Banner & Date Selector */}
                      <div className="bg-gradient-to-r from-indigo-700 via-indigo-800 to-purple-800 rounded-3xl p-6 text-white flex flex-col md:flex-row justify-between items-center gap-4 shadow-xl">
                        <div>
                          <div className="flex items-center gap-2 mb-2 bg-white/20 px-3 py-1 rounded-full w-fit backdrop-blur-md">
                            <Calendar size={13} className="text-indigo-100" />
                            <span className="text-[10px] font-black uppercase tracking-wider text-white">Daily Register</span>
                          </div>
                          <h4 className="text-2xl font-black mb-1">Class Attendance</h4>
                          <p className="text-indigo-200 text-xs max-w-md">Click student cards to toggle attendance between Present and Absent.</p>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/20 text-left">
                            <label className="text-[10px] font-black uppercase text-indigo-200 block mb-1">Attendance Date</label>
                            <input 
                              type="date" 
                              value={attendanceDate}
                              onChange={handleDateChange}
                              className="bg-transparent border-none outline-none text-base font-black text-white [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert cursor-pointer"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Controls Bar */}
                      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-sm">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={toggleAllAttendance}
                            className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5"
                          >
                            <CheckSquare size={14} /> Toggle All Present
                          </button>
                          <button 
                            onClick={saveAttendance}
                            disabled={attendanceSaving}
                            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <Save size={14} />
                            {attendanceSaving ? 'Saving…' : 'Save Attendance'}
                          </button>
                          {attendanceSavedToast && (
                            <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg animate-bounce">
                              ✓ Saved to Firestore!
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                            <span className="text-xs font-bold text-slate-600">Present: <strong>{presentStudents.length}</strong></span>
                          </div>
                          <span className="text-slate-300">|</span>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
                            <span className="text-xs font-bold text-slate-600">Absent: <strong>{Math.max(0, classStudents.length - presentStudents.length)}</strong></span>
                          </div>
                        </div>
                      </div>

                      {/* Student Attendance Grid */}
                      {classStudents.length === 0 ? (
                        <div className="text-center p-12 bg-white rounded-2xl border border-slate-200">
                          <p className="text-slate-400 font-bold text-sm">No students enrolled in {selectedClass} yet.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {classStudents.map(student => {
                            const isPresent = presentStudents.includes(student.id);
                            return (
                              <div 
                                key={student.id} 
                                onClick={() => toggleAttendance(student.id)}
                                className={`cursor-pointer rounded-2xl p-4 border-2 transition-all flex items-center gap-3 select-none ${
                                  isPresent 
                                    ? 'bg-emerald-50/80 border-emerald-400 shadow-sm shadow-emerald-100' 
                                    : 'bg-white border-slate-200 hover:border-indigo-300'
                                }`}
                              >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm overflow-hidden shrink-0 ${
                                  isPresent ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-100 text-slate-500'
                                }`}>
                                  {student.photo ? <img src={student.photo} alt={student.name} className="w-full h-full object-cover" /> : (student.name?.[0] || 'S')}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h5 className={`font-black text-xs truncate ${isPresent ? 'text-emerald-900' : 'text-slate-800'}`}>{student.name}</h5>
                                  <p className={`text-[10px] font-bold truncate ${isPresent ? 'text-emerald-600' : 'text-slate-400'}`}>{student.regNo} • {student.gender || 'Male'}</p>
                                </div>
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all ${
                                  isPresent ? 'bg-emerald-500 text-white scale-105 shadow-sm' : 'bg-slate-100 text-slate-300'
                                }`}>
                                  {isPresent ? <Check size={14} strokeWidth={3} /> : <div className="w-2 h-2 rounded-full bg-slate-300" />}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ─────────────────────────────────────────────────────────────
                      TAB 3: FEE STATUS & STUDENTS OWING (DEBTORS)
                  ───────────────────────────────────────────────────────────── */}
                  {activeTab === 'fees' && (
                    <div className="space-y-4 animate-in fade-in">
                      {/* Financial KPI Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Expected Revenue</span>
                          <span className="text-2xl font-black text-slate-900">₦{feeAnalysis.totalExpected.toLocaleString()}</span>
                          <span className="text-[10px] font-bold text-slate-400 block mt-1">{classStudents.length} Students</span>
                        </div>

                        <div className="bg-emerald-50/70 p-5 rounded-2xl border border-emerald-100 shadow-sm">
                          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block mb-1">Total Collected</span>
                          <span className="text-2xl font-black text-emerald-700">₦{feeAnalysis.totalCollected.toLocaleString()}</span>
                          <span className="text-[10px] font-bold text-emerald-600 block mt-1">{feeAnalysis.clearedCount} Fully Cleared</span>
                        </div>

                        <div className="bg-rose-50/70 p-5 rounded-2xl border border-rose-100 shadow-sm">
                          <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest block mb-1">Total Outstanding Debt</span>
                          <span className="text-2xl font-black text-rose-700">₦{feeAnalysis.totalDebt.toLocaleString()}</span>
                          <span className="text-[10px] font-bold text-rose-600 block mt-1">{feeAnalysis.owingCount} Student(s) Owing</span>
                        </div>

                        <div className="bg-purple-50/70 p-5 rounded-2xl border border-purple-100 shadow-sm flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest block mb-1">Collection Rate</span>
                            <span className="text-2xl font-black text-purple-800">
                              {feeAnalysis.totalExpected > 0 
                                ? `${Math.round((feeAnalysis.totalCollected / feeAnalysis.totalExpected) * 100)}%`
                                : '0%'}
                            </span>
                          </div>
                          <button
                            onClick={downloadDebtorsReport}
                            className="mt-2 w-full py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[11px] font-black transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                          >
                            <Download size={13} /> Export Debtors CSV
                          </button>
                        </div>
                      </div>

                      {/* Filter Bar & Search */}
                      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex gap-2">
                          {[
                            { id: 'all', label: 'All Students' },
                            { id: 'owing', label: `Owing (${feeAnalysis.owingCount})` },
                            { id: 'cleared', label: `Cleared (${feeAnalysis.clearedCount})` }
                          ].map(f => (
                            <button
                              key={f.id}
                              onClick={() => setFeeFilter(f.id)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-colors ${
                                feeFilter === f.id 
                                  ? 'bg-indigo-600 text-white shadow-sm' 
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {f.label}
                            </button>
                          ))}
                        </div>

                        <div className="relative flex-1 max-w-xs">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                          <input
                            type="text"
                            placeholder="Find debtor by name/reg..."
                            value={studentSearch}
                            onChange={(e) => setStudentSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      {/* Fee Table */}
                      {displayedStudents.length === 0 ? (
                        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
                          <CheckCircle2 size={36} className="mx-auto text-emerald-400 mb-2" />
                          <h4 className="text-base font-black text-slate-800">
                            {feeFilter === 'owing' ? '🎉 No Debtors in this Filter!' : 'No Student Records Found'}
                          </h4>
                          <p className="text-xs text-slate-400 mt-1">All selected students are in good financial standing.</p>
                        </div>
                      ) : (
                        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black uppercase text-slate-400 tracking-wider">
                                  <th className="py-3 px-4">Student</th>
                                  <th className="py-3 px-4">Reg No</th>
                                  <th className="py-3 px-4">Expected Fee</th>
                                  <th className="py-3 px-4">Amount Paid</th>
                                  <th className="py-3 px-4">Balance (Owing)</th>
                                  <th className="py-3 px-4">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                                {displayedStudents.map((s, idx) => (
                                  <tr key={s.id || idx} className="hover:bg-indigo-50/20 transition-colors">
                                    <td className="py-3.5 px-4 font-black text-slate-900">
                                      <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 font-black text-slate-600 flex items-center justify-center shrink-0 overflow-hidden text-xs">
                                          {s.photo ? <img src={s.photo} alt={s.name} className="w-full h-full object-cover" /> : (s.name?.[0] || 'S')}
                                        </div>
                                        <span>{s.name}</span>
                                      </div>
                                    </td>
                                    <td className="py-3.5 px-4 font-mono font-bold text-slate-500">{s.regNo}</td>
                                    <td className="py-3.5 px-4 font-mono font-bold">₦{s.expected.toLocaleString()}</td>
                                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-600">₦{s.paid.toLocaleString()}</td>
                                    <td className="py-3.5 px-4 font-mono font-extrabold text-rose-600">
                                      {s.balance > 0 ? `₦${s.balance.toLocaleString()}` : '₦0'}
                                    </td>
                                    <td className="py-3.5 px-4">
                                      {s.status === 'cleared' && (
                                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                                          ✓ Cleared
                                        </span>
                                      )}
                                      {s.status === 'partial' && (
                                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-200">
                                          Partial (₦{s.balance.toLocaleString()})
                                        </span>
                                      )}
                                      {s.status === 'owing' && (
                                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-200">
                                          Owing
                                        </span>
                                      )}
                                      {s.status === 'no_fee' && (
                                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold text-slate-400 bg-slate-100">
                                          No Fee Set
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ─────────────────────────────────────────────────────────────
                      TAB 4: DEMOGRAPHICS & ANALYTICS
                  ───────────────────────────────────────────────────────────── */}
                  {activeTab === 'demographics' && (
                    <div className="space-y-6 animate-in fade-in">
                      {/* Demographics Card */}
                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Gender Distribution</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 flex flex-col items-center justify-center">
                            <span className="font-black text-blue-700 uppercase tracking-widest text-[10px]">Male Students</span>
                            <span className="text-4xl font-black text-blue-900 mt-1">
                              {classStudents.filter(s => (s.gender || '').toLowerCase() === 'male' || (s.gender || '').toLowerCase() === 'm').length}
                            </span>
                          </div>
                          <div className="bg-pink-50 p-5 rounded-2xl border border-pink-100 flex flex-col items-center justify-center">
                            <span className="font-black text-pink-700 uppercase tracking-widest text-[10px]">Female Students</span>
                            <span className="text-4xl font-black text-pink-900 mt-1">
                              {classStudents.filter(s => (s.gender || '').toLowerCase() === 'female' || (s.gender || '').toLowerCase() === 'f').length}
                            </span>
                          </div>
                          <div className="bg-slate-100 p-5 rounded-2xl border border-slate-200 flex flex-col items-center justify-center">
                            <span className="font-black text-slate-700 uppercase tracking-widest text-[10px]">Total Enrolled</span>
                            <span className="text-4xl font-black text-slate-900 mt-1">{classStudents.length}</span>
                          </div>
                        </div>
                      </div>

                      {/* Performance Card */}
                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Academic Performance Overview</h4>
                        {performanceLoading ? (
                          <div className="flex justify-center p-6"><div className="animate-spin h-6 w-6 border-4 border-indigo-600 border-t-transparent rounded-full"></div></div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 flex flex-col items-center justify-center">
                              <span className="font-black text-emerald-700 uppercase tracking-widest text-[10px]">Class Average</span>
                              <span className="text-4xl font-black text-emerald-800 mt-1">{performanceData.overallAvg}%</span>
                            </div>
                            <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 flex flex-col items-center justify-center">
                              <span className="font-black text-blue-700 uppercase tracking-widest text-[10px]">Male Avg</span>
                              <span className="text-4xl font-black text-blue-800 mt-1">{performanceData.maleAvg}%</span>
                            </div>
                            <div className="bg-pink-50 p-5 rounded-2xl border border-pink-100 flex flex-col items-center justify-center">
                              <span className="font-black text-pink-700 uppercase tracking-widest text-[10px]">Female Avg</span>
                              <span className="text-4xl font-black text-pink-800 mt-1">{performanceData.femaleAvg}%</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Capacity Insight Section */}
      {(() => {
        if (loading || classStats.length === 0) return null;

        const totalStudents = classStats.reduce((s, c) => s + c.studentCount, 0);
        const avgPerClass   = totalStudents / classStats.length;
        const maxCount      = Math.max(...classStats.map(c => c.studentCount));
        const balancePct    = maxCount > 0 ? Math.round((avgPerClass / maxCount) * 100) : 0;
        const largestClass  = classStats.reduce((a, b) => b.studentCount > a.studentCount ? b : a, classStats[0]);
        const smallestClass = classStats.reduce((a, b) => b.studentCount < a.studentCount ? b : a, classStats[0]);
        const balanceColor  = balancePct >= 80 ? 'text-emerald-400' : balancePct >= 60 ? 'text-amber-400' : 'text-rose-400';
        const statusMsg     = balancePct >= 80
          ? 'Classes are well-balanced. Distribution is at optimal levels.'
          : balancePct >= 60
          ? `Moderate imbalance detected. ${largestClass.name} has the most students (${largestClass.studentCount}).`
          : `Significant imbalance. Consider redistributing students from ${largestClass.name} (${largestClass.studentCount} students) to ${smallestClass.name} (${smallestClass.studentCount} students).`;

        const downloadReport = () => {
          const rows = [
            ['Class', 'Total Students', 'Male', 'Female', 'Subjects', 'Form Teacher ID'],
            ...classStats.map(c => [c.name, c.studentCount, c.maleCount, c.femaleCount, c.subjectCount, c.formTeacherId || 'Unassigned'])
          ];
          const csv  = rows.map(r => r.join(',')).join('\n');
          const blob = new Blob([csv], { type: 'text/csv' });
          const url  = URL.createObjectURL(blob);
          const a    = document.createElement('a');
          a.href     = url;
          a.download = `capacity-report-${new Date().toISOString().split('T')[0]}.csv`;
          a.click();
          URL.revokeObjectURL(url);
        };

        return (
          <div className="bg-indigo-900 text-white p-8 rounded-[2rem] relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
            <div className="relative z-10 text-left flex-1">
              <h4 className="text-indigo-200 text-xs font-black uppercase tracking-widest mb-2">Capacity Insight</h4>
              <h3 className="text-2xl font-bold mb-3">
                Class Balanced Distribution is at{' '}
                <span className={`font-black ${balanceColor}`}>{balancePct}%</span>
              </h3>
              <p className="text-indigo-300 max-w-md text-sm leading-relaxed">{statusMsg}</p>
              <div className="flex flex-wrap gap-2 mt-4">
                {classStats.map(c => (
                  <span
                    key={c.id}
                    className="text-[11px] font-black px-3 py-1 rounded-full bg-white/10 text-indigo-100 backdrop-blur-sm"
                  >
                    {c.name}: <span className="text-white">{c.studentCount}</span>
                  </span>
                ))}
              </div>
            </div>
            <div className="relative z-10 flex flex-col items-center gap-3">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl px-8 py-4 text-center border border-white/20">
                <p className="text-indigo-300 text-xs font-black uppercase tracking-widest mb-1">Total Students</p>
                <p className="text-5xl font-black text-white">{totalStudents}</p>
                <p className="text-indigo-300 text-xs mt-1">{classStats.length} classes</p>
              </div>
              <button
                onClick={downloadReport}
                className="w-full bg-white text-indigo-900 px-6 py-3 rounded-2xl font-black hover:bg-indigo-50 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2 text-sm"
              >
                <Download size={16} /> Download CSV Report
              </button>
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full -ml-16 -mb-16 blur-2xl"></div>
          </div>
        );
      })()}

      {/* Batch Action Confirmation Modal */}
      {batchActionModal && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6 sm:p-8 animate-in zoom-in-95 border border-slate-100 text-left">
            <div className="flex justify-between items-start mb-5">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 ${
                  batchActionModal.type === 'remove' 
                    ? 'bg-amber-500 shadow-lg shadow-amber-500/30' 
                    : batchActionModal.type === 'transfer' 
                      ? 'bg-indigo-600 shadow-lg shadow-indigo-500/30' 
                      : 'bg-rose-600 shadow-lg shadow-rose-500/30'
                }`}>
                  {batchActionModal.type === 'remove' && <UserMinus size={24} />}
                  {batchActionModal.type === 'transfer' && <ArrowRightLeft size={24} />}
                  {batchActionModal.type === 'delete' && <Trash2 size={24} />}
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 m-0">
                    {batchActionModal.type === 'remove' && (
                      batchActionModal.singleStudent 
                        ? `Remove Student from ${selectedClass}` 
                        : `Batch Remove Students from ${selectedClass}`
                    )}
                    {batchActionModal.type === 'transfer' && (
                      batchActionModal.singleStudent 
                        ? `Transfer Student to Another Class` 
                        : `Batch Transfer Students`
                    )}
                    {batchActionModal.type === 'delete' && (
                      batchActionModal.singleStudent 
                        ? `Permanently Delete Student` 
                        : `Permanently Delete Selected Students`
                    )}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium m-0 mt-0.5">
                    {batchActionModal.singleStudent 
                      ? `1 student selected (${batchActionModal.singleStudent.name})` 
                      : `${selectedStudentIds.length} student(s) selected`}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => !batchProcessing && setBatchActionModal(null)}
                disabled={batchProcessing}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body content based on modal type */}
            <div className="space-y-4">
              {batchActionModal.type === 'remove' && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 space-y-2">
                  <p className="font-bold flex items-center gap-1.5 text-amber-800 m-0">
                    <AlertTriangle size={15} /> Student profiles will be retained
                  </p>
                  <p className="m-0 text-[11px] leading-relaxed">
                    The selected student(s) will be unassigned from <strong>{selectedClass}</strong>. Their registration numbers, marks, and profile records remain safely stored in the database.
                  </p>
                </div>
              )}

              {batchActionModal.type === 'transfer' && (
                <div className="space-y-3">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-600 block">
                    Select Destination Class:
                  </label>
                  <select
                    value={batchActionModal.targetClass || ''}
                    onChange={(e) => setBatchActionModal(prev => ({ ...prev, targetClass: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-black text-slate-800 outline-none focus:border-indigo-600 focus:bg-white transition-all cursor-pointer"
                  >
                    {classes.filter(c => c !== selectedClass).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400 m-0">
                    Selected student(s) will be immediately moved from <strong>{selectedClass}</strong> to <strong>{batchActionModal.targetClass || 'the chosen class'}</strong>.
                  </p>
                </div>
              )}

              {batchActionModal.type === 'delete' && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs text-rose-900 space-y-2">
                  <p className="font-bold flex items-center gap-1.5 text-rose-800 m-0">
                    <AlertTriangle size={15} /> Irreversible Action
                  </p>
                  <p className="m-0 text-[11px] leading-relaxed">
                    This will permanently delete the student records from the database. This action cannot be undone.
                  </p>
                </div>
              )}

              {/* Selected Students Preview List */}
              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 max-h-36 overflow-y-auto space-y-1.5 custom-scrollbar">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                  Affected Student(s):
                </span>
                {(() => {
                  const targetStudents = batchActionModal.singleStudent 
                    ? [batchActionModal.singleStudent] 
                    : classStudents.filter(s => selectedStudentIds.includes(s.id));
                  return targetStudents.map(s => (
                    <div key={s.id} className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-white border border-slate-100 shadow-2xs">
                      <span className="font-bold text-slate-800">{s.name}</span>
                      <span className="font-mono text-[11px] text-indigo-600 font-bold">{s.regNo || 'No Reg'}</span>
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-slate-100">
              <button
                onClick={() => setBatchActionModal(null)}
                disabled={batchProcessing}
                className="px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 text-xs hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const ids = batchActionModal.singleStudent 
                    ? [batchActionModal.singleStudent.id] 
                    : selectedStudentIds;
                  if (batchActionModal.type === 'remove') handleConfirmBatchRemove(ids);
                  else if (batchActionModal.type === 'transfer') handleConfirmBatchTransfer(batchActionModal.targetClass, ids);
                  else if (batchActionModal.type === 'delete') handleConfirmBatchDelete(ids);
                }}
                disabled={batchProcessing || (batchActionModal.type === 'transfer' && !batchActionModal.targetClass)}
                className={`px-5 py-2.5 rounded-xl text-white font-black text-xs flex items-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer ${
                  batchActionModal.type === 'remove'
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-200'
                    : batchActionModal.type === 'transfer'
                      ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                      : 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
                }`}
              >
                {batchProcessing ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Processing…</span>
                  </>
                ) : (
                  <>
                    {batchActionModal.type === 'remove' && <UserMinus size={14} />}
                    {batchActionModal.type === 'transfer' && <ArrowRightLeft size={14} />}
                    {batchActionModal.type === 'delete' && <Trash2 size={14} />}
                    <span>
                      {batchActionModal.type === 'remove' && 'Confirm Removal'}
                      {batchActionModal.type === 'transfer' && 'Confirm Transfer'}
                      {batchActionModal.type === 'delete' && 'Confirm Deletion'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Toast Notification */}
      {batchToast.show && (
        <div className={`fixed bottom-6 right-6 z-[70] p-4 rounded-2xl shadow-2xl flex items-center gap-3 border animate-in slide-in-from-bottom-5 duration-300 ${
          batchToast.type === 'success' 
            ? 'bg-emerald-900 text-emerald-100 border-emerald-700' 
            : 'bg-rose-900 text-rose-100 border-rose-700'
        }`}>
          {batchToast.type === 'success' ? (
            <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle size={18} className="text-rose-400 shrink-0" />
          )}
          <span className="text-xs font-bold">{batchToast.message}</span>
        </div>
      )}

      {/* Bulk Enroll Modal */}
      <BulkStudentEnrollModal 
        isOpen={showBulkEnroll}
        initialClass={bulkEnrollTargetClass}
        onClose={() => setShowBulkEnroll(false)}
        onEnrolled={() => {
          fetchClassStats();
          if (selectedClass) {
            openManageDetails(selectedClass, activeTab);
          }
        }}
      />
    </div>
  );
};

export default ClassManagement;
