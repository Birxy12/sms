import React, { useRef, useState, useImperativeHandle, forwardRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import bdsLogo from '../assets/bdslogo.jpg';
import html2pdf from 'html2pdf.js';
import StudentAvatar from './StudentAvatar';
import { generateAutoComments } from '../utils/commentGenerator';

const BulkStudentResults = forwardRef(({ studentsData, selectedPub, formTeacherName }, ref) => {
  const {
    schoolName, schoolLogo, primaryColor, principalSignature, principalStamp,
    averageDivisors, termEndDate, nextTermBeginsDate, principalName,
    autoCommentsEnabled, commentTemplates
  } = useTheme();

  const printRef = useRef(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  useImperativeHandle(ref, () => ({
    generatePDF: async () => {
      if (!printRef.current) return false;
      setIsGeneratingPDF(true);
      
      try {
        const pages = printRef.current.querySelectorAll('.student-page');
        if (pages.length === 0) return false;

        const opt = {
          margin: 0,
          filename: `${selectedPub?.targetClass || 'Class'}-Results-${selectedPub?.term}.pdf`,
          image: { type: 'jpeg', quality: 0.75 },
          html2canvas: { 
            scale: 1.0, 
            useCORS: true, 
            logging: false, 
            allowTaint: true, 
            backgroundColor: '#ffffff',
            scrollX: 0,
            scrollY: 0
          },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        let worker = html2pdf().set(opt).from(pages[0]).toContainer().toCanvas().toPdf();

        for (let i = 1; i < pages.length; i++) {
          worker = worker.get('pdf').then((pdf) => {
            pdf.addPage();
          }).from(pages[i]).toContainer().toCanvas().toPdf();
        }

        await worker.save();
        return true;
      } catch (err) {
        console.error('Bulk PDF Download failed:', err);
        return false;
      } finally {
        setIsGeneratingPDF(false);
      }
    }
  }));

  const formatDOB = (dobStr) => {
    if (!dobStr) return 'N/A';
    const d = new Date(dobStr);
    if (isNaN(d.getTime())) return dobStr;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  if (!studentsData || studentsData.length === 0) return null;

  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: '794px', zIndex: -9999 }}>
      <div className="bulk-report-card-print" ref={printRef}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Inter:wght@400;500;600;700;800;900&display=swap');
          
          .bulk-report-card-print {
            background: white;
            width: 794px;
          }
          
          .student-page {
            width: 794px;
            height: 1122px;
            padding: 10mm 8mm 6mm 8mm;
            margin: 0 auto;
            background: white;
            color: #1a1a2e;
            font-family: 'Inter', sans-serif;
            position: relative;
            box-sizing: border-box;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            page-break-after: always;
          }
          .student-page:last-child {
             page-break-after: auto;
          }

          /* ─── HEADER ─── */
          .rc-header {
            background: #ffffff;
            border-bottom: 3px solid #1e3a5f;
            color: #1e3a5f;
            padding: 12px 0;
            position: relative;
          }
          .rc-header-inner {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
          }
          .rc-logo-wrap {
            width: 56px;
            height: 56px;
            background: white;
            border-radius: 8px;
            padding: 3px;
            box-shadow: 0 2px 8px rgba(30,58,95,0.15);
            border: 1px solid #e2e8f0;
            flex-shrink: 0;
          }
          .rc-logo-wrap img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            border-radius: 6px;
          }
          .rc-school-info {
            flex: 1;
            text-align: center;
          }
          .rc-school-info h1 {
            font-family: 'Playfair Display', serif;
            font-size: 18px;
            font-weight: 900;
            margin: 0 0 2px 0;
            letter-spacing: 0.5px;
            color: #1e3a5f;
          }
          .rc-school-info h2 {
            font-size: 10px;
            font-weight: 700;
            margin: 0 0 3px 0;
            color: #64748b;
            letter-spacing: 2px;
            text-transform: uppercase;
          }
          .rc-school-info p {
            font-size: 7px;
            margin: 0;
            color: #94a3b8;
            font-weight: 500;
          }
          .rc-badge {
            display: inline-block;
            background: #1e3a5f;
            color: white;
            padding: 2px 12px;
            border-radius: 20px;
            font-size: 7.5px;
            font-weight: 800;
            margin-top: 4px;
            letter-spacing: 1px;
            text-transform: uppercase;
          }
          .rc-photo-wrap {
            width: 52px;
            height: 64px;
            background: white;
            border-radius: 6px;
            padding: 2px;
            box-shadow: 0 2px 8px rgba(30,58,95,0.12);
            border: 1px solid #e2e8f0;
            flex-shrink: 0;
            overflow: hidden;
          }
          .rc-photo-wrap img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 4px;
          }

          /* ─── STUDENT BAR ─── */
          .rc-student-bar {
            background: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
            padding: 6px 0;
            margin-bottom: 8px;
            margin-top: 32px;
          }
          .rc-student-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 4px 16px;
          }
          .rc-stat {
            display: flex;
            align-items: center;
            gap: 5px;
            font-size: 7.5px;
          }
          .rc-stat-label {
            font-weight: 800;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            white-space: nowrap;
            font-size: 6.5px;
          }
          .rc-stat-value {
            font-weight: 700;
            color: #1e3a5f;
            border-bottom: 1px solid #cbd5e1;
            flex: 1;
            padding-bottom: 1px;
          }
          .rc-stat-value.accent {
            color: #0369a1;
            font-weight: 900;
            font-size: 8px;
          }

          /* ─── BODY ─── */
          .rc-body {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .rc-section-title {
            background: #1e3a5f;
            color: white;
            text-align: center;
            padding: 3px;
            font-size: 7.5px;
            font-weight: 900;
            letter-spacing: 2px;
            text-transform: uppercase;
            border-radius: 3px;
            margin-bottom: 4px;
          }

          .rc-main-grid {
            display: grid;
            grid-template-columns: 1.7fr 1fr;
            gap: 16px;
            flex: 1;
            align-items: stretch;
          }

          .rc-table {
            width: 100%;
            height: 100%;
            border-collapse: collapse;
            border-spacing: 0;
            font-size: 8px;
            border-radius: 4px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.06);
            border: 1px solid rgba(0, 0, 0, 0.7);
          }
          .rc-table thead th {
            background: #1e3a5f;
            color: white;
            padding: 5px 3px;
            font-weight: 800;
            font-size: 7px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            border: 1px solid rgba(0, 0, 0, 0.7);
          }
          .rc-table tbody td {
            padding: 8px 4px;
            border: 1px solid rgba(0, 0, 0, 0.7);
            text-align: center;
            font-weight: 600;
            color: #334155;
          }
          .rc-table tbody tr:nth-child(even) { background: #f8fafc; }
          .rc-table td.subject-name {
            text-align: left;
            font-weight: 800;
            color: #1e3a5f;
            padding-left: 6px;
          }
          .rc-grade { font-weight: 900; color: #0369a1; }

          /* ─── SIDE PANELS ─── */
          .rc-side {
            display: flex;
            flex-direction: column;
            gap: 12px;
            justify-content: space-between;
          }
          .rc-panel {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            overflow: hidden;
            box-shadow: 0 1px 2px rgba(0,0,0,0.04);
          }
          .rc-panel-header {
            background: #1e3a5f;
            color: white;
            padding: 4px 8px;
            font-size: 7px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .rc-mini-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 7px;
          }
          .rc-mini-table th {
            background: #f1f5f9;
            padding: 4px;
            font-weight: 800;
            color: #475569;
            font-size: 6.5px;
            border: 1px solid rgba(0, 0, 0, 0.7);
          }
          .rc-mini-table td {
            padding: 5px 3px;
            text-align: center;
            font-weight: 700;
            color: #334155;
            border: 1px solid rgba(0, 0, 0, 0.7);
            height: 22px;
          }
          .rc-mini-table td:first-child {
            text-align: left;
            padding-left: 5px;
            font-weight: 800;
            color: #1e3a5f;
            font-size: 6.5px;
          }
          .rc-check { color: #059669; font-weight: 900; font-size: 10px; }

          /* ─── SUMMARY ─── */
          .rc-summary {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
          }
          .rc-summary-box {
            background: #f0f9ff;
            border: 1px solid #bae6fd;
            border-radius: 4px;
            padding: 10px;
            text-align: center;
          }
          .rc-summary-box label {
            font-size: 7px;
            font-weight: 900;
            color: #0369a1;
            text-transform: uppercase;
            letter-spacing: 1px;
            display: block;
            margin-bottom: 2px;
          }
          .rc-summary-box .value {
            font-size: 16px;
            font-weight: 900;
            color: #0c4a6e;
          }
          .rc-summary-box.status {
            background: #f0fdf4;
            border-color: #86efac;
          }
          .rc-summary-box.status label { color: #15803d; }
          .rc-summary-box.status .value { color: #14532d; }
          .rc-summary-box.status-repeat {
            background: #fef2f2;
            border-color: #fecaca;
          }
          .rc-summary-box.status-repeat label { color: #b91c1c; }
          .rc-summary-box.status-repeat .value { color: #7f1d1d; }

          /* ─── COMMENTS ─── */
          .rc-comments {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-top: auto;
          }
          .rc-comment-card {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            padding: 10px 12px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.03);
          }
          .rc-comment-card label {
            font-size: 7.5px;
            font-weight: 900;
            color: #1e3a5f;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            display: block;
            margin-bottom: 4px;
            padding-bottom: 2px;
            border-bottom: 1px solid #e2e8f0;
          }
          .rc-comment-card p {
            font-size: 7.5px;
            color: #475569;
            font-style: italic;
            line-height: 1.3;
            margin: 0 0 4px 0;
            min-height: 24px;
          }
          .rc-sig-row {
            display: flex;
            align-items: flex-end;
            gap: 6px;
          }
          .rc-sig-line {
            flex: 1;
            border-bottom: 1px solid #94a3b8;
            height: 16px;
            position: relative;
          }
          .rc-sig-line img {
            height: 16px;
            object-fit: contain;
            position: absolute;
            bottom: 0;
            left: 0;
          }
          .rc-sig-name {
            font-size: 7px;
            font-weight: 900;
            color: #1e3a5f;
            text-transform: uppercase;
            margin-top: 1px;
            letter-spacing: 0.3px;
          }

          /* ─── FOOTER ─── */
          .rc-footer {
            margin-top: 16px;
            background: white;
            border-top: 2px solid #1e3a5f;
            padding: 8px 0 4px 0;
          }
          .rc-footer-inner {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .rc-footer-left {
            text-align: center;
          }
          .rc-footer-line {
            width: 90px;
            border-bottom: 1px solid rgba(240, 245, 250, 1);
            height: 14px;
            margin: 0 auto;
          }
          .rc-footer-name {
            font-size: 6.5px;
            font-weight: 900;
            color: #1e3a5f;
            margin: 2px 0 0 0;
            text-transform: uppercase;
          }
          .rc-footer-role {
            font-size: 5.5px;
            color: #64748b;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .rc-stamp-wrap {
            width: 56px;
            height: 56px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .rc-stamp-wrap img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            opacity: 0.85;
            transform: rotate(-8deg);
          }
          .rc-stamp-placeholder {
            width: 50px;
            height: 32px;
            border: 2px dashed #cbd5e1;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 5.5px;
            font-weight: 900;
            color: #cbd5e1;
            transform: rotate(-8deg);
          }
          .rc-footer-right {
            text-align: right;
          }
          .rc-footer-right p {
            font-size: 6.5px;
            margin: 1px 0;
            color: #64748b;
            font-weight: 600;
          }
          .rc-footer-right strong {
            color: #1e3a5f;
            font-weight: 800;
          }
          .rc-branding-bar {
            background: transparent;
            color: #94a3b8;
            text-align: center;
            width: 100%;
            padding: 3px;
            font-size: 5.5px;
            font-weight: 700;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            margin-top: 4px;
            border-radius: 2px;
          }

          /* ─── WATERMARK ─── */
          .rc-watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-35deg);
            font-size: 72px;
            font-weight: 900;
            color: rgba(30, 58, 95, 0.02);
            white-space: nowrap;
            pointer-events: none;
            z-index: 0;
            font-family: 'Playfair Display', serif;
          }
        `}</style>
        
        {studentsData.map((data, index) => {
          const { student, marks, classStats } = data;
          
          const autoC = generateAutoComments(marks?.average, commentTemplates);
          const teacherCommentText = marks?.raw?.teacherComment || (autoCommentsEnabled ? autoC.teacherComment : 'An impressive performance. Keep up the good work.');
          const principalCommentText = marks?.raw?.principalComment || (autoCommentsEnabled ? autoC.principalComment : 'You came out with flying colours. Congratulations!');
          
          return (
            <div key={student.id || index} className="student-page">
              <div className="rc-watermark">{schoolName || 'BONUS DOMINUS'}</div>

              {/* HEADER */}
              <div className="rc-header">
                <div className="rc-header-inner">
                  <div className="rc-logo-wrap">
                    <img src={schoolLogo || bdsLogo} alt="School Logo" />
                  </div>
                  <div className="rc-school-info">
                    <h1>{schoolName || 'BONUS  DOMINUS  SCHOOL'}</h1>
                    <h2>Primary & Secondary School</h2>
                    <p>5A — 5C Uzoanya Crescent, Amuzukwu, Umuahia, Abia State</p>
                    <div className="rc-badge">{selectedPub?.term} Report Card &mdash; {selectedPub?.session}</div>
                  </div>
                  <div className="rc-photo-wrap">
                    {student?.photo ? (
                      <img src={student.photo} alt="Student" />
                    ) : (
                      <StudentAvatar gender={student?.gender} avatarId={student?.avatarId} size="100%" />
                    )}
                  </div>
                </div>
              </div>

              {/* STUDENT INFO BAR */}
              <div className="rc-student-bar">
                <div className="rc-student-grid">
                  <div className="rc-stat"><span className="rc-stat-label">Name:</span> <span className="rc-stat-value">{student?.name}</span></div>
                  <div className="rc-stat"><span className="rc-stat-label">Reg No:</span> <span className="rc-stat-value">{student?.regNo || student?.['REG NO'] || student?.REGNO}</span></div>
                  <div className="rc-stat"><span className="rc-stat-label">Sex:</span> <span className="rc-stat-value">{(student?.gender === 'M' || (student?.gender && student?.gender.toLowerCase().startsWith('m'))) ? 'Male' : (student?.gender === 'F' || (student?.gender && student?.gender.toLowerCase().startsWith('f'))) ? 'Female' : (student?.gender || 'N/A')}</span></div>
                  <div className="rc-stat"><span className="rc-stat-label">Average:</span> <span className="rc-stat-value accent">{marks?.average}%</span></div>
                  <div className="rc-stat"><span className="rc-stat-label">Position:</span> <span className="rc-stat-value accent">{classStats?.position}</span></div>
                  <div className="rc-stat"><span className="rc-stat-label">Class:</span> <span className="rc-stat-value">{classStats?.historicalClass || student?.className}</span></div>
                  <div className="rc-stat"><span className="rc-stat-label">Population:</span> <span className="rc-stat-value">{classStats?.population}</span></div>
                  <div className="rc-stat"><span className="rc-stat-label">DOB:</span> <span className="rc-stat-value">{formatDOB(student?.dob)}</span></div>
                  <div className="rc-stat"><span className="rc-stat-label">House:</span> <span className="rc-stat-value">{student?.house || 'ALAMANDA'}</span></div>
                </div>
              </div>

              {/* BODY */}
              <div className="rc-body">
                <div className="rc-section-title">Academic Performance</div>

                <div className="rc-main-grid">
                  {/* TABLE */}
                  <div className="rc-table-wrap">
                    <table className="rc-table">
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', paddingLeft: '8px' }}>Subjects</th>
                          <th>CA1 (20)</th>
                          <th>CA2 (20)</th>
                          <th>Exam (60)</th>
                          <th>Total (100)</th>
                          <th>Grade</th>
                          <th>Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {marks?.subjects?.map((sub, idx) => (
                          <tr key={idx}>
                            <td className="subject-name">{sub.subject}</td>
                            <td>{sub.cat1}</td>
                            <td>{sub.cat2}</td>
                            <td>{sub.exam}</td>
                            <td style={{ fontWeight: 800 }}>{sub.total}</td>
                            <td className="rc-grade">{sub.grade}</td>
                            <td style={{ fontSize: '6px', fontWeight: 700, textTransform: 'uppercase' }}>
                              {sub.total >= 75 ? 'Distinction' :
                                sub.total >= 60 ? 'Excellent' :
                                  sub.total >= 50 ? 'Very Good' :
                                    sub.total >= 40 ? 'Average' : 'Fail'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* SIDE PANELS */}
                  <div className="rc-side">
                    {/* Behavioural */}
                    <div className="rc-panel">
                      <div className="rc-panel-header">Behavioural Assessment</div>
                      <table className="rc-mini-table">
                        <thead>
                          <tr>
                            <th>Traits</th>
                            <th>1</th>
                            <th>2</th>
                            <th>3</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { label: 'Attentiveness', value: marks?.raw?.behaviour?.attentiveness || 3 },
                            { label: 'Honesty', value: marks?.raw?.behaviour?.honesty || 3 },
                            { label: 'Neatness', value: marks?.raw?.behaviour?.neatness || 3 },
                            { label: 'Politeness', value: marks?.raw?.behaviour?.politeness || 3 },
                            { label: 'Punctuality', value: marks?.raw?.behaviour?.punctuality || 3 }
                          ].map(t => (
                            <tr key={t.label}>
                              <td>{t.label}</td>
                              {[1, 2, 3].map(level => (
                                <td key={level}>{t.value === level ? <span className="rc-check">&#10003;</span> : ''}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Psychomotor */}
                    <div className="rc-panel">
                      <div className="rc-panel-header">Psychomotor Skills</div>
                      <table className="rc-mini-table">
                        <thead>
                          <tr>
                            <th>Skill</th>
                            <th>1</th>
                            <th>2</th>
                            <th>3</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { label: 'Hand Writing', value: marks?.raw?.skills?.handwriting || 3 },
                            { label: 'Spoken English', value: marks?.raw?.skills?.english || 3 },
                            { label: 'Outdoor Games', value: marks?.raw?.skills?.games || 3 }
                          ].map(s => (
                            <tr key={s.label}>
                              <td>{s.label}</td>
                              {[1, 2, 3].map(level => (
                                <td key={level}>{s.value === level ? <span className="rc-check">&#10003;</span> : ''}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Summary */}
                    <div className="rc-summary">
                      <div className="rc-summary-box">
                        <label>Total Score</label>
                        <div className="value">{marks?.overallTotal}</div>
                      </div>
                      <div className={`rc-summary-box ${marks?.average < 45 ? 'status-repeat' : 'status'}`}>
                        <label>Status</label>
                        <div className="value">
                          {marks?.average < 45 
                            ? (selectedPub?.term?.toLowerCase().includes('third') ? 'REPEAT' : 'FAIL') 
                            : (selectedPub?.term?.toLowerCase().includes('third') ? 'PROMOTED' : 'PASS')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* COMMENTS */}
                <div className="rc-comments">
                  <div className="rc-comment-card">
                    <label>Teacher's Comment</label>
                    <p>{teacherCommentText}</p>
                    <div className="rc-sig-row">
                      <div style={{ flex: 1 }}>
                        <div className="rc-sig-line">
                          {principalSignature && <img src={principalSignature} alt="" style={{ height: '16px' }} />}
                        </div>
                        <div className="rc-sig-name">{formTeacherName || 'CLASS TEACHER'}</div>
                      </div>
                    </div>
                  </div>
                  <div className="rc-comment-card">
                    <label>Principal's Comment</label>
                    <p>{principalCommentText}</p>
                    <div className="rc-sig-row">
                      <div style={{ flex: 1 }}>
                        <div className="rc-sig-line">
                          {principalSignature && <img src={principalSignature} alt="Principal" style={{ height: '16px' }} />}
                        </div>
                        <div className="rc-sig-name">Principal ({principalName || 'Mrs Etuzu Anita'})</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* FOOTER */}
              <div className="rc-footer">
                <div className="rc-footer-inner">
                  <div className="rc-footer-left">
                    <div className="rc-footer-line"></div>
                    <div className="rc-footer-name">{principalName || 'Mrs Etuzu Anita'}</div>
                    <div className="rc-footer-role">Principal's Signature</div>
                  </div>
                  <div className="rc-stamp-wrap">
                    {principalStamp ? (
                      <img src={principalStamp} alt="School Stamp" />
                    ) : (
                      <div className="rc-stamp-placeholder">SCHOOL STAMP</div>
                    )}
                  </div>
                  <div className="rc-footer-right">
                    <p>Term Ends: <strong>{termEndDate || ''}</strong></p>
                    <p>Next Term Begins: <strong>{nextTermBeginsDate || ''}</strong></p>
                  </div>
                </div>
                <div className="rc-branding-bar">
                  Powered by GLOBIXTECH ENT
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default BulkStudentResults;
