import {
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    signInWithEmailAndPassword,
    signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth } from '../lib/firebase.js';
import { getAuthErrorMessage } from '../features/auth/authErrors.js';
import { validateEmail, validatePassword } from '../features/auth/authValidation.js';

/*
 * Every operation resolves to one of:
 *   { ok: true,  user?, message? }
 *   { ok: false, code, message }
 * Operations never throw, and raw Firebase messages are never returned.
 * Passwords are passed straight to Firebase and are never stored, logged, or returned.
 */

function fail(code, message = getAuthErrorMessage(code)) {
    return { ok: false, code, message };
}

function fromFirebaseError(error) {
    const code = typeof error?.code === 'string' ? error.code : 'unknown';
    return fail(code);
}

function ensureConfigured() {
    return auth ? null : fail('config/unconfigured');
}

export async function registerWithEmail(email, password) {
    const configError = ensureConfigured();
    if (configError) return configError;

    const emailError = validateEmail(email);
    if (emailError) return fail('validation/email', emailError);

    const passwordError = validatePassword(password);
    if (passwordError) return fail('validation/password', passwordError);

    try {
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        return { ok: true, user: credential.user };
    } catch (error) {
        return fromFirebaseError(error);
    }
}

export async function signInWithEmail(email, password) {
    const configError = ensureConfigured();
    if (configError) return configError;

    const emailError = validateEmail(email);
    if (emailError) return fail('validation/email', emailError);

    // Sign-in checks presence only. Registration policy is not repeated here.
    if (typeof password !== 'string' || !password) {
        return fail('validation/password', 'Enter your password.');
    }

    try {
        const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
        return { ok: true, user: credential.user };
    } catch (error) {
        return fromFirebaseError(error);
    }
}

export async function signOutUser() {
    const configError = ensureConfigured();
    if (configError) return configError;

    try {
        await firebaseSignOut(auth);
        return { ok: true };
    } catch (error) {
        return fromFirebaseError(error);
    }
}

/**
 * Sends a reset email. The success message is the same whether or not the account
 * exists, so the form cannot be used to discover registered addresses.
 */
export async function sendPasswordReset(email) {
    const configError = ensureConfigured();
    if (configError) return configError;

    const emailError = validateEmail(email);
    if (emailError) return fail('validation/email', emailError);

    try {
        await sendPasswordResetEmail(auth, email.trim());
        return {
            ok: true,
            message: 'If an account exists for this email, a password reset link has been sent.',
        };
    } catch (error) {
        return fromFirebaseError(error);
    }
}