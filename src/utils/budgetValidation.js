import { formatINR } from './currency.js';
import { parseAmountInput } from './transactionFilters.js';
import { BUDGET_LIMIT_MAX_PAISE, MONTH_KEY_PATTERN } from './budgetConstants.js';

export function validateLimitInput(limitInput) {
  const errors = {};
  let limitPaise = null;
  const text = String(limitInput ?? '').trim();

  if (text.startsWith('-')) {
    errors.limitInput = 'Negative amounts are not allowed.';
  } else {
    const parsed = parseAmountInput(text);
    if (!parsed.valid) {
      errors.limitInput = 'Enter a number without commas, such as 8000 or 8000.50.';
    } else if (parsed.paise === null) {
      errors.limitInput = 'Enter a monthly limit.';
    } else if (parsed.paise === 0) {
      errors.limitInput = 'The limit must be greater than zero.';
    } else if (parsed.paise > BUDGET_LIMIT_MAX_PAISE) {
      errors.limitInput = `The limit cannot be more than ${formatINR(BUDGET_LIMIT_MAX_PAISE)}.`;
    } else {
      limitPaise = parsed.paise;
    }
  }

  return { errors, limitPaise };
}

export function validateBudgetInput(
  { monthKey, categoryId, limitInput },
  { categories = [], existingBudgets = [] }
) {
  const errors = {};

  if (!MONTH_KEY_PATTERN.test(String(monthKey ?? ''))) {
    errors.monthKey = 'Choose a valid month.';
  }

  if (!categoryId) {
    errors.categoryId = 'Choose an expense category.';
  } else {
    const category = categories.find((item) => item.id === categoryId);
    if (!category) {
      errors.categoryId = 'This category is no longer available.';
    } else if (category.type !== 'expense') {
      errors.categoryId = 'Only expense categories can have a budget.';
    } else if (existingBudgets.some((budget) => budget.monthKey === monthKey && budget.categoryId === categoryId)) {
      errors.categoryId = 'This category already has a budget for this month.';
    }
  }

  const limit = validateLimitInput(limitInput);

  return {
    errors: { ...errors, ...limit.errors },
    limitPaise: limit.limitPaise,
  };
}

export function formatPaiseAsInput(paise) {
  const whole = Math.floor(paise / 100);
  const fraction = String(paise % 100).padStart(2, '0');
  return `${whole}.${fraction}`;
}
