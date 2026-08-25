import React, { useState, useEffect } from 'react';
import { db, storage } from '../../lib/firebase';
import { ensureFirebaseAuth } from '../../lib/ensureAuth';
import { collection, query, getDocs, addDoc, doc, updateDoc, deleteDoc, orderBy, where, setDoc, serverTimestamp } from 'firebase/firestore';
import { uploadAvatar } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Users, UserPlus, GraduationCap, Mail, Search, Trash2, Edit2, CheckCircle, AlertCircle, Loader2, X, Filter, BookOpen, Camera, Upload, Award, ArrowUpDown, History, ClipboardList, Printer, MoreVertical, KeyRound, Lock, RefreshCw, Sparkles, Eye, EyeOff, Phone, Copy, Check, ShieldCheck, Layers, MessageCircle } from 'lucide-react';
import { getSubjectsForClass } from '../../utils/subjectConfig';
import ImageCropperModal from '../../components/ImageCropperModal';
import StudentAvatar from '../../components/StudentAvatar';
import GlobalPhotoUploader from '../../components/GlobalPhotoUploader';
import StudentFormModal from '../../components/StudentFormModal';
import { formatDateForInput } from '../../utils/dateFormatter';
import { useGlobalClasses } from '../../utils/classUtils';
import { generateUniqueRegNoSync } from '../../utils/regNoGenerator';
import { generateWhatsAppPinReset } from '../../utils/whatsapp';

const StudentManagement = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const classes = useGlobalClasses();
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
  const [copiedRegId, setCopiedRegId] = useState(null);
  // Promote/Demote state
  const [promoteModal, setPromoteModal] = useState(null); // { student }
  const [newClass, setNewClass] = useState('');
  const [promoting, setPromoting] = useState(false);
  
  // Admin Subject Registration state
  const [subjectRegModal, setSubjectRegModal] = useState(null); // { student }
  const [adminSelectedSubjects, setAdminSelectedSubjects] = useState([]);
  const [savingSubjects, setSavingSubjects] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);

  // Reset PIN state
  const [resetPinModal, setResetPinModal] = useState(null); // { student }
  const [pinMode, setPinMode] = useState('clear'); // 'clear' or 'custom'
  const [newPinValue, setNewPinValue] = useState('');
  const [showPinValue, setShowPinValue] = useState(false);
  const [resettingPin, setResettingPin] = useState(false);

  const copyRegNo = (reg, id, e) => {
    if (e) e.stopPropagation();
    if (!reg) return;
    navigator.clipboard.writeText(reg);
    setCopiedRegId(id);
    setTimeout(() => setCopiedRegId(null), 2000);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.dropdown-container')) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);
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

  const openResetPinModal = (student) => {
    setResetPinModal({ student });
    setPinMode('clear');
    setNewPinValue('');
    setShowPinValue(false);
  };

  const handleResetPinSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!resetPinModal?.student) return;

    if (pinMode === 'custom') {
      if (!newPinValue || newPinValue.length !== 6 || !/^\d{6}$/.test(newPinValue)) {
        setStatus({ type: 'error', message: 'Please enter a valid 6-digit numerical PIN.' });
        return;
      }
    }

    setResettingPin(true);
    try {
      await ensureFirebaseAuth();
      const student = resetPinModal.student;
      const studentRef = doc(db, 'students', student.id);

      if (pinMode === 'clear') {
        await updateDoc(studentRef, {
          pin: null,
          securityQuestion: null,
          securityAnswer: null,
          updatedAt: new Date().toISOString()
        });
        setStatus({
          type: 'success',
          message: `PIN cleared for ${student.name}. Student will be prompted to set a new PIN on next login.`
        });
      } else {
        await updateDoc(studentRef, {
          pin: newPinValue,
          pinUpdatedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        const sEmail = (student.email || student.mail || student.e || '').trim();
        const sPhone = (student.phone || student.phoneNo || student.phoneNumber || student.tel || student.p || '').trim();
        const sName = student.name || student.n || student['STUDENT NAME'] || 'Student';
        const sReg = student.regNo || student.r || student['REG NO'] || 'N/A';
        const sClass = student.className || student.c || student.class || '';

        const hasEmail = Boolean(sEmail);
        const hasPhone = Boolean(sPhone);

        if (hasEmail || hasPhone) {
          // Send to student inbox
          await addDoc(collection(db, 'notifications'), {
            title: 'Your Portal PIN Has Been Assigned',
            body: `Hello ${sName}, your school portal login PIN has been updated by Administration to: ${newPinValue}. Please use this PIN to log in.`,
            targetType: 'student',
            targetValue: sReg,
            recipientName: sName,
            sender: 'School Administration',
            createdAt: new Date().toISOString(),
            type: 'pin_assigned'
          });

          // Send via external notification (Email / SMS)
          try {
            const { sendNotification } = await import('../../utils/notifications');
            const recipients = [{
              email: sEmail,
              phone: sPhone,
              name: sName
            }];
            const notifyType = hasEmail && hasPhone ? 'both' : hasEmail ? 'email' : 'sms';
            await sendNotification({
              type: notifyType,
              subject: 'School Portal PIN Assignment',
              message: `Hello ${sName} (${sReg}), the School Administrator has set your portal login PIN to: ${newPinValue}`,
              recipients
            });
          } catch (notifyErr) {
            console.warn('External notification dispatch warning:', notifyErr);
          }

          const dest = [hasEmail ? 'Email' : '', hasPhone ? 'WhatsApp / SMS' : ''].filter(Boolean).join(' and ');
          
          let whatsAppUrl = null;
          if (hasPhone) {
            try {
              const waData = generateWhatsAppPinReset({
                phone: sPhone,
                studentName: sName,
                regNo: sReg,
                newPin: newPinValue,
                className: sClass
              });
              whatsAppUrl = waData.url;
            } catch (waErr) {
              console.warn('WhatsApp URL generation error:', waErr);
            }
          }

          setStatus({
            type: 'success',
            message: `PIN set to ${newPinValue} for ${sName} and sent to registered ${dest} & inbox.`,
            whatsAppUrl
          });
        } else {
          // Neither email nor phone on profile -> Route to Admin Inbox
          await addDoc(collection(db, 'notifications'), {
            title: `Admin PIN Assignment: ${sName} (${sReg})`,
            body: `Admin assigned a new PIN (${newPinValue}) for student ${sName} (${sReg} - ${sClass}). Since no email or phone is linked to the student profile, this notice has been recorded in the Admin Inbox.`,
            targetType: 'admin',
            targetValue: 'admin',
            studentId: student.id,
            studentName: sName,
            regNo: sReg,
            className: sClass,
            assignedPin: newPinValue,
            sender: 'School Administration',
            createdAt: new Date().toISOString(),
            type: 'admin_pin_record'
          });

          // Also put in student personal inbox
          await addDoc(collection(db, 'notifications'), {
            title: 'Portal PIN Updated',
            body: `Hello ${sName}, your portal login PIN has been updated by Administration. Because no email or phone is linked to your profile, the PIN record was routed to the Admin Inbox. Please contact Admin if you need assistance.`,
            targetType: 'student',
            targetValue: sReg,
            recipientName: sName,
            sender: 'School Administration',
            createdAt: new Date().toISOString(),
            type: 'pin_assigned'
          });

          setStatus({
            type: 'success',
            message: `PIN set to ${newPinValue} for ${sName}. (No email/phone on profile; notification routed to Admin Inbox).`
          });
        }
      }

      setResetPinModal(null);
      await fetchStudents();
    } catch (err) {
      console.error('Error resetting student PIN:', err);
      setStatus({ type: 'error', message: 'Failed to update student PIN. Please try again.' });
    } finally {
      setResettingPin(false);
    }
  };

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
    if (showModal && !isEditing && currentStudent.className) {
      const existingSet = new Set(students.map(s => s.regNo).filter(Boolean));
      const generatedRegNo = generateUniqueRegNoSync(currentStudent.className, existingSet);
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
      await ensureFirebaseAuth();
      const { id, ...saveData } = currentStudent;
      let targetStudentId = id;

      if (isEditing) {
        await updateDoc(doc(db, 'students', id), {
          ...saveData,
          updatedAt: new Date().toISOString()
        });
        setStatus({ type: 'success', message: 'Student updated successfully!' });
      } else {
        const docRef = await addDoc(collection(db, 'students'), {
          ...saveData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        targetStudentId = docRef.id;
        setStatus({ type: 'success', message: 'Student registered successfully!' });
      }

      // If a 6-digit PIN was provided or changed during save
      if (saveData.pin && /^\d{6}$/.test(saveData.pin)) {
        const sEmail = (saveData.email || '').trim();
        const sPhone = (saveData.phone || '').trim();
        const sName = saveData.name || 'Student';
        const sReg = saveData.regNo || 'N/A';
        const sClass = saveData.className || '';

        const hasEmail = Boolean(sEmail);
        const hasPhone = Boolean(sPhone);

        if (hasEmail || hasPhone) {
          await addDoc(collection(db, 'notifications'), {
            title: 'Your Portal Login PIN',
            body: `Hello ${sName}, your portal login PIN is: ${saveData.pin}. Please use this to sign in.`,
            targetType: 'student',
            targetValue: sReg,
            recipientName: sName,
            sender: 'School Administration',
            createdAt: new Date().toISOString(),
            type: 'pin_assigned'
          });

          try {
            const { sendNotification } = await import('../../utils/notifications');
            const recipients = [{ email: sEmail, phone: sPhone, name: sName }];
            const notifyType = hasEmail && hasPhone ? 'both' : hasEmail ? 'email' : 'sms';
            await sendNotification({
              type: notifyType,
              subject: 'School Portal PIN Assignment',
              message: `Hello ${sName} (${sReg}), your portal login PIN is: ${saveData.pin}`,
              recipients
            });
          } catch (notifyErr) {
            console.warn('External notification dispatch warning:', notifyErr);
          }
        } else {
          await addDoc(collection(db, 'notifications'), {
            title: `PIN Record: ${sName} (${sReg})`,
            body: `Portal PIN (${saveData.pin}) assigned for ${sName} (${sReg} - ${sClass}). No email/phone was found on profile, so this record was routed to the Admin Inbox.`,
            targetType: 'admin',
            targetValue: 'admin',
            studentId: targetStudentId,
            studentName: sName,
            regNo: sReg,
            className: sClass,
            assignedPin: saveData.pin,
            sender: 'School Administration',
            createdAt: new Date().toISOString(),
            type: 'admin_pin_record'
          });
        }
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

  const handleConfirmAdmission = async (student) => {
    if (!student?.id) return;
    try {
      await updateDoc(doc(db, 'students', student.id), {
        admissionConfirmed: true,
        paymentConfirmed: true,
        requiresAdminConfirmation: false,
        classActivated: true,
        status: 'active',
        activatedAt: serverTimestamp(),
        activationConfirmedBy: 'Admin',
        activationConfirmedRole: 'admin',
      });
      setStatus({ type: 'success', message: `${student.name} has been activated for class access.` });
      fetchStudents();
    } catch (error) {
      console.error('Admission confirmation failed:', error);
      setStatus({ type: 'error', message: 'Failed to confirm admission.' });
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
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all focus:outline-none ${allowProfileEdit ? 'bg-purple-600 ring-4 ring-purple-50' : 'bg-slate-200'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${allowProfileEdit ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
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
        <div className="overflow-x-auto text-left min-h-[400px]">
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
                      <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-black overflow-hidden text-[10px] shadow-sm">
                        {student.photo ? (
                          <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
                        ) : (
                          <StudentAvatar gender={student.gender} avatarId={student.avatarId} size="100%" className="opacity-90" />
                        )}
                      </div>
                      <p className="font-bold text-slate-900">{student.name}</p>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-xs font-mono font-bold text-slate-600">{student.regNo}</span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col items-start gap-1">
                      <span className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full uppercase">{student.className}</span>
                      {student.status === 'pending_activation' || student.requiresAdminConfirmation || student.admissionConfirmed === false ? (
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600">Pending Activation</span>
                      ) : (
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Active</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    {(() => {
                      const isMale = student.gender === 'Male' || student.gender === 'M' || (student.gender && student.gender.toLowerCase().startsWith('m'));
                      return (
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isMale ? 'text-blue-500' : 'text-pink-500'}`}>
                          {isMale ? 'Male' : 'Female'}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-8 py-5 text-right relative dropdown-container">
                    <button 
                      onClick={() => setActiveDropdown(activeDropdown === student.id ? null : student.id)}
                      className="p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors focus:outline-none"
                    >
                      <MoreVertical size={16} />
                    </button>
                    
                    {activeDropdown === student.id && (
                      <div className="absolute right-12 top-0 mt-2 w-48 bg-white/95 backdrop-blur-xl shadow-2xl border border-slate-100 p-1.5 rounded-2xl z-50 flex flex-col gap-0.5">
                        <button 
                          onClick={() => { setActiveDropdown(null); navigate(`/admin/student-results?regNo=${encodeURIComponent(student.regNo)}&className=${encodeURIComponent(student.className)}&name=${encodeURIComponent(student.name)}`) }} 
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 transition-colors text-xs font-bold text-left w-full"
                        >
                          <Award size={15} strokeWidth={2.5} /> View Results
                        </button>
                        
                        <button 
                          onClick={() => { 
                            setActiveDropdown(null);
                            const printUrl = `/admin/student-results?regNo=${encodeURIComponent(student.regNo)}&className=${encodeURIComponent(student.className)}&name=${encodeURIComponent(student.name)}&print=1`;
                            const win = window.open(printUrl, '_blank', 'width=900,height=700');
                            if (win) { win.onload = () => { setTimeout(() => win.print(), 1200); }; }
                          }} 
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-purple-50 text-slate-600 hover:text-purple-600 transition-colors text-xs font-bold text-left w-full"
                        >
                          <Printer size={15} strokeWidth={2.5} /> Print Result
                        </button>
                        
                        {(student.status === 'pending_activation' || student.requiresAdminConfirmation || student.admissionConfirmed === false) && (
                          <button 
                            onClick={() => { setActiveDropdown(null); handleConfirmAdmission(student); }} 
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 transition-colors text-xs font-bold text-left w-full"
                          >
                            <CheckCircle size={15} strokeWidth={2.5} /> Confirm Admission
                          </button>
                        )}
                        
                        <button 
                          onClick={() => { setActiveDropdown(null); setPromoteModal({ student }); setNewClass(student.className); }} 
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-amber-50 text-slate-600 hover:text-amber-600 transition-colors text-xs font-bold text-left w-full"
                        >
                          <ArrowUpDown size={15} strokeWidth={2.5} /> Promote / Demote
                        </button>
                        
                        {(student.className?.startsWith('SS2') || student.className?.startsWith('SS3')) && (
                          <button 
                            onClick={() => { setActiveDropdown(null); openSubjectRegModal(student); }} 
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-pink-50 text-slate-600 hover:text-pink-600 transition-colors text-xs font-bold text-left w-full"
                          >
                            <ClipboardList size={15} strokeWidth={2.5} /> Subjects
                          </button>
                        )}
                        
                        <button 
                          onClick={() => { setActiveDropdown(null); openResetPinModal(student); }} 
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-amber-50 text-slate-600 hover:text-amber-700 transition-colors text-xs font-bold text-left w-full"
                        >
                          <KeyRound size={15} strokeWidth={2.5} className="text-amber-500" /> Reset PIN
                        </button>
                        
                        <div className="w-full h-px bg-slate-100 my-1"></div>
                        
                        <button 
                          onClick={() => { setActiveDropdown(null); setIsEditing(true); setCurrentStudent(student); setShowModal(true); }} 
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-blue-50 text-slate-600 hover:text-blue-600 transition-colors text-xs font-bold text-left w-full"
                        >
                          <Edit2 size={15} strokeWidth={2.5} /> Edit Student
                        </button>
                        
                        <button 
                          onClick={() => { setActiveDropdown(null); handleDelete(student.id); }} 
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-rose-50 text-slate-600 hover:text-rose-600 transition-colors text-xs font-bold text-left w-full"
                        >
                          <Trash2 size={15} strokeWidth={2.5} /> Delete Student
                        </button>
                      </div>
                    )}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">

            {/* Header */}
            <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 text-white px-8 py-6 shrink-0">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-1">Student Transfer</p>
                  <h3 className="text-xl font-black text-white">Promote / Demote</h3>
                </div>
                <button onClick={() => setPromoteModal(null)} className="p-2 rounded-xl hover:bg-white/10 transition-colors text-slate-300">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 custom-scrollbar">
              <div className="p-6 space-y-5">

                {/* Student Identity Card */}
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center font-black text-xl text-slate-600 overflow-hidden shrink-0 shadow-inner">
                    {promoteModal.student.photo
                      ? <img src={promoteModal.student.photo} alt="" className="w-full h-full object-cover" />
                      : promoteModal.student.name[0]}
                  </div>
                  <div>
                    <p className="font-black text-slate-900 text-base leading-tight">{promoteModal.student.name}</p>
                    <p className="text-xs font-mono text-slate-400 mt-0.5">{promoteModal.student.regNo}</p>
                    {(() => {
                      const isMale = promoteModal.student.gender === 'Male' || promoteModal.student.gender === 'M' || (promoteModal.student.gender && promoteModal.student.gender.toLowerCase().startsWith('m'));
                      return (
                        <span className={`inline-block mt-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${isMale ? 'bg-blue-50 text-blue-500' : 'bg-pink-50 text-pink-500'}`}>
                          {isMale ? 'Male' : 'Female'}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                {/* Class Transfer Visualizer */}
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Class Transfer</p>
                  <div className="flex items-center gap-3">
                    {/* Current Class */}
                    <div className="flex-1 bg-rose-50 border-2 border-rose-100 rounded-2xl p-4 text-center">
                      <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-1">From</p>
                      <p className="text-lg font-black text-rose-700">{promoteModal.student.className}</p>
                    </div>
                    {/* Arrow */}
                    <div className="flex flex-col items-center gap-0.5 shrink-0">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                        <ArrowUpDown size={16} className="text-slate-500" />
                      </div>
                    </div>
                    {/* New Class */}
                    <div className="flex-1 bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4 text-center">
                      <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1">To</p>
                      <select
                        value={newClass}
                        onChange={(e) => setNewClass(e.target.value)}
                        className="w-full text-center font-black text-emerald-700 bg-transparent outline-none text-sm border-b-2 border-emerald-300 focus:border-emerald-600 transition-colors cursor-pointer"
                      >
                        {classes.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  {newClass === promoteModal.student.className && (
                    <p className="text-[10px] font-bold text-amber-600 mt-2 text-center">⚠ Please select a different class to proceed</p>
                  )}
                </div>

                {/* Class History Timeline */}
                {promoteModal.student.classHistory?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <History size={11} /> Transfer History ({promoteModal.student.classHistory.length})
                    </p>
                    <div className="space-y-2 max-h-36 overflow-y-auto custom-scrollbar pr-1">
                      {[...promoteModal.student.classHistory].reverse().map((h, i) => (
                        <div key={i} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-500 bg-slate-200 px-2 py-0.5 rounded-md">{h.from}</span>
                            <span className="text-slate-300 text-xs">→</span>
                            <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">{h.to}</span>
                          </div>
                          <span className="text-[10px] font-bold text-slate-400">{new Date(h.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Pinned Footer */}
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setPromoteModal(null)}
                className="flex-1 py-3.5 bg-slate-200 text-slate-700 rounded-2xl font-black hover:bg-slate-300 transition-all active:scale-95 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handlePromote}
                disabled={promoting || newClass === promoteModal.student.className}
                className="flex-2 px-8 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 transition-all active:scale-95 disabled:opacity-50 text-sm"
              >
                {promoting ? <Loader2 size={16} className="animate-spin" /> : <ArrowUpDown size={16} />}
                {promoting ? 'Moving…' : 'Confirm Transfer'}
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

      {/* Reset Student PIN Modal */}
      {resetPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white px-7 py-6 shrink-0">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                    <KeyRound size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-400 mb-0.5">Authentication Control</p>
                    <h3 className="text-xl font-black text-white">Reset Student PIN</h3>
                  </div>
                </div>
                <button 
                  onClick={() => setResetPinModal(null)} 
                  className="p-2 rounded-xl hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Student Summary Info */}
              <div className="flex items-center gap-3.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-indigo-200 text-indigo-700 flex items-center justify-center font-black text-lg overflow-hidden shrink-0 shadow-inner">
                  {resetPinModal.student.photo ? (
                    <img src={resetPinModal.student.photo} alt="" className="w-full h-full object-cover" />
                  ) : (
                    resetPinModal.student.name?.[0] || 'S'
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-black text-slate-900 text-sm truncate">{resetPinModal.student.name}</p>
                  <p className="text-xs font-mono text-slate-500 truncate">{resetPinModal.student.regNo} • {resetPinModal.student.className}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[10px] font-bold text-slate-400">Current PIN:</span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      resetPinModal.student.pin 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {resetPinModal.student.pin ? 'Active (Set)' : 'Not Configured'}
                    </span>
                    {(resetPinModal.student.phone || resetPinModal.student.p) && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                        <MessageCircle size={11} /> WhatsApp: {resetPinModal.student.phone || resetPinModal.student.p}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Mode Selection Options */}
              <div className="space-y-2.5">
                <p className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Select Reset Method</p>
                
                {/* Option 1: Clear PIN */}
                <div
                  onClick={() => setPinMode('clear')}
                  className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                    pinMode === 'clear'
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      pinMode === 'clear' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'
                    }`}>
                      {pinMode === 'clear' && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <RefreshCw size={13} className="text-indigo-600" /> Clear PIN (Prompt on Next Login)
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Erases the existing PIN so the student creates their own new PIN next time.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Option 2: Set New Custom PIN */}
                <div
                  onClick={() => setPinMode('custom')}
                  className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                    pinMode === 'custom'
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      pinMode === 'custom' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'
                    }`}>
                      {pinMode === 'custom' && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <Lock size={13} className="text-indigo-600" /> Assign New 6-Digit PIN
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Directly sets a new 6-digit numerical PIN chosen by the administrator.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Custom PIN Input Field */}
              {pinMode === 'custom' && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">Enter New 6-Digit PIN</label>
                    <button
                      type="button"
                      onClick={() => setNewPinValue(String(Math.floor(100000 + Math.random() * 900000)))}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                    >
                      <Sparkles size={12} /> Generate Random
                    </button>
                  </div>
                  
                  <div className="relative">
                    <input
                      type={showPinValue ? 'text' : 'password'}
                      maxLength={6}
                      value={newPinValue}
                      onChange={(e) => setNewPinValue(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="e.g. 123456"
                      className="w-full bg-white border-2 border-slate-200 focus:border-indigo-600 rounded-xl px-4 py-2.5 text-center text-lg font-mono font-black tracking-widest outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPinValue(!showPinValue)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                      {showPinValue ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 text-center font-medium">
                    {newPinValue.length}/6 digits entered
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setResetPinModal(null)}
                className="flex-1 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-2xl font-black transition-all text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetPinSubmit}
                disabled={resettingPin || (pinMode === 'custom' && newPinValue.length !== 6)}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 transition-all text-xs disabled:opacity-50"
              >
                {resettingPin ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />}
                <span>{resettingPin ? 'Updating...' : 'Confirm Reset PIN'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <StudentFormModal
        showModal={showModal}
        setShowModal={setShowModal}
        isEditing={isEditing}
        currentStudent={currentStudent}
        setCurrentStudent={setCurrentStudent}
        uploading={uploading}
        handlePhotoSelect={handlePhotoSelect}
        classes={classes}
        handleSave={handleSave}
        saving={saving}
        formatDateForInput={formatDateForInput}
      />


      {status.message && (
        <div className={`fixed bottom-8 right-8 p-4 rounded-2xl shadow-2xl flex flex-col md:flex-row items-start md:items-center gap-3 animate-in slide-in-from-bottom-8 ${
          status.type === 'success' ? 'bg-indigo-600' : 'bg-rose-600'
        } text-white z-[110]`}>
          <div className="flex items-center gap-2">
            <CheckCircle size={20} className="shrink-0" />
            <span className="font-bold tracking-tight text-xs md:text-sm">{status.message}</span>
          </div>

          {status.whatsAppUrl && (
            <a
              href={status.whatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-700/40 transition-all shrink-0"
            >
              <MessageCircle size={14} /> Send PIN via WhatsApp
            </a>
          )}
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

      {/* Floating Enroll Button */}
      <button 
        onClick={() => { 
          setIsEditing(false); 
          setCurrentStudent({ 
            name: '', regNo: '', className: 'JSS1', gender: 'Male', email: '',
            phone: '', dob: '', house: '', photo: ''
          }); 
          setShowModal(true); 
        }}
        className="fixed bottom-8 right-8 z-[100] flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-4 rounded-full font-bold hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-300 active:scale-95 hover:scale-105 group"
      >
        <UserPlus size={24} />
        <span className="hidden sm:inline">Enroll New Student</span>
        <span className="sm:hidden inline">Enroll</span>
      </button>
    </div>
  );
};

export default StudentManagement;
