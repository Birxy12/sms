import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { Layers, Users, BookOpen, ChevronRight, GraduationCap, ArrowUpRight, TrendingUp, Info } from 'lucide-react';

const ClassManagement = () => {
  const [classStats, setClassStats] = useState([]);
  const [loading, setLoading] = useState(true);

  const classes = ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2 ART', 'SS2 SCIENCE', 'SS3 ART', 'SS3 SCIENCE'];

  const fetchClassStats = async () => {
    setLoading(true);
    try {
      const stats = await Promise.all(classes.map(async (className) => {
        // Count students in this class
        const studentsQuery = query(collection(db, 'students'), where('className', '==', className));
        const studentsSnap = await getDocs(studentsQuery);
        
        // Count subjects for this class
        const subjectsQuery = query(collection(db, 'subjects'), where('class', '==', className));
        const subjectsSnap = await getDocs(subjectsQuery);

        return {
          name: className,
          studentCount: studentsSnap.size,
          subjectCount: subjectsSnap.size,
          id: className
        };
      }));
      setClassStats(stats);
    } catch (error) {
      console.error('Error fetching class stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassStats();
  }, []);

  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight text-left">Class Management</h2>
          <p className="text-slate-500 text-left">Overview of school structure, student distribution, and academic capacity.</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 border border-emerald-100">
            <TrendingUp size={16} />
            Academic Session 2025/2026
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
          [1,2,3,4].map(i => <div key={i} className="h-48 bg-slate-100 animate-pulse rounded-3xl"></div>)
        ) : classStats.map((cls) => (
          <div key={cls.id} className="group relative bg-white p-8 rounded-3xl shadow-sm border border-slate-200 hover:border-indigo-500 transition-all hover:shadow-xl hover:shadow-indigo-50 hover:-translate-y-1">
            <div className="flex justify-between items-start mb-6 text-left">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
                <Layers size={24} />
              </div>
              <span className="text-xs font-black text-slate-300 uppercase tracking-widest">{cls.name.includes('SS') ? 'Senior' : 'Junior'}</span>
            </div>
            
            <div className="space-y-4 text-left">
              <h3 className="text-2xl font-black text-slate-900">{cls.name}</h3>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-slate-400" />
                  <span className="text-sm font-bold text-slate-700">{cls.studentCount} Students</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen size={16} className="text-slate-400" />
                  <span className="text-sm font-bold text-slate-700">{cls.subjectCount} Subjects</span>
                </div>
              </div>
            </div>

            <button className="mt-8 w-full py-3 bg-slate-50 text-slate-600 rounded-xl font-bold flex items-center justify-center gap-2 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
              Manage Details <ArrowUpRight size={16} />
            </button>
          </div>
        ))}
      </div>

      <div className="bg-indigo-900 text-white p-8 rounded-[2rem] relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
        <div className="relative z-10 text-left">
          <h4 className="text-indigo-200 text-xs font-black uppercase tracking-widest mb-2">Capacity Insight</h4>
          <h3 className="text-2xl font-bold mb-4">Class Balanced Distribution is at <span className="text-emerald-400">92%</span></h3>
          <p className="text-indigo-300 max-w-md text-sm">Most classes are currently operating at optimal capacity. Consider adding more desks to SS2 Science upcoming term.</p>
        </div>
        <div className="relative z-10">
          <button className="bg-white text-indigo-900 px-8 py-3 rounded-2xl font-black hover:bg-indigo-50 transition-all shadow-xl active:scale-95">Download Capacity Report</button>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full -ml-16 -mb-16 blur-2xl"></div>
      </div>

      <div className="card-white p-6 border-l-4 border-l-indigo-500 bg-indigo-50/30 flex items-start gap-4">
        <Info size={24} className="text-indigo-600 mt-1" />
        <div className="text-left">
          <h5 className="font-bold text-indigo-900">System Note</h5>
          <p className="text-sm text-indigo-700">Class names are standardized across the portal. Any changes to these names will require an administrator to update the global registry in the database settings.</p>
        </div>
      </div>
    </div>
  );
};

export default ClassManagement;
