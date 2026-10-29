import { formatINR } from './currency.js';

export const TYPE_OPTIONS = [
  { value: 'all', label: 'All types' },
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
];

export const EMPTY_FILTERS = {
  type: 'all',
  categoryId: 'all',
  startDate: '',
  endDate: '',
  search: '',
  minAmount: '',
  maxAmount: '',
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;

/** True only for real calendar dates in YYYY-MM-DD form. */
export function isValidIsoDate(value) {
  if (!DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/**
 * Converts a rupee text input ("1234.5") to integer paise (123450).
 * Returns { valid, paise }. Empty input is valid with paise = null (no bound).
 * Uses string parsing, not floating-point multiplication, to avoid rounding errors.
 */
export function parseAmountInput(value) {
  const trimmed = String(value ?? '').trim();
  if (trimmed === '') return { valid: true, paise: null };
  if (!AMOUNT_PATTERN.test(trimmed)) return { valid: false, paise: null };

  const [whole, fraction = ''] = trimmed.split('.');
  const paise = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(paise)) return { valid: false, paise: null };

  return { valid: true, paise };
}

/** Returns an object of field-level error messages. Empty object means valid. */
export function validateFilters(filters) {
  const errors = {};

  if (filters.startDate && !isValidIsoDate(filters.startDate)) {
    errors.startDate = 'Enter a valid start date.';
  }
  if (filters.endDate && !isValidIsoDate(filters.endDate)) {
    errors.endDate = 'Enter a valid end date.';
  }
  if (
    !errors.startDate &&
    !errors.endDate &&
    filters.startDate &&
    filters.endDate &&
    filters.startDate > filters.endDate
  ) {
    errors.dateRange = 'Start date must be on or before end date.';
  }

  const min = parseAmountInput(filters.minAmount);
  const max = parseAmountInput(filters.maxAmount);

  if (!min.valid) errors.minAmount = 'Enter an amount such as 500 or 500.50.';
  if (!max.valid) errors.maxAmount = 'Enter an amount such as 5000 or 5000.75.';

  if (min.valid && max.valid && min.paise !== null && max.paise !== null && min.paise > max.paise) {
    errors.amountRange = 'Minimum amount must be less than or equal to maximum amount.';
  }

  return errors;
}

/**
 * Applies all active filters together (AND logic).
 * If filter values are invalid, returns [] so bad input never shows as results.
 * Malformed transaction rows (missing date or non-numeric amount) are excluded.
 */
export function applyTransactionFilters(transactions, filters) {
  if (Object.keys(validateFilters(filters)).length > 0) return [];

  const min = parseAmountInput(filters.minAmount).paise;
  const max = parseAmountInput(filters.maxAmount).paise;
  const query = filters.search.trim().toLowerCase();

  return transactions.filter((transaction) => {
    if (!Number.isFinite(transaction.amountPaise)) return false;
    if (typeof transaction.date !== 'string' || !isValidIsoDate(transaction.date)) return false;

    if (filters.type !== 'all' && transaction.type !== filters.type) return false;
    if (filters.categoryId !== 'all' && transaction.categoryId !== filters.categoryId) return false;

    // Inclusive boundaries. YYYY-MM-DD strings compare correctly as text.
    if (filters.startDate && transaction.date < filters.startDate) return false;
    if (filters.endDate && transaction.date > filters.endDate) return false;

    if (query && !String(transaction.description ?? '').toLowerCase().includes(query)) return false;

    if (min !== null && transaction.amountPaise < min) return false;
    if (max !== null && transaction.amountPaise > max) return false;

    return true;
  });
}

/** Builds the removable chips shown above the results. */
export function getActiveFilterChips(filters, categories = []) {
  const chips = [];

  if (filters.type !== 'all') {
    chips.push({ key: 'type', label: filters.type === 'income' ? 'Income only' : 'Expenses only' });
  }
  if (filters.categoryId !== 'all') {
    const category = categories.find((item) => item.id === filters.categoryId);
    chips.push({ key: 'categoryId', label: `Category: ${category?.name ?? 'Unknown'}` });
  }
  if (filters.startDate) {
    chips.push({ key: 'startDate', label: `From ${filters.startDate}` });
  }
  if (filters.endDate) {
    chips.push({ key: 'endDate', label: `To ${filters.endDate}` });
  }
  if (filters.search.trim()) {
    chips.push({ key: 'search', label: `Search: "${filters.search.trim()}"` });
  }

  const min = parseAmountInput(filters.minAmount);
  if (min.valid && min.paise !== null) {
    chips.push({ key: 'minAmount', label: `Min ${formatINR(min.paise)}` });
  }
  const max = parseAmountInput(filters.maxAmount);
  if (max.valid && max.paise !== null) {
    chips.push({ key: 'maxAmount', label: `Max ${formatINR(max.paise)}` });
  }

  return chips;
}
