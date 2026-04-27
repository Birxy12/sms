import React, { useState, useEffect } from 'react';
import { useStudentAuth } from '../../context/StudentAuthContext';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { useTheme } from '../../context/ThemeContext';
import { BookOpen, Download, Search, FileText, ExternalLink, Library } from 'lucide-react';

const StudentNotes = () => {
  const { currentStudent } = useStudentAuth();
  const { primaryColor } = useTheme();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const studentClass = currentStudent?.className || currentStudent?.classId || '';
        const q = query(
          collection(db, 'notes'),
          where('targetClass', '==', studentClass)
        );
        
        const snap = await getDocs(q);
        const data = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })).sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
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
    n.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    n.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h2 style={{ fontWeight: '900', fontSize: '28px', color: '#1e293b', margin: 0 }}>Lecture Materials</h2>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>Access and download your course notes and study guides.</p>
        </div>
        
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by subject or title..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white border-2 border-slate-100 outline-none focus:border-indigo-500 transition-all font-bold text-sm shadow-sm"
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
            <div key={note.id} className="card-white group hover:shadow-xl hover:-translate-y-1 transition-all p-0 overflow-hidden border-b-4" style={{ borderBottomColor: primaryColor }}>
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <FileText size={24} />
                  </div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded">
                    {note.fileType || 'PDF'}
                  </span>
                </div>
                
                <h4 className="text-lg font-black text-slate-900 mb-2 line-clamp-1">{note.title}</h4>
                <p className="text-xs font-bold text-indigo-600 uppercase mb-4">{note.subject}</p>
                
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-[10px] font-bold text-slate-400">
                    <p>Uploaded</p>
                    <p className="text-slate-600">{new Date(note.uploadedAt).toLocaleDateString()}</p>
                  </div>
                  <a 
                    href={note.fileUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-black transition-all active:scale-95 shadow-lg shadow-slate-200"
                  >
                    <Download size={14} /> Download
                  </a>
                </div>
              </div>
            </div>
          ))}
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
         <button className="flex items-center gap-2 text-indigo-600 font-black text-xs hover:underline uppercase tracking-widest">
            View Schedule <ExternalLink size={14} />
         </button>
      </div>
    </div>
  );
};

export default StudentNotes;

