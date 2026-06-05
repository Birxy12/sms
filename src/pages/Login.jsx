import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { useStudentAuth } from '../context/StudentAuthContext';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useTheme } from '../context/ThemeContext';
import { db } from '../lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { 
  GraduationCap, ShieldCheck, ArrowRight, ChevronLeft, Loader2,
  AlertCircle, HelpCircle, Phone, Lock, Mail, User, 
  School, CheckCircle, Crown, Wallet, Eye, EyeOff, ChevronDown
} from 'lucide-react';
import './Auth.css';
import bdsLogo from '../assets/bdslogo.jpg';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const ROLES = [
  { id: 'student', label: 'Student', icon: GraduationCap, color: '#4f46e5' },
  { id: 'teacher', label: 'Teacher', icon: School, color: '#059669' },
  { id: 'principal', label: 'Principal', icon: Crown, color: '#d97706' },
  { id: 'bursar', label: 'Bursar', icon: Wallet, color: '#dc2626' },
  { id: 'admin', label: 'Admin', icon: ShieldCheck, color: '#7c3aed' },
];

const DEFAULT_CLASS_OPTIONS = [
  'JSS 1', 'JSS 2', 'JSS 3', 'SSS 1', 'SSS 2', 'SSS 3'
];

const Login = () => {
  const [selectedRole, setSelectedRole] = useState('student');
  const [loginStep, setLoginStep] = useState('credentials');
  const [staffMode, setStaffMode] = useState('email');
  const [showPassword, setShowPassword] = useState(false);
  const [classOptions, setClassOptions] = useState(DEFAULT_CLASS_OPTIONS);
  const [formData, setFormData] = useState({ 
    regNo: '', className: '', email: '', password: '', phone: '',
    pin: '', securityAnswer: '', newPin: '' 
  });
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const classesSnap = await getDocs(collection(db, 'classes'));
        if (!classesSnap.empty) {
          const fetchedClasses = classesSnap.docs
            .map(doc => doc.id)
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
          setClassOptions(fetchedClasses);
        }
      } catch (err) {
        console.error("Error fetching classes:", err);
        // Fallback to default options already in state
      }
    };
    fetchClasses();
  }, []);

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
      student: '/students'
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
            navigate('/students');
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
    if (formData.pin.length !== 6) {
      setError('PIN must be exactly 6 digits');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await studentAuth.verifyPin(formData.pin);
      if (result.success) {
        navigate('/students');
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
    if (formData.newPin.length !== 6) {
      setError('New PIN must be exactly 6 digits');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await studentAuth.resetPin(formData.securityAnswer, formData.newPin);
      if (result.success) {
        setLoginStep('pin');
        setError('PIN reset successfully. Please enter your new 6-digit PIN.');
      } else {
        setError(result.message || 'Failed to reset PIN');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPinSendToInbox = async () => {
    if (!formData.regNo || !formData.className) {
      setError('Please enter your Registration Number and Class first.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await studentAuth.forgotPinSendToInbox(formData.regNo, formData.className);
      if (result.success) {
        setError(result.message);
      } else {
        setError(result.message || 'Failed to send PIN.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!formData.email) {
      setError('Please enter your email address');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await adminAuth.forgotPassword(formData.email);
      if (result.success) {
        setLoginStep('credentials');
        setError(result.message); // Success message
      } else {
        setError(result.message || 'Failed to reset password');
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
        navigate('/students');
      } else {
        setError(result.message || 'Google login failed');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const InputField = ({ label, name, type = 'text', placeholder, icon: Icon, required = true, maxLength, pattern, inputMode }) => (
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
          maxLength={maxLength}
          pattern={pattern}
          inputMode={inputMode}
          autoFocus={name === 'regNo' || name === 'email'}
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

  const SelectField = ({ label, name, options, icon: Icon, required = true }) => (
    <div className="input-wrapper">
      <label className="input-label">
        <Icon size={14} />
        {label}
      </label>
      <div className="input-container select-container">
        <select
          name={name}
          value={formData[name]}
          onChange={handleInputChange}
          required={required}
          className="modern-input select-input"
        >
          <option value="" disabled>Select your class</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <ChevronDown size={16} className="select-chevron" />
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
                  <InputField
                    label="Registration Number"
                    name="regNo"
                    placeholder="e.g. BDS/2024/001"
                    icon={User}
                  />
                  <SelectField
                    label="Class"
                    name="className"
                    options={classOptions}
                    icon={School}
                  />
                  
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
                    <InputField label="Email" name="email" type="email" placeholder="e.g. staff@school.edu" icon={Mail} />
                  ) : (
                    <InputField label="Phone" name="phone" type="tel" placeholder="e.g. 08012345678" icon={Phone} />
                  )}

                  <InputField label="Password" name="password" type="password" placeholder="••••••••" icon={Lock} />

                  <div className="form-options">
                    <label className="remember-me">
                      <input type="checkbox" />
                      <span>Remember</span>
                    </label>
                    <button type="button" className="text-link forgot-link" onClick={() => setLoginStep('forgot_password')}>Forgot?</button>
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

          {loginStep === 'forgot_password' && (
            <motion.form
              key="forgot-password"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              onSubmit={handleForgotPassword}
              className="auth-form"
            >
              <button type="button" className="back-btn" onClick={() => setLoginStep('credentials')}>
                <ChevronLeft size={14} /> Back
              </button>

              <div className="security-banner alert">
                <AlertCircle size={16} />
                <p>Reset Password</p>
              </div>

              <InputField label="Email Address" name="email" type="email" placeholder="e.g. staff@school.edu" icon={Mail} />

              <motion.button
                type="submit"
                className="submit-btn"
                disabled={loading || !formData.email}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
                style={{ background: currentRole.color }}
              >
                {loading ? <Loader2 className="spin" size={18} /> : <><Mail size={16} /> Send to Email Inbox</>}
              </motion.button>
            </motion.form>
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

              <div className="input-wrapper">
                <label className="input-label">
                  <Lock size={14} />
                  Enter 6-Digit PIN
                </label>
                <div className="pin-inputs">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <input
                      key={i}
                      id={`pin-${i}`}
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      className="pin-digit"
                      value={formData.pin[i] || ''}
                      autoFocus={i === 0}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        if (val.length <= 1) {
                          const newPin = formData.pin.split('');
                          newPin[i] = val;
                          const joined = newPin.join('').slice(0, 6);
                          setFormData({ ...formData, pin: joined });
                          setError('');
                          if (val && i < 5) {
                            document.getElementById(`pin-${i + 1}`)?.focus();
                          }
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace' && !formData.pin[i] && i > 0) {
                          document.getElementById(`pin-${i - 1}`)?.focus();
                        }
                      }}
                    />
                  ))}
                </div>
              </div>

              <motion.button
                type="submit"
                className="submit-btn"
                disabled={loading || formData.pin.length !== 6}
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
              onSubmit={(e) => { e.preventDefault(); handleForgotPinSendToInbox(); }}
              className="auth-form"
            >
              <button type="button" className="back-btn" onClick={() => setLoginStep('pin')}>
                <ChevronLeft size={14} /> Back
              </button>

              <div className="security-banner alert">
                <AlertCircle size={16} />
                <p>Reset your PIN</p>
              </div>

              <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '15px' }}>
                We will generate a new PIN and send it to your registered inbox.
              </p>

              <motion.button
                type="submit"
                className="submit-btn"
                disabled={loading}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
                style={{ background: currentRole.color }}
              >
                {loading ? <Loader2 className="spin" size={18} /> : <><Mail size={16} /> Send to Inbox</>}
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
