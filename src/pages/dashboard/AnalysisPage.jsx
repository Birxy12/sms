import React, { useMemo } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useStudentAuth } from '../../context/StudentAuthContext';
import SchoolManagementDashboard from '../../components/SchoolManagementDashboard';

export default function AnalysisPage({ forcedRole }) {
  const { currentAdmin } = useAdminAuth();
  const { currentStudent } = useStudentAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Determine user role
  const resolvedRole = useMemo(() => {
    if (forcedRole) return forcedRole;
    
    // Check URL search params (e.g. ?role=teacher)
    const queryRole = searchParams.get('role');
    if (queryRole && ['principal', 'admin', 'bursar', 'teacher', 'student'].includes(queryRole.toLowerCase())) {
      return queryRole.toLowerCase();
    }

    if (location.pathname.startsWith('/students')) {
      return 'student';
    }

    if (currentAdmin) {
      if (currentAdmin.role === 'admin' || currentAdmin.isSuperAdmin) return 'admin';
      if (currentAdmin.role === 'principal') return 'principal';
      if (currentAdmin.role === 'bursar') return 'bursar';
      if (currentAdmin.role === 'teacher') return 'teacher';
    }

    if (currentStudent) {
      return 'student';
    }

    return 'principal';
  }, [forcedRole, searchParams, location.pathname, currentAdmin, currentStudent]);

  const canSwitchRoles = currentAdmin?.role === 'admin' || currentAdmin?.role === 'principal' || currentAdmin?.isSuperAdmin;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto animate-in fade-in duration-300">
      <SchoolManagementDashboard 
        userRole={resolvedRole} 
        showRoleSwitcher={canSwitchRoles} 
      />
    </div>
  );
}
