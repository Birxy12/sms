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
  const [loginStep, setLoginStep] = useState('id'); // 'id', 'pin', 'forgot_pin'
  const [formData, setFormData] = useState({ 
    regNo: '', className: '', email: '', password: '', phone: '',
    pin: '', securityAnswer: '', newPin: '' 
  });
  const [securityQuestion, setSecurityQuestion] = useState('');
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
        if (result.success) {
          if (result.requirePin) {
            setSecurityQuestion(result.securityQuestion);
            setLoginStep('pin');
          } else {
            navigate('/students');
          }
        } else {
          setError(result.message);
        }
      } else if (staffLoginMode === 'phone') {
        const result = await adminAuth.loginWithPhone(formData.phone, formData.password);
        if (result.success) navigateByRole(result.role);
        else setError(result.message);
      } else {
        const result = await adminAuth.login(formData.email, formData.password);
        if (result.success) {
          navigateByRole(result.role);
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

  const handlePinSubmit = async (e) => {
    e.preventDefault();
    if (formData.pin.length !== 6) {
      setError('Please enter a 6-digit PIN.');
      return;
    }
    setLoading(true);
    const result = await studentAuth.verifyPin(formData.pin);
    if (result.success) {
      navigate('/students');
    } else {
      setError(result.message);
      setLoading(false);
    }
  };

  const handlePinReset = async (e) => {
    e.preventDefault();
    if (formData.newPin.length !== 6) {
      setError('New PIN must be 6 digits.');
      return;
    }
    setLoading(true);
    const result = await studentAuth.resetPin(formData.regNo, formData.className, formData.securityAnswer, formData.newPin);
    if (result.success) {
      setError('PIN reset successfully. Please login with your new PIN.');
      setLoginStep('pin');
      setFormData({ ...formData, pin: '', securityAnswer: '', newPin: '' });
    } else {
      setError(result.message);
    }
    setLoading(false);
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
      case 'password': return 'Enter your password';
      default: return '';
    }
  };

  const tabs = [
    { id: 'student', label: 'Student', icon: GraduationCap, color: 'indigo' },
    { id: 'teacher', label: 'Teacher', icon: UserCheck, color: 'rose' },
    { id: 'principal', label: 'Principal', icon: ShieldCheck, color: 'purple' },
    { id: 'bursar', label: 'Bursar', icon: bank, color: 'emerald' },
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
              <motion.div key={loginStep} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-5">
                {loginStep === 'id' ? (
                  <>
                    {/* Reg No */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                        <User size={12} className="text-indigo-500" />
                        Registration Number
                      </label>
                      <div className="relative group">
                        <input 
                          type="text" 
                          name="regNo" 
                          placeholder="e.g. BDS/24/001" 
                          value={formData.regNo} 
                          onChange={handleInputChange} 
                          required 
                          className="input-premium pl-12" 
                        />
                        <User size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                      </div>
                    </div>
                    {/* Class */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                        <SchoolIcon size={12} className="text-indigo-500" />
                        Academic Class
                      </label>
                      <div className="relative group">
                        <select 
                          name="className" 
                          value={formData.className} 
                          onChange={handleInputChange} 
                          required 
                          className="input-premium pl-12 appearance-none"
                        >
                          <option value="">Choose Class</option>
                          {['JSS1','JSS2','JSS3','SS1','SS2 ART','SS2 SCIENCE','SS3 ART','SS3 SCIENCE'].map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        <SchoolIcon size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                      </div>
                    </div>
                    <button type="submit" disabled={loading} className="btn-glow w-full flex items-center justify-center gap-2">
                      {loading ? <Loader2 size={22} className="animate-spin" /> : <><ArrowRight size={20} /> Continue</>}
                    </button>
                  </>
                ) : loginStep === 'pin' ? (
                  <>
                    <div className="text-center mb-4">
                      <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Verify PIN</p>
                      <p className="text-xs text-slate-400">Enter your 6-digit access code</p>
                    </div>
                    <div className="input-group-advanced">
                      <Lock size={18} className="input-icon" />
                      <input 
                        type="password" 
                        name="pin" 
                        maxLength={6}
                        placeholder="••••••" 
                        value={formData.pin} 
                        onChange={handleInputChange} 
                        required 
                        className="auth-input-advanced text-center tracking-[1em] text-xl" 
                      />
                    </div>
                    <div className="flex flex-col gap-3">
                      <button type="submit" onClick={handlePinSubmit} disabled={loading} className={`auth-btn-advanced ${accentColor}`}>
                        {loading ? <Loader2 size={22} className="animate-spin" /> : <><Lock size={20} /> Login</>}
                      </button>
                      <button 
                        type="button" 
                        onClick={() => { setLoginStep('forgot_pin'); setError(''); }}
                        className="text-xs font-black text-indigo-600 hover:text-indigo-700 transition-colors uppercase tracking-widest text-center py-2"
                      >
                        Forgot your PIN?
                      </button>
                      <button 
                        type="button" 
                        onClick={() => { setLoginStep('id'); setError(''); }}
                        className="text-xs font-bold text-slate-400 hover:text-slate-600 text-center"
                      >
                        Back to Identification
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-center mb-4">
                      <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Reset PIN</p>
                      <p className="text-xs text-slate-400">Answer your security question</p>
                    </div>
                    <div className="space-y-4">
                      <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                        <p className="text-[10px] font-black text-indigo-400 uppercase mb-1">Question</p>
                        <p className="text-sm font-bold text-slate-700">{securityQuestion}</p>
                      </div>
                      <div className="input-group-advanced">
                        <HelpCircle size={18} className="input-icon" />
                        <input 
                          type="text" 
                          name="securityAnswer" 
                          placeholder="Your Answer" 
                          value={formData.securityAnswer} 
                          onChange={handleInputChange} 
                          required 
                          className="auth-input-advanced" 
                        />
                      </div>
                      <div className="input-group-advanced">
                        <Lock size={18} className="input-icon" />
                        <input 
                          type="password" 
                          name="newPin" 
                          maxLength={6}
                          placeholder="New 6-Digit PIN" 
                          value={formData.newPin} 
                          onChange={handleInputChange} 
                          required 
                          className="auth-input-advanced" 
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 pt-2">
                      <button type="submit" onClick={handlePinReset} disabled={loading} className={`auth-btn-advanced ${accentColor}`}>
                        {loading ? <Loader2 size={22} className="animate-spin" /> : <><ArrowRight size={20} /> Reset & Login</>}
                      </button>
                      <button 
                        type="button" 
                        onClick={() => { setLoginStep('pin'); setError(''); }}
                        className="text-xs font-bold text-slate-400 hover:text-slate-600 text-center"
                      >
                        Cancel Reset
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            ) : staffLoginMode === 'phone' ? (
              <motion.div key="staff-phone" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-5">
                {/* Phone */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <Phone size={12} className="text-indigo-500" />
                    Phone Number
                  </label>
                  <div className="relative group">
                    <input 
                      type="tel" 
                      name="phone" 
                      placeholder="e.g. 08012345678" 
                      value={formData.phone} 
                      onChange={handleInputChange} 
                      required 
                      className="input-premium pl-12" 
                    />
                    <Phone size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
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
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <Mail size={12} className="text-indigo-500" />
                    Email or Staff ID
                  </label>
                  <div className="relative group">
                    <input 
                      type="text" 
                      name="email" 
                      placeholder={loginType === 'teacher' ? 'e.g. bds/staff/001' : 'Email Address'} 
                      value={formData.email} 
                      onChange={handleInputChange} 
                      required 
                      className="input-premium pl-12" 
                    />
                    <Mail size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
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

          {/* ── Staff Submit Button ── */}
          {isStaff && (
            <button
              type="submit"
              disabled={loading}
              className={`auth-btn-advanced ${accentColor} mt-2`}
            >
              {loading ? <Loader2 size={22} className="animate-spin" /> : <><ArrowRight size={20} /> Sign In</>}
            </button>
          )}

          {error && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="auth-error-advanced">
              <AlertCircle size={16} /> <span>{error}</span>
            </motion.div>
          )}

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
