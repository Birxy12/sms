import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, getDocs, query, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { Plus, Trash2, BookOpen, Link, Users, Loader2, CheckCircle, X, FileText } from 'lucide-react';

const NoteManager = () => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    targetClass: '',
    fileUrl: '',
    fileType: 'PDF'
  });

  const classes = ['JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2 ART', 'SS 2 SCIENCE', 'SS 3 ART', 'SS 3 SCIENCE'];

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
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'notes'), {
        ...formData,
        uploadedAt: new Date().toISOString()
      });
      setStatus({ type: 'success', message: 'Study material uploaded successfully!' });
      setShowModal(false);
      setFormData({ title: '', subject: '', targetClass: '', fileUrl: '', fileType: 'PDF' });
      fetchNotes();
    } catch {
      setStatus({ type: 'error', message: 'Failed to upload material.' });
    } finally {
      setLoading(false);
      setTimeout(() => setStatus({ type: '', message: '' }), 3000);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this study material?')) return;
    try {
      await deleteDoc(doc(db, 'notes', id));
      setNotes(prev => prev.filter(n => n.id !== id));
    } catch {
      alert('Error deleting material');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div>
          <h3 className="text-xl font-black text-slate-800">Lecture Materials</h3>
          <p className="text-sm text-slate-500">Upload notes and study guides for your classes.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
        >
          <Plus size={20} /> Upload Material
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 text-center">
            <Loader2 className="animate-spin mx-auto text-indigo-600" size={40} />
            <p className="mt-4 font-bold text-slate-400">Loading materials...</p>
          </div>
        ) : notes.length === 0 ? (
          <div className="col-span-full card-white p-20 text-center border-2 border-dashed border-slate-200 bg-transparent">
            <p className="font-bold text-slate-400">No materials uploaded yet.</p>
          </div>
        ) : (
          notes.map(n => (
            <div key={n.id} className="card-white group relative hover:border-emerald-500 transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <FileText size={24} />
                </div>
                <button onClick={() => handleDelete(n.id)} className="p-2 text-slate-300 hover:text-rose-600 transition-colors">
                  <Trash2 size={18} />
                </button>
              </div>
              
              <h4 className="text-lg font-black text-slate-900 mb-2 line-clamp-1">{n.title}</h4>
              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                  <Users size={14} className="text-slate-400" /> {n.targetClass}
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 truncate">
                  <Link size={14} className="text-slate-400" /> {n.fileUrl}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                  {n.subject}
                </span>
                <span className="text-[10px] font-black text-slate-400 uppercase">
                  {new Date(n.uploadedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Upload Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8 relative">
            <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors">
              <X size={24} />
            </button>
            
            <h3 className="text-2xl font-black text-slate-900 mb-6">Upload Material</h3>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Material Title</label>
                <input 
                  type="text" required
                  value={formData.title} 
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  placeholder="e.g. Introduction to Physics - Part 1"
                  className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-emerald-500 outline-none font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Subject</label>
                  <input 
                    type="text" required
                    value={formData.subject} 
                    onChange={e => setFormData({...formData, subject: e.target.value})}
                    placeholder="Physics"
                    className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-emerald-500 outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Target Class</label>
                  <select 
                    required
                    value={formData.targetClass} 
                    onChange={e => setFormData({...formData, targetClass: e.target.value})}
                    className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-emerald-500 outline-none font-bold"
                  >
                    <option value="">Select Class</option>
                    {classes.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">File URL (Google Drive/OneDrive/Dropbox)</label>
                <div className="relative">
                  <Link className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="url" required
                    value={formData.fileUrl} 
                    onChange={e => setFormData({...formData, fileUrl: e.target.value})}
                    placeholder="https://drive.google.com/..."
                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-emerald-500 outline-none font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">File Type</label>
                <select 
                  required
                  value={formData.fileType} 
                  onChange={e => setFormData({...formData, fileType: e.target.value})}
                  className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-emerald-500 outline-none font-bold"
                >
                  <option value="PDF">PDF Document</option>
                  <option value="DOCX">Word Document</option>
                  <option value="PPTX">PowerPoint Presentation</option>
                  <option value="VIDEO">Video Link</option>
                </select>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-4 bg-emerald-600 text-white font-black rounded-2xl hover:bg-emerald-700 shadow-xl shadow-emerald-100 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? 'Uploading...' : 'Publish Material'}
              </button>
            </form>
          </div>
        </div>
      )}

      {status.message && (
        <div className={`fixed bottom-8 right-8 p-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-8 ${
          status.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
        } text-white z-[110]`}>
          <CheckCircle size={20} />
          <span className="font-bold tracking-tight">{status.message}</span>
        </div>
      )}
    </div>
  );
};

export default NoteManager;
