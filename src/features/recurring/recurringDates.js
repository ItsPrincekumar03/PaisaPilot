import { isValidIsoDate } from '../../utils/transactionFilters.js';
import { FREQUENCIES } from './recurringConstants.js';

/*
 * Date-only arithmetic on YYYY-MM-DD strings.
 * Uses UTC math internally so the result never depends on the user's timezone.
 * Every occurrence is computed from the START date, not from the previous occurrence.
 * This prevents drift: Jan 31 monthly gives Feb 28, then Mar 31, not Mar 28.
 */

function splitIso(iso) {
  const [year, month, day] = iso.split('-').map(Number);
  return { year, month, day };
}

function toIso(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Returns the date of occurrence number `index` (0 = the start date). */
export function getOccurrenceDate(startIso, frequency, index) {
  if (!isValidIsoDate(startIso)) {
    throw new Error('Start date must be a valid YYYY-MM-DD date.');
  }
  if (!Number.isInteger(index) || index < 0) {
    throw new Error('Occurrence index must be a whole number, zero or more.');
  }
  if (!FREQUENCIES.includes(frequency)) {
    throw new Error('Unsupported frequency.');
  }

  const { year, month, day } = splitIso(startIso);

  if (frequency === 'daily' || frequency === 'weekly') {
    const stepDays = frequency === 'daily' ? 1 : 7;
    const shifted = new Date(Date.UTC(year, month - 1, day) + index * stepDays * 86400000);
    return toIso(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate());
  }

  if (frequency === 'monthly') {
    const monthsFromStart = month - 1 + index;
    const targetYear = year + Math.floor(monthsFromStart / 12);
    const targetMonth = (monthsFromStart % 12) + 1;
    // Clamp to the last day of short months (e.g. the 31st becomes the 28th or 30th).
    return toIso(targetYear, targetMonth, Math.min(day, daysInMonth(targetYear, targetMonth)));
  }

  // yearly: Feb 29 becomes Feb 28 in non-leap years.
  const targetYear = year + index;
  return toIso(targetYear, month, Math.min(day, daysInMonth(targetYear, month)));
}

/**
 * Occurrences that are due: on or before todayIso, not after endDate (if set).
 * Starts at fromIndex and returns at most `limit` items.
 */
export function getDueOccurrences({ startDate, endDate = null, frequency, fromIndex, todayIso, limit }) {
  const due = [];
  let index = fromIndex;

  while (due.length < limit) {
    const date = getOccurrenceDate(startDate, frequency, index);
    if (date > todayIso) break;
    if (endDate && date > endDate) break;
    due.push({ index, date });
    index += 1;
  }

  return due;
}
