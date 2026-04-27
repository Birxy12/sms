import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useStudentAuth } from '../context/StudentAuthContext';
import { useState } from 'react';
import { Menu } from 'lucide-react';

const Layout = ({ children }) => {
  const { currentAdmin } = useAdminAuth();
  const { currentStudent } = useStudentAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isStudentZone = location.pathname.startsWith('/students');
  const user = isStudentZone ? currentStudent : (currentAdmin || currentStudent);
  const displayName = user?.name || user?.['STUDENT NAME'] || user?.email || 'User';

  return (
    <div className="layout" style={{ position: 'relative' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99, display: 'block' }}
        />
      )}

      {/* Sidebar — hidden on print */}
      <div className="no-print">
        <Sidebar sidebarOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>

      <main className="main-content">
        {/* Mobile-only top strip — hidden on print */}
        <div className="no-print mobile-top-strip">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hamburger-btn"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <span className="mobile-top-strip-name">{displayName}</span>
        </div>

        <div className="page-content">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
