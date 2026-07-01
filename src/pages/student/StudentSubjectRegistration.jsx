import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useStudentAuth } from '../../context/StudentAuthContext';
import { getSubjectsForClass } from '../../utils/subjectConfig';
import { BookOpen, CheckSquare, Square, AlertCircle, Save, Loader2, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const StudentSubjectRegistration = () => {
  const { currentStudent, updateProfile } = useStudentAuth();
  const navigate = useNavigate();
  
  const [isEnabled, setIsEnabled] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState({ type: '', text: '' });
  // Stream selection for generic SS2/SS3 classes
  const [selectedStream, setSelectedStream] = useState('');
  // Pagination state for subjects list
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    // Check if the portal is enabled globally
    const checkStatus = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'academic_permissions'));
        if (snap.exists()) {
          setIsEnabled(snap.data().subjectRegistrationEnabled ?? false);
        }
      } catch (err) {
        console.error('Error fetching academic config:', err);
      } finally {
        setLoadingConfig(false);
      }
    };
    checkStatus();
  }, []);

  useEffect(() => {
    if (!currentStudent) return;
    
    // Ensure student is SS1, SS2 or SS3
    const isEligible = currentStudent.className === 'SS1' ||
      currentStudent.className.startsWith('SS2') ||
      currentStudent.className.startsWith('SS3');
    if (!isEligible) {
      // If someone navigates here manually but isn't eligible
      navigate('/students/dashboard');
      return;
    }

    // Determine subject list based on class and optional stream selection
    let subjects = [];
    const genericSS = /^(SS2|SS3)$/.test(currentStudent.className);
    if (genericSS && selectedStream) {
      // Combine class name with chosen stream (e.g., 'SS2 ART')
      subjects = getSubjectsForClass(`${currentStudent.className} ${selectedStream}`);
    } else {
      subjects = getSubjectsForClass(currentStudent.className);
    }
    setAvailableSubjects(subjects);

    // Load existing selected subjects
    if (currentStudent.registeredSubjects && Array.isArray(currentStudent.registeredSubjects)) {
      setSelectedSubjects(currentStudent.registeredSubjects);
    }
    // If the student is in generic SS2/SS3 and already has a className with stream, preset it
    if (/^(SS2|SS3) (ART|SCIENCE)$/.test(currentStudent.className)) {
      const parts = currentStudent.className.split(' ');
      setSelectedStream(parts[1]);
    }
  }, [currentStudent, navigate, selectedStream]);

  useEffect(() => {
    // Reset pagination to first page whenever available subjects change (e.g., stream selection)
    setCurrentPage(0);
  }, [availableSubjects]);

  const toggleSubject = (subject) => {
    if (selectedSubjects.includes(subject)) {
      setSelectedSubjects(prev => prev.filter(s => s !== subject));
    } else {
      if (selectedSubjects.length >= 9) {
        setSaveMessage({ type: 'error', text: 'You can only select exactly 9 subjects.' });
        setTimeout(() => setSaveMessage({ type: '', text: '' }), 3000);
        return;
      }
      setSelectedSubjects(prev => [...prev, subject]);
    }
  };

  const renderStreamSelector = () => {
    if (!/^(SS2|SS3)$/.test(currentStudent?.className)) return null;
    return (
      <div className="mb-6 p-6 bg-indigo-50 rounded-3xl border border-indigo-100">
        <label className="block text-sm font-bold text-indigo-900 mb-2">Select Stream</label>
        <div className="flex gap-4">
          {['ART', 'SCIENCE'].map((stream) => (
            <button
              key={stream}
              onClick={() => setSelectedStream(stream)}
              className={`px-6 py-2 rounded-xl font-bold transition-all ${selectedStream === stream ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-indigo-600 border border-indigo-200'}`}
            >
              {stream}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const handleSave = async () => {
    if (selectedSubjects.length !== 9) {
      setSaveMessage({ type: 'error', text: `Please select exactly 9 subjects. You currently selected ${selectedSubjects.length}.` });
      return;
    }

    setSaving(true);
    let updateData = { registeredSubjects: selectedSubjects };
      if (/^(SS2|SS3)$/.test(currentStudent.className) && selectedStream) {
        updateData.className = `${currentStudent.className} ${selectedStream}`;
      }
      const result = await updateProfile(updateData);
    setSaving(false);
    
    if (result.success) {
      setSaveMessage({ type: 'success', text: 'Subjects successfully registered!' });
    } else {
      setSaveMessage({ type: 'error', text: result.message || 'Failed to save subjects.' });
    }
  };

  if (loadingConfig) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-50">
        <Loader2 size={40} className="animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 pb-24">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <BookOpen className="text-indigo-600" size={32} /> Subject Registration
            </h1>
            <p className="text-slate-500 mt-2">Select your 9 core and elective subjects for the academic session.</p>
          </div>
          <button 
            onClick={() => navigate('/students/dashboard')}
            className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors self-start md:self-auto"
          >
            Back to Dashboard
          </button>
        </div>

        {!isEnabled ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 mb-6">
              <Lock size={40} />
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-2">Portal Closed</h3>
            <p className="text-slate-500 max-w-md">The subject registration portal is currently closed. Please wait for the administrator to open it for the new session.</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 md:p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="text-lg font-black text-slate-800">Available Subjects</h4>
                <p className="text-sm text-slate-500 font-medium">
                  {currentStudent?.className === 'SS1'
                    ? 'Select your 9 subjects — this determines your Art or Science stream in SS2.'
                    : 'Select exactly 9 subjects for WAEC/NECO.'}
                </p>
              </div>
              <div className="bg-white px-6 py-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Selected</span>
                <span className={`text-2xl font-black ${selectedSubjects.length === 9 ? 'text-emerald-600' : 'text-slate-800'}`}>
                  {selectedSubjects.length}
                  <span className="text-slate-400 text-lg">/9</span>
                </span>
              </div>
            </div>

            <div className="p-6 md:p-8">
            {/* Pagination state */}
            {(() => {
              const subjectsPerPage = 10;
              const startIdx = currentPage * subjectsPerPage;
              const endIdx = startIdx + subjectsPerPage;
              const displayedSubjects = availableSubjects.slice(startIdx, endIdx);
              return (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {displayedSubjects.map((subject, idx) => {
                      const isSelected = selectedSubjects.includes(subject);
                      const isDisabled = !isSelected && selectedSubjects.length >= 9;
                      return (
                        <div
                          key={idx}
                          onClick={() => !isDisabled && toggleSubject(subject)}
                          className={`
                            relative flex items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer
                            ${isSelected 
                              ? 'border-indigo-600 bg-indigo-50/50 shadow-md shadow-indigo-100/50' 
                              : isDisabled 
                                ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                                : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50'
                            }
                          `}
                        >
                          <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-transparent'}`}
                          >
                            {isSelected && <CheckSquare size={16} />}
                          </div>
                          <span className="text-sm font-medium text-slate-800">{subject}</span>
                        </div>
                      );
                    })}
                  </div>
                  {/* Pagination controls */}
                  <div className="flex justify-center mt-4 space-x-2">
                    {currentPage > 0 && (
                      <button
                        onClick={() => setCurrentPage(prev => prev - 1)}
                        className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200"
                      >
                        Previous
                      </button>
                    )}
                    {endIdx < availableSubjects.length && (
                      <button
                        onClick={() => setCurrentPage(prev => prev + 1)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                      >
                        Next
                      </button>
                    )}
                  </div>
                </>
              );
            })()}
            </div>

            <div className="p-6 md:p-8 border-t border-slate-100 bg-slate-50/30 flex flex-col items-end gap-4">
              {saveMessage.text && (
                <div className={`flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-xl ${saveMessage.type === 'error' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {saveMessage.type === 'error' ? <AlertCircle size={16} /> : <CheckSquare size={16} />}
                  {saveMessage.text}
                </div>
              )}
              <button 
                onClick={handleSave}
                disabled={saving || selectedSubjects.length !== 9}
                className="px-8 py-4 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl font-black shadow-lg shadow-slate-200 hover:shadow-indigo-200 transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95 w-full md:w-auto justify-center"
              >
                {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                {saving ? 'Saving...' : 'Confirm Registration'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentSubjectRegistration;
