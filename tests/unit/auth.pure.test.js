import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateEmail, validatePassword } from '../../src/features/auth/authValidation.js';
import { getAuthErrorMessage } from '../../src/features/auth/authErrors.js';
import { getSafeRedirectPath } from '../../src/features/auth/safeRedirect.js';

describe('validateEmail', () => {
    it('rejects empty input', () => {
        assert.notEqual(validateEmail(''), null);
        assert.notEqual(validateEmail('   '), null);
        assert.notEqual(validateEmail(undefined), null);
    });

    it('rejects malformed addresses', () => {
        assert.notEqual(validateEmail('not-an-email'), null);
        assert.notEqual(validateEmail('a@b'), null);
        assert.notEqual(validateEmail('a b@example.com'), null);
    });

    it('accepts a normal address', () => {
        assert.equal(validateEmail('alice@example.com'), null);
    });
});

describe('validatePassword', () => {
    it('rejects empty and non-string input', () => {
        assert.notEqual(validatePassword(''), null);
        assert.notEqual(validatePassword(null), null);
    });

    it('rejects passwords shorter than 8 characters', () => {
        assert.notEqual(validatePassword('short7!'), null);
    });

    it('rejects passwords longer than 128 characters', () => {
        assert.notEqual(validatePassword('a'.repeat(129)), null);
    });

    it('accepts a password of 8 characters', () => {
        assert.equal(validatePassword('12345678'), null);
    });
});

describe('getAuthErrorMessage', () => {
    it('returns a friendly message for a known code', () => {
        assert.match(getAuthErrorMessage('auth/too-many-requests'), /Too many attempts/);
    });

    it('gives the same generic message for every wrong-credential code', () => {
        const generic = 'Email or password is incorrect.';
        assert.equal(getAuthErrorMessage('auth/invalid-credential'), generic);
        assert.equal(getAuthErrorMessage('auth/wrong-password'), generic);
        assert.equal(getAuthErrorMessage('auth/user-not-found'), generic);
    });

    it('never returns the raw code', () => {
        assert.doesNotMatch(getAuthErrorMessage('auth/some-new-code'), /auth\//);
    });

    it('falls back to a generic message for unknown codes', () => {
        assert.equal(getAuthErrorMessage('auth/some-new-code'), 'Something went wrong. Please try again.');
    });

    it('does not match inherited object properties', () => {
        assert.equal(getAuthErrorMessage('constructor'), 'Something went wrong. Please try again.');
        assert.equal(getAuthErrorMessage('__proto__'), 'Something went wrong. Please try again.');
    });
});

describe('getSafeRedirectPath', () => {
    it('allows internal navigation routes', () => {
        assert.equal(getSafeRedirectPath('/transactions'), '/transactions');
        assert.equal(getSafeRedirectPath('/budgets/2026-10'), '/budgets/2026-10');
    });

    it('keeps the query string', () => {
        assert.equal(getSafeRedirectPath('/reports?month=2026-10'), '/reports?month=2026-10');
    });

    it('rejects absolute external URLs', () => {
        assert.equal(getSafeRedirectPath('https://evil.example'), '/dashboard');
    });

    it('rejects protocol-relative URLs', () => {
        assert.equal(getSafeRedirectPath('//evil.example'), '/dashboard');
    });

    it('rejects tab-smuggled protocol-relative URLs', () => {
        assert.equal(getSafeRedirectPath('/\t/evil.example'), '/dashboard');
    });

    it('rejects backslash tricks', () => {
        assert.equal(getSafeRedirectPath('/\\evil.example'), '/dashboard');
    });

    it('rejects javascript: URLs', () => {
        assert.equal(getSafeRedirectPath('javascript:alert(1)'), '/dashboard');
    });

    it('rejects routes that are not in the navigation list', () => {
        assert.equal(getSafeRedirectPath('/login'), '/dashboard');
        assert.equal(getSafeRedirectPath('/dashboardx'), '/dashboard');
    });

    it('uses the fallback for non-string input', () => {
        assert.equal(getSafeRedirectPath(undefined), '/dashboard');
        assert.equal(getSafeRedirectPath({ path: '/budgets' }), '/dashboard');
    });
});