/**
 * Module 8 budget settings. Change thresholds and limits here only.
 */

/** Spending at or above this percentage of a limit shows the warning state. */
export const WARNING_THRESHOLD_PERCENT = 80;

/** Largest accepted monthly limit: 1 crore rupees, in paise. */
export const BUDGET_LIMIT_MAX_PAISE = 1000000000;

export const BUDGET_STATUS = {
  NORMAL: 'normal',
  WARNING: 'warning',
  EXCEEDED: 'exceeded',
};

/** YYYY-MM with a valid month number. */
export const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Placeholder owner until Firebase Auth provides the signed-in user's uid.
 * Replace with the authenticated uid. Never trust an owner value typed by the user.
 */
export const PREVIEW_OWNER_ID = 'preview-owner';

/** Number of months shown in the month selector and budget history. */
export const BUDGET_HISTORY_MONTH_COUNT = 6;
