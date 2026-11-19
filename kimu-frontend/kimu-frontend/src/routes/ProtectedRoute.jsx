import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingIndicator from '../components/common/LoadingIndicator';

/**
 * Guards a route behind authentication, and optionally behind specific roles.
 * Optional role restrictions can be passed to protected routes.
 */
export default function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, isLoading, hasRole } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingIndicator />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && roles.length > 0 && !hasRole(...roles)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
