import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, getDocs, query, deleteDoc, doc, orderBy, updateDoc, serverTimestamp } from 'firebase/firestore';
import { 
  Plus, Trash2, Calendar, Book, Users, Loader2, CheckCircle, X, 
  Search, Filter, Paperclip, ExternalLink, FileText, Download, Award, Edit3, Eye
} from 'lucide-react';
import { formatDateForInput } from '../utils/dateFormatter';
import { CLASS_LIST, getSubjectsForClass } from '../utils/subjectConfig';
import { uploadFileToSupabase } from '../lib/supabase';

const AssignmentManager = () => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [classFilter, setClassFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    targetClass: 'JSS1',
    dueDate: '',
    totalPoints: '20',
    description: '',
    attachmentUrl: '',
    attachmentName: '',
  });

  const classes = CLASS_LIST;

  // Available subjects based on chosen targetClass in modal
  const availableSubjects = useMemo(() => {
    if (!formData.targetClass || formData.targetClass === 'All') {
      return getSubjectsForClass('JSS1');
    }
    return getSubjectsForClass(formData.targetClass);
  }, [formData.targetClass]);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'assignments'), orderBy('dueDate', 'desc'));
      const snap = await getDocs(q);
      setAssignments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error('Error fetching assignments:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert('File size exceeds 15MB limit.');
      return;
    }

    setUploadingFile(true);
    try {
      const publicUrl = await uploadFileToSupabase(file, 'materials', 'assignments');
      setFormData(prev => ({
        ...prev,
        attachmentUrl: publicUrl,
        attachmentName: file.name
      }));
      setStatus({ type: 'success', message: `Attached: ${file.name}` });
    } catch (err) {
      console.error('Upload error:', err);
      alert('Failed to upload file. You can also paste an external link.');
    } finally {
      setUploadingFile(false);
    }
  };

  const openCreateModal = () => {
    setEditingId(null);
    setFormData({
      title: '',
      subject: availableSubjects[0] || 'Mathematics',
      targetClass: classFilter !== 'All' ? classFilter : 'JSS1',
      dueDate: '',
      totalPoints: '20',
      description: '',
      attachmentUrl: '',
      attachmentName: '',
    });
    setShowModal(true);
  };

  const openEditModal = (assignment) => {
    setEditingId(assignment.id);
    setFormData({
      title: assignment.title || '',
      subject: assignment.subject || '',
      targetClass: assignment.targetClass || 'JSS1',
      dueDate: assignment.dueDate || '',
      totalPoints: assignment.totalPoints || '20',
      description: assignment.description || '',
      attachmentUrl: assignment.attachmentUrl || '',
      attachmentName: assignment.attachmentName || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        updatedAt: new Date().toISOString(),
        status: 'Active'
      };

      if (editingId) {
        await updateDoc(doc(db, 'assignments', editingId), payload);
        setStatus({ type: 'success', message: 'Assignment updated successfully!' });
      } else {
        await addDoc(collection(db, 'assignments'), {
          ...payload,
          createdAt: new Date().toISOString()
        });
        setStatus({ type: 'success', message: 'Assignment published successfully!' });
      }

      setShowModal(false);
      fetchAssignments();
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', message: 'Failed to save assignment.' });
    } finally {
      setLoading(false);
      setTimeout(() => setStatus({ type: '', message: '' }), 3500);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this assignment?')) return;
    try {
      await deleteDoc(doc(db, 'assignments', id));
      setAssignments(prev => prev.filter(a => a.id !== id));
      if (selectedAssignment?.id === id) setSelectedAssignment(null);
      setStatus({ type: 'success', message: 'Assignment deleted.' });
      setTimeout(() => setStatus({ type: '', message: '' }), 3000);
    } catch (err) {
      console.error(err);
      alert('Error deleting assignment');
    }
  };

  const filteredAssignments = assignments.filter(a => {
    const matchesClass = classFilter === 'All' || a.targetClass === classFilter || (!a.targetClass && classFilter === 'All');
    const matchesSearch = !searchTerm || 
      a.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesClass && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div>
          <h3 className="text-xl font-black text-slate-800 m-0">Assignment Management</h3>
          <p className="text-sm text-slate-500 m-0 mt-1">Select a class, publish coursework, homework, and manage tasks.</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95"
        >
          <Plus size={20} /> Publish Assignment
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-wider">
            <Filter size={16} className="text-indigo-600" /> Filter Class:
          </div>
          <select 
            value={classFilter} 
            onChange={(e) => setClassFilter(e.target.value)}
            className="px-4 py-2 rounded-xl border-2 border-slate-100 bg-slate-50 text-slate-800 font-bold text-sm outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="All">All Classes ({assignments.length})</option>
            {classes.map(c => (
              <option key={c} value={c}>
                {c} ({assignments.filter(a => a.targetClass === c).length})
              </option>
            ))}
          </select>
        </div>

        <div className="relative w-full md:w-72">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search assignments..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border-2 border-slate-100 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Grid of Assignments */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 text-center">
            <Loader2 className="animate-spin mx-auto text-indigo-600" size={40} />
            <p className="mt-4 font-bold text-slate-400">Loading assignments...</p>
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="col-span-full bg-white rounded-3xl p-16 text-center border-2 border-dashed border-slate-200">
            <Book size={48} className="mx-auto text-slate-300 mb-3" />
            <h4 className="text-lg font-black text-slate-700 mb-1">No Assignments Found</h4>
            <p className="font-medium text-sm text-slate-400 max-w-md mx-auto mb-4">
              {classFilter !== 'All' 
                ? `No assignments have been published for ${classFilter} yet.` 
                : 'No assignments have been published yet.'}
            </p>
            <button 
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 px-5 py-2.5 rounded-xl text-xs font-black hover:bg-indigo-100 transition-all"
            >
              <Plus size={16} /> Publish First Assignment
            </button>
          </div>
        ) : (
          filteredAssignments.map(a => (
            <div 
              key={a.id} 
              className="bg-white rounded-3xl p-6 border border-slate-200 hover:border-indigo-400 hover:shadow-lg transition-all flex flex-col justify-between group relative"
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3 py-1 rounded-xl border border-indigo-100">
                    {a.targetClass || 'All Classes'}
                  </span>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => openEditModal(a)} 
                      title="Edit Assignment"
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(a.id)} 
                      title="Delete Assignment"
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="mb-2">
                  <span className="text-xs font-black text-indigo-600 uppercase tracking-widest block mb-1">
                    {a.subject}
                  </span>
                  <h4 className="text-lg font-black text-slate-900 leading-snug line-clamp-2">
                    {a.title}
                  </h4>
                </div>

                {a.description && (
                  <p className="text-xs text-slate-500 font-medium line-clamp-3 mb-4 leading-relaxed">
                    {a.description}
                  </p>
                )}
              </div>

              <div>
                <div className="pt-4 border-t border-slate-100 space-y-2 mb-4">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <Calendar size={13} /> Due Date:
                    </span>
                    <span className="text-slate-800 font-black">{a.dueDate || 'No deadline'}</span>
                  </div>

                  {a.totalPoints && (
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <Award size={13} /> Max Points:
                      </span>
                      <span className="text-indigo-600 font-black">{a.totalPoints} Marks</span>
                    </div>
                  )}

                  {a.attachmentUrl && (
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <Paperclip size={13} /> Attachment:
                      </span>
                      <a 
                        href={a.attachmentUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-indigo-600 hover:underline flex items-center gap-1 text-[11px] font-black"
                      >
                        Download <ExternalLink size={11} />
                      </a>
                    </div>
                  )}
                </div>

                <button 
                  onClick={() => setSelectedAssignment(a)}
                  className="w-full py-2.5 bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 border border-slate-200"
                >
                  <Eye size={14} /> View Instructions
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Assignment Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl p-6 md:p-8 relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setShowModal(false)} 
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors p-2"
            >
              <X size={20} />
            </button>
            
            <h3 className="text-2xl font-black text-slate-900 mb-1">
              {editingId ? 'Edit Assignment' : 'Publish New Assignment'}
            </h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-6">
              Select class and subject to assign coursework
            </p>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 block">
                    Target Class *
                  </label>
                  <select 
                    required
                    value={formData.targetClass} 
                    onChange={e => {
                      const newClass = e.target.value;
                      const newSubjects = getSubjectsForClass(newClass);
                      setFormData({
                        ...formData, 
                        targetClass: newClass,
                        subject: newSubjects[0] || formData.subject
                      });
                    }}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 outline-none font-bold text-sm text-slate-800 cursor-pointer"
                  >
                    {classes.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 block">
                    Subject *
                  </label>
                  <select 
                    required
                    value={formData.subject} 
                    onChange={e => setFormData({...formData, subject: e.target.value})}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 outline-none font-bold text-sm text-slate-800 cursor-pointer"
                  >
                    {availableSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 block">
                  Assignment Title *
                </label>
                <input 
                  type="text" required
                  value={formData.title} 
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  placeholder="e.g. Week 4: Simultaneous Linear Equations"
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 outline-none font-bold text-sm text-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 block">
                    Due Date *
                  </label>
                  <input 
                    type="date" required
                    value={formatDateForInput(formData.dueDate)} 
                    onChange={e => setFormData({...formData, dueDate: e.target.value})}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 outline-none font-bold text-sm text-slate-800"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 block">
                    Total Marks / Points
                  </label>
                  <input 
                    type="number" min="1" max="100"
                    value={formData.totalPoints} 
                    onChange={e => setFormData({...formData, totalPoints: e.target.value})}
                    placeholder="20"
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 outline-none font-bold text-sm text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 block">
                  Instructions & Question Details
                </label>
                <textarea 
                  rows="4"
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 outline-none font-medium text-sm text-slate-800"
                  placeholder="Provide step-by-step instructions or list the assignment questions..."
                />
              </div>

              {/* Attachment / File Upload */}
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 block">
                  Upload Attachment / Worksheet (PDF, Word, Images, max 15MB)
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-colors border border-slate-200">
                    <Paperclip size={16} />
                    {uploadingFile ? 'Uploading...' : 'Choose File'}
                    <input 
                      type="file" 
                      onChange={handleFileUpload} 
                      disabled={uploadingFile}
                      className="hidden" 
                      accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.zip"
                    />
                  </label>
                  {formData.attachmentUrl && (
                    <span className="text-xs font-bold text-emerald-600 truncate max-w-xs flex items-center gap-1">
                      <CheckCircle size={14} /> {formData.attachmentName || 'File attached'}
                    </span>
                  )}
                </div>
                <input 
                  type="url" 
                  placeholder="Or paste external resource link (Google Docs, Drive URL, etc.)"
                  value={formData.attachmentUrl}
                  onChange={e => setFormData({...formData, attachmentUrl: e.target.value, attachmentName: e.target.value ? 'External Link' : ''})}
                  className="w-full mt-2 px-4 py-2.5 rounded-xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 outline-none text-xs font-medium"
                />
              </div>

              <button 
                type="submit" 
                disabled={loading || uploadingFile}
                className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-[0.98] disabled:opacity-50 mt-4"
              >
                {loading ? 'Saving...' : editingId ? 'Update Assignment' : 'Publish Assignment to Class'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Assignment Detail Viewer Modal */}
      {selectedAssignment && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-6 md:p-8 relative">
            <button 
              onClick={() => setSelectedAssignment(null)} 
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors p-2"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3 py-1 rounded-xl">
                {selectedAssignment.targetClass}
              </span>
              <span className="text-xs font-black text-slate-400">•</span>
              <span className="text-xs font-black uppercase text-indigo-600">
                {selectedAssignment.subject}
              </span>
            </div>

            <h3 className="text-2xl font-black text-slate-900 mb-4">
              {selectedAssignment.title}
            </h3>

            <div className="space-y-3 p-4 bg-slate-50 rounded-2xl mb-5">
              <div className="flex justify-between text-xs font-bold text-slate-600">
                <span>Due Date:</span>
                <span className="text-slate-900 font-black">{selectedAssignment.dueDate}</span>
              </div>
              {selectedAssignment.totalPoints && (
                <div className="flex justify-between text-xs font-bold text-slate-600">
                  <span>Score Weight:</span>
                  <span className="text-indigo-600 font-black">{selectedAssignment.totalPoints} Marks</span>
                </div>
              )}
            </div>

            <div className="mb-6">
              <h5 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Instructions & Questions</h5>
              <div className="p-5 bg-slate-900 text-slate-100 rounded-2xl text-sm font-medium leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto border border-slate-800 shadow-inner selection:bg-indigo-500 selection:text-white">
                {selectedAssignment.description || 'No additional instructions specified.'}
              </div>
            </div>

            {selectedAssignment.attachmentUrl && (
              <a 
                href={selectedAssignment.attachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 bg-indigo-600 text-white font-black text-sm rounded-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-100"
              >
                <Download size={16} /> Download Attached Worksheet / File
              </a>
            )}
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {status.message && (
        <div className={`fixed bottom-8 right-8 p-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-8 ${
          status.type === 'success' ? 'bg-indigo-600' : 'bg-rose-600'
        } text-white z-[110]`}>
          <CheckCircle size={20} />
          <span className="font-bold tracking-tight">{status.message}</span>
        </div>
      )}
    </div>
  );
};

export default AssignmentManager;
