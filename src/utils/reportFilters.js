import { EMPTY_FILTERS, applyTransactionFilters, isValidIsoDate } from './transactionFilters.js';
import { MAX_RANGE_MONTHS } from './reportsConstants.js';

/**
 * Formats a Date using its local calendar fields.
 * Never use toISOString() for date-only values: it converts to UTC and can shift the day.
 */
export function toIsoDateLocal(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Returns { startDate, endDate } as YYYY-MM-DD for a preset, or null for "custom". */
export function getPresetRange(preset, today = new Date()) {
  const year = today.getFullYear();
  const month = today.getMonth();
  const todayIso = toIsoDateLocal(today);
  const firstOf = (y, m) => toIsoDateLocal(new Date(y, m, 1));
  const lastOf = (y, m) => toIsoDateLocal(new Date(y, m + 1, 0));

  switch (preset) {
    case 'this-month':
      return { startDate: firstOf(year, month), endDate: todayIso };
    case 'last-month':
      return { startDate: firstOf(year, month - 1), endDate: lastOf(year, month - 1) };
    case 'last-3-months':
      return { startDate: firstOf(year, month - 2), endDate: todayIso };
    case 'last-6-months':
      return { startDate: firstOf(year, month - 5), endDate: todayIso };
    case 'this-year':
      return { startDate: firstOf(year, 0), endDate: todayIso };
    default:
      return null;
  }
}

/** Number of calendar months touched by the range, inclusive. Assumes valid dates. */
function countMonthsInRange(startDate, endDate) {
  const [startYear, startMonth] = startDate.split('-').map(Number);
  const [endYear, endMonth] = endDate.split('-').map(Number);
  return (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
}

/** Field-level errors for a date range. Empty object means valid. */
export function validateDateRange({ startDate, endDate }) {
  const errors = {};

  if (!isValidIsoDate(startDate)) errors.startDate = 'Enter a valid start date.';
  if (!isValidIsoDate(endDate)) errors.endDate = 'Enter a valid end date.';

  if (Object.keys(errors).length > 0) return errors;

  if (startDate > endDate) {
    errors.range = 'Start date must be on or before end date.';
  } else if (countMonthsInRange(startDate, endDate) > MAX_RANGE_MONTHS) {
    errors.range = `Choose a range of ${MAX_RANGE_MONTHS / 12} years or less.`;
  }

  return errors;
}

/** "YYYY-MM" keys from the start month to the end month, oldest first, both ends inclusive. */
export function getMonthKeysInRange(startDate, endDate) {
  const keys = [];
  let [year, month] = startDate.slice(0, 7).split('-').map(Number);
  const [endYear, endMonth] = endDate.slice(0, 7).split('-').map(Number);

  while (year < endYear || (year === endYear && month <= endMonth)) {
    keys.push(`${year}-${String(month).padStart(2, '0')}`);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return keys;
}

/**
 * Filters transactions to an inclusive date range.
 * Reuses Module 7's applyTransactionFilters so date boundary behavior matches the transaction list.
 */
export function filterTransactionsByRange(transactions, { startDate, endDate }) {
  return applyTransactionFilters(transactions, { ...EMPTY_FILTERS, startDate, endDate });
}
