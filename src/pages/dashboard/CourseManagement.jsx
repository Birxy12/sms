import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, getDocs, addDoc, doc, updateDoc, deleteDoc, orderBy, writeBatch } from 'firebase/firestore';
import { BookOpen, Plus, Trash2, Edit2, CheckCircle, AlertCircle, Loader2, X, Search, User, Database, Filter, UserPlus, Save } from 'lucide-react';
import { CLASS_LIST, getSubjectsForClass } from '../../utils/subjectConfig';

const CourseManagement = () => {
  const [firestoreSubjects, setFirestoreSubjects] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('JSS1');
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentSubject, setCurrentSubject] = useState({ name: '', department: 'General', teacherId: '', teacherName: '', class: 'JSS1' });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  // Track inline teacher assignments: { subjectKey: teacherId }
  const [pendingAssignments, setPendingAssignments] = useState({});

  const classes = CLASS_LIST;

  const fetchData = async () => {
    setLoading(true);
    try {
      const subjectsSnap = await getDocs(query(collection(db, 'subjects'), orderBy('name', 'asc')));
      const subjectsList = subjectsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setFirestoreSubjects(subjectsList);

      const staffSnap = await getDocs(query(collection(db, 'staff'), orderBy('name', 'asc')));
      const staffList = staffSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setStaff(staffList);
    } catch (error) {
      console.error('Error fetching data:', error);
      setStatus({ type: 'error', message: 'Failed to load records.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (status.message) {
      const t = setTimeout(() => setStatus({ type: '', message: '' }), 4000);
      return () => clearTimeout(t);
    }
  }, [status]);

  // Build the merged subject list: config defaults + any extra Firestore-only subjects
  const subjectsForTab = useMemo(() => {
    const configSubjects = getSubjectsForClass(activeTab);
    const fsForClass = firestoreSubjects.filter(s => s.class === activeTab);
    const fsMap = {};
    fsForClass.forEach(fs => { fsMap[fs.name.toUpperCase()] = fs; });

    // Start with config subjects, attach Firestore data if it exists
    const merged = configSubjects.map(name => {
      const fs = fsMap[name.toUpperCase()];
      return {
        name,
        class: activeTab,
        id: fs?.id || null,
        teacherId: fs?.teacherId || '',
        teacherName: fs?.teacherName || '',
        department: fs?.department || 'General',
        inFirestore: !!fs,
      };
    });

    // Add any Firestore subjects not in the config (custom subjects admin added)
    const configUpper = new Set(configSubjects.map(s => s.toUpperCase()));
    fsForClass.forEach(fs => {
      if (!configUpper.has(fs.name.toUpperCase())) {
        merged.push({
          ...fs,
          inFirestore: true,
          isCustom: true,
        });
      }
    });

    return merged;
  }, [activeTab, firestoreSubjects]);

  const filteredSubjects = subjectsForTab.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.teacherName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sync all config subjects to Firestore for the active class
  const handleSyncClass = async () => {
    setSyncing(true);
    const configSubjects = getSubjectsForClass(activeTab);
    const existingNames = new Set(
      firestoreSubjects.filter(s => s.class === activeTab).map(s => s.name.toUpperCase())
    );
    const toAdd = configSubjects.filter(name => !existingNames.has(name.toUpperCase()));

    if (toAdd.length === 0) {
      setStatus({ type: 'success', message: `All subjects already synced for ${activeTab}.` });
      setSyncing(false);
      return;
    }

    try {
      const batch = writeBatch(db);
      for (const name of toAdd) {
        const ref = doc(collection(db, 'subjects'));
        batch.set(ref, {
          name,
          class: activeTab,
          department: 'General',
          teacherId: '',
          teacherName: '',
          createdAt: new Date().toISOString()
        });
      }
      await batch.commit();
      setStatus({ type: 'success', message: `Synced ${toAdd.length} subjects for ${activeTab}.` });
      fetchData();
    } catch (err) {
      setStatus({ type: 'error', message: 'Sync failed: ' + err.message });
    } finally {
      setSyncing(false);
    }
  };

  // Sync ALL classes at once
  const handleSyncAll = async () => {
    if (!window.confirm('Sync default subjects for ALL classes to the database? Existing entries will not be duplicated.')) return;
    setSyncing(true);
    let totalAdded = 0;
    try {
      const batch = writeBatch(db);
      for (const cls of classes) {
        const configSubjs = getSubjectsForClass(cls);
        const existingNames = new Set(
          firestoreSubjects.filter(s => s.class === cls).map(s => s.name.toUpperCase())
        );
        for (const name of configSubjs) {
          if (!existingNames.has(name.toUpperCase())) {
            const ref = doc(collection(db, 'subjects'));
            batch.set(ref, {
              name, class: cls, department: 'General',
              teacherId: '', teacherName: '',
              createdAt: new Date().toISOString()
            });
            totalAdded++;
          }
        }
      }
      await batch.commit();
      setStatus({ type: 'success', message: `Synced ${totalAdded} subjects across all classes!` });
      fetchData();
    } catch (err) {
      setStatus({ type: 'error', message: 'Bulk sync failed: ' + err.message });
    } finally {
      setSyncing(false);
    }
  };

  // Handle inline teacher assignment
  const handleAssignTeacher = (subjectKey, teacherId) => {
    setPendingAssignments(prev => ({ ...prev, [subjectKey]: teacherId }));
  };

  // Save all pending teacher assignments for the active tab
  const handleSaveAssignments = async () => {
    const entries = Object.entries(pendingAssignments);
    if (entries.length === 0) return;

    setSaving(true);
    setStatus({ type: 'info', message: 'Saving teacher assignments...' });

    try {
      const batch = writeBatch(db);

      for (const [subjectKey, teacherId] of entries) {
        const subject = subjectsForTab.find(s => `${s.class}_${s.name}` === subjectKey);
        if (!subject) continue;

        const teacher = staff.find(s => s.id === teacherId);
        const teacherName = teacher ? teacher.name : '';

        if (subject.id) {
          // Update existing Firestore doc
          const ref = doc(db, 'subjects', subject.id);
          batch.update(ref, { teacherId, teacherName });
        } else {
          // Create new doc in Firestore
          const ref = doc(collection(db, 'subjects'));
          batch.set(ref, {
            name: subject.name,
            class: subject.class,
            department: subject.department || 'General',
            teacherId,
            teacherName,
            createdAt: new Date().toISOString()
          });
        }
      }

      await batch.commit();
      setPendingAssignments({});
      setStatus({ type: 'success', message: `Updated ${entries.length} teacher assignment(s)!` });
      fetchData();
    } catch (err) {
      setStatus({ type: 'error', message: 'Failed to save: ' + err.message });
    } finally {
      setSaving(false);
    }
  };

  // Add custom subject
  const handleAddSubject = async (e) => {
    e.preventDefault();
    setSaving(true);

    // Check for duplicates
    const checkName = currentSubject.name.trim().toUpperCase();
    const configSubjects = getSubjectsForClass(currentSubject.class).map(s => s.toUpperCase());
    const existingFirestore = firestoreSubjects.find(
      s => s.class === currentSubject.class && s.name.toUpperCase() === checkName
    );

    const isDuplicate = (configSubjects.includes(checkName) && !isEditing) || 
                        (existingFirestore && existingFirestore.id !== currentSubject.id);

    if (isDuplicate) {
      setStatus({ type: 'error', message: 'A subject with this name already exists for the selected class.' });
      setSaving(false);
      return;
    }

    let teacherName = '';
    if (currentSubject.teacherId) {
      const t = staff.find(s => s.id === currentSubject.teacherId);
      teacherName = t ? t.name : '';
    }
    try {
      if (isEditing && currentSubject.id) {
        await updateDoc(doc(db, 'subjects', currentSubject.id), { ...currentSubject, teacherName });
        setStatus({ type: 'success', message: 'Subject updated!' });
      } else {
        await addDoc(collection(db, 'subjects'), { ...currentSubject, teacherName, createdAt: new Date().toISOString() });
        setStatus({ type: 'success', message: 'Subject added!' });
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      setStatus({ type: 'error', message: 'Error: ' + err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!id) return;
    if (!window.confirm('Remove this subject from the database?')) return;
    try {
      await deleteDoc(doc(db, 'subjects', id));
      fetchData();
      setStatus({ type: 'success', message: 'Subject removed.' });
    } catch (err) {
      setStatus({ type: 'error', message: 'Delete failed.' });
    }
  };

  const pendingCount = Object.keys(pendingAssignments).length;

  // Count subjects per tab with teachers assigned
  const getTabStats = (cls) => {
    const fsForClass = firestoreSubjects.filter(s => s.class === cls);
    const assigned = fsForClass.filter(s => s.teacherName).length;
    const total = getSubjectsForClass(cls).length;
    return { total, assigned };
  };

  return (
    <div className="p-4 md:p-8 space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Curriculum & Subjects</h2>
          <p className="text-slate-500 text-sm mt-1">View all subjects per class and assign teachers. Teachers can handle multiple subjects.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleSyncAll}
            disabled={syncing}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
          >
            {syncing ? <Loader2 size={16} className="animate-spin" /> : <Database size={16} />}
            Sync All to DB
          </button>
          <button
            onClick={() => { setIsEditing(false); setCurrentSubject({ name: '', department: 'General', teacherId: '', teacherName: '', class: activeTab }); setShowModal(true); }}
            className="flex items-center gap-2 bg-teal-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-teal-700 transition-all shadow-lg shadow-teal-100"
          >
            <Plus size={16} />
            Add Custom Subject
          </button>
        </div>
      </div>

      {/* Class Tabs */}
      <div className="modern-tabs-container hide-scrollbar overflow-x-auto max-w-full">
        {classes.map(cls => {
          const stats = getTabStats(cls);
          const isActive = activeTab === cls;
          return (
            <button
              key={cls}
              onClick={() => { setActiveTab(cls); setSearchTerm(''); setPendingAssignments({}); }}
              className={`modern-tab-item ${isActive ? 'active tab-emerald' : ''}`}
            >
              <div className="flex items-center gap-1.5">
                <span>{cls}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                  isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-200 text-slate-500'
                }`}>
                  {stats.assigned}/{stats.total}
                </span>
              </div>
            </button>
          );
        })}
      </div>


      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search subjects or teachers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none text-sm"
          />
        </div>
        <button
          onClick={handleSyncClass}
          disabled={syncing}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 text-white text-sm font-bold hover:bg-slate-700 transition-all disabled:opacity-50"
        >
          {syncing ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />}
          Sync {activeTab} to DB
        </button>
        {pendingCount > 0 && (
          <button
            onClick={handleSaveAssignments}
            disabled={saving}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50 animate-in fade-in duration-200"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save {pendingCount} Assignment{pendingCount > 1 ? 's' : ''}
          </button>
        )}
      </div>

      {/* Subject Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                <th className="px-6 py-4 text-left w-10">#</th>
                <th className="px-4 py-4 text-left">Subject</th>
                <th className="px-4 py-4 text-left" style={{ minWidth: '220px' }}>Assigned Teacher</th>
                <th className="px-4 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-20 text-center">
                    <Loader2 size={28} className="animate-spin mx-auto text-teal-600" />
                  </td>
                </tr>
              ) : filteredSubjects.length > 0 ? filteredSubjects.map((sub, idx) => {
                const subjectKey = `${sub.class}_${sub.name}`;
                const currentTeacherId = pendingAssignments[subjectKey] !== undefined
                  ? pendingAssignments[subjectKey]
                  : (sub.teacherId || '');
                const isPending = pendingAssignments[subjectKey] !== undefined;
                const currentTeacher = staff.find(s => s.id === currentTeacherId);

                return (
                  <tr key={subjectKey} className={`transition-colors ${isPending ? 'bg-emerald-50/50' : 'hover:bg-slate-50/50'}`}>
                    <td className="px-6 py-4 text-sm text-slate-400 font-mono">{idx + 1}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center flex-shrink-0">
                          <BookOpen size={15} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{sub.name}</p>
                          {sub.isCustom && (
                            <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">CUSTOM</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <select
                        value={currentTeacherId}
                        onChange={(e) => handleAssignTeacher(subjectKey, e.target.value)}
                        className={`w-full px-3 py-2 rounded-lg text-sm font-medium outline-none transition-all ${
                          isPending
                            ? 'border-2 border-emerald-400 bg-emerald-50 text-emerald-800'
                            : 'border border-slate-200 bg-slate-50 text-slate-700 hover:border-teal-300 focus:ring-2 focus:ring-teal-500'
                        }`}
                      >
                        <option value="">— Unassigned —</option>
                        {staff.map(s => (
                          <option key={s.id} value={s.id}>{s.name}{s.staffId ? ` (${s.staffId})` : ''}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-4 text-center">
                      {currentTeacherId ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                          <CheckCircle size={12} /> Assigned
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
                          <AlertCircle size={12} /> Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {sub.id && (
                          <>
                            <button
                              onClick={() => { setIsEditing(true); setCurrentSubject(sub); setShowModal(true); }}
                              className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all"
                              title="Edit subject"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(sub.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                              title="Delete subject"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan="5" className="py-16 text-center text-slate-400 italic text-sm">
                    No subjects matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-500 font-medium">
            {filteredSubjects.length} subject{filteredSubjects.length !== 1 ? 's' : ''} for <strong>{activeTab}</strong>
          </p>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              {filteredSubjects.filter(s => s.teacherId || pendingAssignments[`${s.class}_${s.name}`]).length} assigned
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              {filteredSubjects.filter(s => !s.teacherId && !pendingAssignments[`${s.class}_${s.name}`]).length} unassigned
            </span>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-left">
            <div className="p-5 flex justify-between items-center bg-teal-600 text-white">
              <h3 className="text-lg font-bold">{isEditing ? 'Edit Subject' : 'Add Custom Subject'}</h3>
              <button onClick={() => setShowModal(false)} className="hover:opacity-50 transition-opacity"><X size={22} /></button>
            </div>
            <form onSubmit={handleAddSubject} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Subject Name</label>
                <input
                  type="text" required
                  value={currentSubject.name}
                  onChange={(e) => setCurrentSubject({ ...currentSubject, name: e.target.value })}
                  placeholder="e.g. Agricultural Science"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white outline-none transition-all text-sm font-medium"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Class</label>
                  <select
                    value={currentSubject.class}
                    onChange={(e) => setCurrentSubject({ ...currentSubject, class: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-teal-500 outline-none transition-all text-sm font-medium"
                  >
                    {classes.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Department</label>
                  <select
                    value={currentSubject.department}
                    onChange={(e) => setCurrentSubject({ ...currentSubject, department: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-teal-500 outline-none transition-all text-sm font-medium"
                  >
                    <option value="General">General</option>
                    <option value="Science">Science</option>
                    <option value="Arts">Arts</option>
                    <option value="Commercial">Commercial</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Assign Teacher (Optional)</label>
                <select
                  value={currentSubject.teacherId}
                  onChange={(e) => setCurrentSubject({ ...currentSubject, teacherId: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-teal-500 outline-none transition-all text-sm font-medium"
                >
                  <option value="">— No Teacher —</option>
                  {staff.map(s => <option key={s.id} value={s.id}>{s.name}{s.staffId ? ` (${s.staffId})` : ''}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-slate-100 text-slate-600 px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-teal-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-teal-700 shadow-lg shadow-teal-100 transition-all disabled:opacity-50">
                  {saving ? <Loader2 className="animate-spin w-4 h-4 mx-auto" /> : isEditing ? 'Save Changes' : 'Create Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {status.message && (
        <div className={`fixed bottom-6 right-6 p-4 rounded-xl shadow-xl flex items-center gap-3 animate-in slide-in-from-right duration-300 z-50 ${
          status.type === 'success' ? 'bg-teal-600' : status.type === 'error' ? 'bg-rose-600' : 'bg-indigo-600'
        } text-white max-w-sm`}>
          {status.type === 'success' ? <CheckCircle size={18} /> : status.type === 'error' ? <AlertCircle size={18} /> : <Loader2 size={18} className="animate-spin" />}
          <p className="font-bold text-sm">{status.message}</p>
        </div>
      )}
    </div>
  );
};

export default CourseManagement;
