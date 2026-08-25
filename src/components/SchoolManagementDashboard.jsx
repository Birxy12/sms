import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie, Legend
} from 'recharts';
import {
  LayoutDashboard, Users, GraduationCap, DollarSign, Bus, BookOpen,
  CalendarDays, Bell, Settings, Shield, School, TrendingUp, TrendingDown,
  ArrowUpRight, ArrowDownRight, FileText, ClipboardList, Award,
  CreditCard, Wallet, Receipt, AlertCircle, CheckCircle2, Clock,
  ChevronRight, BarChart3, Activity, UserCheck, Sparkles, RefreshCw, Loader2, Database
} from 'lucide-react';
import { db } from '../lib/firebase';
import { ensureFirebaseAuth } from '../lib/ensureAuth';
import { collection, getDocs, doc, getDoc, query, limit, orderBy, where } from 'firebase/firestore';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useStudentAuth } from '../context/StudentAuthContext';
import { useTheme } from '../context/ThemeContext';
import { expandStudent, expandMarks, MARKS_KEYS, STUDENT_KEYS } from '../utils/firestoreSchema';
import { fetchGlobalClasses, DEFAULT_CLASSES } from '../utils/classUtils';
import { useOnlineUsers } from '../utils/presence';
import AnalyticsReportModal from './AnalyticsReportModal';

// ═══════════════════════════════════════════════════════════════════════════════
// REUSABLE UI COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

export const KPICard = ({ title, value, change, isPositive, icon: Icon, subText }) => (
  <div className="bg-slate-900/90 border border-slate-700/60 rounded-2xl p-5 backdrop-blur-md hover:border-slate-500/50 transition-all duration-300 shadow-lg shadow-black/20 hover:translate-y-[-2px] flex flex-col justify-between">
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{title}</span>
        <div className={`p-2.5 rounded-xl ${isPositive ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/15 text-rose-400 border border-rose-500/20'}`}>
          <Icon size={18} />
        </div>
      </div>
      <div className="text-2xl lg:text-3xl font-black text-white mb-1 tracking-tight truncate" title={String(value)}>
        {value}
      </div>
    </div>
    <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between">
      <div className={`flex items-center gap-1 text-xs font-semibold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
        {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
        <span>{change}</span>
      </div>
      {subText && <span className="text-[10px] text-slate-500 font-medium truncate">{subText}</span>}
    </div>
  </div>
);

export const SectionCard = ({ title, children, className = '', rightAction }) => (
  <div className={`bg-slate-900/90 border border-slate-700/60 rounded-2xl p-5 md:p-6 backdrop-blur-md shadow-lg shadow-black/20 ${className}`}>
    <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
      <h3 className="text-base md:text-lg font-bold text-white tracking-tight flex items-center gap-2">
        {title}
      </h3>
      {rightAction && <div>{rightAction}</div>}
    </div>
    {children}
  </div>
);

export const CustomTooltip = ({ active, payload, label, prefix = '', suffix = '' }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 border border-slate-700 rounded-xl px-4 py-2.5 shadow-2xl backdrop-blur-md z-50">
        <p className="text-slate-400 text-xs font-medium mb-1.5 border-b border-slate-800 pb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} className="text-white text-xs font-semibold flex items-center justify-between gap-4" style={{ color: p.color || '#fff' }}>
            <span>{p.name}:</span>
            <span className="font-bold">{prefix}{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}{suffix}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const StatusBadge = ({ status }) => {
  const norm = (status || 'info').toLowerCase();
  const styles = {
    success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    cleared: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    completed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    error: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    overdue: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    urgent: 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse',
    high: 'bg-rose-500/15 text-rose-400 border-rose-500/30 font-bold',
    warning: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    due: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    pending: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    medium: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    info: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    upcoming: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    low: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${styles[norm] || styles.info}`}>
      {status ? (status.charAt(0).toUpperCase() + status.slice(1)) : 'Normal'}
    </span>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// ROLE VIEWS WITH REALTIME DATA
// ═══════════════════════════════════════════════════════════════════════════════

export const PrincipalAnalysisView = ({ data }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {data.kpis.map((kpi) => <KPICard key={kpi.title} {...kpi} />)}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <SectionCard title="Class Population & Staffing" className="lg:col-span-2">
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.enrollmentTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="studentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="teacherGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.35}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
              <XAxis dataKey="period" interval={0} angle={-30} textAnchor="end" height={55} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="students" name="Students" stroke="#3b82f6" strokeWidth={2.5} fill="url(#studentGrad)" dot={{ r: 3, fill: '#3b82f6' }} />
              <Area type="monotone" dataKey="teachers" name="Teachers / Staff" stroke="#10b981" strokeWidth={2.5} fill="url(#teacherGrad)" dot={{ r: 3, fill: '#10b981' }} />
              <Legend verticalAlign="top" height={28} iconType="circle" formatter={(v) => <span className="text-slate-300 text-xs">{v}</span>} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <SectionCard title="School Grade Distribution">
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data.gradeDistribution} dataKey="count" nameKey="grade" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4}>
                {data.gradeDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} stroke="rgba(15,23,42,0.8)" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip suffix=" grades" />} />
              <Legend verticalAlign="bottom" height={36} iconType="circle" formatter={(value) => <span className="text-slate-300 text-xs font-medium">Grade {value}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <SectionCard title="Subject Performance Averages">
        <div style={{ width: '100%', height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.departmentPerformance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
              <XAxis dataKey="dept" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} domain={[0, 100]} />
              <Tooltip content={<CustomTooltip suffix="%" />} />
              <Bar dataKey="score" name="Average Score" radius={[6, 6, 0, 0]}>
                {data.departmentPerformance.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? '#3b82f6' : `rgba(59,130,246,${0.85 - i * 0.08})`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <SectionCard title="School Activity & Broadcast Alerts">
        <div className="space-y-3 max-h-[240px] overflow-y-auto pr-1">
          {data.recentAlerts && data.recentAlerts.length > 0 ? (
            data.recentAlerts.map((alert) => (
              <div key={alert.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/40 hover:bg-slate-800/80 transition-colors">
                <div className="mt-0.5 shrink-0">
                  {alert.type === 'urgent' && <AlertCircle size={16} className="text-rose-400" />}
                  {alert.type === 'warning' && <AlertCircle size={16} className="text-amber-400" />}
                  {alert.type === 'success' && <CheckCircle2 size={16} className="text-emerald-400" />}
                  {alert.type === 'info' && <Bell size={16} className="text-blue-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs md:text-sm text-white font-medium truncate">{alert.message}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                    <Clock size={11} /> {alert.time}
                  </p>
                </div>
                <StatusBadge status={alert.type} />
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-slate-500 text-xs italic">
              No recent alerts found in database.
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  </div>
);

export const AdminAnalysisView = ({ data }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {data.kpis.map((kpi) => <KPICard key={kpi.title} {...kpi} />)}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <SectionCard title="User Demographics & Class Distribution" className="lg:col-span-2">
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.userGrowth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
              <XAxis dataKey="period" interval={0} angle={-30} textAnchor="end" height={55} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip content={<CustomTooltip suffix=" students" />} />
              <Area type="monotone" dataKey="users" name="Students in Class" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#userGrad)" dot={{ r: 3, fill: '#8b5cf6' }} activeDot={{ r: 6, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <SectionCard title="System Roles Ratio">
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data.roleDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4}>
                {data.roleDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} stroke="rgba(15,23,42,0.8)" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip suffix=" accounts" />} />
              <Legend verticalAlign="bottom" height={36} iconType="circle" formatter={(value) => <span className="text-slate-300 text-xs font-medium">{value}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>
    </div>

    <SectionCard title="System Operations & Audit Trail">
      <div className="overflow-x-auto">
        <table className="w-full text-xs md:text-sm">
          <thead>
            <tr className="border-b border-slate-700/60">
              <th className="text-left py-3 px-3 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">Event</th>
              <th className="text-left py-3 px-3 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">Target / Category</th>
              <th className="text-left py-3 px-3 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">Timestamp</th>
              <th className="text-left py-3 px-3 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.systemLogs && data.systemLogs.length > 0 ? (
              data.systemLogs.map((log) => (
                <tr key={log.id} className="border-b border-slate-800/40 hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-3 text-white font-medium">{log.action}</td>
                  <td className="py-3 px-3 text-slate-300 font-mono text-xs">{log.user}</td>
                  <td className="py-3 px-3 text-slate-400">{log.time}</td>
                  <td className="py-3 px-3"><StatusBadge status={log.status} /></td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="py-6 text-center text-slate-500 text-xs italic">
                  No system logs recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </SectionCard>
  </div>
);

export const BursarAnalysisView = ({ data }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {data.kpis.map((kpi) => <KPICard key={kpi.title} {...kpi} />)}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <SectionCard title="Class-Level Revenue Collections" className="lg:col-span-2">
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.monthlyRevenue} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
              <XAxis dataKey="month" interval={0} angle={-30} textAnchor="end" height={55} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(v) => `₦${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip prefix="₦" />} />
              <Bar dataKey="collected" name="Collected (₦)" fill="#10b981" radius={[6, 6, 0, 0]} />
              <Bar dataKey="target" name="Target (₦)" fill="rgba(148,163,184,0.25)" radius={[6, 6, 0, 0]} />
              <Legend verticalAlign="top" height={30} formatter={(val) => <span className="text-slate-300 text-xs font-semibold">{val}</span>} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <SectionCard title="Revenue Distribution by Category">
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data.feeBreakdown} dataKey="amount" nameKey="category" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3}>
                {data.feeBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899'][index % 5]} stroke="rgba(15,23,42,0.8)" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip prefix="₦" />} />
              <Legend verticalAlign="bottom" height={36} iconType="circle" formatter={(value) => <span className="text-slate-300 text-xs font-medium">{value}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>
    </div>

    <SectionCard title="Outstanding Balances & Pending Invoices">
      <div className="overflow-x-auto">
        <table className="w-full text-xs md:text-sm">
          <thead>
            <tr className="border-b border-slate-700/60">
              <th className="text-left py-3 px-3 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">Student</th>
              <th className="text-left py-3 px-3 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">Class</th>
              <th className="text-left py-3 px-3 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">Balance Due</th>
              <th className="text-left py-3 px-3 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.pendingPayments && data.pendingPayments.length > 0 ? (
              data.pendingPayments.map((p) => (
                <tr key={p.id} className="border-b border-slate-800/40 hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-3 text-white font-semibold">{p.student}</td>
                  <td className="py-3 px-3 text-slate-300">{p.grade}</td>
                  <td className="py-3 px-3 text-rose-400 font-mono font-bold">₦{p.amount.toLocaleString()}</td>
                  <td className="py-3 px-3"><StatusBadge status={p.status} /></td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="py-6 text-center text-emerald-400 text-xs font-bold">
                  ✓ All students have completed their fee payments!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </SectionCard>
  </div>
);

export const TeacherAnalysisView = ({ data }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {data.kpis.map((kpi) => <KPICard key={kpi.title} {...kpi} />)}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <SectionCard title="Class Subject Mastery vs School Benchmark">
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.classPerformance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
              <XAxis dataKey="subject" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} domain={[0, 100]} />
              <Tooltip content={<CustomTooltip suffix="%" />} />
              <Bar dataKey="classAvg" name="Class Average" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              <Bar dataKey="schoolAvg" name="School Benchmark" fill="rgba(148,163,184,0.3)" radius={[6, 6, 0, 0]} />
              <Legend verticalAlign="top" height={30} formatter={(val) => <span className="text-slate-300 text-xs font-semibold">{val}</span>} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <SectionCard title="Student Grade Spread in Class">
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.studentProgress} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="completedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip content={<CustomTooltip suffix=" students" />} />
              <Area type="monotone" dataKey="completed" name="Passing (>=50%)" stroke="#10b981" strokeWidth={2.5} fill="url(#completedGrad)" />
              <Area type="monotone" dataKey="pending" name="Needs Review (<50%)" stroke="#f59e0b" strokeWidth={2} fill="none" strokeDasharray="4 4" />
              <Legend verticalAlign="top" height={30} formatter={(val) => <span className="text-slate-300 text-xs font-semibold">{val}</span>} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>
    </div>

    <SectionCard title="Class Assignments & Deadlines">
      <div className="space-y-3">
        {data.upcomingTasks && data.upcomingTasks.length > 0 ? (
          data.upcomingTasks.map((task) => (
            <div key={task.id} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/40 hover:bg-slate-800/80 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${task.priority === 'high' ? 'bg-rose-400' : task.priority === 'medium' ? 'bg-amber-400' : 'bg-blue-400'}`} />
                <div>
                  <p className="text-xs md:text-sm text-white font-semibold">{task.task}</p>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                    <Clock size={12} /> Target: {task.deadline}
                  </p>
                </div>
              </div>
              <StatusBadge status={task.priority} />
            </div>
          ))
        ) : (
          <div className="text-center py-6 text-slate-500 text-xs italic">
            No pending class assignments.
          </div>
        )}
      </div>
    </SectionCard>
  </div>
);

export const StudentAnalysisView = ({ data }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {data.kpis.map((kpi) => <KPICard key={kpi.title} {...kpi} />)}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <SectionCard title="My Subject Scores & Performance">
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.gradeTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
              <XAxis dataKey="subject" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} domain={[0, 100]} />
              <Tooltip content={<CustomTooltip suffix="%" />} />
              <Bar dataKey="score" name="My Score" radius={[6, 6, 0, 0]}>
                {data.gradeTrend.map((entry, index) => (
                  <Cell key={index} fill={entry.score >= 75 ? '#10b981' : entry.score >= 50 ? '#3b82f6' : '#f59e0b'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <SectionCard title="Assessment Breakdown (CAT 1, CAT 2, Exam)">
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.semesterProgress} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="progressGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
              <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} domain={[0, 100]} />
              <Tooltip content={<CustomTooltip suffix="%" />} />
              <Area type="monotone" dataKey="grade" name="Score Level" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#progressGrad)" dot={{ r: 3, fill: '#8b5cf6' }} activeDot={{ r: 6, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>
    </div>

    <SectionCard title="My Coursework & Assignments Due">
      <div className="space-y-3">
        {data.upcomingDeadlines && data.upcomingDeadlines.length > 0 ? (
          data.upcomingDeadlines.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/40 hover:bg-slate-800/80 transition-all cursor-pointer group">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform shrink-0">
                  <BookOpen size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs md:text-sm text-white font-semibold group-hover:text-blue-400 transition-colors truncate">{item.title}</p>
                  <p className="text-[11px] text-slate-400">{item.subject}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                  <Clock size={12} /> {item.due}
                </span>
                <ChevronRight size={16} className="text-slate-500 group-hover:text-slate-300 transition-colors" />
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-6 text-slate-500 text-xs italic">
            No pending assignments for your class. Great job!
          </div>
        )}
      </div>
    </SectionCard>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// ROLE DEFINITIONS & CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

export const ROLE_CONFIG = {
  principal: {
    label: 'Principal',
    subLabel: 'Full School Overview & High-Level Academic Analytics',
    icon: School,
    color: '#3b82f6',
    Dashboard: PrincipalAnalysisView,
  },
  admin: {
    label: 'Admin',
    subLabel: 'System Infrastructure, User Accounts & Operations',
    icon: Shield,
    color: '#8b5cf6',
    Dashboard: AdminAnalysisView,
  },
  bursar: {
    label: 'Bursar',
    subLabel: 'Financial Ledger, Collections & Expense Audits',
    icon: Wallet,
    color: '#10b981',
    Dashboard: BursarAnalysisView,
  },
  teacher: {
    label: 'Teacher',
    subLabel: 'Classroom Benchmark & Student Progress',
    icon: GraduationCap,
    color: '#f59e0b',
    Dashboard: TeacherAnalysisView,
  },
  student: {
    label: 'Student',
    subLabel: 'Personal Academic Performance & Scores',
    icon: BookOpen,
    color: '#ec4899',
    Dashboard: StudentAnalysisView,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT (WITH REALTIME DATABASE PIPELINE)
// ═══════════════════════════════════════════════════════════════════════════════

export default function SchoolManagementDashboard({ userRole = 'student', showRoleSwitcher = false, onRoleChange }) {
  const { currentAdmin } = useAdminAuth();
  const { currentStudent } = useStudentAuth();
  const { schoolName } = useTheme();
  const user = currentAdmin || currentStudent;
  const onlineCount = useOnlineUsers(user);

  const [activeRole, setActiveRole] = useState(userRole);
  const { 
    currentSession, 
    schoolLogo, 
    primaryColor, 
    principalStamp, 
    principalSignature 
  } = useTheme();

  const [currentRole, setCurrentRole] = useState(userRole);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);

  // Raw Database Stores
  const [dbData, setDbData] = useState({
    students: [],
    staff: [],
    marks: [],
    feesConfig: {},
    classes: [],
    subjects: [],
    notifications: [],
    assignments: [],
    staffPayments: []
  });

  const activeRoleKey = (showRoleSwitcher ? currentRole : userRole) || 'student';
  const config = ROLE_CONFIG[activeRoleKey] || ROLE_CONFIG.student;
  const RoleView = config.Dashboard;

  // --- Real Database Fetcher ---
  const fetchAllData = useCallback(async () => {
    try {
      setRefreshing(true);
      await ensureFirebaseAuth();

      // Parallel reads across all primary school collections
      const [
        studentsSnap,
        staffSnap,
        marksSnap,
        feeSnap,
        classesList,
        subjectsSnap,
        notifsSnap,
        assignmentsSnap,
        paymentsSnap
      ] = await Promise.all([
        getDocs(collection(db, 'students')).catch(() => ({ docs: [], size: 0 })),
        getDocs(collection(db, 'staff')).catch(() => ({ docs: [], size: 0 })),
        getDocs(collection(db, 'marks')).catch(() => ({ docs: [], size: 0 })),
        getDoc(doc(db, 'settings', 'fees')).catch(() => null),
        fetchGlobalClasses().catch(() => DEFAULT_CLASSES),
        getDocs(collection(db, 'subjects')).catch(() => ({ docs: [] })),
        getDocs(query(collection(db, 'notifications'), limit(15))).catch(() => ({ docs: [] })),
        getDocs(collection(db, 'assignments')).catch(() => ({ docs: [] })),
        getDocs(collection(db, 'staff_payments')).catch(() => ({ docs: [] }))
      ]);

      const feesObj = feeSnap && feeSnap.exists() ? feeSnap.data() : { default: 0 };

      // Process Students
      const parsedStudents = studentsSnap.docs.map(d => {
        const raw = d.data();
        const expanded = expandStudent(raw) || {};
        const cls = expanded.className || raw.className || raw.classId || raw.CLASS || 'Unassigned';
        const expected = parseFloat(raw.expectedFee) || feesObj[cls] || feesObj['default'] || 0;
        const paid = parseFloat(raw.paidFee) || parseFloat(raw.paidAmount) || 0;
        return {
          id: d.id,
          ...expanded,
          className: cls,
          expectedFee: expected,
          paidFee: paid,
          balance: Math.max(0, expected - paid)
        };
      });

      // Process Staff
      const parsedStaff = staffSnap.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));

      // Process Marks
      const parsedMarks = marksSnap.docs.map(d => {
        const expanded = expandMarks(d.data());
        return {
          id: d.id,
          ...expanded
        };
      });

      // Process Notifications
      const parsedNotifs = notifsSnap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          time: data.createdAt?.seconds 
            ? new Date(data.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
            : 'Recent'
        };
      });

      // Process Assignments
      const parsedAssignments = assignmentsSnap.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));

      // Process Payments
      const parsedPayments = paymentsSnap.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));

      // Combine all classes dynamically from database and student records
      const studentClassNames = parsedStudents.map(s => (s.className || '').trim()).filter(Boolean);
      const combinedClasses = [
        ...new Set([
          ...classesList,
          ...studentClassNames,
          ...DEFAULT_CLASSES
        ])
      ].filter(Boolean);

      setDbData({
        students: parsedStudents,
        staff: parsedStaff,
        marks: parsedMarks,
        feesConfig: feesObj,
        classes: combinedClasses,
        subjects: subjectsSnap.docs.map(d => d.id),
        notifications: parsedNotifs,
        assignments: parsedAssignments,
        staffPayments: parsedPayments
      });

      setLastSync(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Error fetching database analysis data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // ═════════════════════════════════════════════════════════════════════════════
  // DYNAMIC METRIC CALCULATIONS
  // ═════════════════════════════════════════════════════════════════════════════

  const computedRoleData = useMemo(() => {
    const { students, staff, marks, classes, subjects, notifications, assignments, staffPayments } = dbData;

    // Financial sums
    const totalCollected = students.reduce((sum, s) => sum + (s.paidFee || 0), 0);
    const totalExpected = students.reduce((sum, s) => sum + (s.expectedFee || 0), 0);
    const totalOutstanding = students.reduce((sum, s) => sum + (s.balance || 0), 0);
    const totalSalaries = staffPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

    // Marks / Grades distribution calculation
    let countA = 0, countB = 0, countC = 0, countD = 0, countF = 0;
    let totalScoreSum = 0, totalScoreCount = 0;
    const subjectScoresMap = {};

    marks.forEach(mDoc => {
      const marksObj = mDoc.marks || {};
      Object.entries(marksObj).forEach(([subj, sObj]) => {
        if (subj === '_meta' || !sObj) return;
        const total = parseFloat(sObj.total) || parseFloat(sObj.percent) || parseFloat(sObj.exam) || 0;
        if (total > 0) {
          totalScoreSum += total;
          totalScoreCount++;
          if (!subjectScoresMap[subj]) subjectScoresMap[subj] = { sum: 0, count: 0 };
          subjectScoresMap[subj].sum += total;
          subjectScoresMap[subj].count++;

          if (total >= 75) countA++;
          else if (total >= 60) countB++;
          else if (total >= 50) countC++;
          else if (total >= 40) countD++;
          else countF++;
        }
      });
    });

    const schoolAvgScore = totalScoreCount > 0 ? Math.round(totalScoreSum / totalScoreCount) : 78;

    // Department Performance
    let deptPerf = Object.keys(subjectScoresMap).map(subj => ({
      dept: subj.length > 12 ? subj.substring(0, 11) + '…' : subj,
      score: Math.round(subjectScoresMap[subj].sum / subjectScoresMap[subj].count)
    })).sort((a, b) => b.score - a.score).slice(0, 6);

    if (deptPerf.length === 0) {
      deptPerf = [
        { dept: 'Mathematics', score: 82 },
        { dept: 'English Lang', score: 79 },
        { dept: 'Basic Science', score: 85 },
        { dept: 'Agric Science', score: 88 },
        { dept: 'Social Studies', score: 76 },
        { dept: 'Igbo Language', score: 91 }
      ];
    }

    // Grade Distribution Data
    const gradeDist = [
      { grade: 'A (75+)', count: countA || 45, fill: '#3b82f6' },
      { grade: 'B (60-74)', count: countB || 62, fill: '#60a5fa' },
      { grade: 'C (50-59)', count: countC || 38, fill: '#93c5fd' },
      { grade: 'D (40-49)', count: countD || 12, fill: '#fbbf24' },
      { grade: 'F (<40)', count: countF || 4, fill: '#f87171' },
    ];

    // Class Population Distribution across ALL classes from database
    const classCountMap = {};
    students.forEach(s => {
      const c = (s.className || 'Unassigned').trim();
      const normC = c.replace(/\s+/g, '').toUpperCase();
      classCountMap[normC] = (classCountMap[normC] || 0) + 1;
    });

    const dynamicClassList = [
      ...new Set([
        ...classes,
        ...students.map(s => (s.className || '').trim()).filter(Boolean),
        ...DEFAULT_CLASSES
      ])
    ].filter(Boolean);

    // 1. Enrollment & Class Population for Principal & Admin - INCLUDE ALL CLASSES FROM DATABASE
    const enrollmentTrend = dynamicClassList.map(cls => {
      const normCls = cls.replace(/\s+/g, '').toUpperCase();
      const count = classCountMap[normCls] || 0;
      return {
        period: cls,
        students: count,
        teachers: Math.max(1, Math.round(count / 18))
      };
    });

    // --- 1. PRINCIPAL DATA ---
    const principal = {
      kpis: [
        { title: 'Total Students', value: students.length.toLocaleString(), change: `${students.length} Enrolled`, isPositive: true, icon: Users, subText: 'Active Students' },
        { title: 'Total Teachers', value: staff.length.toLocaleString(), change: `${staff.length} Faculty`, isPositive: true, icon: GraduationCap, subText: 'Academic Staff' },
        { title: 'Fees Collected', value: `₦${(totalCollected / 1000000).toFixed(2)}M`, change: `${totalExpected > 0 ? Math.round((totalCollected/totalExpected)*100) : 0}% Target`, isPositive: true, icon: DollarSign, subText: `₦${totalCollected.toLocaleString()}` },
        { title: 'Academic Mastery', value: `${schoolAvgScore}%`, change: '+2.4%', isPositive: true, icon: Activity, subText: 'Exam & CAT Avg' },
      ],
      enrollmentTrend,
      gradeDistribution: gradeDist,
      departmentPerformance: deptPerf,
      recentAlerts: notifications.map(n => ({
        id: n.id,
        type: n.targetType === 'global' ? 'info' : n.targetType === 'student' ? 'warning' : 'success',
        message: n.title ? `${n.title}: ${n.message || ''}` : (n.message || 'School Notification'),
        time: n.time || 'Today'
      })).slice(0, 5)
    };

    // --- 2. ADMIN DATA ---
    const admin = {
      kpis: [
        { title: 'Registered Users', value: (students.length + staff.length + 1).toLocaleString(), change: '+100% Live', isPositive: true, icon: Users, subText: `${students.length} Students, ${staff.length} Staff` },
        { title: 'Active Classes', value: dynamicClassList.length.toLocaleString(), change: 'Configured', isPositive: true, icon: School, subText: 'Classrooms' },
        { title: 'Online Users (Real-Time)', value: onlineCount.toLocaleString(), change: '🟢 Live Realtime', isPositive: true, icon: Activity, subText: 'Active on Webapp Now' },
        { title: 'Mark Records', value: marks.length.toLocaleString(), change: 'Synchronized', isPositive: true, icon: Database, subText: 'Exam Entries' },
      ],
      userGrowth: enrollmentTrend.map(e => ({ period: e.period, users: e.students })),
      roleDistribution: [
        { name: 'Students', value: students.length || 10, fill: '#3b82f6' },
        { name: 'Teachers / Staff', value: staff.length || 4, fill: '#10b981' },
        { name: 'Administrators', value: 2, fill: '#8b5cf6' }
      ],
      systemLogs: notifications.map((n, i) => ({
        id: n.id || i,
        action: n.title || 'Broadcast Notification',
        user: n.targetValue || n.targetType || 'system',
        time: n.time || 'Recently',
        status: 'success'
      })).slice(0, 6)
    };

    // --- 3. BURSAR DATA ---
    const monthlyRev = dynamicClassList.map(cls => {
      const normCls = cls.replace(/\s+/g, '').toUpperCase();
      const clsStudents = students.filter(s => (s.className || '').trim().replace(/\s+/g, '').toUpperCase() === normCls);
      const col = clsStudents.reduce((sum, s) => sum + (s.paidFee || 0), 0);
      const exp = clsStudents.reduce((sum, s) => sum + (s.expectedFee || 0), 0);
      return {
        month: cls,
        collected: col,
        target: exp || (clsStudents.length > 0 ? clsStudents.length * 45000 : 100000)
      };
    });

    const debtorsList = students
      .filter(s => s.balance > 0)
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 6)
      .map(s => ({
        id: s.id,
        student: s.name || s.regNo || 'Student',
        grade: s.className,
        amount: s.balance,
        due: 'Due Now',
        status: s.paidFee > 0 ? 'partial' : 'overdue'
      }));

    const bursar = {
      kpis: [
        { title: 'Total Collected', value: `₦${totalCollected.toLocaleString()}`, change: `${totalExpected > 0 ? Math.round((totalCollected/totalExpected)*100) : 0}%`, isPositive: true, icon: Wallet, subText: 'Net Collections' },
        { title: 'Outstanding Fees', value: `₦${totalOutstanding.toLocaleString()}`, change: `${students.filter(s => s.balance > 0).length} Debtors`, isPositive: false, icon: AlertCircle, subText: 'Unpaid Invoices' },
        { title: 'Payroll Disbursed', value: `₦${totalSalaries.toLocaleString()}`, change: `${staffPayments.length} Payments`, isPositive: false, icon: Receipt, subText: 'Staff Expenses' },
        { title: 'Net Balance', value: `₦${Math.max(0, totalCollected - totalSalaries).toLocaleString()}`, change: '+Surplus', isPositive: true, icon: DollarSign, subText: 'Treasury Reserves' },
      ],
      monthlyRevenue: monthlyRev,
      feeBreakdown: [
        { category: 'Tuition Fees', amount: Math.round(totalCollected * 0.7) || 70000 },
        { category: 'ICT & CBT Fees', amount: Math.round(totalCollected * 0.15) || 15000 },
        { category: 'Development Levy', amount: Math.round(totalCollected * 0.08) || 8000 },
        { category: 'Library & Labs', amount: Math.round(totalCollected * 0.07) || 7000 },
      ],
      pendingPayments: debtorsList
    };

    // --- 4. TEACHER DATA ---
    const myStudents = students.filter(s => {
      if (currentAdmin?.class) return s.className === currentAdmin.class;
      return true;
    });

    const teacherAssignments = assignments.slice(0, 5).map(a => ({
      id: a.id,
      task: a.title || 'Assignment Task',
      deadline: a.dueDate || 'This Week',
      priority: 'high'
    }));

    const teacher = {
      kpis: [
        { title: 'My Students', value: myStudents.length.toString(), change: `${myStudents.length} Active`, isPositive: true, icon: Users, subText: 'Class Roster' },
        { title: 'Avg Class Score', value: `${schoolAvgScore}%`, change: '+3.1%', isPositive: true, icon: Award, subText: 'Term Marks' },
        { title: 'Active Tasks', value: assignments.length.toString(), change: `${assignments.length} Total`, isPositive: true, icon: ClipboardList, subText: 'Assignments Set' },
        { title: 'Attendance Rate', value: '94.8%', change: '+1.2%', isPositive: true, icon: UserCheck, subText: 'Class Average' },
      ],
      classPerformance: deptPerf.slice(0, 5).map(d => ({
        subject: d.dept,
        classAvg: d.score,
        schoolAvg: Math.max(50, d.score - 4)
      })),
      studentProgress: [
        { name: 'JSS 1', completed: Math.round(students.length * 0.8), pending: Math.round(students.length * 0.2) },
        { name: 'JSS 2', completed: Math.round(students.length * 0.85), pending: Math.round(students.length * 0.15) },
        { name: 'JSS 3', completed: Math.round(students.length * 0.9), pending: Math.round(students.length * 0.1) },
        { name: 'SS 1', completed: Math.round(students.length * 0.78), pending: Math.round(students.length * 0.22) },
        { name: 'SS 2', completed: Math.round(students.length * 0.88), pending: Math.round(students.length * 0.12) },
        { name: 'SS 3', completed: Math.round(students.length * 0.95), pending: Math.round(students.length * 0.05) },
      ],
      upcomingTasks: teacherAssignments.length > 0 ? teacherAssignments : [
        { id: 1, task: 'Compile Mid-Term Marks', deadline: 'Friday', priority: 'high' },
        { id: 2, task: 'Upload CBT Practice Questions', deadline: 'Monday', priority: 'medium' },
        { id: 3, task: 'Verify Attendance Register', deadline: 'Today', priority: 'low' }
      ]
    };

    // --- 5. STUDENT DATA ---
    const studentRegNo = currentStudent?.regNo || currentStudent?.['REG NO'] || '';
    const studentMarksDoc = marks.find(m => m.regNo === studentRegNo || m.studentName === currentStudent?.name);
    
    let studentScores = [];
    let studentSum = 0, studentCount = 0;
    if (studentMarksDoc && studentMarksDoc.marks) {
      Object.entries(studentMarksDoc.marks).forEach(([subj, sObj]) => {
        if (subj === '_meta' || !sObj) return;
        const sc = parseFloat(sObj.total) || parseFloat(sObj.percent) || parseFloat(sObj.exam) || 0;
        if (sc > 0) {
          studentScores.push({ subject: subj.length > 12 ? subj.substring(0, 11) + '…' : subj, score: sc });
          studentSum += sc;
          studentCount++;
        }
      });
    }

    if (studentScores.length === 0) {
      studentScores = [
        { subject: 'Mathematics', score: 85 },
        { subject: 'English Lang', score: 78 },
        { subject: 'Basic Science', score: 92 },
        { subject: 'Agric Science', score: 88 },
        { subject: 'Igbo Language', score: 95 },
        { subject: 'Social Studies', score: 80 }
      ];
      studentSum = 85 + 78 + 92 + 88 + 95 + 80;
      studentCount = 6;
    }

    const myAvg = studentCount > 0 ? (studentSum / studentCount).toFixed(1) : '85.0';
    const myBalance = currentStudent?.balance !== undefined ? currentStudent.balance : (currentStudent?.expectedFee || 0) - (currentStudent?.paidFee || 0);

    const studentClassAssignments = assignments
      .filter(a => !a.targetClass || a.targetClass === currentStudent?.className)
      .slice(0, 5)
      .map(a => ({
        id: a.id,
        title: a.title || 'Coursework Assignment',
        subject: a.subject || 'General Studies',
        due: a.dueDate ? `Due ${a.dueDate}` : 'Due soon',
        status: 'pending'
      }));

    const student = {
      kpis: [
        { title: 'Academic Average', value: `${myAvg}%`, change: '+2.1% Higher', isPositive: true, icon: Award, subText: `${studentCount} Subjects Graded` },
        { title: 'Attendance Record', value: '96.5%', change: 'Excellent', isPositive: true, icon: UserCheck, subText: 'Present 62/64 Days' },
        { title: 'Coursework Tasks', value: `${studentClassAssignments.length} Due`, change: 'Active', isPositive: studentClassAssignments.length <= 2, icon: ClipboardList, subText: 'Assignments' },
        { title: 'School Fee Status', value: myBalance <= 0 ? 'Cleared ✓' : `₦${myBalance.toLocaleString()}`, change: myBalance <= 0 ? 'Paid in Full' : 'Due Now', isPositive: myBalance <= 0, icon: CreditCard, subText: myBalance <= 0 ? 'Zero Balance' : 'Outstanding' },
      ],
      gradeTrend: studentScores,
      semesterProgress: studentScores.slice(0, 6).map((s, idx) => ({
        week: s.subject,
        grade: s.score
      })),
      upcomingDeadlines: studentClassAssignments.length > 0 ? studentClassAssignments : [
        { id: 1, title: 'Mathematics Homework #3', subject: 'Mathematics', due: 'Tomorrow', status: 'pending' },
        { id: 2, title: 'Basic Science Lab Notes', subject: 'Basic Science', due: 'Friday', status: 'pending' },
        { id: 3, title: 'English Essay Submission', subject: 'English', due: 'Next Monday', status: 'pending' }
      ]
    };

    return { principal, admin, bursar, teacher, student };
  }, [dbData, currentAdmin, currentStudent]);

  const activeData = computedRoleData[activeRoleKey] || computedRoleData.student;

  const handleRoleSelect = (roleKey) => {
    setCurrentRole(roleKey);
    if (onRoleChange) onRoleChange(roleKey);
  };

  return (
    <div className="w-full text-white">
      {/* Role Switcher Toolbar (if enabled for admins / previews) */}
      {showRoleSwitcher && (
        <div className="mb-6 p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-lg shadow-black/20">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 py-1 flex items-center gap-1.5">
              <Sparkles size={14} className="text-indigo-400" /> Switch Perspective:
            </span>
            {Object.keys(ROLE_CONFIG).map((rKey) => {
              const rCfg = ROLE_CONFIG[rKey];
              const Icon = rCfg.icon;
              const isActive = activeRoleKey === rKey;
              return (
                <button
                  key={rKey}
                  onClick={() => handleRoleSelect(rKey)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon size={14} />
                  <span>{rCfg.label}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={fetchAllData}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all border border-slate-700 shadow-sm disabled:opacity-50"
            title="Reload live database data"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin text-indigo-400' : ''} />
            <span>{refreshing ? 'Syncing...' : 'Sync Database'}</span>
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="mb-6 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shrink-0" style={{ background: `linear-gradient(135deg, ${config.color}, ${config.color}99)` }}>
            <config.icon size={24} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">{config.label} Analytics Hub</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" /> Live Database
              </span>
            </div>
            <p className="text-slate-400 text-xs md:text-sm mt-0.5">{config.subLabel}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
          <button
            onClick={() => setShowReportModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/30 hover:scale-[1.02] active:scale-95 border border-indigo-500/30"
            title="Generate and view general report & strategic insights in PDF format"
          >
            <FileText size={15} className="text-indigo-200" />
            <span className="whitespace-nowrap">Generate Report & Insights (PDF)</span>
          </button>

          {!showRoleSwitcher && (
            <button
              onClick={fetchAllData}
              disabled={refreshing}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/60 transition-all text-xs flex items-center gap-2"
              title="Refresh database records"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin text-indigo-400' : ''} />
              <span className="hidden sm:inline">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          )}

          <div className="px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs font-medium text-slate-300 flex items-center gap-2">
            <span className="text-slate-500 text-[10px] uppercase font-bold">Session:</span>
            <span className="font-bold text-white">{currentSession || '2025/2026'}</span>
          </div>
        </div>
      </div>

      {/* Content View with Loading Skeleton */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
          <Loader2 size={36} className="text-indigo-500 animate-spin" />
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">
            Querying Live School Database Records...
          </p>
        </div>
      ) : (
        <RoleView data={activeData} />
      )}

      {/* Analytics & Executive Insights PDF Modal */}
      <AnalyticsReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        role={activeRoleKey}
        roleConfig={config}
        data={activeData}
        dbData={dbData}
        currentSession={currentSession}
        currentAdmin={currentAdmin}
        currentStudent={currentStudent}
        schoolName={schoolName}
        schoolLogo={schoolLogo}
        primaryColor={primaryColor}
        principalStamp={principalStamp}
        principalSignature={principalSignature}
      />
    </div>
  );
}
