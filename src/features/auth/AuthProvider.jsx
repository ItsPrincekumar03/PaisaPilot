import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../lib/firebase.js';
import { registerWithEmail } from '../../services/auth.service.js';
import { createProfileIfMissing, getUserProfile } from '../../services/profile.service.js';
import { AuthContext } from './AuthContext.js';

/**
 * Session status (unchanged):
 *   unconfigured | initializing | authenticated | unauthenticated | error
 *
 * Profile status (only while authenticated):
 *   initializing  users/{uid} is being checked. Protected pages wait.
 *   ready         users/{uid} exists. The client does not change its accountStatus.
 *   missing       users/{uid} does not exist. Nothing is created automatically.
 *                 The user may choose "Finish setup", which creates only their own profile.
 *   error         The check failed (for example, offline). Retry only re-reads.
 */

const CHECK_FAILED_MESSAGE = 'Your account could not be loaded. Please try again.';
const SETUP_FAILED_MESSAGE =
    'Your account was created, but setup did not finish. Use Finish setup to continue.';
const UNCONFIGURED_MESSAGE = 'Firebase is not configured, so accounts are unavailable.';

export default function AuthProvider({ children }) {
    const [state, setState] = useState(() => ({
        status: auth ? 'initializing' : 'unconfigured',
        user: null,
    }));
    const [profileState, setProfileState] = useState({ uid: null, status: 'idle', message: '' });
    const [profileAttempt, setProfileAttempt] = useState(0);

    // Refs are not render state.
    // holdRef: while true, automatic profile checks are skipped (registration in progress).
    // sessionRef: increments on every auth change, so late async results can be recognised as stale.
    const holdRef = useRef(false);
    const sessionRef = useRef(0);

    useEffect(() => {
        if (!auth) {
            return undefined;
        }

        const unsubscribe = onAuthStateChanged(
            auth,
            (user) => {
                sessionRef.current += 1;
                setState(
                    user
                        ? { status: 'authenticated', user }
                        : { status: 'unauthenticated', user: null }
                );
            },
            () => {
                sessionRef.current += 1;
                setState({ status: 'error', user: null });
            }
        );

        return unsubscribe;
    }, []);

    const uid = state.status === 'authenticated' && state.user ? state.user.uid : null;

    // Automatic check. Read-only: it can report 'missing' but never creates a profile.
    useEffect(() => {
        if (!uid || holdRef.current) {
            return undefined;
        }

        let isActive = true;

        getUserProfile(uid).then((result) => {
            if (!isActive) {
                return;
            }
            if (result.ok) {
                setProfileState({ uid, status: 'ready', message: '' });
            } else if (result.code === 'profile/not-found') {
                setProfileState({ uid, status: 'missing', message: '' });
            } else {
                setProfileState({
                    uid,
                    status: 'error',
                    message: result.message || CHECK_FAILED_MESSAGE,
                });
            }
        });

        // Cancels the result when the user changes, signs out, or the provider unmounts.
        return () => {
            isActive = false;
        };
    }, [uid, profileAttempt]);

    /**
     * Account creation plus profile creation, as one step.
     * The hold stops the automatic check from running between createUser and
     * createProfileIfMissing, which would otherwise show a false "missing" state.
     */
    const registerAccount = useCallback(async (email, password) => {
        if (!db) {
            return { ok: false, code: 'config/unconfigured', message: UNCONFIGURED_MESSAGE };
        }

        holdRef.current = true;
        try {
            const created = await registerWithEmail(email, password);
            if (!created.ok) {
                return created;
            }

            const setup = await createProfileIfMissing(db, created.user);
            if (!setup.ok) {
                return { ok: false, code: setup.code, message: SETUP_FAILED_MESSAGE };
            }
            return { ok: true };
        } finally {
            holdRef.current = false;
            setProfileAttempt((count) => count + 1);
        }
    }, []);

    /**
     * Explicit recovery for a signed-in user whose profile is 'missing'.
     * Creates only the signed-in user's own profile. An existing document is never changed.
     */
    const completeAccountSetup = useCallback(async () => {
        const current = auth?.currentUser;
        if (!db || !current) {
            return { ok: false, message: 'Sign in again to finish setting up your account.' };
        }

        const session = sessionRef.current;
        holdRef.current = true;
        let result;
        try {
            result = await createProfileIfMissing(db, current);
        } finally {
            holdRef.current = false;
        }

        if (sessionRef.current !== session) {
            return { ok: false, message: 'Your session changed. Please try again.' };
        }

        setProfileAttempt((count) => count + 1);
        return result;
    }, []);

    // Retry only re-reads the profile. It never creates one.
    const retryProfile = useCallback(() => {
        setProfileState({ uid: null, status: 'idle', message: '' });
        setProfileAttempt((count) => count + 1);
    }, []);

    let profileStatus = 'idle';
    if (uid !== null) {
        profileStatus =
            profileState.uid === uid && profileState.status !== 'idle'
                ? profileState.status
                : 'initializing';
    }

    const value = useMemo(
        () => ({
            status: state.status,
            user: state.user,
            isConfigured: Boolean(auth),
            profileStatus,
            profileMessage: profileState.message,
            retryProfile,
            completeAccountSetup,
            registerAccount,
        }),
        [state, profileStatus, profileState.message, retryProfile, completeAccountSetup, registerAccount]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
