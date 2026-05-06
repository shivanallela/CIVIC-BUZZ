import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Landing from './pages/Landing';
import LoginResident from './pages/LoginResident';
import LoginEmployee from './pages/LoginEmployee';
import ResidentDashboard from './pages/ResidentDashboard';
import EmployeeDashboard from './pages/EmployeeDashboard';
import ReportIssue from './pages/ReportIssue';
import ReportDetail from './pages/ReportDetail';
import Navbar from './components/Navbar';

/**
 * Protected route wrapper — redirects to landing if not logged in
 */
function ProtectedRoute({ children, requiredRole }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="spinner spinner-dark" />
        <span>Loading...</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to={user.role === 'employee' ? '/employee' : '/dashboard'} replace />;
  }

  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-overlay" style={{ minHeight: '100vh' }}>
        <div className="spinner spinner-dark" />
        <span>Starting CivicLink...</span>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={user ? <Navigate to={user.role === 'employee' ? '/employee' : '/dashboard'} replace /> : <Landing />} />
      <Route path="/login/user" element={user ? <Navigate to="/dashboard" replace /> : <LoginResident />} />
      <Route path="/login/employee" element={user ? <Navigate to="/employee" replace /> : <LoginEmployee />} />

      {/* Protected: Resident */}
      <Route path="/dashboard" element={
        <ProtectedRoute requiredRole="user">
          <Navbar />
          <ResidentDashboard />
        </ProtectedRoute>
      } />
      <Route path="/report" element={
        <ProtectedRoute requiredRole="user">
          <Navbar />
          <ReportIssue />
        </ProtectedRoute>
      } />
      <Route path="/reports/:id" element={
        <ProtectedRoute>
          <Navbar />
          <ReportDetail />
        </ProtectedRoute>
      } />

      {/* Protected: Employee */}
      <Route path="/employee" element={
        <ProtectedRoute requiredRole="employee">
          <Navbar />
          <EmployeeDashboard />
        </ProtectedRoute>
      } />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
