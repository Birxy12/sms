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
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans mesh-bg">
      <Navbar />

      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="badge-premium mb-6">
              <Mail size={14} />
              Global Communications
            </div>
            <h1 className="text-5xl lg:text-7xl font-black text-slate-900 mb-8 uppercase tracking-tighter">
              Let's Start a <br />
              <span className="text-gradient">Conversation</span>
            </h1>
            <p className="text-xl text-slate-500 leading-relaxed max-w-2xl mx-auto font-medium">
              Connect with our administrative teams and academic leaders to discuss your future at {schoolName}.
            </p>
          </motion.div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-6 pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          {/* Info Sidebar */}
          <aside className="lg:col-span-4 space-y-6">
            {loading ? (
               <div className="h-[600px] bg-white rounded-[3rem] animate-pulse"></div>
            ) : (
              <>
                <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/40 group hover:shadow-2xl transition-all">
                  <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-8 group-hover:rotate-12 transition-transform">
                    <MapPin size={24} />
                  </div>
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Global Headquarters</h4>
                  <p className="text-xl font-black text-slate-800 tracking-tight leading-snug">{contactData?.address}</p>
                </div>

                <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl group">
                  <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-indigo-400 mb-8 group-hover:scale-110 transition-transform">
                    <Phone size={24} />
                  </div>
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Direct Hotline</h4>
                  <p className="text-xl font-black tracking-tight">{contactData?.phone}</p>
                </div>

                <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/40 group">
                  <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-8 group-hover:rotate-12 transition-transform">
                    <Mail size={24} />
                  </div>
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Digital Correspondence</h4>
                  <p className="text-xl font-black text-slate-800 tracking-tight">{contactData?.email}</p>
                </div>

                <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/40 group">
                  <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 mb-8 group-hover:rotate-12 transition-transform">
                    <Clock size={24} />
                  </div>
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Institutional Hours</h4>
                  <p className="text-xl font-black text-slate-800 tracking-tight">{contactData?.hours}</p>
                </div>
              </>
            )}
          </aside>

          {/* Contact Form */}
          <section className="lg:col-span-8">
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="enterprise-card bg-white p-12 lg:p-16"
            >
              <div className="mb-12">
                <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-4">Transmission Interface</h3>
                <p className="text-slate-400 font-bold text-sm tracking-widest uppercase">Secure digital communication for institutional inquiries.</p>
              </div>
              
              <form className="space-y-8" onSubmit={(e) => { e.preventDefault(); alert("Secure message transmitted successfully."); }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Full Legal Name</label>
                    <input type="text" placeholder="John Doe" className="input-premium" required />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Corporate Email</label>
                    <input type="email" placeholder="john@example.com" className="input-premium" required />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Inquiry Vector</label>
                  <select className="input-premium appearance-none">
                    <option>Strategic Admissions</option>
                    <option>Financial Consultation</option>
                    <option>Executive Support</option>
                    <option>Talent Acquisition</option>
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Detailed Briefing</label>
                  <textarea placeholder="Describe the nature of your inquiry with precision..." rows="6" className="input-premium" required></textarea>
                </div>

                <button type="submit" className="btn-glow w-full flex items-center justify-center gap-4 group">
                  <span className="text-sm font-black uppercase tracking-[0.2em]">Transmit Briefing</span>
                  <Send size={20} className="group-hover:translate-x-2 group-hover:-translate-y-1 transition-transform" />
                </button>
              </form>
            </motion.div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ContactPage;
