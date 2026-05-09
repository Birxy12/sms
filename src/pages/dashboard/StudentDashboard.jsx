import React, { useState, useEffect } from 'react';
import { useStudentAuth } from '../../context/StudentAuthContext';
import { useTheme } from '../../context/ThemeContext';
import { db } from '../../lib/firebase';
import { collection, query, getDocs, where, limit, orderBy } from 'firebase/firestore';
import { 
  LayoutDashboard, Award, CreditCard, Calendar, Bell, ChevronRight, 
  Inbox as InboxIcon, Trophy, Wallet, BookOpen, Library, MonitorCheck, 
  AlertCircle, Star, ArrowUpRight, Clock, User, Zap
} from 'lucide-react';
import { MARKS_KEYS } from '../../utils/firestoreSchema';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import PinSetupModal from '../../components/student/PinSetupModal';

const StudentDashboard = () => {
  const { currentStudent, authError } = useStudentAuth();
  const { primaryColor } = useTheme();
  const navigate = useNavigate();

  const studentName = currentStudent?.name || 'Student';
  const className   = currentStudent?.className || 'N/A';
  const regNum      = currentStudent?.regNo || '';

  const [inboxCount, setInboxCount]     = useState(0);
  const [resultsCount, setResultsCount] = useState(0);
  const [avgScore, setAvgScore]         = useState(0);
  const [loading, setLoading]           = useState(true);
  const [dashboardError, setDashboardError] = useState('');
  const [recentNotifications, setRecentNotifications] = useState([]);

  useEffect(() => {
    if (!currentStudent) return;
    
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
        const rSnap = await getDocs(query(collection(db, 'marks'), where(MARKS_KEYS.regNo, '==', regNum)));
        setResultsCount(rSnap.size);
        
        if (!rSnap.empty) {
          const latestResult = rSnap.docs[0].data();
          const marks = latestResult.marks || {};
          let total = 0;
          let count = 0;
          Object.keys(marks).forEach(k => {
            if (k !== '_meta' && marks[k].total) {
              total += parseFloat(marks[k].total);
              count++;
            }
          });
          if (count > 0) setAvgScore((total / count).toFixed(1));
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
  }, [currentStudent, className, regNum]);

  const mainStats = [
    { label: 'GPA Average', value: `${avgScore}%`, icon: Zap, color: '#6366f1', trend: '+2.4%' },
    { label: 'Exams Taken', value: resultsCount, icon: Trophy, color: '#10b981', trend: 'Completed' },
    { label: 'Pending Fees', value: '₦60k', icon: Wallet, color: '#f59e0b', trend: 'Due Soon' },
    { label: 'Attendance', value: '94%', icon: Calendar, color: '#ec4899', trend: 'Excellent' },
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
                    View Profile
                  </button>
                  <button onClick={() => navigate('/students/results')} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold shadow-lg shadow-indigo-500/30 transition-all text-sm">
                    Quick Results
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Error Message */}
            {dashboardError && (
              <motion.div variants={item} className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl font-bold">
                <AlertCircle size={20} />
                {dashboardError}
              </motion.div>
            )}

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {mainStats.map((stat, idx) => (
                <motion.div 
                  key={idx} 
                  variants={item}
                  whileHover={{ y: -5 }}
                  className="bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 rounded-2xl" style={{ backgroundColor: `${stat.color}15` }}>
                      <stat.icon size={24} style={{ color: stat.color }} />
                    </div>
                    <span className={`text-xs font-black px-2 py-1 rounded-lg ${stat.trend.includes('+') ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-500'}`}>
                      {stat.trend}
                    </span>
                  </div>
                  <h3 className="text-3xl font-black text-slate-800 mb-1">{stat.value}</h3>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-wide">{stat.label}</p>
                </motion.div>
              ))}
            </div>

            {/* Main Content Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Quick Actions */}
              <motion.div variants={item} className="lg:col-span-2 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-black text-slate-800">Quick Portal Access</h2>
                  <span className="text-sm font-bold text-indigo-600">6 Available Modules</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {[
                    { label: 'Inbox', icon: InboxIcon, color: '#6366f1', path: '/students/inbox', desc: 'School updates' },
                    { label: 'Results', icon: Trophy, color: '#10b981', path: '/students/results', desc: 'Exam records' },
                    { label: 'CBT', icon: MonitorCheck, color: '#f59e0b', path: '/students/cbt', desc: 'Online testing' },
                    { label: 'Fees', icon: CreditCard, color: '#ec4899', path: '/students/fees', desc: 'Tuition portal' },
                    { label: 'Lessons', icon: BookOpen, color: '#2563eb', path: '/students/notes', desc: 'Study material' },
                    { label: 'Work', icon: Library, color: '#8b5cf6', path: '/students/assignments', desc: 'Assignments' },
                  ].map((action, idx) => (
                    <button 
                      key={idx}
                      onClick={() => navigate(action.path)}
                      className="group p-6 bg-white border border-slate-100 rounded-3xl text-left hover:border-indigo-500 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all space-y-3"
                    >
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110" style={{ backgroundColor: `${action.color}15` }}>
                        <action.icon size={22} style={{ color: action.color }} />
                      </div>
                      <div>
                        <p className="font-black text-slate-800">{action.label}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{action.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>

              {/* Sidebar Content */}
              <div className="space-y-8">
                {/* Announcements */}
                <motion.div variants={item} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-4 opacity-5">
                    <Bell size={80} />
                  </div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-black text-slate-800">Alerts</h3>
                    <button onClick={() => navigate('/students/inbox')} className="p-2 hover:bg-slate-50 rounded-xl transition-all">
                      <ArrowUpRight size={20} className="text-slate-400" />
                    </button>
                  </div>
                  <div className="space-y-6">
                    {recentNotifications.length > 0 ? recentNotifications.map((notif, idx) => (
                      <div key={idx} className="flex gap-4 group cursor-pointer" onClick={() => navigate('/students/inbox')}>
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                          <Clock size={16} className="text-slate-400 group-hover:text-indigo-500" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-700 line-clamp-1">{notif.title || 'Broadcast'}</p>
                          <p className="text-xs text-slate-400 font-medium">{notif.createdAt?.seconds ? new Date(notif.createdAt.seconds * 1000).toLocaleDateString() : 'Today'}</p>
                        </div>
                      </div>
                    )) : (
                      <p className="text-sm font-bold text-slate-400 text-center py-4 italic">No recent alerts</p>
                    )}
                  </div>
                </motion.div>

                {/* Performance Card */}
                <motion.div variants={item} className="bg-indigo-600 p-8 rounded-[2rem] text-white shadow-xl shadow-indigo-500/30">
                  <div className="flex items-center gap-3 mb-4">
                    <Award className="text-indigo-200" size={24} />
                    <h3 className="text-lg font-black tracking-tight">Performance</h3>
                  </div>
                  <p className="text-sm font-medium text-indigo-100 mb-6">You are in the top 15% of your class this term.</p>
                  <div className="h-2 w-full bg-indigo-400/30 rounded-full overflow-hidden mb-3">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${avgScore}%` }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      className="h-full bg-white rounded-full"
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-indigo-200">
                    <span>Rank: {avgScore > 70 ? 'Excellent' : 'Good'}</span>
                    <span>{avgScore}% Completion</span>
                  </div>
                </motion.div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <PinSetupModal />
    </div>
  );
};

export default StudentDashboard;

