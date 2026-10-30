import { useEffect, useState } from 'react';
import { useAuth } from '../auth/useAuth.js';
import { hasAdminClaim } from './adminPolicy.js';

/**
 * Reads the Firebase custom claim `admin` from a fresh ID token.
 * UI gating only. Firestore rules and Cloud Functions enforce admin access.
 *
 * Returns:
 *   status: 'checking' | 'signed-out' | 'ready' | 'error'
 *   isAdmin: boolean (true only when status is 'ready' and the claim is true)
 */
export function useIsAdmin() {
  const { status: authStatus, user } = useAuth();
  const uid = user?.uid ?? null;
  const [result, setResult] = useState({ uid: null, isAdmin: false, error: null });

  useEffect(() => {
    if (!user) {
      return undefined;
    }

    let isActive = true;

    // Forcing a refresh picks up claims granted or removed since the last sign-in.
    user
      .getIdTokenResult(true)
      .then((token) => {
        if (isActive) {
          setResult({ uid: user.uid, isAdmin: hasAdminClaim(token.claims), error: null });
        }
      })
      .catch(() => {
        if (isActive) {
          setResult({
            uid: user.uid,
            isAdmin: false,
            error: 'Could not verify administrator access. Please try again.',
          });
        }
      });

    return () => {
      isActive = false;
    };
  }, [user]);

  if (authStatus === 'initializing') {
    return { status: 'checking', isAdmin: false, error: null };
  }

  if (!uid) {
    return { status: 'signed-out', isAdmin: false, error: null };
  }

  // Ignore a result that belongs to a previous user.
  if (result.uid !== uid) {
    return { status: 'checking', isAdmin: false, error: null };
  }

  if (result.error) {
    return { status: 'error', isAdmin: false, error: result.error };
  }

  return { status: 'ready', isAdmin: result.isAdmin, error: null };
}
