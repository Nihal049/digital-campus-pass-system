import React from 'react';
import { useAuth } from '../context/AuthContext';
import StudentDashboard from './StudentDashboard';
import FacultyDashboard from './FacultyDashboard';
import SecurityDashboard from './SecurityDashboard';
import AdminDashboard from './AdminDashboard';
import VisitorPortal from './VisitorPortal';

export default function DashboardRouter() {
  const { user } = useAuth();

  if (!user) return null;

  switch (user.role) {
    case 'STUDENT':
      return <StudentDashboard />;
    case 'FACULTY':
      return <FacultyDashboard />;
    case 'SECURITY':
      return <SecurityDashboard />;
    case 'ADMIN':
      return <AdminDashboard />;
    case 'VISITOR':
      return <VisitorPortal />;
    default:
      return <StudentDashboard />;
  }
}
