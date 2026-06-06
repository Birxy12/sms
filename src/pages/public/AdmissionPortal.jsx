import React, { useState } from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/MainFooter';
import { ClipboardSignature, Loader2, CheckCircle, AlertTriangle, XCircle, GraduationCap } from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const AdmissionPortal = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    dateOfBirth: '',
    stateOfOrigin: '',
    localGovernment: '',
    classApplyingFor: '',
    lastAverage: '',
    cbtScore: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // 'granted', 'trial', 'rejected', null
  const [message, setMessage] = useState('');

  const classOptions = ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3'];

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    setMessage('');

    try {
      const score = Number(formData.cbtScore);
      let admissionStatus = '';
      let msg = '';

      if (score >= 50) {
        admissionStatus = 'granted';
        msg = 'Congratulations! Admission Granted.';
      } else if (score >= 45 && score < 50) {
        admissionStatus = 'trial';
        msg = 'Admission on Trial. You will be monitored closely.';
      } else {
        admissionStatus = 'rejected';
        msg = 'We regret to inform you that you are Not Admitted.';
      }

      // Save to Firebase
      await addDoc(collection(db, 'admissions'), {
        ...formData,
        admissionStatus,
        createdAt: serverTimestamp()
      });

      setStatus(admissionStatus);
      setMessage(msg);
      
      // If rejected, maybe we can clear form or keep it. Let's just keep it so they can see.
    } catch (error) {
      console.error("Error submitting application:", error);
      setMessage("An error occurred while submitting your application. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-12 animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-white p-8 md:p-12 rounded-[2rem] shadow-xl border border-slate-100">
          <div className="flex items-center gap-4 mb-8 border-b border-slate-100 pb-6">
            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
              <ClipboardSignature size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Admission Portal</h1>
              <p className="text-slate-500 font-medium">Apply for enrollment and check your admission status.</p>
            </div>
          </div>

          {status ? (
            <div className={`p-8 rounded-[2rem] flex flex-col items-center justify-center text-center space-y-4 ${
              status === 'granted' ? 'bg-emerald-50 text-emerald-700 border-2 border-emerald-100' :
              status === 'trial' ? 'bg-amber-50 text-amber-700 border-2 border-amber-100' :
              'bg-rose-50 text-rose-700 border-2 border-rose-100'
            }`}>
              {status === 'granted' && <CheckCircle size={64} className="text-emerald-500" />}
              {status === 'trial' && <AlertTriangle size={64} className="text-amber-500" />}
              {status === 'rejected' && <XCircle size={64} className="text-rose-500" />}
              
              <h2 className="text-2xl font-black">{message}</h2>
              <p className="font-medium opacity-80 max-w-md mx-auto">
                {status === 'granted' && "Your application has been successful. Please proceed to the bursary for fee payment to complete your registration."}
                {status === 'trial' && "You have been placed on trial admission based on your CBT score. Your performance will be evaluated at the end of the term."}
                {status === 'rejected' && "Unfortunately, your CBT score did not meet the minimum requirement for admission. We wish you the best in your future endeavors."}
              </p>
              
              <button 
                onClick={() => setStatus(null)}
                className="mt-6 px-8 py-3 bg-white rounded-xl shadow-sm font-bold text-sm hover:shadow-md transition-all text-slate-800"
              >
                Submit Another Application
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Full Name</label>
                  <input 
                    type="text" 
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="e.g. John Doe"
                    required
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 outline-none font-bold text-slate-800 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Date of Birth</label>
                  <input 
                    type="date" 
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 outline-none font-bold text-slate-800 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">State of Origin</label>
                  <input 
                    type="text" 
                    name="stateOfOrigin"
                    value={formData.stateOfOrigin}
                    onChange={handleChange}
                    placeholder="e.g. Lagos"
                    required
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 outline-none font-bold text-slate-800 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Local Government</label>
                  <input 
                    type="text" 
                    name="localGovernment"
                    value={formData.localGovernment}
                    onChange={handleChange}
                    placeholder="e.g. Ikeja"
                    required
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 outline-none font-bold text-slate-800 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Class Applying For</label>
                  <select 
                    name="classApplyingFor"
                    value={formData.classApplyingFor}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 outline-none font-bold text-slate-800 transition-all cursor-pointer"
                  >
                    <option value="">Select a class</option>
                    {classOptions.map(cls => <option key={cls} value={cls}>{cls}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Last Avg (Old School)</label>
                  <input 
                    type="number" 
                    name="lastAverage"
                    value={formData.lastAverage}
                    onChange={handleChange}
                    placeholder="e.g. 75"
                    min="0"
                    max="100"
                    required
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 outline-none font-bold text-slate-800 transition-all"
                  />
                </div>
              </div>

              <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 mt-8">
                <div className="flex items-center gap-3 mb-4">
                  <GraduationCap className="text-indigo-600" size={24} />
                  <h3 className="font-black text-indigo-900 text-lg">CBT Evaluation</h3>
                </div>
                <div>
                  <label className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-2 block">New CBT Exam Score</label>
                  <input 
                    type="number" 
                    name="cbtScore"
                    value={formData.cbtScore}
                    onChange={handleChange}
                    placeholder="Enter CBT Score (0-100)"
                    min="0"
                    max="100"
                    required
                    className="w-full px-4 py-4 rounded-xl bg-white border-2 border-indigo-200 focus:border-indigo-600 outline-none font-black text-xl text-indigo-900 transition-all placeholder:text-indigo-200"
                  />
                  <p className="text-xs text-indigo-500 font-medium mt-3 leading-relaxed">
                    A score of 50 and above guarantees admission. A score of exactly 45-49 places the student on trial. Scores below 45 will be rejected.
                  </p>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-slate-900 text-white font-black py-4 rounded-xl hover:bg-indigo-600 transition-all shadow-lg shadow-slate-200 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={20} className="animate-spin" /> : <ClipboardSignature size={20} />}
                Check Admission Status
              </button>
            </form>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AdmissionPortal;
