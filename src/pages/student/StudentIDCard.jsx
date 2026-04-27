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
        {/* ID Card Container - Landscape 3.5" x 2.5" */}
        <div 
          ref={cardRef}
          className="relative bg-white shadow-2xl overflow-hidden border border-slate-200"
          style={{ 
            width: '3.5in', 
            height: '2.5in', 
            fontFamily: "'Outfit', sans-serif",
            borderRadius: '12px'
          }}
        >
          {/* Side Accent */}
          <div 
            className="absolute left-0 top-0 bottom-0 w-[8px]"
            style={{ background: primaryColor }}
          />

          {/* School Header */}
          <div className="pl-6 pr-4 pt-4 flex items-start justify-between">
             <div className="flex items-center gap-2">
                <img src={schoolLogo || bdsLogo} alt="Logo" className="w-8 h-8 object-contain" />
                <div>
                   <h1 className="text-[10px] font-black uppercase tracking-tight leading-none text-slate-900">{schoolName || 'BONUS DOMINUS'}</h1>
                   <p className="text-[6px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Official Student ID</p>
                </div>
             </div>
             <div className="text-right">
                <p className="text-[6px] font-black text-indigo-600 uppercase tracking-widest leading-none">Session</p>
                <p className="text-[8px] font-bold text-slate-800">2025/2026</p>
             </div>
          </div>

          {/* Main Body - Landscape Layout */}
          <div className="flex pl-6 pr-4 mt-3 gap-4">
             {/* Photo Column */}
             <div className="flex flex-col items-center">
                <div className="w-[65px] h-[80px] rounded-lg border-2 border-slate-100 shadow-sm overflow-hidden bg-slate-50">
                   {currentStudent?.photo || currentStudent?.photoURL ? (
                     <img src={currentStudent.photo || currentStudent.photoURL} alt="Student" className="w-full h-full object-cover" />
                   ) : (
                     <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <User size={24} />
                     </div>
                   )}
                </div>
                <div className="mt-1">
                   <ShieldCheck size={14} className="text-emerald-500 mx-auto" />
                </div>
             </div>

             {/* Details Column */}
             <div className="flex-1 space-y-2">
                <div>
                   <span className="text-[6px] font-black text-slate-400 uppercase tracking-widest block">Full Name</span>
                   <h2 className="text-[12px] font-black text-slate-900 leading-tight truncate w-[160px]">{currentStudent?.name}</h2>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                   <div>
                      <span className="text-[6px] font-black text-slate-400 uppercase tracking-widest block">Class</span>
                      <span className="text-[10px] font-black text-indigo-600">{currentStudent?.className}</span>
                   </div>
                   <div>
                      <span className="text-[6px] font-black text-slate-400 uppercase tracking-widest block">Reg No</span>
                      <span className="text-[10px] font-bold text-slate-800">{currentStudent?.regNo || 'N/A'}</span>
                   </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                   <div className="h-[15px] w-[60px] bg-slate-100 rounded flex items-center justify-center border border-slate-200">
                      <span className="text-[6px] font-black text-slate-400 uppercase tracking-tighter">Barcode Area</span>
                   </div>
                   <img src={schoolLogo || bdsLogo} alt="Seal" className="w-6 h-6 opacity-20 grayscale" />
                </div>
             </div>
          </div>

          {/* Bottom Strip */}
          <div 
            className="absolute bottom-0 left-0 right-0 h-[10px]"
            style={{ background: `linear-gradient(90deg, ${primaryColor}, #1e293b)` }}
          />
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
