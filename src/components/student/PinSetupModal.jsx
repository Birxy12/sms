import React, { useState } from 'react';
import { useStudentAuth } from '../../context/StudentAuthContext';
import { Lock, ShieldCheck, HelpCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PinSetupModal = () => {
  const { currentStudent, setPin } = useStudentAuth();
  const [pin, setLocalPin] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Only show if student is logged in and has NO pin
  if (!currentStudent || currentStudent.pin) return null;
  if (success) return null; // Or show success message then close

  const questions = [
    "What was the name of your first pet?",
    "What is your mother's maiden name?",
    "What was the name of your primary school?",
    "In what city were you born?",
    "What is your favorite book?",
    "What was your childhood nickname?"
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (pin.length !== 6) {
      setError('PIN must be exactly 6 digits.');
      return;
    }
    if (!question || !answer) {
      setError('Please select a security question and provide an answer.');
      return;
    }

    setLoading(true);
    setError('');
    const result = await setPin(pin, question, answer);
    if (result.success) {
      setSuccess(true);
    } else {
      setError(result.message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="bg-white w-full max-w-md rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden relative"
      >
        {/* Decorative Background Icon */}
        <div className="absolute -top-12 -right-12 text-indigo-500/5 rotate-12 pointer-events-none">
          <ShieldCheck size={280} />
        </div>

        <div className="bg-indigo-600 p-8 pt-10 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <ShieldCheck size={120} />
          </div>
          <div className="relative z-10">
            <h3 className="text-2xl font-black mb-2 tracking-tight">Secure Your Account</h3>
            <p className="text-indigo-100 text-sm font-bold opacity-80">Set a 6-digit PIN for future logins.</p>
          </div>
          {/* Progress bar or decorative line */}
          <div className="absolute bottom-0 left-0 h-1 bg-white/20 w-full" />
        </div>

        <form onSubmit={handleSubmit} className="p-8 sm:p-10 space-y-6 relative z-10">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Set 6-Digit PIN</label>
            <div className="relative group">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={18} />
              <input 
                type="password" 
                maxLength={6}
                value={pin}
                onChange={(e) => setLocalPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••••"
                required
                className="w-full pl-14 pr-4 py-4.5 rounded-[1.25rem] bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none font-black text-2xl tracking-[0.8em] transition-all placeholder:tracking-normal placeholder:text-slate-300"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Security Question</label>
            <div className="relative group">
              <HelpCircle className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={18} />
              <select 
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                required
                className="w-full pl-14 pr-10 py-4.5 rounded-[1.25rem] bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none font-bold text-slate-700 appearance-none transition-all"
              >
                <option value="">Select a question</option>
                {questions.map(q => <option key={q} value={q}>{q}</option>)}
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Your Answer</label>
            <input 
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Keep it memorable"
              required
              className="w-full px-6 py-4.5 rounded-[1.25rem] bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none font-bold text-slate-700 transition-all placeholder:text-slate-300"
            />
          </div>

          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-rose-50 text-rose-600 p-4 rounded-2xl text-xs font-bold flex items-center gap-2 border border-rose-100">
                  <ShieldCheck size={16} /> {error}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-indigo-600 text-white font-black rounded-[1.25rem] hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 text-sm uppercase tracking-widest"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : (
              <>
                <ShieldCheck size={20} />
                Activate Security PIN
              </>
            )}
          </button>
        </form>
      </motion.div>

      <AnimatePresence>
        {success && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-12 bg-emerald-600 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 z-[210] border-4 border-emerald-500"
          >
            <div className="bg-white text-emerald-600 rounded-full p-1">
              <CheckCircle2 size={24} />
            </div>
            <span className="font-black text-lg tracking-tight">Security PIN Activated!</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PinSetupModal;
