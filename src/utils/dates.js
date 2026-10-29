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
