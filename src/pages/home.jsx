import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Star, LogIn, Users, Trophy, GraduationCap, Shield, BookOpen, Award, MapPin, Phone, Mail, ChevronRight, Quote, Sparkles } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { db } from '../lib/firebase';
import { doc, getDoc, collection, addDoc, query, where, getDocs, orderBy } from 'firebase/firestore';

import Navbar from '../components/Navbar';
import Footer from '../components/MainFooter';
import './home.css'; // Uses the same professional CSS

import h1 from '../assets/h1.jpg';
import h2 from '../assets/h2.jpg';
import h3 from '../assets/h3.png';

const AnimatedCounter = ({ end, suffix = '' }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 1000;
    const step = end / (duration / 16);
    const interval = setInterval(() => {
      start += step;
      if (start >= end) {
        setCount(end);
        clearInterval(interval);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(interval);
  }, [end]);

  return <span className="tabular-nums font-black">{count}{suffix}</span>;
};

const Home = () => {
  const navigate = useNavigate();
  const { schoolName } = useTheme();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [landingContent, setLandingContent] = useState({
    heroHeadline: 'Sowing the Seed of Greatness',
    heroSubtext: 'We nurture excellence, discipline, and innovation—raising a generation of leaders prepared for the future.',
    stats: [
      { label: 'Students', value: 500, suffix: '+', icon: <Users size={20} />, color: "bg-orange-50 text-orange-600", accent: "bg-orange-600" },
      { label: 'Success Rate', value: 98, suffix: '%', icon: <GraduationCap size={20} />, color: "bg-emerald-50 text-emerald-600", accent: "bg-emerald-600" },
      { label: 'Awards', value: 150, suffix: '+', icon: <Trophy size={20} />, color: "bg-indigo-50 text-indigo-600", accent: "bg-indigo-600" }
    ]
  });

  useEffect(() => {
    const fetchLanding = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'settings', 'public_content'));
        if (docSnap.exists()) {
          const data = docSnap.data().landingPage;
          if (data) {
            const icons = [<Users size={20} />, <GraduationCap size={20} />, <Trophy size={20} />];
            const colors = [
              { color: "bg-orange-50 text-orange-600", accent: "bg-orange-600" },
              { color: "bg-emerald-50 text-emerald-600", accent: "bg-emerald-600" },
              { color: "bg-indigo-50 text-indigo-600", accent: "bg-indigo-600" }
            ];
            setLandingContent({
              ...data,
              stats: data.stats.map((s, i) => ({ ...s, icon: icons[i % icons.length], ...colors[i % colors.length] }))
            });
          }
        }
      } catch (e) {
        console.error("Error fetching landing content:", e);
      }
    };
    fetchLanding();
  }, []);

  useEffect(() => {
    const total = (landingContent.heroImages && landingContent.heroImages.length > 0) 
      ? landingContent.heroImages.length 
      : 2;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % total);
    }, 4000);
    return () => clearInterval(timer);
  }, [landingContent.heroImages]);

  const stats = landingContent.stats;

  const features = [
    { icon: <BookOpen size={24} />, title: "Smart Learning", desc: "Modern and personalized education system that adapts to each student's unique learning style and pace.", color: "blue" },
    { icon: <Users size={24} />, title: "Expert Teachers", desc: "Highly qualified and experienced educators dedicated to mentoring the next generation of leaders.", color: "emerald" },
    { icon: <Shield size={24} />, title: "Safe Environment", desc: "Secure and student-friendly campus with state-of-the-art facilities and 24/7 security monitoring.", color: "amber" },
    { icon: <Award size={24} />, title: "Proven Excellence", desc: "Consistently ranked among top institutions with award-winning programs and outstanding results.", color: "indigo" }
  ];

  const [testimonials, setTestimonials] = useState([
    { name: "Blessing Okon", role: "Alumna, Class of 2023", content: "The discipline and academic rigor here shaped me into who I am today. I am forever grateful." },
    { name: "John David", role: "Alumnus, Class of 2022", content: "Best environment for learning. The teachers are true mentors and the facilities are world-class." },
    { name: "Sarah Mensah", role: "Parent", content: "Watching my child grow academically and morally has been the greatest joy. This school truly lives up to its promise." }
  ]);

  const [testimonyForm, setTestimonyForm] = useState({ name: '', email: '', content: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    const fetchTestimonies = async () => {
      try {
        const q = query(collection(db, 'testimonies'), where('approved', '==', true), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        if (!snap.empty) {
          setTestimonials(snap.docs.map(d => d.data()));
        }
      } catch (e) {
        console.error("Error fetching testimonies:", e);
      }
    };
    fetchTestimonies();
  }, []);

  const handleTestimonySubmit = async (e) => {
    e.preventDefault();
    if (!testimonyForm.name || !testimonyForm.content) return;
    
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'testimonies'), {
        ...testimonyForm,
        approved: false,
        createdAt: new Date().toISOString()
      });
      setSubmitSuccess(true);
      setTestimonyForm({ name: '', email: '', content: '' });
      setTimeout(() => setSubmitSuccess(false), 5000);
    } catch (e) {
      alert("Failed to submit testimony. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const quickLinks = [
    { label: 'About Us', href: '/about', icon: <BookOpen size={16} /> },
    { label: 'Admissions Info', href: '/contact', icon: <GraduationCap size={16} /> },
    { label: 'Contact', href: '/contact', icon: <Phone size={16} /> },
    { label: 'Portal Login', href: '/login', icon: <LogIn size={16} /> }
  ];

  return (
    <div className="home-page">
      <Navbar />

      {/* ============================================
          HERO SECTION - Uses home-hero classes
          ============================================ */}
      <section className="home-hero">
        <div className="home-hero-content">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            {/* Left: Text Content */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
            >
              <div className="home-hero-badge">
                <Sparkles size={14} />
                Welcome to {schoolName || 'Our School'}
              </div>

              <h1 className="home-hero-title">
                {landingContent.heroHeadline}
                <span className="home-hero-title-accent">Since 2002</span>
              </h1>

              <p className="home-hero-desc">
                {landingContent.heroSubtext}
              </p>

              <div className="home-hero-actions">
                <button onClick={() => navigate('/about')} className="home-btn-primary">
                  Learn More
                  <ArrowRight size={18} />
                </button>
                <button onClick={() => navigate('/login')} className="home-btn-secondary">
                  <LogIn size={18} />
                  Portal Login
                </button>
              </div>

              {/* Quick Links */}
              <div className="flex flex-wrap gap-3 mt-8">
                {quickLinks.map((link, idx) => (
                  <Link key={idx} to={link.href} className="home-quick-link">
                    {link.icon}
                    {link.label}
                  </Link>
                ))}
              </div>
            </motion.div>

            {/* Right: Hero Image Slider */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="relative"
            >
              <div className="home-hero-slider">
                <AnimatePresence mode="popLayout">
                  <motion.div
                    key={currentSlide}
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
                    className="absolute inset-0"
                  >
                    <img 
                      src={(landingContent.heroImages && landingContent.heroImages.length > 0) 
                        ? landingContent.heroImages[currentSlide % landingContent.heroImages.length] 
                        : [h1, h3][currentSlide % 2]}
                      alt={`Campus life ${currentSlide + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </motion.div>
                </AnimatePresence>
                <div className="home-hero-slider-overlay"></div>
                <div className="home-hero-slider-badge">
                  <div className="home-hero-slider-badge-icon">
                    <GraduationCap size={20} />
                  </div>
                  <div>
                    <div className="home-hero-slider-badge-title">Enrollment Open</div>
                    <div className="home-hero-slider-badge-subtitle">2026/2027 Academic Session</div>
                  </div>
                </div>
              </div>
              <div className="home-slider-indicators">
                {[0, 1].map((i) => (
                  <button key={i} onClick={() => setCurrentSlide(i)} className={`home-slider-dot ${currentSlide === i ? 'active' : ''}`} />
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ============================================
          STATS BAR - Floating Cards
          ============================================ */}
      <section className="home-showcase" style={{ marginTop: '-4rem' }}>
        <div className="home-stats-grid">
          {stats.map((s, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{ y: -8 }}
              className="home-stat-card"
            >
              <div className="home-stat-card-header" style={{ display: 'flex', alignItems: 'flex-start', gap: '1.25rem' }}>
                <div className={`home-stat-icon ${s.accent}`}>
                  {s.icon}
                </div>
                <div>
                  <p className="home-stat-value">
                    <AnimatedCounter end={s.value} suffix={s.suffix} />
                  </p>
                  <p className="home-stat-label">{s.label}</p>
                </div>
              </div>
              <div className="home-stat-desc">
                {i === 0 && "A diverse community of learners from various backgrounds and cultures."}
                {i === 1 && "Outstanding academic performance across all examination boards."}
                {i === 2 && "Recognition for excellence in academics, sports, and innovation."}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ============================================
          FEATURES SECTION
          ============================================ */}
      <section className="home-features" style={{ background: 'var(--color-slate-50)' }}>
        <div className="home-features-inner">
          <div className="home-section-header">
            <div className="home-section-badge">
              <Star size={14} />
              Why Choose Us
            </div>
            <h2 className="home-section-title">
              Building Excellence, <span style={{ color: 'var(--color-primary)' }}>Together</span>
            </h2>
            <p className="home-section-desc">
              At {schoolName || 'Our School'}, we believe every child deserves an education that inspires, challenges, and prepares them for a bright future.
            </p>
          </div>

          <div className="home-features-grid">
            {features.map((f, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                whileHover={{ y: -8 }}
                className="home-features-card"
              >
                <div className="home-features-card-accent"></div>
                <div className="home-features-card-body">
                  <div className={`home-feature-icon ${f.color}`}>
                    {f.icon}
                  </div>
                  <h3 className="home-features-name">{f.title}</h3>
                  <p className="home-features-bio">{f.desc}</p>
                  <div className="home-feature-link">
                    Learn More
                    <ChevronRight size={14} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================
          IMAGE SHOWCASE
          ============================================ */}
      <section className="home-showcase" style={{ background: '#ffffff' }}>
        <div className="home-features-inner">
          <div className="home-section-header">
            <div className="home-section-badge" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary-dark)' }}>
              <MapPin size={14} />
              Campus Life
            </div>
            <h2 className="home-section-title">
              Experience Our <span style={{ color: 'var(--color-primary)' }}>World</span>
            </h2>
            <p className="home-section-desc">
              Take a glimpse into the vibrant life and world-class facilities that make our school exceptional.
            </p>
          </div>
        </div>
        <div className="home-showcase-grid">
          {[
            { src: h1, label: 'Modern Classrooms' },
            { src: h2, label: 'Student Life' },
            { src: h3, label: 'Sports & Arts' }
          ].map((img, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: idx * 0.1 }}
              className="home-showcase-card"
            >
              <img src={img.src} alt={img.label} />
              <div className="home-showcase-overlay"></div>
              <div className="home-showcase-label">{img.label}</div>
              <div className="home-showcase-arrow">
                <ArrowRight size={16} />
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ============================================
          TESTIMONIALS SECTION
          ============================================ */}
      <section className="home-hero" style={{ padding: '6rem 0' }}>
        <div className="home-hero-content" style={{ paddingTop: '0', paddingBottom: '0' }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">

            {/* Left: Testimonials */}
            <div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <div className="home-hero-badge">
                  <Quote size={14} />
                  Voices of Excellence
                </div>
                <h2 className="home-hero-title" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>
                  What Our Community <span className="home-hero-title-accent">Says</span>
                </h2>
                <p className="home-hero-desc">
                  Hear from our students, parents, and alumni about their transformative experiences.
                </p>
              </motion.div>

              <div className="space-y-6">
                {testimonials.map((t, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.15 }}
                    className="home-testimonial-card"
                  >
                    <div className="home-testimonial-stars">
                      {[1,2,3,4,5].map(star => (
                        <Star key={star} size={14} className="text-orange-400 fill-orange-400" />
                      ))}
                    </div>
                    <p className="home-testimonial-text">"{t.content}"</p>
                    <div className="home-testimonial-author">
                      <div className="home-testimonial-avatar">
                        {t.name[0]}
                      </div>
                      <div>
                        <p className="home-testimonial-name">{t.name}</p>
                        <p className="home-testimonial-role">{t.role}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Right: Testimony Form */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="home-testimony-form">
                <div className="home-testimony-form-header">
                  <div className="home-testimony-form-icon">
                    <Sparkles size={20} />
                  </div>
                  <h3 className="home-testimony-form-title">Share Your Story</h3>
                </div>
                <p className="home-testimony-form-desc">
                  Have something to say about your experience? We'd love to hear from you.
                </p>

                <form className="space-y-5" onSubmit={handleTestimonySubmit}>
                  <div className="home-form-group">
                    <label className="home-form-label">Full Name</label>
                    <input 
                      type="text" 
                      placeholder="Your full name" 
                      className="home-form-input" 
                      value={testimonyForm.name}
                      onChange={e => setTestimonyForm({...testimonyForm, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="home-form-group">
                    <label className="home-form-label">Email Address</label>
                    <input 
                      type="email" 
                      placeholder="your@email.com" 
                      className="home-form-input" 
                      value={testimonyForm.email}
                      onChange={e => setTestimonyForm({...testimonyForm, email: e.target.value})}
                    />
                  </div>
                  <div className="home-form-group">
                    <label className="home-form-label">Your Testimony</label>
                    <textarea 
                      rows="4" 
                      placeholder="How has our school helped you?" 
                      className="home-form-textarea"
                      value={testimonyForm.content}
                      onChange={e => setTestimonyForm({...testimonyForm, content: e.target.value})}
                      required
                    ></textarea>
                  </div>
                  <button type="submit" disabled={submitting} className="home-form-submit">
                    {submitting ? 'Submitting...' : submitSuccess ? 'Submitted for Review!' : 'Submit Testimony'} 
                    {!submitting && !submitSuccess && <ArrowRight size={18} />}
                    {submitSuccess && <CheckCircle size={18} />}
                  </button>
                  <p className="home-form-note">All submissions are reviewed by management before publishing.</p>
                </form>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ============================================
          CTA SECTION
          ============================================ */}
      <section className="home-cta">
        <div className="home-cta-inner">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="home-cta-badge">
              <GraduationCap size={14} />
              Admissions Open
            </div>
            <h2 className="home-cta-title">
              Start Your Journey to <span className="home-cta-title-accent">Greatness</span>
            </h2>
            <p className="home-cta-desc">
              Join {schoolName || 'Our School'} and give your child the gift of world-class education. 
              Limited slots available for the upcoming academic session.
            </p>
            <div className="home-cta-actions">
              <button onClick={() => navigate('/about')} className="home-cta-btn-primary">
                Learn More <ArrowRight size={18} />
              </button>
              <button onClick={() => navigate('/contact')} className="home-cta-btn-secondary">
                <Phone size={18} />
                Contact Us
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============================================
          CONTACT BAR
          ============================================ */}
      <section className="home-contact-bar">
        <div className="home-contact-bar-inner">
          <div className="home-contact-grid">
            {[
              { icon: <Phone size={20} />, label: 'Call Us', value: '+234 800 123 4567', color: 'blue' },
              { icon: <Mail size={20} />, label: 'Email Us', value: 'info@school.edu.ng', color: 'emerald' },
              { icon: <MapPin size={20} />, label: 'Visit Us', value: '123 Education Lane, Lagos', color: 'orange' }
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="home-contact-card"
              >
                <div className={`home-contact-icon ${item.color}`}>
                  {item.icon}
                </div>
                <div>
                  <p className="home-contact-label">{item.label}</p>
                  <p className="home-contact-value">{item.value}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Home;