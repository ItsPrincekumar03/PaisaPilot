/*
 * Recurring schedule settings. Change limits here only.
 */

export const FREQUENCIES = ['daily', 'weekly', 'monthly', 'yearly'];

export const SCHEDULE_STATUS = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  CANCELLED: 'cancelled',
};

export const TRANSACTION_TYPES = ['income', 'expense'];

export const DESCRIPTION_MAX_LENGTH = 200;
export const MAX_AMOUNT_PAISE = 1000000000;

/** Most occurrences one run may create for a schedule. Protects against huge catch-up runs. */
export const MAX_CATCH_UP_PER_RUN = 366;
