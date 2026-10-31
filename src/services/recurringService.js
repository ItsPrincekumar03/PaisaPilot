import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase.js';
import { createServiceError, toServiceError } from '../lib/serviceError.js';
import {
  MAX_CATCH_UP_PER_RUN,
  SCHEDULE_STATUS,
} from '../features/recurring/recurringConstants.js';
import {
  getOccurrenceDate,
} from '../features/recurring/recurringDates.js';
import {
  planScheduleRun,
} from '../features/recurring/recurringProcessor.js';
import {
  validateSchedule,
} from '../features/recurring/recurringValidation.js';
import {
  validateTransactionValues,
} from '../features/transactions/transactionValidation.js';

let inMemorySchedules = [];

const READ_MESSAGES = {
  unavailable: 'Cannot reach the server. Check your connection and try again.',
  'deadline-exceeded': 'The request timed out. Please try again.',
  'permission-denied': 'You do not have permission to view recurring schedules.',
  unauthenticated: 'Your session has expired. Sign in again.',
};

const WRITE_MESSAGES = {
  ...READ_MESSAGES,
  'permission-denied': 'You do not have permission to change this recurring schedule.',
  'not-found': 'This recurring schedule no longer exists. Refresh the list and try again.',
};

function requireOwner(ownerId) {
  if (typeof ownerId !== 'string' || ownerId.trim().length === 0) {
    throw createServiceError('auth/unauthenticated', 'You must be signed in to manage recurring schedules.');
  }
}

function recurringCollection(ownerId) {
  return collection(db, 'users', ownerId, 'recurring');
}

function transactionsCollection(ownerId) {
  return collection(db, 'users', ownerId, 'transactions');
}

function toPublicSchedule(id, data) {
  return {
    id,
    type: data.type,
    amountPaise: data.amountPaise,
    categoryId: data.categoryId,
    description: data.description,
    frequency: data.frequency,
    startDate: data.startDate,
    endDate: data.endDate ?? null,
    status: data.status,
    nextIndex: data.nextIndex ?? 0,
    nextDate: data.nextDate ?? null,
    createdAt: data.createdAt?.toDate?.() ? data.createdAt.toDate().toISOString() : data.createdAt ?? null,
    updatedAt: data.updatedAt?.toDate?.() ? data.updatedAt.toDate().toISOString() : data.updatedAt ?? null,
  };
}

/**
 * Lists all recurring schedules for a specific owner.
 */
export async function listRecurringSchedules(ownerId) {
  requireOwner(ownerId);

  if (db) {
    try {
      const q = query(recurringCollection(ownerId), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const schedules = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data && data.type && data.frequency && data.startDate) {
          schedules.push(toPublicSchedule(docSnap.id, data));
        }
      });
      return schedules;
    } catch (err) {
      throw toServiceError(err, READ_MESSAGES, 'Could not load recurring schedules.');
    }
  }

  return inMemorySchedules
    .filter((s) => s.ownerId === ownerId)
    .map((s) => toPublicSchedule(s.id, s));
}

/**
 * Creates a new recurring schedule.
 */
export async function createRecurringSchedule(ownerId, input, categories = []) {
  requireOwner(ownerId);

  const { errors, values } = validateSchedule(input, categories);
  if (errors && Object.keys(errors).length > 0) {
    const firstKey = Object.keys(errors)[0];
    throw createServiceError('validation/recurring', errors[firstKey]);
  }

  const nextIndex = 0;
  const candidate = getOccurrenceDate(values.startDate, values.frequency, nextIndex);
  const nextDate = values.endDate && candidate > values.endDate ? null : candidate;

  const record = {
    ...values,
    status: SCHEDULE_STATUS.ACTIVE,
    nextIndex,
    nextDate,
  };

  if (db) {
    try {
      const docRef = await addDoc(recurringCollection(ownerId), {
        ...record,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      const now = new Date().toISOString();
      return toPublicSchedule(docRef.id, { ...record, createdAt: now, updatedAt: now });
    } catch (err) {
      throw toServiceError(err, WRITE_MESSAGES, 'Could not create recurring schedule.');
    }
  }

  const now = new Date().toISOString();
  const id = `sched_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const memoryRecord = { id, ownerId, ...record, createdAt: now, updatedAt: now };
  inMemorySchedules = [memoryRecord, ...inMemorySchedules];
  return toPublicSchedule(id, memoryRecord);
}

/**
 * Updates an existing recurring schedule.
 */
export async function updateRecurringSchedule(ownerId, scheduleId, input, categories = []) {
  requireOwner(ownerId);

  const { errors, values } = validateSchedule(input, categories);
  if (errors && Object.keys(errors).length > 0) {
    const firstKey = Object.keys(errors)[0];
    throw createServiceError('validation/recurring', errors[firstKey]);
  }

  if (db) {
    const docRef = doc(recurringCollection(ownerId), scheduleId);
    try {
      const existingSnap = await getDoc(docRef);
      if (!existingSnap.exists()) {
        throw createServiceError('recurring/not-found', WRITE_MESSAGES['not-found']);
      }
      const existing = existingSnap.data();

      // If startDate or frequency changed, recompute next occurrence from nextIndex
      let nextIndex = existing.nextIndex ?? 0;
      let nextDate = existing.nextDate;
      if (values.startDate !== existing.startDate || values.frequency !== existing.frequency) {
        const candidate = getOccurrenceDate(values.startDate, values.frequency, nextIndex);
        nextDate = values.endDate && candidate > values.endDate ? null : candidate;
      } else if (values.endDate !== existing.endDate && nextDate) {
        if (values.endDate && nextDate > values.endDate) {
          nextDate = null;
        }
      }

      const updates = {
        ...values,
        nextIndex,
        nextDate,
        updatedAt: serverTimestamp(),
      };

      await updateDoc(docRef, updates);
      return toPublicSchedule(scheduleId, { ...existing, ...updates, updatedAt: new Date().toISOString() });
    } catch (err) {
      throw toServiceError(err, WRITE_MESSAGES, 'Could not update recurring schedule.');
    }
  }

  const existingIndex = inMemorySchedules.findIndex((s) => s.ownerId === ownerId && s.id === scheduleId);
  if (existingIndex === -1) {
    throw createServiceError('recurring/not-found', WRITE_MESSAGES['not-found']);
  }
  const existing = inMemorySchedules[existingIndex];
  const candidate = getOccurrenceDate(values.startDate, values.frequency, existing.nextIndex ?? 0);
  const nextDate = values.endDate && candidate > values.endDate ? null : candidate;

  const updatedRecord = {
    ...existing,
    ...values,
    nextDate,
    updatedAt: new Date().toISOString(),
  };
  inMemorySchedules[existingIndex] = updatedRecord;
  return toPublicSchedule(scheduleId, updatedRecord);
}

/**
 * Changes schedule status (active, paused, cancelled).
 */
export async function setScheduleStatus(ownerId, scheduleId, nextStatus) {
  requireOwner(ownerId);

  if (!Object.values(SCHEDULE_STATUS).includes(nextStatus)) {
    throw createServiceError('validation/status', 'Invalid schedule status.');
  }

  if (db) {
    const docRef = doc(recurringCollection(ownerId), scheduleId);
    try {
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        throw createServiceError('recurring/not-found', WRITE_MESSAGES['not-found']);
      }
      await updateDoc(docRef, {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
      return;
    } catch (err) {
      throw toServiceError(err, WRITE_MESSAGES, 'Could not update status.');
    }
  }

  const existing = inMemorySchedules.find((s) => s.ownerId === ownerId && s.id === scheduleId);
  if (!existing) {
    throw createServiceError('recurring/not-found', WRITE_MESSAGES['not-found']);
  }
  existing.status = nextStatus;
  existing.updatedAt = new Date().toISOString();
}

/**
 * Deletes a recurring schedule.
 */
export async function deleteRecurringSchedule(ownerId, scheduleId) {
  requireOwner(ownerId);

  if (db) {
    const docRef = doc(recurringCollection(ownerId), scheduleId);
    try {
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        throw createServiceError('recurring/not-found', WRITE_MESSAGES['not-found']);
      }
      await deleteDoc(docRef);
      return;
    } catch (err) {
      throw toServiceError(err, WRITE_MESSAGES, 'Could not delete recurring schedule.');
    }
  }

  inMemorySchedules = inMemorySchedules.filter((s) => !(s.ownerId === ownerId && s.id === scheduleId));
}

/**
 * Processes due occurrences for all active schedules up to todayIso,
 * creating corresponding transactions idempotently.
 */
export async function processDueRecurringSchedules(ownerId, todayIso, limit = MAX_CATCH_UP_PER_RUN) {
  requireOwner(ownerId);

  const schedules = await listRecurringSchedules(ownerId);
  const activeSchedules = schedules.filter((s) => s.status === SCHEDULE_STATUS.ACTIVE);
  const createdTransactions = [];

  for (const schedule of activeSchedules) {
    const plan = planScheduleRun(schedule, todayIso, limit);
    if (!plan || plan.items.length === 0) {
      continue;
    }

    if (db) {
      const scheduleRef = doc(recurringCollection(ownerId), schedule.id);

      try {
        await runTransaction(db, async (txn) => {
          const freshSnap = await txn.get(scheduleRef);
          if (!freshSnap.exists() || freshSnap.data().status !== SCHEDULE_STATUS.ACTIVE) {
            return;
          }

          const freshData = freshSnap.data();
          const freshPlan = planScheduleRun({ ...freshData, id: schedule.id }, todayIso, limit);

          for (const item of freshPlan.items) {
            const problem = validateTransactionValues(item.transaction);
            if (problem) continue;

            const txDocRef = doc(transactionsCollection(ownerId), item.occurrenceId);
            const existingTx = await txn.get(txDocRef);
            if (!existingTx.exists()) {
              txn.set(txDocRef, {
                ...item.transaction,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
              createdTransactions.push({ id: item.occurrenceId, ...item.transaction });
            }
          }

          txn.update(scheduleRef, {
            nextIndex: freshPlan.nextIndex,
            nextDate: freshPlan.nextDate,
            updatedAt: serverTimestamp(),
          });
        });
      } catch (err) {
        // Individual schedule failure logged without halting the entire processing loop
        console.error('Error processing recurring schedule:', schedule.id, err);
      }
    } else {
      // In-memory fallback
      for (const item of plan.items) {
        createdTransactions.push({ id: item.occurrenceId, ...item.transaction });
      }
      const existing = inMemorySchedules.find((s) => s.ownerId === ownerId && s.id === schedule.id);
      if (existing) {
        existing.nextIndex = plan.nextIndex;
        existing.nextDate = plan.nextDate;
        existing.updatedAt = new Date().toISOString();
      }
    }
  }

  return createdTransactions;
}

/**
 * Resets in-memory state (useful for unit tests).
 */
export function resetInMemorySchedules(seed = []) {
  inMemorySchedules = [...seed];
}
