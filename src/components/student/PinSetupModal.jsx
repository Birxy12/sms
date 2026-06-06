import React, { useState } from 'react';
import { useStudentAuth } from '../../context/StudentAuthContext';
import { Lock, ShieldCheck, HelpCircle, Loader2, CheckCircle2, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion'; // eslint-disable-line no-unused-vars

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
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.98, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white w-[400px] h-[400px] rounded-none shadow-[24px_24px_0px_rgba(79,70,229,0.1)] border-[3px] border-slate-900 overflow-hidden relative flex flex-col"
      >
        {/* Advanced Background Grid */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

        <div className="p-6 pb-2 border-b-2 border-slate-100 relative bg-slate-50/50">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-black tracking-tighter uppercase leading-none mb-1">Secure PIN</h3>
              <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Protocol Activation</p>
            </div>
            <ShieldCheck size={24} className="text-slate-900" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 p-6 flex flex-col justify-between relative z-10">
          <div className="space-y-5">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Set Access PIN</label>
              <div className="flex gap-2">
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
                          document.getElementById(`setup-pin-${i + 1}`)?.focus();
                        }
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace' && !pin[i] && i > 0) {
                        document.getElementById(`setup-pin-${i - 1}`)?.focus();
                      }
                    }}
                    className="w-10 text-center py-2 border-b-2 border-slate-200 focus:border-indigo-600 bg-transparent outline-none font-black text-2xl transition-all"
                  />
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Recovery Question</label>
              <div className="relative group">
                <select 
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  required
                  className="w-full py-2 border-b-2 border-slate-200 focus:border-indigo-600 bg-transparent outline-none font-bold text-xs text-slate-700 appearance-none transition-all cursor-pointer"
                >
                  <option value="">Select Question</option>
                  {questions.map(q => <option key={q} value={q}>{q}</option>)}
                </select>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-focus-within:text-indigo-600">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Verification Answer</label>
              <input 
                type="text"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Memorable Response"
                required
                className="w-full py-2 border-b-2 border-slate-200 focus:border-indigo-600 bg-transparent outline-none font-bold text-xs text-slate-700 transition-all placeholder:text-slate-200 uppercase"
              />
            </div>
          </div>

          <div className="space-y-4">
            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-rose-50 text-rose-600 p-3 text-[9px] font-black uppercase tracking-widest border-l-4 border-rose-600 shadow-sm"
                >
                  System Alert: {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              type="submit"
              disabled={loading}
              className="group relative w-full py-5 bg-slate-900 text-white font-black overflow-hidden transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-4 text-[10px] uppercase tracking-[0.3em] hover:bg-indigo-600 shadow-[0_10px_30px_rgba(0,0,0,0.1)]"
            >
              <div className="absolute inset-0 w-1/3 h-full bg-white/5 -skew-x-12 -translate-x-full group-hover:translate-x-[400%] transition-transform duration-1000 ease-in-out" />
              
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  <ShieldCheck size={18} className="group-hover:rotate-12 transition-transform" />
                  <span>Execute Security Setup</span>
                  <ChevronRight size={14} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </>
              )}
            </button>
            
            <p className="text-[8px] text-center text-slate-400 font-bold uppercase tracking-widest">
              Encryption Level: AES-256 Protocol Active
            </p>
          </div>
        </form>
      </motion.div>

      <AnimatePresence>
        {success && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-8 bg-slate-900 text-white px-6 py-3 border-2 border-indigo-500 shadow-[8px_8px_0px_rgba(79,70,229,0.2)] flex items-center gap-3 z-[210]"
          >
            <CheckCircle2 size={18} className="text-indigo-400" />
            <span className="font-black text-[10px] uppercase tracking-widest">Security Initialized</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PinSetupModal;
