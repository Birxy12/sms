import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, Bell, LogIn, User, LogOut } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useStudentAuth } from '../context/StudentAuthContext';
import bdsLogo from '../assets/bdslogo.jpg';
import './navbar.css';

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { schoolName, schoolLogo, navbarBg, navbarTextColor } = useTheme();
  const { currentAdmin, logout: adminLogout } = useAdminAuth();
  const { currentStudent, logout: studentLogout } = useStudentAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // ─── Scroll Listener ─────────────────────────────────────────────
  React.useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ─── Derived State ───────────────────────────────────────────────
  const user = currentAdmin || currentStudent;
  const isStudent = !!currentStudent;
  const displayName = user?.name || user?.['STUDENT NAME'] || user?.email?.split('@')[0] || 'User';
  const userRole = isStudent ? 'Student' : 'Staff';

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'About Us', path: '/about' },
    { name: 'Blog', path: '/blog' },
    { name: 'Leaderboard', path: '/leaderboard' },
    { name: 'Contact Us', path: '/contact' },
  ];

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
  if (dashboardPath) {
    navLinks.push({ name: 'Dashboard', path: dashboardPath });
  }

  const isActive = (path) => location.pathname === path;

  const handleLogout = async () => {
    if (isStudent) await studentLogout();
    else await adminLogout();
    navigate('/');
    setIsMobileMenuOpen(false);
  };

  const handleProfileClick = () => {
    navigate(isStudent ? '/students/profile' : '/profile');
  };

  // ─── Styles ──────────────────────────────────────────────────────
  const getNavStyle = () => {
    if (isScrolled) return {
      backgroundColor: 'rgba(255, 255, 255, 0.85)',
      backdropFilter: 'blur(20px) saturate(180%)',
      boxShadow: '0 4px 30px rgba(0, 0, 0, 0.08)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.3)',
    };
    return {
      backgroundColor: navbarBg || '#ffffff',
      backdropFilter: 'none',
      boxShadow: 'none',
      borderBottom: '1px solid transparent',
    };
  };

  const getTextColor = () => {
    if (isScrolled) return '#1e293b'; // slate-800
    if (!navbarBg || navbarBg === '#ffffff') return '#0f172a'; // slate-900
    return navbarTextColor || '#ffffff';
  };

  const textColor = getTextColor();

  // ─── Render Helpers ──────────────────────────────────────────────
  const Logo = () => (
    <Link to="/" className="flex items-center gap-3 group">
      <div className="relative overflow-hidden" style={{ borderRadius: '4px' }}>
        <img
          src={schoolLogo || bdsLogo}
          alt="Logo"
          style={{ height: '64px', width: '64px', objectFit: 'contain' }}
          className="transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-orange-500/0 group-hover:bg-orange-500/10 transition-colors duration-300" style={{ borderRadius: '4px' }} />
      </div>
      <div className="flex flex-col">
        <span
          className="text-xl font-black tracking-tight leading-none"
          style={{ color: textColor }}
        >
          {schoolName || 'Birxy SMS'}
        </span>
        <span
          className="text-[10px] font-bold uppercase tracking-[0.25em] opacity-50 mt-0.5"
          style={{ color: textColor }}
        >
          School Management
        </span>
      </div>
    </Link>
  );

  const DesktopNav = () => (
    <div className="hidden md:flex items-center gap-1">
      {navLinks.map((link, i) => {
        const active = isActive(link.path);
        return (
          <Link
            key={link.name}
            to={link.path}
            className={`
              relative px-4 py-2 rounded-full text-sm font-bold transition-all duration-300
              ${active
                ? 'text-white'
                : 'hover:text-orange-600'
              }
            `}
            style={{
              color: active ? '#ffffff' : textColor,
              animationDelay: `${i * 75}ms`,
            }}
          >
            {active && (
              <span className="absolute inset-0 bg-orange-600 rounded-full shadow-lg shadow-orange-500/30 animate-scaleIn" />
            )}
            <span className="relative z-10">{link.name}</span>
          </Link>
        );
      })}
    </div>
  );

  const UserChip = () => (
    <div className="hidden md:flex items-center gap-4">
      {user ? (
        <div
          className="flex items-center gap-3 pl-4 pr-1.5 py-1.5 rounded-full border transition-all duration-300 cursor-pointer hover:shadow-lg hover:border-orange-200 group"
          style={{
            backgroundColor: isScrolled ? 'rgba(248, 250, 252, 0.8)' : 'rgba(255,255,255,0.1)',
            borderColor: isScrolled ? 'rgba(226, 232, 240, 0.6)' : 'rgba(255,255,255,0.2)',
          }}
          onClick={handleProfileClick}
        >
          <div className="flex flex-col items-end">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40" style={{ color: textColor }}>
              {userRole}
            </span>
            <span className="text-sm font-bold max-w-[120px] truncate" style={{ color: textColor }}>
              {displayName}
            </span>
          </div>
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-black text-sm shadow-md group-hover:shadow-orange-500/40 transition-shadow overflow-hidden">
            {user.image || user.photoURL ? (
              <img src={user.image || user.photoURL} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              displayName[0].toUpperCase()
            )}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); handleLogout(); }}
            className="p-2 rounded-full hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-all duration-200"
            title="Logout"
          >
            <LogOut size={15} />
          </button>
        </div>
      ) : (
        <Link
          to="/login"
          className="flex items-center gap-2.5 bg-slate-900 hover:bg-orange-600 text-white px-6 py-2.5 rounded-2xl text-sm font-bold transition-all duration-300 shadow-lg hover:shadow-orange-500/25 hover:-translate-y-0.5 active:translate-y-0"
        >
          <LogIn size={16} />
          Portal Access
        </Link>
      )}
    </div>
  );

  const MobileToggle = () => (
    <button
      onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      className={`
        md:hidden p-2.5 rounded-xl transition-all duration-300
        ${isMobileMenuOpen
          ? 'bg-orange-600 text-white rotate-90'
          : 'bg-slate-100 text-slate-600 hover:bg-orange-500 hover:text-white'
        }
      `}
      aria-label="Toggle menu"
    >
      <Menu size={20} />
    </button>
  );

  // ─── Mobile Menu ─────────────────────────────────────────────────
  const MobileMenu = () => {
    if (!isMobileMenuOpen) return null;

    return (
      <div className="md:hidden absolute top-full left-0 right-0 bg-white/95 backdrop-blur-2xl border-t border-slate-100 shadow-2xl animate-slideDown">
        <div className="px-5 py-6 space-y-2 max-h-[calc(100vh-5rem)] overflow-y-auto">
          {/* User Card */}
          {user && (
            <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-slate-50 to-white rounded-2xl border border-slate-100 mb-4">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white text-lg font-black shadow-lg overflow-hidden">
                {user.image || user.photoURL ? (
                  <img src={user.image || user.photoURL} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  displayName[0].toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {userRole}
                </p>
                <p className="text-base font-bold text-slate-800 truncate">
                  {displayName}
                </p>
              </div>
            </div>
          )}

          {/* Nav Links */}
          {navLinks.map((link) => {
            const active = isActive(link.path);
            return (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`
                  flex items-center px-5 py-3.5 rounded-xl text-base font-bold transition-all duration-200
                  ${active
                    ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/20 translate-x-1'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-orange-600 hover:translate-x-1'
                  }
                `}
              >
                {link.name}
                {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/80" />}
              </Link>
            );
          })}

          {/* Action Button */}
          <div className="pt-4 mt-4 border-t border-slate-100">
            {user ? (
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-2.5 w-full bg-rose-500 hover:bg-rose-600 text-white p-4 rounded-2xl text-base font-bold shadow-lg shadow-rose-500/20 transition-all duration-200 active:scale-[0.98]"
              >
                <LogOut size={18} />
                Sign Out
              </button>
            ) : (
              <Link
                to="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2.5 w-full bg-slate-900 hover:bg-orange-600 text-white p-4 rounded-2xl text-base font-bold shadow-xl transition-all duration-300 active:scale-[0.98]"
              >
                <LogIn size={18} />
                Login to Portal
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ─── Main Render ─────────────────────────────────────────────────
  return (
    <nav
      className="sticky top-0 z-50 transition-all duration-500 ease-out"
      style={getNavStyle()}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3 md:py-4">
          <Logo />
          <DesktopNav />
          <div className="flex items-center gap-3">
            <UserChip />
            <MobileToggle />
          </div>
        </div>
      </div>
      <MobileMenu />
    </nav>
  );
};

export default Navbar;