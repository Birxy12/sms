import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { useStudentAuth } from '../context/StudentAuthContext';
import { useAdminAuth } from '../context/AdminAuthContext';
import { 
  User, Mail, Lock, GraduationCap, 
  ShieldCheck, ArrowRight, ChevronLeft, Loader2,
  AlertCircle, HelpCircle, UserCheck, Wallet, Phone
} from 'lucide-react';
import './Auth.css';
import bdsLogo from '../assets/bdslogo.jpg';

/* ── Google G Icon (SVG inline) ── */
const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const Login = () => {
  const [loginType, setLoginType] = useState('student');
  const [staffLoginMode, setStaffLoginMode] = useState('email'); // 'email' | 'phone'
  const [formData, setFormData] = useState({ regNo: '', className: '', email: '', password: '', phone: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [hoveredField, setHoveredField] = useState(null);

  const navigate = useNavigate();
  const studentAuth = useStudentAuth();
  const adminAuth = useAdminAuth();

  const isStaff = loginType !== 'student';

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const navigateByRole = (role) => {
    if (role === 'admin') navigate('/admin');
    else if (role === 'principal') navigate('/principal');
    else if (role === 'bursar') navigate('/finance');
    else navigate('/teachers');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (loginType === 'student') {
        const result = await studentAuth.login(formData.regNo, formData.className);
        if (result.success) navigate('/students');
        else setError(result.message);
      } else if (staffLoginMode === 'phone') {
        const result = await adminAuth.loginWithPhone(formData.phone, formData.password);
        if (result.success) navigateByRole(result.role);
        else setError(result.message);
      } else {
        const result = await adminAuth.login(formData.email, formData.password);
        if (result.success) {
          const user = JSON.parse(localStorage.getItem('adminUser'));
          navigateByRole(user?.role);
        } else {
          setError(result.message);
        }
      }
    } catch {
      setError('Connection failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError('');
    try {
      const result = await adminAuth.loginWithGoogle();
      if (result.success) navigateByRole(result.role);
      else if (result.message) setError(result.message);
    } finally {
      setGoogleLoading(false);
    }
  };

  const getTooltipContent = (field) => {
    switch (field) {
      case 'regNo': return 'Unique ID assigned to you by the school (e.g. BDS/24/001)';
      case 'className': return 'Select the class you are currently enrolled in';
      case 'email': return 'Enter your school-assigned email or Staff ID';
      case 'phone': return 'Enter the mobile number registered with the school';
      case 'password': return 'Default password is 134 if not yet changed';
      default: return '';
    }
  };

  const tabs = [
    { id: 'student', label: 'Student', icon: GraduationCap, color: 'indigo' },
    { id: 'teacher', label: 'Teacher', icon: UserCheck, color: 'rose' },
    { id: 'principal', label: 'Principal', icon: ShieldCheck, color: 'purple' },
    { id: 'bursar', label: 'Bursar', icon: Wallet, color: 'emerald' },
    { id: 'admin', label: 'Admin', icon: ShieldCheck, color: 'blue' },
  ];

  const accentColor = {
    student: 'btn-indigo', teacher: 'btn-rose', principal: 'btn-purple', bursar: 'btn-emerald', admin: 'btn-blue'
  }[loginType];

  const iconBg = {
    student: 'bg-indigo-50 text-indigo-600',
    teacher: 'bg-rose-50 text-rose-600',
    principal: 'bg-purple-50 text-purple-600',
    bursar: 'bg-emerald-50 text-emerald-600',
    admin: 'bg-blue-50 text-blue-600',
  }[loginType];

  return (
    <div className="auth-container">
      {[1,2,3,4,5,6,7,8].map(i => (
        <div key={i} className={`auth-floating-logo auth-logo-${i}`}>
          <img src={bdsLogo} alt="" />
        </div>
      ))}

      <div className="auth-back-link">
        <Link to="/" className="flex items-center gap-1 text-slate-500 hover:text-indigo-600 transition-colors font-bold text-xs tracking-widest">
          <ChevronLeft size={16} /> BACK TO HOME
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="auth-card advanced-card"
      >
        {/* Header */}
        <div className="auth-header">
          <motion.div
            key={loginType}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`auth-icon-wrapper ${iconBg}`}
          >
            {loginType === 'student' ? <GraduationCap size={32} /> :
             loginType === 'teacher' ? <UserCheck size={32} /> :
             loginType === 'principal' ? <ShieldCheck size={32} /> : 
             loginType === 'bursar' ? <Wallet size={32} /> : <ShieldCheck size={32} />}
          </motion.div>
          <h1 className="auth-title">Portal Access</h1>
          <p className="auth-subtitle">Select your role and enter credentials</p>
        </div>

        {/* Role Tabs */}
        <div className="auth-tabs-grid">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setLoginType(tab.id); setError(''); setStaffLoginMode('email'); }}
              className={`auth-tab-item ${loginType === tab.id ? `active active-${tab.color}` : ''}`}
            >
              <tab.icon size={16} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ── Staff: Google + Phone mode toggle (above form) ── */}
        <AnimatePresence>
          {isStaff && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ overflow: 'hidden' }}
            >
              {/* Google Sign-In */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={googleLoading}
                className="staff-google-btn"
              >
                {googleLoading ? <Loader2 size={18} className="animate-spin" /> : <GoogleIcon />}
                <span>{googleLoading ? 'Signing in…' : 'Continue with Google'}</span>
              </button>

              {/* Divider */}
              <div className="auth-divider">
                <span>or sign in with</span>
              </div>

              {/* Email / Phone toggle */}
              <div className="staff-mode-toggle">
                <button
                  type="button"
                  onClick={() => { setStaffLoginMode('email'); setError(''); }}
                  className={`toggle-pill ${staffLoginMode === 'email' ? 'active' : ''}`}
                >
                  <Mail size={13} /> Email / Staff ID
                </button>
                <button
                  type="button"
                  onClick={() => { setStaffLoginMode('phone'); setError(''); }}
                  className={`toggle-pill ${staffLoginMode === 'phone' ? 'active' : ''}`}
                >
                  <Phone size={13} /> Phone Number
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Credential Form */}
        <form onSubmit={handleLogin} className="auth-form mt-6">
          <AnimatePresence mode="wait">
            {loginType === 'student' ? (
              <motion.div key="student" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-5">
                {/* Reg No */}
                <div className="input-field-container">
                  <div className="flex items-center justify-between mb-2">
                    <label className="field-label">Registration Number</label>
                    <div className="relative group">
                      <HelpCircle size={14} className="text-slate-300 cursor-help" onMouseEnter={() => setHoveredField('regNo')} onMouseLeave={() => setHoveredField(null)} />
                      {hoveredField === 'regNo' && <div className="field-tooltip">{getTooltipContent('regNo')}</div>}
                    </div>
                  </div>
                  <div className="input-group-advanced">
                    <User size={18} className="input-icon" />
                    <input type="text" name="regNo" placeholder="e.g. BDS/24/001" value={formData.regNo} onChange={handleInputChange} required className="auth-input-advanced" />
                  </div>
                </div>
                {/* Class */}
                <div className="input-field-container">
                  <div className="flex items-center justify-between mb-2">
                    <label className="field-label">Academic Class</label>
                    <div className="relative group">
                      <HelpCircle size={14} className="text-slate-300 cursor-help" onMouseEnter={() => setHoveredField('className')} onMouseLeave={() => setHoveredField(null)} />
                      {hoveredField === 'className' && <div className="field-tooltip">{getTooltipContent('className')}</div>}
                    </div>
                  </div>
                  <div className="input-group-advanced">
                    <SchoolIcon size={18} className="input-icon" />
                    <select name="className" value={formData.className} onChange={handleInputChange} required className="auth-input-advanced pr-10">
                      <option value="">Choose Class</option>
                      {['JSS1','JSS2','JSS3','SS1','SS2 ART','SS2 SCIENCE','SS3 ART','SS3 SCIENCE'].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </motion.div>
            ) : staffLoginMode === 'phone' ? (
              <motion.div key="staff-phone" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-5">
                {/* Phone */}
                <div className="input-field-container">
                  <div className="flex items-center justify-between mb-2">
                    <label className="field-label">Phone Number</label>
                    <div className="relative group">
                      <HelpCircle size={14} className="text-slate-300 cursor-help" onMouseEnter={() => setHoveredField('phone')} onMouseLeave={() => setHoveredField(null)} />
                      {hoveredField === 'phone' && <div className="field-tooltip">{getTooltipContent('phone')}</div>}
                    </div>
                  </div>
                  <div className="input-group-advanced">
                    <Phone size={18} className="input-icon" />
                    <input type="tel" name="phone" placeholder="e.g. 08012345678" value={formData.phone} onChange={handleInputChange} required className="auth-input-advanced" />
                  </div>
                </div>
                {/* Password */}
                <div className="input-field-container">
                  <div className="flex items-center justify-between mb-2">
                    <label className="field-label">Password</label>
                    <div className="relative group">
                      <HelpCircle size={14} className="text-slate-300 cursor-help" onMouseEnter={() => setHoveredField('password')} onMouseLeave={() => setHoveredField(null)} />
                      {hoveredField === 'password' && <div className="field-tooltip">{getTooltipContent('password')}</div>}
                    </div>
                  </div>
                  <div className="input-group-advanced">
                    <Lock size={18} className="input-icon" />
                    <input type="password" name="password" placeholder="••••••••" value={formData.password} onChange={handleInputChange} required className="auth-input-advanced" />
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div key="staff-email" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-5">
                {/* Email / Staff ID */}
                <div className="input-field-container">
                  <div className="flex items-center justify-between mb-2">
                    <label className="field-label">Email or Staff ID</label>
                    <div className="relative group">
                      <HelpCircle size={14} className="text-slate-300 cursor-help" onMouseEnter={() => setHoveredField('email')} onMouseLeave={() => setHoveredField(null)} />
                      {hoveredField === 'email' && <div className="field-tooltip">{getTooltipContent('email')}</div>}
                    </div>
                  </div>
                  <div className="input-group-advanced">
                    <Mail size={18} className="input-icon" />
                    <input type="text" name="email" placeholder={loginType === 'teacher' ? 'e.g. bds/staff/001' : 'Email Address'} value={formData.email} onChange={handleInputChange} required className="auth-input-advanced" />
                  </div>
                </div>
                {/* Password */}
                <div className="input-field-container">
                  <div className="flex items-center justify-between mb-2">
                    <label className="field-label">Password</label>
                    <div className="relative group">
                      <HelpCircle size={14} className="text-slate-300 cursor-help" onMouseEnter={() => setHoveredField('password')} onMouseLeave={() => setHoveredField(null)} />
                      {hoveredField === 'password' && <div className="field-tooltip">{getTooltipContent('password')}</div>}
                    </div>
                  </div>
                  <div className="input-group-advanced">
                    <Lock size={18} className="input-icon" />
                    <input type="password" name="password" placeholder="••••••••" value={formData.password} onChange={handleInputChange} required className="auth-input-advanced" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="auth-error-advanced">
              <AlertCircle size={16} /> <span>{error}</span>
            </motion.div>
          )}

          <button type="submit" disabled={loading} className={`auth-btn-advanced ${accentColor}`}>
            {loading ? <Loader2 size={22} className="animate-spin" /> : <><ArrowRight size={20} /> Access Portal</>}
          </button>
        </form>

        <div className="auth-footer-advanced">
          {isStaff ? (
            <p>Need staff access? Please contact administration.</p>
          ) : (
            <p>Need a student account? Contact the school administration.</p>
          )}
        </div>
      </motion.div>
    </div>
  );
};

const SchoolIcon = ({ size, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

export default Login;
