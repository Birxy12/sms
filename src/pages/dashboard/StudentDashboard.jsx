import React, { useState, useEffect } from 'react';
import { useStudentAuth } from '../../context/StudentAuthContext';
import { useTheme } from '../../context/ThemeContext';
import { db } from '../../lib/firebase';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { LayoutDashboard, Award, CreditCard, Calendar, Bell, ChevronRight, Inbox as InboxIcon, Trophy, Wallet, BookOpen, Library } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const StudentDashboard = () => {
  const { currentStudent } = useStudentAuth();
  const { primaryColor } = useTheme();
  const navigate = useNavigate();

  const studentName = currentStudent?.name || currentStudent?.['STUDENT NAME'] || 'Student';
  const className   = currentStudent?.className || currentStudent?.classId || 'N/A';
  const regNum      = currentStudent?.regNo || currentStudent?.['REG NO'] || currentStudent?.REGNO || '';

  const [inboxCount, setInboxCount]     = useState(0);
  const [resultsCount, setResultsCount] = useState(0);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    if (!currentStudent) return;
    const load = async () => {
      try {
        const classLevel = className;
        const [s1, s2, s3] = await Promise.all([
          getDocs(query(collection(db, 'notifications'), where('targetType', '==', 'global'))),
          getDocs(query(collection(db, 'notifications'), where('targetType', '==', 'class'),   where('targetValue', '==', classLevel))),
          getDocs(query(collection(db, 'notifications'), where('targetType', '==', 'student'), where('targetValue', '==', regNum))),
        ]);
        const uniqueIds = new Set([...s1.docs, ...s2.docs, ...s3.docs].map(d => d.id));
        setInboxCount(uniqueIds.size);

        const rSnap = await getDocs(query(collection(db, 'marks'), where('regNo', '==', regNum)));
        setResultsCount(rSnap.size);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [currentStudent]);

  const stats = [
    { label: 'School Alerts', value: inboxCount, color: '#6366f1', icon: InboxIcon,  path: '/students/inbox' },
    { label: 'Results',       value: resultsCount,color: '#10b981', icon: Trophy,      path: '/students/results' },
    { label: 'Fees Balance',  value: '₦60,000',   color: '#f59e0b', icon: Wallet,      path: '/students/fees' },
    { label: 'Assignments',   value: 2,            color: '#ef4444', icon: Library,     path: '/students/assignments' },
  ];

  const quickLinks = [
    { label: 'View Inbox',       path: '/students/inbox',       icon: InboxIcon },
    { label: 'My Results',       path: '/students/results',     icon: Trophy },
    { label: 'Assignments',      path: '/students/assignments', icon: BookOpen },
    { label: 'School Fees',      path: '/students/fees',        icon: CreditCard },
  ];

  return (
    <div className="dashboard-wrapper">
      {/* Welcome Banner */}
      <div style={{
        background: `linear-gradient(135deg, ${primaryColor}, #1e293b)`,
        borderRadius: '20px', padding: '28px 32px', color: 'white',
        marginBottom: '28px', position: 'relative', overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '160px', height: '160px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'absolute', bottom: '-50px', right: '60px', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <p style={{ margin: '0 0 6px', fontSize: '13px', fontWeight: '700', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '1px' }}>Welcome back 👋</p>
        <h2 style={{ margin: '0 0 6px', fontSize: '28px', fontWeight: '900' }}>{studentName}</h2>
        <p style={{ margin: 0, opacity: 0.75, fontSize: '14px' }}>{className} &nbsp;•&nbsp; Reg No: {regNum}</p>
      </div>

      {/* Stat Cards */}
      <div className="stats-grid" style={{ marginBottom: '28px' }}>
        {stats.map(s => (
          <div
            key={s.label}
            className="stat-card"
            onClick={() => navigate(s.path)}
            style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden', padding: '24px' }}
          >
            <div style={{ position: 'absolute', top: '-16px', right: '-16px', width: '72px', height: '72px', borderRadius: '50%', background: `${s.color}14` }} />
            <div style={{ marginRight: '16px' }}>
              <s.icon size={24} style={{ color: s.color }} />
            </div>
            <div className="stat-info">
              <h3 style={{ color: s.color, fontSize: '26px', margin: '0 0 4px' }}>
                {loading ? '—' : s.value}
              </h3>
              <p style={{ margin: 0, color: '#64748b', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {quickLinks.map(q => (
          <button
            key={q.label}
            onClick={() => navigate(q.path)}
            style={{
              display: 'flex', alignItems: 'center', gap: '14px', padding: '18px 20px',
              background: 'white', border: '1px solid #e2e8f0', borderRadius: '14px',
              cursor: 'pointer', textAlign: 'left', fontWeight: '700', fontSize: '14px',
              color: '#1e293b', transition: 'all 0.2s', justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: `${primaryColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <q.icon size={20} style={{ color: primaryColor }} />
              </div>
              {q.label}
            </div>
            <ChevronRight size={18} style={{ color: '#94a3b8' }} />
          </button>
        ))}
      </div>

      {/* Announcements placeholder */}
      <div className="card-white">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bell size={18} style={{ color: primaryColor }} /> School Announcements
          </h3>
          <button onClick={() => navigate('/students/inbox')} style={{ fontSize: '13px', color: primaryColor, background: 'none', border: 'none', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
            View All <ChevronRight size={14} />
          </button>
        </div>
        <div className="recent-activity">
          <div className="activity-item">
            <div className="dot"></div>
            <div className="activity-info">
              <p>Check your inbox for the latest school broadcasts.</p>
              <span>Go to Inbox →</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
