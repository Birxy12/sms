import React, { useState } from 'react';
import StatCard from '../../components/StatCard';
import Marksheet from '../../components/Marksheet';
import ScoreEntry from '../../components/ScoreEntry';
import AssignmentManager from '../../components/AssignmentManager';
import NoteManager from '../../components/NoteManager';
import { Book, CheckCircle, Clock, Edit3, List, Calendar as CalendarIcon, FileText, ClipboardList } from 'lucide-react';

const StaffDashboard = () => {
  const [activeTab, setActiveTab] = useState('entry'); // schedule, marksheet, entry, assignments, materials

  const teacherStats = [
    { title: 'My Classes', value: '4', icon: Book, color: '#ff6b00' },
    { title: 'Attendance Marked', value: '100%', icon: CheckCircle, color: '#111111' },
    { title: 'Pending Tasks', value: '3', icon: Clock, color: '#ff6b00' },
  ];

  const tabs = [
    { id: 'entry', label: 'Score Entry', icon: Edit3 },
    { id: 'assignments', label: 'Assignments', icon: ClipboardList },
    { id: 'materials', label: 'Materials', icon: FileText },
    { id: 'schedule', label: 'Schedule', icon: CalendarIcon },
    { id: 'marksheet', label: 'Marksheet', icon: List },
  ];

  return (
    <div className="teachers-page p-4 md:p-8 animate-in fade-in duration-500">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Staff Dashboard</h1>
          <p className="text-slate-500 font-medium mt-1">Manage your academic workflows and student performance.</p>
        </div>
        <div className="modern-tabs-container hide-scrollbar overflow-x-auto max-w-full">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`modern-tab-item ${activeTab === tab.id ? 'active' : ''}`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

      </div>

      <div className="stats-grid mb-10">
        {teacherStats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      <div className="tab-content min-h-[600px] tab-content-animate" key={activeTab}>
        {activeTab === 'schedule' && (
          <div className="card-white">
            <h3 className="text-xl font-black text-slate-800 mb-6">Today's Academic Schedule</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">Time Block</th>
                    <th className="px-6 py-4">Class/Grade</th>
                    <th className="px-6 py-4">Subject</th>
                    <th className="px-6 py-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-700">08:00 AM - 09:30 AM</td>
                    <td className="px-6 py-4 font-black text-slate-900">JSS 2</td>
                    <td className="px-6 py-4 text-slate-600 font-medium">Mathematics</td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-[10px] font-black bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full uppercase">Completed</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-700">10:30 AM - 12:00 PM</td>
                    <td className="px-6 py-4 font-black text-slate-900">SS 1</td>
                    <td className="px-6 py-4 text-slate-600 font-medium">Further Maths</td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-[10px] font-black bg-amber-50 text-amber-600 px-3 py-1 rounded-full uppercase">Upcoming</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'marksheet' && (
          <div className="card-white">
            <h3 className="text-xl font-black text-slate-800 mb-6">Master Marksheet Summary</h3>
            <Marksheet />
          </div>
        )}

        {activeTab === 'entry' && (
          <div>
            <ScoreEntry />
          </div>
        )}

        {activeTab === 'assignments' && (
          <div>
            <AssignmentManager />
          </div>
        )}

        {activeTab === 'materials' && (
          <div>
            <NoteManager />
          </div>
        )}
      </div>

    </div>
  );
};

export default StaffDashboard;

