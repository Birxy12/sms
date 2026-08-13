import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { db } from '../../lib/firebase';
import { doc, getDoc, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { useTheme } from '../../context/ThemeContext';
import Navbar from '../../components/Navbar';
import Footer from '../../components/MainFooter';
import { Calendar, User, ChevronLeft, Heart, MessageCircle, Share2, Send, Check } from 'lucide-react';

const BlogPost = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { primaryColor } = useTheme();
  
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState([]);
  const [reactions, setReactions] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [commentName, setCommentName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const docRef = doc(db, 'posts', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setPost({ id: docSnap.id, ...docSnap.data() });
        } else {
          // Post not found
          navigate('/blog');
        }
      } catch (error) {
        console.error("Error fetching post:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [id, navigate]);

  useEffect(() => {
    if (!id) return;
    
    // Check local storage for like status
    const likedPosts = JSON.parse(localStorage.getItem('likedPosts') || '{}');
    if (likedPosts[id]) {
      setHasLiked(true);
    }

    // Listen to comments
    const commentsRef = collection(db, 'posts', id, 'comments');
    const qComments = query(commentsRef, orderBy('createdAt', 'desc'));
    const unsubscribeComments = onSnapshot(qComments, (snap) => {
      setComments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Listen to reactions
    const reactionsRef = collection(db, 'posts', id, 'reactions');
    const unsubscribeReactions = onSnapshot(reactionsRef, (snap) => {
      setReactions(snap.size);
    });

    return () => {
      unsubscribeComments();
      unsubscribeReactions();
    };
  }, [id]);

  const handleLike = async () => {
    if (hasLiked) return;
    
    setHasLiked(true);
    const likedPosts = JSON.parse(localStorage.getItem('likedPosts') || '{}');
    likedPosts[id] = true;
    localStorage.setItem('likedPosts', JSON.stringify(likedPosts));

    try {
      await addDoc(collection(db, 'posts', id, 'reactions'), {
        type: 'like',
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error adding reaction: ", error);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: post?.title,
      text: post?.excerpt || post?.title,
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
      await addDoc(collection(db, 'posts', id, 'comments'), {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!post) return null;

  const hasImage = post.imageUrl && /\.(jpg|jpeg|png|gif|webp|svg|avif)(\?.*)?$/i.test(post.imageUrl);

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <Navbar />

      {/* Full Bleed Hero Section */}
      <section className="relative w-full h-[60vh] md:h-[75vh] lg:h-[85vh] bg-slate-900 mt-16 flex flex-col justify-end">
        {hasImage ? (
          <div className="absolute inset-0 overflow-hidden">
            <img 
              src={post.imageUrl} 
              alt={post.title} 
              className="w-full h-full object-cover object-center opacity-70"
            />
            {/* Cinematic gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 to-slate-900"></div>
        )}

        <div className="relative z-10 max-w-5xl mx-auto w-full px-6 pb-16 lg:pb-24">
          <button 
            onClick={() => navigate('/blog')}
            className="flex items-center gap-2 text-white/70 hover:text-white text-sm font-bold uppercase tracking-widest mb-8 transition-colors"
          >
            <ChevronLeft size={16} /> Back to Briefings
          </button>
          
          <div className="flex flex-wrap items-center gap-4 mb-6">
            {post.category && (
              <span className="bg-white/20 backdrop-blur-md border border-white/20 text-white text-[10px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-full shadow-sm">
                {post.category}
              </span>
            )}
            <span className="flex items-center gap-1.5 text-white/80 text-sm font-bold">
              <Calendar size={14} /> {new Date(post.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-7xl font-black text-white leading-[1.1] tracking-tight max-w-4xl mb-8">
            {post.title}
          </h1>
          
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-indigo-500 flex items-center justify-center text-white font-black text-xl shadow-lg border-2 border-white/20">
              {(post.author || 'A').charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-white font-bold text-lg">{post.author || 'Administration'}</p>
              <p className="text-white/60 text-sm font-medium">Campus Insights Contributor</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto w-full px-6 py-16 lg:py-24 relative flex flex-col lg:flex-row gap-16">
        
        {/* Floating Action Bar (Desktop) */}
        <div className="hidden lg:block w-16 shrink-0 relative">
          <div className="sticky top-32 flex flex-col items-center gap-6">
            <button 
              onClick={handleLike}
              className={`w-14 h-14 rounded-full flex flex-col items-center justify-center gap-1 transition-all ${hasLiked ? 'text-rose-500 bg-rose-50' : 'text-slate-400 bg-slate-50 hover:bg-slate-100'}`}
              title="Like"
            >
              <Heart size={20} className={hasLiked ? 'fill-rose-500' : ''} />
              <span className="text-[10px] font-black">{reactions}</span>
            </button>
            <button 
              onClick={() => document.getElementById('comments-section').scrollIntoView({ behavior: 'smooth' })}
              className="w-14 h-14 rounded-full flex flex-col items-center justify-center gap-1 text-slate-400 bg-slate-50 hover:bg-slate-100 transition-all"
              title="Comments"
            >
              <MessageCircle size={20} />
              <span className="text-[10px] font-black">{comments.length}</span>
            </button>
            <button 
              onClick={handleShare}
              className="w-14 h-14 rounded-full flex flex-col items-center justify-center gap-1 text-slate-400 bg-slate-50 hover:bg-slate-100 transition-all"
              title="Share"
            >
              {copied ? <Check size={20} className="text-emerald-500" /> : <Share2 size={20} />}
            </button>
          </div>
        </div>

        {/* Article Body */}
        <div className="flex-1 max-w-3xl">
          <div 
            className="prose prose-slate lg:prose-xl max-w-none prose-headings:font-black prose-headings:tracking-tight prose-a:text-indigo-600 hover:prose-a:text-indigo-500 prose-img:rounded-3xl prose-img:shadow-xl prose-p:leading-relaxed prose-p:text-slate-700"
            dangerouslySetInnerHTML={{ __html: post.content || '<p>No content available.</p>' }}
          />

          {/* Mobile Action Bar */}
          <div className="lg:hidden mt-16 pt-8 border-t border-slate-100 flex items-center justify-between">
            <button 
              onClick={handleLike}
              className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-all ${hasLiked ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-600'}`}
            >
              <Heart size={18} className={hasLiked ? 'fill-rose-500' : ''} />
              {reactions} {reactions === 1 ? 'Reaction' : 'Reactions'}
            </button>
            <button 
              onClick={handleShare}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-slate-50 text-slate-600 font-bold text-sm"
            >
              {copied ? <Check size={18} className="text-emerald-500" /> : <Share2 size={18} />}
              Share
            </button>
          </div>

          {/* Comments Section */}
          <div id="comments-section" className="mt-24 pt-16 border-t-2 border-slate-900">
            <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-12">
              Discussion ({comments.length})
            </h3>

            {/* Comment Form */}
            <form onSubmit={handleAddComment} className="mb-16 relative">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                <input
                  type="text"
                  placeholder="Your Name"
                  required
                  value={commentName}
                  onChange={(e) => setCommentName(e.target.value)}
                  className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:border-slate-900 focus:bg-white outline-none font-bold text-sm transition-all"
                />
              </div>
              <div className="mb-6">
                <textarea
                  placeholder="Share your thoughts..."
                  required
                  rows="4"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="w-full px-6 py-5 rounded-2xl bg-slate-50 border border-slate-200 focus:border-slate-900 focus:bg-white outline-none font-medium text-sm transition-all resize-none"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-8 py-4 bg-slate-900 text-white font-black uppercase tracking-widest text-xs rounded-xl hover:bg-slate-800 active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  <Send size={16} />
                  {isSubmitting ? 'Posting...' : 'Post Comment'}
                </button>
              </div>
            </form>

            {/* Comments List */}
            <div className="space-y-8">
              {comments.length > 0 ? (
                comments.map((comment, index) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    key={comment.id} 
                    className="flex gap-6 pb-8 border-b border-slate-100 last:border-0"
                  >
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-black shrink-0 text-lg">
                      {comment.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="flex items-baseline justify-between gap-3 mb-3">
                        <h4 className="font-black text-slate-900 text-lg">{comment.name}</h4>
                        <span className="text-xs font-bold text-slate-400">
                          {comment.createdAt?.toDate ? comment.createdAt.toDate().toLocaleDateString() : 'Just now'}
                        </span>
                      </div>
                      <p className="text-slate-600 text-base leading-relaxed font-medium">{comment.text}</p>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-20">
                  <MessageCircle size={48} className="mx-auto text-slate-200 mb-6" />
                  <h4 className="text-xl font-black text-slate-900 mb-2">No comments yet</h4>
                  <p className="text-slate-500 font-medium">Be the first to share your perspective on this briefing.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default BlogPost;
