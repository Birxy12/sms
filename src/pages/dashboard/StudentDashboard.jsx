import React, { useState, useEffect } from 'react';
import { useStudentAuth } from '../../context/StudentAuthContext';
import { useTheme } from '../../context/ThemeContext';
import { db } from '../../lib/firebase';
import { collection, query, getDocs, where, limit, orderBy } from 'firebase/firestore';
import { 
  LayoutDashboard, Award, CreditCard, Calendar, Bell, ChevronRight, 
  Inbox as InboxIcon, Trophy, Wallet, BookOpen, Library, MonitorCheck, 
  AlertCircle, Star, ArrowUpRight, Clock, User, Zap, GraduationCap
} from 'lucide-react';
import { MARKS_KEYS, expandMarks } from '../../utils/firestoreSchema';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import PinSetupModal from '../../components/student/PinSetupModal';

const StudentDashboard = () => {
  const { currentStudent, authError, authReady } = useStudentAuth();
  const { primaryColor } = useTheme();
  const navigate = useNavigate();

  const studentName = currentStudent?.name || 'Student';
  const className   = currentStudent?.className || 'N/A';
  const regNum      = currentStudent?.regNo || '';

  const [activeTab, setActiveTab]       = useState('overview');
  const [inboxCount, setInboxCount]     = useState(0);
  const [resultsCount, setResultsCount] = useState(0);
  const [avgScore, setAvgScore]         = useState(0);
  const [loading, setLoading]           = useState(true);
  const [dashboardError, setDashboardError] = useState('');
  const [recentNotifications, setRecentNotifications] = useState([]);

  useEffect(() => {
    if (!currentStudent || !regNum) {
      if (!loading && !currentStudent) setLoading(false);
      return;
    }
    // Wait until Firebase auth is confirmed before reading Firestore
    if (!authReady) return;
    
    const loadData = async () => {
      try {
        setDashboardError('');
        
        // 1. Fetch Notifications & Count
        const [s1, s2, s3] = await Promise.all([
          getDocs(query(collection(db, 'notifications'), where('targetType', '==', 'global'), limit(5))),
          getDocs(query(collection(db, 'notifications'), where('targetType', '==', 'class'), where('targetValue', '==', className), limit(5))),
          getDocs(query(collection(db, 'notifications'), where('targetType', '==', 'student'), where('targetValue', '==', regNum), limit(5))),
        ]);
        
        const allNotifs = [...s1.docs, ...s2.docs, ...s3.docs]
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        
        setRecentNotifications(allNotifs.slice(0, 3));
        setInboxCount(new Set(allNotifs.map(n => n.id)).size);

        // 2. Fetch Results & Calculate Average
        // Try compressed key first
        let marksQuery = query(collection(db, 'marks'), where(MARKS_KEYS.regNo, '==', regNum));
        let rSnap = await getDocs(marksQuery);
        
        // Fallback to legacy key if empty
        if (rSnap.empty) {
          marksQuery = query(collection(db, 'marks'), where('reg_no', '==', regNum));
          rSnap = await getDocs(marksQuery);
        }

        setResultsCount(rSnap.size);
        
        if (!rSnap.empty) {
          // Sort by session/term to get latest
          const allResults = rSnap.docs.map(doc => expandMarks(doc.data()));
          // Sort logic: latest session, latest term (simplified)
          allResults.sort((a, b) => (b.session || '').localeCompare(a.session || ''));
          
          const latestResult = allResults[0];
          const marks = latestResult.marks || {};
          let total = 0;
          let count = 0;

          if (marks._meta && marks._meta.average) {
            setAvgScore(marks._meta.average);
          } else {
            Object.keys(marks).forEach(k => {
              if (k !== '_meta' && marks[k].total) {
                total += parseFloat(marks[k].total);
                count++;
              }
            });
            if (count > 0) setAvgScore((total / count).toFixed(1));
          }
        }
      } catch (e) {
        console.error("Dashboard error:", e);
        if (e?.code === 'permission-denied') {
          setDashboardError('Access restricted. Please check your permissions.');
        }
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [currentStudent, className, regNum, authReady]);

  const mainStats = [
    { label: 'GPA Average', value: `${avgScore}%`, icon: Zap, color: '#6366f1', trend: '+2.4%' },
    { label: 'Exams Taken', value: resultsCount, icon: Trophy, color: '#10b981', trend: 'Completed' },
    { label: 'Pending Fees', value: '₦0', icon: Wallet, color: '#f59e0b', trend: 'Awaiting Payment' },
    { label: 'Attendance', value: '94%', icon: Calendar, color: '#ec4899', trend: 'Excellent' },
  ];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, color: '#6366f1' },
    { id: 'academic', label: 'Academic', icon: GraduationCap, color: '#10b981' },
    { id: 'notices', label: 'Notices', icon: Bell, color: '#f59e0b' },
    { id: 'finance', label: 'Finance', icon: CreditCard, color: '#ec4899' },
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8">
      <AnimatePresence>
        {loading ? (
          <div className="flex items-center justify-center h-[60vh]">
            <motion.div 
              animate={{ rotate: 360 }} 
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full"
            />
          </div>
        ) : (
          <motion.div variants={container} initial="hidden" animate="show" className="max-w-7xl mx-auto space-y-8">
            
            {/* Enterprise Header */}
            <motion.div variants={item} className="relative overflow-hidden rounded-[2rem] bg-slate-900 p-8 md:p-12 text-white shadow-2xl">
              <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-indigo-500/20 blur-[100px] rounded-full" />
              <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-emerald-500/10 blur-[80px] rounded-full" />
              
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 p-1">
                      <div className="w-full h-full rounded-[0.9rem] bg-slate-800 flex items-center justify-center overflow-hidden">
                        {currentStudent?.photo ? (
                          <img src={currentStudent.photo} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <User size={40} className="text-slate-400" />
                        )}
                      </div>
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-emerald-500 w-6 h-6 rounded-full border-4 border-slate-900" />
                  </div>
                  <div>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight">{studentName}</h1>
                    <div className="flex items-center gap-3 mt-2 text-slate-400 font-bold text-sm uppercase tracking-wider">
                      <span>{className}</span>
                      <span className="w-1 h-1 bg-slate-600 rounded-full" />
                      <span>{regNum}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => navigate('/students/profile')} className="px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl font-bold transition-all text-sm">
                    Profile Settings
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Premium Tab Bar */}
            <motion.div variants={item} className="flex bg-white p-2 rounded-2xl border border-slate-100 shadow-sm overflow-x-auto no-scrollbar">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm transition-all whitespace-nowrap ${
                    activeTab === tab.id 
                    ? 'bg-slate-900 text-white shadow-lg' 
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <tab.icon size={18} style={{ color: activeTab === tab.id ? 'white' : tab.color }} />
                  {tab.label}
                </button>
              ))}
            </motion.div>

            {/* Tab Content */}
            <motion.div 
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              {activeTab === 'overview' && (
                <>
                  {/* Metrics Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {mainStats.map((stat, idx) => (
                      <div key={idx} className="bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                          <div className="p-3 rounded-2xl" style={{ backgroundColor: `${stat.color}15` }}>
                            <stat.icon size={24} style={{ color: stat.color }} />
                          </div>
                          <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${stat.trend.includes('+') ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-500'}`}>
                            {stat.trend}
                          </span>
                        </div>
                        <h3 className="text-3xl font-black text-slate-800 mb-1">{stat.value}</h3>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-wide">{stat.label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                      <div className="bg-white p-8 rounded-[2rem] border border-slate-100">
                        <h3 className="text-xl font-black text-slate-800 mb-6">Recent Academic Performance</h3>
                        <div className="space-y-6">
                          <div className="p-6 bg-slate-50 rounded-2xl flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                                <Award size={24} />
                              </div>
                              <div>
                                <p className="font-black text-slate-800">Current Term Progress</p>
                                <p className="text-xs text-slate-400 font-bold uppercase">Based on latest assessment</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-black text-indigo-600">{avgScore}%</p>
                              <p className="text-[10px] font-black text-slate-400 uppercase">Class Average</p>
                            </div>
                          </div>
                          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${avgScore}%` }} className="h-full bg-indigo-500" />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-indigo-600 p-8 rounded-[2rem] text-white flex flex-col justify-between">
                      <div>
                        <Star className="mb-4 text-indigo-200" />
                        <h3 className="text-xl font-black mb-2">Student Excellence</h3>
                        <p className="text-indigo-100 text-sm leading-relaxed">Keep maintaining high scores to unlock advanced school honors and awards.</p>
                      </div>
                      <button onClick={() => navigate('/students/results')} className="mt-8 w-full py-4 bg-white text-indigo-600 rounded-2xl font-black text-sm shadow-xl">
                        View Honors
                      </button>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'academic' && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {[
                    { label: 'Exam Results', icon: Trophy, color: '#10b981', path: '/students/results', desc: 'Detailed score breakdown' },
                    { label: 'CBT Portal', icon: MonitorCheck, color: '#f59e0b', path: '/students/cbt', desc: 'Computer based tests' },
                    { label: 'Study Notes', icon: BookOpen, color: '#6366f1', path: '/students/notes', desc: 'Course materials' },
                    { label: 'Assignments', icon: Library, color: '#8b5cf6', path: '/students/assignments', desc: 'Pending homework' },
                  ].map((module, idx) => (
                    <button 
                      key={idx}
                      onClick={() => navigate(module.path)}
                      className="p-8 bg-white border border-slate-100 rounded-[2rem] text-left hover:shadow-2xl hover:shadow-slate-200/50 transition-all space-y-4"
                    >
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${module.color}15` }}>
                        <module.icon size={28} style={{ color: module.color }} />
                      </div>
                      <div>
                        <p className="text-lg font-black text-slate-800">{module.label}</p>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-tight">{module.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {activeTab === 'notices' && (
                <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden">
                  <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                    <h3 className="text-xl font-black text-slate-800">School Notifications</h3>
                    <div className="bg-amber-100 text-amber-600 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                      {inboxCount} New Alerts
                    </div>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {recentNotifications.length > 0 ? recentNotifications.map((notif, idx) => (
                      <div key={idx} className="p-8 flex gap-6 hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => navigate('/students/inbox')}>
                        <div className="w-12 h-12 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
                          <Bell size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-800 mb-1">{notif.title || 'Official Announcement'}</p>
                          <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed mb-3">{notif.message}</p>
                          <div className="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase">
                            <span className="flex items-center gap-1"><Clock size={12} /> {notif.createdAt?.seconds ? new Date(notif.createdAt.seconds * 1000).toLocaleDateString() : 'Today'}</span>
                            <span className="flex items-center gap-1"><User size={12} /> Administration</span>
                          </div>
                        </div>
                      </div>
                    )) : (
                      <div className="p-20 text-center">
                        <p className="text-slate-400 font-bold">Your inbox is empty</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'finance' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-white p-8 rounded-[2rem] border border-slate-100 flex flex-col justify-between">
                    <div>
                      <div className="w-16 h-16 bg-pink-100 rounded-3xl flex items-center justify-center text-pink-600 mb-6">
                        <Wallet size={32} />
                      </div>
                      <h3 className="text-2xl font-black text-slate-800 mb-2">School Fees Balance</h3>
                      <p className="text-slate-400 font-bold mb-8">Summary of your current financial standing.</p>
                      <div className="text-4xl font-black text-slate-900 mb-2">₦0.00</div>
                      <div className="text-xs font-black text-emerald-500 uppercase">Awaiting Payment</div>
                    </div>
                    <button onClick={() => navigate('/students/fees')} className="mt-10 py-5 bg-slate-900 text-white rounded-3xl font-black text-sm shadow-xl">
                      Make Payment Now
                    </button>
                  </div>
                  <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 border-dashed flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 bg-white rounded-full shadow-sm flex items-center justify-center text-slate-300 mb-6">
                      <CreditCard size={40} />
                    </div>
                    <h3 className="text-lg font-black text-slate-800 mb-2">Payment Receipts</h3>
                    <p className="text-sm text-slate-400 font-medium max-w-[200px]">View and download all your previous payment receipts.</p>
                    <button className="mt-6 text-sm font-black text-indigo-600">View History →</button>
                  </div>
                </div>
              )}
            </motion.div>

          </motion.div>
        )}
      </AnimatePresence>
      <PinSetupModal />
    </div>
  );
};

export default StudentDashboard;

