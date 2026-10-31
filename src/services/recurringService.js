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
import { isValidIsoDate } from '../utils/transactionFilters.js';
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

/**
 * Fixed date used to satisfy the future-date rule inside validateTransactionValues.
 * planScheduleRun already limits occurrence dates to todayIso, so the device clock is not used.
 */
const OCCURRENCE_CHECK_DATE = '2000-01-01';

function requireOwner(ownerId) {
  if (typeof ownerId !== 'string' || ownerId.trim().length === 0) {
    throw createServiceError('auth/unauthenticated', 'You must be signed in to manage recurring schedules.');
  }
}

function recurringCollection(ownerId) {
  return collection(db, 'users', ownerId, 'recurring');
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
 * Checks one generated occurrence with the same rules as a manual transaction,
 * except the clock-based future-date check (see OCCURRENCE_CHECK_DATE).
 * Returns an error message, or null when the occurrence is valid.
 */
function getOccurrenceProblem(transaction) {
  if (!isValidIsoDate(transaction.date)) {
    return 'Enter a valid date.';
  }
  return validateTransactionValues({ ...transaction, date: OCCURRENCE_CHECK_DATE });
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
 * The Firestore path reads the schedule inside a transaction, so nextIndex is always the
 * current value. This keeps a concurrent processor run from being overwritten.
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
      return await runTransaction(db, async (txn) => {
        const existingSnap = await txn.get(docRef);
        if (!existingSnap.exists()) {
          throw createServiceError('recurring/not-found', WRITE_MESSAGES['not-found']);
        }
        const existing = existingSnap.data();

        const nextIndex = existing.nextIndex ?? 0;
        let nextDate = existing.nextDate ?? null;
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
        txn.update(docRef, updates);

        return toPublicSchedule(scheduleId, {
          ...existing,
          ...updates,
          updatedAt: new Date().toISOString(),
        });
      });
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
 * Processes one schedule's due occurrences in a single Firestore transaction.
 *
 * - Every read happens before any write, as the Firestore SDK requires.
 * - Existing occurrence documents are never overwritten.
 * - If any due occurrence fails validation, the function throws before writing.
 *   The transaction aborts, so no transaction is created and nextIndex does not move.
 * - The transaction is atomic: a failure at any step leaves the data unchanged.
 *
 * Exported so the emulator tests can run this exact code path.
 * Returns the transactions created by this run.
 */
export async function processScheduleOnServer(database, ownerId, schedule, todayIso, limit = MAX_CATCH_UP_PER_RUN) {
  const scheduleRef = doc(collection(database, 'users', ownerId, 'recurring'), schedule.id);
  const transactionsRef = collection(database, 'users', ownerId, 'transactions');

  return runTransaction(database, async (txn) => {
    const freshSnap = await txn.get(scheduleRef);
    if (!freshSnap.exists() || freshSnap.data().status !== SCHEDULE_STATUS.ACTIVE) {
      return [];
    }

    const freshPlan = planScheduleRun({ ...freshSnap.data(), id: schedule.id }, todayIso, limit);

    // Phase 1: validate and read. Nothing is written yet.
    const pending = [];
    for (const item of freshPlan.items) {
      const problem = getOccurrenceProblem(item.transaction);
      if (problem) {
        throw createServiceError(
          'validation/recurring-occurrence',
          `The occurrence on ${item.date} could not be created: ${problem} No transactions were saved for this schedule.`
        );
      }

      const txDocRef = doc(transactionsRef, item.occurrenceId);
      const existingTx = await txn.get(txDocRef);
      if (!existingTx.exists()) {
        pending.push({ item, txDocRef });
      }
    }

    // Phase 2: writes, only after every read has completed.
    for (const { item, txDocRef } of pending) {
      txn.set(txDocRef, {
        ...item.transaction,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    txn.update(scheduleRef, {
      nextIndex: freshPlan.nextIndex,
      nextDate: freshPlan.nextDate,
      updatedAt: serverTimestamp(),
    });

    return pending.map(({ item }) => ({ id: item.occurrenceId, ...item.transaction }));
  });
}

/**
 * Processes due occurrences for all active schedules up to todayIso,
 * creating corresponding transactions idempotently.
 *
 * A schedule that fails is logged and skipped. Its data is unchanged, and the other
 * schedules are still processed.
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
      try {
        const created = await processScheduleOnServer(db, ownerId, schedule, todayIso, limit);
        createdTransactions.push(...created);
      } catch (err) {
        console.error('Error processing recurring schedule:', schedule.id, err);
      }
    } else {
      // In-memory fallback. Every occurrence is validated before anything is saved.
      const problem = plan.items.map((item) => getOccurrenceProblem(item.transaction)).find(Boolean);
      if (problem) {
        console.error('Recurring schedule was not processed:', schedule.id, problem);
        continue;
      }

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
