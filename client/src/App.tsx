import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import LandingPage from './pages/LandingPage';
import TestManagementPage from './pages/TestManagementPage';
import ExecutionDetails from './components/ExecutionDetails';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/landing" element={
        <ProtectedRoute><LandingPage /></ProtectedRoute>
      } />
      <Route path="/tests/*" element={
        <ProtectedRoute><TestManagementPage /></ProtectedRoute>
      } />
      <Route path="/runs/:runId" element={
        <ProtectedRoute>
          <div className="min-h-screen bg-cyber p-6 max-w-7xl mx-auto">
            <ExecutionDetails />
          </div>
        </ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
