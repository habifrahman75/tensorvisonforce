// src/layouts/ProtectedRoute.jsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoadingState } from '../components/ui/States';

export function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingState fullPage />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to the correct home for this role
    const home = user.role === 'admin' ? '/admin/dashboard'
               : user.role === 'field_worker' ? '/worker/dashboard'
               : '/citizen/dashboard';
    return <Navigate to={home} replace />;
  }
  return children;
}
