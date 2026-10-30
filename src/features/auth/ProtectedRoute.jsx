import { Navigate, Outlet, useLocation } from 'react-router-dom';
import LoadingState from '../../components/common/LoadingState.jsx';
import { useAuth } from './useAuth.js';

export default function ProtectedRoute() {
    const { status } = useAuth();
    const location = useLocation();

    if (status === 'initializing') {
        return (
            <div className="panel">
                <LoadingState label="Checking your session…" />
            </div>
        );
    }

    if (status !== 'authenticated') {
        return (
            <Navigate
                to="/login"
                replace
                state={{ from: `${location.pathname}${location.search}` }}
            />
        );
    }

    return <Outlet />;
}