import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { 
  UserPlus, User, Mail, School, CheckCircle, 
  ArrowRight, ChevronLeft, Loader2, AlertCircle,
  Hash
} from 'lucide-react';
import './Auth.css';
import bdsLogo from '../assets/bdslogo.jpg';


const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    className: '',
    regNo: '',
    parentName: '',
    parentPhone: '',
    dob: '',
    gender: '',
    club: '',
    house: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let updatedData = { ...formData, [name]: value };

    // Auto-generate RegNo when class is selected
    if (name === 'className' && value) {
      const year = new Date().getFullYear().toString().slice(-2);
      const randomId = Math.floor(1000 + Math.random() * 9000); // 4 digit random
      const classShort = value.replace(/\s+/g, '').slice(0, 3).toUpperCase();
      updatedData.regNo = `BDS/${year}/${classShort}/${randomId}`;
    }

    setFormData(updatedData);
    setError('');
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Check if student already exists by Reg No
      const q = query(collection(db, 'students'), where('regNo', '==', formData.regNo.trim().toUpperCase()));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        setError('A student with this Registration Number already exists.');
        setLoading(false);
        return;
      }

      // 2. Register student
      await addDoc(collection(db, 'students'), {
        ...formData,
        regNo: formData.regNo.trim().toUpperCase(),
        createdAt: new Date().toISOString(),
        role: 'student',
        status: 'active'
      });

      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      console.error('Registration error:', err);
      setError('Registration failed. Please contact the school admin.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-container">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="auth-card text-center">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={48} />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Registration Successful!</h2>
          <p className="text-slate-500 mb-8">Your account has been created. You are being redirected to the login page.</p>
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      {/* Floating animated brand logos */}
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

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="auth-card advanced-card">

        <div className="auth-header">
          <div className="auth-icon-wrapper bg-indigo-50 text-indigo-600">
            <UserPlus size={32} />
          </div>
          <h1 className="auth-title">Student Registration</h1>
          <p className="auth-subtitle">Join our community and start your academic journey</p>
        </div>

        <form onSubmit={handleRegister} className="auth-form">
          <div className="space-y-4">
            <div className="input-group">
              <User size={18} className="input-icon" />
              <input 
                type="text" 
                name="name"
                placeholder="Full Name" 
                value={formData.name}
                onChange={handleInputChange}
                required
                className="auth-input"
              />
            </div>
            <div className="input-group">
              <Mail size={18} className="input-icon" />
              <input 
                type="email" 
                name="email"
                placeholder="Email Address (Optional)" 
                value={formData.email}
                onChange={handleInputChange}
                className="auth-input"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="input-group">
                <School size={18} className="input-icon" />
                <select 
                  name="className"
                  value={formData.className}
                  onChange={handleInputChange}
                  required
                  className="auth-input"
                >
                  <option value="">Select Class</option>
                  {['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2 ART', 'SS2 SCIENCE', 'SS3 ART', 'SS3 SCIENCE'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <Hash size={18} className="input-icon" />
                <input 
                  type="text" 
                  name="regNo"
                  placeholder="Reg Number (Auto)" 
                  value={formData.regNo}
                  readOnly
                  className="auth-input bg-slate-50 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="input-group pl-10 pr-4 py-3 bg-slate-50 rounded-xl border-2 border-transparent focus-within:border-indigo-500 transition-all flex items-center gap-2">
                <label className="text-xs font-bold text-slate-400 uppercase min-w-[40px]">DOB</label>
                <input 
                  type="date" 
                  name="dob"
                  value={formData.dob}
                  onChange={handleInputChange}
                  required
                  className="bg-transparent w-full outline-none font-semibold text-slate-700"
                />
              </div>
              <div className="input-group">
                <select 
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  required
                  className="auth-input pl-4"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="input-group">
                <select 
                  name="club"
                  value={formData.club}
                  onChange={handleInputChange}
                  required
                  className="auth-input pl-4"
                >
                  <option value="">Select Club</option>
                  {['Jet', 'Dancing', 'Singing', 'Debate', 'Drama', 'Art'].map(club => (
                    <option key={club} value={club}>{club}</option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <select 
                  name="house"
                  value={formData.house}
                  onChange={handleInputChange}
                  required
                  className="auth-input pl-4"
                >
                  <option value="">Select House</option>
                  {['Alamanda', 'Blue Bell', 'Cherry', 'Rose'].map(house => (
                    <option key={house} value={house}>{house}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="input-group">
                <input 
                  type="text" 
                  name="parentName"
                  placeholder="Parent's Full Name" 
                  value={formData.parentName}
                  onChange={handleInputChange}
                  required
                  className="auth-input pl-4"
                />
              </div>
              <div className="input-group">
                <input 
                  type="text" 
                  name="parentPhone"
                  placeholder="Parent's Phone Number" 
                  value={formData.parentPhone}
                  onChange={handleInputChange}
                  required
                  className="auth-input pl-4"
                />
              </div>
            </div>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="auth-error">
              <AlertCircle size={16} /> {error}
            </motion.div>
          )}

          <button type="submit" disabled={loading} className="auth-submit-btn btn-student">
            {loading ? <Loader2 size={20} className="animate-spin" /> : (
              <>Register Now <ArrowRight size={20} /></>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>Already have an account? <Link to="/login" className="auth-link">Sign In</Link></p>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
