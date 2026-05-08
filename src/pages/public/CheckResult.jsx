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
    <div className="min-h-screen bg-background text-on-surface font-body-md selection:bg-primary-container selection:text-on-primary-container overflow-x-hidden flex flex-col">
      {/* TopAppBar Shell (Suppressed Navigation Links for Transactional Focus) */}
      <header className="bg-white/70 backdrop-blur-xl dark:bg-surface-container/70 fixed top-0 w-full z-50 border-b border-surface-variant/30 shadow-sm">
        <div className="flex items-center justify-between px-margin-mobile md:px-gutter h-20 w-full max-w-container-max-width mx-auto">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary font-headline-md">school</span>
            <span className="font-headline-md text-headline-md font-bold text-primary">{schoolName || 'Bonus Dominus Schools'}</span>
          </div>
          <button className="bg-primary text-on-primary px-6 py-2.5 rounded-full font-label-md hover:bg-primary/90 transition-all active:scale-95 shadow-sm">
            Portal Access
          </button>
        </div>
      </header>

      {/* Main Content Canvas */}
      <main className="flex-grow pt-32 pb-section-padding bg-mesh relative flex items-center justify-center">
        {/* Background Decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-3xl"></div>
          <div className="absolute top-[20%] -right-[5%] w-[30%] h-[30%] bg-tertiary/5 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 w-full max-w-[520px] px-margin-mobile">
          {/* Header Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center text-center mb-10"
          >
            <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center mb-6 border border-outline-variant/30">
              <ShieldCheck size={32} className="text-primary" />
            </div>
            <h1 className="font-display-lg text-display-lg text-primary tracking-tight mb-2 uppercase">Result Checker</h1>
            <p className="font-body-lg text-on-surface-variant max-w-[320px]">Secure Academic Access Portal</p>
          </motion.div>

          {/* Form Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-surface-container-lowest rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-outline-variant/20 p-8 md:p-10 relative overflow-hidden"
          >
            {/* Inner Indigo Accent Blur */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-2xl"></div>
            
            <form onSubmit={handleCheck} className="space-y-6 relative z-10">
              {/* Registration Number Field */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <Hash size={18} className="text-on-surface-variant" />
                  <label className="font-label-md text-on-surface-variant uppercase tracking-wider">Registration Number</label>
                </div>
                <div className="relative">
                  <GraduationCap size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" />
                  <input 
                    type="text"
                    value={regNo}
                    onChange={(e) => setRegNo(e.target.value)}
                    placeholder="e.g. BDS/2024/001"
                    className="w-full pl-12 pr-4 py-4 bg-surface-container-low border-transparent border-2 focus:border-primary focus:bg-white rounded-xl transition-all outline-none text-body-md text-on-surface placeholder:text-outline-variant"
                    required
                  />
                </div>
              </div>

              {/* Access PIN Field */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <Key size={18} className="text-on-surface-variant" />
                  <label className="font-label-md text-on-surface-variant uppercase tracking-wider">Access PIN (6 Digits)</label>
                </div>
                <div className="relative">
                  <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" />
                  <input 
                    type="password"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="Enter 6-digit PIN"
                    className="w-full pl-12 pr-4 py-4 bg-surface-container-low border-transparent border-2 focus:border-primary focus:bg-white rounded-xl transition-all outline-none text-body-md text-on-surface placeholder:text-outline-variant tracking-[0.5em] font-bold"
                    required
                  />
                </div>
              </div>

              {/* Error State */}
              <AnimatePresence>
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-start gap-3 p-4 bg-error-container/30 border border-error/20 rounded-xl">
                      <AlertCircle size={20} className="text-error flex-shrink-0" />
                      <p className="text-sm font-medium text-on-error-container">{error}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit Button */}
              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-inverse-surface text-inverse-on-surface py-5 rounded-xl font-headline-md flex items-center justify-center gap-3 hover:bg-on-surface-variant transition-all active:scale-[0.98] shadow-md mt-4 disabled:opacity-50 disabled:pointer-events-none"
              >
                {loading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <>
                    <span>Verify & Access Result</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            {/* Help Link */}
            <div className="mt-8 pt-8 border-t border-outline-variant/20 text-center">
              <p className="text-on-surface-variant text-body-md italic">
                Contact the school administrator if you lost your PIN or encounter technical issues.
              </p>
            </div>
          </motion.div>

          {/* Branding/Image Graphic */}
          <div className="mt-12 opacity-80 mix-blend-multiply flex justify-center">
            <img 
              className="w-48 h-12 object-cover rounded-full grayscale" 
              alt="An elegant, modern university library interior with high glass ceilings and rows of organized books, bathed in natural morning light. The atmosphere is quiet, intellectual, and professional, reflecting a high-standard academic environment with a sophisticated color palette of slate, deep blues, and warm whites."
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAye-csEV2pTMuAJGoSkQwr8WWRWdyZkmd2VVTT-rIRSZvx6JBqpT6Q1MxZOYW3GRywUqV2Gnd3jM5C_QXkHWnn66NPZA4v0M8CjjboDR3keVbRthv6EfnOAhsNnsl8ZO9Oy_MJPY0tSoxpLpGhqTH4AVgmZRBbPNxUdviTZb9iMO_wwoGuVec6rdLNPP3SjPBzrUEOSk7ZiVV76MJKkhQXO1DVWY89k2_pNxvX7Ql7Vk9dvsPFVJtHytEdolt92ZUn4Scpo3u93oB6"
            />
          </div>
        </div>
      </main>

      {/* Footer Component */}
      <footer className="bg-surface-container-highest dark:bg-surface-container-lowest w-full py-section-padding border-t border-surface-variant/50">
        <div className="max-w-container-max-width mx-auto px-margin-mobile md:px-gutter grid grid-cols-1 md:grid-cols-4 gap-gutter">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <span className="material-symbols-outlined text-primary font-headline-lg">school</span>
              <span className="font-headline-lg text-headline-lg font-bold text-primary">{schoolName || 'Bonus Dominus Schools'}</span>
            </div>
            <p className="font-body-md text-on-surface-variant mb-6 max-w-sm">
              Empowering students through academic excellence and forward-thinking education. Sowing the Seed of Greatness since 1998.
            </p>
            <p className="font-body-md text-on-surface-variant">© {new Date().getFullYear()} {schoolName || 'Bonus Dominus Schools'}. Sowing the Seed of Greatness.</p>
          </div>
          <div>
            <h4 className="font-headline-md text-headline-md text-primary mb-6">Quick Links</h4>
            <ul className="space-y-4">
              <li><a className="text-on-surface-variant hover:text-primary transition-colors hover:underline font-body-md" href="#">About Us</a></li>
              <li><a className="text-on-surface-variant hover:text-primary transition-colors hover:underline font-body-md" href="#">Admissions</a></li>
              <li><a className="text-on-surface-variant hover:text-primary transition-colors hover:underline font-body-md" href="#">Academics</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-headline-md text-headline-md text-primary mb-6">Legal</h4>
            <ul className="space-y-4">
              <li><a className="text-on-surface-variant hover:text-primary transition-colors hover:underline font-body-md" href="#">Contact Us</a></li>
              <li><a className="text-on-surface-variant hover:text-primary transition-colors hover:underline font-body-md" href="#">Privacy Policy</a></li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default CheckResult;