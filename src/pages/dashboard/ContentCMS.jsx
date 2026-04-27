import React, { useState, useEffect } from 'react';
import { db, storage } from '../../lib/firebase';
import { doc, getDoc, setDoc, collection, addDoc, getDocs, deleteDoc, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Save, FileText, Image as ImageIcon, MessageSquare, Trash2, Edit2, Loader2, CheckCircle, AlertCircle, Phone, MapPin, Plus, Info, Upload } from 'lucide-react';


const ContentCMS = () => {
  const [activeTab, setActiveTab] = useState('about');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  const cmsTabs = [
    { id: 'landing', label: 'Landing Page', icon: ImageIcon },
    { id: 'about', label: 'About Us', icon: Info },
    { id: 'contact', label: 'Contact & Location', icon: MapPin },
    { id: 'blog', label: 'Blog & News', icon: FileText },
  ];


   // About State
   const [aboutHtml, setAboutHtml] = useState('');
   const [managementTeam, setManagementTeam] = useState([]);
   const [principalData, setPrincipalData] = useState({
     name: '', image: '', message: ''
   });

  // Contact State
  const [contactData, setContactData] = useState({
    address: '', phone: '', email: '', hours: ''
  });

  // Blog State
  const [posts, setPosts] = useState([]);
  const [isComposing, setIsComposing] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '', category: 'News', imageUrl: '' });

  // Landing Page State
  const [landingData, setLandingData] = useState({
    heroHeadline: 'Sowing the Seed of Greatness',
    heroSubtext: 'We nurture excellence, discipline, and innovation—raising a generation of leaders prepared for the future.',
    stats: [
      { label: 'Students', value: 500, suffix: '+' },
      { label: 'Success Rate', value: 98, suffix: '%' },
      { label: 'Awards', value: 150, suffix: '+' }
    ],
    heroImages: [] // Array of image URLs
  });

  useEffect(() => {
    fetchGlobalSettings();
    if (activeTab === 'blog') fetchPosts();
  }, [activeTab]);

  const fetchGlobalSettings = async () => {
    try {
      const docSnap = await getDoc(doc(db, 'settings', 'public_content'));
      if (docSnap.exists()) {
        const data = docSnap.data();
         if (data.aboutHtml) setAboutHtml(data.aboutHtml);
         if (data.contactDetails) setContactData(data.contactDetails);
         if (data.landingPage) setLandingData(data.landingPage);
         if (data.managementTeam) setManagementTeam(data.managementTeam);
         if (data.principalData) setPrincipalData(data.principalData);
       }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPosts = async () => {
    try {
      const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileUpload = async (file, path) => {
    if (!file) return null;
    setUploading(true);
    try {
      const storageRef = ref(storage, `${path}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      return url;
    } catch (error) {
      console.error("Upload error:", error);
      setStatus({ type: 'error', message: 'Image upload failed.' });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const saveSettings = async (type) => {
    setLoading(true);
    setStatus({ type: 'info', message: 'Saving changes...' });
    try {
      const docRef = doc(db, 'settings', 'public_content');
      if (type === 'about') {
        await setDoc(docRef, { aboutHtml }, { merge: true });
      } else if (type === 'contact') {
        await setDoc(docRef, { contactDetails: contactData }, { merge: true });
       } else if (type === 'landing') {
        await setDoc(docRef, { landingPage: landingData }, { merge: true });
       } else if (type === 'team') {
        await setDoc(docRef, { managementTeam }, { merge: true });
      } else if (type === 'principal') {
        await setDoc(docRef, { principalData }, { merge: true });
      }
      setStatus({ type: 'success', message: 'Content updated globally!' });
    } catch (error) {
      setStatus({ type: 'error', message: 'Failed to save changes.' });
    } finally {
      setLoading(false);
      setTimeout(() => setStatus({ type: '', message: '' }), 3000);
    }
  };

  const publishPost = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'posts'), {
        ...newPost,
        author: 'School Administration',
        createdAt: new Date().toISOString()
      });
      setStatus({ type: 'success', message: 'Blog post published!' });
      setIsComposing(false);
      setNewPost({ title: '', content: '', category: 'News', imageUrl: '' });
      fetchPosts();
    } catch (error) {
      setStatus({ type: 'error', message: 'Publishing failed.' });
    } finally {
      setLoading(false);
      setTimeout(() => setStatus({ type: '', message: '' }), 3000);
    }
  };

  const deletePost = async (id) => {
    if (!window.confirm('Delete this post?')) return;
    try {
      await deleteDoc(doc(db, 'posts', id));
      fetchPosts();
    } catch (e) {
      alert('Error deleting post');
    }
  };

  // Inline Image Upload Component
  const FileUploader = ({ onUpload, label, currentUrl, folder }) => (
    <div className="space-y-3">
      <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">{label}</label>
      <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 hover:border-indigo-200 transition-all">
        {currentUrl ? (
          <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 bg-white shrink-0 shadow-sm">
            <img src={currentUrl} alt="Preview" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-16 h-16 rounded-xl bg-slate-200 flex items-center justify-center shrink-0">
            <ImageIcon size={24} className="text-slate-400" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-slate-500 mb-1 truncate">{currentUrl || 'No image selected'}</p>
          <div className="relative">
            <input 
              type="file" 
              accept="image/*" 
              onChange={async (e) => {
                const file = e.target.files[0];
                if (file) {
                  const url = await handleFileUpload(file, folder);
                  if (url) onUpload(url);
                }
              }} 
              className="absolute inset-0 opacity-0 cursor-pointer" 
              disabled={uploading}
            />
            <button className="flex items-center gap-2 text-indigo-600 font-black text-sm px-4 py-2 bg-white rounded-lg border border-indigo-100 hover:bg-indigo-50 transition-colors">
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {currentUrl ? 'Change Image' : 'Upload Image'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="mb-8">
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
          <FileText className="text-indigo-600" size={32} />
          Content Management
        </h2>
        <p className="text-slate-500 mt-2">Edit public pages, manage contact details, and publish blog announcements.</p>
      </div>

      <div className="modern-tabs-container hide-scrollbar overflow-x-auto max-w-full">
        {cmsTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`modern-tab-item ${activeTab === tab.id ? 'active' : ''}`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>


      <div className="tab-content-animate" key={activeTab}>
        {activeTab === 'landing' && (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 animate-in slide-in-from-bottom-4">
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-slate-800">Landing Page Hero & Stats</h3>
                <p className="text-sm text-slate-500">Update the main headline and school statistics shown on the home page.</p>
              </div>
              <button onClick={() => saveSettings('landing')} disabled={loading} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-50">
                {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Save Changes
              </button>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Hero Headline</label>
                <input 
                  type="text" 
                  value={landingData.heroHeadline} 
                  onChange={e => setLandingData({...landingData, heroHeadline: e.target.value})} 
                  className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-indigo-500 outline-none font-bold text-lg" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Hero Subtext</label>
                <textarea 
                  rows="3" 
                  value={landingData.heroSubtext} 
                  onChange={e => setLandingData({...landingData, heroSubtext: e.target.value})} 
                  className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-indigo-500 outline-none font-medium" 
                />
              </div>

              <div className="pt-6 border-t border-slate-100">
                <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <ImageIcon size={18} className="text-indigo-600" /> Hero Slideshow Images
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(landingData.heroImages || []).map((img, idx) => (
                    <div key={idx} className="relative">
                      <FileUploader 
                        label={`Slide ${idx + 1}`}
                        currentUrl={img}
                        folder="landing"
                        onUpload={(url) => {
                          const newImgs = [...landingData.heroImages];
                          newImgs[idx] = url;
                          setLandingData({...landingData, heroImages: newImgs});
                        }}
                      />
                      <button 
                        onClick={() => {
                          const newImgs = landingData.heroImages.filter((_, i) => i !== idx);
                          setLandingData({...landingData, heroImages: newImgs});
                        }}
                        className="absolute top-0 right-0 p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <button 
                    onClick={() => setLandingData({...landingData, heroImages: [...(landingData.heroImages || []), '']})}
                    className="flex flex-col items-center justify-center gap-2 h-[120px] border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold hover:border-indigo-400 hover:text-indigo-600 transition-all"
                  >
                    <Plus size={24} /> 
                    <span>Add New Slide</span>
                  </button>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <h4 className="font-bold text-slate-800 mb-4">School Statistics</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {landingData.stats.map((s, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-100">
                      <p className="text-[10px] font-black uppercase text-slate-400 mb-3">{s.label}</p>
                      <div className="flex gap-2">
                        <input 
                          type="number" 
                          value={s.value} 
                          onChange={e => {
                            const newStats = [...landingData.stats];
                            newStats[idx].value = parseInt(e.target.value);
                            setLandingData({...landingData, stats: newStats});
                          }} 
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none focus:border-indigo-500 font-bold" 
                        />
                        <input 
                          type="text" 
                          value={s.suffix} 
                          onChange={e => {
                            const newStats = [...landingData.stats];
                            newStats[idx].suffix = e.target.value;
                            setLandingData({...landingData, stats: newStats});
                          }} 
                          className="w-16 px-3 py-2 rounded-lg border border-slate-200 outline-none focus:border-indigo-500 font-bold text-center" 
                          placeholder="+"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'about' && (

        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 animate-in slide-in-from-bottom-4">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h3 className="text-xl font-black text-slate-800">About Page Content</h3>
               <p className="text-sm text-slate-500">Edit the HTML content structure for the public About Us page.</p>
            </div>
             <button onClick={() => saveSettings('about')} disabled={loading} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-50">
               {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Save All About
             </button>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
             <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Principal's Name</label>
                  <input 
                    type="text" 
                    value={principalData.name} 
                    onChange={e => setPrincipalData({...principalData, name: e.target.value})} 
                    className="w-full px-5 py-3 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 outline-none font-bold" 
                  />
                </div>
                <FileUploader 
                  label="Principal's Official Photo"
                  currentUrl={principalData.image}
                  folder="principal"
                  onUpload={(url) => setPrincipalData({...principalData, image: url})}
                />
             </div>
             
             <div className="space-y-2">
               <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Principal's Message</label>
               <textarea 
                 rows="10" 
                 value={principalData.message} 
                 onChange={e => setPrincipalData({...principalData, message: e.target.value})} 
                 className="w-full p-6 rounded-2xl bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 outline-none font-medium leading-relaxed"
                 placeholder="Welcome to our school..."
               />
             </div>
           </div>

           <div className="space-y-2">
             <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Detailed History & Mission (HTML)</label>
             <textarea 
               value={aboutHtml}
               onChange={(e) => setAboutHtml(e.target.value)}
               className="w-full h-64 p-6 rounded-2xl bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 outline-none font-mono text-sm leading-relaxed"
               placeholder="<h3>Our History</h3><p>...</p>"
             />
           </div>

           <div className="mt-12 pt-12 border-t border-slate-100">
             <div className="mb-6 flex justify-between items-center">
               <div>
                 <h3 className="text-xl font-black text-slate-800">Management Team</h3>
                 <p className="text-sm text-slate-500">Manage the leaders shown in the leadership section.</p>
               </div>
               <button onClick={() => saveSettings('team')} disabled={loading} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-50">
                 {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Save Team
               </button>
             </div>

             <div className="space-y-4">
               {managementTeam.map((member, idx) => (
                 <div key={idx} className="p-6 bg-slate-50 rounded-2xl border-2 border-slate-100 space-y-4 relative group">
                   <button 
                     onClick={() => {
                       const newTeam = managementTeam.filter((_, i) => i !== idx);
                       setManagementTeam(newTeam);
                     }}
                     className="absolute top-4 right-4 p-2 text-rose-500 hover:bg-rose-100 rounded-lg"
                   >
                     <Trash2 size={18} />
                   </button>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="space-y-1">
                       <label className="text-[10px] font-black uppercase text-slate-400">Full Name</label>
                       <input 
                         type="text" 
                         value={member.name} 
                         onChange={e => {
                           const newTeam = [...managementTeam];
                           newTeam[idx].name = e.target.value;
                           setManagementTeam(newTeam);
                         }}
                         className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none font-bold"
                       />
                     </div>
                     <div className="space-y-1">
                       <label className="text-[10px] font-black uppercase text-slate-400">Professional Role</label>
                       <input 
                         type="text" 
                         value={member.role} 
                         onChange={e => {
                           const newTeam = [...managementTeam];
                           newTeam[idx].role = e.target.value;
                           setManagementTeam(newTeam);
                         }}
                         className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none font-bold"
                       />
                     </div>
                   </div>
                   <div className="space-y-1">
                     <label className="text-[10px] font-black uppercase text-slate-400">Biography / Quote</label>
                     <textarea 
                       rows="2" 
                       value={member.bio} 
                       onChange={e => {
                         const newTeam = [...managementTeam];
                         newTeam[idx].bio = e.target.value;
                         setManagementTeam(newTeam);
                       }}
                       className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none font-medium"
                     />
                   </div>
                 </div>
               ))}

               <button 
                 onClick={() => setManagementTeam([...managementTeam, { name: '', role: '', bio: '' }])}
                 className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold hover:border-indigo-400 hover:text-indigo-600 transition-all flex items-center justify-center gap-2"
               >
                 <Plus size={20} /> Add New Team Member
               </button>
             </div>
           </div>
         </div>
       )}

      {activeTab === 'contact' && (
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 animate-in slide-in-from-bottom-4">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h3 className="text-xl font-black text-slate-800">Public Contact Details</h3>
               <p className="text-sm text-slate-500">Update where public users can reach the school administration.</p>
            </div>
            <button onClick={() => saveSettings('contact')} disabled={loading} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-50">
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Update Details
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><MapPin size={14}/> Office Address</label>
               <input type="text" value={contactData.address} onChange={e => setContactData({...contactData, address: e.target.value})} className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-indigo-500 outline-none font-medium" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Phone size={14}/> Phone Number</label>
               <input type="text" value={contactData.phone} onChange={e => setContactData({...contactData, phone: e.target.value})} className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-indigo-500 outline-none font-medium" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><MessageSquare size={14}/> Public Email</label>
               <input type="email" value={contactData.email} onChange={e => setContactData({...contactData, email: e.target.value})} className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-indigo-500 outline-none font-medium" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">Working Hours</label>
               <input type="text" value={contactData.hours} onChange={e => setContactData({...contactData, hours: e.target.value})} className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-indigo-500 outline-none font-medium" />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'blog' && (
        <div className="animate-in slide-in-from-bottom-4">
          {!isComposing ? (
            <>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-800">Published Articles</h3>
                <button onClick={() => setIsComposing(true)} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-lg shadow-indigo-200">
                  <Plus size={18} /> Write New Post
                </button>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                   <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-widest border-b border-slate-100">
                     <tr>
                       <th className="px-6 py-4">Article Title</th>
                       <th className="px-6 py-4">Category</th>
                       <th className="px-6 py-4">Date</th>
                       <th className="px-6 py-4 text-right">Actions</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                     {posts.map(post => (
                       <tr key={post.id} className="hover:bg-slate-50">
                         <td className="px-6 py-4 font-bold text-slate-800">{post.title}</td>
                         <td className="px-6 py-4 text-sm text-slate-500">{post.category}</td>
                         <td className="px-6 py-4 text-sm text-slate-500">{new Date(post.createdAt).toLocaleDateString()}</td>
                         <td className="px-6 py-4 flex justify-end gap-2">
                            <button onClick={() => deletePost(post.id)} className="p-2 text-slate-400 hover:text-rose-600 rounded-lg"><Trash2 size={18} /></button>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                </table>
                {posts.length === 0 && <div className="p-12 text-center text-slate-400">No blog posts published yet.</div>}
              </div>
            </>
          ) : (
             <div className="bg-white rounded-3xl p-8 shadow-lg border border-slate-100 animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-6">
                  <h3 className="text-2xl font-black text-slate-800">Compose Article</h3>
                  <button onClick={() => setIsComposing(false)} className="text-slate-400 hover:text-slate-800 font-bold px-4 py-2 bg-slate-100 rounded-lg">Cancel</button>
                </div>
                
                <form onSubmit={publishPost} className="space-y-6">
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Post Title</label>
                    <input type="text" required value={newPost.title} onChange={e => setNewPost({...newPost, title: e.target.value})} className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 outline-none font-bold text-lg" placeholder="Enter an engaging title..." />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Category</label>
                      <select value={newPost.category} onChange={e => setNewPost({...newPost, category: e.target.value})} className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 outline-none font-bold">
                        <option>News</option>
                        <option>Events</option>
                        <option>Academics</option>
                        <option>Sports</option>
                      </select>
                    </div>
                    <div>
                      <FileUploader 
                        label="Article Cover Image"
                        currentUrl={newPost.imageUrl}
                        folder="blog"
                        onUpload={(url) => setNewPost({...newPost, imageUrl: url})}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Article Content (HTML supported)</label>
                    <textarea required rows="10" value={newPost.content} onChange={e => setNewPost({...newPost, content: e.target.value})} className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 outline-none font-mono text-sm leading-relaxed" placeholder="<p>Start writing your post here...</p>" />
                  </div>
                  <button type="submit" disabled={loading} className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all">
                    {loading ? 'Publishing...' : 'Publish to Blog'}
                  </button>
                </form>
             </div>
          )}
        </div>
        )}
      </div>


      {status.message && (
        <div className={`fixed bottom-8 right-8 p-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-8 ${
          status.type === 'success' ? 'bg-indigo-600' : 'bg-rose-600'
        } text-white`}>
          {status.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span className="font-bold tracking-tight">{status.message}</span>
        </div>
      )}
    </div>
  );
};

export default ContentCMS;
