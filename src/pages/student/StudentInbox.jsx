import React, { useState, useEffect } from 'react';
import { useStudentAuth } from '../../context/StudentAuthContext';
import { useTheme } from '../../context/ThemeContext';
import { db } from '../../lib/firebase';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { Mail, Loader2, Clock } from 'lucide-react';

const StudentInbox = () => {
  const { currentStudent } = useStudentAuth();
  const { primaryColor } = useTheme();
  const [inbox, setInbox]   = useState([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="dashboard-wrapper">
      <h2 style={{ fontWeight: '900', fontSize: '24px', marginBottom: '8px', color: '#1e293b' }}>School Inbox</h2>
      <p style={{ color: '#64748b', marginBottom: '24px', fontSize: '14px' }}>{inbox.length} message{inbox.length !== 1 ? 's' : ''} received</p>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px' }}>
          <Loader2 size={40} style={{ color: primaryColor, animation: 'spin 1s linear infinite', margin: '0 auto', display: 'block' }} />
        </div>
      ) : inbox.length === 0 ? (
        <div className="card-white" style={{ textAlign: 'center', padding: '80px 40px', border: '2px dashed #e2e8f0' }}>
          <Mail size={56} style={{ color: '#cbd5e1', margin: '0 auto 16px', display: 'block' }} />
          <h3 style={{ color: '#475569', marginBottom: '8px' }}>Your inbox is empty</h3>
          <p style={{ color: '#94a3b8', margin: 0 }}>Alerts, result notifications, and announcements from your school will appear here.</p>
        </div>
      ) : (
        inbox.map(msg => (
          <div key={msg.id} className="card-white" style={{ marginBottom: '16px', borderLeft: `4px solid ${primaryColor}`, padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
              <h4 style={{ margin: 0, fontWeight: '800', fontSize: '16px', color: '#1e293b' }}>{msg.title}</h4>
              <span style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                <Clock size={13} /> {new Date(msg.createdAt).toLocaleString()}
              </span>
            </div>
            <p style={{ margin: '0 0 14px', color: '#475569', lineHeight: '1.7', whiteSpace: 'pre-wrap', fontSize: '15px' }}>{msg.body}</p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{
                fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px',
                padding: '3px 10px', borderRadius: '6px',
                background: msg.targetType === 'global' ? '#f0fdf4' : msg.targetType === 'class' ? '#fefce8' : '#eff6ff',
                color:      msg.targetType === 'global' ? '#166534' : msg.targetType === 'class' ? '#854d0e' : '#1e40af',
              }}>
                {msg.targetType === 'global' ? '📢 School Broadcast' : msg.targetType === 'class' ? `🏫 Class: ${msg.targetValue}` : '✉️ Direct Message'}
              </span>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>From: {msg.sender || 'Administration'}</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default StudentInbox;
