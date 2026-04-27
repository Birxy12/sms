import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useTheme } from '../../context/ThemeContext';
import { MapPin, Phone, Mail, Clock, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/MainFooter';
import './ContactPage.css';

const ContactPage = () => {
  const { schoolName, primaryColor } = useTheme();
  const [contactData, setContactData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const docRef = doc(db, 'settings', 'public_content');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().contactDetails) {
          setContactData(docSnap.data().contactDetails);
        } else {
          setContactData({
            address: '123 School Avenue, Digital City, ST 12345',
            phone: '+1 (234) 567-8900',
            email: 'hello@schoolportal.edu',
            hours: 'Mon - Fri: 8:00 AM - 4:00 PM'
          });
        }
      } catch (error) {
        console.error("Error fetching contact details:", error);
        setContactData({
          address: '123 School Avenue, Digital City, ST 12345',
          phone: '+1 (234) 567-8900',
          email: 'hello@schoolportal.edu',
          hours: 'Mon - Fri: 8:00 AM - 4:00 PM'
        });
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, []);

  const openStudentLogin = () => {
    navigate('/?login=student');
  };

  return (
    <div className="contact-page">
      <Navbar />

      <header className="contact-hero">
        <div className="hero-content">
          <h1>Let's Connect</h1>
          <p>Have questions about admissions, fees, or our programs? Our team is ready to provide the answers you need.</p>
        </div>
      </header>

      <main className="contact-grid">
        <aside className="info-sidebar">
          {loading ? (
             <div className="info-card animate-pulse" style={{ height: '300px' }}></div>
          ) : (
            <>
              <div className="info-card">
                <div className="icon-wrapper" style={{ backgroundColor: '#eef2ff' }}>
                  <MapPin className="text-indigo-600" />
                </div>
                <h4>Our Campus</h4>
                <p>{contactData?.address}</p>
              </div>

              <div className="info-card">
                <div className="icon-wrapper" style={{ backgroundColor: '#ecfdf5' }}>
                  <Phone className="text-emerald-600" />
                </div>
                <h4>Direct Contact</h4>
                <p>{contactData?.phone}</p>
              </div>

              <div className="info-card">
                <div className="icon-wrapper" style={{ backgroundColor: '#eff6ff' }}>
                  <Mail className="text-blue-600" />
                </div>
                <h4>Email Support</h4>
                <p>{contactData?.email}</p>
              </div>

              <div className="info-card">
                <div className="icon-wrapper" style={{ backgroundColor: '#fffbeb' }}>
                  <Clock className="text-amber-600" />
                </div>
                <h4>Office Hours</h4>
                <p>{contactData?.hours}</p>
              </div>
            </>
          )}
        </aside>

        <section className="contact-form-container">
          <div className="form-header">
            <h3>Send a Message</h3>
            <p>Fill out the form below and we'll reach out within 24 hours.</p>
          </div>
          
          <form className="contact-form" onSubmit={(e) => { e.preventDefault(); alert("Message sent successfully!"); }}>
            <div className="input-row">
              <div className="input-group">
                <label>Full Name</label>
                <input type="text" placeholder="John Doe" required />
              </div>
              <div className="input-group">
                <label>Email Address</label>
                <input type="email" placeholder="john@example.com" required />
              </div>
            </div>

            <div className="input-group">
              <label>Inquiry Subject</label>
              <select>
                <option>Admissions Inquiry</option>
                <option>Tuition & Fees</option>
                <option>General Support</option>
                <option>Careers</option>
              </select>
            </div>

            <div className="input-group">
              <label>Your Message</label>
              <textarea placeholder="Describe how we can help you..." rows="5" required></textarea>
            </div>

            <button type="submit" className="submit-btn" style={{ background: primaryColor }}>
              <Send size={18} /> Send Message
            </button>
          </form>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default ContactPage;
