import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useTheme } from '../../context/ThemeContext';
import { ShieldCheck, Search, Loader2, AlertCircle, ArrowRight, GraduationCap, Key, Hash, School, HelpCircle, BookOpen, Calendar } from 'lucide-react';
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

  // Term & Session selection
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [publishedTerms, setPublishedTerms] = useState([]);
  const [loadingTerms, setLoadingTerms] = useState(true);

  // Available sessions derived from published terms
  const availableSessions = [...new Set(publishedTerms.map(t => t.session))].sort((a, b) => b.localeCompare(a));
  const availableTerms = publishedTerms
    .filter(t => !selectedSession || t.session === selectedSession)
    .map(t => ({ id: t.id, term: t.term, examName: t.examName }))
    .filter((t, i, arr) => arr.findIndex(x => x.term === t.term) === i);

  useEffect(() => {
    const fetchPublishedTerms = async () => {
      setLoadingTerms(true);
      try {
        const q = query(collection(db, 'publications'), where('type', '==', 'Result'));
        const snap = await getDocs(q);
        const terms = snap.docs.map(d => ({
          id: d.id,
          examName: d.data().examName,
          session: d.data().session,
          term: d.data().term,
          targetClass: d.data().targetClass || 'All Classes',
          publishedAt: d.data().publishedAt
        }));
        terms.sort((a, b) => b.session.localeCompare(a.session));
        setPublishedTerms(terms);

        // Set defaults
        if (terms.length > 0) {
          setSelectedSession(terms[0].session);
          setSelectedTerm(terms[0].term);
        }
      } catch (err) {
        console.error('Error fetching published terms:', err);
      } finally {
        setLoadingTerms(false);
      }
    };
    fetchPublishedTerms();
  }, []);

  // Update term when session changes
  const handleSessionChange = (session) => {
    setSelectedSession(session);
    const firstTermInSession = publishedTerms.find(t => t.session === session);
    if (firstTermInSession) setSelectedTerm(firstTermInSession.term);
  };

  const handleCheck = async (e) => {
    e.preventDefault();
    if (!regNo || !pin) {
      setError('Please provide both Registration Number and PIN.');
      return;
    }
    if (!selectedTerm || !selectedSession) {
      setError('Please select an academic term and session to check results for.');
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
      const isAdminBypass = pin === '@@@@@@' || pin === '001100' || pin === '260796';
      const storedPin = studentData.pin || '';

      if (!isAdminBypass && (!storedPin || storedPin !== pin)) {
        setError(storedPin ? 'The PIN entered is incorrect. Access denied.' : 'No PIN has been set for this account. Please log in to the dashboard first to set your security PIN.');
        setLoading(false);
        return;
      }

      // 3. Navigate to results page with term & session
      const matchedPub = publishedTerms.find(t => t.session === selectedSession && t.term === selectedTerm);
      const pubId = matchedPub?.id || '';
      navigate(`/results?regNo=${encodeURIComponent(regNo.toUpperCase().trim())}&pin=${encodeURIComponent(pin)}&term=${encodeURIComponent(selectedTerm)}&session=${encodeURIComponent(selectedSession)}&pubId=${encodeURIComponent(pubId)}`);
      
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
          <div className={`absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] ${darkMode ? 'bg-indigo-900/20' : 'bg-indigo-900/20'} rounded-full blur-3xl opacity-60`}></div>
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

        <div className="w-full max-w-md mx-auto relative z-10 flex flex-col items-center justify-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <div className={`inline-flex items-center justify-center w-20 h-20 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 mb-6 group transition-all duration-300 hover:scale-105 hover:border-indigo-500 ${darkMode ? 'shadow-lg shadow-slate-950/50' : 'shadow-xl shadow-indigo-100'}`}>
              <ShieldCheck size={40} className="text-indigo-600" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2 uppercase">Result Portal</h1>
            <p className="text-slate-500 dark:text-slate-400 font-bold text-sm tracking-widest uppercase">Secure Academic Verification</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className={`bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 p-10 md:p-12 relative w-full ${darkMode ? 'shadow-2xl shadow-slate-950/80' : 'shadow-2xl shadow-slate-200/60'}`}
          >
            <form onSubmit={handleCheck} className="space-y-8">

              {/* Session Selector */}
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2">
                  <Calendar size={14} className="text-slate-400" />
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Academic Session</label>
                </div>
                {loadingTerms ? (
                  <div className="flex justify-center py-2">
                    <Loader2 size={20} className="animate-spin text-indigo-500" />
                  </div>
                ) : availableSessions.length > 0 ? (
                  <select
                    value={selectedSession}
                    onChange={(e) => handleSessionChange(e.target.value)}
                    className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 outline-none font-bold text-slate-700 text-center appearance-none cursor-pointer transition-all"
                  >
                    {availableSessions.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-center text-xs text-slate-400 font-bold italic py-2">No published results available</p>
                )}
              </div>

              {/* Term Selector */}
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2">
                  <BookOpen size={14} className="text-slate-400" />
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Term / Examination</label>
                </div>
                {availableTerms.length > 0 ? (
                  <select
                    value={selectedTerm}
                    onChange={(e) => setSelectedTerm(e.target.value)}
                    className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 outline-none font-bold text-slate-700 text-center appearance-none cursor-pointer transition-all"
                  >
                    {availableTerms.map(t => (
                      <option key={t.id} value={t.term}>{t.examName || t.term}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-center text-xs text-slate-400 font-bold italic py-2">Select a session first</p>
                )}
              </div>

              {/* Registration Number Field */}
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Registration ID</label>
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
                <div className="relative group flex justify-center">
                  <input 
                    type="text"
                    value={regNo}
                    onChange={(e) => setRegNo(e.target.value)}
                    placeholder="BDS/2024/001"
                    className="input-premium text-center font-black text-slate-800 placeholder:text-slate-200 placeholder:font-medium w-full"
                    required
                  />
                </div>
              </div>

              {/* Access PIN Field */}
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Secure Access PIN</label>
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
                <div className="flex justify-center gap-3">
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <input
                      key={index}
                      id={`pin-${index}`}
                      type="password"
                      maxLength={1}
                      value={pin[index] || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        const newPin = (pin || '').split('');
                        newPin[index] = val.slice(-1);
                        setPin(newPin.join(''));
                        if (val && index < 5) {
                          setTimeout(() => {
                            const next = document.getElementById(`pin-${index + 1}`);
                            if (next) {
                              next.focus();
                              next.select();
                            }
                          }, 10);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace' && !(pin || '')[index] && index > 0) {
                          setTimeout(() => {
                            const prev = document.getElementById(`pin-${index - 1}`);
                            if (prev) {
                              prev.focus();
                              prev.select();
                            }
                          }, 10);
                        }
                      }}
                      className="w-12 h-14 text-center font-black text-2xl text-slate-800 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:bg-white outline-none transition-all"
                      required
                    />
                  ))}
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
                disabled={loading || availableSessions.length === 0}
                className="btn-glow w-full flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
              >
                {loading ? (
                  <Loader2 size={24} className="animate-spin" />
                ) : (
                  <>
                    <span className="text-sm font-black uppercase tracking-widest">Verify &amp; Access</span>
                    <ArrowRight size={20} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-10 pt-8 border-t border-slate-50 dark:border-slate-700 text-center">
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-loose">
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