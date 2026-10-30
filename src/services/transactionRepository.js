import { onAuthStateChanged } from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase.js';
import { createServiceError, toServiceError } from '../lib/serviceError.js';
import {
  isWellFormedTransaction,
  validateTransactionValues,
} from '../features/transactions/transactionValidation.js';

const UNCONFIGURED_MESSAGE =
  'Firebase is not configured, so transactions are unavailable. See docs/database/firebase-setup.md.';
const SIGN_IN_MESSAGE = 'Sign in to view and save your transactions.';

const READ_MESSAGES = {
  unavailable: 'Cannot reach the server. Check your connection and try again.',
  'deadline-exceeded': 'The request timed out. Please try again.',
  'permission-denied': 'You do not have permission to view these transactions.',
  unauthenticated: 'Your session has expired. Sign in again.',
};

const WRITE_MESSAGES = {
  ...READ_MESSAGES,
  'permission-denied': 'You do not have permission to change this transaction.',
  'not-found': 'This transaction no longer exists. Refresh the list and try again.',
};

function waitForCurrentUser() {
  if (!auth || !db) {
    return Promise.reject(createServiceError('config/unconfigured', UNCONFIGURED_MESSAGE));
  }

  return new Promise((resolve, reject) => {
    let unsubscribe = () => {};
    unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        unsubscribe();
        resolve(user);
      },
      (error) => {
        unsubscribe();
        reject(toServiceError(error, READ_MESSAGES, 'Could not confirm your sign-in.'));
      }
    );
  });
}

async function requireUid() {
  const user = await waitForCurrentUser();
  if (!user) {
    throw createServiceError('auth/unauthenticated', SIGN_IN_MESSAGE);
  }
  return user.uid;
}

function transactionsCollection(uid) {
  return collection(db, 'users', uid, 'transactions');
}

function toTransaction(snapshot) {
  const data = snapshot.data();
  if (!isWellFormedTransaction(data)) {
    return null;
  }
  return {
    id: snapshot.id,
    type: data.type,
    categoryId: data.categoryId,
    date: data.date,
    description: data.description,
    amountPaise: data.amountPaise,
  };
}

function pickTransactionFields(input) {
  return {
    type: input?.type,
    amountPaise: input?.amountPaise,
    categoryId: input?.categoryId,
    date: input?.date,
    description: typeof input?.description === 'string' ? input.description.trim() : input?.description,
  };
}

function assertDocumentId(id) {
  if (typeof id !== 'string' || !id.trim() || id.includes('/')) {
    throw createServiceError(
      'validation/id',
      'This transaction cannot be identified. Refresh the list and try again.'
    );
  }
}

export async function listTransactions() {
  const uid = await requireUid();

  try {
    const snapshot = await getDocs(
      query(transactionsCollection(uid), orderBy('date', 'desc'))
    );
    return snapshot.docs.map(toTransaction).filter(Boolean);
  } catch (error) {
    throw toServiceError(error, READ_MESSAGES, 'Could not load transactions. Please try again.');
  }
}

export async function createTransaction(input) {
  const values = pickTransactionFields(input);
  const problem = validateTransactionValues(values);
  if (problem) {
    throw createServiceError('validation/transaction', problem);
  }

  const uid = await requireUid();

  try {
    const reference = await addDoc(transactionsCollection(uid), {
      ...values,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { id: reference.id };
  } catch (error) {
    throw toServiceError(error, WRITE_MESSAGES, 'Could not save the transaction. Please try again.');
  }
}

export async function updateTransaction(id, input) {
  assertDocumentId(id);

  const values = pickTransactionFields(input);
  const problem = validateTransactionValues(values);
  if (problem) {
    throw createServiceError('validation/transaction', problem);
  }

  const uid = await requireUid();

  try {
    await updateDoc(doc(transactionsCollection(uid), id), {
      ...values,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw toServiceError(error, WRITE_MESSAGES, 'Could not update the transaction. Please try again.');
  }
}

export async function deleteTransaction(id) {
  assertDocumentId(id);

  const uid = await requireUid();
  const reference = doc(transactionsCollection(uid), id);

  try {
    const snapshot = await getDoc(reference);
    if (!snapshot.exists()) {
      throw createServiceError('transaction/not-found', WRITE_MESSAGES['not-found']);
    }
    await deleteDoc(reference);
  } catch (error) {
    throw toServiceError(error, WRITE_MESSAGES, 'Could not delete the transaction. Please try again.');
  }
}