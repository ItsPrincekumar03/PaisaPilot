import { useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import ErrorState from '../../components/common/ErrorState.jsx';
import LoadingState from '../../components/common/LoadingState.jsx';
import { signOutUser } from '../../services/auth.service.js';
import { useAuth } from './useAuth.js';

export default function ProtectedRoute() {
    const { status, profileStatus, profileMessage, retryProfile, completeAccountSetup } = useAuth();
    const location = useLocation();
    const [isFinishing, setIsFinishing] = useState(false);
    const [finishError, setFinishError] = useState('');

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

    if (profileStatus === 'error') {
        return (
            <div className="panel">
                <ErrorState
                    title="Account could not be loaded"
                    message={profileMessage}
                    onRetry={retryProfile}
                />
            </div>
        );
    }

    if (profileStatus === 'missing') {
        async function handleFinish() {
            setIsFinishing(true);
            setFinishError('');
            const result = await completeAccountSetup();
            setIsFinishing(false);
            if (!result.ok) {
                setFinishError(result.message || 'Setup did not finish. Please try again.');
            }
        }

        async function handleSignOut() {
            await signOutUser();
        }

        return (
            <div className="panel">
                <h3>Account setup incomplete</h3>
                <p>
                    No profile was found for this account. Finish setup to create it. Existing
                    data is never changed.
                </p>
                {finishError && (
                    <p className="form-message form-message--error" role="alert">
                        {finishError}
                    </p>
                )}
                <button
                    type="button"
                    className="button"
                    onClick={handleFinish}
                    disabled={isFinishing}
                    aria-busy={isFinishing}
                >
                    {isFinishing ? 'Finishing setup…' : 'Finish setup'}
                </button>
                <button type="button" className="button" onClick={handleSignOut}>
                    Sign out
                </button>
            </div>
        );
    }

    if (profileStatus !== 'ready') {
        return (
            <div className="panel">
                <LoadingState label="Setting up your account…" />
            </div>
        );
    }

    return <Outlet />;
}
