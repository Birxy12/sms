import React, { useState, useEffect } from 'react';
import { Heart, Globe, Mail, Phone, MessageSquare, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useTheme } from '../context/ThemeContext';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useStudentAuth } from '../context/StudentAuthContext';
import bdsLogo from '../assets/bdslogo.jpg';
import '../assets/Footer.css';

const MainFooter = () => {
  const { schoolName, schoolLogo, footerBg, footerTextColor } = useTheme();
  const { currentAdmin } = useAdminAuth();
  const { currentStudent } = useStudentAuth();
  const [contactData, setContactData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const currentYear = new Date().getFullYear();

  const displayName = schoolName || 'Birxy SMS';
  const displayLogo = schoolLogo || bdsLogo;

  const apkDownloadUrl = 'https://github.com/Birxy12/sms/raw/main/app-debug.apk';
  const iosDownloadUrl = '#'; // TODO: Update with actual iOS App Store link

  const quickLinks = [
    { to: '/check-result', label: 'Check Result' },
    { to: '/about', label: 'About Us' },
    { to: '/blog', label: 'School Blog' },
    { to: '/leaderboard', label: 'Leaderboard' },
    { to: '/fame', label: 'Wall of Fame' },
    { to: '/contact', label: 'Support Hub' },
    { to: '/privacy', label: 'Privacy Policy' },
    { to: '/terms', label: 'Terms of Service' },
    { href: apkDownloadUrl, label: '⚡ Download Android App', external: true },
    { href: iosDownloadUrl, label: '🍎 Download iOS App', external: true },
  ];

  const getDashboardPath = () => {
    if (currentStudent) return '/students';
    if (currentAdmin) {
      const role = currentAdmin.role;
      if (role === 'admin') return '/admin';
      if (role === 'principal') return '/principal';
      if (role === 'teacher') return '/teachers';
      if (role === 'bursar') return '/finance';
    }
    return null;
  };

  const dashboardPath = getDashboardPath();
  if (dashboardPath) {
    quickLinks.unshift({ to: dashboardPath, label: 'My Dashboard' });
  }

  const socialLinks = [
    { 
      name: 'Facebook', 
      href: 'https://www.facebook.com/share/1ATYxa8bBS/?mibextid=wwXIfr', 
      icon: <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    },
    { 
      name: 'Twitter', 
      href: 'https://twitter.com', 
      icon: <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
    },
    { 
      name: 'Instagram', 
      href: 'https://instagram.com', 
      icon: (
        <>
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
        </>
      )
    },
    { 
      name: 'WhatsApp', 
      href: 'https://chat.whatsapp.com/JV4gFARWHqU9oYpRSWiZFt', 
      icon: (
        <>
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </>
      )
    },
  ];

  useEffect(() => {
    let mounted = true;
    
    const fetchContact = async () => {
      try {
        setLoading(true);
        setError(null);
        const docRef = doc(db, 'settings', 'public_content');
        const docSnap = await getDoc(docRef);
        
        if (mounted) {
          if (docSnap.exists() && docSnap.data().contactDetails) {
            setContactData(docSnap.data().contactDetails);
          }
        }
      } catch (e) {
        if (mounted) {
          setError('Unable to load contact details');
          console.error('Error fetching footer contact:', e);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchContact();
    return () => { mounted = false; };
  }, []);

  const contactInfo = [
    { 
      icon: <Globe size={16} />, 
      text: contactData?.address || '123 Education Lane, Digital City',
      label: 'Address'
    },
    { 
      icon: <Phone size={16} />, 
      text: contactData?.phone || '+1 (234) 567-890',
      label: 'Phone',
      href: `tel:${(contactData?.phone || '+1234567890').replace(/\D/g, '')}`
    },
    { 
      icon: <Mail size={16} />, 
      text: contactData?.email || 'hello@schoolportal.edu',
      label: 'Email',
      href: `mailto:${contactData?.email || 'hello@schoolportal.edu'}`
    },
  ];

  return (
    <footer 
      className="main-footer" 
      style={{ backgroundColor: footerBg, color: footerTextColor }}
    >
      {/* Top decorative wave or accent */}
      <div 
        className="footer-accent" 
        style={{ 
          height: '4px', 
          background: 'linear-gradient(90deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0.1) 100%)' 
        }} 
      />

      <div className="footer-content" style={{ padding: '32px 24px 16px' }}>
        {/* Brand Column */}
        <div className="f-logo" style={{ maxWidth: '320px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <img 
              src={displayLogo} 
              alt={`${displayName} logo`} 
              style={{ 
                height: '64px', 
                width: '64px', 
                objectFit: 'contain', 
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
              }} 
              loading="lazy"
            />
            <h2 style={{ 
              fontSize: '26px', 
              fontWeight: 800, 
              color: footerTextColor,
              letterSpacing: '-0.5px',
              lineHeight: 1.2
            }}>
              {displayName}<span style={{ color: 'var(--accent-color, #6366f1)' }}>.</span>
            </h2>
          </div>
          
          <p style={{ 
            color: footerTextColor, 
            opacity: 0.75, 
            fontSize: '15px', 
            lineHeight: 1.7,
            marginBottom: '24px'
          }}>
            Empowering the next generation with excellence, integrity, and innovation in education. Building futures, one student at a time.
          </p>

          {/* Social Links moved to brand column for better flow */}
          <div className="social-links" style={{ display: 'flex', gap: '12px' }}>
            {socialLinks.map((social) => (
              <a 
                key={social.name}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Follow us on ${social.name}`}
                className="social-icon"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  color: footerTextColor,
                  transition: 'all 0.3s ease',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)';
                  e.currentTarget.style.transform = 'translateY(-3px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {social.icon}
                </svg>
              </a>
            ))}
          </div>
        </div>

        {/* Quick Links Column */}
        <div className="f-links">
          <h4 style={{ 
            color: footerTextColor, 
            fontWeight: 700, 
            marginBottom: '20px',
            fontSize: '16px',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            opacity: 0.9
          }}>
            Quick Links
          </h4>
          <nav aria-label="Footer navigation">
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {quickLinks.map((link) => (
                <li key={link.to || link.href} style={{ marginBottom: '10px' }}>
                  {link.external ? (
                    <a
                      href={link.href}
                      download
                      style={{
                        color: footerTextColor,
                        opacity: 0.7,
                        textDecoration: 'none',
                        fontSize: '14px',
                        transition: 'all 0.2s ease',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = '1';
                        e.currentTarget.style.paddingLeft = '4px';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = '0.7';
                        e.currentTarget.style.paddingLeft = '0';
                      }}
                    >
                      <span style={{ 
                        width: '0', 
                        height: '0', 
                        borderTop: '4px solid transparent',
                        borderBottom: '4px solid transparent',
                        borderLeft: `4px solid ${footerTextColor}`,
                        opacity: 0.4,
                        transition: 'opacity 0.2s'
                      }} />
                      {link.label}
                    </a>
                  ) : (
                    <Link 
                      to={link.to}
                      style={{
                        color: footerTextColor,
                        opacity: 0.7,
                        textDecoration: 'none',
                        fontSize: '14px',
                        transition: 'all 0.2s ease',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = '1';
                        e.currentTarget.style.paddingLeft = '4px';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = '0.7';
                        e.currentTarget.style.paddingLeft = '0';
                      }}
                    >
                      <span style={{ 
                        width: '0', 
                        height: '0', 
                        borderTop: '4px solid transparent',
                        borderBottom: '4px solid transparent',
                        borderLeft: `4px solid ${footerTextColor}`,
                        opacity: 0.4,
                        transition: 'opacity 0.2s'
                      }} />
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Contact Column */}
        <div className="f-contact">
          <h4 style={{ 
            color: footerTextColor, 
            fontWeight: 700, 
            marginBottom: '20px',
            fontSize: '16px',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            opacity: 0.9
          }}>
            Contact Us
          </h4>

          {loading ? (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              opacity: 0.6,
              fontSize: '14px'
            }}>
              <div style={{
                width: '16px',
                height: '16px',
                border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: footerTextColor,
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
              }} />
              Loading contact info...
            </div>
          ) : error ? (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              opacity: 0.7,
              fontSize: '14px',
              color: '#fca5a5'
            }}>
              <MessageSquare size={16} />
              {error}
            </div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {contactInfo.map((item) => (
                <li 
                  key={item.label}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    gap: '10px',
                    marginBottom: '14px',
                    fontSize: '14px',
                    lineHeight: 1.5
                  }}
                >
                  <span style={{ 
                    marginTop: '2px', 
                    opacity: 0.6,
                    flexShrink: 0
                  }}>
                    {item.icon}
                  </span>
                  {item.href ? (
                    <a 
                      href={item.href}
                      style={{ 
                        color: footerTextColor, 
                        opacity: 0.8, 
                        textDecoration: 'none',
                        transition: 'opacity 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '0.8'}
                    >
                      {item.text}
                    </a>
                  ) : (
                    <span style={{ opacity: 0.8 }}>{item.text}</span>
                  )}
                </li>
              ))}
            </ul>
          )}

          {/* Made with love badge */}
          <div 
            className="made-with" 
            style={{ 
              marginTop: '28px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              opacity: 0.6
            }}
          >
            Made with 
            <Heart 
              size={14} 
              className="text-rose-500 fill-rose-500" 
              style={{ animation: 'pulse 1.5s ease-in-out infinite' }}
            /> 
            for Excellence
          </div>
        </div>

        {/* Newsletter Column - NEW */}
        <div className="f-newsletter">
          <h4 style={{ 
            color: footerTextColor, 
            fontWeight: 700, 
            marginBottom: '20px',
            fontSize: '16px',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            opacity: 0.9
          }}>
            Stay Updated
          </h4>
          <p style={{ 
            color: footerTextColor, 
            opacity: 0.7, 
            fontSize: '14px', 
            lineHeight: 1.6,
            marginBottom: '16px'
          }}>
            Subscribe to our newsletter for the latest school news and events.
          </p>
          <form 
            onSubmit={(e) => e.preventDefault()}
            style={{ display: 'flex', gap: '8px' }}
          >
            <input
              type="email"
              placeholder="Enter your email"
              aria-label="Email for newsletter"
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.15)',
                backgroundColor: 'rgba(255,255,255,0.05)',
                color: footerTextColor,
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'}
            />
            <button
              type="submit"
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'var(--accent-color, #6366f1)',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.filter = 'brightness(1.15)';
                e.currentTarget.style.transform = 'scale(1.02)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.filter = 'brightness(1)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              Subscribe
            </button>
          </form>
        </div>
      </div>

      {/* Bottom Bar */}
      <div 
        className="f-bottom" 
        style={{ 
          borderTop: '1px solid rgba(255,255,255,0.08)',
          padding: '12px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <span style={{ fontSize: '13px', opacity: 0.6 }}>
          &copy; {currentYear} {displayName}. All rights reserved.
        </span>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <a
            href={apkDownloadUrl}
            download
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '8px',
              backgroundColor: '#10b981',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'all 0.2s ease',
              border: 'none',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.filter = 'brightness(1.2)';
              e.currentTarget.style.transform = 'scale(1.03)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.filter = 'brightness(1)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <Smartphone size={14} />
            Android APK
          </a>
          
          <a
            href={iosDownloadUrl}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '8px',
              backgroundColor: '#4f46e5',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'all 0.2s ease',
              border: 'none',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.filter = 'brightness(1.2)';
              e.currentTarget.style.transform = 'scale(1.03)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.filter = 'brightness(1)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <Smartphone size={14} />
            iOS App
          </a>
        </div>
        <span style={{ fontSize: '12px', opacity: 0.4 }}>
          Designed with care for our community
        </span>
      </div>

      {/* CSS for animations */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
      `}</style>
    </footer>
  );
};

export default MainFooter;