import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { Send, Mail, Users, Inbox, Clock, CheckCircle, AlertCircle, Trash2, Loader2, KeyRound, Copy, Check, ShieldAlert } from 'lucide-react';
import { useGlobalClasses } from '../../utils/classUtils';

const MessageHub = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState('inbox'); // 'inbox' or 'broadcasts'
  const [copiedId, setCopiedId] = useState(null);
  const [status, setStatus] = useState({ type: '', text: '' });
  const classes = useGlobalClasses();
  
  const [compose, setCompose] = useState({
    title: '',
    body: '',
    targetType: 'global', // 'global', 'class', 'student'
    targetValue: '' // e.g. 'JSS1' or 'BDS/25/001', empty for global
  });

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
    if(!window.confirm("Are you sure you want to delete this notification record?")) return;
    try {
      await deleteDoc(doc(db, 'notifications', id));
      fetchMessages();
    } catch (e) {
      alert("Failed to delete");
    }
  };

  const copyPin = (pin, id) => {
    if (!pin) return;
    navigator.clipboard.writeText(pin);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const adminInboxMessages = messages.filter(m => m.targetType === 'admin' || m.type === 'admin_pin_alert' || m.type === 'admin_pin_record');
  const broadcastMessages = messages.filter(m => m.targetType !== 'admin' && m.type !== 'admin_pin_alert' && m.type !== 'admin_pin_record');

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
      
      {/* Compose Pane */}
      <div className="lg:col-span-1 space-y-6">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <Mail className="text-indigo-600" size={32} />
            Mailing Hub
          </h2>
          <p className="text-slate-500 mt-2">Manage student communications, PIN recovery alerts, and broadcast announcements.</p>
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
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 outline-none font-bold text-slate-800"
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

      {/* Messages Pane */}
      <div className="lg:col-span-2">
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 min-h-full flex flex-col">
          
          {/* Navigation Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-6">
            <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl">
              <button
                type="button"
                onClick={() => setActiveTab('inbox')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                  activeTab === 'inbox'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Inbox size={15} />
                <span>Admin Inbox</span>
                {adminInboxMessages.length > 0 && (
                  <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-black">
                    {adminInboxMessages.length}
                  </span>
                )}
              </button>
              
              <button
                type="button"
                onClick={() => setActiveTab('broadcasts')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                  activeTab === 'broadcasts'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Send size={15} />
                <span>Broadcast Outbox</span>
                <span className="bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.5 rounded-full font-black">
                  {broadcastMessages.length}
                </span>
              </button>
            </div>

            <span className="text-xs font-bold text-slate-400">
              {activeTab === 'inbox' ? `${adminInboxMessages.length} Alerts` : `${broadcastMessages.length} Sent`}
            </span>
          </div>

          {/* List Area */}
          <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2 flex-1">
            {loading ? (
               <div className="flex justify-center py-12"><Loader2 size={32} className="text-indigo-600 animate-spin" /></div>
            ) : activeTab === 'inbox' ? (
              adminInboxMessages.length === 0 ? (
                <div className="text-center py-16">
                  <Inbox size={48} className="mx-auto text-slate-200 mb-4" />
                  <h4 className="text-lg font-bold text-slate-600">Admin Inbox is Clear</h4>
                  <p className="text-slate-400 text-sm max-w-sm mx-auto mt-1">
                    Student PIN recovery requests without registered contact details and admin PIN alerts will appear here.
                  </p>
                </div>
              ) : (
                adminInboxMessages.map(msg => {
                  const pin = msg.generatedPin || msg.assignedPin;
                  return (
                    <div key={msg.id} className="p-5 rounded-2xl border border-indigo-100 bg-indigo-50/20 hover:border-indigo-300 transition-colors group relative">
                      <button onClick={() => deleteMessage(msg.id)} className="absolute top-4 right-4 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 size={18} />
                      </button>
                      
                      <div className="flex flex-wrap items-center gap-3 mb-3">
                        <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md bg-indigo-100 text-indigo-700 flex items-center gap-1.5">
                          <KeyRound size={12}/> {msg.type === 'admin_pin_alert' ? 'PIN Reset Request' : 'Admin PIN Record'}
                        </span>
                        {msg.className && (
                          <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                            Class: {msg.className}
                          </span>
                        )}
                        {msg.regNo && (
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {msg.regNo}
                          </span>
                        )}
                        <span className="text-xs text-slate-400 font-medium flex items-center gap-1 ml-auto">
                          <Clock size={12} /> {new Date(msg.createdAt).toLocaleString()}
                        </span>
                      </div>

                      <h4 className="text-base font-black text-slate-900 mb-2">{msg.title}</h4>
                      <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap font-medium">{msg.body}</p>

                      {pin && (
                        <div className="mt-4 p-3 bg-white rounded-xl border border-indigo-100 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-500">Assigned 6-Digit PIN:</span>
                            <span className="font-mono text-base font-black text-indigo-600 tracking-widest px-2 py-0.5 bg-indigo-50 rounded">
                              {pin}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyPin(pin, msg.id)}
                            className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
                          >
                            {copiedId === msg.id ? <><Check size={14} className="text-emerald-600" /> Copied</> : <><Copy size={14} /> Copy PIN</>}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )
            ) : (
              broadcastMessages.length === 0 ? (
                <div className="text-center py-16">
                  <Mail size={48} className="mx-auto text-slate-200 mb-4" />
                  <h4 className="text-lg font-bold text-slate-600">No broadcasts yet</h4>
                  <p className="text-slate-400 text-sm">Messages sent from the composer will appear here.</p>
                </div>
              ) : (
                broadcastMessages.map(msg => (
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
              )
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

