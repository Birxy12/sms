import React from 'react';
import { Download, Sparkles, ArrowRight } from 'lucide-react';

const UpdateModal = ({ latestVersion }) => {
  const downloadLink = "https://github.com/Birxy12/sms/raw/main/app-debug.apk";

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1.5rem',
      background: 'rgba(7,12,26,0.85)',
    }}>
      {/* Card */}
      <div style={{
        width: '100%', maxWidth: '360px',
        background: 'white',
        borderRadius: '1.75rem',
        overflow: 'hidden',
        boxShadow: '0 32px 64px rgba(0,0,0,0.4), 0 8px 24px rgba(79,70,229,0.2)',
        animation: 'fadeInUp 0.35s cubic-bezier(0.4,0,0.2,1)',
      }}>
        {/* Header gradient banner */}
        <div style={{
          padding: '2rem 1.75rem 1.5rem',
          background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 50%, #818cf8 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Decorative circle */}
          <div style={{
            position: 'absolute', top: '-30px', right: '-30px',
            width: '140px', height: '140px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)',
          }} />
          <div style={{
            position: 'absolute', bottom: '-20px', left: '-20px',
            width: '80px', height: '80px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
          }} />

          <div style={{
            width: '52px', height: '52px',
            borderRadius: '16px',
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '1rem',
          }}>
            <Sparkles size={26} color="white" />
          </div>

          <h2 style={{
            margin: 0, color: 'white', fontSize: '1.25rem',
            fontWeight: '900', letterSpacing: '-0.02em',
            fontFamily: "'Outfit', sans-serif",
          }}>
            Update Available
          </h2>
          <p style={{
            margin: '0.375rem 0 0', color: 'rgba(255,255,255,0.75)',
            fontSize: '0.8125rem', fontWeight: '600',
          }}>
            Version {latestVersion} is ready to install
          </p>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem 1.75rem 1.75rem' }}>
          <p style={{
            color: '#475569', fontSize: '0.875rem',
            lineHeight: '1.65', margin: '0 0 1.5rem',
          }}>
            A new version of the app is now available with the latest features, improvements and bug fixes. Install it directly over your existing app — no uninstall needed.
          </p>

          <a
            href={downloadLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '0.625rem',
              width: '100%', padding: '0.9375rem',
              borderRadius: '0.875rem',
              background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
              color: 'white', fontWeight: '800',
              fontSize: '0.9375rem', textDecoration: 'none',
              boxShadow: '0 8px 24px rgba(79,70,229,0.35)',
              transition: 'all 0.2s ease',
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            <Download size={18} />
            Download Update
            <ArrowRight size={16} />
          </a>

          <p style={{
            textAlign: 'center',
            fontSize: '0.75rem',
            color: '#94a3b8',
            marginTop: '1rem',
            marginBottom: 0,
            lineHeight: '1.5',
          }}>
            Tap "Download", then open the APK file from your notification bar to install.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};

export default UpdateModal;
