import { Navigate, Outlet, useLocation } from 'react-router-dom';
import LoadingState from '../../components/common/LoadingState.jsx';
import { getSafeRedirectPath } from './safeRedirect.js';
import { useAuth } from './useAuth.js';

export default function PublicOnlyRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'initializing') {
    return (
      <div className="auth-loading">
        <LoadingState label="Checking your session…" />
      </div>
    );
  }

  if (status === 'authenticated') {
    return <Navigate to={getSafeRedirectPath(location.state?.from)} replace />;
  }

  return <Outlet />;
}