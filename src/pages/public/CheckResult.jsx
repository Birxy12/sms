import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useTheme } from '../../context/ThemeContext';
import { ShieldCheck, Search, Loader2, AlertCircle, ArrowRight, GraduationCap, Key, Hash, School, HelpCircle } from 'lucide-react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/MainFooter';
import { expandStudent, STUDENT_KEYS } from '../../utils/firestoreSchema';
import { motion, AnimatePresence } from 'framer-motion';
import brandLogo from '../../assets/bdslogo.jpg';

const CheckResult = () => {
  const navigate = useNavigate();
  const { primaryColor, schoolName, schoolLogo, darkMode } = useTheme();
  const [regNo, setRegNo] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hoveredField, setHoveredField] = useState(null);

  const handleCheck = async (e) => {
    e.preventDefault();
    if (!regNo || !pin) {
      setError('Please provide both Registration Number and PIN.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Find student by RegNo
      let q = query(collection(db, 'students'), where(STUDENT_KEYS.regNo, '==', regNo.toUpperCase().trim()));
      let snap = await getDocs(q);
      
      // Fallback for legacy data
      if (snap.empty) {
        q = query(collection(db, 'students'), where('regNo', '==', regNo.toUpperCase().trim()));
        snap = await getDocs(q);
      }

      if (snap.empty) {
        setError('No student record found with this Registration Number. Please verify and try again.');
        setLoading(false);
        return;
      }

      // Use expansion utility for consistent data access
      const studentData = expandStudent(snap.docs[0].data());
      
      // 2. Validate PIN
      // Special admin bypass: @@@@@@ or 001100
      const isAdminBypass = pin === '@@@@@@' || pin === '001100';
      const storedPin = studentData.pin || '';

      if (!isAdminBypass && (!storedPin || storedPin !== pin)) {
        setError(storedPin ? 'The PIN entered is incorrect. Access denied.' : 'No PIN has been set for this account. Please log in to the dashboard first to set your security PIN.');
        setLoading(false);
        return;
      }

      // 3. Navigate to results page
      navigate(`/results?regNo=${encodeURIComponent(regNo.toUpperCase().trim())}&pin=${encodeURIComponent(pin)}`);
      
    } catch (err) {
      console.error('Error checking result:', err);
      setError('A secure connection could not be established. Please check your internet and try again.');
    } finally {
      setLoading(false);
    }
  };

  const logoUrl = schoolLogo || brandLogo;

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-slate-900' : 'bg-slate-50'} flex flex-col font-sans transition-colors duration-300`}>
      <Navbar />

      <main className="flex-1 flex items-center justify-center relative py-20 px-4 overflow-hidden">
        {/* Enterprise Background Accents */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
          <div className={`absolute top-[-10%] right-[-10%] w-[500px] h-[500px] ${darkMode ? 'bg-indigo-950/20' : 'bg-indigo-50'} rounded-full blur-3xl opacity-60`}></div>
          <div className={`absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] ${darkMode ? 'bg-slate-950/20' : 'bg-slate-100'} rounded-full blur-3xl opacity-60`}></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none"></div>
        </div>

        {/* Transparent School Logo Background Watermark */}
        {logoUrl && (
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] pointer-events-none opacity-[0.04] select-none z-0"
            style={{
              backgroundImage: `url(${logoUrl})`,
              backgroundSize: 'contain',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              filter: darkMode ? 'grayscale(100%) brightness(150%) contrast(120%)' : 'grayscale(100%) contrast(120%)'
            }}
          />
        )}

        <div className="w-full max-w-md relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <div className={`inline-flex items-center justify-center w-20 h-20 bg-white rounded-3xl border border-slate-100 mb-6 group transition-all duration-300 hover:scale-105 hover:border-indigo-500 ${darkMode ? 'shadow-lg shadow-slate-950/50' : 'shadow-xl shadow-indigo-100'}`}>
              <ShieldCheck size={40} className="text-indigo-600" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2 uppercase">Result Portal</h1>
            <p className="text-slate-500 font-bold text-sm tracking-widest uppercase">Secure Academic Verification</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className={`bg-white rounded-[2.5rem] border border-slate-100 p-10 md:p-12 relative ${darkMode ? 'shadow-2xl shadow-slate-950/80' : 'shadow-2xl shadow-slate-200/60'}`}
          >
            <form onSubmit={handleCheck} className="space-y-8">
              {/* Registration Number Field */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Registration ID</label>
                  <div className="relative group">
                    <HelpCircle size={14} className="text-slate-300 cursor-help" onMouseEnter={() => setHoveredField('reg')} onMouseLeave={() => setHoveredField(null)} />
                    <AnimatePresence>
                      {hoveredField === 'reg' && (
                        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-slate-900 text-white text-[10px] rounded-lg shadow-xl z-50">
                          Enter your unique student ID (e.g., BDS/2024/001)
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                <div className="relative group">
                  <GraduationCap size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                  <input 
                    type="text"
                    value={regNo}
                    onChange={(e) => setRegNo(e.target.value)}
                    placeholder="BDS/2024/001"
                    className="input-premium pl-12 font-black text-slate-800 placeholder:text-slate-200 placeholder:font-medium"
                    required
                  />
                </div>
              </div>

              {/* Access PIN Field */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Secure Access PIN</label>
                  <div className="relative group">
                    <HelpCircle size={14} className="text-slate-300 cursor-help" onMouseEnter={() => setHoveredField('pin')} onMouseLeave={() => setHoveredField(null)} />
                    <AnimatePresence>
                      {hoveredField === 'pin' && (
                        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-slate-900 text-white text-[10px] rounded-lg shadow-xl z-50">
                          Enter your private 6-digit verification code.
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                <div className="relative group">
                  <Key size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                  <input 
                    type="password"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="••••••"
                    className="input-premium pl-12 font-black tracking-[1em] text-slate-800 placeholder:text-slate-200 placeholder:tracking-normal placeholder:font-medium"
                    required
                  />
                </div>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-start gap-3"
                  >
                    <AlertCircle size={18} className="text-rose-500 shrink-0 mt-0.5" />
                    <p className="text-xs font-bold text-rose-600 leading-relaxed">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <button 
                type="submit"
                disabled={loading}
                className="btn-glow w-full flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
              >
                {loading ? (
                  <Loader2 size={24} className="animate-spin" />
                ) : (
                  <>
                    <span className="text-sm font-black uppercase tracking-widest">Verify & Access</span>
                    <ArrowRight size={20} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-10 pt-8 border-t border-slate-50 text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-loose">
                Confidentiality Notice:<br />
                Your academic records are protected by end-to-end encryption.
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

      <Footer />
    </div>
  );
};

export default CheckResult;