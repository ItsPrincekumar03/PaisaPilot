export const REPORT_PRESETS = [
  { value: 'this-month', label: 'This month' },
  { value: 'last-month', label: 'Last month' },
  { value: 'last-3-months', label: 'Last 3 months' },
  { value: 'last-6-months', label: 'Last 6 months' },
  { value: 'this-year', label: 'This year' },
  { value: 'custom', label: 'Custom range' },
];

/** Longest range accepted, in months. Keeps chart and table work bounded. */
export const MAX_RANGE_MONTHS = 120;

export const CATEGORY_UNKNOWN_LABEL = 'Uncategorized';
export const UNKNOWN_CATEGORY_COLOR = '#A9A6BF';

/** Rows shown at once in the transaction table. "Show more" reveals the next page. */
export const TRANSACTION_TABLE_PAGE_SIZE = 100;

export const CSV_CURRENCY_CODE = 'INR';
