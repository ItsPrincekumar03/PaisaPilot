import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_AMOUNT_PAISE,
  isWellFormedTransaction,
  paiseToRupeeInput,
  todayIsoDate,
  validateTransactionInput,
  validateTransactionValues,
} from '../../src/features/transactions/transactionValidation.js';

const CATEGORIES = [
  { id: 'salary', name: 'Salary', type: 'income' },
  { id: 'food', name: 'Food', type: 'expense' },
];

const PAST_DATE = '2026-01-15';

function validExpense(overrides = {}) {
  return {
    type: 'expense',
    amount: '499.50',
    description: 'Weekly groceries',
    categoryId: 'food',
    date: PAST_DATE,
    ...overrides,
  };
}

function tomorrowIso() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return todayIsoDate(tomorrow);
}

describe('todayIsoDate and paiseToRupeeInput', () => {
  it('formats a local date as YYYY-MM-DD', () => {
    assert.equal(todayIsoDate(new Date(2026, 9, 5)), '2026-10-05');
  });

  it('converts paise to rupee text', () => {
    assert.equal(paiseToRupeeInput(85000), '850');
    assert.equal(paiseToRupeeInput(4950), '49.50');
    assert.equal(paiseToRupeeInput(5), '0.05');
  });
});

describe('validateTransactionInput: valid input', () => {
  it('accepts a valid expense and converts rupees to integer paise', () => {
    const { values, errors } = validateTransactionInput(validExpense(), CATEGORIES);
    assert.deepEqual(errors, {});
    assert.deepEqual(values, {
      type: 'expense',
      amountPaise: 49950,
      categoryId: 'food',
      date: PAST_DATE,
      description: 'Weekly groceries',
    });
  });

  it('accepts a valid income', () => {
    const { values, errors } = validateTransactionInput(
      validExpense({ type: 'income', amount: '1200', categoryId: 'salary' }),
      CATEGORIES
    );
    assert.deepEqual(errors, {});
    assert.equal(values.amountPaise, 120000);
  });

  it('trims the description', () => {
    const { values } = validateTransactionInput(validExpense({ description: '  Rent  ' }), CATEGORIES);
    assert.equal(values.description, 'Rent');
  });

  it('accepts the exact maximum amount', () => {
    const { values, errors } = validateTransactionInput(
      validExpense({ amount: '10000000' }),
      CATEGORIES
    );
    assert.deepEqual(errors, {});
    assert.equal(values.amountPaise, MAX_AMOUNT_PAISE);
  });
});

describe('validateTransactionInput: amounts', () => {
  it('rejects a missing amount', () => {
    const { values, errors } = validateTransactionInput(validExpense({ amount: '' }), CATEGORIES);
    assert.equal(values, null);
    assert.ok(errors.amount);
  });

  it('rejects zero', () => {
    assert.ok(validateTransactionInput(validExpense({ amount: '0' }), CATEGORIES).errors.amount);
  });

  it('rejects negative amounts', () => {
    assert.ok(validateTransactionInput(validExpense({ amount: '-5' }), CATEGORIES).errors.amount);
  });

  it('rejects malformed numbers', () => {
    for (const amount of ['1,000', 'abc', '1.234', '12.']) {
      assert.ok(
        validateTransactionInput(validExpense({ amount }), CATEGORIES).errors.amount,
        `${amount} should be rejected`
      );
    }
  });

  it('rejects an amount above the maximum', () => {
    assert.ok(
      validateTransactionInput(validExpense({ amount: '10000000.01' }), CATEGORIES).errors.amount
    );
  });
});

describe('validateTransactionInput: other fields', () => {
  it('rejects a missing description', () => {
    assert.ok(
      validateTransactionInput(validExpense({ description: '   ' }), CATEGORIES).errors.description
    );
  });

  it('rejects a description longer than 200 characters', () => {
    assert.ok(
      validateTransactionInput(validExpense({ description: 'a'.repeat(201) }), CATEGORIES).errors
        .description
    );
  });

  it('rejects a missing category', () => {
    assert.ok(
      validateTransactionInput(validExpense({ categoryId: '' }), CATEGORIES).errors.categoryId
    );
  });

  it('rejects a category that does not match the type', () => {
    assert.ok(
      validateTransactionInput(validExpense({ categoryId: 'salary' }), CATEGORIES).errors.categoryId
    );
  });

  it('rejects an unknown transaction type', () => {
    assert.ok(validateTransactionInput(validExpense({ type: 'transfer' }), CATEGORIES).errors.type);
  });

  it('rejects a missing date', () => {
    assert.ok(validateTransactionInput(validExpense({ date: '' }), CATEGORIES).errors.date);
  });

  it('rejects an impossible calendar date', () => {
    assert.ok(
      validateTransactionInput(validExpense({ date: '2026-02-30' }), CATEGORIES).errors.date
    );
  });

  it('rejects a future date', () => {
    assert.ok(
      validateTransactionInput(validExpense({ date: tomorrowIso() }), CATEGORIES).errors.date
    );
  });

  it('accepts today', () => {
    const { errors } = validateTransactionInput(
      validExpense({ date: todayIsoDate() }),
      CATEGORIES
    );
    assert.equal(errors.date, undefined);
  });
});

describe('validateTransactionValues', () => {
  const valid = {
    type: 'expense',
    amountPaise: 49950,
    categoryId: 'food',
    date: PAST_DATE,
    description: 'Weekly groceries',
  };

  it('accepts valid stored values', () => {
    assert.equal(validateTransactionValues(valid), null);
  });

  it('rejects zero and over-limit amounts', () => {
    assert.ok(validateTransactionValues({ ...valid, amountPaise: 0 }));
    assert.ok(validateTransactionValues({ ...valid, amountPaise: MAX_AMOUNT_PAISE + 1 }));
  });

  it('rejects non-integer amounts', () => {
    assert.ok(validateTransactionValues({ ...valid, amountPaise: 499.5 }));
  });

  it('rejects an invalid date and an unknown type', () => {
    assert.ok(validateTransactionValues({ ...valid, date: '2026-13-01' }));
    assert.ok(validateTransactionValues({ ...valid, type: 'transfer' }));
  });

  it('rejects a missing description', () => {
    assert.ok(validateTransactionValues({ ...valid, description: '' }));
  });

  it('rejects non-object input', () => {
    assert.ok(validateTransactionValues(null));
  });
});

describe('isWellFormedTransaction', () => {
  it('accepts a complete stored document', () => {
    assert.equal(
      isWellFormedTransaction({
        type: 'income',
        amountPaise: 100,
        categoryId: 'salary',
        date: PAST_DATE,
        description: 'Pay',
      }),
      true
    );
  });

  it('rejects documents with missing or wrong-typed fields', () => {
    assert.equal(isWellFormedTransaction({ type: 'income', amountPaise: '100' }), false);
    assert.equal(isWellFormedTransaction(null), false);
    assert.equal(
      isWellFormedTransaction({
        type: 'income',
        amountPaise: 100,
        categoryId: 'salary',
        date: 'bad',
        description: 'Pay',
      }),
      false
    );
  });
});