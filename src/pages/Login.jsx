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
  School, CheckCircle, Crown, Wallet, Landmark, Eye, EyeOff
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

/* ── Role Configurations ── */
const ROLES = [
  { id: 'student', label: 'Student', icon: GraduationCap, color: '#4f46e5', gradient: 'from-indigo-500 to-purple-600' },
  { id: 'teacher', label: 'Teacher', icon: School, color: '#059669', gradient: 'from-emerald-500 to-teal-600' },
  { id: 'principal', label: 'Principal', icon: Crown, color: '#d97706', gradient: 'from-amber-500 to-orange-600' },
  { id: 'bursar', label: 'Bursar', icon: Wallet, color: '#dc2626', gradient: 'from-rose-500 to-red-600' },
  { id: 'admin', label: 'Admin', icon: ShieldCheck, color: '#7c3aed', gradient: 'from-violet-500 to-purple-600' },
];

const Login = () => {
  const [selectedRole, setSelectedRole] = useState('student');
  const [loginStep, setLoginStep] = useState('credentials'); // 'credentials', 'pin', 'forgot_pin'
  const [staffMode, setStaffMode] = useState('email'); // 'email' | 'phone'
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
        // Staff login
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

  // ─── Floating Logos Background ───
  const FloatingLogos = () => (
    <div className="floating-logos-container">
      {[...Array(8)].map((_, i) => (
        <div key={i} className={`floating-logo logo-${i + 1}`}>
          <img src={bdsLogo} alt="" />
        </div>
      ))}
    </div>
  );

  // ─── Role Selector ───
  const RoleSelector = () => (
    <div className="role-selector">
      <p className="role-label">Select your role</p>
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
              whileHover={{ y: -4, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div 
                className="role-icon-wrapper"
                style={{ 
                  background: isActive ? role.color : '#f1f5f9',
                  color: isActive ? '#fff' : '#64748b'
                }}
              >
                <Icon size={22} strokeWidth={2.5} />
              </div>
              <span className="role-name">{role.label}</span>
              {isActive && (
                <motion.div 
                  className="role-indicator"
                  layoutId="activeRole"
                  style={{ background: role.color }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );

  // ─── Input Field Component ───
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
      <FloatingLogos />
      
      <motion.div 
        className="auth-card"
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Header */}
        <div className="auth-header">
          <motion.div 
            className="logo-glow"
            animate={{ 
              boxShadow: [
                `0 0 20px ${currentRole.color}40`,
                `0 0 40px ${currentRole.color}60`,
                `0 0 20px ${currentRole.color}40`
              ]
            }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <img src={bdsLogo} alt="School Logo" className="auth-logo" />
          </motion.div>
          <h1>{schoolName || 'Bright Day School'}</h1>
          <p className="subtitle">Enterprise Management Portal</p>
        </div>

        <RoleSelector />

        <AnimatePresence mode="wait">
          {/* ─── CREDENTIALS STEP ─── */}
          {loginStep === 'credentials' && (
            <motion.div
              key="credentials"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {isStudent ? (
                /* ─── Student Login ─── */
                <form onSubmit={handleLogin} className="auth-form">
                  <InputField
                    label="Registration Number"
                    name="regNo"
                    placeholder="e.g., BDS/2024/001"
                    icon={User}
                  />
                  <InputField
                    label="Class Name"
                    name="className"
                    placeholder="e.g., Grade 10A"
                    icon={School}
                  />
                  
                  <motion.button
                    type="submit"
                    className="submit-btn"
                    disabled={loading}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    style={{ 
                      background: `linear-gradient(135deg, ${currentRole.color}, ${currentRole.color}dd)`,
                      boxShadow: `0 12px 24px -6px ${currentRole.color}50`
                    }}
                  >
                    {loading ? (
                      <Loader2 className="spin" size={20} />
                    ) : (
                      <>
                        Continue <ArrowRight size={18} />
                      </>
                    )}
                  </motion.button>

                  <div className="divider">
                    <span>or continue with</span>
                  </div>

                  <motion.button
                    type="button"
                    className="google-btn"
                    onClick={handleGoogleLogin}
                    disabled={googleLoading}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {googleLoading ? (
                      <Loader2 className="spin" size={18} />
                    ) : (
                      <>
                        <GoogleIcon />
                        Google Sign In
                      </>
                    )}
                  </motion.button>
                </form>
              ) : (
                /* ─── Staff Login ─── */
                <form onSubmit={handleLogin} className="auth-form">
                  {/* Staff Mode Toggle */}
                  <div className="staff-mode-toggle">
                    <button
                      type="button"
                      className={staffMode === 'email' ? 'active' : ''}
                      onClick={() => setStaffMode('email')}
                    >
                      <Mail size={14} /> Email
                    </button>
                    <button
                      type="button"
                      className={staffMode === 'phone' ? 'active' : ''}
                      onClick={() => setStaffMode('phone')}
                    >
                      <Phone size={14} /> Phone
                    </button>
                  </div>

                  {staffMode === 'email' ? (
                    <InputField
                      label="Email Address"
                      name="email"
                      type="email"
                      placeholder="staff@school.edu"
                      icon={Mail}
                    />
                  ) : (
                    <InputField
                      label="Phone Number"
                      name="phone"
                      type="tel"
                      placeholder="+234 800 000 0000"
                      icon={Phone}
                    />
                  )}

                  <InputField
                    label="Password"
                    name="password"
                    type="password"
                    placeholder="Enter your password"
                    icon={Lock}
                  />

                  <div className="form-options">
                    <label className="remember-me">
                      <input type="checkbox" />
                      <span>Remember me</span>
                    </label>
                    <Link to="/forgot-password" className="forgot-link">
                      Forgot password?
                    </Link>
                  </div>

                  <motion.button
                    type="submit"
                    className="submit-btn"
                    disabled={loading}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    style={{ 
                      background: `linear-gradient(135deg, ${currentRole.color}, ${currentRole.color}dd)`,
                      boxShadow: `0 12px 24px -6px ${currentRole.color}50`
                    }}
                  >
                    {loading ? (
                      <Loader2 className="spin" size={20} />
                    ) : (
                      <>
                        Sign In as {currentRole.label}
                        <ArrowRight size={18} />
                      </>
                    )}
                  </motion.button>
                </form>
              )}
            </motion.div>
          )}

          {/* ─── PIN STEP ─── */}
          {loginStep === 'pin' && (
            <motion.form
              key="pin"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handlePinSubmit}
              className="auth-form"
            >
              <button type="button" className="back-btn" onClick={() => setLoginStep('credentials')}>
                <ChevronLeft size={16} /> Back to login
              </button>

              <div className="security-banner">
                <HelpCircle size={20} />
                <p>{securityQuestion}</p>
              </div>

              <InputField
                label="Enter PIN"
                name="pin"
                type="password"
                placeholder="••••"
                icon={Lock}
              />

              <motion.button
                type="submit"
                className="submit-btn"
                disabled={loading}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                style={{ 
                  background: `linear-gradient(135deg, ${currentRole.color}, ${currentRole.color}dd)`,
                  boxShadow: `0 12px 24px -6px ${currentRole.color}50`
                }}
              >
                {loading ? <Loader2 className="spin" size={20} /> : <><CheckCircle size={18} /> Verify</>}
              </motion.button>

              <button type="button" className="text-link" onClick={() => setLoginStep('forgot_pin')}>
                Forgot your PIN?
              </button>
            </motion.form>
          )}

          {/* ─── FORGOT PIN ─── */}
          {loginStep === 'forgot_pin' && (
            <motion.form
              key="forgot-pin"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleForgotPin}
              className="auth-form"
            >
              <button type="button" className="back-btn" onClick={() => setLoginStep('pin')}>
                <ChevronLeft size={16} /> Back
              </button>

              <div className="security-banner alert">
                <AlertCircle size={20} />
                <p>Answer your security question to reset PIN</p>
              </div>

              <InputField
                label={securityQuestion}
                name="securityAnswer"
                placeholder="Your answer"
                icon={HelpCircle}
              />

              <InputField
                label="New PIN"
                name="newPin"
                type="password"
                placeholder="Enter new 4-digit PIN"
                icon={Lock}
              />

              <motion.button
                type="submit"
                className="submit-btn"
                disabled={loading}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                style={{ 
                  background: `linear-gradient(135deg, ${currentRole.color}, ${currentRole.color}dd)`,
                  boxShadow: `0 12px 24px -6px ${currentRole.color}50`
                }}
              >
                {loading ? <Loader2 className="spin" size={20} /> : <><CheckCircle size={18} /> Reset PIN</>}
              </motion.button>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              className="auth-error"
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0 }}
            >
              <AlertCircle size={16} />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div className="auth-footer">
          <p>Protected by enterprise-grade security</p>
          <p className="copyright">© {new Date().getFullYear()} {schoolName || 'Bright Day School'}</p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
