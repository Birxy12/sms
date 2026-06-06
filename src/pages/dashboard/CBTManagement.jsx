import React, { useEffect, useMemo, useState } from 'react';
import { db } from '../../lib/firebase';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Clock,
  Edit3,
  FileQuestion,
  Loader2,
  Plus,
  Save,
  Trash2,
  X,
  Upload,
  Wand2,
} from 'lucide-react';
import Papa from 'papaparse';
import { generateQuestions } from '../../utils/questionGenerator';
import { CLASS_LIST, getSubjectsForClass } from '../../utils/subjectConfig';
import './CBT.css';

const blankQuestion = () => ({
  prompt: '',
  options: ['', '', '', ''],
  correctIndex: 0,
});

const initialExam = {
  title: '',
  subject: 'ENGLISH LANGUAGE',
  targetClass: 'JSS1',
  durationMinutes: 45,
  scheduledTime: '',
  status: 'draft',
  instructions: '',
  questions: [blankQuestion()],
};

const normalizeExam = (exam) => ({
  ...exam,
  title: exam.title.trim(),
  subject: exam.subject.trim().toUpperCase(),
  targetClass: exam.targetClass.trim().toUpperCase(),
  durationMinutes: Number(exam.durationMinutes) || 45,
  scheduledTime: exam.scheduledTime || '',
  questions: exam.questions
    .map((question) => ({
      prompt: question.prompt.trim(),
      options: question.options.map((option) => option.trim()),
      correctIndex: Number(question.correctIndex) || 0,
    }))
    .filter((question) => question.prompt && question.options.every(Boolean)),
});

const CBTManagement = () => {
  const [exams, setExams] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [form, setForm] = useState(initialExam);
  const [editingId, setEditingId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  const subjects = useMemo(() => getSubjectsForClass(form.targetClass), [form.targetClass]);

  const loadCBTData = async () => {
    setLoading(true);
    try {
      const [examSnap, submissionSnap] = await Promise.all([
        getDocs(query(collection(db, 'cbtExams'), orderBy('createdAt', 'desc'))),
        getDocs(query(collection(db, 'cbtSubmissions'), orderBy('submittedAt', 'desc'))),
      ]);
      setExams(examSnap.docs.map((item) => ({ id: item.id, ...item.data() })));
      setSubmissions(submissionSnap.docs.map((item) => ({ id: item.id, ...item.data() })));
    } catch (error) {
      console.error('Error loading CBT data:', error);
      setStatus({ type: 'error', message: 'Unable to load CBT records.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCBTData();
  }, []);

  useEffect(() => {
    if (!status.message) return undefined;
    const timer = setTimeout(() => setStatus({ type: '', message: '' }), 3500);
    return () => clearTimeout(timer);
  }, [status]);

  useEffect(() => {
    if (subjects.length && !subjects.includes(form.subject)) {
      setForm((current) => ({ ...current, subject: subjects[0] }));
    }
  }, [subjects, form.subject]);

  const updateQuestion = (questionIndex, key, value) => {
    setForm((current) => ({
      ...current,
      questions: current.questions.map((question, index) => (
        index === questionIndex ? { ...question, [key]: value } : question
      )),
    }));
  };

  const updateOption = (questionIndex, optionIndex, value) => {
    setForm((current) => ({
      ...current,
      questions: current.questions.map((question, index) => {
        if (index !== questionIndex) return question;
        return {
          ...question,
          options: question.options.map((option, currentOptionIndex) => (
            currentOptionIndex === optionIndex ? value : option
          )),
        };
      }),
    }));
  };

  const addQuestion = () => {
    setForm((current) => ({ ...current, questions: [...current.questions, blankQuestion()] }));
  };

  const removeQuestion = (questionIndex) => {
    setForm((current) => ({
      ...current,
      questions: current.questions.filter((_, index) => index !== questionIndex),
    }));
  };

  const resetForm = () => {
    setForm(initialExam);
    setEditingId('');
  };

  const handleImportCSV = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const importedQuestions = results.data.map((row) => {
          const options = [
            row['Option A'] || '',
            row['Option B'] || '',
            row['Option C'] || '',
            row['Option D'] || '',
          ];
          
          const correctLetter = (row['Correct Answer'] || 'A').toUpperCase();
          const correctIndex = ['A', 'B', 'C', 'D'].indexOf(correctLetter);

          return {
            prompt: row['Question'] || '',
            options: options,
            correctIndex: correctIndex !== -1 ? correctIndex : 0,
          };
        }).filter(q => q.prompt && q.options.some(o => o));

        if (importedQuestions.length > 0) {
          setForm(prev => ({
            ...prev,
            questions: importedQuestions
          }));
          setStatus({ type: 'success', message: `Successfully imported ${importedQuestions.length} questions.` });
        } else {
          setStatus({ type: 'error', message: 'No valid questions found in CSV.' });
        }
        // Reset file input
        event.target.value = '';
      },
      error: (error) => {
        console.error('CSV Parse Error:', error);
        setStatus({ type: 'error', message: 'Failed to parse CSV file.' });
      }
    });
  };

  const editExam = (exam) => {
    setEditingId(exam.id);
    setForm({
      title: exam.title || '',
      subject: exam.subject || 'ENGLISH LANGUAGE',
      targetClass: exam.targetClass || 'JSS1',
      durationMinutes: exam.durationMinutes || 45,
      scheduledTime: exam.scheduledTime || '',
      status: exam.status || 'draft',
      instructions: exam.instructions || '',
      questions: exam.questions?.length ? exam.questions : [blankQuestion()],
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveExam = async (event) => {
    event.preventDefault();
    const payload = normalizeExam(form);

    if (!payload.title || payload.questions.length === 0) {
      setStatus({ type: 'error', message: 'Add a title and at least one complete question.' });
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, 'cbtExams', editingId), {
          ...payload,
          updatedAt: serverTimestamp(),
        });
        setStatus({ type: 'success', message: 'Exam updated successfully.' });
      } else {
        await addDoc(collection(db, 'cbtExams'), {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setStatus({ type: 'success', message: 'Exam created successfully.' });
      }
      resetForm();
      loadCBTData();
    } catch (error) {
      console.error('Error saving exam:', error);
      setStatus({ type: 'error', message: 'Unable to save this exam.' });
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (exam) => {
    const nextStatus = exam.status === 'published' ? 'draft' : 'published';
    try {
      await updateDoc(doc(db, 'cbtExams', exam.id), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
      setStatus({ type: 'success', message: nextStatus === 'published' ? 'Exam published.' : 'Exam moved to draft.' });
      loadCBTData();
    } catch (error) {
      console.error('Error publishing exam:', error);
      setStatus({ type: 'error', message: 'Unable to change exam status.' });
    }
  };

  const deleteExam = async (examId) => {
    if (!window.confirm('Delete this CBT exam? Student submissions will remain for audit records.')) return;
    try {
      await deleteDoc(doc(db, 'cbtExams', examId));
      setStatus({ type: 'success', message: 'Exam deleted.' });
      loadCBTData();
    } catch (error) {
      console.error('Error deleting exam:', error);
      setStatus({ type: 'error', message: 'Unable to delete exam.' });
    }
  };

  const submissionsByExam = useMemo(() => submissions.reduce((acc, submission) => {
    acc[submission.examId] = acc[submission.examId] || [];
    acc[submission.examId].push(submission);
    return acc;
  }, {}), [submissions]);

  const handleAutoGenerate = () => {
    if (form.questions.length > 0 && !window.confirm('This will replace your current questions. Continue?')) return;
    const newQuestions = generateQuestions(form.subject, 30);
    setForm({
      ...form,
      questions: newQuestions.map(q => ({
        id: Date.now() + Math.random(),
        ...q
      }))
    });
  };

  return (
    <div className="cbt-page">
      <div className="cbt-header">
        <div>
          <h1>CBT Exam System</h1>
          <p>Create objective exams, publish to classes, and review submitted scores.</p>
        </div>
        <div className="cbt-header-stats">
          <span><FileQuestion size={16} /> {exams.length} Exams</span>
          <span><BarChart3 size={16} /> {submissions.length} Attempts</span>
        </div>
      </div>

      {status.message && (
        <div className={`cbt-alert ${status.type}`}>
          {status.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {status.message}
        </div>
      )}

      <form className="cbt-builder" onSubmit={saveExam}>
        <div className="cbt-panel">
          <div className="cbt-panel-title">
            <h2>{editingId ? 'Edit Exam' : 'New Exam'}</h2>
            {editingId && (
              <button type="button" className="cbt-icon-button" onClick={resetForm} title="Cancel editing">
                <X size={18} />
              </button>
            )}
          </div>

          <div className="cbt-form-grid">
            <label>
              Exam Title
              <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Second Term Mathematics CBT" />
            </label>
            <label>
              Class
              <select value={form.targetClass} onChange={(event) => setForm({ ...form, targetClass: event.target.value })}>
                {CLASS_LIST.map((className) => <option key={className}>{className}</option>)}
              </select>
            </label>
            <label>
              Subject
              <select value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })}>
                {subjects.map((subject) => <option key={subject}>{subject}</option>)}
              </select>
            </label>
            <label>
              Duration
              <input type="number" min="5" max="240" value={form.durationMinutes} onChange={(event) => setForm({ ...form, durationMinutes: event.target.value })} />
            </label>
            <label>
              Scheduled Time
              <input type="datetime-local" value={form.scheduledTime || ''} onChange={(event) => setForm({ ...form, scheduledTime: event.target.value })} />
            </label>
            <label>
              Status
              <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </label>
          </div>

          <label className="cbt-full-field">
            Instructions
            <textarea value={form.instructions} onChange={(event) => setForm({ ...form, instructions: event.target.value })} placeholder="Answer all questions. Choose only one option per question." rows="3" />
          </label>
        </div>

        <div className="cbt-question-list">
          {form.questions.map((question, questionIndex) => (
            <div className="cbt-question-editor" key={`question-${questionIndex}`}>
              <div className="cbt-question-top">
                <strong>Question {questionIndex + 1}</strong>
                {form.questions.length > 1 && (
                  <button type="button" className="cbt-icon-button danger" onClick={() => removeQuestion(questionIndex)} title="Remove question">
                    <Trash2 size={17} />
                  </button>
                )}
              </div>
              <textarea
                value={question.prompt}
                onChange={(event) => updateQuestion(questionIndex, 'prompt', event.target.value)}
                placeholder="Type the question here"
                rows="2"
              />
              <div className="cbt-options-grid">
                {question.options.map((option, optionIndex) => (
                  <label className="cbt-option-field" key={`option-${questionIndex}-${optionIndex}`}>
                    <span>
                      <input
                        type="radio"
                        name={`correct-${questionIndex}`}
                        checked={question.correctIndex === optionIndex}
                        onChange={() => updateQuestion(questionIndex, 'correctIndex', optionIndex)}
                      />
                      Option {String.fromCharCode(65 + optionIndex)}
                    </span>
                    <input value={option} onChange={(event) => updateOption(questionIndex, optionIndex, event.target.value)} placeholder={`Answer option ${String.fromCharCode(65 + optionIndex)}`} />
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="cbt-builder-actions">
          <div className="cbt-builder-left">
            <button type="button" className="cbt-secondary-button" onClick={addQuestion}>
              <Plus size={18} /> Add Question
            </button>
            <button type="button" onClick={handleAutoGenerate} className="cbt-secondary-button" style={{ background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe' }}>
              <Wand2 size={18} /> Auto-generate 30 (AI)
            </button>
            <label className="cbt-secondary-button cursor-pointer">
              <Upload size={18} /> Import CSV
              <input 
                type="file" 
                accept=".csv" 
                className="hidden" 
                onChange={handleImportCSV} 
              />
            </label>
          </div>
          <button type="submit" className="cbt-primary-button" disabled={saving}>
            {saving ? <Loader2 size={18} className="cbt-spin" /> : <Save size={18} />}
            {editingId ? 'Save Changes' : 'Save Exam'}
          </button>
        </div>
      </form>

      <section className="cbt-panel">
        <div className="cbt-panel-title">
          <h2>Exam Bank</h2>
          {loading && <Loader2 size={18} className="cbt-spin" />}
        </div>
        <div className="cbt-exam-grid">
          {exams.map((exam) => {
            const attempts = submissionsByExam[exam.id] || [];
            const average = attempts.length
              ? Math.round(attempts.reduce((sum, attempt) => sum + (attempt.scorePercent || 0), 0) / attempts.length)
              : 0;
            return (
              <article className="cbt-exam-card" key={exam.id}>
                <div className="cbt-exam-main">
                  <span className={`cbt-status-pill ${exam.status}`}>{exam.status || 'draft'}</span>
                  <h3>{exam.title}</h3>
                  <p>{exam.subject} • {exam.targetClass}</p>
                  <div className="cbt-metrics">
                    <span><Clock size={15} /> {exam.durationMinutes || 45} min</span>
                    <span><FileQuestion size={15} /> {exam.questions?.length || 0} questions</span>
                    <span><BarChart3 size={15} /> {attempts.length} attempts</span>
                    <span>{average}% avg</span>
                  </div>
                </div>
                <div className="cbt-card-actions">
                  <button type="button" onClick={() => editExam(exam)} title="Edit exam"><Edit3 size={17} /></button>
                  <button type="button" onClick={() => togglePublish(exam)} title="Publish or unpublish">
                    {exam.status === 'published' ? 'Draft' : 'Publish'}
                  </button>
                  <button type="button" className="danger" onClick={() => deleteExam(exam.id)} title="Delete exam"><Trash2 size={17} /></button>
                </div>
              </article>
            );
          })}
          {!loading && exams.length === 0 && (
            <div className="cbt-empty">No CBT exams have been created yet.</div>
          )}
        </div>
      </section>
    </div>
  );
};

export default CBTManagement;
