const GENERIC_SIGN_IN = 'Email or password is incorrect.';
const DEFAULT_MESSAGE = 'Something went wrong. Please try again.';

// Keys must match codes confirmed against the installed @firebase/auth package.
const MESSAGES = {
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/weak-password': 'Choose a stronger password with at least 8 characters.',
    'auth/email-already-in-use':
        "This email can't be used to create a new account. Try signing in or resetting your password.",
    'auth/invalid-credential': GENERIC_SIGN_IN,
    'auth/invalid-login-credentials': GENERIC_SIGN_IN,
    'auth/wrong-password': GENERIC_SIGN_IN,
    'auth/user-not-found': GENERIC_SIGN_IN,
    'auth/user-disabled': 'This account has been disabled. Contact support for help.',
    'auth/too-many-requests': 'Too many attempts. Wait a few minutes and try again.',
    'auth/network-request-failed': 'Network error. Check your connection and try again.',
    'auth/operation-not-allowed': 'This sign-in method is not enabled for this app.',
    'config/unconfigured':
        'Firebase is not configured. See docs/database/firebase-setup.md for setup steps.',
};

/**
 * Maps a Firebase or app error code to a user-safe message.
 * Raw Firebase messages are never shown. Unknown codes get a generic message.
 * Object.hasOwn prevents keys such as "constructor" from matching.
 */
export function getAuthErrorMessage(code) {
    return Object.hasOwn(MESSAGES, code) ? MESSAGES[code] : DEFAULT_MESSAGE;
}