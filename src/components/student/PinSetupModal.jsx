import React, { useState } from 'react';
import { useStudentAuth } from '../../context/StudentAuthContext';
import { Lock, ShieldCheck, HelpCircle, Loader2, CheckCircle2, ChevronRight, KeyRound, Sparkles } from 'lucide-react';
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
  if (success) return null;

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
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Modern Web App Header */}
        <div className="p-6 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white relative overflow-hidden shrink-0">
          <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
              <ShieldCheck size={24} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white tracking-tight">Create Portal PIN</h3>
              <p className="text-xs text-indigo-100 font-medium">Set a 6-digit security PIN to secure your account.</p>
            </div>
          </div>
        </div>

        {/* Scrollable Form Container */}
        <form onSubmit={handleSubmit} className="overflow-y-auto custom-scrollbar p-6 space-y-6 flex-1">
          {/* PIN Input Section */}
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 uppercase tracking-wider block flex items-center justify-between">
              <span>6-Digit Access PIN</span>
              <span className="text-[10px] text-indigo-600 font-bold lowercase">numbers only</span>
            </label>
            
            <div className="flex justify-between gap-2">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <input
                  key={i}
                  id={`setup-pin-${i}`}
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={pin[i] || ''}
                  required
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    if (val.length <= 1) {
                      const newPin = pin.split('');
                      newPin[i] = val;
                      const joined = newPin.join('').slice(0, 6);
                      setLocalPin(joined);
                      if (val && i < 5) {
                        setTimeout(() => {
                          const next = document.getElementById(`setup-pin-${i + 1}`);
                          if (next) {
                            next.focus();
                            next.select();
                          }
                        }, 10);
                      }
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Backspace' && !pin[i] && i > 0) {
                      setTimeout(() => {
                        const prev = document.getElementById(`setup-pin-${i - 1}`);
                        if (prev) {
                          prev.focus();
                          prev.select();
                        }
                      }, 10);
                    }
                  }}
                  className="w-12 h-13 text-center rounded-xl border-2 border-slate-200 focus:border-indigo-600 focus:bg-indigo-50/30 bg-slate-50 outline-none font-black text-xl text-slate-800 transition-all shadow-xs"
                />
              ))}
            </div>
          </div>

          {/* Recovery Question */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-500 uppercase tracking-wider block">
              Security Recovery Question
            </label>
            <div className="relative">
              <select 
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none font-bold text-xs text-slate-700 transition-all cursor-pointer appearance-none"
              >
                <option value="">Select a security question...</option>
                {questions.map(q => <option key={q} value={q}>{q}</option>)}
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>
          </div>

          {/* Verification Answer */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-500 uppercase tracking-wider block">
              Secret Answer
            </label>
            <input 
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="e.g. Fluffy or Oxford"
              required
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none font-bold text-xs text-slate-800 transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-rose-50 border border-rose-200 text-rose-600 p-3 rounded-xl text-xs font-bold flex items-center gap-2"
              >
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Buttons */}
          <div className="pt-2">
            <button 
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-lg shadow-indigo-200 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <KeyRound size={16} />
                  <span>Save & Activate PIN</span>
                </>
              )}
            </button>
            
            <p className="text-[10px] text-center text-slate-400 font-medium mt-3">
              You will use this 6-digit PIN for future quick logins.
            </p>
          </div>
        </form>
      </motion.div>

      <AnimatePresence>
        {success && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-8 bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 z-[210] border border-slate-700"
          >
            <CheckCircle2 size={18} className="text-emerald-400" />
            <span className="font-bold text-xs">PIN Setup Successfully!</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PinSetupModal;
