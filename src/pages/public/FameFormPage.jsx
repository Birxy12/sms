import React, { useState } from 'react';
import { db, storage } from '../../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useTheme } from '../../context/ThemeContext';
import { Loader2, Sparkles, Upload, CheckCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/MainFooter';
import './FameFormPage.css';

const FameFormPage = () => {
  const { schoolName, primaryColor } = useTheme();
  const navigate = useNavigate();

  // Form states
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [stateOfOrigin, setStateOfOrigin] = useState('');
  const [hobbies, setHobbies] = useState('');
  const [ambition, setAmbition] = useState('');
  const [contact, setContact] = useState('');
  const [studentClass, setStudentClass] = useState('Science');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');

  // Status states
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !dob || !stateOfOrigin || !hobbies || !ambition || !contact || !studentClass || !photoFile) {
      alert('Please fill out all fields and select a portrait photo.');
      return;
    }

    try {
      setSubmitting(true);

      // 1. Upload photo to Firebase Storage
      const fileExt = photoFile.name.split('.').pop();
      const fileName = `fame_portraits/${Date.now()}_${Math.random().toString(36).substring(2, 10)}.${fileExt}`;
      const storageRef = ref(storage, fileName);
      
      await uploadBytes(storageRef, photoFile);
      const downloadURL = await getDownloadURL(storageRef);

      // 2. Add to Firestore collection 'fame'
      const newGraduate = {
        name: name.trim(),
        dob,
        stateOfOrigin: stateOfOrigin.trim(),
        hobbies: hobbies.trim(),
        ambition: ambition.trim(),
        contact: contact.trim(),
        studentClass,
        photoUrl: downloadURL,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'fame'), newGraduate);
      setSubmitted(true);
    } catch (error) {
      console.error('Error submitting graduate info:', error);
      alert('Submission failed: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fame-form-page">
      <Navbar />

      <main className="ff-main">
        {!submitted ? (
          <div className="ff-container">
            {/* Header */}
            <div className="ff-header">
              <div className="ff-icon-wrap">
                <Sparkles size={24} style={{ color: primaryColor || '#ea580c' }} />
              </div>
              <h2>Graduates' Wall of Fame</h2>
              <p>Please fill out the form below to submit your graduating portrait and details for the SS3 gallery.</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="ff-form">
              <div className="ff-grid">
                
                {/* Photo Upload */}
                <div className="ff-group-full text-center">
                  <label className="ff-label">Upload Portrait Image *</label>
                  <div className="ff-upload-card">
                    <input 
                      type="file" 
                      id="student-photo" 
                      accept="image/*" 
                      required
                      onChange={handlePhotoChange} 
                      className="ff-file-input"
                    />
                    <label htmlFor="student-photo" className="ff-upload-label">
                      {photoPreview ? (
                        <div className="ff-preview-wrap">
                          <img src={photoPreview} alt="Preview" className="ff-img-preview" />
                          <span className="ff-change-text" style={{ color: primaryColor || '#ea580c' }}>Change Portrait</span>
                        </div>
                      ) : (
                        <div className="ff-prompt-wrap">
                          <Upload size={36} className="ff-upload-icon" />
                          <span className="ff-prompt-text">Choose Portrait Image</span>
                          <span className="ff-prompt-sub">Clear headshot, high resolution (JPG, PNG, WebP)</span>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                {/* Name */}
                <div className="ff-group">
                  <label className="ff-label">Full Name *</label>
                  <input
                    type="text" required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Johnathan Doe"
                    className="ff-input"
                  />
                </div>

                {/* DOB */}
                <div className="ff-group">
                  <label className="ff-label">Date of Birth *</label>
                  <input
                    type="date" required
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="ff-input"
                  />
                </div>

                {/* State of Origin */}
                <div className="ff-group">
                  <label className="ff-label">State of Origin *</label>
                  <input
                    type="text" required
                    value={stateOfOrigin}
                    onChange={(e) => setStateOfOrigin(e.target.value)}
                    placeholder="e.g. Oyo State"
                    className="ff-input"
                  />
                </div>

                {/* Class */}
                <div className="ff-group">
                  <label className="ff-label">Class Category *</label>
                  <select
                    value={studentClass}
                    onChange={(e) => setStudentClass(e.target.value)}
                    className="ff-select"
                  >
                    <option value="Science">Science Class</option>
                    <option value="Art">Art Class</option>
                  </select>
                </div>

                {/* Hobbies */}
                <div className="ff-group">
                  <label className="ff-label">Hobbies *</label>
                  <input
                    type="text" required
                    value={hobbies}
                    onChange={(e) => setHobbies(e.target.value)}
                    placeholder="e.g. Basketball, playing guitar, coding"
                    className="ff-input"
                  />
                </div>

                {/* Ambition */}
                <div className="ff-group">
                  <label className="ff-label">Future Ambition *</label>
                  <input
                    type="text" required
                    value={ambition}
                    onChange={(e) => setAmbition(e.target.value)}
                    placeholder="e.g. Medical Doctor"
                    className="ff-input"
                  />
                </div>

                {/* Contact */}
                <div className="ff-group-full">
                  <label className="ff-label">Contact Details (Email / Phone) *</label>
                  <input
                    type="text" required
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="e.g. myname@example.com / +234..."
                    className="ff-input"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="ff-submit-btn" 
                style={{ backgroundColor: primaryColor || '#ea580c' }}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="ff-spin animate-spin" size={18} style={{marginRight: '8px'}} />
                    <span>Submitting Profile...</span>
                  </>
                ) : (
                  <span>Submit Profile</span>
                )}
              </button>
            </form>
          </div>
        ) : (
          <div className="ff-success-container">
            <CheckCircle size={64} className="ff-success-icon" />
            <h2>Submission Successful!</h2>
            <p>Your details and portrait have been added to the graduates' Wall of Fame. Thank you for sharing your memories and goals!</p>
            <div className="ff-success-actions">
              <button 
                onClick={() => navigate('/fame')} 
                className="ff-view-fame-btn"
                style={{ backgroundColor: primaryColor || '#ea580c' }}
              >
                <span>View Wall of Fame</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default FameFormPage;
