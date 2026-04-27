import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useTheme } from '../../context/ThemeContext';
import { Trophy, Medal, Star, Users, GraduationCap, ArrowRight, Loader2, Award } from 'lucide-react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/MainFooter';
import './LeaderboardPage.css';

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
          setLoading(false);
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
        const marksQuery = query(
          collection(db, 'marks'),
          where('session', '==', selectedSession),
          where('term', '==', selectedTerm)
        );
        const marksSnap = await getDocs(marksQuery);
        
        const classRankings = {};

        marksSnap.forEach(docSnap => {
          const data = docSnap.data();
          const className = data.className;
          const regNo = data.regNo;
          const marksData = data.marks || data.subjects || {};
          
          let totalScore = 0;
          Object.values(marksData).forEach(m => {
            totalScore += parseFloat(m.total || 0);
          });

          // Correct divisor based on school policy
          const cls = (className || '').toUpperCase();
          let divisor = 16;
          if (cls.includes('SS2') || cls.includes('SS3')) {
            divisor = 9;
          }

          if (!classRankings[className]) {
            classRankings[className] = [];
          }

          classRankings[className].push({
            regNo,
            totalScore,
            average: data.average || (totalScore / divisor).toFixed(1)
          });
        });

        // 2. Sort each class and take top 2
        const topStudents = [];
        const classes = Object.keys(classRankings).sort();

        // Fetch all students to map names/photos
        const studentsSnap = await getDocs(collection(db, 'students'));
        const studentsMap = {};
        studentsSnap.forEach(doc => {
          studentsMap[doc.data().regNo] = doc.data();
        });

        classes.forEach(className => {
          const sorted = classRankings[className].sort((a, b) => b.totalScore - a.totalScore);
          const top2 = sorted.slice(0, 2).map((s, idx) => ({
            ...s,
            rank: idx + 1,
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
      
      <header className="leaderboard-hero">
        <div className="leaderboard-hero-content">
          <div className="leaderboard-badge">
            <Trophy size={14} />
            Academic Excellence
          </div>
          <h1 className="leaderboard-title">
            Wall of <span className="leaderboard-title-accent">Fame</span>
          </h1>
          <p className="leaderboard-desc">
            Celebrating the brightest minds and top academic performers across all classes at {schoolName}.
          </p>
          
          {availableTerms.length > 1 && (
            <div className="leaderboard-filters">
              <select 
                value={`${selectedSession}|${selectedTerm}`}
                onChange={(e) => {
                  const [session, term] = e.target.value.split('|');
                  setSelectedSession(session);
                  setSelectedTerm(term);
                }}
                className="leaderboard-select"
              >
                {availableTerms.map(t => (
                  <option key={t.id} value={`${t.session}|${t.term}`}>{t.examName} ({t.session})</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </header>

      <main className="leaderboard-main">
        {loading ? (
          <div className="leaderboard-loading">
            <Loader2 className="animate-spin" size={48} />
            <p>Gathering the stars...</p>
          </div>
        ) : leaderboardData.length > 0 ? (
          <div className="leaderboard-grid">
            {leaderboardData.map((classData, idx) => (
              <section key={classData.className} className="class-section">
                <div className="class-header">
                  <div className="class-icon">
                    <GraduationCap size={20} />
                  </div>
                  <h2 className="class-name">{classData.className}</h2>
                  <div className="class-line"></div>
                </div>

                <div className="top-students-row">
                  {classData.students.map((student, sIdx) => (
                    <div key={student.regNo} className={`student-leader-card rank-${student.rank}`}>
                      <div className="rank-badge">
                        {student.rank === 1 ? <Trophy size={16} /> : <Medal size={16} />}
                        <span>#{student.rank}</span>
                      </div>
                      
                      <div className="student-avatar-container">
                        {student.studentInfo.photo ? (
                          <img src={student.studentInfo.photo} alt={student.studentInfo.name} className="student-avatar" />
                        ) : (
                          <div className="student-avatar-placeholder">
                            {student.studentInfo.name[0]}
                          </div>
                        )}
                        <div className={`rank-glow rank-${student.rank}`}></div>
                      </div>

                      <div className="student-details">
                        <h3 className="student-name">{student.studentInfo.name}</h3>
                        <p className="student-reg">{student.regNo}</p>
                        
                        <div className="score-stats">
                          <div className="stat-box">
                            <span className="stat-label">Total Score</span>
                            <span className="stat-value">{student.totalScore}</span>
                          </div>
                          <div className="stat-divider"></div>
                          <div className="stat-box">
                            <span className="stat-label">Average</span>
                            <span className="stat-value">{student.average}%</span>
                          </div>
                        </div>
                      </div>

                      {student.rank === 1 && (
                        <div className="top-performer-tag">
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
          <div className="leaderboard-empty">
            <Award size={64} />
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
