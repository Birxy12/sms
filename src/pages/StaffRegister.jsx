import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { 
  User, Mail, Lock, ShieldCheck, 
  ArrowRight, ChevronLeft, Loader2,
  AlertCircle, Phone, Briefcase, CheckCircle
} from 'lucide-react';
import './Auth.css';
import bdsLogo from '../assets/bdslogo.jpg';

const StaffRegister = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'teacher'
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { registerStaff } = useAdminAuth();

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setLoading(true);
    setError('');
    
    try {
      const result = await registerStaff(formData);
      
      if (result.success) {
        setSuccess(true);
        setTimeout(() => navigate('/login'), 5000);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Registration failed. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-container">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="auth-card advanced-card text-center py-12"
        >
          <div className="flex justify-center mb-6">
            <div className="bg-emerald-100 text-emerald-600 p-4 rounded-full">
              <CheckCircle size={48} />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Registration Submitted!</h2>
          <p className="text-slate-600 mb-8 max-w-sm mx-auto">
            Your staff account has been created and is now **pending admin approval**. 
            You will be able to log in once an administrator activates your account.
          </p>
          <div className="space-y-4">
            <p className="text-sm text-slate-400">Redirecting to login in 5 seconds...</p>
            <Link to="/login" className="auth-btn-advanced btn-emerald block">
              Back to Login
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      {/* Background Logos */}
      {[1,2,3,4,5,6,7,8].map(i => (
        <div key={i} className={`auth-floating-logo auth-logo-${i}`}>
          <img src={bdsLogo} alt="" />
        </div>
      ))}

      <div className="auth-back-link">
        <Link to="/login" className="flex items-center gap-1 text-slate-500 hover:text-indigo-600 transition-colors font-bold text-xs tracking-widest">
          <ChevronLeft size={16} /> BACK TO LOGIN
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="auth-card advanced-card"
        style={{ maxWidth: '600px' }}
      >
        <div className="auth-header">
          <div className="auth-icon-wrapper bg-indigo-50 text-indigo-600">
            <ShieldCheck size={32} />
          </div>
          <h1 className="auth-title">Staff Registration</h1>
          <p className="auth-subtitle">Create your professional portal account</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form mt-8 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          {/* Full Name */}
          <div className="input-field-container">
            <label className="field-label">Full Name</label>
            <div className="input-group-advanced">
              <User size={18} className="input-icon" />
              <input 
                type="text" 
                name="name" 
                placeholder="e.g. John Doe" 
                value={formData.name} 
                onChange={handleInputChange} 
                required 
                className="auth-input-advanced" 
              />
            </div>
          </div>

          {/* Email */}
          <div className="input-field-container">
            <label className="field-label">Email Address</label>
            <div className="input-group-advanced">
              <Mail size={18} className="input-icon" />
              <input 
                type="email" 
                name="email" 
                placeholder="name@example.com" 
                value={formData.email} 
                onChange={handleInputChange} 
                required 
                className="auth-input-advanced" 
              />
            </div>
          </div>

          {/* Phone */}
          <div className="input-field-container">
            <label className="field-label">Phone Number</label>
            <div className="input-group-advanced">
              <Phone size={18} className="input-icon" />
              <input 
                type="tel" 
                name="phone" 
                placeholder="e.g. 08012345678" 
                value={formData.phone} 
                onChange={handleInputChange} 
                required 
                className="auth-input-advanced" 
              />
            </div>
          </div>

          {/* Role */}
          <div className="input-field-container">
            <label className="field-label">Professional Role</label>
            <div className="input-group-advanced">
              <ShieldCheck size={18} className="input-icon" />
              <select 
                name="role" 
                value={formData.role} 
                onChange={handleInputChange} 
                required 
                className="auth-input-advanced"
              >
                <option value="teacher">Teacher</option>
                <option value="principal">Principal</option>
                <option value="bursar">Bursar</option>
              </select>
            </div>
          </div>

          <div className="md:col-span-2">
            {error && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="auth-error-advanced mb-4">
                <AlertCircle size={16} /> <span>{error}</span>
              </motion.div>
            )}

            <button type="submit" disabled={loading} className="auth-btn-advanced btn-indigo w-full">
              {loading ? <Loader2 size={22} className="animate-spin" /> : <><ArrowRight size={20} /> Register Account</>}
            </button>
          </div>
        </form>

        <div className="auth-footer-advanced mt-6">
          <p>Already have an account? <Link to="/login" className="auth-link">Sign in here</Link></p>
        </div>
      </motion.div>
    </div>
  );
};

export default StaffRegister;
