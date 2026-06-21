import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, setDoc, serverTimestamp, collection, getDocs, deleteDoc, query, orderBy } from 'firebase/firestore';
import { FileUp, CheckCircle, AlertCircle, Save, Trash2, Calendar, Users, Loader2 } from 'lucide-react';
import { promoteStudents } from '../utils/promotion';

const ResultPublisher = () => {
  const [examName, setExamName] = useState('');
  const [session, setSession] = useState('2025/2026');
  const [term, setTerm] = useState('Second Term');
  const [targetClass, setTargetClass] = useState('All Classes');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [publications, setPublications] = useState([]);
  const [loadingPubs, setLoadingPubs] = useState(false);

  const fetchPublications = async () => {
    setLoadingPubs(true);
    try {
      const q = query(collection(db, 'publications'), orderBy('publishedAt', 'desc'));
      const snap = await getDocs(q);
      setPublications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error("Error fetching publications:", error);
    } finally {
      setLoadingPubs(false);
    }
  };

  useEffect(() => {
    fetchPublications();
  }, []);

  const handlePublish = async (e) => {
    e.preventDefault();
    setStatus({ type: 'loading', message: 'Publishing results...' });

    try {
      const pubId = `${session.replace('/', '-')}_${term.replace(/\s/g, '').toLowerCase()}_${targetClass.replace(/\s/g, '').toLowerCase()}`;
      const pubRef = doc(db, 'publications', pubId);

      await setDoc(pubRef, {
        examName,
        session,
        term,
        targetClass,
        publishedAt: serverTimestamp(),
        type: 'Result',
        status: 'published'
      }, { merge: true });

      setStatus({ type: 'success', message: `Great! ${term.toLowerCase()} results have been published successfully.` });
      setExamName('');
      fetchPublications();
    } catch (error) {
      console.error(error);
      setStatus({ type: 'error', message: 'Failed to publish results. Check your connection.' });
    }
  };

  const handleDeletePublication = async (id) => {
    if (!window.confirm('Are you sure you want to delete this published result? Students will no longer be able to see it.')) return;
    try {
      await deleteDoc(doc(db, 'publications', id));
      setStatus({ type: 'success', message: 'Publication deleted successfully.' });
      fetchPublications();
    } catch (error) {
      console.error("Error deleting publication:", error);
      setStatus({ type: 'error', message: 'Failed to delete publication.' });
    }
  };

  return (
    <div className="space-y-8">
      <div className="card-white" style={{ marginTop: '24px' }}>
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <FileUp size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800">Publish Academic Results</h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Make results visible to students</p>
          </div>
        </div>

        <form onSubmit={handlePublish} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="input-group">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Exam / Assessment Title</label>
              <input 
                type="text" 
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
                placeholder="e.g. End of Term Mock Exam"
                required
              />
            </div>

            <div className="input-group">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Target Class</label>
              <select 
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                value={targetClass}
                onChange={(e) => setTargetClass(e.target.value)}
              >
                <option value="All Classes">All Classes</option>
                {CLASS_LIST.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="input-group">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Academic Session</label>
              <select 
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                value={session}
                onChange={(e) => setSession(e.target.value)}
              >
                <option value="2024/2025">2024/2025</option>
                <option value="2025/2026">2025/2026</option>
                <option value="2026/2027">2026/2027</option>
              </select>
            </div>

            <div className="input-group">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Academic Term</label>
              <select 
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
              >
                <option value="First Term">First Term</option>
                <option value="Second Term">Second Term</option>
                <option value="Third Term">Third Term</option>
              </select>
            </div>
          </div>

          {status.message && (
            <div style={{ 
              padding: '16px', 
              borderRadius: '12px', 
              fontSize: '14px',
              fontWeight: 'bold',
              backgroundColor: status.type === 'error' ? '#fff1f2' : '#f0fdf4',
              color: status.type === 'error' ? '#e11d48' : '#15803d',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              border: status.type === 'error' ? '1px solid #fda4af' : '1px solid #bbf7d0'
            }}>
              {status.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
              {status.message}
            </div>
          )}

          <button 
            type="submit" 
            className="btn-primary"
            style={{ width: 'fit-content' }}
          >
            <Save size={20} /> Publish Results
          </button>
        </form>
      </div>

      <div className="card-white">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black text-slate-800">Publication History</h3>
          {loadingPubs && <Loader2 className="animate-spin text-indigo-600" size={20} />}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">
                <th className="px-6 py-4 rounded-l-xl">Exam Title</th>
                <th className="px-6 py-4">Session/Term</th>
                <th className="px-6 py-4">Target Class</th>
                <th className="px-6 py-4 rounded-r-xl text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {publications.map(pub => (
                <tr key={pub.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-800">{pub.examName}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{new Date(pub.publishedAt?.toMillis ? pub.publishedAt.toMillis() : (new Date(pub.publishedAt).getTime())).toLocaleDateString()}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                      <Calendar size={14} className="text-indigo-400" />
                      {pub.session} • {pub.term}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                      <Users size={14} className="text-emerald-400" />
                      {pub.targetClass}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleDeletePublication(pub.id)}
                      className="p-2 text-slate-300 hover:text-rose-600 transition-colors"
                      title="Delete publication"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {publications.length === 0 && !loadingPubs && (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-slate-400 font-bold">No results published yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ResultPublisher;

