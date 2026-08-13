import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../lib/firebase';
import { collection, query, getDocs, orderBy, addDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { useTheme } from '../../context/ThemeContext';
import { Calendar, User, ChevronRight, FileText, X, Clock, Heart, MessageCircle, Share2, Send, Check } from 'lucide-react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/MainFooter';

// Post Modal Component to handle individual post logic (comments, reactions)
const PostModal = ({ post, onClose }) => {
  const [comments, setComments] = useState([]);
  const [reactions, setReactions] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [commentName, setCommentName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Check local storage for like status
    const likedPosts = JSON.parse(localStorage.getItem('likedPosts') || '{}');
    if (likedPosts[post.id]) {
      setHasLiked(true);
    }

    // Listen to comments
    const commentsRef = collection(db, 'posts', post.id, 'comments');
    const qComments = query(commentsRef, orderBy('createdAt', 'desc'));
    const unsubscribeComments = onSnapshot(qComments, (snap) => {
      setComments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Listen to reactions
    const reactionsRef = collection(db, 'posts', post.id, 'reactions');
    const unsubscribeReactions = onSnapshot(reactionsRef, (snap) => {
      setReactions(snap.size);
    });

    return () => {
      unsubscribeComments();
      unsubscribeReactions();
    };
  }, [post.id]);

  const handleLike = async () => {
    if (hasLiked) return;
    
    // Optimistic UI update
    setHasLiked(true);
    const likedPosts = JSON.parse(localStorage.getItem('likedPosts') || '{}');
    likedPosts[post.id] = true;
    localStorage.setItem('likedPosts', JSON.stringify(likedPosts));

    try {
      await addDoc(collection(db, 'posts', post.id, 'reactions'), {
        type: 'like',
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error adding reaction: ", error);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: post.title,
      text: post.excerpt || post.title,
      url: window.location.href,
    };
    
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !commentName.trim()) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'posts', post.id, 'comments'), {
        name: commentName.trim(),
        text: newComment.trim(),
        createdAt: serverTimestamp()
      });
      setNewComment('');
    } catch (error) {
      console.error("Error adding comment: ", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 30 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="bg-white rounded-[2.5rem] shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header/Cover Image */}
        {post.imageUrl && /\.(jpg|jpeg|png|gif|webp|svg|avif)(\?.*)?$/i.test(post.imageUrl) ? (
          <div className="h-72 sm:h-80 overflow-hidden relative shrink-0 group">
            <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/30 to-transparent pointer-events-none" />
            
            {post.category && (
              <span className="absolute top-6 left-6 bg-white/20 backdrop-blur-md border border-white/30 text-white text-[10px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-xl shadow-lg">
                {post.category}
              </span>
            )}
            
            <button
              onClick={onClose}
              className="absolute top-6 right-6 w-10 h-10 bg-white/20 backdrop-blur-md border border-white/30 text-white rounded-xl flex items-center justify-center hover:bg-white/40 hover:scale-105 active:scale-95 transition-all z-10"
            >
              <X size={20} />
            </button>
            
            <div className="absolute bottom-6 left-6 right-6 flex flex-wrap items-center justify-between gap-4 text-white text-[11px] font-bold">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10"><User size={12} />{post.author || 'Administration'}</span>
                <span className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10"><Clock size={12} />{new Date(post.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-between items-center p-8 pb-0 shrink-0 bg-slate-50 border-b border-slate-100 relative">
            <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest flex-wrap">
              {post.category && (
                <span className="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg">{post.category}</span>
              )}
              <span className="flex items-center gap-1"><Calendar size={12} />{new Date(post.createdAt).toLocaleDateString()}</span>
              <span className="flex items-center gap-1"><User size={12} />{post.author || 'Administration'}</span>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-white shadow-sm border border-slate-200 text-slate-600 rounded-xl flex items-center justify-center hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors absolute top-6 right-6 z-10"
            >
              <X size={20} />
            </button>
          </div>
        )}

        {/* Modal Body & Comments — scrollable */}
        <div className="overflow-y-auto flex-1 custom-scrollbar bg-slate-50">
          <div className="bg-white p-8 sm:p-12 rounded-b-[2.5rem] shadow-sm mb-2 border-b border-slate-100">
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 uppercase tracking-tight leading-[1.1] mb-8">
              {post.title}
            </h2>
            <div
              className="blog-rich-content prose prose-slate max-w-none prose-headings:font-black prose-headings:uppercase prose-a:text-indigo-600 hover:prose-a:text-indigo-500 prose-img:rounded-3xl prose-img:shadow-xl prose-p:leading-relaxed prose-p:text-slate-600"
              dangerouslySetInnerHTML={{
                __html: post.content || '<p>No content available for this post.</p>'
              }}
            />
            
            {/* Action Bar */}
            <div className="mt-12 pt-8 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleLike}
                  className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all duration-300 ${hasLiked ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-white border border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 shadow-sm hover:shadow-md'}`}
                >
                  <motion.div whileTap={{ scale: 0.8 }} animate={hasLiked ? { scale: [1, 1.2, 1] } : {}}>
                    <Heart size={18} className={hasLiked ? 'fill-rose-500 text-rose-500' : ''} />
                  </motion.div>
                  {reactions} {reactions === 1 ? 'Reaction' : 'Reactions'}
                </button>
              </div>
              
              <button 
                onClick={handleShare}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm hover:shadow-md"
              >
                {copied ? <Check size={18} className="text-emerald-500" /> : <Share2 size={18} />}
                {copied ? 'Link Copied!' : 'Share Article'}
              </button>
            </div>
          </div>

          {/* Comments Section */}
          <div className="p-8 sm:p-12 max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-10">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
                <MessageCircle size={24} className="text-indigo-600" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Discussion</h3>
                <p className="text-sm font-bold text-slate-500">{comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}</p>
              </div>
            </div>

            {/* Comment Form */}
            <form onSubmit={handleAddComment} className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-slate-200 mb-12 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
              <div className="mb-5">
                <input
                  type="text"
                  placeholder="Your Name"
                  required
                  value={commentName}
                  onChange={(e) => setCommentName(e.target.value)}
                  className="w-full px-5 py-3.5 rounded-xl bg-slate-50 border-2 border-transparent focus:border-indigo-100 focus:bg-white outline-none font-bold text-sm transition-all"
                />
              </div>
              <div className="mb-5">
                <textarea
                  placeholder="Share your thoughts on this briefing..."
                  required
                  rows="3"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="w-full px-5 py-4 rounded-xl bg-slate-50 border-2 border-transparent focus:border-indigo-100 focus:bg-white outline-none font-medium text-sm transition-all resize-none custom-scrollbar"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-8 py-3.5 bg-indigo-600 text-white font-black uppercase tracking-wide text-xs rounded-xl hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-indigo-200"
                >
                  <Send size={16} />
                  {isSubmitting ? 'Posting...' : 'Post Comment'}
                </button>
              </div>
            </form>

            {/* Comments List */}
            <div className="space-y-6">
              {comments.length > 0 ? (
                comments.map((comment, index) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    key={comment.id} 
                    className="bg-white p-6 sm:p-8 rounded-[2rem] border border-slate-100 shadow-sm flex gap-5 hover:shadow-md transition-shadow"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black shrink-0 shadow-inner text-lg">
                      {comment.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-2">
                        <h4 className="font-bold text-slate-900 text-lg">{comment.name}</h4>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                          {comment.createdAt?.toDate ? comment.createdAt.toDate().toLocaleDateString() : 'Just now'}
                        </span>
                      </div>
                      <p className="text-slate-600 text-sm leading-relaxed font-medium">{comment.text}</p>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-16 bg-white rounded-[2rem] border-2 border-slate-100 border-dashed">
                  <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                    <MessageCircle size={32} className="text-slate-300" />
                  </div>
                  <h4 className="text-lg font-black text-slate-800 mb-2">No Comments Yet</h4>
                  <p className="text-slate-500 font-medium text-sm">Be the first to share your perspective on this briefing.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

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

  // Prevent scrolling on body when modal is open
  useEffect(() => {
    if (selectedPost) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedPost]);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans mesh-bg">
      <Navbar />

      {/* Premium Header */}
      <section className="pt-32 pb-24 px-6 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-20 left-10 w-64 h-64 bg-indigo-300/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 right-10 w-80 h-80 bg-purple-300/20 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 shadow-sm text-xs font-black uppercase tracking-widest text-indigo-600 mb-8">
              <FileText size={14} />
              Strategic Intelligence
            </div>
            <h1 className="text-5xl lg:text-8xl font-black text-slate-900 mb-8 uppercase tracking-tighter leading-[0.9]">
              Campus <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Briefings</span>
            </h1>
            <p className="text-xl lg:text-2xl text-slate-500 leading-relaxed max-w-3xl mx-auto font-medium">
              The authoritative source for academic updates, institutional breakthroughs, and community insights.
            </p>
          </motion.div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 pb-32 relative z-10 w-full">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-[28rem] animate-pulse bg-white rounded-[2.5rem] shadow-sm border border-slate-100"></div>
            ))}
          </div>
        ) : posts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 xl:gap-10">
            {posts.map((post, i) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden group hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 flex flex-col cursor-pointer relative"
                onClick={() => setSelectedPost(post)}
              >
                {/* Image */}
                <div className="h-64 overflow-hidden relative shrink-0 bg-slate-100">
                  {post.imageUrl && /\.(jpg|jpeg|png|gif|webp|svg|avif)(\?.*)?$/i.test(post.imageUrl) ? (
                    <img
                      src={post.imageUrl}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
                      <FileText size={48} className="text-indigo-200" />
                    </div>
                  )}
                  {/* Premium overlays */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent pointer-events-none opacity-80 group-hover:opacity-90 transition-opacity" />
                  
                  {post.category && (
                    <span className="absolute top-6 left-6 bg-white/20 backdrop-blur-md border border-white/20 text-white text-[10px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-xl shadow-lg z-10">
                      {post.category}
                    </span>
                  )}
                  
                  {/* Date shown on dark part of image */}
                  <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between z-10">
                    <span className="flex items-center gap-1.5 text-white/90 text-[11px] font-bold bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/10">
                      <Calendar size={12} className="text-white/70" />
                      {new Date(post.createdAt).toLocaleDateString()}
                    </span>
                    
                    {/* Visual indicator for interaction */}
                    <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                      <ChevronRight size={16} className="text-white" />
                    </div>
                  </div>
                </div>

                <div className="p-8 flex flex-col flex-grow relative bg-white">
                  {/* Floating Author badge */}
                  <div className="absolute -top-6 right-8 bg-white px-4 py-2 rounded-xl shadow-lg border border-slate-100 flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest z-20">
                    <User size={12} className="text-indigo-500" />
                    <span className="truncate max-w-[100px]">{post.author || 'Admin'}</span>
                  </div>

                  <h3 className="text-2xl font-black text-slate-800 mb-4 line-clamp-2 leading-[1.2] tracking-tight group-hover:text-indigo-600 transition-colors uppercase mt-2">
                    {post.title}
                  </h3>
                  <p className="text-slate-500 mb-8 line-clamp-3 text-sm leading-relaxed font-medium">
                    {post.excerpt || (post.content ? post.content.replace(/<[^>]*>?/gm, '').substring(0, 150) + '...' : 'Transmission pending further briefing.')}
                  </p>
                  
                  <div className="mt-auto pt-6 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-black text-indigo-600 uppercase tracking-[0.15em] flex items-center gap-2 group-hover:gap-3 transition-all">
                      Read Article <ChevronRight size={14} />
                    </span>
                    <div className="flex items-center gap-3 text-slate-400">
                      <MessageCircle size={18} className="group-hover:text-indigo-400 transition-colors" />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-32 bg-white rounded-[3rem] border border-slate-200 shadow-sm max-w-3xl mx-auto">
            <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-300 mx-auto mb-8">
              <FileText size={48} />
            </div>
            <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-4">No Active Briefings</h3>
            <p className="text-slate-500 font-medium text-lg max-w-md mx-auto">Awaiting tactical updates from administration. Check back later for the latest news.</p>
          </div>
        )}
      </div>

      {/* Read More Modal extracted to a component to maintain separate states for reactions and comments */}
      <AnimatePresence>
        {selectedPost && (
          <PostModal post={selectedPost} onClose={() => setSelectedPost(null)} />
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
};

export default BlogPage;
