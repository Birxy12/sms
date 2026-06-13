import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useTheme } from '../../context/ThemeContext';
import { BookOpen, Users, Award, Shield, ArrowRight, Trophy, GraduationCap, User, Star, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '../../components/Navbar';
import Footer from '../../components/MainFooter';
import hero1 from '../../assets/h1.jpg';
import hero2 from '../../assets/h2.jpg';
import hero3 from '../../assets/h3.png';
import './AboutPage.css';

const fadeUp = { hidden: { opacity: 0, y: 32 }, show: { opacity: 1, y: 0 } };
const fadeLeft = { hidden: { opacity: 0, x: -32 }, show: { opacity: 1, x: 0 } };
const fadeRight = { hidden: { opacity: 0, x: 32 }, show: { opacity: 1, x: 0 } };

const AboutPage = () => {
  const { schoolName } = useTheme();
  const [content, setContent] = useState('');
  const [managementTeam, setManagementTeam] = useState([]);
  const [principal, setPrincipal] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const docRef = doc(db, 'settings', 'public_content');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.aboutHtml) setContent(data.aboutHtml);
          if (data.managementTeam) setManagementTeam(data.managementTeam);
          if (data.principalData) setPrincipal(data.principalData);
        } else {
          setContent(`<p>${schoolName} was founded with a vision to provide exceptional education, cultivating leaders and innovators who shape the world.</p>`);
        }
      } catch (error) {
        console.error('Error fetching about content:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, [schoolName]);

  const stats = [
    { label: 'Students Enrolled', value: '500+', icon: <Users size={22} />, desc: 'Brilliant minds from across the region calling this institution home.' },
    { label: 'Success Rate', value: '98%', icon: <GraduationCap size={22} />, desc: 'Transformative education that propels students to academic heights.' },
    { label: 'Awards Won', value: '150+', icon: <Trophy size={22} />, desc: 'Recognized for academic excellence, discipline and innovation.' },
  ];

  const defaultTeam = [
    { name: 'Dr. James Wilson', role: 'Principal / Founder', bio: 'Over 25 years of experience in educational leadership and administration.' },
    { name: 'Mrs. Sarah Adams', role: 'Vice Principal (Admin)', bio: 'Dedicated to maintaining the highest standards of academic discipline.' },
    { name: 'Mr. Robert Chen', role: 'Head of Academics', bio: 'Leading curriculum innovation for the challenges of tomorrow.' },
    { name: 'Mrs. Linda Okafor', role: 'Bursar', bio: 'Managing school resources with excellence and transparency.' },
  ];

  const teamToDisplay = managementTeam.length > 0 ? managementTeam : defaultTeam;

  if (loading) {
    return (
      <div className="about-loading">
        <div className="about-loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="about-page-root">
      <Navbar />

      {/* ── HERO ── */}
      <section className="about-hero">
        <div className="about-hero-content">
          <div className="about-hero-grid">
            <motion.div
              variants={fadeLeft}
              initial="hidden"
              animate="show"
              transition={{ duration: 0.7 }}
              className="about-hero-left"
            >
              <div className="about-hero-badge">
                <Shield size={14} />
                Global Academic Excellence
              </div>
              <h1 className="about-hero-title">
                Architecting<br />
                <span className="about-hero-title-accent">The Future</span>
              </h1>
              <p className="about-hero-desc">
                For over two decades, {schoolName || 'Bright Day School'} has been the cornerstone of elite education,
                cultivating innovators and leaders who redefine the global landscape.
              </p>
              <div className="about-hero-actions">
                <button onClick={() => navigate('/contact')} className="about-btn-primary">
                  Executive Enquiry <ArrowRight size={16} />
                </button>
                <button onClick={() => navigate('/login')} className="about-btn-secondary">
                  Portal Access
                </button>
              </div>
            </motion.div>

            <div className="about-hero-stats">
              {stats.map((stat, idx) => (
                <motion.div
                  key={idx}
                  variants={fadeRight}
                  initial="hidden"
                  animate="show"
                  transition={{ duration: 0.5, delay: idx * 0.15 }}
                  className="about-stat-card"
                >
                  <div className="about-stat-icon">{stat.icon}</div>
                  <div className="about-stat-content">
                    <div className="about-stat-value">{stat.value}</div>
                    <div className="about-stat-label">{stat.label}</div>
                    <p className="about-stat-desc">{stat.desc}</p>
                  </div>
                  <div className="about-stat-arrow"><ChevronRight size={16} /></div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── IMAGE SHOWCASE ── */}
      <section className="about-showcase-section">
        <div className="about-showcase">
          <div className="about-showcase-grid">
            {[
              { src: hero1, label: 'Elite Campus' },
              { src: hero2, label: 'Innovative Learning' },
              { src: hero3, label: 'Global Achievements' },
            ].map((img, idx) => (
              <motion.div
                key={idx}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                className="about-showcase-card"
              >
                <img src={img.src} alt={img.label} />
                <div className="about-showcase-overlay" />
                <div className="about-showcase-label">{img.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRINCIPAL'S MESSAGE ── */}
      <section className="about-principal">
        <div className="about-principal-inner">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="about-principal-card"
          >
            <div className="about-principal-grid">
              <div className="about-principal-image">
                <img src={principal?.image || '/principal.png'} alt={principal?.name || 'MRS. ETUZU ANITA'} className="w-full h-full object-cover" />
                <div className="about-principal-image-overlay">
                  <p className="name">{principal?.name || 'MRS. ETUZU ANITA'}</p>
                  <p className="role">Principal &amp; Chief Administrator</p>
                </div>
              </div>

              <div className="about-principal-content">
                <div className="about-principal-badge">
                  <GraduationCap size={14} />
                  Chancellor's Address
                </div>
                <h2 className="about-principal-title">
                  The Pursuit of<br />
                  <span className="about-principal-title-accent">Absolute Excellence</span>
                </h2>
                <div className="about-principal-quote">
                  <p>{principal?.message || 'Our mission transcends traditional teaching. We engineer environments where intellectual curiosity meets unwavering discipline, fostering a global elite prepared for the challenges of tomorrow.'}</p>
                </div>
                <div className="about-principal-footer">
                  <div className="about-principal-footer-icon">
                    <Star size={20} />
                  </div>
                  <div>
                    <p className="about-principal-footer-title">{principal?.name || 'MRS. ETUZU ANITA'}</p>
                    <p className="about-principal-footer-desc">Principal &amp; Chief Administrator</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── MANAGEMENT TEAM ── */}
      <section className="about-team">
        <div className="about-team-inner">
          <div className="about-section-header">
            <div className="about-section-badge">
              <Users size={14} />
              Elite Governance
            </div>
            <h2 className="about-section-title">Executive Management</h2>
            <p className="about-section-desc">
              Strategic leaders dedicated to maintaining world-class academic standards.
            </p>
          </div>

          <div className="about-team-grid">
            {teamToDisplay.map((member, idx) => (
              <motion.div
                key={idx}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                transition={{ delay: idx * 0.08 }}
                className="about-team-card"
              >
                <div className="about-team-card-accent" />
                <div className="about-team-card-body">
                  <div className="about-team-avatar">{member.name[0]}</div>
                  <h3 className="about-team-name">{member.name}</h3>
                  <p className="about-team-role">{member.role}</p>
                  <div className="about-team-divider" />
                  <p className="about-team-bio">{member.bio}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTENT + SIDEBAR ── */}
      <div className="about-content">
        <div className="about-content-grid">
          {/* Main prose */}
          <div>
            <div className="about-content-header">
              <div className="about-content-header-icon"><BookOpen size={20} /></div>
              <div>
                <h2 className="about-content-header-title">Strategic Heritage</h2>
                <p className="about-content-header-subtitle">Documenting two decades of evolution</p>
              </div>
            </div>
            <div
              className="about-prose"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          </div>

          {/* Sidebar */}
          <div className="about-sidebar">
            {/* Values card */}
            <div className="about-values-card">
              <h3 className="about-values-title">Enterprise Values</h3>
              <div className="about-values-list">
                {[
                  { icon: <BookOpen size={18} />, title: 'Elite Academic', desc: 'Curriculum engineered for global challenges.' },
                  { icon: <Users size={18} />, title: 'Strategic Network', desc: 'A collective of future global leaders.' },
                  { icon: <Award size={18} />, title: 'Moral Integrity', desc: 'Character developed with uncompromising standards.' },
                ].map((val, idx) => (
                  <div key={idx} className="about-value-item">
                    <div className="about-value-icon">{val.icon}</div>
                    <div>
                      <h4 className="about-value-title">{val.title}</h4>
                      <p className="about-value-desc">{val.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA card */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              onClick={() => navigate('/contact')}
              className="about-cta-card"
            >
              <Trophy size={36} className="about-cta-icon" />
              <h3 className="about-cta-title">Forge Your<br />Future Today</h3>
              <p className="about-cta-desc">Limited enrollment slots for the 2026 academic cycle.</p>
              <div className="about-cta-link">
                Join Elite <ArrowRight size={14} />
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default AboutPage;