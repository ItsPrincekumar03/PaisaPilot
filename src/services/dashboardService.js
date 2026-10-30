import {
  DEMO_CATEGORIES,
  DEMO_MONTH_KEY,
  DEMO_MONTHLY_BUDGET_PAISE,
  DEMO_TRANSACTIONS,
} from '../data/demoData.js';
import {
  filterByMonth,
  getBudgetStatus,
  getExpenseByCategory,
  getMonthlyTotals,
  sortByDateDesc,
  sumByType,
} from '../utils/financeCalculations.js';
import { formatMonthLabel, getRecentMonthKeys } from '../utils/dates.js';
import { listTransactions } from './transactionRepository.js';

const MOCK_DELAY_MS = 200;

export const AVAILABLE_MONTH_KEYS = [
  '2026-10',
  '2026-09',
  '2026-08',
  '2026-07',
  '2026-06',
  '2026-05',
];

export function getAvailablePeriods() {
  return AVAILABLE_MONTH_KEYS.map((key) => ({
    key,
    label: formatMonthLabel(key),
  }));
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildEmptyPayload(monthKey) {
  const emptyMonthlyTotals = getRecentMonthKeys(monthKey, 6).map((key) => ({
    monthKey: key,
    incomePaise: 0,
    expensePaise: 0,
  }));

  return {
    monthKey,
    monthLabel: formatMonthLabel(monthKey),
    availablePeriods: getAvailablePeriods(),
    isDemo: false,
    isEmpty: true,
    summary: {
      totalIncomePaise: 0,
      totalExpensesPaise: 0,
      netBalancePaise: 0,
      budgetUsagePercent: null,
      budgetStatus: 'none',
      remainingBudgetPaise: 0,
    },
    monthlyTotals: emptyMonthlyTotals,
    expenseByCategory: [],
    recentTransactions: [],
    categories: DEMO_CATEGORIES,
    budget: {
      limitPaise: 0,
      spentPaise: 0,
      status: 'none',
      usagePercent: 0,
      remainingPaise: 0,
    },
  };
}

function buildPayload({ monthKey, transactions, isDemo, isEmpty, budgetLimitPaise }) {
  const monthTransactions = filterByMonth(transactions, monthKey);
  const totalIncome = sumByType(monthTransactions, 'income');
  const totalExpenses = sumByType(monthTransactions, 'expense');
  const netBalance = totalIncome - totalExpenses;
  const budget = getBudgetStatus(budgetLimitPaise, totalExpenses);

  const monthlyTotals = getMonthlyTotals(transactions, getRecentMonthKeys(monthKey, 6));
  const expenseByCategory = getExpenseByCategory(monthTransactions, DEMO_CATEGORIES);
  const recentTransactions = sortByDateDesc(transactions).slice(0, 6);

  return {
    monthKey,
    monthLabel: formatMonthLabel(monthKey),
    availablePeriods: getAvailablePeriods(),
    isDemo,
    isEmpty,
    summary: {
      totalIncomePaise: totalIncome,
      totalExpensesPaise: totalExpenses,
      netBalancePaise: netBalance,
      budgetUsagePercent: budget.status === 'none' ? null : budget.usagePercent,
      budgetStatus: budget.status,
      remainingBudgetPaise: budget.remainingPaise,
    },
    monthlyTotals,
    expenseByCategory,
    recentTransactions,
    categories: DEMO_CATEGORIES,
    budget: {
      limitPaise: budgetLimitPaise,
      spentPaise: totalExpenses,
      status: budget.status,
      usagePercent: budget.usagePercent,
      remainingPaise: budget.remainingPaise,
    },
  };
}

export async function fetchDashboardData({ monthKey = DEMO_MONTH_KEY, mode = 'active' } = {}) {
  if (mode === 'active') {
    const transactions = await listTransactions();
    return buildPayload({
      monthKey,
      transactions,
      isDemo: false,
      isEmpty: transactions.length === 0,
      budgetLimitPaise: 0,
    });
  }

  await wait(MOCK_DELAY_MS);

  if (mode === 'error') {
    throw new Error('Failed to fetch financial data from the server. Please check your connection.');
  }

  if (mode === 'empty') {
    return buildEmptyPayload(monthKey);
  }

  return buildPayload({
    monthKey,
    transactions: DEMO_TRANSACTIONS,
    isDemo: true,
    isEmpty: false,
    budgetLimitPaise: DEMO_MONTHLY_BUDGET_PAISE,
  });
}