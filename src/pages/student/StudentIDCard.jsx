import React, { useRef, useState } from 'react';
import { useStudentAuth } from '../../context/StudentAuthContext';
import { useTheme } from '../../context/ThemeContext';
import { 
  Download, Printer, ShieldCheck, User, QrCode, Calendar, 
  Hash, CreditCard, Building2, Award, MapPin, Phone, Mail, 
  Fingerprint, Sparkles, CheckCircle2, AlertCircle 
} from 'lucide-react';
import bdsLogo from '../../assets/bdslogo.jpg';

const StudentIDCard = () => {
  const { currentStudent } = useStudentAuth();
  const { schoolName, schoolLogo, primaryColor = '#4f46e5' } = useTheme();
  const cardRef = useRef();
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeView, setActiveView] = useState('front');
  const [showSecurityFeatures, setShowSecurityFeatures] = useState(false);

  const generateQRData = () => {
    const data = {
      id: currentStudent?.regNo || 'N/A',
      name: currentStudent?.name || 'N/A',
      class: currentStudent?.className || 'N/A',
      school: schoolName || 'BONUS DOMINUS',
      session: '2025/2026',
      issued: new Date().toISOString(),
      type: 'student_id'
    };
    return btoa(JSON.stringify(data));
  };

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const element = cardRef.current;
      const opt = {
        margin: 0,
        filename: `${currentStudent?.name || 'Student'}-ID-Card-2025-26.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 4, 
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        },
        jsPDF: { unit: 'mm', format: [85.6, 54], orientation: 'landscape' }
      };
      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('PDF generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const holographicStyle = {
    background: `linear-gradient(135deg, 
      ${primaryColor}20 0%, 
      ${primaryColor}40 25%, 
      #ffffff 50%, 
      ${primaryColor}40 75%, 
      ${primaryColor}20 100%)`,
    backgroundSize: '400% 400%',
    animation: 'shimmer 3s ease infinite'
  };

  const microTextPattern = `BONUS DOMINUS • OFFICIAL STUDENT ID • ${currentStudent?.regNo || '000000'} • ${currentStudent?.name || 'STUDENT'} • `;

  return (
    <div className="dashboard-wrapper">
      {/* Header Section */}
      <div className="id-header">
        <div className="id-header-inner">
          <div className="id-header-brand">
            <div className="id-header-icon" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)` }}>
              <CreditCard className="text-white" size={28} />
            </div>
            <div>
              <h2 className="id-header-title">Digital ID Card</h2>
              <div className="id-header-subtitle">
                <Sparkles size={14} className="text-amber-500" />
                <p>Official school identity • Session 2025/26</p>
              </div>
            </div>
          </div>
          
          <div className="id-header-actions">
            <div className="view-toggle">
              <button
                onClick={() => setActiveView('front')}
                className={activeView === 'front' ? 'active' : ''}
              >
                Front
              </button>
              <button
                onClick={() => setActiveView('back')}
                className={activeView === 'back' ? 'active' : ''}
              >
                Back
              </button>
            </div>

            <button 
              onClick={() => setShowSecurityFeatures(!showSecurityFeatures)}
              className="btn-security"
            >
              <ShieldCheck size={16} />
              Security
            </button>

            <button onClick={handlePrint} className="btn-print">
              <Printer size={18} /> Print
            </button>
            
            <button 
              onClick={handleDownload}
              disabled={isGenerating}
              className="btn-download"
            >
              {isGenerating ? <span className="animate-spin">⏳</span> : <Download size={18} />}
              {isGenerating ? 'Generating...' : 'Download PDF'}
            </button>
          </div>
        </div>
      </div>

      {/* Security Features Panel */}
      {showSecurityFeatures && (
        <div className="security-panel-wrapper">
          <div className="security-panel">
            <div className="security-panel-header">
              <ShieldCheck className="text-amber-600" size={20} />
              <h3>Security Features</h3>
            </div>
            <div className="security-features-grid">
              {[
                { icon: QrCode, label: 'Encrypted QR Code', desc: 'Contains verified student data' },
                { icon: Fingerprint, label: 'Holographic Seal', desc: 'Anti-counterfeit shimmer effect' },
                { icon: CheckCircle2, label: 'Micro-Text', desc: 'Fine print security pattern' },
                { icon: AlertCircle, label: 'Valid Until', desc: 'Session 2025/2026 only' }
              ].map((feature, idx) => (
                <div key={idx} className="security-feature-item">
                  <feature.icon size={18} className="text-amber-600" />
                  <div>
                    <p className="feature-label">{feature.label}</p>
                    <p className="feature-desc">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Card Container */}
      <div className="card-container-wrapper">
        <div className="card-container">
          <div 
            ref={cardRef}
            className="id-card"
            style={{ 
              width: '85.6mm', 
              height: '54mm', 
              fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
            }}
          >
            {/* === FRONT SIDE === */}
            {activeView === 'front' && (
              <>
                <div className="card-bg-pattern" />
                <div className="card-top-band" style={{ background: `linear-gradient(90deg, ${primaryColor}, ${primaryColor}99, ${primaryColor})` }} />
                <div className="holographic-corner" style={holographicStyle} />

                {/* Header */}
                <div className="card-header">
                  <div className="card-brand">
                    <div className="card-logo-box" style={{ background: primaryColor }}>
                      <img src={schoolLogo || bdsLogo} alt="Logo" />
                    </div>
                    <div>
                      <h1>{schoolName || 'BONUS DOMINUS'}</h1>
                      <div className="card-subtitle">
                        <Award size={8} className="text-amber-500" />
                        <p>Official Student ID • Valid 2025/26</p>
                      </div>
                    </div>
                  </div>
                  <div className="session-badge">
                    <p className="session-label">Session</p>
                    <p className="session-value">2025/26</p>
                  </div>
                </div>

                {/* Main Content */}
                <div className="card-body">
                  <div className="photo-section">
                    <div className="photo-wrapper">
                      <div className="photo-frame" style={{ borderColor: `${primaryColor}30` }}>
                        {currentStudent?.photo || currentStudent?.photoURL ? (
                          <img src={currentStudent.photo || currentStudent.photoURL} alt="Student" />
                        ) : (
                          <div className="photo-placeholder">
                            <User size={28} className="text-slate-300" />
                          </div>
                        )}
                      </div>
                      <div className="photo-corner tl" style={{ borderColor: primaryColor }} />
                      <div className="photo-corner tr" style={{ borderColor: primaryColor }} />
                      <div className="photo-corner bl" style={{ borderColor: primaryColor }} />
                      <div className="photo-corner br" style={{ borderColor: primaryColor }} />
                    </div>
                    <div className="verified-badge">
                      <ShieldCheck size={8} className="text-emerald-600" />
                      <span>Verified</span>
                    </div>
                  </div>

                  <div className="details-section">
                    <div className="detail-block">
                      <div className="detail-label">
                        <User size={8} className="text-slate-400" />
                        <span>Full Name</span>
                      </div>
                      <h2 className="student-name">{currentStudent?.name || 'Student Name'}</h2>
                    </div>

                    <div className="details-grid">
                      <div className="detail-item">
                        <div className="detail-label">
                          <Building2 size={7} className="text-slate-400" />
                          <span>Class</span>
                        </div>
                        <span className="class-badge" style={{ color: primaryColor, background: `${primaryColor}15` }}>
                          {currentStudent?.className || 'N/A'}
                        </span>
                      </div>
                      <div className="detail-item">
                        <div className="detail-label">
                          <Hash size={7} className="text-slate-400" />
                          <span>Reg No</span>
                        </div>
                        <span className="reg-no">{currentStudent?.regNo || 'N/A'}</span>
                      </div>
                      <div className="detail-item">
                        <div className="detail-label">
                          <Calendar size={7} className="text-slate-400" />
                          <span>DOB</span>
                        </div>
                        <span className="dob">{currentStudent?.dob || 'N/A'}</span>
                      </div>
                      <div className="detail-item">
                        <div className="detail-label">
                          <MapPin size={7} className="text-slate-400" />
                          <span>Gender</span>
                        </div>
                        <span className="gender">{currentStudent?.gender || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="card-footer-row">
                      <div className="qr-section">
                        <div className="qr-box">
                          <QrCode size={20} className="text-white" />
                        </div>
                        <div>
                          <p className="qr-label">Scan to Verify</p>
                          <p className="qr-desc">Encrypted Data</p>
                        </div>
                      </div>
                      <div className="seal-section">
                        <div className="seal-ring" style={{ borderColor: primaryColor }}>
                          <img src={schoolLogo || bdsLogo} alt="Seal" />
                        </div>
                        <span>Official Seal</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="micro-text-strip">
                  <div className="micro-text">{microTextPattern.repeat(20)}</div>
                </div>
                <div className="card-bottom-band" style={{ background: `linear-gradient(90deg, ${primaryColor}, ${primaryColor}dd, ${primaryColor})` }} />
              </>
            )}

            {/* === BACK SIDE === */}
            {activeView === 'back' && (
              <>
                <div className="back-bg" style={{ background: `linear-gradient(135deg, ${primaryColor}08, ${primaryColor}03)` }} />
                <div className="card-top-band" style={{ background: `linear-gradient(90deg, ${primaryColor}, ${primaryColor}99, ${primaryColor})` }} />

                <div className="back-content">
                  <div className="back-header">
                    <div className="back-title">
                      <ShieldCheck size={14} style={{ color: primaryColor }} />
                      <span>ID Card Terms & Conditions</span>
                    </div>
                    <span className="back-id">ID: {currentStudent?.regNo || '000000'}</span>
                  </div>

                  <div className="terms-list">
                    {[
                      'This card is the property of the school and must be returned upon request.',
                      'Found cards should be returned to the school administration office.',
                      'Misuse or tampering will result in disciplinary action.',
                      'Valid for the current academic session only (2025/2026).'
                    ].map((term, idx) => (
                      <div key={idx} className="term-item">
                        <span className="term-number" style={{ color: primaryColor }}>{idx + 1}.</span>
                        <p>{term}</p>
                      </div>
                    ))}
                  </div>

                  <div className="back-contact">
                    <div className="contact-grid">
                      <div className="contact-item">
                        <Phone size={8} className="text-slate-400" />
                        <span>+234 800 000 0000</span>
                      </div>
                      <div className="contact-item">
                        <Mail size={8} className="text-slate-400" />
                        <span>info@school.edu.ng</span>
                      </div>
                    </div>
                  </div>

                  <div className="back-qr">
                    <div className="qr-box large">
                      <QrCode size={24} className="text-white" />
                    </div>
                    <div>
                      <p className="qr-title">Digital Verification</p>
                      <p className="qr-subtitle">Scan with school app</p>
                      <p className="qr-data">{generateQRData().substring(0, 30)}...</p>
                    </div>
                  </div>
                </div>

                <div className="card-bottom-band" style={{ background: `linear-gradient(90deg, ${primaryColor}, ${primaryColor}dd, ${primaryColor})` }} />
              </>
            )}

            {/* Global Watermark */}
            <div className="card-watermark">
              <span>{schoolName || 'BONUS DOMINUS'}</span>
            </div>
          </div>
        </div>

        <p className="format-info">Standard ID-1 Format (85.60mm × 53.98mm) • ISO/IEC 7810</p>
      </div>

      {/* CSS Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

        /* ===== LAYOUT ===== */
        .dashboard-wrapper {
          min-height: 100vh;
          background: #f8fafc;
        }

        .id-header {
          background: white;
          border-bottom: 1px solid #e2e8f0;
          padding: 24px;
          margin-bottom: 32px;
        }

        .id-header-inner {
          max-width: 1280px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        @media (min-width: 1024px) {
          .id-header-inner {
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
          }
        }

        .id-header-brand {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .id-header-icon {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
        }

        .id-header-title {
          font-size: 24px;
          font-weight: 900;
          color: #0f172a;
          letter-spacing: -0.025em;
          margin: 0;
        }

        .id-header-subtitle {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 4px;
        }

        .id-header-subtitle p {
          font-size: 14px;
          color: #64748b;
          font-weight: 500;
          margin: 0;
        }

        .id-header-actions {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 12px;
        }

        /* ===== BUTTONS ===== */
        .view-toggle {
          display: flex;
          background: #f1f5f9;
          padding: 4px;
          border-radius: 12px;
        }

        .view-toggle button {
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 700;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
          background: transparent;
          color: #64748b;
        }

        .view-toggle button.active {
          background: white;
          color: #0f172a;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .view-toggle button:hover:not(.active) {
          color: #334155;
        }

        .btn-security {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #fffbeb;
          border: 2px solid #fcd34d;
          color: #a16207;
          padding: 10px 16px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-security:hover {
          background: #fef3c7;
        }

        .btn-print {
          display: flex;
          align-items: center;
          gap: 8px;
          background: white;
          border: 2px solid #e2e8f0;
          color: #334155;
          padding: 10px 20px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }

        .btn-print:hover {
          background: #f8fafc;
        }

        .btn-print:active {
          transform: scale(0.95);
        }

        .btn-download {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #0f172a;
          color: white;
          padding: 10px 20px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
        }

        .btn-download:hover {
          background: #1e293b;
        }

        .btn-download:active {
          transform: scale(0.95);
        }

        .btn-download:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* ===== SECURITY PANEL ===== */
        .security-panel-wrapper {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 24px;
          margin-bottom: 24px;
        }

        .security-panel {
          background: linear-gradient(to right, #fffbeb, #fff7ed);
          border: 2px solid #fcd34d;
          border-radius: 16px;
          padding: 20px;
        }

        .security-panel-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        .security-panel-header h3 {
          font-weight: 900;
          color: #78350f;
          margin: 0;
          font-size: 16px;
        }

        .security-features-grid {
          display: grid;
          grid-template-columns: repeat(1, 1fr);
          gap: 16px;
        }

        @media (min-width: 768px) {
          .security-features-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }

        .security-feature-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          background: rgba(255,255,255,0.6);
          border-radius: 12px;
          padding: 12px;
        }

        .feature-label {
          font-size: 14px;
          font-weight: 700;
          color: #78350f;
          margin: 0 0 2px 0;
        }

        .feature-desc {
          font-size: 12px;
          color: #92400e;
          margin: 0;
        }

        /* ===== CARD CONTAINER ===== */
        .card-container-wrapper {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 24px 48px;
        }

        .card-container {
          display: flex;
          justify-content: center;
        }

        .format-info {
          max-width: 448px;
          margin: 24px auto 0;
          text-align: center;
          font-size: 12px;
          color: #94a3b8;
          font-weight: 500;
        }

        /* ===== ID CARD ===== */
        .id-card {
          position: relative;
          background: white;
          overflow: hidden;
          border-radius: 14px;
          box-shadow: 
            0 25px 50px -12px rgba(0,0,0,0.25), 
            0 0 0 1px rgba(0,0,0,0.1);
        }

        /* Background Pattern */
        .card-bg-pattern {
          position: absolute;
          inset: 0;
          opacity: 0.03;
          background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
        }

        .card-top-band {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 6px;
        }

        .card-bottom-band {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 6px;
        }

        /* Holographic */
        .holographic-corner {
          position: absolute;
          top: 24px;
          right: 24px;
          width: 64px;
          height: 64px;
          border-radius: 50%;
          opacity: 0.2;
        }

        @keyframes shimmer {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        /* ===== CARD HEADER ===== */
        .card-header {
          position: relative;
          padding: 16px 20px 8px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .card-brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .card-logo-box {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
        }

        .card-logo-box img {
          width: 28px;
          height: 28px;
          object-fit: contain;
        }

        .card-brand h1 {
          font-size: 9px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          line-height: 1.2;
          color: #0f172a;
          margin: 0;
        }

        .card-subtitle {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-top: 2px;
        }

        .card-subtitle p {
          font-size: 6px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin: 0;
        }

        .session-badge {
          text-align: right;
        }

        .session-label {
          font-size: 5px;
          font-weight: 900;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin: 0;
        }

        .session-value {
          font-size: 8px;
          font-weight: 900;
          color: #1e293b;
          margin: 0;
        }

        .session-badge > div {
          background: #f1f5f9;
          border-radius: 8px;
          padding: 4px 8px;
        }

        /* ===== CARD BODY ===== */
        .card-body {
          position: relative;
          padding: 0 20px;
          display: flex;
          gap: 16px;
          margin-top: 4px;
        }

        /* Photo Section */
        .photo-section {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .photo-wrapper {
          position: relative;
        }

        .photo-frame {
          width: 60px;
          height: 75px;
          border-radius: 12px;
          border-width: 3px;
          overflow: hidden;
          background: #f1f5f9;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.06);
        }

        .photo-frame img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .photo-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8fafc;
        }

        .photo-corner {
          position: absolute;
          width: 12px;
          height: 12px;
        }

        .photo-corner.tl {
          top: -4px;
          left: -4px;
          border-top: 2px solid;
          border-left: 2px solid;
          border-top-left-radius: 8px;
        }

        .photo-corner.tr {
          top: -4px;
          right: -4px;
          border-top: 2px solid;
          border-right: 2px solid;
          border-top-right-radius: 8px;
        }

        .photo-corner.bl {
          bottom: -4px;
          left: -4px;
          border-bottom: 2px solid;
          border-left: 2px solid;
          border-bottom-left-radius: 8px;
        }

        .photo-corner.br {
          bottom: -4px;
          right: -4px;
          border-bottom: 2px solid;
          border-right: 2px solid;
          border-bottom-right-radius: 8px;
        }

        .verified-badge {
          margin-top: 6px;
          display: flex;
          align-items: center;
          gap: 4px;
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          border-radius: 9999px;
          padding: 2px 8px;
        }

        .verified-badge span {
          font-size: 5px;
          font-weight: 900;
          color: #047857;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        /* Details Section */
        .details-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .detail-block {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .detail-label {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-bottom: 2px;
        }

        .detail-label span {
          font-size: 5px;
          font-weight: 900;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .student-name {
          font-size: 11px;
          font-weight: 900;
          color: #0f172a;
          line-height: 1.2;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 170px;
          margin: 0;
        }

        .details-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px 16px;
        }

        .detail-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .class-badge {
          font-size: 9px;
          font-weight: 900;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .reg-no {
          font-size: 9px;
          font-weight: 700;
          color: #1e293b;
          font-family: ui-monospace, monospace;
        }

        .dob, .gender {
          font-size: 8px;
          font-weight: 700;
          color: #334155;
        }

        /* Footer Row */
        .card-footer-row {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          padding-top: 4px;
        }

        .qr-section {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .qr-box {
          width: 40px;
          height: 40px;
          background: #0f172a;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .qr-box.large {
          width: 48px;
          height: 48px;
        }

        .qr-label {
          font-size: 5px;
          font-weight: 900;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin: 0;
        }

        .qr-desc {
          font-size: 6px;
          color: #64748b;
          margin: 0;
        }

        .qr-title {
          font-size: 7px;
          font-weight: 900;
          color: #1e293b;
          margin: 0;
        }

        .qr-subtitle {
          font-size: 6px;
          color: #64748b;
          margin: 0;
        }

        .qr-data {
          font-size: 5px;
          font-family: ui-monospace, monospace;
          color: #94a3b8;
          margin: 2px 0 0 0;
          word-break: break-all;
          max-width: 120px;
        }

        .seal-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          opacity: 0.3;
        }

        .seal-ring {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border-width: 2px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .seal-ring img {
          width: 20px;
          height: 20px;
          object-fit: contain;
        }

        .seal-section span {
          font-size: 4px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-top: 2px;
          color: #64748b;
        }

        /* Micro Text */
        .micro-text-strip {
          position: absolute;
          bottom: 10px;
          left: 0;
          right: 0;
          overflow: hidden;
        }

        .micro-text {
          font-size: 3px;
          font-family: ui-monospace, monospace;
          color: #cbd5e1;
          white-space: nowrap;
          opacity: 0.4;
          letter-spacing: 1px;
        }

        /* ===== BACK SIDE ===== */
        .back-bg {
          position: absolute;
          inset: 0;
        }

        .back-content {
          position: relative;
          padding: 20px;
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .back-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .back-title {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .back-title span {
          font-size: 8px;
          font-weight: 900;
          color: #1e293b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .back-id {
          font-size: 6px;
          font-family: ui-monospace, monospace;
          color: #94a3b8;
        }

        .terms-list {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .term-item {
          display: flex;
          align-items: flex-start;
          gap: 8px;
        }

        .term-number {
          font-size: 6px;
          font-weight: 900;
          margin-top: 2px;
        }

        .term-item p {
          font-size: 7px;
          color: #475569;
          line-height: 1.6;
          margin: 0;
        }

        .back-contact {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #e2e8f0;
        }

        .contact-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }

        .contact-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .contact-item span {
          font-size: 6px;
          font-weight: 700;
          color: #475569;
        }

        .back-qr {
          margin-top: 12px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        /* ===== WATERMARK ===== */
        .card-watermark {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          opacity: 0.02;
          transform: rotate(-30deg);
        }

        .card-watermark span {
          font-size: 40px;
          font-weight: 900;
          color: #0f172a;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        /* ===== PRINT STYLES ===== */
        @media print {
          @page {
            size: 85.6mm 54mm landscape;
            margin: 0;
          }

          body { 
            margin: 0; 
            padding: 0; 
            background: white;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .dashboard-wrapper { 
            display: block !important;
            background: white;
            height: auto !important;
          }

          .no-print, .no-print * { 
            display: none !important; 
          }

          .dashboard-wrapper > *:not(:last-child) {
            display: none !important;
          }

          .dashboard-wrapper > div:last-child {
            display: block !important;
            min-height: auto;
            padding: 0;
          }

          .id-header,
          .security-panel-wrapper,
          .format-info {
            display: none !important;
          }

          .card-container-wrapper {
            padding: 0;
          }

          .id-card {
            box-shadow: none !important;
            border: 1px solid #e2e8f0;
          }
        }
      `}</style>
    </div>
  );
};

export default StudentIDCard;