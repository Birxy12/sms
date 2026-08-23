import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useStudentAuth } from '../context/StudentAuthContext';
import { useTheme } from '../context/ThemeContext';
import StudentAvatar from './StudentAvatar';
import { 
  LayoutDashboard, Users, BookOpen, GraduationCap, Settings, LogOut,
  DollarSign, Calendar, Layers, FileText, Mail, UserCircle, Award,
  Inbox as InboxIcon, CreditCard, Home, X, MonitorCheck, UserPlus, Star, Fingerprint, BarChart3
} from 'lucide-react';

const Sidebar = ({ sidebarOpen, onClose }) => {
  const { currentAdmin, logout: adminLogout } = useAdminAuth();
  const { currentStudent, logout: studentLogout } = useStudentAuth();
  const { schoolName, primaryColor, schoolLogo } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const isStudentZone = location.pathname.startsWith('/students');

  const role = isStudentZone 
    ? 'student' 
    : (currentAdmin ? currentAdmin.role : 'student');

  const handleLogout = async () => {
    if (isStudentZone) {
      await studentLogout();
      navigate('/');
    } else {
      await adminLogout();
      navigate('/admin-login');
    }
  };

  const allNavItems = [
    { name: 'Home Page',          path: '/',               icon: Home,            roles: ['admin', 'principal', 'teacher', 'bursar', 'student'], exact: true },
    { name: 'Director Panel',     path: '/admin',          icon: LayoutDashboard, roles: ['admin'] },
    { name: 'Principal Panel',    path: '/principal',      icon: LayoutDashboard, roles: ['principal', 'admin'] },
    { name: 'Teacher Dashboard',  path: '/teachers',       icon: LayoutDashboard, roles: ['teacher', 'principal', 'admin'] },
    { name: 'Finance Control',    path: '/finance',        icon: DollarSign,      roles: ['bursar', 'admin'] },
    { name: 'Analysis & Metrics', path: '/admin/analysis', icon: BarChart3,       roles: ['admin'] },
    { name: 'School Analysis',    path: '/principal/analysis', icon: BarChart3,   roles: ['principal'] },
    { name: 'Class Analysis',     path: '/teachers/analysis', icon: BarChart3,    roles: ['teacher'] },
    { name: 'Financial Analysis', path: '/finance/analysis', icon: BarChart3,     roles: ['bursar'] },
    { name: 'Register Student',   path: '/finance?tab=register', icon: UserPlus,  roles: ['bursar', 'admin'] },
    { name: 'Manual Payment',     path: '/finance?tab=cashpay',  icon: CreditCard,roles: ['bursar', 'admin'] },
    { name: 'Manage Students',    path: '/admin/students', icon: GraduationCap,   roles: ['admin', 'principal'] },
    { name: 'Manage Classes',     path: '/admin/classes',  icon: Layers,          roles: ['admin', 'principal'] },
    { name: 'Manage Staff',       path: '/staff',          icon: Users,           roles: ['admin'] },
    { name: 'Register Subjects',  path: '/courses',        icon: BookOpen,        roles: ['admin'] },
    { name: 'School Mailing',     path: '/messages',       icon: Mail,            roles: ['admin', 'teacher', 'principal', 'bursar'] },
    { name: 'Content Management', path: '/admin/posts',    icon: FileText,        roles: ['admin', 'principal'] },
    { name: 'Manage Fame',        path: '/admin/fame',     icon: Star,            roles: ['admin', 'principal'] },
    { name: 'CBT Exams',          path: '/cbt',            icon: MonitorCheck,    roles: ['admin', 'principal', 'teacher'] },
    { name: 'Admission CBT',      path: '/admin/admission-cbt', icon: MonitorCheck, roles: ['admin', 'principal'] },
    { name: 'Notification Center',path: '/admin/notifications', icon: Mail,       roles: ['admin', 'principal'] },
    { name: 'Attendance',         path: '/attendance',     icon: Fingerprint,     roles: ['admin', 'principal', 'teacher', 'bursar'] },
    { name: 'School Branding',    path: '/settings',       icon: Settings,        roles: ['admin'] },
    { name: 'My Profile',         path: '/profile',        icon: UserCircle,      roles: ['admin', 'teacher', 'principal', 'bursar'] },
    { name: 'Overview',           path: '/students',       icon: LayoutDashboard, roles: ['student'], exact: true },
    { name: 'Analysis',           path: '/students/analysis', icon: BarChart3,    roles: ['student'] },
    { name: 'Inbox',              path: '/students/inbox', icon: InboxIcon,       roles: ['student'] },
    { name: 'Assignments',        path: '/students/assignments', icon: Calendar,  roles: ['student'] },
    { name: 'CBT Exams',          path: '/students/cbt',   icon: MonitorCheck,    roles: ['student'] },
    { name: 'Notes & Materials',  path: '/students/notes', icon: FileText,        roles: ['student'] },
    { name: 'Results',            path: '/students/results', icon: Award,         roles: ['student'] },
    { name: 'School Fees',        path: '/students/fees',  icon: CreditCard,      roles: ['student'] },
    { name: 'My Profile',         path: '/students/profile', icon: UserCircle,    roles: ['student'] },
    { name: 'ID Card',            path: '/students/idcard', icon: GraduationCap,  roles: ['student'] },
    { name: 'Register Subjects',  path: '/students/registration', icon: BookOpen, roles: ['student'] },
  ];

  const navItems = allNavItems.filter(item => item.roles.includes(role));

  const studentName = currentStudent?.name || currentStudent?.['STUDENT NAME'] || 'Student';
  const studentClass = currentStudent?.className || currentStudent?.classId || '';
  const displayName = isStudentZone ? studentName : (currentAdmin?.name || currentAdmin?.email || 'Admin');
  
  const displaySub = isStudentZone ? studentClass : (
    currentAdmin?.role === 'admin' ? 'Administrator' : 
    currentAdmin?.role === 'principal' ? 'Principal' :
    currentAdmin?.role === 'bursar' ? 'Bursar' : 'Staff'
  );

  const initial = displayName[0]?.toUpperCase() || '?';

  return (
    <div className={`sidebar${sidebarOpen ? ' open' : ''}`}>
      {/* Header */}
      <div style={{
        padding: '24px 20px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        {schoolLogo ? (
          <img src={schoolLogo} alt="Logo" style={{
            width: '40px', height: '40px',
            objectFit: 'contain', borderRadius: '10px',
            border: '2px solid rgba(255,255,255,0.1)',
          }} />
        ) : (
          <div style={{
            width: '40px', height: '40px',
            background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}99)`,
            borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px', fontWeight: '900', color: 'white',
            boxShadow: `0 4px 12px ${primaryColor}40`,
          }}>
            {(schoolName || 'S')[0]}
          </div>
        )}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <h2 style={{
            color: 'white', fontSize: '15px', fontWeight: '900',
            margin: 0, letterSpacing: '-0.01em',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{schoolName || 'School'}<span style={{ color: primaryColor }}>.</span></h2>
          <p style={{ margin: 0, fontSize: '11px', color: '#4a5568', fontWeight: '600' }}>PORTAL</p>
        </div>
        <button 
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.07)', border: 'none',
            color: '#6e7d96', cursor: 'pointer', borderRadius: '8px',
            padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          className="md:hidden"
        >
          <X size={18} />
        </button>
      </div>

      {/* Mini Profile */}
      <div style={{
        padding: '14px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        marginBottom: '6px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {(() => {
            const user = isStudentZone ? currentStudent : currentAdmin;
            const photo = user?.photo || user?.photoURL;
            if (photo) {
              return (
                <img 
                  src={photo} 
                  alt="Profile" 
                  style={{
                    width: '38px', height: '38px', borderRadius: '50%',
                    objectFit: 'cover', flexShrink: 0,
                    border: `2px solid ${primaryColor}60`
                  }} 
                />
              );
            }
            if (isStudentZone) {
              return (
                <StudentAvatar gender={user?.gender} avatarId={user?.avatarId} size={38} className="rounded-full border-2 border-indigo-200/50 shadow-sm" />
              );
            }
            return (
              <div style={{
                width: '38px', height: '38px',
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${primaryColor}33, ${primaryColor}66)`,
                border: `2px solid ${primaryColor}60`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: '900', color: primaryColor,
                fontSize: '15px', flexShrink: 0,
              }}>
                {initial}
              </div>
            );
          })()}
          <div style={{ overflow: 'hidden' }}>
            <p style={{
              margin: 0, fontWeight: '800', color: 'rgba(255,255,255,0.92)',
              fontSize: '13px', whiteSpace: 'nowrap',
              overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{displayName}</p>
            <p style={{
              margin: 0, fontSize: '11px', color: '#6e7d96',
              textTransform: 'capitalize', fontWeight: '600',
            }}>{displaySub}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav" style={{ flex: 1 }}>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.exact}
            className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
            onClick={onClose}
          >
            <item.icon size={18} />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer logout */}
      <div style={{
        padding: '16px 20px',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        marginTop: 'auto',
      }}>
        <button
          onClick={handleLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)',
            color: '#f87171', cursor: 'pointer', padding: '10px 14px',
            borderRadius: '10px', fontWeight: '700', fontSize: '13px',
            width: '100%', transition: 'all 0.2s ease',
            fontFamily: 'inherit',
          }}
          onMouseEnter={e => { e.currentTarget.style.background='rgba(244,63,94,0.2)'; }}
          onMouseLeave={e => { e.currentTarget.style.background='rgba(244,63,94,0.1)'; }}
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
