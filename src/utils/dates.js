const MONTH_FORMATTER = new Intl.DateTimeFormat('en-IN', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

const DAY_FORMATTER = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/**
 * Formats a Date using its local calendar fields to a YYYY-MM month key.
 * Avoids UTC shifting near midnight.
 */
export function toMonthKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/** Returns the current local calendar month as YYYY-MM. */
export function getCurrentMonthKey() {
  return toMonthKey(new Date());
}

/** Safely adds or subtracts months from a YYYY-MM key or Date. */
export function offsetMonthKey(monthKey, deltaMonths = 0) {
  const [year, month] = monthKey.split('-').map(Number);
  const targetDate = new Date(year, month - 1 + deltaMonths, 1);
  return toMonthKey(targetDate);
}

/**
 * Returns a chronologically ordered array of month keys spanning:
 * `pastCount` months before `centerMonthKey`, `centerMonthKey`, and `futureCount` months after.
 * Oldest to newest.
 */
export function getMonthKeyRange(centerMonthKey = getCurrentMonthKey(), { pastCount = 5, futureCount = 1 } = {}) {
  const keys = [];
  for (let offset = -pastCount; offset <= futureCount; offset += 1) {
    keys.push(offsetMonthKey(centerMonthKey, offset));
  }
  return keys;
}

/** "2026-10" -> "Oct 2026" */
export function formatMonthLabel(monthKey) {
  const [year, month] = monthKey.split('-').map(Number);
  return MONTH_FORMATTER.format(new Date(Date.UTC(year, month - 1, 1)));
}

/** "2026-10-15" -> "15 Oct 2026" (UTC, so the date never shifts by timezone) */
export function formatDisplayDate(isoDate) {
  return DAY_FORMATTER.format(new Date(`${isoDate}T00:00:00Z`));
}

/** Returns `count` month keys ending at `endMonthKey`, oldest first. */
export function getRecentMonthKeys(endMonthKey, count) {
  const [year, month] = endMonthKey.split('-').map(Number);
  return Array.from({ length: count }, (_, index) => {
    const offset = count - 1 - index;
    const date = new Date(Date.UTC(year, month - 1 - offset, 1));
    const monthNumber = String(date.getUTCMonth() + 1).padStart(2, '0');
    return `${date.getUTCFullYear()}-${monthNumber}`;
  });
}

export function getGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) {
    return 'Good morning';
  }
  if (hour < 17) {
    return 'Good afternoon';
  }
  return 'Good evening';
}
