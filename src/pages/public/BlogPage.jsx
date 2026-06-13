import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { db } from '../../lib/firebase';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { useTheme } from '../../context/ThemeContext';
import { Calendar, User, ChevronRight, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/MainFooter';

const BlogPage = () => {
  const { schoolName, primaryColor } = useTheme();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const fetchedPosts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPosts(fetchedPosts);
      } catch (error) {
        console.error("Error fetching posts:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans mesh-bg">
      <Navbar />

      {/* Header */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="badge-premium mb-6">
              <FileText size={14} />
              Strategic Intelligence
            </div>
            <h1 className="text-5xl lg:text-7xl font-black text-slate-900 mb-8 uppercase tracking-tighter">
              Campus <span className="text-gradient">Briefings</span>
            </h1>
            <p className="text-xl text-slate-500 leading-relaxed max-w-2xl mx-auto font-medium">
              The authoritative source for academic updates, institutional breakthroughs, and community insights.
            </p>
          </motion.div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 pb-32">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
             {[1, 2, 3].map(i => (
               <div key={i} className="h-96 animate-pulse bg-white rounded-[3rem] shadow-sm"></div>
             ))}
          </div>
        ) : posts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {posts.map((post) => (
              <motion.div 
                key={post.id} 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-white rounded-[3rem] shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden group hover:shadow-2xl transition-all duration-500 flex flex-col"
              >
                <div className="h-64 overflow-hidden relative">
                  {post.imageUrl && /\.(jpg|jpeg|png|gif|webp|svg|avif)(\?.*)?$/i.test(post.imageUrl) ? (
                     <img
                       src={post.imageUrl}
                       alt={post.title}
                       className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                       onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling && (e.target.nextSibling.style.display = 'flex'); }}
                     />
                  ) : null}
                  <div className="w-full h-full bg-gradient-to-br from-indigo-50 to-slate-100 flex items-center justify-center"
                    style={{ display: post.imageUrl && /\.(jpg|jpeg|png|gif|webp|svg|avif)(\?.*)?$/i.test(post.imageUrl) ? 'none' : 'flex' }}>
                    <FileText size={48} className="text-indigo-200" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent"></div>
                  {post.category && (
                    <span className="absolute top-6 left-6 bg-white text-indigo-600 text-[10px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-xl shadow-lg">
                      {post.category}
                    </span>
                  )}
                </div>
                
                <div className="p-10 flex flex-col flex-grow">
                  <div className="flex items-center gap-6 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">
                    <span className="flex items-center gap-2"><Calendar size={14} className="text-indigo-500" /> {new Date(post.createdAt).toLocaleDateString()}</span>
                    <span className="flex items-center gap-2"><User size={14} className="text-indigo-500" /> {post.author || 'Admin'}</span>
                  </div>
                  <h3 className="text-2xl font-black text-slate-800 mb-4 line-clamp-2 leading-tight tracking-tight group-hover:text-indigo-600 transition-colors uppercase">
                    {post.title}
                  </h3>
                  <p className="text-slate-500 mb-8 line-clamp-3 text-sm leading-relaxed font-medium flex-grow">
                     {post.excerpt || (post.content ? post.content.replace(/<[^>]*>?/gm, '').substring(0, 150) + '...' : 'Transmission pending further briefing.')}
                  </p>
                  <button className="flex items-center gap-3 text-xs font-black text-indigo-600 uppercase tracking-[0.2em] group-hover:gap-6 transition-all mt-auto w-fit">
                    Full Briefing <ChevronRight size={18} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-32 enterprise-card bg-white border-dashed border-2 border-slate-200">
            <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-200 mx-auto mb-8">
              <FileText size={40} />
            </div>
            <h3 className="text-2xl font-black text-slate-400 uppercase tracking-tighter mb-2">No Active Briefings</h3>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Awaiting tactical updates from administration.</p>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default BlogPage;
