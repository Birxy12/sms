import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { App as CapApp } from '@capacitor/app';
import Layout from './components/Layout';
import LandingPage from './pages/home';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/dashboard/AdminDashboard';
import StaffDashboard from './pages/dashboard/StaffDashboard';
import StudentDashboard from './pages/dashboard/StudentDashboard';
import StudentInbox from './pages/student/StudentInbox';
import StudentAssignments from './pages/student/StudentAssignments';
import StudentNotes from './pages/student/StudentNotes';
import StudentResults from './pages/student/StudentResults';
import StudentFees from './pages/student/StudentFees';
import StudentProfile from './pages/student/StudentProfile';
import StudentIDCard from './pages/student/StudentIDCard';
import StudentCBT from './pages/student/StudentCBT';
import StudentSubjectRegistration from './pages/student/StudentSubjectRegistration';

import StaffManagement from './pages/dashboard/StaffManagement';
import CourseManagement from './pages/dashboard/CourseManagement';
import CBTManagement from './pages/dashboard/CBTManagement';
import StudentManagement from './pages/dashboard/StudentManagement';
import ClassManagement from './pages/dashboard/ClassManagement';
import ProfileSettings from './pages/dashboard/ProfileSettings';
import BrandingSettings from './pages/BrandingSettings';
import AboutPage from './pages/public/AboutPage';
import ContactPage from './pages/public/ContactPage';
import BlogPage from './pages/public/BlogPage';
import BlogPost from './pages/public/BlogPost';
import ContentCMS from './pages/dashboard/ContentCMS';
import LeaderboardPage from './pages/public/LeaderboardPage';
import FamePage from './pages/public/FamePage';

import MessageHub from './pages/dashboard/MessageHub';
import PrincipalDashboard from './pages/dashboard/PrincipalDashboard';
import BursarDashboard from './pages/dashboard/BursarDashboard';
import CheckResult from './pages/public/CheckResult';
import AdmissionPortal from './pages/public/AdmissionPortal';
import FameManagement from './pages/dashboard/FameManagement';
import BiometricAttendance from './pages/dashboard/BiometricAttendance';
import AdmissionCBTManagement from './pages/dashboard/AdmissionCBTManagement';
import NotificationCenter from './pages/dashboard/NotificationCenter';
import AnalysisPage from './pages/dashboard/AnalysisPage';
import { useStudentAuth } from './context/StudentAuthContext';
import { useAdminAuth } from './context/AdminAuthContext';
import { useOnlineUsers } from './utils/presence';
import BonusAI from './components/BonusAI';
import UpdateModal from './components/UpdateModal';
import { useAppUpdate } from './hooks/useAppUpdate';
import './App.css';

// Protected Route Component for Students
const ProtectedStudentRoute = ({ children }) => {
  const { currentStudent, loading } = useStudentAuth();
  if (loading) return <div>Loading...</div>;
  if (!currentStudent) return <Navigate to="/" replace />;
  return children;
};

// Protected Route Component for Admin/Teachers
const ProtectedAdminRoute = ({ children, requiredRole }) => {
  const { currentAdmin, loading } = useAdminAuth();
  if (loading) return <div>Loading...</div>;
  if (!currentAdmin) return <Navigate to="/login" replace />;

  // Admin can access everything
  if (currentAdmin.role === 'admin') return children;

  // Check role if specified
  if (requiredRole) {
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!allowedRoles.includes(currentAdmin.role)) {
      // Redirect to their own dashboard instead of home
      if (currentAdmin.role === 'principal') return <Navigate to="/principal" replace />;
      if (currentAdmin.role === 'bursar') return <Navigate to="/finance" replace />;
      if (currentAdmin.role === 'teacher') return <Navigate to="/teachers" replace />;
      return <Navigate to="/" replace />;
    }
  }

  return children;
};

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { updateAvailable, latestVersion } = useAppUpdate();
  const { currentAdmin } = useAdminAuth();
  const { currentStudent } = useStudentAuth();
  const activeUser = currentAdmin || currentStudent;
  useOnlineUsers(activeUser);

  useEffect(() => {
    const setupAppListeners = async () => {
      const backButtonListener = await CapApp.addListener('backButton', ({ canGoBack }) => {
        const currentPath = location.pathname;
        const homePaths = ['/', '/login', '/students', '/admin', '/principal', '/finance', '/teachers'];
        
        if (homePaths.includes(currentPath) || !canGoBack) {
          const confirmClose = window.confirm("Do you want to exit the app?");
          if (confirmClose) {
            CapApp.exitApp();
          }
        } else {
          navigate(-1);
        }
      });

      const urlOpenListener = await CapApp.addListener('appUrlOpen', (data) => {
        if (data?.url) {
          try {
            const urlObj = new URL(data.url);
            const targetPath = urlObj.pathname + urlObj.search + urlObj.hash;
            if (targetPath) {
              navigate(targetPath);
            }
          } catch (e) {
            const pathMatch = data.url.match(/^[a-zA-Z0-9_-]+:\/\/(.*)$/);
            if (pathMatch && pathMatch[1]) {
              const route = '/' + pathMatch[1].replace(/^\//, '');
              navigate(route);
            }
          }
        }
      });

      return { backButtonListener, urlOpenListener };
    };

    let listenersPromise = setupAppListeners();

    return () => {
      listenersPromise.then(listeners => {
        listeners.backButtonListener?.remove();
        listeners.urlOpenListener?.remove();
      });
    };
  }, [location, navigate]);

  return (
    <>
      <Routes>
      {/* Public Landing Page */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/blog" element={<BlogPage />} />
      <Route path="/blog/:id" element={<BlogPost />} />
      <Route path="/leaderboard" element={<LeaderboardPage />} />
      <Route path="/fame" element={<FamePage />} />

      <Route path="/check-result" element={<CheckResult />} />
      <Route path="/admission" element={<AdmissionPortal />} />
      
      {/* Student Dashboard – individual section routes (Protected) */}
      <Route path="/students" element={
        <ProtectedStudentRoute>
          <Layout><StudentDashboard /></Layout>
        </ProtectedStudentRoute>
      } />
      <Route path="/students/inbox" element={
        <ProtectedStudentRoute>
          <Layout><StudentInbox /></Layout>
        </ProtectedStudentRoute>
      } />
      <Route path="/students/assignments" element={
        <ProtectedStudentRoute>
          <Layout><StudentAssignments /></Layout>
        </ProtectedStudentRoute>
      } />
      <Route path="/students/notes" element={
        <ProtectedStudentRoute>
          <Layout><StudentNotes /></Layout>
        </ProtectedStudentRoute>
      } />
      <Route path="/students/results" element={
        <ProtectedStudentRoute>
          <Layout><StudentResults /></Layout>
        </ProtectedStudentRoute>
      } />
      <Route path="/results" element={<StudentResults isPublic={true} />} />
      <Route path="/students/fees" element={
        <ProtectedStudentRoute>
          <Layout><StudentFees /></Layout>
        </ProtectedStudentRoute>
      } />
      <Route path="/students/profile" element={
        <ProtectedStudentRoute>
          <Layout><StudentProfile /></Layout>
        </ProtectedStudentRoute>
      } />
      <Route path="/students/idcard" element={
        <ProtectedStudentRoute>
          <Layout><StudentIDCard /></Layout>
        </ProtectedStudentRoute>
      } />
      <Route path="/students/cbt" element={
        <ProtectedStudentRoute>
          <Layout><StudentCBT /></Layout>
        </ProtectedStudentRoute>
      } />
      <Route path="/students/registration" element={
        <ProtectedStudentRoute>
          <Layout><StudentSubjectRegistration /></Layout>
        </ProtectedStudentRoute>
      } />
      <Route path="/students/analysis" element={
        <ProtectedStudentRoute>
          <Layout><AnalysisPage forcedRole="student" /></Layout>
        </ProtectedStudentRoute>
      } />


      {/* Admin/Teacher Dashboards (Protected) */}
      <Route path="/analysis" element={
        <ProtectedAdminRoute requiredRole={['admin', 'principal', 'teacher', 'bursar']}>
          <Layout><AnalysisPage /></Layout>
        </ProtectedAdminRoute>
      } />
      <Route path="/admin/analysis" element={
        <ProtectedAdminRoute requiredRole="admin">
          <Layout><AnalysisPage forcedRole="admin" /></Layout>
        </ProtectedAdminRoute>
      } />
      <Route path="/principal/analysis" element={
        <ProtectedAdminRoute requiredRole={['principal', 'admin']}>
          <Layout><AnalysisPage forcedRole="principal" /></Layout>
        </ProtectedAdminRoute>
      } />
      <Route path="/teachers/analysis" element={
        <ProtectedAdminRoute requiredRole={['teacher', 'principal', 'admin', 'bursar']}>
          <Layout><AnalysisPage forcedRole="teacher" /></Layout>
        </ProtectedAdminRoute>
      } />
      <Route path="/finance/analysis" element={
        <ProtectedAdminRoute requiredRole={['bursar', 'admin']}>
          <Layout><AnalysisPage forcedRole="bursar" /></Layout>
        </ProtectedAdminRoute>
      } />
      <Route path="/admin" element={
        <ProtectedAdminRoute requiredRole="admin">
          <Layout><AdminDashboard /></Layout>
        </ProtectedAdminRoute>
      } />
      <Route path="/principal" element={
        <ProtectedAdminRoute requiredRole={['principal']}>
          <Layout><PrincipalDashboard /></Layout>
        </ProtectedAdminRoute>
      } />
      <Route path="/teachers" element={
        <ProtectedAdminRoute requiredRole={['teacher', 'principal', 'admin', 'bursar']}>
          <Layout><StaffDashboard /></Layout>
        </ProtectedAdminRoute>
      } />
      <Route path="/settings" element={
        <ProtectedAdminRoute requiredRole="admin">
          <Layout><BrandingSettings /></Layout>
        </ProtectedAdminRoute>
      } />

      {/* Admin Login Page */}
      <Route path="/admin-login" element={<Login />} />
      
      {/* Profile & Settings (All Users) */}
      <Route path="/profile" element={
        <Layout><ProfileSettings /></Layout>
      } />

      {/* Administrative Tools */}
      <Route path="/staff" element={
        <ProtectedAdminRoute requiredRole="admin">
          <Layout><StaffManagement /></Layout>
        </ProtectedAdminRoute>
      } />
      <Route path="/admin/students" element={
        <ProtectedAdminRoute requiredRole="admin">
          <Layout><StudentManagement /></Layout>
        </ProtectedAdminRoute>
      } />
      <Route path="/admin/classes" element={
        <ProtectedAdminRoute requiredRole="admin">
          <Layout><ClassManagement /></Layout>
        </ProtectedAdminRoute>
      } />
      <Route path="/courses" element={
        <ProtectedAdminRoute requiredRole="admin">
          <Layout><CourseManagement /></Layout>
        </ProtectedAdminRoute>
      } />
      <Route path="/cbt" element={
        <ProtectedAdminRoute requiredRole={['teacher', 'principal', 'admin']}>
          <Layout><CBTManagement /></Layout>
        </ProtectedAdminRoute>
      } />
      <Route path="/finance" element={
        <ProtectedAdminRoute requiredRole={['bursar', 'admin']}>
          <Layout><BursarDashboard /></Layout>
        </ProtectedAdminRoute>
      } />
      <Route path="/admin/student-results" element={
        <ProtectedAdminRoute requiredRole="admin">
          <Layout><StudentResults /></Layout>
        </ProtectedAdminRoute>
      } />
      <Route path="/messages" element={
        <ProtectedAdminRoute requiredRole={['teacher', 'principal', 'bursar']}>
          <Layout><MessageHub /></Layout>
        </ProtectedAdminRoute>
      } />
      <Route path="/admin/fame" element={
        <ProtectedAdminRoute requiredRole={['admin', 'principal']}>
          <Layout><FameManagement /></Layout>
        </ProtectedAdminRoute>
      } />
      <Route path="/admin/posts" element={
        <ProtectedAdminRoute requiredRole={['principal', 'admin', 'teacher']}>
          <Layout><ContentCMS /></Layout>
        </ProtectedAdminRoute>
      } />

      <Route path="/attendance" element={
        <ProtectedAdminRoute requiredRole={['admin', 'principal', 'teacher', 'bursar']}>
          <Layout><BiometricAttendance /></Layout>
        </ProtectedAdminRoute>
      } />

      <Route path="/admin/admission-cbt" element={
        <ProtectedAdminRoute requiredRole={['admin', 'principal']}>
          <Layout><AdmissionCBTManagement /></Layout>
        </ProtectedAdminRoute>
      } />

      <Route path="/admin/notifications" element={
        <ProtectedAdminRoute requiredRole={['admin', 'principal']}>
          <Layout><NotificationCenter /></Layout>
        </ProtectedAdminRoute>
      } />

      {/* Redirect unknown routes back to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <BonusAI />
      {updateAvailable && <UpdateModal latestVersion={latestVersion} />}
    </>
  );
}

export default App;
