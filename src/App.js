import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';
import CatListPage from './CatListPage';
import CatDetailsPage from './CatDetailsPage';
import AddCatPage from './AddCatPage';
import EditCatPage from './EditCatPage';
import AddRecordPage from './AddRecordPage';
import EditRecordPage from './EditRecordPage';
import HealthCalendarPage from './HealthCalendarPage';
import HealthTodoListPage from './HealthTodoListPage';
import AddInsurancePage from './AddInsurancePage';
import EditInsurancePage from './EditInsurancePage';
import DashboardPage from './DashboardPage';
import './styles/index.css'; // Import the styles

// Protected route component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  const [isReady, setIsReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Simple check if token exists
    const token = localStorage.getItem('token');
    
    // If user is not logged in and not on login/register page, redirect to login page
    if (!token) {
      const path = window.location.pathname;
      if (path !== '/login' && path !== '/register') {
        navigate('/login');
      }
    }
    
    setIsReady(true);
  }, [navigate]);

  if (!isReady) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <Navbar />
      <div className="container mt-4">
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          {/* Protected routes */}
          <Route path="/cats" element={
            <ProtectedRoute>
              <CatListPage />
            </ProtectedRoute>
          } />
          
          <Route path="/cats/:id" element={
            <ProtectedRoute>
              <CatDetailsPage />
            </ProtectedRoute>
          } />
          
          <Route path="/cats/add" element={
            <ProtectedRoute>
              <AddCatPage />
            </ProtectedRoute>
          } />
          
          <Route path="/cats/:id/edit" element={
            <ProtectedRoute>
              <EditCatPage />
            </ProtectedRoute>
          } />
          
          <Route path="/cats/:id/records/add" element={
            <ProtectedRoute>
              <AddRecordPage />
            </ProtectedRoute>
          } />
          
          <Route path="/records/:id/edit" element={
            <ProtectedRoute>
              <EditRecordPage />
            </ProtectedRoute>
          } />

          <Route path="/calendar" element={
            <ProtectedRoute>
              <HealthCalendarPage />
            </ProtectedRoute>
          } />

          <Route path="/todos" element={
            <ProtectedRoute>
              <HealthTodoListPage />
            </ProtectedRoute>
          } />

          <Route path="/cats/:id/insurance/add" element={
            <ProtectedRoute>
              <AddInsurancePage />
            </ProtectedRoute>
          } />

          <Route path="/insurance/:id/edit" element={
            <ProtectedRoute>
              <EditInsurancePage />
            </ProtectedRoute>
          } />

          <Route path="/" element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          } />
          
          {/* Default route */}
          <Route path="/" element={<Navigate to="/cats" replace />} />
          
          {/* 404 route */}
          <Route path="*" element={
            <div className="alert alert-warning text-center mt-5">
              <h3>Page Not Found</h3>
              <p>The page you are looking for does not exist or has been moved.</p>
              <button 
                className="btn btn-primary" 
                onClick={() => navigate('/')}
              >
                Return to Home
              </button>
            </div>
          } />
        </Routes>
      </div>
    </div>
  );
}

export default App;