import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../lib/firebase';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { useTheme } from '../../context/ThemeContext';
import { Calendar, User, ChevronRight, FileText, X, Clock } from 'lucide-react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/MainFooter';

const BlogPage = () => {
  const { schoolName, primaryColor } = useTheme();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);

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

  // Close modal on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setSelectedPost(null); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans mesh-bg">
      <Navbar />

      {/* Header */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
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
                className="bg-white rounded-[3rem] shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden group hover:shadow-2xl transition-all duration-500 flex flex-col cursor-pointer"
                onClick={() => setSelectedPost(post)}
              >
                {/* Image */}
                <div className="h-64 overflow-hidden relative shrink-0">
                  {post.imageUrl && /\.(jpg|jpeg|png|gif|webp|svg|avif)(\?.*)?$/i.test(post.imageUrl) ? (
                    <img
                      src={post.imageUrl}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-50 to-slate-100 flex items-center justify-center">
                      <FileText size={48} className="text-indigo-200" />
                    </div>
                  )}
                  {/* Dark overlay - text on top must be white */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent pointer-events-none" />
                  {post.category && (
                    <span className="absolute top-6 left-6 bg-white text-indigo-600 text-[10px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-xl shadow-lg">
                      {post.category}
                    </span>
                  )}
                  {/* Date shown on dark part of image — must be white */}
                  <span className="absolute bottom-5 left-6 flex items-center gap-1.5 text-white text-[11px] font-bold">
                    <Calendar size={12} className="text-white/80" />
                    {new Date(post.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="p-8 flex flex-col flex-grow">
                  <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                    <User size={13} className="text-indigo-400" />
                    <span>{post.author || 'Administration'}</span>
                  </div>
                  <h3 className="text-xl font-black text-slate-800 mb-3 line-clamp-2 leading-tight tracking-tight group-hover:text-indigo-600 transition-colors uppercase flex-grow">
                    {post.title}
                  </h3>
                  <p className="text-slate-500 mb-6 line-clamp-3 text-sm leading-relaxed font-medium">
                    {post.excerpt || (post.content ? post.content.replace(/<[^>]*>?/gm, '').substring(0, 150) + '...' : 'Transmission pending further briefing.')}
                  </p>
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedPost(post); }}
                    className="flex items-center gap-2 text-xs font-black text-indigo-600 uppercase tracking-[0.15em] group-hover:gap-4 transition-all mt-auto w-fit border-b-2 border-indigo-100 pb-1 hover:border-indigo-600"
                  >
                    Read More <ChevronRight size={16} />
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

      {/* Read More Modal */}
      <AnimatePresence>
        {selectedPost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedPost(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="bg-white rounded-[2.5rem] shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              {selectedPost.imageUrl && /\.(jpg|jpeg|png|gif|webp|svg|avif)(\?.*)?$/i.test(selectedPost.imageUrl) && (
                <div className="h-64 overflow-hidden relative shrink-0">
                  <img src={selectedPost.imageUrl} alt={selectedPost.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 to-slate-900/10 pointer-events-none" />
                  {/* Category badge on dark overlay — white text */}
                  {selectedPost.category && (
                    <span className="absolute top-6 left-6 bg-white text-indigo-600 text-[10px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-xl shadow-lg">
                      {selectedPost.category}
                    </span>
                  )}
                  <button
                    onClick={() => setSelectedPost(null)}
                    className="absolute top-6 right-6 w-10 h-10 bg-white/20 backdrop-blur-md text-white rounded-xl flex items-center justify-center hover:bg-white/40 transition-colors"
                  >
                    <X size={20} />
                  </button>
                  {/* Author & date on dark overlay — must be white */}
                  <div className="absolute bottom-6 left-6 flex items-center gap-4 text-white text-[11px] font-bold">
                    <span className="flex items-center gap-1.5"><User size={12} />{selectedPost.author || 'Administration'}</span>
                    <span className="flex items-center gap-1.5"><Clock size={12} />{new Date(selectedPost.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              )}

              {/* Close button (no image case) */}
              {!(selectedPost.imageUrl && /\.(jpg|jpeg|png|gif|webp|svg|avif)(\?.*)?$/i.test(selectedPost.imageUrl)) && (
                <div className="flex justify-between items-center p-8 pb-0 shrink-0">
                  <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {selectedPost.category && (
                      <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg">{selectedPost.category}</span>
                    )}
                    <span className="flex items-center gap-1"><Calendar size={12} />{new Date(selectedPost.createdAt).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1"><User size={12} />{selectedPost.author || 'Administration'}</span>
                  </div>
                  <button
                    onClick={() => setSelectedPost(null)}
                    className="w-10 h-10 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center hover:bg-rose-100 hover:text-rose-600 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              )}

              {/* Modal Body — scrollable */}
              <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight leading-tight mb-6">
                  {selectedPost.title}
                </h2>
                <div
                  className="blog-rich-content"
                  dangerouslySetInnerHTML={{
                    __html: selectedPost.content || '<p>No content available for this post.</p>'
                  }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
};

export default BlogPage;
