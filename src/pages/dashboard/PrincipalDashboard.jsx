import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { Users, BookOpen, PenTool, DollarSign, ArrowUpRight, GraduationCap, BarChart, TrendingUp, UserCheck, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

const PrincipalDashboard = () => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    maleStudents: 0,
    femaleStudents: 0,
    totalTeachers: 0,
    classData: [],
    loading: true
  });

  const [finances, setFinances] = useState({
    expectedFee: 0,
    collectedFee: 0,
    monthLabels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
    monthData: [450, 780, 520, 930, 1120] 
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // 1. Get Fee Settings for expected fees
        const feeSnap = await getDoc(doc(db, 'settings', 'fees'));
        const fees = feeSnap.exists() ? feeSnap.data() : { default: 45000 };

        // 2. Get Students and Staff
        const [studentSnap, staffSnap] = await Promise.all([
          getDocs(collection(db, 'students')),
          getDocs(collection(db, 'staff'))
        ]);

        let male = 0;
        let female = 0;
        let totalExpected = 0;
        let totalPaid = 0;
        const classesMap = {};

        studentSnap.forEach(doc => {
          const s = doc.data();
          const gender = (s.gender || 'm').toLowerCase();
          if (gender.startsWith('f')) female++; else male++;
          
          const cls = s.className || s.classId || 'Unassigned';
          classesMap[cls] = (classesMap[cls] || 0) + 1;

          // Financials
          const expected = fees[cls] || fees['default'] || 45000;
          totalExpected += expected;
          totalPaid += (s.paidFee || 0);
        });

        const classArray = Object.keys(classesMap)
          .map(c => ({ name: c, count: classesMap[c] }))
          .sort((a, b) => b.count - a.count);

        setStats({
          totalStudents: studentSnap.size,
          maleStudents: male,
          femaleStudents: female,
          totalTeachers: staffSnap.size,
          classData: classArray,
          loading: false
        });

        setFinances(prev => ({
          ...prev,
          expectedFee: totalExpected,
          collectedFee: totalPaid
        }));

      } catch (err) {
        console.error("Dashboard error:", err);
        setStats(prev => ({ ...prev, loading: false }));
      }
    };
    fetchDashboardData();
  }, []);

  const collectionPercentage = Math.round((finances.collectedFee / finances.expectedFee) * 100) || 0;

  if (stats.loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="font-bold text-slate-500 animate-pulse uppercase tracking-widest text-sm">Synchronizing School Metrics...</p>
    </div>
  );

  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Shield className="text-indigo-600" size={32} /> Principal's Desk
          </h2>
          <p className="text-slate-500 font-medium mt-1">Holistic oversight of {stats.totalStudents} students and {stats.totalTeachers} staff members.</p>
        </div>
        <div className="flex gap-3">
           <Link 
            to="/staff"
            className="flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 px-6 py-3 rounded-2xl font-bold hover:bg-slate-50 transition-all shadow-sm active:scale-95"
          >
            <UserCheck size={20} /> Manage Staff
          </Link>
          <Link 
            to="/admin/posts"
            className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95"
          >
            <PenTool size={20} /> Publish Update
          </Link>
        </div>
      </div>

      {/* KPI Ribbons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition-all">
          <div>
            <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-1">Student Body</p>
            <h3 className="text-4xl font-black text-slate-800">{stats.totalStudents}</h3>
          </div>
          <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users size={32} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-center hover:shadow-md transition-all">
          <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-3">Gender Distribution</p>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-[10px] font-black text-slate-600 mb-1">
                <span>Boys</span>
                <span>{stats.maleStudents}</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(stats.maleStudents/stats.totalStudents)*100}%`}}></div>
              </div>
            </div>
            <div className="flex-1">
              <div className="flex justify-between text-[10px] font-black text-slate-600 mb-1">
                <span>Girls</span>
                <span>{stats.femaleStudents}</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-rose-500 rounded-full" style={{ width: `${(stats.femaleStudents/stats.totalStudents)*100}%`}}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition-all">
          <div>
            <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-1">Academic Staff</p>
            <h3 className="text-4xl font-black text-slate-800">{stats.totalTeachers}</h3>
          </div>
          <div className="w-16 h-16 rounded-3xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <BookOpen size={32} />
          </div>
        </div>

        <div className="bg-slate-900 p-6 rounded-[2rem] shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <TrendingUp size={100} color="white" />
          </div>
          <p className="text-[10px] font-black text-indigo-300 tracking-widest uppercase mb-1 relative z-10">Revenue Health</p>
          <h3 className="text-3xl font-black text-white relative z-10 drop-shadow-sm truncate">
            ₦{(finances.collectedFee / 1000000).toFixed(2)}M
          </h3>
          <p className="text-xs font-bold text-emerald-400 flex items-center gap-1 mt-1 relative z-10">
            <ArrowUpRight size={14} /> {collectionPercentage}% target met
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Class Analysis Chart */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                <GraduationCap className="text-indigo-600" size={20} />
              </div>
              Enrollment by Class
            </h3>
            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-4 py-1.5 rounded-full uppercase tracking-tighter">Active Terms</span>
          </div>
          
          <div className="space-y-6">
            {stats.classData.map((cls, idx) => {
              const percentage = (cls.count / stats.totalStudents) * 100;
              return (
                <div key={idx}>
                  <div className="flex justify-between text-sm font-bold mb-2">
                    <span className="text-slate-700">{cls.name}</span>
                    <span className="text-slate-500">{cls.count} Students ({percentage.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full h-3 bg-slate-50 rounded-full overflow-hidden shadow-inner">
                    <div 
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{ 
                        width: `${percentage}%`,
                        background: `linear-gradient(90deg, #4f46e5 0%, #818cf8 100%)`
                      }}
                    ></div>
                  </div>
                </div>
              );
            })}
            {stats.classData.length === 0 && (
              <div className="text-center text-slate-300 py-12 flex flex-col items-center gap-4">
                <Users size={48} className="opacity-20" />
                <p className="font-bold text-lg">No class data populated yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Financial Flow Graph */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                <BarChart className="text-emerald-600" size={20} />
              </div>
              Financial Recovery rate
            </h3>
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Expected</p>
              <p className="text-xl font-black text-slate-900">₦{(finances.expectedFee/1000000).toFixed(2)}M</p>
            </div>
          </div>

          <div className="h-64 flex items-end justify-between gap-4 pb-6 border-b-2 border-slate-50 relative">
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-5">
              <div className="border-t border-slate-900 w-full"></div>
              <div className="border-t border-slate-900 w-full"></div>
              <div className="border-t border-slate-900 w-full"></div>
            </div>
            
            {finances.monthData.map((val, idx) => {
              const maxVal = Math.max(...finances.monthData);
              const height = (val / maxVal) * 100;
              return (
                <div key={idx} className="flex flex-col items-center gap-3 w-full flex-1 group z-10">
                  <div 
                    className="w-full bg-emerald-50 group-hover:bg-emerald-100 rounded-2xl relative transition-all duration-300 mt-auto"
                    style={{ height: `${height}%`, minHeight: '15%' }}
                  >
                    <div 
                      className="absolute bottom-0 w-full bg-emerald-500 rounded-2xl transition-all shadow-lg"
                      style={{ height: `${height * 0.7}%` }}
                    ></div>
                  </div>
                  <span className="text-[10px] font-black text-slate-400 uppercase">{finances.monthLabels[idx]}</span>
                </div>
              );
            })}
          </div>
          
          <div className="flex items-center gap-8 mt-8 justify-center">
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-lg bg-emerald-500 shadow-sm"></div><span className="text-xs font-black text-slate-500 uppercase tracking-tight">Recovered</span></div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-lg bg-emerald-50/50 border-2 border-emerald-100 shadow-sm"></div><span className="text-xs font-black text-slate-500 uppercase tracking-tight">Pending</span></div>
          </div>
        </div>
      </div>
      
    </div>
  );
};

export default PrincipalDashboard;
