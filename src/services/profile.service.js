import { doc, getDoc, runTransaction, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase.js';
import { DEFAULT_PREFERENCES, DISPLAY_NAME_MAX_LENGTH } from '../features/profile/profileConstants.js';
import { validateProfileUpdates } from '../features/profile/profileValidation.js';

const FIRESTORE_MESSAGES = {
  'permission-denied': 'You do not have permission to change this profile.',
  unauthenticated: 'Your session has expired. Sign in again.',
  unavailable: 'Cannot reach the server. Check your connection and try again.',
  'deadline-exceeded': 'The request timed out. Please try again.',
  'not-found': 'Your profile could not be found. Reload the page and try again.',
  'already-exists': 'A profile document already exists.',
  'failed-precondition': 'Operation precondition failed.',
};
const DEFAULT_ERROR = 'Could not save your profile. Please try again.';

function fail(code, message) {
  return { ok: false, code, message };
}

function fromFirestoreError(error) {
  const code = typeof error?.code === 'string' ? error.code : 'unknown';
  const message = Object.hasOwn(FIRESTORE_MESSAGES, code) ? FIRESTORE_MESSAGES[code] : DEFAULT_ERROR;
  return fail(`profile/${code}`, message);
}

function checkAccess(uid) {
  if (!db) {
    return fail('config/unconfigured', 'Firebase is not configured, so your profile is unavailable.');
  }
  if (!auth?.currentUser || auth.currentUser.uid !== uid) {
    return fail('profile/session-mismatch', 'Your session has changed. Reload the page and try again.');
  }
  return null;
}

function toProfileView(data) {
  return {
    displayName: data.displayName ?? '',
    email: data.email ?? '',
    currency: data.currency ?? DEFAULT_PREFERENCES.currency,
    theme: data.theme ?? DEFAULT_PREFERENCES.theme,
    language: data.language ?? DEFAULT_PREFERENCES.language,
    createdAt: data.createdAt?.toDate?.() ?? null,
    updatedAt: data.updatedAt?.toDate?.() ?? null,
  };
}

function defaultDisplayName(user) {
  const fromAccount = typeof user.displayName === 'string' ? user.displayName.trim() : '';
  const fromEmail = user.email.split('@')[0].trim();
  return (fromAccount || fromEmail).slice(0, DISPLAY_NAME_MAX_LENGTH) || 'PaisaPilot user';
}

export async function ensureUserProfile(user) {
  if (!user?.uid || typeof user.email !== 'string' || !user.email) {
    return fail('profile/no-user', 'No signed-in user was found.');
  }

  const accessError = checkAccess(user.uid);
  if (accessError) {
    return accessError;
  }

  const ref = doc(db, 'users', user.uid);

  // Quick check: if the document already exists, return it directly without running a transaction.
  try {
    const existingSnap = await getDoc(ref);
    if (existingSnap.exists()) {
      return { ok: true, created: false, profile: toProfileView(existingSnap.data()) };
    }
  } catch (err) {
    // If getDoc fails due to permission or network, let fromFirestoreError handle it or proceed to transaction
    if (err?.code === 'permission-denied' || err?.code === 'unavailable') {
      return fromFirestoreError(err);
    }
  }

  try {
    return await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(ref);

      if (snapshot.exists()) {
        return { ok: true, created: false, profile: toProfileView(snapshot.data()) };
      }

      const initialData = {
        displayName: defaultDisplayName(user),
        email: user.email,
        currency: DEFAULT_PREFERENCES.currency,
        theme: DEFAULT_PREFERENCES.theme,
        language: DEFAULT_PREFERENCES.language,
        accountStatus: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      transaction.set(ref, initialData);

      return {
        ok: true,
        created: true,
        profile: toProfileView({ ...initialData, createdAt: null, updatedAt: null }),
      };
    });
  } catch (error) {
    // If a concurrent request or race condition already created the document, safely fetch and return it.
    if (error?.code === 'already-exists' || error?.code === 'failed-precondition') {
      try {
        const fallbackSnap = await getDoc(ref);
        if (fallbackSnap.exists()) {
          return { ok: true, created: false, profile: toProfileView(fallbackSnap.data()) };
        }
      } catch {
        // Fall through to fromFirestoreError
      }
    }
    return fromFirestoreError(error);
  }
}

export async function updateUserProfile(uid, input) {
  const accessError = checkAccess(uid);
  if (accessError) {
    return accessError;
  }

  const { values, errors } = validateProfileUpdates(input);
  if (Object.keys(errors).length > 0) {
    return { ...fail('validation/profile', Object.values(errors)[0]), errors };
  }
  if (Object.keys(values).length === 0) {
    return fail('validation/no-changes', 'There are no changes to save.');
  }

  try {
    await updateDoc(doc(db, 'users', uid), {
      ...values,
      updatedAt: serverTimestamp(),
    });
    return { ok: true, values };
  } catch (error) {
    return fromFirestoreError(error);
  }
}