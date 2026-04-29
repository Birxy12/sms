import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useStudentAuth } from '../context/StudentAuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  LayoutDashboard, Users, BookOpen, GraduationCap, Settings, LogOut,
  DollarSign, Calendar, Layers, FileText, Mail, UserCircle, Award,
  Inbox as InboxIcon, CreditCard, Home, X
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

  // All potential nav items
  const allNavItems = [
    { name: 'Home Page',          path: '/',               icon: Home,            roles: ['admin', 'principal', 'teacher', 'bursar', 'student'], exact: true },
    // ── Admin / Teacher / Principal / Bursar ─────────────────
    { name: 'Director Panel',     path: '/admin',          icon: LayoutDashboard, roles: ['admin'] },
    { name: 'Principal Panel',    path: '/principal',      icon: LayoutDashboard, roles: ['principal', 'admin'] },
    { name: 'Teacher Dashboard',  path: '/teachers',       icon: LayoutDashboard, roles: ['teacher', 'principal', 'admin'] },
    { name: 'Finance Control',    path: '/finance',        icon: DollarSign,      roles: ['bursar', 'admin'] },
    { name: 'Manage Students',    path: '/admin/students', icon: GraduationCap,   roles: ['admin', 'principal'] },
    { name: 'Manage Classes',     path: '/admin/classes',  icon: Layers,          roles: ['admin', 'principal'] },
    { name: 'Manage Staff',       path: '/staff',          icon: Users,           roles: ['admin'] },
    { name: 'School Mailing',     path: '/messages',       icon: Mail,            roles: ['admin', 'teacher', 'principal', 'bursar'] },
    { name: 'Content Management', path: '/admin/posts',    icon: FileText,        roles: ['admin', 'principal'] },
    { name: 'Manage Courses',     path: '/courses',        icon: BookOpen,        roles: ['admin', 'principal'] },
    { name: 'School Branding',    path: '/settings',       icon: Settings,        roles: ['admin'] },
    { name: 'My Profile',         path: '/profile',        icon: UserCircle,      roles: ['admin', 'teacher', 'principal', 'bursar'] },

    // ── Student ──────────────────────────────────────────────────
    { name: 'Overview',           path: '/students',            icon: LayoutDashboard, roles: ['student'], exact: true },
    { name: 'Inbox',              path: '/students/inbox',      icon: InboxIcon,       roles: ['student'] },
    { name: 'Assignments',        path: '/students/assignments',icon: Calendar,        roles: ['student'] },
    { name: 'Notes & Materials',  path: '/students/notes',      icon: FileText,        roles: ['student'] },
    { name: 'Results',            path: '/students/results',    icon: Award,           roles: ['student'] },
    { name: 'School Fees',        path: '/students/fees',       icon: CreditCard,      roles: ['student'] },
    { name: 'My Profile',         path: '/students/profile',    icon: UserCircle,      roles: ['student'] },
    { name: 'ID Card',            path: '/students/idcard',     icon: GraduationCap,   roles: ['student'] },
  ];


  const navItems = allNavItems.filter(item => item.roles.includes(role));


  const studentName = currentStudent?.name || currentStudent?.['STUDENT NAME'] || 'Student';
  const studentClass = currentStudent?.className || currentStudent?.classId || '';
  const displayName = isStudentZone ? studentName : (currentAdmin?.name || currentAdmin?.email || 'Admin');
  
  // Format role for display: 'admin' => 'Administrator', 'principal' => 'Principal', 'bursar' => 'Bursar', 'teacher' => 'Staff'
  const displaySub = isStudentZone ? studentClass : (
    currentAdmin?.role === 'admin' ? 'Administrator' : 
    currentAdmin?.role === 'principal' ? 'Principal' :
    currentAdmin?.role === 'bursar' ? 'Bursar' : 'Staff'
  );

  return (
    <div className={`sidebar${sidebarOpen ? ' open' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        {schoolLogo ? (
          <img src={schoolLogo} alt="Logo" style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: '8px' }} />
        ) : (
          <div className="logo-box">{(schoolName || 'S')[0]}</div>
        )}
        <h2>{schoolName || 'School'}<span>.</span></h2>
        <button 
          onClick={onClose}
          className="md:hidden ml-auto p-2 text-slate-400 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>
      </div>

      {/* Mini profile strip */}
      <div style={{ padding: '0 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: `${primaryColor}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: primaryColor, flexShrink: 0, fontSize: '15px' }}>
            {displayName[0]?.toUpperCase()}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <p style={{ margin: 0, fontWeight: '800', color: 'white', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</p>
            <p style={{ margin: 0, fontSize: '11px', color: '#64748b', textTransform: 'capitalize' }}>{displaySub}</p>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.exact}
            className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
            onClick={onClose}
          >
            <item.icon size={20} />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
