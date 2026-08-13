import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { db } from '../../lib/firebase';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { useTheme } from '../../context/ThemeContext';
import { Calendar, ChevronRight, FileText, TrendingUp, Hash } from 'lucide-react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/MainFooter';

const BlogPage = () => {
  const { schoolName, primaryColor } = useTheme();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const featuredPost = posts.length > 0 ? posts[0] : null;
  const regularPosts = posts.length > 1 ? posts.slice(1) : [];
  
  // Extract unique categories for a sidebar
  const categories = [...new Set(posts.map(p => p.category).filter(Boolean))];

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <Navbar />

      {/* Premium Header */}
      <section className="pt-32 pb-16 px-6 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h1 className="text-6xl lg:text-8xl font-black text-slate-900 uppercase tracking-tighter leading-[0.9]">
              Campus <br />
              <span className="text-indigo-600">Briefings</span>
            </h1>
            <p className="mt-8 text-xl lg:text-2xl text-slate-500 max-w-2xl font-medium leading-relaxed">
              The authoritative source for academic updates, institutional breakthroughs, and community insights.
            </p>
          </motion.div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-16 w-full flex flex-col lg:flex-row gap-12 lg:gap-16">
        
        {/* Main Content Area */}
        <div className="flex-1">
          {loading ? (
            <div className="space-y-12">
              <div className="h-[32rem] bg-slate-100 rounded-2xl animate-pulse"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="h-64 bg-slate-100 rounded-2xl animate-pulse"></div>
                <div className="h-64 bg-slate-100 rounded-2xl animate-pulse"></div>
              </div>
            </div>
          ) : posts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-12">
              {posts.map((post, i) => (
                <motion.article
                  key={post.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  onClick={() => navigate(`/blog/${post.id}`)}
                  className="group cursor-pointer flex flex-col bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100"
                >
                  <div className="relative h-56 w-full overflow-hidden bg-slate-100">
                    {post.imageUrl ? (
                      <img 
                        src={post.imageUrl} 
                        alt={post.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <FileText size={48} />
                      </div>
                    )}
                  </div>
                  
                  <div className="p-6 flex flex-col flex-grow">
                    <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                      {post.category && <span className="text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">{post.category}</span>}
                      <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                    </div>
                    
                    <h3 className="text-xl font-black text-slate-900 leading-[1.2] tracking-tight group-hover:text-indigo-600 transition-colors mb-4 line-clamp-2">
                      {post.title}
                    </h3>
                    
                    <p className="text-slate-500 font-medium text-sm leading-relaxed line-clamp-3 mb-6 flex-grow">
                      {post.excerpt || post.content?.replace(/<[^>]*>?/gm, '').substring(0, 120) + '...'}
                    </p>

                    <div className="flex items-center gap-1 text-[11px] font-black text-indigo-600 uppercase tracking-widest mt-auto opacity-0 group-hover:opacity-100 transform translate-x-[-10px] group-hover:translate-x-0 transition-all duration-300">
                      Read Article <ChevronRight size={14} />
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          ) : (
            <div className="py-24 text-center border-t-2 border-slate-900 mt-8">
              <FileText size={48} className="mx-auto text-slate-300 mb-6" />
              <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-4">No Active Briefings</h3>
              <p className="text-slate-500 font-medium text-lg max-w-md mx-auto">Check back later for the latest news and tactical updates.</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="w-full lg:w-80 shrink-0 space-y-12">
          {/* Trending / Most Read Widget */}
          <div>
            <div className="flex items-center gap-2 mb-6 border-b-2 border-slate-900 pb-4">
              <TrendingUp size={20} className="text-indigo-600" />
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Recent Dispatches</h3>
            </div>
            
            <div className="space-y-6">
              {posts.slice(0, 4).map((post, idx) => (
                <div 
                  key={post.id} 
                  className="group cursor-pointer flex gap-4"
                  onClick={() => navigate(`/blog/${post.id}`)}
                >
                  <div className="text-3xl font-black text-slate-200 mt-1">{`0${idx + 1}`}</div>
                  <div>
                    <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-tight">
                      {post.title}
                    </h4>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2 block">
                      {new Date(post.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Topics/Tags Widget */}
          {categories.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-6 border-b-2 border-slate-900 pb-4">
                <Hash size={20} className="text-indigo-600" />
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Topics</h3>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {categories.map((cat, idx) => (
                  <span 
                    key={idx}
                    className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-widest rounded-full cursor-pointer transition-colors border border-slate-200"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          )}
        </aside>

      </div>

      <Footer />
    </div>
  );
};

export default BlogPage;
