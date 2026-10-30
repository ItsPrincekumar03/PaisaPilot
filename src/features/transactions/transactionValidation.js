import { formatINR } from '../../utils/currency.js';
import { isValidIsoDate, parseAmountInput } from '../../utils/transactionFilters.js';

export const TRANSACTION_TYPES = ['income', 'expense'];

export const MAX_AMOUNT_PAISE = 1000000000;
export const DESCRIPTION_MAX_LENGTH = 200;
export const CATEGORY_ID_MAX_LENGTH = 64;

const DESCRIPTION_MESSAGE = `Enter a description of up to ${DESCRIPTION_MAX_LENGTH} characters.`;
const FUTURE_DATE_MESSAGE = 'The date cannot be in the future.';

export function todayIsoDate(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function paiseToRupeeInput(paise) {
  const whole = Math.floor(paise / 100);
  const fraction = paise % 100;
  return fraction === 0 ? String(whole) : `${whole}.${String(fraction).padStart(2, '0')}`;
}

export function validateTransactionInput(input, categories = []) {
  const errors = {};
  const type = input?.type;

  if (!TRANSACTION_TYPES.includes(type)) {
    errors.type = 'Choose income or expense.';
  }

  const amount = parseAmountInput(input?.amount);
  if (!amount.valid) {
    errors.amount = 'Enter an amount such as 500 or 500.50.';
  } else if (amount.paise === null) {
    errors.amount = 'Enter an amount.';
  } else if (amount.paise <= 0) {
    errors.amount = 'Amount must be greater than zero.';
  } else if (amount.paise > MAX_AMOUNT_PAISE) {
    errors.amount = `Amount cannot be more than ${formatINR(MAX_AMOUNT_PAISE)}.`;
  }

  const description = typeof input?.description === 'string' ? input.description.trim() : '';
  if (!description) {
    errors.description = 'Enter a description.';
  } else if (description.length > DESCRIPTION_MAX_LENGTH) {
    errors.description = DESCRIPTION_MESSAGE;
  }

  const categoryId = typeof input?.categoryId === 'string' ? input.categoryId : '';
  if (!categoryId) {
    errors.categoryId = 'Choose a category.';
  } else if (!categories.some((category) => category.id === categoryId && category.type === type)) {
    errors.categoryId = 'Choose a category that matches the transaction type.';
  }

  const date = typeof input?.date === 'string' ? input.date : '';
  if (!date) {
    errors.date = 'Enter a date.';
  } else if (!isValidIsoDate(date)) {
    errors.date = 'Enter a valid date.';
  } else if (date > todayIsoDate()) {
    errors.date = FUTURE_DATE_MESSAGE;
  }

  if (Object.keys(errors).length > 0) {
    return { values: null, errors };
  }

  return {
    values: { type, amountPaise: amount.paise, categoryId, date, description },
    errors: {},
  };
}

export function validateTransactionValues(values) {
  if (!values || typeof values !== 'object') {
    return 'Transaction data is invalid.';
  }
  if (!TRANSACTION_TYPES.includes(values.type)) {
    return 'Choose income or expense.';
  }
  if (
    !Number.isSafeInteger(values.amountPaise) ||
    values.amountPaise <= 0 ||
    values.amountPaise > MAX_AMOUNT_PAISE
  ) {
    return 'Enter a positive amount within the allowed limit.';
  }
  if (
    typeof values.categoryId !== 'string' ||
    !values.categoryId ||
    values.categoryId.length > CATEGORY_ID_MAX_LENGTH
  ) {
    return 'Choose a category.';
  }
  if (typeof values.date !== 'string' || !isValidIsoDate(values.date)) {
    return 'Enter a valid date.';
  }
  if (values.date > todayIsoDate()) {
    return FUTURE_DATE_MESSAGE;
  }
  if (
    typeof values.description !== 'string' ||
    !values.description.trim() ||
    values.description.trim().length > DESCRIPTION_MAX_LENGTH
  ) {
    return DESCRIPTION_MESSAGE;
  }
  return null;
}

export function isWellFormedTransaction(data) {
  return (
    Boolean(data) &&
    TRANSACTION_TYPES.includes(data.type) &&
    Number.isSafeInteger(data.amountPaise) &&
    data.amountPaise > 0 &&
    typeof data.categoryId === 'string' &&
    typeof data.description === 'string' &&
    typeof data.date === 'string' &&
    isValidIsoDate(data.date)
  );
}