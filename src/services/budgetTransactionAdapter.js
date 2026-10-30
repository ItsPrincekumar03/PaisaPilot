import { fetchTransactions } from './transactionService.js';
import { isValidIsoDate } from '../utils/transactionFilters.js';

export const TRANSACTION_SOURCE_IS_SAMPLE = true;

function isUsableTransaction(transaction) {
  return (
    transaction !== null &&
    typeof transaction === 'object' &&
    typeof transaction.id === 'string' &&
    (transaction.type === 'income' || transaction.type === 'expense') &&
    typeof transaction.categoryId === 'string' &&
    isValidIsoDate(transaction.date) &&
    Number.isSafeInteger(transaction.amountPaise) &&
    transaction.amountPaise >= 0
  );
}

export async function loadBudgetSourceData({ mode = 'demo' } = {}) {
  const result = await fetchTransactions({ mode });
  const transactions = Array.isArray(result.transactions) ? result.transactions : [];
  const categories = Array.isArray(result.categories) ? result.categories : [];

  return {
    transactions: transactions.filter(isUsableTransaction),
    categories,
    isSampleData: TRANSACTION_SOURCE_IS_SAMPLE,
  };
}
