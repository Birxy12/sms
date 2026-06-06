import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useTheme } from '../../context/ThemeContext';
import { Trophy, Medal, Star, Users, GraduationCap, ArrowRight, Loader2, Award } from 'lucide-react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/MainFooter';
import { expandMarks, expandStudent, MARKS_KEYS, STUDENT_KEYS } from '../../utils/firestoreSchema';
import './LeaderboardPage.css';

// Ordered class list for sorting
const CLASS_ORDER = ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2 SCIENCE', 'SS2 ART', 'SS3 SCIENCE', 'SS3 ART'];

const normalizeClassName = (name = '') => {
  const n = name.toUpperCase().trim();
  // Normalize separators e.g. "SS2-SCIENCE" => "SS2 SCIENCE"
  return n.replace(/[-_]/g, ' ');
};

const LeaderboardPage = () => {
  const { schoolName, primaryColor } = useTheme();
  const [loading, setLoading] = useState(true);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [availableTerms, setAvailableTerms] = useState([]);

  useEffect(() => {
    const fetchLatestPublication = async () => {
      try {
        const pubQuery = query(
          collection(db, 'publications'), 
          where('type', '==', 'Result')
        );
        const pubSnap = await getDocs(pubQuery);
        
        if (!pubSnap.empty) {
          const terms = pubSnap.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => (b.publishedAt?.seconds || 0) - (a.publishedAt?.seconds || 0))
            .slice(0, 5);
          setAvailableTerms(terms);
          setSelectedSession(terms[0].session);
          setSelectedTerm(terms[0].term);
        } else {
          // Robust Fallback: Scan marks collection directly to find recent sessions/terms so leaderboard ALWAYS shows data
          const marksSnap = await getDocs(collection(db, 'marks'));
          if (!marksSnap.empty) {
            const uniqueTermsMap = {};
            marksSnap.forEach(docSnap => {
              const data = expandMarks(docSnap.data());
              if (data && data.session && data.term) {
                const key = `${data.session}|${data.term}`;
                const termLabel = data.term.toLowerCase().includes('first') ? 'First Term' :
                                  data.term.toLowerCase().includes('second') ? 'Second Term' :
                                  data.term.toLowerCase().includes('third') ? 'Third Term' : `${data.term} Term`;
                uniqueTermsMap[key] = {
                  session: data.session,
                  term: data.term,
                  examName: termLabel
                };
              }
            });
            const fallbackTerms = Object.values(uniqueTermsMap).map((t, idx) => ({
              id: `fallback-${idx}`,
              ...t
            }));
            if (fallbackTerms.length > 0) {
              setAvailableTerms(fallbackTerms);
              setSelectedSession(fallbackTerms[0].session);
              setSelectedTerm(fallbackTerms[0].term);
            } else {
              setLoading(false);
            }
          } else {
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('Error fetching publications:', error);
        setLoading(false);
      }
    };
    fetchLatestPublication();
  }, []);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!selectedSession || !selectedTerm) return;
      
      setLoading(true);
      try {
        // 1. Fetch all marks for this session/term
        let marksQuery = query(
          collection(db, 'marks'),
          where(MARKS_KEYS.session, '==', selectedSession),
          where(MARKS_KEYS.term, '==', selectedTerm)
        );
        let marksSnap = await getDocs(marksQuery);
        
        if (marksSnap.empty) {
          marksQuery = query(
            collection(db, 'marks'),
            where('session', '==', selectedSession),
            where('term', '==', selectedTerm)
          );
          marksSnap = await getDocs(marksQuery);
        }
        
        const classRankings = {};

        marksSnap.forEach(docSnap => {
          const data = expandMarks(docSnap.data());
          if (!data) return;
          
          const rawClassName = data.className;
          const className = normalizeClassName(rawClassName);
          const regNo = data.regNo;
          const marksData = data.marks || {};
          
          // Read precalculated meta overallTotal/average from compressed _meta field
          const meta = marksData._meta || {};
          let totalScore = parseFloat(meta.overallTotal || 0);
          let averageScore = parseFloat(meta.average || 0);

          if (totalScore === 0 || !meta.average || parseFloat(meta.average) === 0) {
            if (totalScore === 0) {
              Object.keys(marksData).forEach(key => {
                if (key !== '_meta' && marksData[key]) {
                  totalScore += parseFloat(marksData[key].total || marksData[key].to || 0);
                }
              });
            }
            let divisor = 15;
            const cls = className;
            if (cls.includes('JSS') || cls === 'SS1') {
              divisor = 16;
            } else if ((cls.includes('SS2') || cls.includes('SS3')) && 
                       (cls.includes('ART') || cls.includes('SCIENCE'))) {
              divisor = 9;
            }
            averageScore = parseFloat((totalScore / divisor).toFixed(1));
          }

          if (totalScore > 0) {
            if (!classRankings[className]) {
              classRankings[className] = [];
            }
            classRankings[className].push({
              regNo,
              totalScore,
              average: averageScore.toFixed(1)
            });
          }
        });

        // 2. Sort each class and take top 2
        const topStudents = [];
        // Sort classes by predefined order, fall back to alphabetical for unknowns
        const classes = Object.keys(classRankings).sort((a, b) => {
          const ai = CLASS_ORDER.indexOf(a);
          const bi = CLASS_ORDER.indexOf(b);
          if (ai === -1 && bi === -1) return a.localeCompare(b);
          if (ai === -1) return 1;
          if (bi === -1) return -1;
          return ai - bi;
        });

        // Fetch all students to map names/photos
        const studentsSnap = await getDocs(collection(db, 'students'));
        const studentsMap = {};
        studentsSnap.forEach(doc => {
          const sData = expandStudent(doc.data());
          if (sData) {
            studentsMap[sData.regNo] = sData;
          }
        });

        classes.forEach(className => {
          const sorted = classRankings[className].sort((a, b) => b.totalScore - a.totalScore);

          let rank = 1;
          sorted.forEach((s, idx) => {
            if (idx > 0 && s.totalScore < sorted[idx - 1].totalScore) {
              rank = idx + 1;
            }
            s.rank = rank;
          });

          const top2 = sorted.slice(0, 2).map(s => ({
            ...s,
            className,
            studentInfo: studentsMap[s.regNo] || { name: 'Unknown Student' }
          }));
          topStudents.push(...top2);
        });

        // Group by class for display
        const groupedByClass = classes.map(className => ({
          className,
          students: topStudents.filter(s => s.className === className)
        })).filter(c => c.students.length > 0);

        setLeaderboardData(groupedByClass);
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [selectedSession, selectedTerm]);

  return (
    <div className="leaderboard-page">
      <Navbar />
      
      {/* Hero Section */}
      <header className="lb-hero">
        <div className="lb-hero-inner">
          <div className="lb-hero-badge">
            <Trophy size={14} />
            Academic Excellence
          </div>
          <h1 className="lb-hero-title">
            Wall of <span style={{ color: primaryColor || '#ea580c' }}>Fame</span>
          </h1>
          <p className="lb-hero-desc">
            Celebrating the brightest minds and top academic performers across all classes at {schoolName || 'our school'}.
          </p>
          
          {availableTerms.length > 1 && (
            <div className="lb-filter">
              <select 
                value={`${selectedSession}|${selectedTerm}`}
                onChange={(e) => {
                  const [session, term] = e.target.value.split('|');
                  setSelectedSession(session);
                  setSelectedTerm(term);
                }}
                className="lb-select"
              >
                {availableTerms.map(t => (
                  <option key={t.id} value={`${t.session}|${t.term}`}>
                    {t.examName} ({t.session})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="lb-main">
        {loading ? (
          <div className="lb-loading">
            <Loader2 className="lb-spin" size={40} />
            <p>Gathering the stars...</p>
          </div>
        ) : leaderboardData.length > 0 ? (
          <div className="lb-content">
            {leaderboardData.map((classData) => (
              <section key={classData.className} className="lb-class">
                {/* Class Header */}
                <div className="lb-class-header">
                  <div className="lb-class-icon">
                    <GraduationCap size={18} />
                  </div>
                  <h2 className="lb-class-name">{classData.className}</h2>
                  <div className="lb-class-line" />
                </div>

                {/* Students Grid */}
                <div className="lb-students">
                  {classData.students.map((student) => (
                    <div 
                      key={student.regNo} 
                      className={`lb-card lb-rank-${student.rank}`}
                    >
                      {/* Rank Badge */}
                      <div className="lb-rank-badge">
                        {student.rank === 1 ? (
                          <Trophy size={14} />
                        ) : (
                          <Medal size={14} />
                        )}
                        <span>#{student.rank}</span>
                      </div>

                      {/* Avatar */}
                      <div className="lb-avatar-wrap">
                        {student.studentInfo.photo ? (
                          <img 
                            src={student.studentInfo.photo} 
                            alt={student.studentInfo.name} 
                            className="lb-avatar-img" 
                          />
                        ) : (
                          <div className="lb-avatar-fallback">
                            {student.studentInfo.name?.[0] || '?'}
                          </div>
                        )}
                        {student.rank === 1 && (
                          <div className="lb-crown">
                            <Star size={12} fill="currentColor" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="lb-info">
                        <h3 className="lb-student-name">
                          {student.studentInfo.name}
                        </h3>
                        <p className="lb-reg-no">{student.regNo}</p>

                        <div className="lb-stats">
                          <div className="lb-stat">
                            <span className="lb-stat-label">Total</span>
                            <span className="lb-stat-value">{student.totalScore}</span>
                          </div>
                          <div className="lb-stat-divider" />
                          <div className="lb-stat">
                            <span className="lb-stat-label">Avg</span>
                            <span className="lb-stat-value">{student.average}%</span>
                          </div>
                        </div>
                      </div>

                      {/* Champion Tag */}
                      {student.rank === 1 && (
                        <div className="lb-champion">
                          <Star size={10} fill="currentColor" />
                          Class Champion
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="lb-empty">
            <Award size={56} />
            <h2>No Rankings Yet</h2>
            <p>Leaderboard data will appear once results are published for the current session.</p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default LeaderboardPage;