const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

/** Returns an error message, or null when the email is acceptable. */
export function validateEmail(email) {
    if (typeof email !== 'string' || !email.trim()) {
        return 'Enter your email address.';
    }
    const trimmed = email.trim();
    if (trimmed.length > 254 || !EMAIL_PATTERN.test(trimmed)) {
        return 'Enter a valid email address.';
    }
    return null;
}

/** Returns an error message, or null when the password meets the registration policy. */
export function validatePassword(password) {
    if (typeof password !== 'string' || !password) {
        return 'Enter a password.';
    }
    if (password.length < PASSWORD_MIN_LENGTH) {
        return `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
    }
    if (password.length > PASSWORD_MAX_LENGTH) {
        return `Use no more than ${PASSWORD_MAX_LENGTH} characters.`;
    }
    return null;
}