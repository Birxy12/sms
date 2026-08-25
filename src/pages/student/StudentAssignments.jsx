import React, { useState, useEffect } from 'react';
import { useStudentAuth } from '../../context/StudentAuthContext';
import { db } from '../../lib/firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import { useTheme } from '../../context/ThemeContext';
import { Book, Clock, AlertCircle, CheckCircle2, FileText, ChevronRight, Download, Paperclip, X, Award, Eye } from 'lucide-react';

const StudentAssignments = () => {
  const { currentStudent } = useStudentAuth();
  const { primaryColor } = useTheme();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const studentClass = (currentStudent?.className || currentStudent?.classId || '').trim().toUpperCase();
        const snap = await getDocs(collection(db, 'assignments'));
        
        const data = snap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(a => {
            if (!a.targetClass || a.targetClass === 'All' || a.targetClass === 'All Classes') return true;
            return a.targetClass.trim().toUpperCase() === studentClass;
          })
          .sort((a, b) => new Date(b.dueDate || b.createdAt || 0) - new Date(a.dueDate || a.createdAt || 0));

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

  const pendingCount = assignments.length;

  return (
    <div className="dashboard-wrapper max-w-5xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 style={{ fontWeight: '900', fontSize: '28px', color: '#1e293b', margin: 0 }}>Academic Tasks & Assignments</h2>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>Review coursework, download worksheets, and submit tasks.</p>
        </div>
        <div className="flex gap-2">
           <div className="bg-amber-50 text-amber-700 px-4 py-2 rounded-2xl text-xs font-black flex items-center gap-2 border border-amber-100">
              <Clock size={14} /> {pendingCount} Tasks Available
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
            <div 
              key={a.id} 
              onClick={() => setSelectedTask(a)}
              className="card-white group hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
            >
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                  <Book size={24} />
                </div>
                <div>
                  <h4 className="text-lg font-black text-slate-900 mb-1">{a.title}</h4>
                  <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-500">
                    <span className="uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-black">{a.subject}</span>
                    <span className="flex items-center gap-1"><Clock size={12}/> Due: {a.dueDate || 'No deadline'}</span>
                    {a.totalPoints && (
                      <span className="flex items-center gap-1 text-emerald-600"><Award size={12}/> {a.totalPoints} Marks</span>
                    )}
                    {a.attachmentUrl && (
                      <span className="flex items-center gap-1 text-indigo-600"><Paperclip size={12}/> Worksheet</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                <div className="text-left md:text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                  <div className="flex items-center gap-1.5 font-black text-indigo-600 text-xs">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div> ACTIVE
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

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-6 md:p-8 relative">
            <button 
              onClick={() => setSelectedTask(null)} 
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors p-2"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3 py-1 rounded-xl">
                {selectedTask.targetClass || 'All'}
              </span>
              <span className="text-xs font-black text-slate-400">•</span>
              <span className="text-xs font-black uppercase text-indigo-600">
                {selectedTask.subject}
              </span>
            </div>

            <h3 className="text-2xl font-black text-slate-900 mb-4">
              {selectedTask.title}
            </h3>

            <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl mb-5 text-xs font-bold text-slate-600">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-black">Due Date</span>
                <span className="text-slate-900 font-black text-sm">{selectedTask.dueDate || 'No deadline'}</span>
              </div>
              {selectedTask.totalPoints && (
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-black">Points / Weight</span>
                  <span className="text-indigo-600 font-black text-sm">{selectedTask.totalPoints} Marks</span>
                </div>
              )}
            </div>

            <div className="mb-6">
              <h5 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Instructions & Questions</h5>
              <div className="p-5 bg-slate-900 text-slate-100 rounded-2xl text-sm font-medium leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto border border-slate-800 shadow-inner selection:bg-indigo-500 selection:text-white">
                {selectedTask.description || 'Complete the assignment as instructed by your teacher.'}
              </div>
            </div>

            {selectedTask.attachmentUrl && (
              <a 
                href={selectedTask.attachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 bg-indigo-600 text-white font-black text-sm rounded-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-100"
              >
                <Download size={16} /> Download Worksheet / Attachment
              </a>
            )}
          </div>
        </div>
      )}

      {/* Submission Info */}
      <div className="mt-12 p-8 bg-slate-900 rounded-3xl text-white relative overflow-hidden">
         <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '150px', height: '150px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }}></div>
         <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
               <h3 className="text-xl font-black mb-1">Academic Integrity</h3>
               <p className="text-slate-400 text-sm max-w-md">Assignments are graded and contribute to your continuous assessment score. Submit promptly on or before the due date.</p>
            </div>
         </div>
      </div>
    </div>
  );
};

export default StudentAssignments;
