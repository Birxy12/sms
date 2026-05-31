import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useTheme } from '../../context/ThemeContext';
import { BookOpen, Users, Award, Shield, ArrowRight, LogIn, Trophy, GraduationCap, User } from 'lucide-react';
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
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans">
      <Navbar />

      {/* HERO SECTION */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden mesh-bg">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="badge-premium mb-8">
                <Shield size={14} />
                Global Academic Excellence
              </div>

              <h1 className="text-5xl lg:text-7xl font-black text-slate-900 leading-[1.1] mb-8 uppercase tracking-tight">
                Architecting <br />
                <span className="text-gradient">The Future</span>
              </h1>

              <p className="text-xl text-slate-600 leading-relaxed mb-12 max-w-xl font-semibold">
                For over two decades, {schoolName} has been the cornerstone of elite education, 
                cultivating innovators and leaders who redefine the global landscape.
              </p>

              <div className="flex flex-wrap gap-4">
                <button onClick={() => navigate('/contact')} className="btn-glow flex items-center gap-3">
                  Executive Enquiry <ArrowRight size={18} />
                </button>
                <button onClick={() => navigate('/login')} className="px-8 py-4 rounded-xl bg-white border border-slate-200 text-slate-700 font-black text-sm uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm">
                  Portal Access
                </button>
              </div>
            </motion.div>

            <div className="grid grid-cols-1 gap-6">
              {stats.map((stat, idx) => (
                <motion.div
                  key={stat.id}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: idx * 0.15 }}
                  className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 hover:shadow-2xl transition-all group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-bl-[5rem] group-hover:scale-110 transition-transform duration-700"></div>
                  <div className="relative z-10 flex items-start gap-6">
                    <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 group-hover:rotate-12 transition-transform">
                      {stat.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-3 mb-2">
                        <span className="text-4xl font-black text-slate-900 tracking-tighter">{stat.value}</span>
                        <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{stat.label}</span>
                      </div>
                      <p className="text-sm font-bold text-slate-600 leading-relaxed uppercase tracking-tight">{stat.desc}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* IMAGE SHOWCASE */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { src: hero1, label: 'Elite Campus' },
              { src: hero2, label: 'Innovative Learning' },
              { src: hero3, label: 'Global Achievements' }
            ].map((img, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                className="group relative h-[400px] rounded-[3rem] overflow-hidden shadow-2xl"
              >
                <img src={img.src} alt={img.label} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity"></div>
                <div className="absolute bottom-8 left-8">
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-2">Portfolio</p>
                  <h3 className="text-2xl font-black text-white tracking-tight uppercase">{img.label}</h3>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* PRINCIPAL'S MESSAGE */}
      <section className="py-32 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="enterprise-card border-none bg-white shadow-premium"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
              <div className="lg:col-span-5">
                <div className="relative">
                  <div className="aspect-[4/5] rounded-[3rem] overflow-hidden shadow-2xl relative z-10">
                    {principal?.image ? (
                      <img src={principal.image} alt={principal.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                        <User size={120} className="text-slate-200" />
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-8 -right-8 w-48 h-48 bg-indigo-600 rounded-[3rem] -z-0 blur-2xl opacity-20"></div>
                </div>
              </div>

              <div className="lg:col-span-7">
                <div className="badge-premium mb-6">
                  <GraduationCap size={14} />
                  Chancellor's Address
                </div>
                <h2 className="text-4xl lg:text-5xl font-black text-slate-900 leading-tight mb-8 uppercase tracking-tighter">
                  The Pursuit of <br />
                  <span className="text-gradient">Absolute Excellence</span>
                </h2>
                <div className="relative mb-10">
                  <p className="text-xl font-bold text-slate-700 leading-relaxed italic">
                    "{principal?.message || "Our mission transcends traditional teaching. We engineer environments where intellectual curiosity meets unwavering discipline, fostering a global elite prepared for the challenges of tomorrow."}"
                  </p>
                </div>
                <div className="flex items-center gap-6 pt-8 border-t border-slate-50">
                   <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center font-black text-slate-600 text-2xl">
                    {(principal?.name || "P")[0]}
                   </div>
                   <div>
                    <p className="text-xl font-black text-slate-900 uppercase tracking-tighter">{principal?.name || "Dr. James Wilson"}</p>
                    <p className="text-xs font-black text-indigo-600 uppercase tracking-[0.2em]">Principal & Chief Administrator</p>
                   </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* MANAGEMENT TEAM */}
      <section className="py-32 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <div className="badge-premium mb-6">
              <Users size={14} />
              Elite Governance
            </div>
            <h2 className="text-4xl lg:text-5xl font-black text-slate-900 uppercase tracking-tighter mb-6">Executive Management</h2>
            <p className="text-slate-600 font-bold text-sm tracking-widest uppercase max-w-2xl mx-auto">
              Strategic leaders dedicated to maintaining world-class academic standards.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {teamToDisplay.map((member, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/40 hover:shadow-2xl transition-all group"
              >
                <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-3xl font-black text-indigo-600 mb-8 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-500">
                  {member.name[0]}
                </div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-2">{member.name}</h3>
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-6">{member.role}</p>
                <div className="h-px w-12 bg-slate-100 mb-6 group-hover:w-full transition-all duration-700"></div>
                <p className="text-sm font-medium text-slate-500 leading-relaxed">{member.bio}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTENT AREA */}
      <section className="py-32 px-6 bg-slate-50 relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
            <div className="lg:col-span-8">
              <div className="enterprise-card bg-white p-16">
                <div className="flex items-center gap-6 mb-12">
                  <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                    <BookOpen size={24} />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Strategic Heritage</h2>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Documenting two decades of evolution</p>
                  </div>
                </div>
                <div className="prose prose-slate max-w-none prose-headings:text-slate-900 prose-p:text-slate-600 prose-p:font-medium prose-p:leading-loose prose-strong:text-indigo-600" dangerouslySetInnerHTML={{ __html: content }} />
              </div>
            </div>

            <div className="lg:col-span-4 space-y-8">
              <div className="bg-slate-900 p-12 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-[5rem] group-hover:scale-125 transition-transform duration-700"></div>
                <h3 className="text-2xl font-black uppercase tracking-tighter mb-10">Enterprise Values</h3>
                <div className="space-y-10">
                  {[
                    { icon: BookOpen, title: 'Elite Academic', desc: 'Curriculum engineered for global challenges.' },
                    { icon: Users, title: 'Strategic Network', desc: 'A collective of future global leaders.' },
                    { icon: Award, title: 'Moral Integrity', desc: 'Developing character with uncompromising standards.' }
                  ].map((val, idx) => (
                    <div key={idx} className="flex gap-6">
                      <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
                        <val.icon size={20} className="text-indigo-400" />
                      </div>
                      <div>
                        <h4 className="font-black uppercase tracking-widest text-sm mb-2">{val.title}</h4>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-tight leading-relaxed">{val.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <motion.div 
                whileHover={{ scale: 1.02 }}
                onClick={() => navigate('/contact')}
                className="bg-indigo-600 p-12 rounded-[3rem] text-white shadow-2xl cursor-pointer relative overflow-hidden group"
              >
                <div className="absolute top-[-20%] left-[-20%] w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-700"></div>
                <Trophy size={40} className="mb-8 text-white/50" />
                <h3 className="text-3xl font-black uppercase tracking-tighter leading-tight mb-6">Forge Your <br />Future Today</h3>
                <p className="text-sm font-bold text-white/70 uppercase tracking-widest leading-relaxed mb-10">Limited enrollment slots for the 2026 academic cycle.</p>
                <div className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.3em] group-hover:gap-6 transition-all">
                  Join Elite <ArrowRight size={16} />
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default AboutPage;