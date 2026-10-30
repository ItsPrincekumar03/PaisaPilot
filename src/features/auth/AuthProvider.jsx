import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../lib/firebase.js';
import { AuthContext } from './AuthContext.js';

/**
 * Status values:
 *   unconfigured     Firebase config is missing. No listener is started.
 *   initializing     Waiting for Firebase to restore the saved session.
 *   authenticated    A signed-in user exists.
 *   unauthenticated  No signed-in user.
 *   error            The auth-state listener reported a failure.
 */
export default function AuthProvider({ children }) {
    const [state, setState] = useState(() => ({
        status: auth ? 'initializing' : 'unconfigured',
        user: null,
    }));

    useEffect(() => {
        if (!auth) {
            return undefined;
        }

        const unsubscribe = onAuthStateChanged(
            auth,
            (user) => {
                setState(
                    user
                        ? { status: 'authenticated', user }
                        : { status: 'unauthenticated', user: null }
                );
            },
            () => {
                setState({ status: 'error', user: null });
            }
        );

        return unsubscribe;
    }, []);

    const value = useMemo(
        () => ({
            status: state.status,
            user: state.user,
            isConfigured: Boolean(auth),
        }),
        [state]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}