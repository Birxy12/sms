import React, { useState, useEffect } from 'react';
import { useStudentAuth } from '../../context/StudentAuthContext';
import { useTheme } from '../../context/ThemeContext';
import { db } from '../../lib/firebase';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { Mail, Loader2, Clock, ChevronDown, ChevronUp, Megaphone, BookOpen, User } from 'lucide-react';

const StudentInbox = () => {
  const { currentStudent } = useStudentAuth();
  const { primaryColor } = useTheme();
  const [inbox, setInbox]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  const regNum    = currentStudent?.regNo || currentStudent?.['REG NO'] || currentStudent?.REGNO || '';
  const className = currentStudent?.className || currentStudent?.classId || '';

  useEffect(() => {
    const fetch = async () => {
      try {
        const [s1, s2, s3] = await Promise.all([
          getDocs(query(collection(db, 'notifications'), where('targetType', '==', 'global'))),
          getDocs(query(collection(db, 'notifications'), where('targetType', '==', 'class'),   where('targetValue', '==', className))),
          getDocs(query(collection(db, 'notifications'), where('targetType', '==', 'student'), where('targetValue', '==', regNum))),
        ]);
        const msgs = [...s1.docs, ...s2.docs, ...s3.docs].map(d => ({ id: d.id, ...d.data() }));
        msgs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setInbox(Array.from(new Map(msgs.map(m => [m.id, m])).values()));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    if (currentStudent) fetch();
  }, [currentStudent]);

  const getTypeConfig = (type) => {
    switch(type) {
      case 'global':  return { label: 'School Broadcast', icon: Megaphone, bg: 'bg-emerald-600',  badge: 'bg-emerald-100 text-emerald-700' };
      case 'class':   return { label: 'Class Notice',     icon: BookOpen,  bg: 'bg-amber-600',    badge: 'bg-amber-100 text-amber-700'   };
      default:        return { label: 'Direct Message',   icon: User,      bg: 'bg-indigo-600',   badge: 'bg-indigo-100 text-indigo-700' };
    }
  };

  const PREVIEW_LEN = 200;

  return (
    <div className="dashboard-wrapper max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">School Inbox</h2>
        <p className="text-slate-500 text-sm mt-1">{inbox.length} message{inbox.length !== 1 ? 's' : ''} received</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={40} style={{ color: primaryColor }} className="animate-spin" />
        </div>
      ) : inbox.length === 0 ? (
        <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 py-20 text-center">
          <Mail size={56} className="text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-black text-slate-400 uppercase tracking-tight">Inbox is empty</h3>
          <p className="text-slate-400 text-sm mt-1 font-medium">Alerts, results, and announcements will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {inbox.map(msg => {
            const cfg = getTypeConfig(msg.targetType);
            const Icon = cfg.icon;
            const isExpanded = expandedId === msg.id;
            const body = msg.body || '';
            const isLong = body.length > PREVIEW_LEN;
            const displayBody = isExpanded || !isLong ? body : body.substring(0, PREVIEW_LEN) + '…';

            return (
              <div
                key={msg.id}
                className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all overflow-hidden"
              >
                {/* Coloured header strip */}
                <div className={`${cfg.bg} px-6 py-4 flex items-center justify-between gap-4`}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                      <Icon size={16} className="text-white" />
                    </div>
                    {/* Title on dark bg — white text */}
                    <h4 className="font-black text-white text-base leading-tight">{msg.title}</h4>
                  </div>
                  {/* Date on dark bg — white text */}
                  <span className="flex items-center gap-1.5 text-white/80 text-[11px] font-bold whitespace-nowrap shrink-0">
                    <Clock size={12} />
                    {new Date(msg.createdAt).toLocaleString()}
                  </span>
                </div>

                {/* Body */}
                <div className="px-6 py-5">
                  <p className="text-slate-600 leading-relaxed text-sm whitespace-pre-wrap font-medium">
                    {displayBody}
                  </p>

                  {/* Read more / less toggle */}
                  {isLong && (
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : msg.id)}
                      className="mt-3 flex items-center gap-1.5 text-indigo-600 font-black text-xs uppercase tracking-widest hover:text-indigo-800 transition-colors"
                    >
                      {isExpanded ? (
                        <><ChevronUp size={14} /> Show Less</>
                      ) : (
                        <><ChevronDown size={14} /> Read More</>
                      )}
                    </button>
                  )}

                  {/* Footer metadata */}
                  <div className="mt-4 pt-4 border-t border-slate-50 flex flex-wrap items-center gap-3">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${cfg.badge}`}>
                      {cfg.label}
                      {msg.targetType === 'class' && `: ${msg.targetValue}`}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      From: <span className="font-bold text-slate-500">{msg.sender || 'Administration'}</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentInbox;
