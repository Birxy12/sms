import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, LogIn, LogOut, X, Home, Award, BookOpen, Phone, Newspaper, BarChart3, User, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useStudentAuth } from '../context/StudentAuthContext';
import brandlogo from '../assets/bdslogo.jpg';
import './navbar.css';

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  
  const { schoolName, schoolLogo, navbarBg, navbarTextColor, darkMode, toggleDarkMode } = useTheme();
  const { currentAdmin, logout: adminLogout } = useAdminAuth();
  const { currentStudent, logout: studentLogout } = useStudentAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.classList.add('nav-locked');
    } else {
      document.body.classList.remove('nav-locked');
    }
    return () => document.body.classList.remove('nav-locked');
  }, [isMobileMenuOpen]);

  const user = currentAdmin || currentStudent;
  const isStudent = !!currentStudent;
  const displayName = user?.name || user?.['STUDENT NAME'] || user?.email?.split('@')[0] || 'User';
  const userRole = isStudent ? 'Student' : currentAdmin?.role || 'Staff';
  const userInitial = displayName?.[0]?.toUpperCase() || 'U';
  const userPhoto = user?.image || user?.photoURL;

  const getDashboardPath = () => {
    if (currentStudent) return '/students';
    if (currentAdmin) {
      const role = currentAdmin.role;
      if (role === 'admin') return '/admin';
      if (role === 'principal') return '/principal';
      if (role === 'teacher') return '/teachers';
      if (role === 'bursar') return '/finance';
    }
    return null;
  };

  const dashboardPath = getDashboardPath();

  const navLinks = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Check Result', path: '/check-result', icon: BarChart3 },
    { name: 'About', path: '/about', icon: BookOpen },
    { name: 'Blog', path: '/blog', icon: Newspaper },
    { name: 'Leaderboard', path: '/leaderboard', icon: Award },
    { name: 'Contact us', path: '/contact', icon: Phone },
  ];

  const handleLogout = async () => {
    if (isStudent) await studentLogout();
    else await adminLogout();
    setIsMobileMenuOpen(false);
    navigate('/');
  };

  const handleProfileClick = () => {
    navigate(isStudent ? '/students' : '/profile');
    setIsMobileMenuOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  const isTransparent = !isScrolled && (!navbarBg || navbarBg === '#ffffff' || navbarBg === 'transparent');
  
  const navStyle = isScrolled ? {
    backgroundColor: darkMode ? '#1e293b' : (navbarBg || '#ffffff'),
    boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
    borderBottom: darkMode ? '1px solid #334155' : '1px solid rgba(0,0,0,0.06)',
  } : {
    backgroundColor: darkMode ? '#1e293b' : (navbarBg || '#ffffff'),
    boxShadow: 'none',
    borderBottom: darkMode ? '1px solid #334155' : '1px solid rgba(0,0,0,0.06)',
  };

  const textColor = darkMode ? '#f8fafc' : (navbarTextColor || '#1e293b');
  const accentColor = '#ea580c';

  return (
    <>
      <nav className="navbar-solid" style={navStyle}>
        <div className="nav-container">
          <div className="nav-inner">
            
            {/* Left: Logo + Links (same row) */}
            <div className="nav-left">
              <Link to="/" className="brand">
                <div className="brand-logo">
                  <img src={schoolLogo || brandlogo} alt="Logo" />
                </div>
                <div className="brand-text">
                  <span className="brand-name" style={{ color: textColor }}>
                    {schoolName || 'Birxy SMS'}
                  </span>
                </div>
              </Link>

              {/* Desktop Links - inline with brand */}
              <div className="desktop-links">
                {navLinks.map((link) => {
                  const active = isActive(link.path);
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.name}
                      to={link.path}
                      className={`nav-item ${active ? 'nav-item--active' : ''}`}
                      style={{ color: active ? accentColor : textColor }}
                    >
                      <Icon size={15} strokeWidth={2.5} className="desktop-icon-hide" />
                      <span>{link.name}</span>
                      {active && <span className="nav-dot" />}
                    </Link>
                  );
                })}
                {dashboardPath && (
                  <Link to={dashboardPath} className="nav-dashboard">
                    Dashboard
                  </Link>
                )}
              </div>
            </div>

            {/* Right: User or Login */}
            <div className="nav-right">
              {/* Dark Mode Toggle Button */}
              <button 
                onClick={toggleDarkMode} 
                className="theme-toggle-btn"
                title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                style={{
                  background: 'none',
                  border: 'none',
                  color: textColor,
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '12px',
                }}
              >
                {darkMode ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} />}
              </button>

              {user ? (
                <div className="user-bar">
                  <button onClick={handleProfileClick} className="user-chip">
                    <div className="user-info">
                      <span className="user-role">{userRole}</span>
                      <span className="user-name">{displayName}</span>
                    </div>
                    <div className="user-avatar">
                      {userPhoto ? <img src={userPhoto} alt="" /> : userInitial}
                    </div>
                  </button>
                  <button onClick={handleLogout} className="logout-btn" title="Logout">
                    <LogOut size={16} />
                  </button>
                </div>
              ) : (
                <Link to="/login" className="login-btn">
                  <LogIn size={16} />
                  Login
                </Link>
              )}
            </div>

            {/* Mobile Toggle */}
            <div className="mobile-toggle-wrap">
              {/* Mobile Dark Mode Toggle */}
              <button 
                onClick={toggleDarkMode} 
                className="theme-toggle-btn"
                style={{
                  background: 'none',
                  border: 'none',
                  color: textColor,
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {darkMode ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} />}
              </button>

              {user && (
                <button onClick={handleProfileClick} className="mobile-avatar-btn">
                  {userPhoto ? <img src={userPhoto} alt="" /> : userInitial}
                </button>
              )}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={`mobile-toggle ${isMobileMenuOpen ? 'mobile-toggle--active' : ''}`}
              >
                {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="mobile-overlay" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="mobile-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-drawer-inner">
              {user && (
                <div className="mobile-user">
                  <div className="mobile-user-avatar">
                    {userPhoto ? <img src={userPhoto} alt="" /> : userInitial}
                  </div>
                  <div className="mobile-user-info">
                    <p className="mobile-user-role">{userRole}</p>
                    <p className="mobile-user-name">{displayName}</p>
                  </div>
                </div>
              )}

              {navLinks.map((link) => {
                const active = isActive(link.path);
                const Icon = link.icon;
                return (
                  <Link
                    key={link.name}
                    to={link.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`mobile-link ${active ? 'mobile-link--active' : ''}`}
                  >
                    <Icon size={18} />
                    {link.name}
                  </Link>
                );
              })}

              {dashboardPath && (
                <Link to={dashboardPath} onClick={() => setIsMobileMenuOpen(false)} className="mobile-dashboard">
                  <BarChart3 size={18} /> Dashboard
                </Link>
              )}

              <div className="mobile-actions">
                {user ? (
                  <>
                    <button onClick={() => { handleProfileClick(); setIsMobileMenuOpen(false); }} className="mobile-action">
                      <User size={18} /> Profile
                    </button>
                    <button onClick={handleLogout} className="mobile-logout">
                      <LogOut size={18} /> Sign Out
                    </button>
                  </>
                ) : (
                  <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className="mobile-login">
                    <LogIn size={18} /> Login to Portal
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="nav-spacer" />
    </>
  );
};

export default Navbar;