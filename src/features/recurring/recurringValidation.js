import { isValidIsoDate, parseAmountInput } from '../../utils/transactionFilters.js';
import {
  DESCRIPTION_MAX_LENGTH,
  FREQUENCIES,
  MAX_AMOUNT_PAISE,
  TRANSACTION_TYPES,
} from './recurringConstants.js';

/**
 * Validates a recurring schedule form.
 * categories is optional. When given, the category must exist and match the type.
 * Returns { errors, values }. values is null when there are errors.
 */
export function validateSchedule(input, categories = []) {
  const errors = {};
  const type = input?.type;

  if (!TRANSACTION_TYPES.includes(type)) {
    errors.type = 'Choose income or expense.';
  }

  const amount = parseAmountInput(input?.amount);
  let amountPaise = null;
  if (!amount.valid) {
    errors.amount = 'Enter an amount such as 500 or 500.50.';
  } else if (amount.paise === null) {
    errors.amount = 'Enter an amount.';
  } else if (amount.paise <= 0) {
    errors.amount = 'Amount must be greater than zero.';
  } else if (amount.paise > MAX_AMOUNT_PAISE) {
    errors.amount = 'Amount is too large.';
  } else {
    amountPaise = amount.paise;
  }

  const categoryId = typeof input?.categoryId === 'string' ? input.categoryId.trim() : '';
  if (!categoryId) {
    errors.categoryId = 'Choose a category.';
  } else if (categories.length > 0) {
    const category = categories.find((item) => item.id === categoryId);
    if (!category) {
      errors.categoryId = 'This category is no longer available.';
    } else if (type && category.type !== type) {
      errors.categoryId = 'The category does not match the transaction type.';
    }
  }

  const description = typeof input?.description === 'string' ? input.description.trim() : '';
  if (!description || description.length > DESCRIPTION_MAX_LENGTH) {
    errors.description = `Enter a description of 1 to ${DESCRIPTION_MAX_LENGTH} characters.`;
  }

  if (!FREQUENCIES.includes(input?.frequency)) {
    errors.frequency = 'Choose a frequency.';
  }

  if (!isValidIsoDate(input?.startDate)) {
    errors.startDate = 'Enter a valid start date.';
  }

  let endDate = null;
  if (input?.endDate) {
    if (!isValidIsoDate(input.endDate)) {
      errors.endDate = 'Enter a valid end date.';
    } else if (isValidIsoDate(input?.startDate) && input.endDate < input.startDate) {
      errors.endDate = 'The end date must be on or after the start date.';
    } else {
      endDate = input.endDate;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { errors, values: null };
  }

  return {
    errors,
    values: {
      type,
      amountPaise,
      categoryId,
      description,
      frequency: input.frequency,
      startDate: input.startDate,
      endDate,
    },
  };
}
