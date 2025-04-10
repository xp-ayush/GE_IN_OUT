import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import AdminDashboard from './components/dashboards/admin/AdminDashboard';
import UserDashboard from './components/dashboards/UserDashboard';
import ViewerDashboard from './components/dashboards/viewer/ViewerDashboard';
import OutwardEntryForm from './components/outward/OutwardEntryForm';
import OutwardEntryHistory from './components/outward/OutwardEntryHistory';
import InwardEntryForm from './components/inward/InwardEntryForm';
import InwardEntryHistory from './components/inward/InwardEntryHistory';
import './App.css';

// Protected Route component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const user = JSON.parse(localStorage.getItem('user'));
  
  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

function App() {
  const user = JSON.parse(localStorage.getItem('user'));

  // Function to determine the default route based on user role
  const getDefaultRoute = () => {
    if (!user) return '/login';
    switch (user.role) {
      case 'Admin':
        return '/admin';
      case 'User':
        return '/dashboard';
      case 'Viewer':
        return '/viewer';
      default:
        return '/login';
    }
  };

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['User', 'Admin']}>
                <UserDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/viewer"
            element={
              <ProtectedRoute allowedRoles={['Viewer', 'Admin']}>
                <ViewerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/outward/new"
            element={
              <ProtectedRoute allowedRoles={['User', 'Admin']}>
                <OutwardEntryForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/outward/history"
            element={
              <ProtectedRoute allowedRoles={['User', 'Admin', 'Viewer']}>
                <OutwardEntryHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inward/new"
            element={
              <ProtectedRoute allowedRoles={['User', 'Admin']}>
                <InwardEntryForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inward/history"
            element={
              <ProtectedRoute allowedRoles={['User', 'Admin', 'Viewer']}>
                <InwardEntryHistory />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to={getDefaultRoute()} replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
