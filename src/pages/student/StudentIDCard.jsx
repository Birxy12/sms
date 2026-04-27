import React, { useRef } from 'react';
import { useStudentAuth } from '../../context/StudentAuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Download, Printer, ShieldCheck, User } from 'lucide-react';
import bdsLogo from '../../assets/bdslogo.jpg';

const StudentIDCard = () => {
  const { currentStudent } = useStudentAuth();
  const { schoolName, schoolLogo, primaryColor } = useTheme();
  const cardRef = useRef();

  const handleDownload = async () => {
    const html2pdf = (await import('html2pdf.js')).default;
    const element = cardRef.current;
    const opt = {
      margin: 10,
      filename: `${currentStudent?.name || 'Student'}-ID-Card.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 3, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="dashboard-wrapper">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 no-print">
        <div>
          <h2 style={{ fontWeight: '900', fontSize: '28px', color: '#1e293b', margin: 0 }}>Digital ID Card</h2>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>Your official school identity for session 2025/26.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 bg-white border-2 border-slate-200 px-5 py-3 rounded-2xl font-black text-slate-700 hover:bg-slate-50 transition-all shadow-sm active:scale-95"
          >
            <Printer size={18} /> Print Card
          </button>
          <button 
            onClick={handleDownload}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-3 rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95"
          >
            <Download size={18} /> Download PDF
          </button>
        </div>
      </div>

      <div className="flex justify-center py-10">
        {/* ID Card Container */}
        <div 
          ref={cardRef}
          className="relative w-[320px] h-[500px] bg-white rounded-[32px] shadow-2xl overflow-hidden border border-slate-100"
          style={{ fontFamily: "'Outfit', sans-serif" }}
        >
          {/* Top Design Element */}
          <div 
            className="absolute top-0 left-0 right-0 h-[180px]"
            style={{ background: `linear-gradient(135deg, ${primaryColor}, #1e293b)` }}
          >
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '20px 20px' }}></div>
          </div>

          {/* School Header */}
          <div className="relative z-10 pt-8 px-6 text-center text-white">
             <div className="flex justify-center mb-2">
                <img src={schoolLogo || bdsLogo} alt="Logo" className="w-12 h-12 object-contain bg-white rounded-xl p-1 shadow-lg" />
             </div>
             <h1 className="text-[14px] font-black uppercase tracking-tight leading-tight">{schoolName || 'BONUS DOMINUS'}</h1>
             <p className="text-[8px] font-bold text-white/70 uppercase tracking-widest mt-1">Secondary School Section</p>
          </div>

          {/* Photo Section */}
          <div className="relative z-10 flex justify-center mt-6">
            <div className="w-[120px] h-[140px] rounded-[24px] border-4 border-white shadow-2xl overflow-hidden bg-slate-50">
               {currentStudent?.photo || currentStudent?.photoURL ? (
                 <img src={currentStudent.photo || currentStudent.photoURL} alt="Student" className="w-full h-full object-cover" />
               ) : (
                 <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <User size={48} />
                 </div>
               )}
            </div>
          </div>

          {/* Student Info */}
          <div className="relative z-10 px-8 pt-6 text-center">
             <h2 className="text-[20px] font-black text-slate-900 leading-tight mb-1">{currentStudent?.name}</h2>
             <p className="text-[12px] font-black text-indigo-600 uppercase tracking-widest mb-4">{currentStudent?.className}</p>
             
             <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="flex flex-col">
                   <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Registration No</span>
                   <span className="text-[14px] font-bold text-slate-800">{currentStudent?.regNo || 'BDS/2025/001'}</span>
                </div>
                <div className="flex flex-col">
                   <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Valid Session</span>
                   <span className="text-[14px] font-bold text-slate-800">2025 - 2026</span>
                </div>
             </div>
          </div>

          {/* Card Footer / Hologram Effect */}
          <div className="absolute bottom-0 left-0 right-0 h-[60px] bg-slate-50 border-t border-slate-100 flex items-center justify-between px-8">
             <div className="flex items-center gap-2">
                <ShieldCheck size={20} className="text-emerald-500" />
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-tighter">Verified Identity</span>
             </div>
             <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center overflow-hidden opacity-50">
                <img src={schoolLogo || bdsLogo} alt="Seal" className="w-6 h-6 grayscale" />
             </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .dashboard-wrapper, .dashboard-wrapper * { visibility: visible; }
          .no-print { display: none !important; }
          .dashboard-wrapper { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </div>
  );
};

export default StudentIDCard;
