// Force build re-trigger for syntax verification
import React, { useState } from 'react'; // Force reload
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { useStudentAuth } from '../context/StudentAuthContext';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  User, Mail, Lock, GraduationCap, 
  ShieldCheck, ArrowRight, ChevronLeft, Loader2,
  AlertCircle, HelpCircle, Phone,
  School, CheckCircle
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
  const { schoolName } = useTheme();

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
            navigate('/student');
          }
        } else {
          setError(result.message || 'Login failed');
        }
      } else {
        // Staff login (email or phone)
        let result;
        if (staffLoginMode === 'email') {
          result = await adminAuth.login(formData.email, formData.password);
        } else {
          result = await adminAuth.loginWithPhone(formData.phone, formData.password);
        }
        
        if (result.success) {
          navigateByRole(result.role);
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
      const result = await studentAuth.resetPin(
        formData.securityAnswer,
        formData.newPin
      );
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

  // ─── Render ───
  return (
    <div className="auth-page">
      <motion.div 
        className="auth-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="auth-header">
          <img src={bdsLogo} alt="School Logo" className="auth-logo" />
          <h1>{schoolName || 'School Management System'}</h1>
          <p>Welcome back! Please sign in to continue.</p>
        </div>

        {/* Login Type Toggle */}
        <div className="login-type-toggle">
          <button
            className={loginType === 'student' ? 'active' : ''}
            onClick={() => {
              setLoginType('student');
              setLoginStep('id');
              setError('');
            }}
          >
            <GraduationCap size={18} />
            Student
          </button>
          <button
            className={loginType === 'staff' ? 'active' : ''}
            onClick={() => {
              setLoginType('staff');
              setStaffLoginMode('email');
              setError('');
            }}
          >
            <ShieldCheck size={18} />
            Staff
          </button>
        </div>

        <AnimatePresence mode="wait">
          {/* ─── STUDENT LOGIN ─── */}
          {loginType === 'student' && loginStep === 'id' && (
            <motion.form
              key="student-id"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleLogin}
              className="auth-form"
            >
              <div className="form-group">
                <label>
                  <User size={16} />
                  Registration Number
                </label>
                <input
                  type="text"
                  name="regNo"
                  value={formData.regNo}
                  onChange={handleInputChange}
                  placeholder="Enter registration number"
                  required
                />
              </div>

              <div className="form-group">
                <label>
                  <School size={16} />
                  Class Name
                </label>
                <input
                  type="text"
                  name="className"
                  value={formData.className}
                  onChange={handleInputChange}
                  placeholder="e.g., Grade 10A"
                  required
                />
              </div>

              <button type="submit" className="auth-btn primary" disabled={loading}>
                {loading ? <Loader2 className="spin" size={20} /> : <ArrowRight size={20} />}
                Continue
              </button>

              <div className="divider">
                <span>or</span>
              </div>

              <button
                type="button"
                className="auth-btn google"
                onClick={handleGoogleLogin}
                disabled={googleLoading}
              >
                {googleLoading ? <Loader2 className="spin" size={20} /> : <GoogleIcon />}
                Sign in with Google
              </button>
            </motion.form>
          )}

          {/* ─── STUDENT PIN STEP ─── */}
          {loginType === 'student' && loginStep === 'pin' && (
            <motion.form
              key="student-pin"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handlePinSubmit}
              className="auth-form"
            >
              <button
                type="button"
                className="back-btn"
                onClick={() => setLoginStep('id')}
              >
                <ChevronLeft size={16} />
                Back
              </button>

              <div className="security-info">
                <HelpCircle size={20} />
                <p>{securityQuestion}</p>
              </div>

              <div className="form-group">
                <label>
                  <Lock size={16} />
                  Enter PIN
                </label>
                <input
                  type="password"
                  name="pin"
                  value={formData.pin}
                  onChange={handleInputChange}
                  placeholder="Enter your 4-digit PIN"
                  maxLength={4}
                  required
                />
              </div>

              <button type="submit" className="auth-btn primary" disabled={loading}>
                {loading ? <Loader2 className="spin" size={20} /> : <CheckCircle size={20} />}
                Verify
              </button>

              <button
                type="button"
                className="text-link"
                onClick={() => {
                  setLoginStep('forgot_pin');
                  setFormData({ ...formData, pin: '' });
                }}
              >
                Forgot PIN?
              </button>
            </motion.form>
          )}

          {/* ─── FORGOT PIN ─── */}
          {loginType === 'student' && loginStep === 'forgot_pin' && (
            <motion.form
              key="forgot-pin"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleForgotPin}
              className="auth-form"
            >
              <button
                type="button"
                className="back-btn"
                onClick={() => setLoginStep('pin')}
              >
                <ChevronLeft size={16} />
                Back
              </button>

              <div className="security-info">
                <AlertCircle size={20} />
                <p>Answer your security question to reset PIN</p>
              </div>

              <div className="form-group">
                <label>
                  <HelpCircle size={16} />
                  {securityQuestion}
                </label>
                <input
                  type="text"
                  name="securityAnswer"
                  value={formData.securityAnswer}
                  onChange={handleInputChange}
                  placeholder="Your answer"
                  required
                />
              </div>

              <div className="form-group">
                <label>
                  <Lock size={16} />
                  New PIN
                </label>
                <input
                  type="password"
                  name="newPin"
                  value={formData.newPin}
                  onChange={handleInputChange}
                  placeholder="Enter new 4-digit PIN"
                  maxLength={4}
                  required
                />
              </div>

              <button type="submit" className="auth-btn primary" disabled={loading}>
                {loading ? <Loader2 className="spin" size={20} /> : <CheckCircle size={20} />}
                Reset PIN
              </button>
            </motion.form>
          )}

          {/* ─── STAFF LOGIN ─── */}
          {loginType === 'staff' && (
            <motion.form
              key="staff-login"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleLogin}
              className="auth-form"
            >
              {/* Staff login mode toggle */}
              <div className="staff-mode-toggle">
                <button
                  type="button"
                  className={staffLoginMode === 'email' ? 'active' : ''}
                  onClick={() => setStaffLoginMode('email')}
                >
                  <Mail size={14} />
                  Email
                </button>
                <button
                  type="button"
                  className={staffLoginMode === 'phone' ? 'active' : ''}
                  onClick={() => setStaffLoginMode('phone')}
                >
                  <Phone size={14} />
                  Phone
                </button>
              </div>

              {staffLoginMode === 'email' ? (
                <div className="form-group">
                  <label>
                    <Mail size={16} />
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="staff@school.edu"
                    required
                  />
                </div>
              ) : (
                <div className="form-group">
                  <label>
                    <Phone size={16} />
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+234..."
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label>
                  <Lock size={16} />
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Enter password"
                  required
                />
              </div>

              <button type="submit" className="auth-btn primary" disabled={loading}>
                {loading ? <Loader2 className="spin" size={20} /> : <ArrowRight size={20} />}
                Sign In
              </button>

              <Link to="/forgot-password" className="text-link">
                Forgot password?
              </Link>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              className="auth-error"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <AlertCircle size={16} />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div className="auth-footer">
          <p>Don't have an account? <Link to="/register">Contact administration</Link></p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
