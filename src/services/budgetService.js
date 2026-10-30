import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase.js';
import { BUDGET_LIMIT_MAX_PAISE, MONTH_KEY_PATTERN } from '../utils/budgetConstants.js';

let inMemoryBudgets = [];

export class BudgetServiceError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'BudgetServiceError';
    this.code = code;
  }
}

export function getBudgetId(monthKey, categoryId) {
  return `${monthKey}_${categoryId}`;
}

function requireOwner(ownerId) {
  if (typeof ownerId !== 'string' || ownerId.length === 0) {
    throw new BudgetServiceError('unauthenticated', 'You must be signed in to manage budgets.');
  }
}

function requireValidLimit(limitPaise) {
  if (!Number.isSafeInteger(limitPaise) || limitPaise <= 0 || limitPaise > BUDGET_LIMIT_MAX_PAISE) {
    throw new BudgetServiceError('invalid-limit', 'The budget limit must be a positive amount within the allowed range.');
  }
}

function toBudgetError(error, defaultMessage) {
  if (error instanceof BudgetServiceError) {
    return error;
  }
  const code = error?.code || 'unknown';
  let message = defaultMessage || error?.message || 'A budget error occurred.';
  if (code === 'permission-denied') {
    message = 'You do not have permission to perform this action.';
  } else if (code === 'unavailable') {
    message = 'Cannot reach the server. Check your connection and try again.';
  }
  return new BudgetServiceError(code, message);
}

function findOwnedInMemory(ownerId, budgetId) {
  return inMemoryBudgets.find((record) => record.ownerId === ownerId && record.id === budgetId) ?? null;
}

function toPublicRecord(record) {
  return {
    id: record.id,
    monthKey: record.monthKey,
    categoryId: record.categoryId,
    limitPaise: record.limitPaise,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export async function listBudgets(ownerId) {
  requireOwner(ownerId);

  if (db) {
    try {
      const snapshot = await getDocs(collection(db, 'users', ownerId, 'budgets'));
      const budgets = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data && typeof data.categoryId === 'string' && data.monthKey && Number.isSafeInteger(data.limitPaise)) {
          budgets.push({
            id: docSnap.id,
            monthKey: data.monthKey,
            categoryId: data.categoryId,
            limitPaise: data.limitPaise,
            createdAt: data.createdAt?.toDate?.() ? data.createdAt.toDate().toISOString() : data.createdAt ?? null,
            updatedAt: data.updatedAt?.toDate?.() ? data.updatedAt.toDate().toISOString() : data.updatedAt ?? null,
          });
        }
      });
      return budgets;
    } catch (err) {
      throw toBudgetError(err, 'Could not load budgets.');
    }
  }

  return inMemoryBudgets.filter((record) => record.ownerId === ownerId).map(toPublicRecord);
}

export async function createBudget(ownerId, { monthKey, categoryId, limitPaise }) {
  requireOwner(ownerId);

  if (!MONTH_KEY_PATTERN.test(String(monthKey ?? ''))) {
    throw new BudgetServiceError('invalid-month', 'Choose a valid month.');
  }
  if (typeof categoryId !== 'string' || categoryId.length === 0) {
    throw new BudgetServiceError('invalid-category', 'Choose a category.');
  }
  requireValidLimit(limitPaise);

  const id = getBudgetId(monthKey, categoryId);

  if (db) {
    const budgetDocRef = doc(db, 'users', ownerId, 'budgets', id);
    try {
      const existing = await getDoc(budgetDocRef);
      if (existing.exists()) {
        throw new BudgetServiceError(
          'duplicate',
          'This category already has a budget for this month.'
        );
      }
      await setDoc(budgetDocRef, {
        monthKey,
        categoryId,
        limitPaise,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const now = new Date().toISOString();
      return {
        id,
        monthKey,
        categoryId,
        limitPaise,
        createdAt: now,
        updatedAt: now,
      };
    } catch (err) {
      throw toBudgetError(err, 'Could not create the budget.');
    }
  }

  if (findOwnedInMemory(ownerId, id)) {
    throw new BudgetServiceError('duplicate', 'This category already has a budget for this month.');
  }
  const now = new Date().toISOString();
  const record = { id, ownerId, monthKey, categoryId, limitPaise, createdAt: now, updatedAt: now };
  inMemoryBudgets = [...inMemoryBudgets, record];
  return toPublicRecord(record);
}

export async function updateBudget(ownerId, budgetId, { limitPaise }) {
  requireOwner(ownerId);
  requireValidLimit(limitPaise);

  if (db) {
    const budgetDocRef = doc(db, 'users', ownerId, 'budgets', budgetId);
    try {
      const existing = await getDoc(budgetDocRef);
      if (!existing.exists()) {
        throw new BudgetServiceError('not-found', 'That budget could not be found.');
      }

      await updateDoc(budgetDocRef, {
        limitPaise,
        updatedAt: serverTimestamp(),
      });

      const data = existing.data();
      return {
        id: budgetId,
        monthKey: data.monthKey,
        categoryId: data.categoryId,
        limitPaise,
        createdAt: data.createdAt?.toDate?.() ? data.createdAt.toDate().toISOString() : data.createdAt ?? null,
        updatedAt: new Date().toISOString(),
      };
    } catch (err) {
      throw toBudgetError(err, 'Could not update the budget.');
    }
  }

  const existing = findOwnedInMemory(ownerId, budgetId);
  if (!existing) {
    throw new BudgetServiceError('not-found', 'That budget could not be found.');
  }

  const updated = { ...existing, limitPaise, updatedAt: new Date().toISOString() };
  inMemoryBudgets = inMemoryBudgets.map((record) => (record === existing ? updated : record));
  return toPublicRecord(updated);
}

export async function deleteBudget(ownerId, budgetId) {
  requireOwner(ownerId);

  if (db) {
    const budgetDocRef = doc(db, 'users', ownerId, 'budgets', budgetId);
    try {
      const existing = await getDoc(budgetDocRef);
      if (!existing.exists()) {
        throw new BudgetServiceError('not-found', 'That budget could not be found.');
      }
      await deleteDoc(budgetDocRef);
      return;
    } catch (err) {
      throw toBudgetError(err, 'Could not delete the budget.');
    }
  }

  const existing = findOwnedInMemory(ownerId, budgetId);
  if (!existing) {
    throw new BudgetServiceError('not-found', 'That budget could not be found.');
  }

  inMemoryBudgets = inMemoryBudgets.filter((record) => record !== existing);
}
