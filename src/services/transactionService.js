import { DEMO_CATEGORIES, DEMO_TRANSACTIONS } from '../data/demoData.js';
import { sortByDateDesc } from '../utils/financeCalculations.js';
import {
  createTransaction as saveNewTransaction,
  deleteTransaction as removeTransaction,
  listTransactions,
  updateTransaction as saveTransactionChanges,
} from './transactionRepository.js';

const MOCK_DELAY_MS = 200;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchTransactions({ mode = 'active' } = {}) {
  if (mode === 'active') {
    const transactions = await listTransactions();
    return {
      transactions: sortByDateDesc(transactions),
      categories: DEMO_CATEGORIES,
    };
  }

  await wait(MOCK_DELAY_MS);

  if (mode === 'error') {
    throw new Error('Could not load transactions. Please check your connection and try again.');
  }

  if (mode === 'empty') {
    return { transactions: [], categories: DEMO_CATEGORIES };
  }

  return {
    transactions: sortByDateDesc(DEMO_TRANSACTIONS),
    categories: DEMO_CATEGORIES,
  };
}

const transactionListeners = new Set();

export function onTransactionsChanged(listener) {
  if (typeof listener !== 'function') return () => {};
  transactionListeners.add(listener);
  return () => {
    transactionListeners.delete(listener);
  };
}

function notifyTransactionChange() {
  for (const listener of transactionListeners) {
    try {
      listener();
    } catch {
      // Safe dispatch to avoid crashing callers
    }
  }
}

export async function createTransaction(input) {
  const result = await saveNewTransaction(input);
  notifyTransactionChange();
  return result;
}

export async function updateTransaction(id, input) {
  const result = await saveTransactionChanges(id, input);
  notifyTransactionChange();
  return result;
}

export async function deleteTransaction(id) {
  const result = await removeTransaction(id);
  notifyTransactionChange();
  return result;
}