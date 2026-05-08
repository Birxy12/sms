// src/pages/Login.jsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { useStudentAuth } from '../context/StudentAuthContext';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  GraduationCap, ShieldCheck, ArrowRight, ChevronLeft, Loader2,
  AlertCircle, HelpCircle, Phone, Lock, Mail, User, 
  School, CheckCircle, Crown, Wallet, Eye, EyeOff
} from 'lucide-react';
import './Auth.css';
import bdsLogo from '../assets/bdslogo.jpg';

/* ── Google G Icon ── */
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

/* ── Role Configurations ── */
const ROLES = [
  { id: 'student', label: 'Student', icon: GraduationCap, color: '#4f46e5' },
  { id: 'teacher', label: 'Teacher', icon: School, color: '#059669' },
  { id: 'principal', label: 'Principal', icon: Crown, color: '#d97706' },
  { id: 'bursar', label: 'Bursar', icon: Wallet, color: '#dc2626' },
  { id: 'admin', label: 'Admin', icon: ShieldCheck, color: '#7c3aed' },
];

const Login = () => {
  const [selectedRole, setSelectedRole] = useState('student');
  const [loginStep, setLoginStep] = useState('credentials');
  const [staffMode, setStaffMode] = useState('email');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ 
    regNo: '', className: '', email: '', password: '', phone: '',
    pin: '', securityAnswer: '', newPin: '' 
  });
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const navigate = useNavigate();
  const studentAuth = useStudentAuth();
  const adminAuth = useAdminAuth();
  const { schoolName } = useTheme();

  const currentRole = ROLES.find(r => r.id === selectedRole);
  const isStudent = selectedRole === 'student';

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const navigateByRole = (role) => {
    const routes = {
      admin: '/admin',
      principal: '/principal',
      bursar: '/finance',
      teacher: '/teachers',
      student: '/student'
    };
    navigate(routes[role] || '/');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isStudent) {
        const result = await studentAuth.login(formData.regNo, formData.className);
        if (result.success) {
          if (result.requirePin) {
            setSecurityQuestion(result.securityQuestion);
            setLoginStep('pin');
          } else {
            navigate('/student');
          }
        } else {
          setError(result.message || 'Login failed');
        }
      } else {
        let result;
        if (staffMode === 'email') {
          result = await adminAuth.login(formData.email, formData.password, selectedRole);
        } else {
          result = await adminAuth.loginWithPhone(formData.phone, formData.password, selectedRole);
        }
        if (result.success) {
          navigateByRole(selectedRole);
        } else {
          setError(result.message || 'Login failed');
        }
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePinSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await studentAuth.verifyPin(formData.pin);
      if (result.success) {
        navigate('/student');
      } else {
        setError(result.message || 'Invalid PIN');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await studentAuth.resetPin(formData.securityAnswer, formData.newPin);
      if (result.success) {
        setLoginStep('pin');
        setError('PIN reset successfully. Please enter your new PIN.');
      } else {
        setError(result.message || 'Failed to reset PIN');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError('');
    try {
      const result = await studentAuth.googleLogin();
      if (result.success) {
        navigate('/student');
      } else {
        setError(result.message || 'Google login failed');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const InputField = ({ label, name, type = 'text', placeholder, icon: Icon, required = true }) => (
    <div className="input-wrapper">
      <label className="input-label">
        <Icon size={14} />
        {label}
      </label>
      <div className="input-container">
        <input
          type={type === 'password' && showPassword ? 'text' : type}
          name={name}
          value={formData[name]}
          onChange={handleInputChange}
          placeholder={placeholder}
          required={required}
          className="modern-input"
        />
        {type === 'password' && (
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="auth-page">
      <motion.div 
        className="auth-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Single Small Logo Header */}
        <div className="auth-header">
          <motion.div 
            className="logo-badge"
            style={{ borderColor: currentRole.color }}
            animate={{ boxShadow: `0 0 0 4px ${currentRole.color}15` }}
            transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse' }}
          >
            <img src={bdsLogo} alt="School Logo" />
          </motion.div>
          <h1>{schoolName || 'Bright Day School'}</h1>
          <p className="subtitle">Enterprise Portal</p>
        </div>

        {/* Role Selector */}
        <div className="role-selector">
          <p className="role-label">Select Role</p>
          <div className="role-grid">
            {ROLES.map((role) => {
              const Icon = role.icon;
              const isActive = selectedRole === role.id;
              return (
                <motion.button
                  key={role.id}
                  type="button"
                  className={`role-card ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedRole(role.id);
                    setLoginStep('credentials');
                    setError('');
                  }}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <div 
                    className="role-icon"
                    style={{ 
                      background: isActive ? role.color : '#f1f5f9',
                      color: isActive ? '#fff' : '#94a3b8'
                    }}
                  >
                    <Icon size={18} strokeWidth={2.5} />
                  </div>
                  <span className="role-name">{role.label}</span>
                  {isActive && <div className="role-dot" style={{ background: role.color }} />}
                </motion.button>
              );
            })}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {loginStep === 'credentials' && (
            <motion.div
              key="credentials"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.25 }}
            >
              {isStudent ? (
                <form onSubmit={handleLogin} className="auth-form">
                  <InputField label="Reg Number" name="regNo" placeholder="BDS/2024/001" icon={User} />
                  <InputField label="Class" name="className" placeholder="Grade 10A" icon={School} />
                  
                  <motion.button
                    type="submit"
                    className="submit-btn"
                    disabled={loading}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    style={{ background: currentRole.color }}
                  >
                    {loading ? <Loader2 className="spin" size={18} /> : <>Continue <ArrowRight size={16} /></>}
                  </motion.button>

                  <div className="divider"><span>or</span></div>

                  <motion.button
                    type="button"
                    className="google-btn"
                    onClick={handleGoogleLogin}
                    disabled={googleLoading}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {googleLoading ? <Loader2 className="spin" size={16} /> : <><GoogleIcon /> Google</>}
                  </motion.button>
                </form>
              ) : (
                <form onSubmit={handleLogin} className="auth-form">
                  <div className="staff-mode-toggle">
                    <button type="button" className={staffMode === 'email' ? 'active' : ''} onClick={() => setStaffMode('email')}>
                      <Mail size={13} /> Email
                    </button>
                    <button type="button" className={staffMode === 'phone' ? 'active' : ''} onClick={() => setStaffMode('phone')}>
                      <Phone size={13} /> Phone
                    </button>
                  </div>

                  {staffMode === 'email' ? (
                    <InputField label="Email" name="email" type="email" placeholder="staff@school.edu" icon={Mail} />
                  ) : (
                    <InputField label="Phone" name="phone" type="tel" placeholder="+234 800 000 0000" icon={Phone} />
                  )}

                  <InputField label="Password" name="password" type="password" placeholder="••••••••" icon={Lock} />

                  <div className="form-options">
                    <label className="remember-me">
                      <input type="checkbox" />
                      <span>Remember</span>
                    </label>
                    <Link to="/forgot-password" className="forgot-link">Forgot?</Link>
                  </div>

                  <motion.button
                    type="submit"
                    className="submit-btn"
                    disabled={loading}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    style={{ background: currentRole.color }}
                  >
                    {loading ? <Loader2 className="spin" size={18} /> : <>Sign In <ArrowRight size={16} /></>}
                  </motion.button>
                </form>
              )}
            </motion.div>
          )}

          {loginStep === 'pin' && (
            <motion.form
              key="pin"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              onSubmit={handlePinSubmit}
              className="auth-form"
            >
              <button type="button" className="back-btn" onClick={() => setLoginStep('credentials')}>
                <ChevronLeft size={14} /> Back
              </button>

              <div className="security-banner">
                <HelpCircle size={16} />
                <p>{securityQuestion}</p>
              </div>

              <InputField label="PIN" name="pin" type="password" placeholder="••••" icon={Lock} />

              <motion.button
                type="submit"
                className="submit-btn"
                disabled={loading}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
                style={{ background: currentRole.color }}
              >
                {loading ? <Loader2 className="spin" size={18} /> : <><CheckCircle size={16} /> Verify</>}
              </motion.button>

              <button type="button" className="text-link" onClick={() => setLoginStep('forgot_pin')}>
                Forgot PIN?
              </button>
            </motion.form>
          )}

          {loginStep === 'forgot_pin' && (
            <motion.form
              key="forgot-pin"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              onSubmit={handleForgotPin}
              className="auth-form"
            >
              <button type="button" className="back-btn" onClick={() => setLoginStep('pin')}>
                <ChevronLeft size={14} /> Back
              </button>

              <div className="security-banner alert">
                <AlertCircle size={16} />
                <p>Reset your PIN</p>
              </div>

              <InputField label={securityQuestion} name="securityAnswer" placeholder="Answer" icon={HelpCircle} />
              <InputField label="New PIN" name="newPin" type="password" placeholder="4 digits" icon={Lock} />

              <motion.button
                type="submit"
                className="submit-btn"
                disabled={loading}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
                style={{ background: currentRole.color }}
              >
                {loading ? <Loader2 className="spin" size={18} /> : <><CheckCircle size={16} /> Reset</>}
              </motion.button>
            </motion.form>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {error && (
            <motion.div
              className="auth-error"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <AlertCircle size={14} />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="auth-footer">
          <p>© {new Date().getFullYear()} {schoolName || 'Bright Day School'}</p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
