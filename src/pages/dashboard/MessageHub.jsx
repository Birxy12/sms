import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { Send, Mail, Users, Inbox, Clock, CheckCircle, AlertCircle, Trash2, Loader2 } from 'lucide-react';

const MessageHub = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState({ type: '', text: '' });
  
  const [compose, setCompose] = useState({
    title: '',
    body: '',
    targetType: 'global', // 'global', 'class', 'student'
    targetValue: '' // e.g. 'JSS1' or 'BDS/25/001', empty for global
  });

  const classes = ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2 ART', 'SS2 SCIENCE', 'SS3 ART', 'SS3 SCIENCE'];

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!compose.title || !compose.body) return;
    if (compose.targetType !== 'global' && !compose.targetValue) return;

    setSending(true);
    try {
      await addDoc(collection(db, 'notifications'), {
        title: compose.title,
        body: compose.body,
        targetType: compose.targetType,
        targetValue: compose.targetType === 'global' ? 'All Students' : compose.targetValue,
        sender: 'School Administration',
        createdAt: new Date().toISOString()
      });
      setStatus({ type: 'success', text: 'Message broadcasted successfully!' });
      setCompose({ title: '', body: '', targetType: 'global', targetValue: '' });
      fetchMessages();
    } catch (error) {
      console.error(error);
      setStatus({ type: 'error', text: 'Failed to send message.' });
    } finally {
      setSending(false);
      setTimeout(() => setStatus({ type: '', text: '' }), 4000);
    }
  };

  const deleteMessage = async (id) => {
    if(!window.confirm("Are you sure you want to delete this broadcast? It will be removed from all student inboxes.")) return;
    try {
      await deleteDoc(doc(db, 'notifications', id));
      fetchMessages();
    } catch (e) {
      alert("Failed to delete");
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
      
      {/* Compose Pane */}
      <div className="lg:col-span-1 space-y-6">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <Mail className="text-indigo-600" size={32} />
            Mailing Hub
          </h2>
          <p className="text-slate-500 mt-2">Broadcast alerts, exam schedules, and fee reminders.</p>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-lg border border-slate-100">
          <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-100 pb-4">
             <Send size={18} className="text-indigo-500" /> Compose Broadcast
          </h3>
          <form onSubmit={handleSend} className="space-y-5">
            <div>
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Recipient Target</label>
              <select 
                value={compose.targetType} 
                onChange={(e) => setCompose({...compose, targetType: e.target.value, targetValue: ''})}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 outline-none font-bold"
              >
                <option value="global">All Students (Global)</option>
                <option value="class">Specific Class</option>
                <option value="student">Specific Student (Reg No)</option>
              </select>
            </div>

            {compose.targetType === 'class' && (
              <div className="animate-in fade-in zoom-in-95">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Select Class</label>
                <select 
                  value={compose.targetValue} 
                  onChange={(e) => setCompose({...compose, targetValue: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl bg-indigo-50 text-indigo-700 border-2 border-transparent focus:border-indigo-500 outline-none font-bold"
                  required
                >
                  <option value="">Choose a class...</option>
                  {classes.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}

            {compose.targetType === 'student' && (
              <div className="animate-in fade-in zoom-in-95">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Student Reg No</label>
                <input 
                  type="text" 
                  value={compose.targetValue} 
                  onChange={(e) => setCompose({...compose, targetValue: e.target.value})}
                  placeholder="e.g. BDS/25/001"
                  className="w-full px-4 py-3 rounded-xl bg-indigo-50 text-indigo-700 border-2 border-transparent focus:border-indigo-500 outline-none font-bold"
                  required
                />
              </div>
            )}

            <div>
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Subject</label>
              <input 
                type="text" 
                value={compose.title} 
                onChange={(e) => setCompose({...compose, title: e.target.value})}
                placeholder="Message Subject..."
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 outline-none font-bold text-slate-800"
                required
              />
            </div>
            
            <div>
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Message Body</label>
              <textarea 
                rows="6" 
                value={compose.body} 
                onChange={(e) => setCompose({...compose, body: e.target.value})}
                placeholder="Type your message here..."
                className="w-full p-4 rounded-xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 outline-none font-medium resize-none leading-relaxed"
                required
              />
            </div>

            <button type="submit" disabled={sending} className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-100 disabled:opacity-50">
              {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} Send Broadcast
            </button>
          </form>
        </div>
      </div>

      {/* Outbox / History Pane */}
      <div className="lg:col-span-2">
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 min-h-full">
          <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-4">
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <Inbox size={20} className="text-slate-400" /> Broadcast History
            </h3>
            <span className="bg-slate-100 text-slate-600 font-bold px-3 py-1 rounded-lg text-sm">{messages.length} Sent</span>
          </div>

          <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2">
            {loading ? (
               <div className="flex justify-center py-12"><Loader2 size={32} className="text-indigo-600 animate-spin" /></div>
            ) : messages.length === 0 ? (
               <div className="text-center py-16">
                 <Mail size={48} className="mx-auto text-slate-200 mb-4" />
                 <h4 className="text-lg font-bold text-slate-600">No broadcasts yet</h4>
                 <p className="text-slate-400 text-sm">Messages sent from the hub will appear here.</p>
               </div>
            ) : (
               messages.map(msg => (
                 <div key={msg.id} className="p-5 rounded-2xl border border-slate-200 hover:border-indigo-200 transition-colors group relative">
                   <button onClick={() => deleteMessage(msg.id)} className="absolute top-4 right-4 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                     <Trash2 size={18} />
                   </button>
                   
                   <div className="flex items-center gap-3 mb-3">
                     <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md flex items-center gap-1 ${
                       msg.targetType === 'global' ? 'bg-emerald-50 text-emerald-600' :
                       msg.targetType === 'class' ? 'bg-amber-50 text-amber-600' :
                       'bg-blue-50 text-blue-600'
                     }`}>
                       {msg.targetType === 'global' && <Users size={12}/>}
                       {msg.targetValue}
                     </span>
                     <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                       <Clock size={12} /> {new Date(msg.createdAt).toLocaleString()}
                     </span>
                   </div>
                   <h4 className="text-lg font-bold text-slate-800 mb-2">{msg.title}</h4>
                   <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{msg.body}</p>
                 </div>
               ))
            )}
          </div>
        </div>
      </div>

      {status.text && (
        <div className={`fixed bottom-8 right-8 p-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-8 ${
          status.type === 'success' ? 'bg-indigo-600' : 'bg-rose-600'
        } text-white z-50`}>
          {status.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span className="font-bold tracking-tight">{status.text}</span>
        </div>
      )}
    </div>
  );
};

export default MessageHub;
