import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCategoryBudgetRows,
  getPlannedMonthlyBudgetPaise,
  summarizeBudgetRows,
} from '../../src/utils/budgetCalculations.js';
import { fetchDashboardData, getAvailablePeriods } from '../../src/services/dashboardService.js';
import { onTransactionsChanged } from '../../src/services/transactionService.js';

const CATEGORIES = [
  { id: 'food', name: 'Food & Dining', type: 'expense', color: '#F16D65' },
  { id: 'transport', name: 'Transport', type: 'expense', color: '#F3B544' },
  { id: 'shopping', name: 'Shopping', type: 'expense', color: '#8884d8' },
  { id: 'salary', name: 'Salary', type: 'income', color: '#36A66B' },
];

test('getPlannedMonthlyBudgetPaise sums category budgets in integer paise', () => {
  const budgets = [
    { monthKey: '2026-11', categoryId: 'food', limitPaise: 500000 },
    { monthKey: '2026-11', categoryId: 'transport', limitPaise: 200000 },
    { monthKey: '2026-11', categoryId: 'shopping', limitPaise: 300000 },
    { monthKey: '2026-10', categoryId: 'food', limitPaise: 900000 },
  ];

  const totalNov = getPlannedMonthlyBudgetPaise(budgets, '2026-11');
  assert.equal(totalNov, 1000000); // Exactly 10,000 rupees in paise
});

test('getPlannedMonthlyBudgetPaise supports legacy overall budget when no category budgets exist', () => {
  const budgets = [
    { monthKey: '2026-11', categoryId: null, isOverall: true, limitPaise: 1500000 },
  ];

  const total = getPlannedMonthlyBudgetPaise(budgets, '2026-11');
  assert.equal(total, 1500000);
});

test('getPlannedMonthlyBudgetPaise prefers category budgets and does not double-count if coexisting', () => {
  const budgets = [
    { monthKey: '2026-11', categoryId: 'food', limitPaise: 500000 },
    { monthKey: '2026-11', categoryId: null, isOverall: true, limitPaise: 1500000 },
  ];

  const total = getPlannedMonthlyBudgetPaise(budgets, '2026-11');
  assert.equal(total, 500000);
});

test('getPlannedMonthlyBudgetPaise returns 0 for empty or unknown months', () => {
  assert.equal(getPlannedMonthlyBudgetPaise([], '2026-11'), 0);
  assert.equal(getPlannedMonthlyBudgetPaise(null, '2026-11'), 0);
});

test('dashboardService demo mode preserves payload shape with planned budget', async () => {
  const data = await fetchDashboardData({ monthKey: '2026-10', mode: 'demo' });
  assert.equal(data.isDemo, true);
  assert.equal(typeof data.budget.limitPaise, 'number');
  assert.ok(data.budget.limitPaise > 0);
  assert.ok(data.availablePeriods.length > 0);
});

test('dashboardService empty mode produces clean zero-state', async () => {
  const data = await fetchDashboardData({ monthKey: '2026-11', mode: 'empty' });
  assert.equal(data.isEmpty, true);
  assert.equal(data.budget.limitPaise, 0);
  assert.equal(data.budget.status, 'none');
  assert.equal(data.budget.usagePercent, 0);
});

test('getAvailablePeriods returns chronological periods with labels', () => {
  const periods = getAvailablePeriods('2026-11');
  assert.ok(periods.length >= 6);
  assert.equal(periods[0].key, '2026-12'); // Future month included
  assert.equal(periods[1].key, '2026-11'); // Center month
  assert.equal(periods[1].label, 'Nov 2026');
});

test('buildCategoryBudgetRows ignores income transactions for expense budgets', () => {
  const budgets = [{ id: 'b1', monthKey: '2026-11', categoryId: 'food', limitPaise: 500000 }];
  const transactions = [
    { id: 't1', type: 'income', categoryId: 'food', date: '2026-11-05', amountPaise: 500000 },
    { id: 't2', type: 'expense', categoryId: 'food', date: '2026-11-06', amountPaise: 120000 },
  ];

  const rows = buildCategoryBudgetRows({ budgets, transactions, categories: CATEGORIES, monthKey: '2026-11' });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].spentPaise, 120000);
  assert.equal(rows[0].remainingPaise, 380000);
  assert.equal(rows[0].usagePercent, 24);
  assert.equal(rows[0].status, 'normal');
});

test('buildCategoryBudgetRows accurately marks warning and exceeded states', () => {
  const budgets = [
    { id: 'b1', monthKey: '2026-11', categoryId: 'food', limitPaise: 100000 },
    { id: 'b2', monthKey: '2026-11', categoryId: 'transport', limitPaise: 100000 },
  ];
  const transactions = [
    { id: 't1', type: 'expense', categoryId: 'food', date: '2026-11-05', amountPaise: 85000 }, // 85% -> warning
    { id: 't2', type: 'expense', categoryId: 'transport', date: '2026-11-06', amountPaise: 120000 }, // 120% -> exceeded
  ];

  const rows = buildCategoryBudgetRows({ budgets, transactions, categories: CATEGORIES, monthKey: '2026-11' });
  const foodRow = rows.find((r) => r.categoryId === 'food');
  const transportRow = rows.find((r) => r.categoryId === 'transport');

  assert.equal(foodRow.status, 'warning');
  assert.equal(foodRow.usagePercent, 85);
  assert.equal(transportRow.status, 'exceeded');
  assert.equal(transportRow.remainingPaise, -20000);
  assert.equal(transportRow.usagePercent, 120);

  const summary = summarizeBudgetRows(rows);
  assert.equal(summary.warningCount, 1);
  assert.equal(summary.overCount, 1);
  assert.equal(summary.totalSpentPaise, 205000);
  assert.equal(summary.remainingPaise, -5000);
});

test('onTransactionsChanged subscriber fires when transactions mutate', async () => {
  let changeCount = 0;
  const unsubscribe = onTransactionsChanged(() => {
    changeCount += 1;
  });

  assert.equal(typeof unsubscribe, 'function');
  assert.equal(changeCount, 0);
  unsubscribe();
});
