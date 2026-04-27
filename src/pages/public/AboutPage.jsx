import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useTheme } from '../../context/ThemeContext';
import { BookOpen, Users, Award, Shield, ArrowRight, LogIn, Trophy, GraduationCap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '../../components/Navbar';
import Footer from '../../components/MainFooter';
import hero1 from '../../assets/h1.jpg';
import hero2 from '../../assets/h2.jpg';
import hero3 from '../../assets/h3.png';
import './AboutPage.css'; // Import the professional styles

const AboutPage = () => {
  const { schoolName } = useTheme();
  const [content, setContent] = useState('');
  const [managementTeam, setManagementTeam] = useState([]);
  const [principal, setPrincipal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeHeroTab, setActiveHeroTab] = useState('story');
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
          setContent(`
            <h3>Our History</h3>
            <p>${schoolName} was founded with a vision to provide exceptional education...</p>
          `);
        }
      } catch (error) {
        console.error("Error fetching about content:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, [schoolName]);

  const stats = [
    { 
      id: 'story', 
      label: 'Students', 
      value: '500+',
      icon: <Users size={20} />,
      desc: `Since our inception, we have been home to over 500+ brilliant students.`
    },
    { 
      id: 'mission', 
      label: 'Success', 
      value: '98%',
      icon: <GraduationCap size={20} />,
      desc: 'With a 98% success rate, we provide a transformative education.'
    },
    { 
      id: 'vision', 
      label: 'Awards', 
      value: '150+',
      icon: <Trophy size={20} />,
      desc: 'Recognized with over 150+ awards for academic and moral excellence.'
    }
  ];

  const defaultTeam = [
    { name: "Dr. James Wilson", role: "Principal / Founder", bio: "Over 25 years of experience in educational administration." },
    { name: "Mrs. Sarah Adams", role: "Vice Principal (Admin)", bio: "Dedicated to maintaining the highest standards of discipline." },
    { name: "Mr. Robert Chen", role: "Head of Academics", bio: "Leading our curriculum innovation programs." },
    { name: "Mrs. Linda Okafor", role: "Bursar", bio: "Managing school resources for sustainable growth." }
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
    <div className="about-page">
      <Navbar />

      {/* HERO SECTION */}
      <section className="about-hero">
        <div className="about-hero-content">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="about-hero-badge">
                  <Shield size={14} />
                  About {schoolName}
                </div>

                <h1 className="about-hero-title">
                  Shaping Tomorrow's
                  <span className="about-hero-title-accent">Leaders Today</span>
                </h1>

                <p className="about-hero-desc">
                  For over two decades, {schoolName} has been at the forefront of educational excellence, 
                  nurturing young minds and building a community of lifelong learners.
                </p>

                <div className="about-hero-actions">
                  <button onClick={() => navigate('/contact')} className="about-btn-primary">
                    Enquire Now
                    <ArrowRight size={18} />
                  </button>
                  <button onClick={() => navigate('/login')} className="about-btn-secondary">
                    <LogIn size={18} />
                    Portal Login
                  </button>
                </div>
              </motion.div>
            </div>

            <div className="about-hero-stats">
              {stats.map((stat, idx) => (
                <motion.div
                  key={stat.id}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: idx * 0.15 }}
                  onClick={() => setActiveHeroTab(stat.id)}
                  className={`about-stat-card ${activeHeroTab === stat.id ? 'active' : ''}`}
                >
                  <div className="about-stat-icon">
                    {stat.icon}
                  </div>
                  <div className="about-stat-content">
                    <div className="flex items-baseline gap-3">
                      <span className="about-stat-value">{stat.value}</span>
                      <span className="about-stat-label">{stat.label}</span>
                    </div>
                    <p className="about-stat-desc">{stat.desc}</p>
                  </div>
                  <div className="about-stat-arrow">
                    <ArrowRight size={14} />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* IMAGE SHOWCASE */}
      <section className="about-showcase">
        <div className="about-showcase-grid">
          {[
            { src: hero1, label: 'Campus Life' },
            { src: hero2, label: 'Student Activities' },
            { src: hero3, label: 'Academic Excellence' }
          ].map((img, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: idx * 0.1 }}
              className="about-showcase-card"
            >
              <img src={img.src} alt={img.label} />
              <div className="about-showcase-overlay"></div>
              <div className="about-showcase-label">{img.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* PRINCIPAL'S MESSAGE */}
      <section className="about-principal">
        <div className="about-principal-inner">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="about-principal-card"
          >
            <div className="about-principal-grid">
              <div className="about-principal-image">
                {principal?.image ? (
                  <img src={principal.image} alt={principal.name} />
                ) : (
                  <div className="about-principal-image-placeholder">
                    <div className="about-principal-avatar">
                      {(principal?.name || "P")[0]}
                    </div>
                  </div>
                )}
                <div className="about-principal-image-overlay">
                  <div className="name">{principal?.name || "Dr. James Wilson"}</div>
                  <div className="role">Principal</div>
                </div>
              </div>

              <div className="about-principal-content">
                <div className="about-principal-badge">
                  <GraduationCap size={14} />
                  Office of the Principal
                </div>
                <h2 className="about-principal-title">
                  A Message to Our <br />
                  <span className="about-principal-title-accent">Community</span>
                </h2>
                <div className="about-principal-quote">
                  <p>{principal?.message || "Welcome to our esteemed institution. We are committed to fostering an environment where every student can achieve their full potential through academic excellence and character development."}</p>
                </div>
                <div className="about-principal-footer">
                  <div className="about-principal-footer-icon">
                    <Award size={20} />
                  </div>
                  <div>
                    <div className="about-principal-footer-title">Excellence in Education</div>
                    <div className="about-principal-footer-desc">Committed to the highest standards</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* MANAGEMENT TEAM */}
      <section className="about-team">
        <div className="about-team-inner">
          <div className="about-section-header">
            <div className="about-section-badge">
              <Users size={14} />
              Leadership
            </div>
            <h2 className="about-section-title">The Management Team</h2>
            <p className="about-section-desc">
              A dedicated group of educators and professionals committed to the success of every student at {schoolName}.
            </p>
          </div>

          <div className="about-team-grid">
            {teamToDisplay.map((member, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="about-team-card"
              >
                <div className="about-team-card-accent"></div>
                <div className="about-team-card-body">
                  <div className="about-team-avatar">
                    {member.name[0]}
                  </div>
                  <div className="about-team-name">{member.name}</div>
                  <div className="about-team-role">{member.role}</div>
                  <div className="about-team-divider"></div>
                  <p className="about-team-bio">{member.bio}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTENT AREA */}
      <section className="about-content">
        <div className="about-content-grid">
          <div className="about-content-main">
            <div className="about-content-header">
              <div className="about-content-header-icon">
                <BookOpen size={18} />
              </div>
              <div>
                <h2 className="about-content-header-title">About Our Institution</h2>
                <p className="about-content-header-subtitle">Our story, values, and commitment</p>
              </div>
            </div>
            <div className="about-prose" dangerouslySetInnerHTML={{ __html: content }} />
          </div>

          <aside className="about-sidebar">
            <div className="about-values-card">
              <div className="about-values-header">
                <div className="about-values-header-icon">
                  <Shield size={18} />
                </div>
                <h3 className="about-values-header-title">Core Values</h3>
              </div>
              <div className="about-values-list">
                {[
                  { icon: BookOpen, color: 'blue', title: 'Academic Excellence', desc: 'Rigorous curriculum designed to challenge.' },
                  { icon: Users, color: 'emerald', title: 'Inclusive Community', desc: 'A welcoming environment where every student belongs.' },
                  { icon: Award, color: 'amber', title: 'Character Development', desc: 'Instilling integrity and leadership for life.' }
                ].map((val, idx) => (
                  <div key={idx} className="about-value-item">
                    <div className={`about-value-icon ${val.color}`}>
                      <val.icon size={18} />
                    </div>
                    <div>
                      <div className="about-value-title">{val.title}</div>
                      <p className="about-value-desc">{val.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="about-cta-card" onClick={() => navigate('/contact')}>
              <div className="about-cta-icon">
                <Trophy size={24} />
              </div>
              <h3 className="about-cta-title">Join Our Community</h3>
              <p className="about-cta-desc">Admissions are currently open. Secure your child's future today.</p>
              <button className="about-cta-btn">Contact Admissions</button>
            </div>

            <div className="about-facts-card">
              <h3 className="about-facts-title">Quick Facts</h3>
              <div className="about-facts-list">
                {[
                  { label: 'Founded', value: '2002' },
                  { label: 'Students', value: '500+' },
                  { label: 'Staff', value: '75+' },
                  { label: 'Awards', value: '150+' }
                ].map((fact, idx) => (
                  <div key={idx} className="about-fact-item">
                    <span className="about-fact-label">{fact.label}</span>
                    <span className="about-fact-value">{fact.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default AboutPage;