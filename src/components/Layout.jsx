import { useLocation, NavLink } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useStudentAuth } from '../context/StudentAuthContext';
import { useTheme } from '../context/ThemeContext';
import { useState, useEffect } from 'react';
import { 
  Menu, LayoutDashboard, Award, CreditCard, 
  Inbox as InboxIcon, FileText, UserCircle, GraduationCap,
  Users, DollarSign, MonitorCheck, Mail, Settings
} from 'lucide-react';

const Layout = ({ children }) => {
  const { currentAdmin } = useAdminAuth();
  const { currentStudent } = useStudentAuth();
  const { primaryColor, schoolLogo, schoolName } = useTheme();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || document.activeElement?.isContentEditable) {
        return;
      }

      const scrollAmount = 140;
      const pageAmount = window.innerHeight * 0.85;
      const scrollable = document.querySelector('.main-content') || document.documentElement || document.body;

      if (e.key === 'ArrowDown') {
        scrollable.scrollBy({ top: scrollAmount, behavior: 'smooth' });
      } else if (e.key === 'ArrowUp') {
        scrollable.scrollBy({ top: -scrollAmount, behavior: 'smooth' });
      } else if (e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)) {
        scrollable.scrollBy({ top: pageAmount, behavior: 'smooth' });
      } else if (e.key === 'PageUp' || (e.key === ' ' && e.shiftKey)) {
        scrollable.scrollBy({ top: -pageAmount, behavior: 'smooth' });
      } else if (e.key === 'Home') {
        scrollable.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (e.key === 'End') {
        scrollable.scrollTo({ top: scrollable.scrollHeight, behavior: 'smooth' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isStudentZone = location.pathname.startsWith('/students');
  const role = isStudentZone ? 'student' : (currentAdmin?.role || 'student');
  const user = isStudentZone ? currentStudent : (currentAdmin || currentStudent);
  const displayName = user?.name || user?.['STUDENT NAME'] || user?.email?.split('@')[0] || 'User';
  const initial = displayName?.[0]?.toUpperCase() || '?';

  // Bottom nav items by role — keep to 5 max for clean mobile layout
  const studentBottomNav = [
    { label: 'Home',     path: '/students',         icon: LayoutDashboard, exact: true },
    { label: 'Results',  path: '/students/results',  icon: Award },
    { label: 'Inbox',    path: '/students/inbox',    icon: InboxIcon },
    { label: 'Fees',     path: '/students/fees',     icon: CreditCard },
    { label: 'Profile',  path: '/students/profile',  icon: UserCircle },
  ];

  const adminBottomNav = [
    { label: 'Dashboard', path: '/admin',           icon: LayoutDashboard },
    { label: 'Students',  path: '/admin/students',  icon: GraduationCap },
    { label: 'Staff',     path: '/staff',           icon: Users },
    { label: 'Mailing',   path: '/messages',        icon: Mail },
    { label: 'Profile',   path: '/profile',         icon: UserCircle },
  ];

  const principalBottomNav = [
    { label: 'Dashboard', path: '/principal',       icon: LayoutDashboard },
    { label: 'Students',  path: '/admin/students',  icon: GraduationCap },
    { label: 'Mailing',   path: '/messages',        icon: Mail },
    { label: 'CBT',       path: '/cbt',             icon: MonitorCheck },
    { label: 'Profile',   path: '/profile',         icon: UserCircle },
  ];

  const teacherBottomNav = [
    { label: 'Dashboard', path: '/teachers',        icon: LayoutDashboard },
    { label: 'Mailing',   path: '/messages',        icon: Mail },
    { label: 'CBT',       path: '/cbt',             icon: MonitorCheck },
    { label: 'Attendance',path: '/attendance',      icon: FileText },
    { label: 'Profile',   path: '/profile',         icon: UserCircle },
  ];

  const bursarBottomNav = [
    { label: 'Finance',   path: '/finance',         icon: DollarSign },
    { label: 'Register',  path: '/finance?tab=register', icon: GraduationCap },
    { label: 'Mailing',   path: '/messages',        icon: Mail },
    { label: 'Attendance',path: '/attendance',      icon: FileText },
    { label: 'Profile',   path: '/profile',         icon: UserCircle },
  ];

  const getBottomNav = () => {
    if (isStudentZone) return studentBottomNav;
    if (role === 'admin') return adminBottomNav;
    if (role === 'principal') return principalBottomNav;
    if (role === 'bursar') return bursarBottomNav;
    return teacherBottomNav;
  };

  const bottomNavItems = getBottomNav();

  return (
    <div className="layout" style={{ position: 'relative' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 99, backdropFilter: 'blur(4px)' }}
        />
      )}

      {/* Sidebar — hidden on print */}
      <div className="no-print">
        <Sidebar sidebarOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>

      <main className="main-content">
        {/* Mobile top strip — hidden on print */}
        <div className="no-print mobile-top-strip">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hamburger-btn"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>

          {/* School logo / name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
            {schoolLogo ? (
              <img src={schoolLogo} alt="Logo" style={{ width: '28px', height: '28px', objectFit: 'contain', borderRadius: '6px' }} />
            ) : (
              <div style={{
                width: '28px', height: '28px',
                background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)`,
                borderRadius: '7px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '13px', fontWeight: '900', color: 'white',
              }}>
                {(schoolName || 'S')[0]}
              </div>
            )}
            <span style={{
              fontWeight: '800', fontSize: '15px', color: '#0d1526',
              letterSpacing: '-0.02em', whiteSpace: 'nowrap',
              overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{displayName}</span>
          </div>

          {/* Avatar */}
          {user?.photo || user?.photoURL ? (
            <img 
              src={user.photo || user.photoURL} 
              alt="Avatar"
              style={{
                width: '34px', height: '34px', borderRadius: '50%',
                objectFit: 'cover', flexShrink: 0,
                border: `2px solid ${primaryColor}60`
              }} 
            />
          ) : isStudentZone ? (
            <img 
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random&color=fff`}
              alt="Default Avatar"
              style={{
                width: '34px', height: '34px', borderRadius: '50%',
                objectFit: 'cover', flexShrink: 0,
                border: `2px solid ${primaryColor}60`,
                opacity: 0.9
              }} 
            />
          ) : (
            <div style={{
              width: '34px', height: '34px', borderRadius: '50%',
              background: `linear-gradient(135deg, ${primaryColor}33, ${primaryColor}88)`,
              border: `2px solid ${primaryColor}60`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: '900', fontSize: '13px', color: primaryColor,
              flexShrink: 0,
            }}>
              {initial}
            </div>
          )}
        </div>

        <div className="page-content">
          {children}
        </div>
      </main>

      {/* Bottom Navigation Bar — mobile only, hidden on print */}
      <nav className="mobile-bottom-nav no-print">
        <div className="mobile-bottom-nav-inner">
          {bottomNavItems.map((item) => {
            const isActive = item.exact 
              ? location.pathname === item.path 
              : location.pathname.startsWith(item.path.split('?')[0]);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`mobile-bottom-nav-item${isActive ? ' active' : ''}`}
              >
                <div className="bnav-icon-wrap">
                  <item.icon size={20} />
                </div>
                <span className="bnav-label">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default Layout;
