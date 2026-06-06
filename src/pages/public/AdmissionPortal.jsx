import React, { useState, useEffect, useRef } from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/MainFooter';
import { ClipboardSignature, Loader2, CheckCircle, AlertTriangle, XCircle, GraduationCap, Printer, Download } from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { useTheme } from '../../context/ThemeContext';
import brandLogo from '../../assets/bdslogo.jpg';

const AdmissionPortal = () => {
  const { schoolName, schoolLogo } = useTheme();
  const logoUrl = schoolLogo || brandLogo;
  const letterRef = useRef(null);

  const [formData, setFormData] = useState({
    fullName: '',
    dateOfBirth: '',
    stateOfOrigin: '',
    localGovernment: '',
    classApplyingFor: '',
    lastAverage: '',
    cbtScore: ''
  });

  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [result, setResult] = useState(null); // { status, applicant }
  const [letterTemplate, setLetterTemplate] = useState('');

  // Fetch classes from DB
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'classes'), orderBy('name')));
        if (!snap.empty) {
          setClasses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } else {
          // Fallback static list
          setClasses([
            { id: 'JSS1', name: 'JSS1' },
            { id: 'JSS2', name: 'JSS2' },
            { id: 'JSS3', name: 'JSS3' },
            { id: 'SS1', name: 'SS1' },
            { id: 'SS2-SCIENCE', name: 'SS2 SCIENCE' },
            { id: 'SS2-ART', name: 'SS2 ART' },
            { id: 'SS3-SCIENCE', name: 'SS3 SCIENCE' },
            { id: 'SS3-ART', name: 'SS3 ART' },
          ]);
        }
      } catch {
        setClasses([
          { id: 'JSS1', name: 'JSS1' },
          { id: 'JSS2', name: 'JSS2' },
          { id: 'JSS3', name: 'JSS3' },
          { id: 'SS1', name: 'SS1' },
          { id: 'SS2-SCIENCE', name: 'SS2 SCIENCE' },
          { id: 'SS2-ART', name: 'SS2 ART' },
          { id: 'SS3-SCIENCE', name: 'SS3 SCIENCE' },
          { id: 'SS3-ART', name: 'SS3 ART' },
        ]);
      } finally {
        setLoadingClasses(false);
      }
    };

    const fetchTemplate = async () => {
      try {
        const tSnap = await getDoc(doc(db, 'admissionLetterTemplates', 'default'));
        if (tSnap.exists()) {
          setLetterTemplate(tSnap.data().body || '');
        }
      } catch { /* no template yet */ }
    };

    fetchClasses();
    fetchTemplate();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const score = Number(formData.cbtScore);
      let admissionStatus = '';
      if (score >= 50) admissionStatus = 'granted';
      else if (score >= 45) admissionStatus = 'trial';
      else admissionStatus = 'rejected';

      await addDoc(collection(db, 'admissions'), {
        ...formData,
        admissionStatus,
        createdAt: serverTimestamp()
      });

      setResult({ status: admissionStatus, applicant: { ...formData } });
    } catch (error) {
      console.error('Error submitting application:', error);
      alert('Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const statusConfig = {
    granted: {
      icon: <CheckCircle size={56} className="text-emerald-500" />,
      color: 'emerald',
      bg: 'bg-emerald-50 border-emerald-100',
      title: 'Admission Granted!',
      subtitle: 'Congratulations! Your application has been successful.',
    },
    trial: {
      icon: <AlertTriangle size={56} className="text-amber-500" />,
      color: 'amber',
      bg: 'bg-amber-50 border-amber-100',
      title: 'Admission on Trial',
      subtitle: 'You have been placed on trial admission.',
    },
    rejected: {
      icon: <XCircle size={56} className="text-rose-500" />,
      color: 'rose',
      bg: 'bg-rose-50 border-rose-100',
      title: 'Not Admitted',
      subtitle: 'Your score did not meet the minimum requirement.',
    }
  };

  const today = new Date().toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-12">

        {/* ── Header ── */}
        <div className="bg-white p-8 md:p-12 rounded-[2rem] shadow-xl border border-slate-100">
          <div className="flex items-center gap-4 mb-8 border-b border-slate-100 pb-6">
            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shrink-0">
              <ClipboardSignature size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Admission Portal</h1>
              <p className="text-slate-500 font-medium text-sm">Apply for enrollment and check your admission status instantly.</p>
            </div>
          </div>

          {/* ── Result View ── */}
          {result ? (
            <div className="space-y-8">
              {/* Status Banner */}
              <div className={`p-6 rounded-2xl flex flex-col items-center text-center space-y-3 border-2 ${statusConfig[result.status].bg}`}>
                {statusConfig[result.status].icon}
                <h2 className="text-xl font-black text-slate-900">{statusConfig[result.status].title}</h2>
                <p className="text-slate-600 font-medium text-sm">{statusConfig[result.status].subtitle}</p>
              </div>

              {/* Admission Letter — only for granted/trial */}
              {(result.status === 'granted' || result.status === 'trial') && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-black text-slate-700 text-sm uppercase tracking-widest">Admission Letter</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-indigo-600 transition-all"
                      >
                        <Printer size={14} /> Print Letter
                      </button>
                    </div>
                  </div>

                  {/* The Printable Letter */}
                  <div
                    ref={letterRef}
                    id="admission-letter"
                    className="border border-slate-200 rounded-2xl bg-white p-8 md:p-12 print:border-0 print:rounded-none print:p-0 print:shadow-none"
                    style={{ fontFamily: 'Georgia, serif' }}
                  >
                    {/* Letter Header */}
                    <div className="flex items-center justify-between mb-8 pb-6 border-b-2 border-slate-200">
                      <div className="flex items-center gap-4">
                        <img src={logoUrl} alt="School Logo" className="w-16 h-16 object-contain rounded-xl border border-slate-100" />
                        <div>
                          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">{schoolName || 'Birxy SMS'}</h2>
                          <p className="text-slate-500 text-xs font-medium">Admission Committee</p>
                        </div>
                      </div>
                      <div className="text-right text-xs text-slate-500">
                        <p>Date: {today}</p>
                        <p className="mt-1 font-bold text-indigo-600 uppercase tracking-wider">
                          {result.status === 'granted' ? 'Offer of Admission' : 'Provisional Admission'}
                        </p>
                      </div>
                    </div>

                    {/* Salutation */}
                    <p className="text-slate-800 mb-4 font-semibold">Dear <strong>{result.applicant.fullName}</strong>,</p>

                    {/* Main Body */}
                    {letterTemplate ? (
                      <div
                        className="text-slate-700 leading-relaxed whitespace-pre-wrap text-sm"
                        dangerouslySetInnerHTML={{
                          __html: letterTemplate
                            .replace(/\{studentName\}/g, result.applicant.fullName)
                            .replace(/\{class\}/g, result.applicant.classApplyingFor)
                            .replace(/\{score\}/g, result.applicant.cbtScore)
                            .replace(/\{schoolName\}/g, schoolName || 'our school')
                            .replace(/\{status\}/g, result.status === 'granted' ? 'GRANTED' : 'ON TRIAL')
                            .replace(/\{date\}/g, today)
                        }}
                      />
                    ) : (
                      <div className="text-slate-700 leading-relaxed text-sm space-y-4">
                        {result.status === 'granted' ? (
                          <>
                            <p>
                              We are delighted to inform you that following your performance in our entrance examination,
                              you have been <strong>OFFERED ADMISSION</strong> into <strong>{schoolName || 'our school'}</strong> for <strong>{result.applicant.classApplyingFor}</strong>.
                            </p>
                            <p>
                              Your CBT score of <strong>{result.applicant.cbtScore}</strong> reflects your academic readiness and we are confident you will thrive in our learning environment.
                              We look forward to welcoming you and believe you will make a wonderful addition to our school community.
                            </p>
                            <p>
                              Please proceed to the Bursary office with this letter and the required documents to complete your registration and payment of school fees.
                            </p>
                          </>
                        ) : (
                          <>
                            <p>
                              Following a review of your entrance examination results, you have been offered a <strong>PROVISIONAL (TRIAL) ADMISSION</strong> into <strong>{schoolName || 'our school'}</strong> for <strong>{result.applicant.classApplyingFor}</strong>.
                            </p>
                            <p>
                              Your CBT score of <strong>{result.applicant.cbtScore}</strong> places you on a trial period. Your academic progress will be closely monitored throughout the term. A satisfactory performance will convert your admission to full status.
                            </p>
                            <p>
                              Please report to the school office with this letter and required documents to complete your enrollment.
                            </p>
                          </>
                        )}
                        <p className="font-bold text-slate-800">Required Documents: Birth Certificate, Previous School Report Card, 2 Passport Photographs.</p>
                      </div>
                    )}

                    {/* Applicant Summary Table */}
                    <div className="mt-6 mb-6 bg-slate-50 rounded-xl p-4 border border-slate-100">
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Applicant Details</h4>
                      <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
                        {[
                          ['Full Name', result.applicant.fullName],
                          ['Date of Birth', result.applicant.dateOfBirth],
                          ['State of Origin', result.applicant.stateOfOrigin],
                          ['Local Government', result.applicant.localGovernment],
                          ['Class Admitted', result.applicant.classApplyingFor],
                          ['CBT Score', `${result.applicant.cbtScore}/100`],
                        ].map(([label, value]) => (
                          <div key={label} className="flex gap-2">
                            <span className="text-slate-500 font-medium">{label}:</span>
                            <span className="text-slate-900 font-bold">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-8 pt-6 border-t border-slate-200 flex items-end justify-between">
                      <div>
                        <div className="h-8 border-b border-slate-400 w-36 mb-1" />
                        <p className="text-xs text-slate-500">Principal's Signature</p>
                      </div>
                      <div className="text-right text-xs text-slate-400">
                        <p>{schoolName || 'Birxy SMS'}</p>
                        <p>Admission Office</p>
                        <p>{today}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={() => setResult(null)}
                className="w-full py-3 border-2 border-slate-200 rounded-xl font-bold text-sm text-slate-600 hover:border-indigo-400 hover:text-indigo-600 transition-all"
              >
                Submit Another Application
              </button>
            </div>
          ) : (

            /* ── Application Form ── */
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {[
                  { label: 'Full Name', name: 'fullName', type: 'text', placeholder: 'e.g. John Doe' },
                  { label: 'Date of Birth', name: 'dateOfBirth', type: 'date', placeholder: '' },
                  { label: 'State of Origin', name: 'stateOfOrigin', type: 'text', placeholder: 'e.g. Lagos' },
                  { label: 'Local Government', name: 'localGovernment', type: 'text', placeholder: 'e.g. Ikeja' },
                ].map(({ label, name, type, placeholder }) => (
                  <div key={name}>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">{label}</label>
                    <input
                      type={type}
                      name={name}
                      value={formData[name]}
                      onChange={handleChange}
                      placeholder={placeholder}
                      required
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 outline-none font-bold text-slate-800 transition-all"
                    />
                  </div>
                ))}

                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Class Applying For</label>
                  <select
                    name="classApplyingFor"
                    value={formData.classApplyingFor}
                    onChange={handleChange}
                    required
                    disabled={loadingClasses}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 outline-none font-bold text-slate-800 transition-all cursor-pointer disabled:opacity-60"
                  >
                    <option value="">{loadingClasses ? 'Loading classes...' : 'Select a class'}</option>
                    {classes.map(cls => (
                      <option key={cls.id} value={cls.name || cls.id}>{cls.name || cls.id}</option>
                    ))}
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

              {/* CBT Score Box */}
              <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
                <div className="flex items-center gap-3 mb-4">
                  <GraduationCap className="text-indigo-600" size={22} />
                  <h3 className="font-black text-indigo-900">CBT Evaluation Score</h3>
                </div>
                <input
                  type="number"
                  name="cbtScore"
                  value={formData.cbtScore}
                  onChange={handleChange}
                  placeholder="Enter CBT Score (0–100)"
                  min="0"
                  max="100"
                  required
                  className="w-full px-4 py-4 rounded-xl bg-white border-2 border-indigo-200 focus:border-indigo-600 outline-none font-black text-2xl text-indigo-900 transition-all placeholder:text-indigo-200 placeholder:font-normal placeholder:text-base"
                />
                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-bold">
                  <div className="py-2 rounded-lg bg-emerald-100 text-emerald-700">≥ 50 → Admitted</div>
                  <div className="py-2 rounded-lg bg-amber-100 text-amber-700">45–49 → On Trial</div>
                  <div className="py-2 rounded-lg bg-rose-100 text-rose-700">{"< 45"} → Rejected</div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || loadingClasses}
                className="w-full bg-slate-900 text-white font-black py-4 rounded-xl hover:bg-indigo-600 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={20} className="animate-spin" /> : <ClipboardSignature size={20} />}
                Submit Application & Check Status
              </button>
            </form>
          )}
        </div>
      </main>

      <Footer />

      {/* Print Styles */}
      <style>{`
        @media print {
          body > *:not(#root) { display: none; }
          nav, footer, button, .no-print { display: none !important; }
          #admission-letter { display: block !important; }
          body { background: white; }
        }
      `}</style>
    </div>
  );
};

export default AdmissionPortal;
