// Force build re-trigger for syntax verification
import React, { useState } from 'react'; // Force reload
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { useStudentAuth } from '../context/StudentAuthContext';
import { useAdminAuth } from '../context/AdminAuthContext';
import { 
  User, Mail, Lock, GraduationCap, 
  ShieldCheck, ArrowRight, ChevronLeft, Loader2,
  AlertCircle, HelpCircle, UserCheck, Wallet, Phone,
  Landmark, School, CheckCircle, Search
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
    { id: 'bursar', label: 'Bursar', icon: Landmark, color: 'emerald' },
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
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans mesh-bg relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-50 rounded-full blur-3xl opacity-60 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-slate-100 rounded-full blur-3xl opacity-60 pointer-events-none"></div>

      <div className="absolute top-8 left-8 z-50">
        <Link to="/" className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-all font-black text-[10px] tracking-[0.2em] uppercase group">
          <div className="p-2 bg-white rounded-xl shadow-sm group-hover:shadow-md transition-all">
            <ChevronLeft size={16} />
          </div>
          Return Home
        </Link>
      </div>

      <main className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center justify-center w-24 h-24 bg-white rounded-[2rem] shadow-2xl shadow-indigo-100 border border-slate-100 mb-8 p-1 group">
              <img src={bdsLogo} alt="Logo" className="w-full h-full object-cover rounded-[1.75rem]" />
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-3 uppercase">Portal Access</h1>
            <p className="text-slate-400 font-bold text-sm tracking-[0.1em] uppercase">Enterprise Management System</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="enterprise-card"
          >
            {/* Role Tabs */}
            <div className="bg-slate-50/50 p-2 rounded-[2rem] border border-slate-100 mb-10 grid grid-cols-2 sm:grid-cols-5 gap-1">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => { setLoginType(tab.id); setError(''); setStaffLoginMode('email'); }}
                  className={`flex flex-col items-center gap-2 py-4 px-2 rounded-2xl transition-all duration-300 ${
                    loginType === tab.id 
                    ? 'bg-white text-indigo-600 shadow-xl shadow-slate-200/60 border border-slate-100' 
                    : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
                  }`}
                >
                  <tab.icon size={18} className={loginType === tab.id ? 'text-indigo-600' : 'text-slate-300'} />
                  <span className="text-[9px] font-black uppercase tracking-widest">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Staff: Google + Phone mode toggle */}
            <AnimatePresence>
              {isStaff && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-6 mb-10"
                >
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={googleLoading}
                    className="w-full flex items-center justify-center gap-4 py-4 rounded-2xl bg-white border border-slate-200 text-slate-700 font-black text-sm hover:bg-slate-50 hover:shadow-lg hover:border-slate-300 transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {googleLoading ? <Loader2 size={20} className="animate-spin" /> : <GoogleIcon />}
                    <span>{googleLoading ? 'Verifying Identity…' : 'Continue with Enterprise Google'}</span>
                  </button>

                  <div className="flex items-center gap-4">
                    <div className="h-px flex-1 bg-slate-100"></div>
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">or secure manual access</span>
                    <div className="h-px flex-1 bg-slate-100"></div>
                  </div>

                  <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                    <button
                      type="button"
                      onClick={() => { setStaffLoginMode('email'); setError(''); }}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        staffLoginMode === 'email' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      <Mail size={14} /> Email / Staff ID
                    </button>
                    <button
                      type="button"
                      onClick={() => { setStaffLoginMode('phone'); setError(''); }}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        staffLoginMode === 'phone' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      <Phone size={14} /> Phone Auth
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleLogin} className="space-y-8">
              <AnimatePresence mode="wait">
                {loginType === 'student' ? (
                  <motion.div key={loginStep} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-8">
                    {loginStep === 'id' ? (
                      <>
                        <div className="space-y-3">
                          <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Registration ID</label>
                          <div className="relative group">
                            <input 
                              type="text" 
                              name="regNo" 
                              placeholder="e.g. BDS/24/001" 
                              value={formData.regNo} 
                              onChange={handleInputChange} 
                              required 
                              className="input-premium pl-14" 
                            />
                            <User size={22} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                          </div>
                        </div>

                        <div className="space-y-3">
                          <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Academic Level</label>
                          <div className="relative group">
                            <select 
                              name="className" 
                              value={formData.className} 
                              onChange={handleInputChange} 
                              required 
                              className="input-premium pl-14 appearance-none"
                            >
                              <option value="">Select Class</option>
                              {['JSS1','JSS2','JSS3','SS1','SS2 ART','SS2 SCIENCE','SS3 ART','SS3 SCIENCE'].map(c => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                            <School size={22} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                          </div>
                        </div>

                        <button type="submit" disabled={loading} className="btn-glow w-full flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50">
                          {loading ? <Loader2 size={24} className="animate-spin" /> : <><span className="text-sm font-black uppercase tracking-widest">Validate Identity</span> <ArrowRight size={20} /></>}
                        </button>
                      </>
                    ) : loginStep === 'pin' ? (
                      <>
                        <div className="text-center space-y-2 mb-8">
                          <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Security Check</h3>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Enter your 6-digit access PIN</p>
                        </div>
                        
                        <div className="space-y-3">
                          <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Access PIN</label>
                          <div className="relative group">
                            <input 
                              type="password" 
                              name="pin" 
                              maxLength={6}
                              placeholder="••••••" 
                              value={formData.pin} 
                              onChange={handleInputChange} 
                              required 
                              className="input-premium pl-14 text-center tracking-[1em] text-xl" 
                            />
                            <Lock size={22} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                          </div>
                        </div>

                        <div className="space-y-4 pt-4">
                          <button type="submit" onClick={handlePinSubmit} disabled={loading} className="btn-glow w-full flex items-center justify-center gap-3 active:scale-[0.98]">
                            {loading ? <Loader2 size={24} className="animate-spin" /> : <><span className="text-sm font-black uppercase tracking-widest">Secure Login</span> <ShieldCheck size={20} /></>}
                          </button>
                          
                          <div className="flex flex-col gap-3">
                            <button 
                              type="button" 
                              onClick={() => { setLoginStep('forgot_pin'); setError(''); }}
                              className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 transition-colors uppercase tracking-[0.2em] py-2"
                            >
                              Forgot Security PIN?
                            </button>
                            <button 
                              type="button" 
                              onClick={() => { setLoginStep('id'); setError(''); }}
                              className="text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-[0.2em]"
                            >
                              Modify Identification
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-center space-y-2 mb-8">
                          <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Recover Access</h3>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Verification Question</p>
                        </div>

                        <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 mb-8">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Security Question</p>
                          <p className="text-lg font-black text-slate-800 tracking-tight leading-snug">{securityQuestion}</p>
                        </div>

                        <div className="space-y-6">
                          <div className="space-y-3">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Your Answer</label>
                            <div className="relative group">
                              <input 
                                type="text" 
                                name="securityAnswer" 
                                placeholder="Answer here..." 
                                value={formData.securityAnswer} 
                                onChange={handleInputChange} 
                                required 
                                className="input-premium pl-14" 
                              />
                              <HelpCircle size={22} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                            </div>
                          </div>

                          <div className="space-y-3">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">New 6-Digit PIN</label>
                            <div className="relative group">
                              <input 
                                type="password" 
                                name="newPin" 
                                maxLength={6}
                                placeholder="••••••" 
                                value={formData.newPin} 
                                onChange={handleInputChange} 
                                required 
                                className="input-premium pl-14 tracking-[1em]" 
                              />
                              <Key size={22} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4 pt-6">
                          <button type="submit" onClick={handlePinReset} disabled={loading} className="btn-glow w-full flex items-center justify-center gap-3 active:scale-[0.98]">
                            {loading ? <Loader2 size={24} className="animate-spin" /> : <><span className="text-sm font-black uppercase tracking-widest">Reset & Access</span> <ArrowRight size={20} /></>}
                          </button>
                          <button 
                            type="button" 
                            onClick={() => { setLoginStep('pin'); setError(''); }}
                            className="text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-[0.2em]"
                          >
                            Return to Verification
                          </button>
                        </div>
                      </>
                    )}
                  </motion.div>
                ) : staffLoginMode === 'phone' ? (
                  <motion.div key="staff-phone" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-8">
                    <div className="space-y-3">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Mobile Hotline</label>
                      <div className="relative group">
                        <input 
                          type="tel" 
                          name="phone" 
                          placeholder="0801 234 5678" 
                          value={formData.phone} 
                          onChange={handleInputChange} 
                          required 
                          className="input-premium pl-14" 
                        />
                        <Phone size={22} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Secure Key</label>
                      </div>
                      <div className="relative group">
                        <input 
                          type="password" 
                          name="password" 
                          placeholder="••••••••" 
                          value={formData.password} 
                          onChange={handleInputChange} 
                          required 
                          className="input-premium pl-14" 
                        />
                        <Lock size={22} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="staff-email" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-8">
                    <div className="space-y-3">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Enterprise Email / ID</label>
                      <div className="relative group">
                        <input 
                          type="text" 
                          name="email" 
                          placeholder={loginType === 'teacher' ? 'bds/staff/001' : 'Email Address'} 
                          value={formData.email} 
                          onChange={handleInputChange} 
                          required 
                          className="input-premium pl-14" 
                        />
                        <Mail size={22} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Secure Key</label>
                      <div className="relative group">
                        <input 
                          type="password" 
                          name="password" 
                          placeholder="••••••••" 
                          value={formData.password} 
                          onChange={handleInputChange} 
                          required 
                          className="input-premium pl-14" 
                        />
                        <Lock size={22} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {isStaff && (
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-glow w-full flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50"
                >
                  {loading ? <Loader2 size={24} className="animate-spin" /> : <><span className="text-sm font-black uppercase tracking-widest">Sign In to Portal</span> <ArrowRight size={20} /></>}
                </button>
              )}

              <AnimatePresence>
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-start gap-3 mt-4"
                  >
                    <AlertCircle size={18} className="text-rose-500 shrink-0 mt-0.5" />
                    <p className="text-xs font-bold text-rose-600 leading-relaxed">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>

            <div className="mt-12 pt-8 border-t border-slate-50 text-center">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-loose">
                Confidentiality Notice:<br />
                Unauthorized access to academic systems is strictly prohibited.
              </p>
            </div>
          </motion.div>

          <div className="mt-12 flex items-center justify-center gap-4 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
            <div className="h-px w-12 bg-slate-300"></div>
            <School size={20} className="text-slate-600" />
            <div className="h-px w-12 bg-slate-300"></div>
          </div>
        </div>
      </main>

      <footer className="py-8 px-6 text-center border-t border-slate-100 bg-white/50 backdrop-blur-md relative z-10">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
          © 2026 {schoolName || 'Birxy School'} Management System. All Rights Reserved.
        </p>
      </footer>
    </div>
  );
};

const Key = ({ size, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m21 2-2 2" />
    <circle cx="9" cy="15" r="6" />
    <rect x="17" y="2" width="5" height="5" rx="1" />
    <path d="m13 11 8-8" />
  </svg>
);

const SchoolIcon = ({ size, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

export default Login;
