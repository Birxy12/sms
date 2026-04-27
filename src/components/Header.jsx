import React from 'react';
import { Menu, Bell, User, LogOut, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useStudentAuth } from '../context/StudentAuthContext';

const Header = ({ sidebarOpen, setSidebarOpen, displayName, displayRole }) => {
  const navigate = useNavigate();
  const { logout: adminLogout } = useAdminAuth();
  const { logout: studentLogout } = useStudentAuth();

  const handleLogout = async () => {
    try {
      if (displayRole === 'Student') {
        await studentLogout();
      } else {
        await adminLogout();
      }
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <header className="h-20 bg-white border-b border-slate-200 sticky top-0 z-40 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 hover:bg-slate-100 rounded-lg md:hidden"
        >
          <Menu size={24} className="text-slate-600" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Welcome, {displayName}</h2>
          <p className="text-xs font-semibold text-orange-600 uppercase tracking-widest">{displayRole}</p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <button className="relative p-2 text-slate-500 hover:text-orange-600 hover:bg-orange-50 transition-all rounded-full">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-500 border-2 border-white rounded-full"></span>
        </button>

        <div className="h-8 w-px bg-slate-200"></div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-slate-900">{displayName}</p>
            <button 
              onClick={handleLogout}
              className="text-[10px] font-black text-slate-400 hover:text-red-500 uppercase tracking-tighter transition-colors"
            >
              Sign Out
            </button>
          </div>
          <div className="h-10 w-10 bg-gradient-to-tr from-orange-500 to-orange-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-orange-200">
            {displayName[0]}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
