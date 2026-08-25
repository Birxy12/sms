import React, { useState, useEffect } from 'react';
import { useStudentAuth } from '../../context/StudentAuthContext';
import { db } from '../../lib/firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import { useTheme } from '../../context/ThemeContext';
import { BookOpen, Download, Search, FileText, ExternalLink, Library, X, Video, FileSpreadsheet, Layers, Eye } from 'lucide-react';

const StudentNotes = () => {
  const { currentStudent } = useStudentAuth();
  const { primaryColor } = useTheme();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNote, setSelectedNote] = useState(null);

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const studentClass = (currentStudent?.className || currentStudent?.classId || '').trim().toUpperCase();
        const snap = await getDocs(collection(db, 'notes'));
        
        const data = snap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(n => {
            if (!n.targetClass || n.targetClass === 'All' || n.targetClass === 'All Classes') return true;
            return n.targetClass.trim().toUpperCase() === studentClass;
          })
          .sort((a, b) => new Date(b.uploadedAt || b.createdAt || 0) - new Date(a.uploadedAt || a.createdAt || 0));

        setNotes(data);
      } catch (error) {
        console.error('Error fetching notes:', error);
      } finally {
        setLoading(false);
      }
    };

    if (currentStudent) fetchNotes();
  }, [currentStudent]);

  const filteredNotes = notes.filter(n => 
    n.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    n.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    n.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getFileIcon = (type) => {
    switch ((type || '').toUpperCase()) {
      case 'VIDEO': return <Video size={20} className="text-rose-500" />;
      case 'SLIDES': return <Layers size={20} className="text-amber-500" />;
      case 'SPREADSHEET': return <FileSpreadsheet size={20} className="text-emerald-500" />;
      default: return <FileText size={20} className="text-indigo-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: primaryColor }}></div>
      </div>
    );
  }

  return (
    <div className="dashboard-wrapper max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
          <h2 style={{ fontWeight: '900', fontSize: '28px', color: '#1e293b', margin: 0 }}>Lecture Materials & Notes</h2>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>Access and download your course notes, slides, and study guides.</p>
        </div>
        
        <div className="relative w-full md:w-80">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search materials or subjects..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white border border-slate-200 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-500 shadow-sm"
          />
        </div>
      </div>

      {filteredNotes.length === 0 ? (
        <div className="card-white p-20 text-center">
           <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
              <Library size={32} />
           </div>
           <h3 className="text-xl font-black text-slate-800 mb-1">No Materials Found</h3>
           <p className="text-sm text-slate-500">{searchTerm ? 'Try adjusting your search terms.' : 'Course materials for your class are coming soon.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNotes.map(note => (
            <div 
              key={note.id} 
              className="card-white group hover:shadow-xl hover:-translate-y-1 transition-all p-0 overflow-hidden border-b-4 flex flex-col justify-between" 
              style={{ borderBottomColor: primaryColor }}
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100">
                    {getFileIcon(note.fileType)}
                  </div>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 px-2.5 py-1 rounded-lg">
                    {note.fileType || 'PDF'}
                  </span>
                </div>
                
                <p className="text-xs font-black text-indigo-600 uppercase tracking-wider mb-1">{note.subject}</p>
                <h4 className="text-lg font-black text-slate-900 mb-2 line-clamp-2">{note.title}</h4>
                
                {note.description && (
                  <p className="text-xs text-slate-500 font-medium line-clamp-2 mb-4 leading-relaxed">
                    {note.description}
                  </p>
                )}
              </div>

              <div className="p-6 pt-0">
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-400 mb-3">
                  <span>Uploaded</span>
                  <span className="text-slate-700">{new Date(note.uploadedAt || note.createdAt || Date.now()).toLocaleDateString()}</span>
                </div>

                <div className="flex gap-2">
                  {note.description && (
                    <button 
                      onClick={() => setSelectedNote(note)}
                      className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 border border-slate-200"
                    >
                      <Eye size={14} /> Overview
                    </button>
                  )}
                  {note.fileUrl && (
                    <a 
                      href={note.fileUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex-1 py-2.5 bg-slate-900 text-white hover:bg-black text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md shadow-slate-200"
                    >
                      <Download size={14} /> Download
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Note Detail Modal */}
      {selectedNote && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-6 md:p-8 relative">
            <button 
              onClick={() => setSelectedNote(null)} 
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors p-2"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3 py-1 rounded-xl">
                {selectedNote.targetClass || 'All'}
              </span>
              <span className="text-xs font-black text-slate-400">•</span>
              <span className="text-xs font-black uppercase text-indigo-600">
                {selectedNote.subject}
              </span>
            </div>

            <h3 className="text-2xl font-black text-slate-900 mb-4">
              {selectedNote.title}
            </h3>

            <div className="mb-6">
              <h5 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Lecture Notes & Summary</h5>
              <div className="p-5 bg-slate-900 text-slate-100 rounded-2xl text-sm font-medium leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto border border-slate-800 shadow-inner selection:bg-indigo-500 selection:text-white">
                {selectedNote.description || 'No additional summary provided.'}
              </div>
            </div>

            {selectedNote.fileUrl && (
              <a 
                href={selectedNote.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 bg-indigo-600 text-white font-black text-sm rounded-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-100"
              >
                <Download size={16} /> Open & Download Resource File
              </a>
            )}
          </div>
        </div>
      )}

      {/* Helpful Hint */}
      <div className="mt-12 card-white p-6 bg-indigo-50/30 border-2 border-indigo-100 border-dashed flex flex-col md:flex-row items-center gap-6">
         <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
            <BookOpen size={24} />
         </div>
         <div className="text-center md:text-left flex-1">
            <h4 className="text-sm font-black text-indigo-900 uppercase tracking-wider mb-1">Study Tip</h4>
            <p className="text-xs text-indigo-700 leading-relaxed">Reading through your notes within 24 hours of a lecture increases retention by up to 60%. Stay ahead by reviewing your materials daily.</p>
         </div>
      </div>
    </div>
  );
};

export default StudentNotes;
