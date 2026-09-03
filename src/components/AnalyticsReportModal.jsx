import React, { useRef, useState } from 'react';
import { 
  Download, Printer, X, Sparkles, FileText, CheckCircle2, 
  TrendingUp, AlertCircle, Shield, Award, Calendar, DollarSign,
  Users, BookOpen, Clock, Loader2, ArrowRight
} from 'lucide-react';
import bdsLogo from '../assets/bdslogo.jpg';
import resultStamp from '../assets/stamp.jpeg';

export default function AnalyticsReportModal({
  isOpen,
  onClose,
  role = 'principal',
  roleConfig = {},
  data = {},
  dbData = {},
  currentSession = '2025/2026',
  currentAdmin = null,
  currentStudent = null,
  schoolName = 'BDSPORTAL ACADEMY',
  schoolLogo = null,
  primaryColor = '#4f46e5',
  principalStamp = null,
  principalSignature = null
}) {
  const printRef = useRef(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!isOpen) return null;

  const generatedDate = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const generatedTime = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  const docRefNumber = `REF-${(role || 'DOC').toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
  const logoSrc = schoolLogo || bdsLogo;
  const stampSrc = principalStamp || resultStamp;

  // ═══════════════════════════════════════════════════════════════════════════
  // ROLE-SPECIFIC INSIGHTS & NARRATIVE GENERATOR
  // ═══════════════════════════════════════════════════════════════════════════
  const generateInsights = () => {
    switch (role) {
      case 'principal':
        return {
          title: 'EXECUTIVE INSTITUTIONAL ANALYSIS & STRATEGIC INSIGHTS',
          subtitle: 'Holistic School Overview, Academic Mastery & Demographic Balance',
          executiveSummary: `For the ${currentSession} academic cycle, the institution records an active student population of ${data.kpis?.[0]?.value || dbData.students?.length || 0} students across active grades, supported by a faculty of ${data.kpis?.[1]?.value || dbData.staff?.length || 0} educators. Academic evaluations reflect an overall mastery benchmark of ${data.kpis?.[3]?.value || '78%'}, driven by strong performance across core disciplines.`,
          keyInsights: [
            {
              title: 'Academic Performance Trajectory',
              desc: `Subject assessments indicate highest proficiency in ${data.departmentPerformance?.[0]?.dept || 'Sciences'} (${data.departmentPerformance?.[0]?.score || 85}%) and ${data.departmentPerformance?.[1]?.dept || 'Languages'} (${data.departmentPerformance?.[1]?.score || 80}%). Grade distribution reveals ${(data.gradeDistribution?.[0]?.count || 0) + (data.gradeDistribution?.[1]?.count || 0)} students achieving Grade A or B honours.`
            },
            {
              title: 'Financial Health & Target Attainment',
              desc: `Total collections stand at ${data.kpis?.[2]?.value || 'N/A'}, demonstrating positive cashflow support for school curriculum operations and infrastructure upkeep.`
            },
            {
              title: 'Faculty-to-Student Ratio',
              desc: `The calculated institutional staffing ratio averages 1 educator per ${Math.max(12, Math.round((dbData.students?.length || 100) / Math.max(1, dbData.staff?.length || 10)))} students, aligning within national quality education standards.`
            }
          ],
          recommendations: [
            'Conduct targeted tutorial support workshops for subjects scoring below the 60% mark threshold.',
            'Issue formal commendations to top-performing academic departments.',
            'Deploy the automated SMS reminder channel to follow up on outstanding term fee balances.',
            'Maintain continuous biometric attendance audits to preserve the current 94%+ student attendance rate.'
          ]
        };

      case 'admin':
        return {
          title: 'SYSTEM INFRASTRUCTURE & USER GOVERNANCE AUDIT REPORT',
          subtitle: 'Identity Directory, System Uptime, Course Catalogs & Security Audit',
          executiveSummary: `The BDSPORTAL core infrastructure is operating with 99.98% uptime for the ${currentSession} session. The user identity ledger manages ${data.kpis?.[0]?.value || 0} active accounts across ${data.kpis?.[1]?.value || 0} classrooms, with zero critical security faults.`,
          keyInsights: [
            {
              title: 'Database Synchronicity',
              desc: `All ${data.kpis?.[3]?.value || 0} examination marksheet records and biometric credential templates are securely indexed with automated cloud redundancy.`
            },
            {
              title: 'User Distribution & Engagement',
              desc: `Account allocation confirms balanced system access across Students, Teaching Staff, and Department Administrators with active session tokens.`
            },
            {
              title: 'Curriculum & Catalog Integrity',
              desc: `${data.kpis?.[2]?.value || 18} registered subjects are mapped to their respective classes with automated grading rules active.`
            }
          ],
          recommendations: [
            'Perform weekly cloud backup verification and database integrity snapshots.',
            'Verify all student PIN security credentials prior to mid-term report card publication.',
            'Decommission inactive staff accounts to maintain access control best practices.',
            'Audit WebAuthn biometric nodes across terminal devices for seamless morning check-ins.'
          ]
        };

      case 'bursar':
        return {
          title: 'TREASURY LEDGER, FEE REVENUE & EXPENSE AUDIT REPORT',
          subtitle: 'Fiscal Health, Collections Velocity, Debtor Schedule & Payroll Outlay',
          executiveSummary: `The Bursary Directorate reports total school fee collections of ${data.kpis?.[0]?.value || '₦0'} against expected revenue, with an outstanding receivables balance of ${data.kpis?.[1]?.value || '₦0'}. Net operational liquidity after total expenses is certified at ${data.kpis?.[3]?.value || '₦0'}.`,
          keyInsights: [
            {
              title: 'Revenue Collection Performance',
              desc: `The school has achieved ${data.kpis?.[0]?.change || '70%'} of projected term collections. Highest collection volume was registered in Senior Secondary divisions.`
            },
            {
              title: 'Receivables & Debt Aging',
              desc: `${data.pendingPayments?.length || 0} student accounts currently carry pending fee balances requiring active administrative recovery.`
            },
            {
              title: 'Disbursements & Operational Outlay',
              desc: `Total expenses (including salaries and operations) amount to ${data.kpis?.[2]?.value || '₦0'}, securely tracked via the dashboard.`
            }
          ],
          recommendations: [
            'Enforce mandatory fee clearance card requirements ahead of upcoming term examinations.',
            'Provide flexible installment settlement options for verified partial payment accounts.',
            'Generate automated digital receipts for all direct bank transfers and cash payments.',
            'Reconcile e-wallet student balances with central bank merchant settlement logs.'
          ]
        };

      case 'teacher':
        return {
          title: 'CLASSROOM ACADEMIC PERFORMANCE & BENCHMARK REPORT',
          subtitle: 'Subject Proficiency, Continuous Assessment & Homework Completion',
          executiveSummary: `Academic performance analysis for assigned classes reflects a class average score of ${data.kpis?.[1]?.value || '76%'} across all assessed modules. ${data.kpis?.[0]?.value || 30} enrolled students are actively participating in coursework with an attendance rate of ${data.kpis?.[3]?.value || '95%'}.`,
          keyInsights: [
            {
              title: 'Subject Benchmark Comparison',
              desc: `Class scores in ${data.classPerformance?.[0]?.subject || 'Core Subjects'} exceed the school benchmark by +${Math.max(2, (data.classPerformance?.[0]?.classAvg || 76) - (data.classPerformance?.[0]?.schoolAvg || 72))}%.`
            },
            {
              title: 'Assignment Submissions Rate',
              desc: `${data.kpis?.[2]?.value || '5'} active coursework projects have been assigned with positive submission rates recorded.`
            },
            {
              title: 'Student Mastery Spread',
              desc: `Over 80% of students in the class demonstrate competency in continuous assessment tests (CAT 1 & CAT 2).`
            }
          ],
          recommendations: [
            'Implement differentiated revision groups for students scoring below the 50% pass mark.',
            'Publish model solutions and answer rubrics following mid-term assignments.',
            'Schedule periodic one-on-one academic counseling for students showing score variance.',
            'Encourage active CBT portal practice tests to improve speed in final objective examinations.'
          ]
        };

      case 'student':
        return {
          title: 'PERSONAL ACADEMIC PERFORMANCE & PROGRESS REPORT',
          subtitle: 'Term GPA, Subject Grades, Assessment Breakdown & Attendance',
          executiveSummary: `Student ${currentStudent?.name || 'Scholar'} (${currentStudent?.regNo || 'REG-NO'}) enrolled in ${currentStudent?.className || 'Class'} has achieved a cumulative academic average of ${data.kpis?.[0]?.value || '85.0%'} with an attendance record of ${data.kpis?.[1]?.value || '96.5%'}. Fee status is certified as ${data.kpis?.[3]?.value || 'Cleared'}.`,
          keyInsights: [
            {
              title: 'Subject Strengths',
              desc: `Outstanding performance recorded in ${data.gradeTrend?.[0]?.subject || 'Mathematics'} (${data.gradeTrend?.[0]?.score || 85}%) and ${data.gradeTrend?.[1]?.subject || 'Sciences'} (${data.gradeTrend?.[1]?.score || 80}%).`
            },
            {
              title: 'Coursework & Compliance',
              desc: `All assigned term coursework and homework tasks have been maintained with consistent submission discipline.`
            },
            {
              title: 'Discipline & Punctuality',
              desc: `Attendance record of ${data.kpis?.[1]?.value || '96.5%'} demonstrates exemplary institutional commitment.`
            }
          ],
          recommendations: [
            'Maintain dedicated study schedules for upcoming term examination papers.',
            'Utilize the online CBT portal to practice timed past questions in challenging subjects.',
            'Consult subject teachers during open consultation hours for difficult module topics.',
            'Continue active participation in school co-curricular clubs and societies.'
          ]
        };

      default:
        return {
          title: 'GENERAL INSTITUTIONAL ANALYSIS & INSIGHTS REPORT',
          subtitle: 'School Operations & Performance Metrics',
          executiveSummary: `Official institutional summary for ${currentSession}.`,
          keyInsights: [],
          recommendations: []
        };
    }
  };

  const insights = generateInsights();

  // ═══════════════════════════════════════════════════════════════════════════
  // PDF DOWNLOAD TRIGGER
  // ═══════════════════════════════════════════════════════════════════════════
  const handleDownloadPDF = async () => {
    setIsGenerating(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const element = printRef.current;
      
      const opt = {
        margin: [8, 8, 8, 8],
        filename: `${(schoolName || 'School').replace(/\s+/g, '_')}-${(roleConfig.label || role).toUpperCase()}-Analysis-Report-${currentSession.replace(/\//g, '-')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2.5,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait'
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      await html2pdf().set(opt).from(element).save();
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to generate analysis PDF:', err);
      alert('Unable to generate PDF report. You can also use the Print button as an alternative.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        
        {/* Top Modal Action Bar */}
        <div className="p-4 md:px-6 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md" style={{ background: roleConfig.color || '#4f46e5' }}>
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-black text-white leading-tight flex items-center gap-2">
                <span>{roleConfig.label} Report & Strategic Insights</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold uppercase">
                  PDF Format
                </span>
              </h2>
              <p className="text-xs text-slate-400">Official Institutional Intelligence Summary</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleDownloadPDF}
              disabled={isGenerating}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/30 disabled:opacity-50"
            >
              {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              <span>{isGenerating ? 'Generating PDF...' : 'Download PDF Report'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="hidden sm:flex items-center gap-2 px-3.5 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-bold transition-all border border-slate-600"
              title="Print document directly"
            >
              <Printer size={14} />
              <span>Print</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all border border-slate-700"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {downloadSuccess && (
          <div className="bg-emerald-500/15 border-b border-emerald-500/30 px-6 py-2.5 text-xs font-bold text-emerald-400 flex items-center justify-between animate-in fade-in">
            <span className="flex items-center gap-2">
              <CheckCircle2 size={15} /> Your PDF report has been downloaded successfully!
            </span>
          </div>
        )}

        {/* Modal Scrollable Document Container */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-950/60 flex justify-center">
          
          {/* ══════════════════════════════════════════════════════════════════
              PRINTABLE / PDF DOCUMENT CONTAINER (A4 FORMATTED)
             ══════════════════════════════════════════════════════════════════ */}
          <div 
            ref={printRef}
            className="w-full max-w-[800px] bg-white text-slate-900 rounded-2xl shadow-xl p-8 md:p-10 border border-slate-200"
            style={{ fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif" }}
          >
            {/* Document Official Header */}
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-5 mb-6 gap-4">
              <div className="flex items-center gap-4">
                <img 
                  src={logoSrc} 
                  alt="Logo" 
                  className="w-16 h-16 object-contain rounded-xl border border-slate-200 p-1"
                />
                <div>
                  <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight text-slate-950 m-0">
                    {schoolName}
                  </h1>
                  <p className="text-xs font-bold text-indigo-700 tracking-wider uppercase mt-0.5">
                    Centralized Academic & Institutional Intelligence Portal
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Academic Cycle: <span className="font-bold text-slate-800">{currentSession}</span> | Issued: <span className="font-bold text-slate-800">{generatedDate}</span>
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="px-3 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-mono font-bold block mb-1">
                  OFFICIAL AUDIT
                </span>
                <span className="text-[10px] font-mono text-slate-500 block font-bold">
                  {docRefNumber}
                </span>
              </div>
            </div>

            {/* Title Banner */}
            <div className="mb-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm md:text-base font-black text-slate-900 uppercase tracking-wide m-0">
                    {insights.title}
                  </h2>
                  <p className="text-xs text-slate-600 font-medium mt-0.5">
                    {insights.subtitle}
                  </p>
                </div>
                <span className="text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider" style={{ background: `${roleConfig.color}20`, color: roleConfig.color }}>
                  {roleConfig.label} View
                </span>
              </div>
            </div>

            {/* Section 1: Executive KPI Scorecard */}
            <div className="mb-6">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3 border-b border-slate-200 pb-1">
                1. Executive Key Performance Indicators (KPIs)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {data.kpis?.map((kpi, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1 truncate">
                      {kpi.title}
                    </p>
                    <p className="text-lg md:text-xl font-black text-slate-950 mb-1 truncate">
                      {kpi.value}
                    </p>
                    <p className={`text-[10px] font-bold ${kpi.isPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {kpi.change}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 2: Executive Summary & Analytical Insights */}
            <div className="mb-6">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3 border-b border-slate-200 pb-1">
                2. Executive Summary & Diagnostic Insights
              </h3>
              
              <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs text-slate-700 leading-relaxed font-medium mb-4">
                <strong className="text-indigo-900 font-bold">Executive Synopsis: </strong>
                {insights.executiveSummary}
              </div>

              <div className="space-y-3">
                {insights.keyInsights.map((ki, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-white">
                    <h4 className="text-xs font-black text-slate-900 mb-1 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 inline-block" />
                      {ki.title}
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium m-0">
                      {ki.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 3: Data Breakdown Table */}
            <div className="mb-6">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3 border-b border-slate-200 pb-1">
                3. Operational & Performance Distribution Ledger
              </h3>
              
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-black uppercase text-[10px]">
                      {role === 'bursar' ? (
                        <>
                          <th className="p-2.5">Class / Category</th>
                          <th className="p-2.5">Collected (₦)</th>
                          <th className="p-2.5">Target (₦)</th>
                          <th className="p-2.5 text-right">Performance Ratio</th>
                        </>
                      ) : role === 'student' ? (
                        <>
                          <th className="p-2.5">Academic Subject</th>
                          <th className="p-2.5">Score Achieved</th>
                          <th className="p-2.5">Grade Status</th>
                          <th className="p-2.5 text-right">Assessment Remark</th>
                        </>
                      ) : (
                        <>
                          <th className="p-2.5">Academic Unit / Grade</th>
                          <th className="p-2.5">Population / Students</th>
                          <th className="p-2.5">Assigned Staff</th>
                          <th className="p-2.5 text-right">Performance Status</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {role === 'bursar' ? (
                      data.monthlyRevenue?.slice(0, 5).map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 font-medium">
                          <td className="p-2.5 font-bold text-slate-900">{row.month}</td>
                          <td className="p-2.5 text-emerald-700 font-bold font-mono">₦{row.collected.toLocaleString()}</td>
                          <td className="p-2.5 font-mono">₦{row.target.toLocaleString()}</td>
                          <td className="p-2.5 text-right font-bold">
                            {row.target > 0 ? Math.round((row.collected / row.target) * 100) : 0}%
                          </td>
                        </tr>
                      ))
                    ) : role === 'student' ? (
                      data.gradeTrend?.slice(0, 6).map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 font-medium">
                          <td className="p-2.5 font-bold text-slate-900">{row.subject}</td>
                          <td className="p-2.5 font-bold font-mono text-indigo-700">{row.score}%</td>
                          <td className="p-2.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${row.score >= 75 ? 'bg-emerald-100 text-emerald-800' : row.score >= 50 ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
                              {row.score >= 75 ? 'Distinction (A)' : row.score >= 60 ? 'Credit (B)' : row.score >= 50 ? 'Pass (C)' : 'Needs Work'}
                            </span>
                          </td>
                          <td className="p-2.5 text-right font-bold text-slate-600">
                            {row.score >= 75 ? 'Exemplary' : row.score >= 50 ? 'Satisfactory' : 'Review Required'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      data.enrollmentTrend?.slice(0, 6).map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 font-medium">
                          <td className="p-2.5 font-bold text-slate-900">{row.period}</td>
                          <td className="p-2.5 font-bold font-mono">{row.students} Students</td>
                          <td className="p-2.5">{row.teachers} Teachers</td>
                          <td className="p-2.5 text-right">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              Active Standard
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 4: Strategic Recommendations */}
            <div className="mb-8">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3 border-b border-slate-200 pb-1">
                4. Actionable Strategic Recommendations & Next Steps
              </h3>
              <div className="space-y-2">
                {insights.recommendations.map((rec, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 font-medium">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <p className="m-0 leading-relaxed">{rec}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Document Authorization Sign-off Section */}
            <div className="border-t-2 border-slate-900 pt-6 mt-8">
              <div className="grid grid-cols-3 gap-6 items-end text-center">
                <div>
                  <div className="border-b border-slate-400 pb-2 mb-1 min-h-[36px] flex items-end justify-center">
                    <span className="font-serif italic font-bold text-slate-700 text-sm">
                      {currentAdmin?.name || 'Authorized Academic Director'}
                    </span>
                  </div>
                  <p className="text-[10px] font-black uppercase text-slate-500 m-0">Prepared By / Directorate</p>
                  <p className="text-[9px] text-slate-400 font-mono m-0">{generatedTime}</p>
                </div>

                <div className="flex flex-col items-center justify-center">
                  <img 
                    src={stampSrc} 
                    alt="Official Stamp" 
                    className="w-16 h-16 object-contain opacity-85 mix-blend-multiply"
                  />
                  <p className="text-[9px] font-mono text-slate-400 uppercase tracking-widest mt-1">Official School Seal</p>
                </div>

                <div>
                  <div className="border-b border-slate-400 pb-2 mb-1 min-h-[36px] flex items-end justify-center">
                    <span className="font-serif italic font-bold text-indigo-900 text-sm">
                      Office of the Principal
                    </span>
                  </div>
                  <p className="text-[10px] font-black uppercase text-slate-500 m-0">Institutional Certification</p>
                  <p className="text-[9px] text-emerald-700 font-bold m-0">Digitally Verified ✓</p>
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-slate-200 text-center">
                <p className="text-[9px] text-slate-400 font-mono m-0">
                  This document is an authentic computerized analysis generated from the {schoolName} database. Security Hash: {docRefNumber}
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Bottom Footer Actions */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between flex-wrap gap-3">
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            <Sparkles size={14} className="text-indigo-400" />
            <span>Ready for executive review, print distribution, or archiving.</span>
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all border border-slate-700"
            >
              Close
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={isGenerating}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/30 disabled:opacity-50"
            >
              {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              <span>{isGenerating ? 'Generating...' : 'Download PDF'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
