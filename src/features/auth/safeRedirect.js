import { NAV_ITEMS } from '../../app/navigation.js';

const ORIGIN = 'http://localhost';

/**
 * Returns a same-app path for post-login redirects, or the fallback.
 * Accepts only internal paths that exactly match a navigation route or a child of one.
 * Rejects absolute URLs, protocol-relative URLs, backslashes, and control characters.
 */
export function getSafeRedirectPath(candidate, fallback = '/dashboard') {
    if (typeof candidate !== 'string' || candidate.length > 512) {
        return fallback;
    }
    const containsControlCharacter = [...candidate].some((character) => {
        const code = character.charCodeAt(0);
        return code <= 0x1f || code === 0x7f;
    });

    if (
        !candidate.startsWith('/') ||
        /[\s\\]/.test(candidate) ||
        containsControlCharacter
    ) {
        return fallback;
    }

    let url;
    try {
        url = new URL(candidate, ORIGIN);
    } catch {
        return fallback;
    }

    if (url.origin !== ORIGIN) {
        return fallback;
    }

    const allowed = NAV_ITEMS.some(
        (item) => url.pathname === item.to || url.pathname.startsWith(`${item.to}/`)
    );
    return allowed ? `${url.pathname}${url.search}` : fallback;
}