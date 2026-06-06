import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useStudentAuth } from '../../context/StudentAuthContext';
import { db } from '../../lib/firebase';
import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import {
  AlertCircle,
  Award,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileQuestion,
  Loader2,
  Send,
} from 'lucide-react';
import '../dashboard/CBT.css';

const StudentCBT = () => {
  const { currentStudent } = useStudentAuth();
  const [exams, setExams] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [activeExam, setActiveExam] = useState(null);
  const [answers, setAnswers] = useState({});
  const [startedAt, setStartedAt] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  const studentClass = currentStudent?.className || currentStudent?.classId || '';
  const studentName = currentStudent?.name || currentStudent?.['STUDENT NAME'] || 'Student';
  const regNo = currentStudent?.regNo || currentStudent?.['REG NO'] || currentStudent?.REGNO || '';

  const loadStudentExams = useCallback(async () => {
    if (!studentClass || !regNo) return;
    setLoading(true);
    try {
      const [examSnap, submissionSnap] = await Promise.all([
        getDocs(query(
          collection(db, 'cbtExams'),
          where('targetClass', '==', studentClass),
          where('status', '==', 'published')
        )),
        getDocs(query(collection(db, 'cbtSubmissions'), where('regNo', '==', regNo))),
      ]);
      const examList = examSnap.docs.map((item) => ({ id: item.id, ...item.data() }));
      examList.sort((a, b) => {
        const aDate = a.createdAt?.toMillis?.() || 0;
        const bDate = b.createdAt?.toMillis?.() || 0;
        return bDate - aDate;
      });
      setExams(examList);
      setSubmissions(submissionSnap.docs.map((item) => ({ id: item.id, ...item.data() })));
    } catch (error) {
      console.error('Error loading student CBT:', error);
      if (error.code === 'permission-denied') {
        setStatus({ 
          type: 'error', 
          message: 'Access Denied: You do not have permission to view exams. Please contact the administrator to ensure Anonymous Auth is enabled.' 
        });
      } else {
        setStatus({ type: 'error', message: 'Unable to load CBT exams.' });
      }
    } finally {
      setLoading(false);
    }
  }, [studentClass, regNo]);

  useEffect(() => {
    if (currentStudent) loadStudentExams();
  }, [currentStudent, loadStudentExams]);

  useEffect(() => {
    if (!activeExam || secondsLeft <= 0) return undefined;
    const timer = setInterval(() => {
      setSecondsLeft((current) => Math.max(0, current - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [activeExam, secondsLeft]);

  const submissionByExam = useMemo(() => submissions.reduce((acc, submission) => {
    acc[submission.examId] = submission;
    return acc;
  }, {}), [submissions]);

  const startExam = (exam) => {
    setActiveExam(exam);
    setAnswers({});
    setStartedAt(new Date());
    setSecondsLeft((exam.durationMinutes || 45) * 60);
    setStatus({ type: '', message: '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatTime = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  const submitExam = useCallback(async (autoSubmitted = false) => {
    if (!activeExam || submitting) return;
    const totalQuestions = activeExam.questions?.length || 0;
    if (!autoSubmitted && Object.keys(answers).length < totalQuestions) {
      const proceed = window.confirm('You have unanswered questions. Submit anyway?');
      if (!proceed) return;
    }

    setSubmitting(true);
    try {
      let correct = 0;
      const reviewedAnswers = activeExam.questions.map((question, index) => {
        const selectedIndex = answers[index];
        const isCorrect = Number(selectedIndex) === Number(question.correctIndex);
        if (isCorrect) correct += 1;
        return {
          question: question.prompt,
          selectedIndex: selectedIndex ?? null,
          correctIndex: question.correctIndex,
          isCorrect,
        };
      });
      const scorePercent = totalQuestions ? Math.round((correct / totalQuestions) * 100) : 0;

      await addDoc(collection(db, 'cbtSubmissions'), {
        examId: activeExam.id,
        examTitle: activeExam.title,
        subject: activeExam.subject,
        targetClass: activeExam.targetClass,
        studentName,
        regNo,
        className: studentClass,
        correct,
        totalQuestions,
        scorePercent,
        answers: reviewedAnswers,
        autoSubmitted,
        startedAt: startedAt?.toISOString() || new Date().toISOString(),
        submittedAt: serverTimestamp(),
      });

      setStatus({ type: 'success', message: `Submitted. Your score is ${correct}/${totalQuestions} (${scorePercent}%).` });
      setActiveExam(null);
      setAnswers({});
      loadStudentExams();
    } catch (error) {
      console.error('Error submitting CBT:', error);
      setStatus({ type: 'error', message: 'Unable to submit this exam.' });
    } finally {
      setSubmitting(false);
    }
  }, [activeExam, answers, loadStudentExams, regNo, startedAt, studentClass, studentName, submitting]);

  useEffect(() => {
    if (activeExam && secondsLeft === 0) {
      submitExam(true);
    }
  }, [secondsLeft, activeExam, submitExam]);

  if (loading) {
    return (
      <div className="cbt-loading">
        <Loader2 className="cbt-spin" size={28} />
        Loading CBT exams...
      </div>
    );
  }

  if (activeExam) {
    return (
      <div className="cbt-page cbt-student-exam">
        <div className="cbt-exam-bar">
          <div>
            <h1>{activeExam.title}</h1>
            <p>{activeExam.subject} • {activeExam.targetClass}</p>
          </div>
          <div className={`cbt-timer ${secondsLeft <= 300 ? 'urgent' : ''}`}>
            <Clock size={18} /> {formatTime(secondsLeft)}
          </div>
        </div>

        {activeExam.instructions && (
          <div className="cbt-instructions">{activeExam.instructions}</div>
        )}

        <div className="cbt-question-list">
          {activeExam.questions?.map((question, questionIndex) => (
            <div className="cbt-question-card" key={`${activeExam.id}-${questionIndex}`}>
              <div className="cbt-question-top">
                <strong>Question {questionIndex + 1}</strong>
                <span>{answers[questionIndex] !== undefined ? 'Answered' : 'Not answered'}</span>
              </div>
              <p>{question.prompt}</p>
              <div className="cbt-answer-options">
                {question.options.map((option, optionIndex) => (
                  <button
                    type="button"
                    key={`${questionIndex}-${optionIndex}`}
                    className={answers[questionIndex] === optionIndex ? 'selected' : ''}
                    onClick={() => setAnswers((current) => ({ ...current, [questionIndex]: optionIndex }))}
                  >
                    <span>{String.fromCharCode(65 + optionIndex)}</span>
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="cbt-submit-strip">
          <span>{Object.keys(answers).length}/{activeExam.questions?.length || 0} answered</span>
          <button type="button" className="cbt-primary-button" onClick={() => submitExam(false)} disabled={submitting}>
            {submitting ? <Loader2 className="cbt-spin" size={18} /> : <Send size={18} />}
            Submit Exam
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="cbt-page">
      <div className="cbt-header">
        <div>
          <h1>CBT Exams</h1>
          <p>Available objective tests for {studentClass || 'your class'}.</p>
        </div>
        <div className="cbt-header-stats">
          <span><FileQuestion size={16} /> {exams.length} Available</span>
          <span><Award size={16} /> {submissions.length} Submitted</span>
        </div>
      </div>

      {status.message && (
        <div className={`cbt-alert ${status.type}`}>
          {status.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {status.message}
        </div>
      )}

      <div className="cbt-exam-grid">
        {exams.map((exam) => {
          const submission = submissionByExam[exam.id];
          const isScheduledFuture = exam.scheduledTime && new Date(exam.scheduledTime) > new Date();
          return (
            <article className="cbt-exam-card" key={exam.id}>
              <div className="cbt-exam-main">
                <span className={`cbt-status-pill ${submission ? 'submitted' : 'published'}`}>
                  {submission ? 'submitted' : 'open'}
                </span>
                <h3>{exam.title}</h3>
                <p>{exam.subject} • {exam.targetClass}</p>
                <div className="cbt-metrics">
                  <span><Clock size={15} /> {exam.durationMinutes || 45} min</span>
                  <span><FileQuestion size={15} /> {exam.questions?.length || 0} questions</span>
                  {submission && <span>{submission.scorePercent}% score</span>}
                </div>
              </div>
              <div className="cbt-card-actions">
                {submission ? (
                  <strong className="cbt-score">{submission.correct}/{submission.totalQuestions}</strong>
                ) : isScheduledFuture ? (
                  <button type="button" disabled style={{ opacity: 0.7, cursor: 'not-allowed', background: '#e2e8f0', color: '#64748b', fontSize: '11px' }}>
                    Opens {new Date(exam.scheduledTime).toLocaleString()}
                  </button>
                ) : (
                  <button type="button" onClick={() => startExam(exam)}>
                    Start <ChevronRight size={17} />
                  </button>
                )}
              </div>
            </article>
          );
        })}
        {exams.length === 0 && (
          <div className="cbt-empty">No published CBT exams are available for your class yet.</div>
        )}
      </div>
    </div>
  );
};

export default StudentCBT;
