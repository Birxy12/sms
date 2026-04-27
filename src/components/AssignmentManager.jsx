import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, getDocs, query, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { Plus, Trash2, Calendar, Book, Users, Loader2, CheckCircle, X } from 'lucide-react';

const AssignmentManager = () => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    targetClass: '',
    dueDate: '',
    description: ''
  });

  const classes = ['JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2 ART', 'SS 2 SCIENCE', 'SS 3 ART', 'SS 3 SCIENCE'];

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
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'assignments'), {
        ...formData,
        createdAt: new Date().toISOString(),
        status: 'Active'
      });
      setStatus({ type: 'success', message: 'Assignment posted successfully!' });
      setShowModal(false);
      setFormData({ title: '', subject: '', targetClass: '', dueDate: '', description: '' });
      fetchAssignments();
    } catch {
      setStatus({ type: 'error', message: 'Failed to post assignment.' });
    } finally {
      setLoading(false);
      setTimeout(() => setStatus({ type: '', message: '' }), 3000);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this assignment?')) return;
    try {
      await deleteDoc(doc(db, 'assignments', id));
      setAssignments(prev => prev.filter(a => a.id !== id));
    } catch {
      alert('Error deleting assignment');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div>
          <h3 className="text-xl font-black text-slate-800">Assignment Management</h3>
          <p className="text-sm text-slate-500">Create and track tasks for your students.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
        >
          <Plus size={20} /> Post New Task
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 text-center">
            <Loader2 className="animate-spin mx-auto text-indigo-600" size={40} />
            <p className="mt-4 font-bold text-slate-400">Loading assignments...</p>
          </div>
        ) : assignments.length === 0 ? (
          <div className="col-span-full card-white p-20 text-center border-2 border-dashed border-slate-200 bg-transparent">
            <p className="font-bold text-slate-400">No assignments posted yet.</p>
          </div>
        ) : (
          assignments.map(a => (
            <div key={a.id} className="card-white group relative hover:border-indigo-500 transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Book size={24} />
                </div>
                <button onClick={() => handleDelete(a.id)} className="p-2 text-slate-300 hover:text-rose-600 transition-colors">
                  <Trash2 size={18} />
                </button>
              </div>
              
              <h4 className="text-lg font-black text-slate-900 mb-2">{a.title}</h4>
              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                  <Users size={14} className="text-slate-400" /> {a.targetClass}
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                  <Calendar size={14} className="text-slate-400" /> Due: {a.dueDate}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                  {a.subject}
                </span>
                <span className="text-[10px] font-black text-slate-400 uppercase">
                  {new Date(a.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Post Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8 relative">
            <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors">
              <X size={24} />
            </button>
            
            <h3 className="text-2xl font-black text-slate-900 mb-6">New Assignment</h3>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Assignment Title</label>
                <input 
                  type="text" required
                  value={formData.title} 
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  placeholder="e.g. Simultaneous Equations Practice"
                  className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 outline-none font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Subject</label>
                  <input 
                    type="text" required
                    value={formData.subject} 
                    onChange={e => setFormData({...formData, subject: e.target.value})}
                    placeholder="Mathematics"
                    className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Target Class</label>
                  <select 
                    required
                    value={formData.targetClass} 
                    onChange={e => setFormData({...formData, targetClass: e.target.value})}
                    className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 outline-none font-bold"
                  >
                    <option value="">Select Class</option>
                    {classes.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Due Date</label>
                <input 
                  type="date" required
                  value={formData.dueDate} 
                  onChange={e => setFormData({...formData, dueDate: e.target.value})}
                  className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 outline-none font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Description / Instructions</label>
                <textarea 
                  rows="4"
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 outline-none font-medium"
                  placeholder="Provide details about the assignment..."
                />
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? 'Posting...' : 'Publish Assignment'}
              </button>
            </form>
          </div>
        </div>
      )}

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
