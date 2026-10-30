import { Navigate, Outlet } from 'react-router-dom';
import ErrorState from '../../components/common/ErrorState.jsx';
import LoadingState from '../../components/common/LoadingState.jsx';
import { useIsAdmin } from './useIsAdmin.js';

/**
 * Route guard for /admin. Must sit inside ProtectedRoute.
 * Non-admins are sent to the dashboard. This guard is not the security boundary.
 */
export default function AdminRoute() {
  const { status, isAdmin, error } = useIsAdmin();

  if (status === 'checking') {
    return (
      <div className="panel">
        <LoadingState label="Checking administrator access..." />
      </div>
    );
  }

  if (status === 'signed-out') {
    return <Navigate to="/login" replace />;
  }

  if (status === 'error') {
    return <ErrorState title="Access check failed" message={error} />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
