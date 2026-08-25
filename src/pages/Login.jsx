import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { useStudentAuth } from '../context/StudentAuthContext';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useTheme } from '../context/ThemeContext';
import { db } from '../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { expandStudent, STUDENT_KEYS } from '../utils/firestoreSchema';
import { 
  GraduationCap, ShieldCheck, ArrowRight, ChevronLeft, Loader2,
  AlertCircle, HelpCircle, Phone, Lock, Mail, User, 
  School, CheckCircle, Crown, Wallet, Eye, EyeOff, ChevronDown, Fingerprint,
  KeyRound, Sparkles, MessageCircle
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
   'JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2 ART', 'SS2 SCIENCE', 'SS3 ART', 'SS3 SCIENCE'
];

const InputField = ({ label, name, type = 'text', placeholder, icon: Icon, required = true, maxLength, pattern, inputMode, value, onChange, showPassword, onTogglePassword }) => {
  const inputRef = useRef(null);
  
  useEffect(() => {
    if (name === 'regNo' || name === 'email') {
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100); // Delay focus slightly to avoid forced layout warning in Firefox
      return () => clearTimeout(timer);
    }
  }, [name]);

  return (
    <div className="input-wrapper">
      <label className="input-label">
        <Icon size={14} />
        {label}
      </label>
      <div className="input-container">
        <input
          ref={inputRef}
          type={type === 'password' && showPassword ? 'text' : type}
          name={name}
          value={value || ''}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          maxLength={maxLength}
          pattern={pattern}
          inputMode={inputMode}
          className="modern-input"
        />
        {type === 'password' && (
          <button
            type="button"
            className="password-toggle"
            onClick={onTogglePassword}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
    </div>
  );
};

const SelectField = ({ label, name, options, icon: Icon, required = true, value, onChange }) => (
  <div className="input-wrapper">
    <label className="input-label">
      <Icon size={14} />
      {label}
    </label>
    <div className="input-container select-container">
      <select
        name={name}
        value={value || ''}
        onChange={onChange}
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

const Login = () => {
  const [selectedRole, setSelectedRole] = useState('student');
  const [loginStep, setLoginStep] = useState('credentials');
  const [showPassword, setShowPassword] = useState(false);
  const [classOptions, setClassOptions] = useState(DEFAULT_CLASS_OPTIONS);
  const [formData, setFormData] = useState({ 
    regNo: '', className: '', identifier: '', password: '',
    pin: '', securityAnswer: '', newPin: '', newPassword: '', confirmPassword: ''
  });
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [pendingUser, setPendingUser] = useState(null);
  const [whatsAppPinUrl, setWhatsAppPinUrl] = useState(null);
  
  // Real-time name lookup for students
  const [lookupName, setLookupName] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const classesSnap = await getDocs(collection(db, 'classes'));
        if (!classesSnap.empty) {
          const fetchedClasses = classesSnap.docs.map(doc => doc.id);
          const combined = Array.from(new Set([...DEFAULT_CLASS_OPTIONS, ...fetchedClasses]))
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
          setClassOptions(combined);
        }
      } catch (err) {
        console.error("Error fetching classes:", err);
      }
    };
    fetchClasses();
  }, []);

  const isStudent = selectedRole === 'student';

  // Debounced lookup for student name when regNo changes
  useEffect(() => {
    if (!isStudent || !formData.regNo || formData.regNo.length < 3) {
      setLookupName('');
      return;
    }
    const fetchStudentName = async () => {
      setLookupLoading(true);
      setLookupName('');
      try {
        const normalizedRegNo = formData.regNo.trim().toUpperCase();
        
        // Try upper-cased first
        let q = query(collection(db, 'students'), where(STUDENT_KEYS.regNo, '==', normalizedRegNo));
        let snap = await getDocs(q);
        
        if (snap.empty) {
          q = query(collection(db, 'students'), where('regNo', '==', normalizedRegNo));
          snap = await getDocs(q);
        }

        // Fallback to exact input (in case they saved it non-standard)
        if (snap.empty) {
           q = query(collection(db, 'students'), where(STUDENT_KEYS.regNo, '==', formData.regNo.trim()));
           snap = await getDocs(q);
           if (snap.empty) {
             q = query(collection(db, 'students'), where('regNo', '==', formData.regNo.trim()));
             snap = await getDocs(q);
           }
        }

        if (!snap.empty) {
          const sData = snap.docs[0].data();
          const expanded = expandStudent(sData);
          setLookupName(expanded.name);
        }
      } catch (err) {
        console.warn("Error looking up student name:", err);
      } finally {
        setLookupLoading(false);
      }
    };

    const timeoutId = setTimeout(fetchStudentName, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.regNo, isStudent]);

  const navigate = useNavigate();
  const studentAuth = useStudentAuth();
  const adminAuth = useAdminAuth();
  const { schoolName } = useTheme();

  const currentRole = ROLES.find(r => r.id === selectedRole);

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
        const result = await adminAuth.login(formData.identifier, formData.password, selectedRole);
        if (result.success) {
          if (result.requirePasswordChange) {
            setPendingUser(result.user);
            setLoginStep('change_password');
          } else if (result.requirePinSetup) {
            setPendingUser(result.user);
            setLoginStep('setup_staff_pin');
          } else if (result.requirePin) {
            setPendingUser(result.user);
            setLoginStep('verify_staff_pin');
          } else {
            adminAuth.completeLogin(result.user);
            navigateByRole(selectedRole);
          }
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

  const handlePasskeyLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await adminAuth.loginWithPasskey();
      if (result.success) {
        navigateByRole(result.role || selectedRole);
      } else {
        setError(result.message || 'Passkey login failed');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFirstLoginPasswordChange = async (e) => {
    e.preventDefault();
    const newPass = formData.newPassword;
    const confirmPass = formData.confirmPassword;
    if (!newPass || newPass.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPass !== confirmPass) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await adminAuth.changePassword(newPass, pendingUser);
      if (result.success) {
        const updatedUser = { ...pendingUser, password: newPass, firstLogin: false, id: result.id || pendingUser.id };
        setPendingUser(updatedUser);
        if (!updatedUser.pin) {
          setLoginStep('setup_staff_pin');
        } else {
          setLoginStep('verify_staff_pin');
        }
      } else {
        setError(result.message || 'Failed to change password.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
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

  const handleStaffPinSetup = async (e) => {
    e.preventDefault();
    if (formData.pin.length !== 6) {
      setError('PIN must be exactly 6 digits');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await adminAuth.setupPin(pendingUser, formData.pin);
      if (result.success) {
        if (window.PublicKeyCredential) {
          setLoginStep('setup_passkey');
        } else {
          navigateByRole(selectedRole);
        }
      } else {
        setError(result.message || 'Failed to setup PIN');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStaffPinVerify = async (e) => {
    e.preventDefault();
    if (formData.pin.length !== 6) {
      setError('PIN must be exactly 6 digits');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await adminAuth.verifyPin(pendingUser, formData.pin);
      if (result.success) {
        navigateByRole(selectedRole);
      } else {
        setError(result.message || 'Invalid PIN');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSetupPasskey = async () => {
    setLoading(true);
    setError('');
    try {
      await adminAuth.registerPasskey(pendingUser);
      navigateByRole(selectedRole);
    } catch (err) {
      console.error(err);
      navigateByRole(selectedRole);
    } finally {
      setLoading(false);
    }
  };

  const skipPasskeySetup = () => {
    navigateByRole(selectedRole);
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

  const handleForgotPinSendToInbox = async (e) => {
    if (e) e.preventDefault();
    if (!formData.regNo || !formData.className) {
      setError('Please enter both your Registration Number and Class Section.');
      setSuccessMessage('');
      return;
    }
    setLoading(true);
    setError('');
    setSuccessMessage('');
    setWhatsAppPinUrl(null);
    try {
      const result = await studentAuth.forgotPinSendToInbox(formData.regNo, formData.className);
      if (result.success) {
        setSuccessMessage(result.message);
        if (result.whatsAppUrl) {
          setWhatsAppPinUrl(result.whatsAppUrl);
        }
        setError('');
      } else {
        setError(result.message || 'Failed to process PIN recovery.');
        setSuccessMessage('');
        setWhatsAppPinUrl(null);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      setSuccessMessage('');
      setWhatsAppPinUrl(null);
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
        setError(result.message);
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

  const PinInputGroup = ({ onSubmit, disabled, buttonText }) => (
    <form onSubmit={onSubmit} className="auth-form">
      <div className="input-wrapper">
        <label className="input-label">
          <Lock size={14} />
          Enter 6-Digit PIN
        </label>
        <div className={`pin-inputs ${formData.pin.length === 6 ? 'is-complete' : ''}`}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <input
              key={i}
              id={`pin-${i}`}
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              className={`pin-digit ${formData.pin[i] ? 'has-value' : ''}`}
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
                    setTimeout(() => {
                      const next = document.getElementById(`pin-${i + 1}`);
                      if (next) {
                        next.focus();
                        next.select();
                      }
                    }, 10);
                  }
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Backspace' && !formData.pin[i] && i > 0) {
                  setTimeout(() => {
                    const prev = document.getElementById(`pin-${i - 1}`);
                    if (prev) {
                      prev.focus();
                      prev.select();
                    }
                  }, 10);
                }
              }}
            />
          ))}
        </div>
      </div>
      <motion.button
        type="submit"
        className="submit-btn"
        disabled={disabled}
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.98 }}
        style={{ background: currentRole.color }}
      >
        {loading ? <Loader2 className="spin" size={18} /> : <><CheckCircle size={16} /> {buttonText}</>}
      </motion.button>
    </form>
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
                    value={formData.regNo}
                    onChange={handleInputChange}
                  />
                  <AnimatePresence>
                    {(lookupName || lookupLoading) && (
                      <motion.div 
                        initial={{ opacity: 0, y: -5, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -5, height: 0 }}
                        className="text-[11px] font-bold -mt-2 mb-4 px-2 flex items-center overflow-hidden"
                      >
                        {lookupLoading ? (
                           <span className="text-slate-400 flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> Fetching name...</span>
                        ) : (
                           <span className="text-emerald-600 flex items-center gap-1.5"><CheckCircle size={12} /> {lookupName}</span>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  <SelectField
                    label="Class"
                    name="className"
                    options={classOptions}
                    icon={School}
                    value={formData.className}
                    onChange={handleInputChange}
                  />

                  <div className="form-options">
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8' }}>Forgot your 6-digit PIN?</span>
                    <button 
                      type="button" 
                      className="text-link forgot-link" 
                      onClick={() => { setLoginStep('forgot_pin'); setError(''); setSuccessMessage(''); }}
                    >
                      Forgot PIN?
                    </button>
                  </div>
                  
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
                  <InputField 
                    label="Email, Phone, or Staff ID" 
                    name="identifier" 
                    type="text" 
                    placeholder="e.g. staff@school.edu or 080... or BDS/STAFF/001" 
                    icon={User} 
                    value={formData.identifier} 
                    onChange={handleInputChange} 
                  />

                  <InputField label="Password" name="password" type="password" placeholder="••••••••" icon={Lock} value={formData.password} onChange={handleInputChange} showPassword={showPassword} onTogglePassword={() => setShowPassword(!showPassword)} />

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

                  <div className="divider"><span>or</span></div>
                  <motion.button
                    type="button"
                    className="google-btn"
                    onClick={handlePasskeyLogin}
                    disabled={loading}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {loading ? <Loader2 className="spin" size={16} /> : <><Fingerprint size={16} /> Sign in with Passkey</>}
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

              <InputField label="Email Address" name="email" type="email" placeholder="e.g. staff@school.edu" icon={Mail} value={formData.email} onChange={handleInputChange} />

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
            <motion.div key="pin" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }}>
              <button type="button" className="back-btn" onClick={() => setLoginStep('credentials')}>
                <ChevronLeft size={14} /> Back
              </button>
              <div className="security-banner">
                <HelpCircle size={16} />
                <p>{securityQuestion}</p>
              </div>
              <PinInputGroup onSubmit={handlePinSubmit} disabled={loading || formData.pin.length !== 6} buttonText="Verify" />
              <button type="button" className="text-link" onClick={() => setLoginStep('forgot_pin')}>
                Forgot PIN?
              </button>
            </motion.div>
          )}

          {loginStep === 'setup_staff_pin' && (
            <motion.div key="setup_staff_pin" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }}>
              <div className="security-banner alert">
                <AlertCircle size={16} />
                <p>Secure Your Account</p>
              </div>
              <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '15px' }}>
                Please set up a 6-digit PIN for faster and more secure future logins.
              </p>
              <PinInputGroup onSubmit={handleStaffPinSetup} disabled={loading || formData.pin.length !== 6} buttonText="Set PIN" />
            </motion.div>
          )}

          {loginStep === 'change_password' && (
            <motion.div key="change_password" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }}>
              <button type="button" className="back-btn" onClick={() => setLoginStep('credentials')}><ChevronLeft size={14} /> Back</button>
              <h2>Set New Password</h2>
              <InputField label="New Password" name="newPassword" type="password" placeholder="Enter new password" icon={Lock} value={formData.newPassword} onChange={handleInputChange} />
              <InputField label="Confirm Password" name="confirmPassword" type="password" placeholder="Confirm new password" icon={Lock} value={formData.confirmPassword} onChange={handleInputChange} />
              <motion.button type="button" className="submit-btn" disabled={loading || !formData.newPassword || formData.newPassword !== formData.confirmPassword} whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} style={{ background: currentRole.color }} onClick={handleFirstLoginPasswordChange}>
                {loading ? <Loader2 className="spin" size={18} /> : <>Update Password <ArrowRight size={16} /></>}
              </motion.button>
            </motion.div>
          )}

          {loginStep === 'verify_staff_pin' && (
            <motion.div key="verify_staff_pin" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }}>
              <button type="button" className="back-btn" onClick={() => setLoginStep('credentials')}>
                <ChevronLeft size={14} /> Back
              </button>
              <div className="security-banner">
                <Lock size={16} />
                <p>Enter your PIN to continue</p>
              </div>
              <PinInputGroup onSubmit={handleStaffPinVerify} disabled={loading || formData.pin.length !== 6} buttonText="Verify PIN" />
            </motion.div>
          )}

          {loginStep === 'setup_passkey' && (
            <motion.div key="setup_passkey" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }} className="auth-form">
              <div className="security-banner" style={{background: '#f0fdf4', color: '#166534', borderColor: '#bbf7d0'}}>
                <CheckCircle size={16} />
                <p>PIN set successfully!</p>
              </div>
              <div style={{textAlign: 'center', margin: '20px 0'}}>
                <Fingerprint size={48} color={currentRole.color} style={{marginBottom: '10px'}} />
                <h3 style={{fontSize: '18px', color: '#1e293b'}}>Enable Passkey</h3>
                <p style={{ fontSize: '14px', color: '#64748b', marginTop: '10px' }}>
                  Use your device's biometric authentication (fingerprint, face recognition) or screen lock to sign in faster next time.
                </p>
              </div>
              <motion.button
                type="button"
                className="submit-btn"
                onClick={handleSetupPasskey}
                disabled={loading}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
                style={{ background: currentRole.color, marginBottom: '10px' }}
              >
                {loading ? <Loader2 className="spin" size={18} /> : <><Fingerprint size={16} /> Create Passkey</>}
              </motion.button>
              <button type="button" className="google-btn" onClick={skipPasskeySetup}>
                Skip for now
              </button>
            </motion.div>
          )}

          {loginStep === 'forgot_pin' && (
            <motion.form
              key="forgot-pin"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              onSubmit={handleForgotPinSendToInbox}
              className="auth-form"
            >
              <button 
                type="button" 
                className="back-btn" 
                onClick={() => { setLoginStep('credentials'); setSuccessMessage(''); setError(''); }}
              >
                <ChevronLeft size={14} /> Back to Sign In
              </button>

              <div className="pin-recovery-header">
                <div className="pin-recovery-icon" style={{ background: `${currentRole.color}18`, color: currentRole.color }}>
                  <KeyRound size={24} />
                </div>
                <h2 className="pin-recovery-title">Student PIN Recovery</h2>
                <p className="pin-recovery-subtitle">
                  Verify your registration number and class to reset your PIN.
                </p>
              </div>

              <div className="pin-info-banner highlight">
                <HelpCircle size={16} />
                <span>
                  Your new PIN will be dispatched to your registered <strong>Email or Phone</strong>. If no contact is on file, it will be securely routed to the <strong>Admin Inbox</strong>.
                </span>
              </div>

              <InputField
                label="Registration Number"
                name="regNo"
                type="text"
                placeholder="e.g. BDS/25/001"
                icon={User}
                value={formData.regNo}
                onChange={handleInputChange}
                required
              />

              <SelectField
                label="Class Section"
                name="className"
                options={classOptions}
                icon={School}
                value={formData.className}
                onChange={handleInputChange}
                required
              />

              <motion.button
                type="submit"
                className="submit-btn"
                disabled={loading || !formData.regNo || !formData.className}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
                style={{ background: currentRole.color }}
              >
                {loading ? <Loader2 className="spin" size={18} /> : <><Sparkles size={16} /> Generate & Send New PIN</>}
              </motion.button>
            </motion.form>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {successMessage && (
            <motion.div
              className="auth-success"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <CheckCircle size={18} className="shrink-0 mt-0.5" />
              <div className="w-full">
                <p style={{ fontWeight: 800, margin: 0, fontSize: '0.85rem' }}>PIN Recovery Successful</p>
                <p style={{ margin: '4px 0 8px 0', fontSize: '0.75rem', lineHeight: '1.4' }}>{successMessage}</p>
                
                {whatsAppPinUrl && (
                  <a
                    href={whatsAppPinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: '#16a34a',
                      color: '#ffffff',
                      padding: '8px 14px',
                      borderRadius: '10px',
                      fontSize: '0.75rem',
                      fontWeight: '800',
                      textDecoration: 'none',
                      margin: '6px 0 10px 0',
                      boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)'
                    }}
                  >
                    <MessageCircle size={15} /> Open & Send PIN on WhatsApp
                  </a>
                )}

                <div>
                  <button
                    type="button"
                    className="text-link"
                    style={{ textAlign: 'left', margin: 0, color: '#15803d', fontWeight: 800, textDecoration: 'underline', padding: 0 }}
                    onClick={() => { setLoginStep('credentials'); setSuccessMessage(''); setError(''); setWhatsAppPinUrl(null); }}
                  >
                    ← Sign in with new PIN
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {error && (
            <motion.div
              className="auth-error"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
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
