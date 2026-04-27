import React, { useState } from 'react';
import { db } from '../lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { FileUp, CheckCircle, AlertCircle, Save } from 'lucide-react';
import { CLASS_LIST } from '../utils/subjectConfig';

const ResultPublisher = () => {
  const [examName, setExamName] = useState('');
  const [session, setSession] = useState('2025/2026');
  const [term, setTerm] = useState('Second Term');
  const [targetClass, setTargetClass] = useState('All Classes');
  const [status, setStatus] = useState({ type: '', message: '' });

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
    } catch (error) {
      console.error(error);
      setStatus({ type: 'error', message: 'Failed to publish results. Check your connection.' });
    }
  };

  return (
    <div className="card-white" style={{ marginTop: '24px' }}>
      <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <FileUp color="var(--primary)" />
        <h3 className="text-xl font-black text-slate-800">Publish Academic Results</h3>
      </div>

      <form onSubmit={handlePublish} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="input-group">
            <label className="block text-sm font-bold text-slate-600 uppercase tracking-wider mb-2">Exam / Assessment Title</label>
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
            <label className="block text-sm font-bold text-slate-600 uppercase tracking-wider mb-2">Target Class</label>
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
            <label className="block text-sm font-bold text-slate-600 uppercase tracking-wider mb-2">Academic Session</label>
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
            <label className="block text-sm font-bold text-slate-600 uppercase tracking-wider mb-2">Academic Term</label>
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
          className="bg-indigo-600 text-white px-8 py-4 rounded-xl font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 w-fit flex items-center gap-2"
        >
          <Save size={20} /> Publish Results
        </button>
      </form>
    </div>
  );
};

export default ResultPublisher;

