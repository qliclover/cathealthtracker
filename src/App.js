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

// 保护路由组件
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
    // 简单检查token是否存在
    const token = localStorage.getItem('token');
    
    // 如果用户没有登录且不在登录/注册页面，重定向到登录页面
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
          <span className="visually-hidden">加载中...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <div className="container mt-4">
        <Routes>
          {/* 公开路由 */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          {/* 受保护路由 */}
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
          
          {/* 默认路由 */}
          <Route path="/" element={<Navigate to="/cats" replace />} />
          
          {/* 404路由 */}
          <Route path="*" element={
            <div className="alert alert-warning text-center mt-5">
              <h3>页面不存在</h3>
              <p>您访问的页面不存在或已被移除。</p>
              <button 
                className="btn btn-primary" 
                onClick={() => navigate('/')}
              >
                返回首页
              </button>
            </div>
          } />
        </Routes>
      </div>
    </div>
  );
}

export default App;