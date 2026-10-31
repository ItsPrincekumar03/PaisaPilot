import { collection, doc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase.js';
import {
  ACCOUNT_STATUS,
  validateSuspensionAction,
} from '../features/admin/adminValidation.js';

const ADMIN_ERROR_MESSAGES = {
  'permission-denied': 'You do not have administrative permissions to perform this action.',
  unauthenticated: 'Your administrative session has expired. Please sign in again.',
  unavailable: 'Cannot reach Firestore server. Check your connection.',
  'not-found': 'The requested user account was not found.',
};

function fail(code, message) {
  return { ok: false, code, message };
}

function fromFirestoreError(error) {
  const code = typeof error?.code === 'string' ? error.code : 'unknown';
  const message = Object.hasOwn(ADMIN_ERROR_MESSAGES, code)
    ? ADMIN_ERROR_MESSAGES[code]
    : error?.message || 'An administrative error occurred.';
  return fail(`admin/${code}`, message);
}

function checkAdminAuth() {
  if (!db) {
    return fail('config/unconfigured', 'Firebase database is not configured.');
  }
  if (!auth?.currentUser) {
    return fail('auth/unauthenticated', 'No active session found. Please sign in.');
  }
  return null;
}

export async function fetchUsers() {
  const authErr = checkAdminAuth();
  if (authErr) return authErr;

  try {
    const usersCol = collection(db, 'users');
    const snapshot = await getDocs(usersCol);

    const users = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        uid: docSnap.id,
        email: data.email || '—',
        displayName: data.displayName || '—',
        currency: data.currency || 'INR',
        theme: data.theme || 'system',
        accountStatus: data.accountStatus || ACCOUNT_STATUS.ACTIVE,
        createdAt: data.createdAt?.toDate?.() || null,
        updatedAt: data.updatedAt?.toDate?.() || null,
      };
    });

    return { ok: true, users };
  } catch (error) {
    return fromFirestoreError(error);
  }
}

export async function setUserAccountStatus({ targetUid, currentStatus, nextStatus }) {
  const authErr = checkAdminAuth();
  if (authErr) return authErr;

  const currentAdminUid = auth.currentUser.uid;
  const validation = validateSuspensionAction({
    currentAdminUid,
    targetUid,
    currentStatus,
    nextStatus,
  });

  if (!validation.valid) {
    return fail('admin/invalid-action', validation.error);
  }

  try {
    const userRef = doc(db, 'users', targetUid);
    await updateDoc(userRef, {
      accountStatus: nextStatus,
      updatedAt: serverTimestamp(),
    });

    return { ok: true, targetUid, newStatus: nextStatus };
  } catch (error) {
    return fromFirestoreError(error);
  }
}
