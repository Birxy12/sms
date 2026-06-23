import React, { useState, useEffect } from 'react';
import { db, storage } from '../../lib/firebase';
import { collection, query, orderBy, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useTheme } from '../../context/ThemeContext';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { 
  Loader2, Plus, Trash2, X, Award, Sparkles, 
  User, Calendar, MapPin, Heart, Target, Phone, BookOpen, Upload
} from 'lucide-react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/MainFooter';
import './FamePage.css';

const FamePage = () => {
  const { schoolName, primaryColor } = useTheme();
  const { currentAdmin } = useAdminAuth();
  
  const [graduates, setGraduates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterClass, setFilterClass] = useState('All');
  
  // Modal state for Admin adding new graduates
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form fields
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [stateOfOrigin, setStateOfOrigin] = useState('');
  const [hobbies, setHobbies] = useState('');
  const [ambition, setAmbition] = useState('');
  const [contact, setContact] = useState('');
  const [studentClass, setStudentClass] = useState('Science');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');

  const isAdmin = currentAdmin?.role === 'admin';

  const fetchGraduates = async () => {
    try {
      setLoading(true);
      const fameQuery = query(collection(db, 'fame'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(fameQuery);
      const list = [];
      querySnapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setGraduates(list);
    } catch (error) {
      console.error('Error fetching graduates:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraduates();
  }, []);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleAddGraduate = async (e) => {
    e.preventDefault();
    if (!name || !dob || !stateOfOrigin || !hobbies || !ambition || !contact || !studentClass || !photoFile) {
      alert('Please fill out all fields and select a portrait image.');
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
      
      // 3. Reset form and refresh list
      setName('');
      setDob('');
      setStateOfOrigin('');
      setHobbies('');
      setAmbition('');
      setContact('');
      setStudentClass('Science');
      setPhotoFile(null);
      setPhotoPreview('');
      setShowAddModal(false);
      
      // Fetch fresh list
      await fetchGraduates();
      alert('SS3 graduating student portrait added successfully!');
    } catch (error) {
      console.error('Error adding graduating student:', error);
      alert('Failed to save details: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to remove this graduating student portrait?')) {
      try {
        await deleteDoc(doc(db, 'fame', id));
        setGraduates(graduates.filter(g => g.id !== id));
        alert('Portrait deleted successfully.');
      } catch (error) {
        console.error('Error deleting graduate:', error);
        alert('Failed to delete portrait.');
      }
    }
  };

  // Filter graduates based on selected class
  const filteredGraduates = graduates.filter(g => {
    if (filterClass === 'All') return true;
    return g.studentClass === filterClass;
  });

  return (
    <div className="fame-page">
      <Navbar />
      
      {/* Hero Header */}
      <header className="fame-hero">
        <div className="fame-hero-inner">
          <div className="fame-hero-badge">
            <Award size={14} />
            SS3 Graduating Class Gallery
          </div>
          <h1 className="fame-hero-title">
            WALL OF <span style={{ color: primaryColor || '#ea580c' }}>FAME</span>
          </h1>
          <p className="fame-hero-desc">
            Honoring the class of graduating students of {schoolName || 'our academy'}. Explore their profiles, dreams, and memories.
          </p>

          <div className="fame-hero-controls">
            {/* Filter buttons */}
            <div className="fame-filters">
              {['All', 'Science', 'Art'].map(cls => (
                <button
                  key={cls}
                  onClick={() => setFilterClass(cls)}
                  className={`fame-filter-btn ${filterClass === cls ? 'active' : ''}`}
                  style={filterClass === cls ? { backgroundColor: primaryColor || '#ea580c' } : {}}
                >
                  {cls} Class
                </button>
              ))}
            </div>

            {/* Admin Add button */}
            {isAdmin && (
              <button 
                onClick={() => setShowAddModal(true)} 
                className="fame-add-btn"
                style={{ borderColor: primaryColor || '#ea580c' }}
              >
                <Plus size={16} />
                <span>Add SS3 Graduate</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Gallery Grid */}
      <main className="fame-main">
        {loading ? (
          <div className="fame-loading">
            <Loader2 className="fame-spin" size={40} />
            <p>Polishing the frames...</p>
          </div>
        ) : filteredGraduates.length > 0 ? (
          <div className="fame-grid">
            {filteredGraduates.map((grad) => (
              <div key={grad.id} className="fame-card">
                {/* Admin Delete Action */}
                {isAdmin && (
                  <button 
                    onClick={() => handleDelete(grad.id)} 
                    className="fame-card-delete"
                    title="Remove Portrait"
                  >
                    <Trash2 size={16} />
                  </button>
                )}

                {/* Class Badge */}
                <span className={`fame-card-badge ${grad.studentClass?.toLowerCase()}`}>
                  {grad.studentClass}
                </span>

                {/* Portrait Picture */}
                <div className="fame-card-photo-wrapper">
                  {grad.photoUrl ? (
                    <img 
                      src={grad.photoUrl} 
                      alt={grad.name} 
                      className="fame-card-photo" 
                      loading="lazy"
                    />
                  ) : (
                    <div className="fame-card-photo-placeholder">
                      <User size={48} />
                    </div>
                  )}
                </div>

                {/* Portrait Details */}
                <div className="fame-card-details">
                  <h3 className="fame-card-name" title={grad.name}>{grad.name}</h3>
                  
                  <div className="fame-card-info-list">
                    <div className="fame-info-item">
                      <Calendar size={13} className="fame-info-icon" />
                      <span className="fame-info-label">D.O.B:</span>
                      <span className="fame-info-val">
                        {grad.dob ? new Date(grad.dob).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'}) : 'N/A'}
                      </span>
                    </div>

                    <div className="fame-info-item">
                      <MapPin size={13} className="fame-info-icon" />
                      <span className="fame-info-label">Origin:</span>
                      <span className="fame-info-val" title={grad.stateOfOrigin}>{grad.stateOfOrigin}</span>
                    </div>

                    <div className="fame-info-item">
                      <Heart size={13} className="fame-info-icon" />
                      <span className="fame-info-label">Hobbies:</span>
                      <span className="fame-info-val" title={grad.hobbies}>{grad.hobbies}</span>
                    </div>

                    <div className="fame-info-item">
                      <Target size={13} className="fame-info-icon" />
                      <span className="fame-info-label">Ambition:</span>
                      <span className="fame-info-val" title={grad.ambition}>{grad.ambition}</span>
                    </div>

                    <div className="fame-info-item">
                      <Phone size={13} className="fame-info-icon" />
                      <span className="fame-info-label">Contact:</span>
                      <span className="fame-info-val" title={grad.contact}>{grad.contact}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="fame-empty">
            <Sparkles size={56} style={{ color: primaryColor || '#ea580c' }} />
            <h2>No Graduating Portraits Yet</h2>
            <p>SS3 graduating students' portraits will display here once added by the administration or submitted by students.</p>
          </div>
        )}
      </main>

      {/* Admin Form Modal */}
      {showAddModal && (
        <div className="fame-modal-backdrop">
          <div className="fame-modal">
            <div className="fame-modal-header" style={{ borderBottomColor: primaryColor || '#ea580c' }}>
              <h3>Add SS3 Graduating Student</h3>
              <button onClick={() => setShowAddModal(false)} className="fame-modal-close">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAddGraduate} className="fame-modal-form">
              <div className="form-grid">
                
                {/* Image Upload Area */}
                <div className="form-group-full text-center">
                  <label className="fame-label">Portrait Image *</label>
                  <div className="fame-upload-container">
                    <input 
                      type="file" 
                      id="fame-photo" 
                      accept="image/*" 
                      required
                      onChange={handlePhotoChange} 
                      className="fame-file-input"
                    />
                    <label htmlFor="fame-photo" className="fame-upload-label">
                      {photoPreview ? (
                        <div className="fame-upload-preview">
                          <img src={photoPreview} alt="Preview" />
                          <span className="fame-upload-change">Change Photo</span>
                        </div>
                      ) : (
                        <div className="fame-upload-prompt">
                          <Upload size={32} />
                          <span>Select Portrait Photo</span>
                          <span className="fame-upload-sub text-xs">JPG, PNG, WebP format</span>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label className="fame-label">Full Name *</label>
                  <input
                    type="text" required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="fame-input"
                  />
                </div>

                <div className="form-group">
                  <label className="fame-label">Date of Birth *</label>
                  <input
                    type="date" required
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="fame-input"
                  />
                </div>

                <div className="form-group">
                  <label className="fame-label">State of Origin *</label>
                  <input
                    type="text" required
                    value={stateOfOrigin}
                    onChange={(e) => setStateOfOrigin(e.target.value)}
                    placeholder="e.g. Lagos State"
                    className="fame-input"
                  />
                </div>

                <div className="form-group">
                  <label className="fame-label">Class Category *</label>
                  <select
                    value={studentClass}
                    onChange={(e) => setStudentClass(e.target.value)}
                    className="fame-select"
                  >
                    <option value="Science">Science Class</option>
                    <option value="Art">Art Class</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="fame-label">Hobbies *</label>
                  <input
                    type="text" required
                    value={hobbies}
                    onChange={(e) => setHobbies(e.target.value)}
                    placeholder="e.g. Reading, Chess, Football"
                    className="fame-input"
                  />
                </div>

                <div className="form-group">
                  <label className="fame-label">Ambition *</label>
                  <input
                    type="text" required
                    value={ambition}
                    onChange={(e) => setAmbition(e.target.value)}
                    placeholder="e.g. Software Engineer"
                    className="fame-input"
                  />
                </div>

                <div className="form-group-full">
                  <label className="fame-label">Contact Details *</label>
                  <input
                    type="text" required
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="e.g. email@example.com / +234..."
                    className="fame-input"
                  />
                </div>
              </div>

              <div className="fame-modal-footer">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)} 
                  className="fame-cancel-btn"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="fame-submit-btn" 
                  style={{ backgroundColor: primaryColor || '#ea580c' }}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="fame-spin-small animate-spin" size={16} style={{marginRight: '8px'}} />
                      <span>Saving Portrait...</span>
                    </>
                  ) : (
                    <span>Add Graduate</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default FamePage;
