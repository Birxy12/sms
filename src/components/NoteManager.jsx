import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, getDocs, query, deleteDoc, doc, orderBy, updateDoc } from 'firebase/firestore';
import { 
  Plus, Trash2, BookOpen, Link as LinkIcon, Users, Loader2, CheckCircle, X, 
  FileText, Search, Filter, Download, ExternalLink, Video, FileSpreadsheet, Layers, Edit3, Eye
} from 'lucide-react';
import { CLASS_LIST, getSubjectsForClass } from '../utils/subjectConfig';
import { uploadFileToSupabase } from '../lib/supabase';

const NoteManager = () => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedNote, setSelectedNote] = useState(null);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [classFilter, setClassFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    targetClass: 'JSS1',
    fileUrl: '',
    fileName: '',
    fileType: 'PDF',
    description: ''
  });

  const classes = CLASS_LIST;

  const availableSubjects = useMemo(() => {
    if (!formData.targetClass || formData.targetClass === 'All') {
      return getSubjectsForClass('JSS1');
    }
    return getSubjectsForClass(formData.targetClass);
  }, [formData.targetClass]);

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'notes'), orderBy('uploadedAt', 'desc'));
      const snap = await getDocs(q);
      setNotes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error('Error fetching notes:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      alert('File size exceeds 25MB limit.');
      return;
    }

    setUploadingFile(true);
    try {
      const ext = file.name.split('.').pop().toLowerCase();
      let detectedType = 'PDF';
      if (['doc', 'docx'].includes(ext)) detectedType = 'DOCX';
      else if (['ppt', 'pptx'].includes(ext)) detectedType = 'SLIDES';
      else if (['xls', 'xlsx', 'csv'].includes(ext)) detectedType = 'SPREADSHEET';
      else if (['mp4', 'webm', 'mov'].includes(ext)) detectedType = 'VIDEO';
      else if (['png', 'jpg', 'jpeg'].includes(ext)) detectedType = 'IMAGE';

      const publicUrl = await uploadFileToSupabase(file, 'materials', 'notes');
      setFormData(prev => ({
        ...prev,
        fileUrl: publicUrl,
        fileName: file.name,
        fileType: detectedType
      }));
      setStatus({ type: 'success', message: `Attached: ${file.name}` });
    } catch (err) {
      console.error('Upload error:', err);
      alert('Failed to upload file to storage. You can also paste an external link.');
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
      fileUrl: '',
      fileName: '',
      fileType: 'PDF',
      description: ''
    });
    setShowModal(true);
  };

  const openEditModal = (note) => {
    setEditingId(note.id);
    setFormData({
      title: note.title || '',
      subject: note.subject || '',
      targetClass: note.targetClass || 'JSS1',
      fileUrl: note.fileUrl || '',
      fileName: note.fileName || '',
      fileType: note.fileType || 'PDF',
      description: note.description || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.fileUrl && !formData.description) {
      alert('Please provide a file attachment, external link, or lecture description.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        updatedAt: new Date().toISOString()
      };

      if (editingId) {
        await updateDoc(doc(db, 'notes', editingId), payload);
        setStatus({ type: 'success', message: 'Study material updated successfully!' });
      } else {
        await addDoc(collection(db, 'notes'), {
          ...payload,
          uploadedAt: new Date().toISOString()
        });
        setStatus({ type: 'success', message: 'Study material published successfully!' });
      }

      setShowModal(false);
      fetchNotes();
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', message: 'Failed to publish material.' });
    } finally {
      setLoading(false);
      setTimeout(() => setStatus({ type: '', message: '' }), 3500);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this study material?')) return;
    try {
      await deleteDoc(doc(db, 'notes', id));
      setNotes(prev => prev.filter(n => n.id !== id));
      if (selectedNote?.id === id) setSelectedNote(null);
      setStatus({ type: 'success', message: 'Material removed.' });
      setTimeout(() => setStatus({ type: '', message: '' }), 3000);
    } catch (err) {
      console.error(err);
      alert('Error deleting material');
    }
  };

  const getFileIcon = (type) => {
    switch ((type || '').toUpperCase()) {
      case 'VIDEO': return <Video size={20} className="text-rose-500" />;
      case 'SLIDES': return <Layers size={20} className="text-amber-500" />;
      case 'SPREADSHEET': return <FileSpreadsheet size={20} className="text-emerald-500" />;
      case 'LINK': return <LinkIcon size={20} className="text-blue-500" />;
      default: return <FileText size={20} className="text-indigo-500" />;
    }
  };

  const filteredNotes = notes.filter(n => {
    const matchesClass = classFilter === 'All' || n.targetClass === classFilter || (!n.targetClass && classFilter === 'All');
    const matchesSearch = !searchTerm || 
      n.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesClass && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div>
          <h3 className="text-xl font-black text-slate-800 m-0">Learning Materials & Notes</h3>
          <p className="text-sm text-slate-500 m-0 mt-1">Select class, upload lesson notes, study guides, and digital lecture resources.</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95"
        >
          <Plus size={20} /> Upload Study Material
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
            <option value="All">All Classes ({notes.length})</option>
            {classes.map(c => (
              <option key={c} value={c}>
                {c} ({notes.filter(n => n.targetClass === c).length})
              </option>
            ))}
          </select>
        </div>

        <div className="relative w-full md:w-72">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search materials or subjects..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border-2 border-slate-100 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Grid of Materials */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 text-center">
            <Loader2 className="animate-spin mx-auto text-indigo-600" size={40} />
            <p className="mt-4 font-bold text-slate-400">Loading lecture materials...</p>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="col-span-full bg-white rounded-3xl p-16 text-center border-2 border-dashed border-slate-200">
            <BookOpen size={48} className="mx-auto text-slate-300 mb-3" />
            <h4 className="text-lg font-black text-slate-700 mb-1">No Study Materials Found</h4>
            <p className="font-medium text-sm text-slate-400 max-w-md mx-auto mb-4">
              {classFilter !== 'All' 
                ? `No lecture materials uploaded for ${classFilter} yet.` 
                : 'No lecture materials have been uploaded yet.'}
            </p>
            <button 
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 px-5 py-2.5 rounded-xl text-xs font-black hover:bg-indigo-100 transition-all"
            >
              <Plus size={16} /> Upload First Material
            </button>
          </div>
        ) : (
          filteredNotes.map(note => (
            <div 
              key={note.id} 
              className="bg-white rounded-3xl p-6 border border-slate-200 hover:border-indigo-400 hover:shadow-lg transition-all flex flex-col justify-between group relative"
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100">
                      {getFileIcon(note.fileType)}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                      {note.targetClass || 'All Classes'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => openEditModal(note)} 
                      title="Edit Material"
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(note.id)} 
                      title="Delete Material"
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="mb-2">
                  <span className="text-xs font-black text-indigo-600 uppercase tracking-widest block mb-1">
                    {note.subject}
                  </span>
                  <h4 className="text-lg font-black text-slate-900 leading-snug line-clamp-2">
                    {note.title}
                  </h4>
                </div>

                {note.description && (
                  <p className="text-xs text-slate-500 font-medium line-clamp-3 mb-4 leading-relaxed">
                    {note.description}
                  </p>
                )}
              </div>

              <div>
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-400 mb-4">
                  <span>Uploaded</span>
                  <span className="text-slate-700 font-bold">
                    {new Date(note.uploadedAt || note.createdAt || Date.now()).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex gap-2">
                  {note.description && (
                    <button 
                      onClick={() => setSelectedNote(note)}
                      className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 border border-slate-200"
                    >
                      <Eye size={14} /> Overview
                    </button>
                  )}
                  {note.fileUrl && (
                    <a 
                      href={note.fileUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md shadow-indigo-100"
                    >
                      <Download size={14} /> Open Material
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Upload Modal */}
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
              {editingId ? 'Edit Study Material' : 'Upload Lecture Material'}
            </h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-6">
              Select class and attach syllabus notes or digital guides
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
                  Material Title *
                </label>
                <input 
                  type="text" required
                  value={formData.title} 
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  placeholder="e.g. Chapter 3: Chemical Bonding Lecture Notes"
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 outline-none font-bold text-sm text-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 block">
                    Resource Format
                  </label>
                  <select 
                    value={formData.fileType} 
                    onChange={e => setFormData({...formData, fileType: e.target.value})}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 outline-none font-bold text-sm text-slate-800 cursor-pointer"
                  >
                    <option value="PDF">PDF Document (.pdf)</option>
                    <option value="DOCX">Word Document (.docx)</option>
                    <option value="SLIDES">Presentation / Slides (.pptx)</option>
                    <option value="VIDEO">Video Lecture (.mp4 / link)</option>
                    <option value="SPREADSHEET">Spreadsheet (.xlsx / .csv)</option>
                    <option value="LINK">External Website Link</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 block">
                    Upload File (Max 25MB)
                  </label>
                  <label className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl cursor-pointer transition-colors border-2 border-dashed border-slate-300">
                    <Download size={16} />
                    {uploadingFile ? 'Uploading File...' : formData.fileName ? formData.fileName : 'Choose Document'}
                    <input 
                      type="file" 
                      onChange={handleFileUpload} 
                      disabled={uploadingFile}
                      className="hidden" 
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.mp4,.zip"
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 block">
                  Or External Resource Link (Google Drive, YouTube, Web URL)
                </label>
                <input 
                  type="url" 
                  placeholder="https://drive.google.com/... or https://youtu.be/..."
                  value={formData.fileUrl} 
                  onChange={e => setFormData({...formData, fileUrl: e.target.value})}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 outline-none text-xs font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 block">
                  Description / Chapter Summary (Optional)
                </label>
                <textarea 
                  rows="4"
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 outline-none font-medium text-sm text-slate-800"
                  placeholder="Summary of topics covered, reading objectives, key points..."
                />
              </div>

              <button 
                type="submit" 
                disabled={loading || uploadingFile}
                className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-[0.98] disabled:opacity-50 mt-4"
              >
                {loading ? 'Saving...' : editingId ? 'Update Material' : 'Publish Study Material'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Note Overview Viewer Modal */}
      {selectedNote && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-6 md:p-8 relative">
            <button 
              onClick={() => setSelectedNote(null)} 
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors p-2"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3 py-1 rounded-xl">
                {selectedNote.targetClass}
              </span>
              <span className="text-xs font-black text-slate-400">•</span>
              <span className="text-xs font-black uppercase text-indigo-600">
                {selectedNote.subject}
              </span>
            </div>

            <h3 className="text-2xl font-black text-slate-900 mb-4">
              {selectedNote.title}
            </h3>

            <div className="mb-6">
              <h5 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Description & Notes</h5>
              <div className="p-5 bg-slate-900 text-slate-100 rounded-2xl text-sm font-medium leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto border border-slate-800 shadow-inner selection:bg-indigo-500 selection:text-white">
                {selectedNote.description || 'No description provided.'}
              </div>
            </div>

            {selectedNote.fileUrl && (
              <a 
                href={selectedNote.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 bg-indigo-600 text-white font-black text-sm rounded-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-100"
              >
                <Download size={16} /> Open / Download File
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

export default NoteManager;
