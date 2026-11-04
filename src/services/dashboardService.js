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
import {
  formatMonthLabel,
  getCurrentMonthKey,
  getMonthKeyRange,
  getRecentMonthKeys,
} from '../utils/dates.js';
import { getPlannedMonthlyBudgetPaise } from '../utils/budgetCalculations.js';
import { listTransactions } from './transactionRepository.js';
import { listBudgets } from './budgetService.js';
import { auth } from '../lib/firebase.js';

const MOCK_DELAY_MS = 200;

export function getAvailablePeriods(anchorMonthKey = getCurrentMonthKey()) {
  const keys = getMonthKeyRange(anchorMonthKey, { pastCount: 5, futureCount: 1 }).reverse();
  return keys.map((key) => ({
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
    availablePeriods: getAvailablePeriods(monthKey),
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
    availablePeriods: getAvailablePeriods(monthKey),
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

export async function fetchDashboardData({ monthKey = getCurrentMonthKey(), mode = 'active', ownerId = null } = {}) {
  if (mode === 'active') {
    const effectiveUid = ownerId || auth?.currentUser?.uid;
    const [transactions, budgets] = await Promise.all([
      listTransactions(),
      effectiveUid ? listBudgets(effectiveUid).catch(() => []) : Promise.resolve([]),
    ]);
    const budgetLimitPaise = getPlannedMonthlyBudgetPaise(budgets, monthKey);

    return buildPayload({
      monthKey,
      transactions,
      isDemo: false,
      isEmpty: transactions.length === 0,
      budgetLimitPaise,
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