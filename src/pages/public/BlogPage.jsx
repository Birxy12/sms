import React, { useState, useEffect } from 'react';
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
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      {/* Header */}
      <div className="bg-slate-900 text-white py-20 text-center px-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
           <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500 via-transparent to-transparent opacity-60"></div>
        </div>
        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="inline-block px-4 py-1.5 rounded-full bg-white/10 text-sm font-bold tracking-widest uppercase mb-6 backdrop-blur-md flex items-center gap-2 mx-auto w-fit">
            <FileText size={16} /> Campus News
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-6">School Blog & Updates</h1>
          <p className="text-lg md:text-xl text-slate-300">Stay informed on the latest events, achievements, and announcements.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-16">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
             {[1, 2, 3].map(i => (
               <div key={i} className="h-96 animate-pulse bg-slate-200 rounded-3xl"></div>
             ))}
          </div>
        ) : posts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post) => (
              <div key={post.id} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden group hover:shadow-xl transition-all duration-300 flex flex-col">
                <div className="h-48 overflow-hidden relative">
                  {post.imageUrl ? (
                     <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                      <FileText size={48} className="text-slate-300" />
                    </div>
                  )}
                  {post.category && (
                    <span className="absolute top-4 left-4 bg-white/90 backdrop-blur text-indigo-700 text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-sm">
                      {post.category}
                    </span>
                  )}
                </div>
                
                <div className="p-8 flex flex-col flex-grow">
                  <div className="flex items-center gap-4 text-xs font-bold text-slate-500 mb-4">
                    <span className="flex items-center gap-1.5"><Calendar size={14} /> {new Date(post.createdAt).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1.5"><User size={14} /> {post.author || 'Admin'}</span>
                  </div>
                  <h3 className="text-xl font-black text-slate-800 mb-3 line-clamp-2 leading-tight group-hover:text-indigo-600 transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-slate-500 mb-6 line-clamp-3 text-sm leading-relaxed flex-grow">
                     {post.excerpt || (post.content ? post.content.replace(/<[^>]*>?/gm, '').substring(0, 120) + '...' : 'No content available')}
                  </p>
                  <button className="text-indigo-600 font-bold flex items-center gap-1 text-sm group-hover:gap-2 transition-all mt-auto w-fit">
                    Read Full Article <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 border-dashed">
            <FileText size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-bold text-slate-700">No Posts Yet</h3>
            <p className="text-slate-500">Check back later for updates and school news!</p>
          </div>
        )}
        </div>
      <Footer />
    </div>
  );
};

export default BlogPage;
