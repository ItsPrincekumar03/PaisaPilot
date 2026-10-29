import { DEMO_CATEGORIES, DEMO_TRANSACTIONS } from '../data/demoData.js';
import { sortByDateDesc } from '../utils/financeCalculations.js';

/**
 * Transaction data interface for Module 7.
 *
 * CURRENTLY MOCK DATA. Replace the body with real Firestore reads agreed with Nitin.
 * Keep the return shape:
 *   { transactions: [{ id, type, categoryId, date, description, amountPaise }],
 *     categories:   [{ id, name, type, color }] }
 *
 * @param {Object} [options]
 * @param {'demo' | 'empty' | 'error'} [options.mode='demo']
 * @returns {Promise<{ transactions: Array, categories: Array }>}
 */
export async function fetchTransactions({ mode = 'demo' } = {}) {
  // Simulated latency so the loading state can be seen during development.
  await new Promise((resolve) => setTimeout(resolve, 200));

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
