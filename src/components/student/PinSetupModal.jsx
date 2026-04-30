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
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.98, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.98, opacity: 0, y: 10 }}
        className="bg-white w-full max-w-md rounded-none shadow-[20px_20px_0px_rgba(79,70,229,0.1)] border-2 border-slate-900 overflow-hidden relative"
      >
        {/* Modern Geometric Accent */}
        <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600" />

        <div className="p-8 pt-12 text-slate-900 relative">
          <div className="absolute top-4 right-8 opacity-5 text-indigo-600">
            <ShieldCheck size={80} />
          </div>
          <div className="relative z-10 text-left">
            <h3 className="text-3xl font-black mb-2 tracking-tighter uppercase">Secure Account</h3>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Initial PIN Registration Required</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8 relative z-10">
          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Access PIN</label>
              <span className="text-[10px] font-bold text-indigo-600 tracking-tighter">6 DIGITS REQUIRED</span>
            </div>
            <div className="relative group">
              <input 
                type="password" 
                maxLength={6}
                value={pin}
                onChange={(e) => setLocalPin(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                required
                className="w-full px-0 py-4 border-b-4 border-slate-100 focus:border-indigo-600 bg-transparent outline-none font-black text-4xl tracking-[0.5em] transition-all placeholder:text-slate-100"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Recovery Question</label>
            <div className="relative group">
              <select 
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                required
                className="w-full px-0 py-4 border-b-4 border-slate-100 focus:border-indigo-600 bg-transparent outline-none font-bold text-slate-700 appearance-none transition-all cursor-pointer"
              >
                <option value="">Select Verification Question</option>
                {questions.map(q => <option key={q} value={q}>{q}</option>)}
              </select>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-focus-within:text-indigo-600">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Verification Answer</label>
            <input 
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="MEMORABLE RESPONSE"
              required
              className="w-full px-0 py-4 border-b-4 border-slate-100 focus:border-indigo-600 bg-transparent outline-none font-bold text-slate-700 transition-all placeholder:text-slate-200 uppercase"
            />
          </div>

          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-rose-600 text-white p-4 font-black text-[10px] uppercase tracking-widest"
              >
                ERROR: {error}
              </motion.div>
            )}
          </AnimatePresence>

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-6 bg-slate-900 text-white font-black hover:bg-indigo-600 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 text-xs uppercase tracking-[0.3em]"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : 'Confirm & Activate'}
          </button>
        </form>
      </motion.div>

      <AnimatePresence>
        {success && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed top-8 bg-slate-900 text-white px-8 py-4 border-2 border-indigo-500 shadow-[10px_10px_0px_rgba(79,70,229,0.2)] flex items-center gap-4 z-[210]"
          >
            <CheckCircle2 size={24} className="text-indigo-400" />
            <span className="font-black text-sm uppercase tracking-widest">Security System Enabled</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PinSetupModal;
