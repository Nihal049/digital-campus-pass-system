import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import DashboardRouter from './pages/DashboardRouter';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import SecurityDashboard from './pages/SecurityDashboard';
import CurrentlyInsidePage from './pages/CurrentlyInsidePage';
import VisitorPortal from './pages/VisitorPortal';
import GatesManagementPage from './pages/GatesManagementPage';
import AuditLogsPage from './pages/AuditLogsPage';
import AIAssistantPage from './pages/AIAssistantPage';
import ProfilePage from './pages/ProfilePage';
import PublicPassVerifyPage from './pages/PublicPassVerifyPage';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-600 text-sm">
        <div className="w-8 h-8 border-2 border-slate-800 border-t-transparent rounded-full animate-spin mr-3"></div>
        Authenticating...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function AppContent() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      {user && <Navbar />}
      <main className="flex-1">
        <Routes>
          <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" replace />} />
          <Route path="/register" element={!user ? <RegisterPage /> : <Navigate to="/" replace />} />
          
          {/* Public Pass Verification View */}
          <Route path="/verify/pass/:passNumber" element={<PublicPassVerifyPage />} />

          {/* Authenticated Routes */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <DashboardRouter />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/gate-scanner" 
            element={
              <ProtectedRoute allowedRoles={['SECURITY', 'ADMIN']}>
                <SecurityDashboard />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/currently-inside" 
            element={
              <ProtectedRoute allowedRoles={['SECURITY', 'ADMIN']}>
                <CurrentlyInsidePage />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/visitors" 
            element={
              <ProtectedRoute>
                <VisitorPortal />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/gates-management" 
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <GatesManagementPage />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/audit-logs" 
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'SECURITY']}>
                <AuditLogsPage />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/assistant" 
            element={
              <ProtectedRoute>
                <AIAssistantPage />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            } 
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}
