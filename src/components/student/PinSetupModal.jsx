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
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden"
      >
        <div className="bg-indigo-600 p-8 text-white relative">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <ShieldCheck size={120} />
          </div>
          <h3 className="text-2xl font-black mb-2">Secure Your Account</h3>
          <p className="text-indigo-100 text-sm font-medium">Please set a 6-digit PIN for future logins.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Set 6-Digit PIN</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input 
                type="password" 
                maxLength={6}
                value={pin}
                onChange={(e) => setLocalPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••••"
                required
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 outline-none font-black text-xl tracking-[1em]"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Security Question</label>
            <div className="relative">
              <HelpCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <select 
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                required
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 outline-none font-bold text-slate-700 appearance-none"
              >
                <option value="">Select a question</option>
                {questions.map(q => <option key={q} value={q}>{q}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Your Answer</label>
            <input 
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Keep it memorable"
              required
              className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 outline-none font-bold text-slate-700"
            />
          </div>

          {error && (
            <div className="bg-rose-50 text-rose-600 p-4 rounded-2xl text-xs font-bold flex items-center gap-2">
              <ShieldCheck size={16} /> {error}
            </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : 'Activate Security PIN'}
          </button>
        </form>
      </motion.div>

      <AnimatePresence>
        {success && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-12 bg-emerald-600 text-white px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-3 z-[210]"
          >
            <CheckCircle2 size={24} />
            <span className="font-black">Security PIN Set Successfully!</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PinSetupModal;
