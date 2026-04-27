import React, { useState, useEffect } from 'react';
import { useStudentAuth } from '../../context/StudentAuthContext';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { useTheme } from '../../context/ThemeContext';
import { Book, Clock, AlertCircle, CheckCircle2, FileText, ChevronRight } from 'lucide-react';

const StudentAssignments = () => {
  const { currentStudent } = useStudentAuth();
  const { primaryColor } = useTheme();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const studentClass = currentStudent?.className || currentStudent?.classId || '';
        const q = query(
          collection(db, 'assignments'),
          where('targetClass', '==', studentClass)
        );
        
        const snap = await getDocs(q);
        const data = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })).sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate));
        setAssignments(data);
      } catch (error) {
        console.error('Error fetching assignments:', error);
      } finally {
        setLoading(false);
      }
    };

    if (currentStudent) fetchAssignments();
  }, [currentStudent]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: primaryColor }}></div>
      </div>
    );
  }

  const pendingCount = assignments.length; // Simplified for now since we don't have submission tracking yet

  return (
    <div className="dashboard-wrapper max-w-5xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 style={{ fontWeight: '900', fontSize: '28px', color: '#1e293b', margin: 0 }}>Academic Tasks</h2>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>Review and submit your coursework assignments.</p>
        </div>
        <div className="flex gap-2">
           <div className="bg-amber-50 text-amber-700 px-4 py-2 rounded-2xl text-xs font-black flex items-center gap-2 border border-amber-100">
              <Clock size={14} /> {pendingCount} Tasks Due
           </div>
        </div>
      </div>

      {assignments.length === 0 ? (
        <div className="card-white p-20 text-center">
           <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText size={32} />
           </div>
           <h3 className="text-xl font-black text-slate-800 mb-1">No Active Assignments</h3>
           <p className="text-sm text-slate-500">Your teachers haven't posted any tasks for your class yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {assignments.map(a => (
            <div key={a.id} className="card-white group hover:border-indigo-200 transition-all cursor-pointer p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                  <Book size={24} />
                </div>
                <div>
                  <h4 className="text-lg font-black text-slate-900 mb-1">{a.title}</h4>
                  <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                    <span className="uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{a.subject}</span>
                    <span className="flex items-center gap-1"><Clock size={12}/> Due: {a.dueDate}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="flex-1 md:flex-none text-left md:text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                  <div className="flex items-center gap-1.5 font-black text-amber-600 text-xs">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div> PENDING
                  </div>
                </div>
                <button className="bg-slate-900 text-white p-3 rounded-xl hover:bg-black transition-all">
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Submission Info */}
      <div className="mt-12 p-8 bg-slate-900 rounded-3xl text-white relative overflow-hidden">
         <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '150px', height: '150px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }}></div>
         <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
               <h3 className="text-xl font-black mb-1">Submission Policy</h3>
               <p className="text-slate-400 text-sm max-w-md">All assignments must be submitted before 4:00 PM on the due date. Late submissions may attract a grade penalty.</p>
            </div>
            <button className="bg-white text-slate-900 px-8 py-3 rounded-2xl font-black hover:bg-slate-100 transition-all shadow-xl active:scale-95">
               View Grading Rubric
            </button>
         </div>
      </div>
    </div>
  );
};

export default StudentAssignments;

