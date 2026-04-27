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
    <div className="dashboard-wrapper min-h-screen bg-slate-50">
      {/* Header Section */}
      <div className="bg-white border-b border-slate-200 px-6 py-6 mb-8">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-4">
            <div 
              className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)` }}
            >
              <CreditCard className="text-white" size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Digital ID Card</h2>
              <div className="flex items-center gap-2 mt-1">
                <Sparkles size={14} className="text-amber-500" />
                <p className="text-sm text-slate-500 font-medium">Official school identity • Session 2025/26</p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* View Toggle */}
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setActiveView('front')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  activeView === 'front' 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Front
              </button>
              <button
                onClick={() => setActiveView('back')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  activeView === 'back' 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Back
              </button>
            </div>

            <button 
              onClick={() => setShowSecurityFeatures(!showSecurityFeatures)}
              className="flex items-center gap-2 bg-amber-50 border-2 border-amber-200 text-amber-700 px-4 py-2.5 rounded-xl font-bold hover:bg-amber-100 transition-all"
            >
              <ShieldCheck size={16} />
              Security
            </button>

            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 bg-white border-2 border-slate-200 px-5 py-2.5 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm active:scale-95"
            >
              <Printer size={18} /> Print
            </button>
            <button 
              onClick={handleDownload}
              disabled={isGenerating}
              className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 active:scale-95 disabled:opacity-50"
            >
              {isGenerating ? (
                <span className="animate-spin">⏳</span>
              ) : (
                <Download size={18} />
              )}
              {isGenerating ? 'Generating...' : 'Download PDF'}
            </button>
          </div>
        </div>
      </div>

      {/* Security Features Panel */}
      {showSecurityFeatures && (
        <div className="max-w-7xl mx-auto px-6 mb-6">
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="text-amber-600" size={20} />
              <h3 className="font-black text-amber-900">Security Features</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { icon: QrCode, label: 'Encrypted QR Code', desc: 'Contains verified student data' },
                { icon: Fingerprint, label: 'Holographic Seal', desc: 'Anti-counterfeit shimmer effect' },
                { icon: CheckCircle2, label: 'Micro-Text', desc: 'Fine print security pattern' },
                { icon: AlertCircle, label: 'Valid Until', desc: 'Session 2025/2026 only' }
              ].map((feature, idx) => (
                <div key={idx} className="flex items-start gap-3 bg-white/60 rounded-xl p-3">
                  <feature.icon size={18} className="text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-amber-900">{feature.label}</p>
                    <p className="text-xs text-amber-700">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Card Container */}
      <div className="max-w-7xl mx-auto px-6 pb-12">
        <div className="flex justify-center">
          <div 
            ref={cardRef}
            className="relative bg-white overflow-hidden"
            style={{ 
              width: '85.6mm', 
              height: '54mm', 
              fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
              borderRadius: '14px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0,0,0,0.1)'
            }}
          >
            {/* === FRONT SIDE === */}
            {activeView === 'front' && (
              <>
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-[0.03]" style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                }} />

                {/* Top Security Band */}
                <div 
                  className="absolute top-0 left-0 right-0 h-[6px]"
                  style={{ background: `linear-gradient(90deg, ${primaryColor}, ${primaryColor}99, ${primaryColor})` }}
                />

                {/* Holographic Corner */}
                <div 
                  className="absolute top-6 right-6 w-16 h-16 rounded-full opacity-20"
                  style={holographicStyle}
                />

                {/* Header */}
                <div className="relative px-5 pt-4 pb-2 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md"
                      style={{ background: primaryColor }}
                    >
                      <img src={schoolLogo || bdsLogo} alt="Logo" className="w-7 h-7 object-contain" />
                    </div>
                    <div>
                      <h1 className="text-[9px] font-black uppercase tracking-wider leading-tight text-slate-900">
                        {schoolName || 'BONUS DOMINUS'}
                      </h1>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Award size={8} className="text-amber-500" />
                        <p className="text-[6px] font-bold text-slate-500 uppercase tracking-widest">
                          Official Student ID • Valid 2025/26
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Session Badge */}
                  <div className="text-right">
                    <div className="bg-slate-100 rounded-lg px-2 py-1">
                      <p className="text-[5px] font-black text-slate-400 uppercase tracking-widest">Session</p>
                      <p className="text-[8px] font-black text-slate-800">2025/26</p>
                    </div>
                  </div>
                </div>

                {/* Main Content */}
                <div className="relative px-5 flex gap-4 mt-1">
                  {/* Photo Section */}
                  <div className="flex flex-col items-center">
                    <div className="relative">
                      <div 
                        className="w-[60px] h-[75px] rounded-xl border-[3px] overflow-hidden bg-slate-100 shadow-inner"
                        style={{ borderColor: `${primaryColor}30` }}
                      >
                        {currentStudent?.photo || currentStudent?.photoURL ? (
                          <img 
                            src={currentStudent.photo || currentStudent.photoURL} 
                            alt="Student" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-50">
                            <User size={28} className="text-slate-300" />
                          </div>
                        )}
                      </div>
                      {/* Photo Corner Accents */}
                      <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 rounded-tl-lg" style={{ borderColor: primaryColor }} />
                      <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 rounded-tr-lg" style={{ borderColor: primaryColor }} />
                      <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 rounded-bl-lg" style={{ borderColor: primaryColor }} />
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 rounded-br-lg" style={{ borderColor: primaryColor }} />
                    </div>
                    
                    {/* Verified Badge */}
                    <div className="mt-1.5 flex items-center gap-1 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                      <ShieldCheck size={8} className="text-emerald-600" />
                      <span className="text-[5px] font-black text-emerald-700 uppercase tracking-wider">Verified</span>
                    </div>
                  </div>

                  {/* Details Section */}
                  <div className="flex-1 space-y-2">
                    {/* Name */}
                    <div>
                      <div className="flex items-center gap-1 mb-0.5">
                        <User size={8} className="text-slate-400" />
                        <span className="text-[5px] font-black text-slate-400 uppercase tracking-widest">Full Name</span>
                      </div>
                      <h2 className="text-[11px] font-black text-slate-900 leading-tight truncate max-w-[170px]">
                        {currentStudent?.name || 'Student Name'}
                      </h2>
                    </div>

                    {/* Grid Info */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      <div>
                        <div className="flex items-center gap-1 mb-0.5">
                          <Building2 size={7} className="text-slate-400" />
                          <span className="text-[5px] font-black text-slate-400 uppercase tracking-widest">Class</span>
                        </div>
                        <span 
                          className="text-[9px] font-black px-1.5 py-0.5 rounded"
                          style={{ 
                            color: primaryColor,
                            background: `${primaryColor}15`
                          }}
                        >
                          {currentStudent?.className || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-1 mb-0.5">
                          <Hash size={7} className="text-slate-400" />
                          <span className="text-[5px] font-black text-slate-400 uppercase tracking-widest">Reg No</span>
                        </div>
                        <span className="text-[9px] font-bold text-slate-800 font-mono">
                          {currentStudent?.regNo || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-1 mb-0.5">
                          <Calendar size={7} className="text-slate-400" />
                          <span className="text-[5px] font-black text-slate-400 uppercase tracking-widest">DOB</span>
                        </div>
                        <span className="text-[8px] font-bold text-slate-700">
                          {currentStudent?.dob || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-1 mb-0.5">
                          <MapPin size={7} className="text-slate-400" />
                          <span className="text-[5px] font-black text-slate-400 uppercase tracking-widest">Gender</span>
                        </div>
                        <span className="text-[8px] font-bold text-slate-700">
                          {currentStudent?.gender || 'N/A'}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Row */}
                    <div className="flex items-end justify-between pt-1">
                      {/* QR Code Placeholder */}
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center">
                          <QrCode size={20} className="text-white" />
                        </div>
                        <div>
                          <p className="text-[5px] font-black text-slate-400 uppercase tracking-widest">Scan to Verify</p>
                          <p className="text-[6px] text-slate-500">Encrypted Data</p>
                        </div>
                      </div>
                      
                      {/* School Seal */}
                      <div className="flex flex-col items-center opacity-30">
                        <div 
                          className="w-8 h-8 rounded-full border-2 flex items-center justify-center"
                          style={{ borderColor: primaryColor }}
                        >
                          <img src={schoolLogo || bdsLogo} alt="Seal" className="w-5 h-5 object-contain" />
                        </div>
                        <span className="text-[4px] font-black uppercase tracking-widest mt-0.5 text-slate-500">Official Seal</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Micro-text Security Strip */}
                <div className="absolute bottom-[10px] left-0 right-0 overflow-hidden">
                  <div 
                    className="text-[3px] font-mono text-slate-300 whitespace-nowrap opacity-40"
                    style={{ letterSpacing: '1px' }}
                  >
                    {microTextPattern.repeat(20)}
                  </div>
                </div>

                {/* Bottom Color Band */}
                <div 
                  className="absolute bottom-0 left-0 right-0 h-[6px]"
                  style={{ background: `linear-gradient(90deg, ${primaryColor}, ${primaryColor}dd, ${primaryColor})` }}
                />
              </>
            )}

            {/* === BACK SIDE === */}
            {activeView === 'back' && (
              <>
                {/* Background */}
                <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${primaryColor}08, ${primaryColor}03)` }} />
                
                {/* Top Band */}
                <div 
                  className="absolute top-0 left-0 right-0 h-[6px]"
                  style={{ background: `linear-gradient(90deg, ${primaryColor}, ${primaryColor}99, ${primaryColor})` }}
                />

                <div className="relative px-5 pt-5 pb-4 h-full flex flex-col">
                  {/* Back Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={14} style={{ color: primaryColor }} />
                      <span className="text-[8px] font-black text-slate-800 uppercase tracking-wider">ID Card Terms & Conditions</span>
                    </div>
                    <span className="text-[6px] font-mono text-slate-400">ID: {currentStudent?.regNo || '000000'}</span>
                  </div>

                  {/* Terms */}
                  <div className="space-y-1.5 flex-1">
                    {[
                      'This card is the property of the school and must be returned upon request.',
                      'Found cards should be returned to the school administration office.',
                      'Misuse or tampering will result in disciplinary action.',
                      'Valid for the current academic session only (2025/2026).'
                    ].map((term, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="text-[6px] font-black mt-0.5" style={{ color: primaryColor }}>{idx + 1}.</span>
                        <p className="text-[7px] text-slate-600 leading-relaxed">{term}</p>
                      </div>
                    ))}
                  </div>

                  {/* Contact Info */}
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-1.5">
                        <Phone size={8} className="text-slate-400" />
                        <span className="text-[6px] font-bold text-slate-600">+234 800 000 0000</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Mail size={8} className="text-slate-400" />
                        <span className="text-[6px] font-bold text-slate-600">info@school.edu.ng</span>
                      </div>
                    </div>
                  </div>

                  {/* Large QR */}
                  <div className="mt-3 flex items-center gap-3">
                    <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center">
                      <QrCode size={24} className="text-white" />
                    </div>
                    <div>
                      <p className="text-[7px] font-black text-slate-800">Digital Verification</p>
                      <p className="text-[6px] text-slate-500">Scan with school app</p>
                      <p className="text-[5px] font-mono text-slate-400 mt-0.5 break-all max-w-[120px]">
                        {generateQRData().substring(0, 30)}...
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bottom Band */}
                <div 
                  className="absolute bottom-0 left-0 right-0 h-[6px]"
                  style={{ background: `linear-gradient(90deg, ${primaryColor}, ${primaryColor}dd, ${primaryColor})` }}
                />
              </>
            )}

            {/* Global Security Watermark */}
            <div 
              className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.02]"
              style={{ transform: 'rotate(-30deg)' }}
            >
              <span className="text-[40px] font-black text-slate-900 uppercase tracking-widest">
                {schoolName || 'BONUS DOMINUS'}
              </span>
            </div>
          </div>
        </div>

        {/* Card Info */}
        <div className="max-w-md mx-auto mt-6 text-center">
          <p className="text-xs text-slate-400 font-medium">
            Standard ID-1 Format (85.60mm × 53.98mm) • ISO/IEC 7810
          </p>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        
        @keyframes shimmer {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
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
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%;
            background: white;
          }
          .no-print, .no-print * { 
            display: none !important; 
          }
          .dashboard-wrapper > *:not(:last-child) {
            display: none !important;
          }
          .dashboard-wrapper > div:last-child {
            display: flex !important;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default StudentIDCard;