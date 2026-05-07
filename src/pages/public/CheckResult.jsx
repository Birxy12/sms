import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useTheme } from '../../context/ThemeContext';
import { ShieldCheck, Search, Loader2, AlertCircle, ArrowRight, GraduationCap, Key, Hash } from 'lucide-react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/MainFooter';
import { expandStudent, STUDENT_KEYS } from '../../utils/firestoreSchema';
import { motion, AnimatePresence } from 'framer-motion';

const CheckResult = () => {
  const navigate = useNavigate();
  const { primaryColor, schoolName } = useTheme();
  const [regNo, setRegNo] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
        setError('No student found with this Registration Number.');
        setLoading(false);
        return;
      }

      const studentDoc = snap.docs[0];
      const studentData = studentDoc.data();
      
      // 2. Validate PIN
      // Special admin bypass: @@@@@@
      const isAdminBypass = pin === '@@@@@@';
      const storedPin = studentData.pin || '';

      if (!isAdminBypass && storedPin !== pin) {
        setError('Incorrect PIN. Please verify and try again.');
        setLoading(false);
        return;
      }

      // 3. Navigate to results page
      // We pass the regNo and pin as query params. The StudentResults page handles verification.
      navigate(`/results?regNo=${encodeURIComponent(regNo.toUpperCase().trim())}&pin=${encodeURIComponent(pin)}`);
      
    } catch (err) {
      console.error('Error checking result:', err);
      setError('An error occurred during verification. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      
      <main className="flex-1 flex items-center justify-center p-6 py-20 relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [0, 90, 0],
              opacity: [0.03, 0.05, 0.03]
            }}
            transition={{ duration: 20, repeat: Infinity }}
            className="absolute -top-20 -left-20 w-96 h-96 rounded-full border-[40px] border-indigo-500"
          />
          <motion.div 
            animate={{ 
              scale: [1, 1.1, 1],
              x: [0, 50, 0],
              opacity: [0.02, 0.04, 0.02]
            }}
            transition={{ duration: 15, repeat: Infinity }}
            className="absolute -bottom-20 -right-20 w-[500px] h-[500px] rounded-full bg-indigo-500"
          />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md relative z-10"
        >
          {/* Brand/Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-3xl shadow-xl shadow-indigo-100 border border-indigo-50 mb-4">
              <ShieldCheck size={32} className="text-indigo-600" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">
              Result <span className="text-indigo-600">Checker</span>
            </h1>
            <p className="text-slate-500 font-bold text-sm mt-2 uppercase tracking-widest">
              Secure Academic Access Portal
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-[2rem] shadow-2xl shadow-slate-200/50 border border-slate-100 p-8 md:p-10 relative overflow-hidden">
            {/* Design accents */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-bl-full -mr-16 -mt-16" />
            
            <form onSubmit={handleCheck} className="space-y-6 relative z-10">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  <Hash size={12} className="text-indigo-500" />
                  Registration Number
                </label>
                <div className="relative group">
                  <input 
                    type="text"
                    value={regNo}
                    onChange={(e) => setRegNo(e.target.value)}
                    placeholder="BDS/2024/001"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-black text-slate-700 placeholder:text-slate-300 focus:border-indigo-500 focus:bg-white transition-all uppercase"
                    required
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors">
                    <GraduationCap size={20} />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  <Key size={12} className="text-indigo-500" />
                  Access PIN (6 Digits)
                </label>
                <div className="relative group">
                  <input 
                    type="password"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="••••••"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-black text-slate-700 placeholder:text-slate-300 focus:border-indigo-500 focus:bg-white transition-all tracking-[0.5em]"
                    required
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors">
                    <Search size={20} />
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-rose-50 text-rose-600 p-4 rounded-2xl flex items-center gap-3 border border-rose-100">
                      <AlertCircle size={18} className="flex-shrink-0" />
                      <p className="text-xs font-black uppercase tracking-tight">{error}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <button 
                type="submit"
                disabled={loading}
                className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-slate-900/20 flex items-center justify-center gap-3 hover:bg-indigo-600 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none group"
              >
                {loading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <>
                    <span>Verify & Access Result</span>
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-50 text-center">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">
                Contact the school administrator if you lost your PIN or have trouble accessing your results.
              </p>
            </div>
          </div>
          
          {/* Footer branding */}
          <div className="mt-8 text-center text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em]">
            © {new Date().getFullYear()} {schoolName} • Secured Portal
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
};

export default CheckResult;
