import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { useTheme } from '../../context/ThemeContext';
import Navbar from '../../components/Navbar';
import MainFooter from '../../components/MainFooter';
import {
  Search, GraduationCap, Calendar, MapPin, Heart, Mail,
  Sparkles, Trophy, BookOpen, X
} from 'lucide-react';

const FamePage = () => {
  const { primaryColor } = useTheme();
  const accent = primaryColor || '#4f46e5';

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('All');
  const [selected, setSelected] = useState(null); // portrait modal

  useEffect(() => {
    const fetch = async () => {
      try {
        const snap = await getDocs(collection(db, 'fame_students'));
        setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error('Failed to load Wall of Fame:', e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const filtered = students.filter(s => {
    const q = searchTerm.toLowerCase();
    const matchSearch =
      s.name?.toLowerCase().includes(q) ||
      s.ambition?.toLowerCase().includes(q) ||
      s.stateOfOrigin?.toLowerCase().includes(q);
    const matchClass = classFilter === 'All' || s.className === classFilter;
    return matchSearch && matchClass;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />

      {/* ── Hero ── */}
      <section style={{
        background: 'linear-gradient(160deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
        padding: '80px 24px 60px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative orbs */}
        <div style={{
          position: 'absolute', width: 400, height: 400, borderRadius: '50%',
          background: `radial-gradient(circle, ${accent}33, transparent 70%)`,
          top: -100, right: -100, pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute', width: 300, height: 300, borderRadius: '50%',
          background: 'radial-gradient(circle, #7c3aed33, transparent 70%)',
          bottom: -80, left: -60, pointerEvents: 'none'
        }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 720, margin: '0 auto' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)',
            padding: '6px 18px', borderRadius: 999, marginBottom: 24,
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <Sparkles size={13} style={{ color: '#fcd34d' }} />
            <span style={{ color: '#fcd34d', fontSize: 11, fontWeight: 900, letterSpacing: 1.5, textTransform: 'uppercase' }}>
              Class of 2025
            </span>
          </div>

          <h1 style={{
            margin: '0 0 16px', fontSize: 'clamp(36px, 7vw, 72px)',
            fontWeight: 900, lineHeight: 1.05,
            background: 'linear-gradient(135deg, #fff 0%, #c7d2fe 60%, #a5b4fc 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            fontFamily: "'Inter', sans-serif"
          }}>
            Wall of <span style={{ WebkitTextFillColor: accent }}>Fame</span>
          </h1>

          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 17, lineHeight: 1.7, fontWeight: 400, margin: '0 0 36px' }}>
            Celebrating the brilliance, ambitions, and achievements of our graduating SS3 students.
            Each portrait tells a story of hard work and promise.
          </p>

          {/* Stats row */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 32, flexWrap: 'wrap', marginBottom: 40 }}>
            {[
              { icon: <GraduationCap size={18} />, label: 'Total Graduates', value: students.length },
              { icon: <BookOpen size={18} />, label: 'Science Class', value: students.filter(s => s.className === 'Science').length },
              { icon: <Trophy size={18} />, label: 'Art Class', value: students.filter(s => s.className === 'Art').length },
            ].map(stat => (
              <div key={stat.label} style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#a5b4fc', marginBottom: 4 }}>
                  {stat.icon}
                  <span style={{ fontSize: 30, fontWeight: 900, color: '#fff' }}>{stat.value}</span>
                </div>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                  {stat.label}
                </span>
              </div>
            ))}
          </div>

          {/* Search + Filter */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: 380 }}>
              <Search size={16} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                placeholder="Search name, ambition, state…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  width: '100%', padding: '13px 16px 13px 44px', borderRadius: 16,
                  border: '1.5px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)',
                  backdropFilter: 'blur(8px)', color: '#fff', fontSize: 14, fontWeight: 500,
                  outline: 'none', boxSizing: 'border-box'
                }}
                onFocus={e => e.target.style.borderColor = accent}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
              />
            </div>
            {['All', 'Science', 'Art'].map(c => (
              <button key={c} onClick={() => setClassFilter(c)} style={{
                padding: '13px 22px', borderRadius: 16, border: '1.5px solid rgba(255,255,255,0.12)',
                background: classFilter === c ? accent : 'rgba(255,255,255,0.06)',
                color: classFilter === c ? '#fff' : 'rgba(255,255,255,0.65)',
                fontWeight: 800, fontSize: 12, cursor: 'pointer', transition: 'all 0.2s',
                backdropFilter: 'blur(8px)'
              }}>
                {c === 'All' ? 'All Classes' : `${c} Class`}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Portraits Grid ── */}
      <section style={{
        background: '#f8fafc', flex: 1, padding: '56px 24px 80px'
      }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '80px 0' }}>
              <div style={{
                width: 48, height: 48, border: `3px solid #e2e8f0`,
                borderTopColor: accent, borderRadius: '50%',
                animation: 'spin 0.8s linear infinite', margin: '0 auto 16px'
              }} />
              <p style={{ color: '#94a3b8', fontWeight: 700 }}>Loading portraits…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 24px', background: '#fff', borderRadius: 24, border: '1px solid #f1f5f9' }}>
              <GraduationCap size={52} style={{ color: '#cbd5e1', margin: '0 auto 16px', display: 'block' }} />
              <h3 style={{ fontWeight: 900, color: '#475569', margin: '0 0 8px' }}>No graduates found</h3>
              <p style={{ color: '#94a3b8', fontSize: 14 }}>Try adjusting your search or filter.</p>
            </div>
          ) : (
            <>
              <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, fontWeight: 700, marginBottom: 32 }}>
                Showing {filtered.length} of {students.length} graduates
              </p>
              {/* 5-per-row grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: 20
              }}
                className="fame-grid"
              >
                {filtered.map(s => (
                  <div
                    key={s.id}
                    onClick={() => setSelected(s)}
                    style={{
                      background: '#fff', borderRadius: 20, overflow: 'hidden',
                      border: '1px solid #f1f5f9',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
                      cursor: 'pointer', transition: 'all 0.25s',
                      display: 'flex', flexDirection: 'column'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'translateY(-6px)';
                      e.currentTarget.style.boxShadow = `0 20px 50px rgba(79,70,229,0.15)`;
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.06)';
                    }}
                  >
                    {/* Portrait Photo */}
                    <div style={{ position: 'relative', height: 200, overflow: 'hidden', background: '#e2e8f0' }}>
                      <img
                        src={s.photo}
                        alt={s.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s' }}
                        onError={e => { e.target.style.display = 'none'; }}
                      />
                      {/* Class badge */}
                      <span style={{
                        position: 'absolute', top: 10, right: 10,
                        padding: '3px 10px', borderRadius: 999, fontSize: 9,
                        fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.5,
                        background: s.className === 'Science' ? '#1d4ed8' : '#c2410c',
                        color: '#fff', boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                      }}>{s.className}</span>
                    </div>

                    {/* Info */}
                    <div style={{ padding: '14px 14px 16px', flex: 1 }}>
                      <h3 style={{
                        margin: '0 0 6px', fontSize: 14, fontWeight: 900,
                        color: '#1e293b', lineHeight: 1.3
                      }}>{s.name}</h3>
                      {s.ambition && (
                        <p style={{
                          margin: 0, fontSize: 11, color: '#64748b', fontStyle: 'italic',
                          fontWeight: 600, lineHeight: 1.4,
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                        }}>
                          "{s.ambition}"
                        </p>
                      )}
                      <div style={{
                        marginTop: 10, paddingTop: 10, borderTop: '1px solid #f1f5f9',
                        fontSize: 10, color: '#94a3b8', fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: 4
                      }}>
                        <MapPin size={9} /> {s.stateOfOrigin || 'N/A'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── Portrait Detail Modal ── */}
      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 28, overflow: 'hidden',
              width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto',
              boxShadow: '0 60px 120px rgba(0,0,0,0.4)',
              animation: 'modalIn 0.25s ease'
            }}
          >
            {/* Photo header */}
            <div style={{ position: 'relative', height: 280, background: '#e2e8f0', overflow: 'hidden' }}>
              <img
                src={selected.photo}
                alt={selected.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)'
              }} />
              <button
                onClick={() => setSelected(null)}
                style={{
                  position: 'absolute', top: 16, right: 16,
                  background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
                  border: 'none', borderRadius: 999, padding: 8, cursor: 'pointer',
                  color: '#fff', display: 'flex'
                }}
              ><X size={18} /></button>
              <div style={{ position: 'absolute', bottom: 20, left: 24 }}>
                <span style={{
                  padding: '4px 12px', borderRadius: 999, fontSize: 10, fontWeight: 900,
                  background: selected.className === 'Science' ? '#1d4ed8' : '#c2410c',
                  color: '#fff', marginBottom: 8, display: 'inline-block'
                }}>{selected.className} Class</span>
                <h2 style={{ margin: 0, color: '#fff', fontSize: 26, fontWeight: 900, textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                  {selected.name}
                </h2>
              </div>
            </div>

            {/* Details */}
            <div style={{ padding: '28px 28px 32px' }}>
              {selected.ambition && (
                <div style={{
                  background: '#f5f3ff', borderLeft: `4px solid ${accent}`,
                  borderRadius: '0 12px 12px 0', padding: '14px 18px', marginBottom: 24
                }}>
                  <p style={{ margin: 0, fontStyle: 'italic', color: '#4f46e5', fontWeight: 700, fontSize: 14 }}>
                    "{selected.ambition}"
                  </p>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[
                  { icon: <Calendar size={16} />, label: 'Date of Birth', value: selected.dob ? new Date(selected.dob).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A' },
                  { icon: <MapPin size={16} />, label: 'State of Origin', value: selected.stateOfOrigin || 'N/A' },
                  { icon: <Heart size={16} />, label: 'Hobbies', value: selected.hobbies || 'N/A' },
                  { icon: <Mail size={16} />, label: 'Contact', value: selected.contact || 'N/A' },
                ].map(item => (
                  <div key={item.label} style={{
                    background: '#f8fafc', borderRadius: 14, padding: '14px 16px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: accent, marginBottom: 6 }}>
                      {item.icon}
                      <span style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.5, color: '#94a3b8' }}>{item.label}</span>
                    </div>
                    <p style={{ margin: 0, fontWeight: 700, color: '#1e293b', fontSize: 13, wordBreak: 'break-word' }}>{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <MainFooter />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes modalIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @media (max-width: 1200px) { .fame-grid { grid-template-columns: repeat(4, 1fr) !important; } }
        @media (max-width: 900px)  { .fame-grid { grid-template-columns: repeat(3, 1fr) !important; } }
        @media (max-width: 600px)  { .fame-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 380px)  { .fame-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
};

export default FamePage;
