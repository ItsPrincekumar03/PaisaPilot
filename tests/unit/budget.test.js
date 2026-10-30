import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildBudgetInsights,
  buildCategoryBudgetRows,
  buildMonthlyHistory,
  getUsagePercent,
  getUsageStatus,
  summarizeBudgetRows,
} from '../../src/utils/budgetCalculations.js';
import { formatPaiseAsInput, validateBudgetInput, validateLimitInput } from '../../src/utils/budgetValidation.js';
import { createBudget, deleteBudget, listBudgets, updateBudget } from '../../src/services/budgetService.js';

const CATEGORIES = [
  { id: 'food', name: 'Food', type: 'expense', color: '#F16D65' },
  { id: 'transport', name: 'Transport', type: 'expense', color: '#F3B544' },
  { id: 'salary', name: 'Salary', type: 'income', color: '#36A66B' },
];

const TRANSACTIONS = [
  { id: 't1', type: 'expense', categoryId: 'food', date: '2026-10-08', description: 'Groceries', amountPaise: 90000 },
  { id: 't2', type: 'income', categoryId: 'food', date: '2026-10-02', description: 'Refund', amountPaise: 999999 },
  { id: 't3', type: 'expense', categoryId: 'food', date: '2026-09-30', description: 'Old', amountPaise: 500000 },
  { id: 't4', type: 'expense', categoryId: 'transport', date: '2026-10-10', description: 'Metro', amountPaise: 15000 },
];

const BUDGETS = [
  { id: '2026-10_food', monthKey: '2026-10', categoryId: 'food', limitPaise: 100000 },
  { id: '2026-10_transport', monthKey: '2026-10', categoryId: 'transport', limitPaise: 50000 },
  { id: '2026-10_gone', monthKey: '2026-10', categoryId: 'gone', limitPaise: 20000 },
];

test('usage status boundaries use integer thresholds', () => {
  assert.equal(getUsageStatus(100000, 79999), 'normal');
  assert.equal(getUsageStatus(100000, 80000), 'warning');
  assert.equal(getUsageStatus(100000, 99999), 'warning');
  assert.equal(getUsageStatus(100000, 100000), 'exceeded');
  assert.equal(getUsageStatus(100000, 150000), 'exceeded');
});

test('usage percent is never negative and never divides by zero', () => {
  assert.equal(getUsagePercent(0, 500), 0);
  assert.equal(getUsagePercent(-10, 500), 0);
  assert.equal(getUsagePercent(100000, -5), 0);
  assert.equal(getUsagePercent(100000, 65000), 65);
  assert.equal(getUsagePercent(100000, 99999), 99);
});

test('large paise values stay exact', () => {
  assert.equal(getUsageStatus(1000000000, 800000000), 'warning');
  assert.equal(getUsagePercent(1000000000, 900000000), 90);
});

test('rows count only expense spending in the selected month', () => {
  const rows = buildCategoryBudgetRows({
    budgets: BUDGETS,
    transactions: TRANSACTIONS,
    categories: CATEGORIES,
    monthKey: '2026-10',
  });
  const food = rows.find((row) => row.categoryId === 'food');
  assert.equal(food.spentPaise, 90000);
  assert.equal(food.remainingPaise, 10000);
  assert.equal(food.status, 'warning');

  const gone = rows.find((row) => row.categoryId === 'gone');
  assert.equal(gone.categoryAvailable, false);
  assert.equal(gone.spentPaise, 0);
  assert.equal(gone.status, 'normal');
});

test('empty budget and transaction data produce zero totals', () => {
  const rows = buildCategoryBudgetRows({ budgets: [], transactions: [], categories: CATEGORIES, monthKey: '2026-10' });
  assert.deepEqual(rows, []);
  const summary = summarizeBudgetRows(rows);
  assert.equal(summary.categoryCount, 0);
  assert.equal(summary.utilizationPercent, 0);
});

test('summary and insights reflect real totals', () => {
  const rows = buildCategoryBudgetRows({
    budgets: BUDGETS,
    transactions: TRANSACTIONS,
    categories: CATEGORIES,
    monthKey: '2026-10',
  });
  const summary = summarizeBudgetRows(rows);
  assert.equal(summary.totalBudgetPaise, 170000);
  assert.equal(summary.totalSpentPaise, 105000);
  assert.equal(summary.remainingPaise, 65000);
  assert.equal(summary.overCount, 0);
  assert.equal(summary.warningCount, 1);

  const insights = buildBudgetInsights({ rows, summary, monthLabel: 'Oct 2026' });
  const texts = insights.map((insight) => insight.text);
  assert.ok(texts.some((text) => text.includes('Food is approaching its budget limit')));
  assert.ok(texts.includes('Transport is currently your lowest-spending budget category.'));
});

test('history shows months without budgets as empty, not invented', () => {
  const history = buildMonthlyHistory({
    budgets: BUDGETS,
    transactions: TRANSACTIONS,
    categories: CATEGORIES,
    monthKeys: ['2026-10', '2026-09'],
  });
  assert.equal(history[0].summary.categoryCount, 3);
  assert.equal(history[1].summary.categoryCount, 0);
});

test('limit input converts rupees to integer paise safely', () => {
  assert.equal(validateLimitInput('12.5').limitPaise, 1250);
  assert.equal(validateLimitInput('8000').limitPaise, 800000);
  assert.equal(validateLimitInput('0.01').limitPaise, 1);
  assert.equal(validateLimitInput('10000000').limitPaise, 1000000000);
});

test('invalid limit inputs are rejected', () => {
  for (const input of ['', '   ', '0', '0.00', '-5', '12.345', '1,000', 'abc', '10000001']) {
    const { errors, limitPaise } = validateLimitInput(input);
    assert.ok(errors.limitInput, `expected an error for "${input}"`);
    assert.equal(limitPaise, null);
  }
});

test('formatPaiseAsInput keeps two decimals', () => {
  assert.equal(formatPaiseAsInput(1250), '12.50');
  assert.equal(formatPaiseAsInput(5), '0.05');
});

test('budget validation rejects income, unknown, duplicate, and bad month', () => {
  const options = { categories: CATEGORIES, existingBudgets: [BUDGETS[0]] };

  assert.ok(validateBudgetInput({ monthKey: '2026-10', categoryId: 'salary', limitInput: '500' }, options).errors.categoryId);
  assert.ok(validateBudgetInput({ monthKey: '2026-10', categoryId: 'nope', limitInput: '500' }, options).errors.categoryId);
  assert.ok(validateBudgetInput({ monthKey: '2026-10', categoryId: 'food', limitInput: '500' }, options).errors.categoryId);
  assert.ok(validateBudgetInput({ monthKey: '2026-13', categoryId: 'transport', limitInput: '500' }, options).errors.monthKey);

  const valid = validateBudgetInput({ monthKey: '2026-10', categoryId: 'transport', limitInput: '500' }, options);
  assert.deepEqual(valid.errors, {});
  assert.equal(valid.limitPaise, 50000);
});

test('budget service enforces owner isolation and duplicate protection', async () => {
  const created = await createBudget('owner-a', { monthKey: '2026-10', categoryId: 'food', limitPaise: 100000 });

  await assert.rejects(
    createBudget('owner-a', { monthKey: '2026-10', categoryId: 'food', limitPaise: 5000 }),
    { code: 'duplicate' }
  );
  await assert.rejects(updateBudget('owner-b', created.id, { limitPaise: 1 }), { code: 'not-found' });
  await assert.rejects(deleteBudget('owner-b', created.id), { code: 'not-found' });
  assert.equal((await listBudgets('owner-b')).length, 0);
  assert.equal((await listBudgets('owner-a')).length, 1);

  await updateBudget('owner-a', created.id, { limitPaise: 120000 });
  assert.equal((await listBudgets('owner-a'))[0].limitPaise, 120000);

  await deleteBudget('owner-a', created.id);
  assert.equal((await listBudgets('owner-a')).length, 0);
});

test('budget service rejects invalid month, limit, and missing owner', async () => {
  await assert.rejects(
    createBudget('owner-c', { monthKey: '2026-1', categoryId: 'food', limitPaise: 100 }),
    { code: 'invalid-month' }
  );
  await assert.rejects(
    createBudget('owner-c', { monthKey: '2026-10', categoryId: 'food', limitPaise: 0 }),
    { code: 'invalid-limit' }
  );
  await assert.rejects(
    createBudget('', { monthKey: '2026-10', categoryId: 'food', limitPaise: 100 }),
    { code: 'unauthenticated' }
  );
});
