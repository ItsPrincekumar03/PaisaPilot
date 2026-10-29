/**
 * Dashboard-to-Finance Data Contract & Service Interface
 *
 * Owned by: Mukesh (Presentation) in agreement with Nitin (Finance & Domain Logic)
 * Nitin provides financial calculations (src/utils/financeCalculations.js).
 * This service mediates between presentation needs and domain logic, isolating
 * mock data so it can be swapped cleanly for real Firestore data in Module 5.
 */

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

export const AVAILABLE_MONTH_KEYS = [
  '2026-10',
  '2026-09',
  '2026-08',
  '2026-07',
  '2026-06',
  '2026-05',
];

/**
 * Returns the list of month periods available in the system.
 */
export function getAvailablePeriods() {
  return AVAILABLE_MONTH_KEYS.map((key) => ({
    key,
    label: formatMonthLabel(key),
  }));
}

/**
 * Fetches dashboard data conforming to the agreed Mukesh-Nitin contract.
 *
 * @param {Object} options
 * @param {string} [options.monthKey] - The target month in YYYY-MM format. Defaults to DEMO_MONTH_KEY.
 * @param {'demo' | 'empty' | 'error'} [options.mode] - Data mode (demo data, empty new user, or simulated error).
 * @returns {Promise<Object>} Dashboard presentation payload.
 */
export async function fetchDashboardData({
  monthKey = DEMO_MONTH_KEY,
  mode = 'demo',
} = {}) {
  // Simulate small network latency for realistic loading lifecycle
  await new Promise((resolve) => setTimeout(resolve, 200));

  if (mode === 'error') {
    throw new Error('Failed to fetch financial data from the server. Please check your connection.');
  }

  if (mode === 'empty') {
    // New user with no recorded transactions or budget yet
    const recentKeys = getRecentMonthKeys(monthKey, 6);
    const emptyMonthlyTotals = recentKeys.map((k) => ({
      monthKey: k,
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

  // Demo data mode: compute metrics using Nitin's domain functions (no duplicate math)
  const monthTransactions = filterByMonth(DEMO_TRANSACTIONS, monthKey);
  const totalIncome = sumByType(monthTransactions, 'income');
  const totalExpenses = sumByType(monthTransactions, 'expense');
  const netBalance = totalIncome - totalExpenses;
  const budget = getBudgetStatus(DEMO_MONTHLY_BUDGET_PAISE, totalExpenses);

  const recentMonthKeys = getRecentMonthKeys(monthKey, 6);
  const monthlyTotals = getMonthlyTotals(DEMO_TRANSACTIONS, recentMonthKeys);
  const expenseByCategory = getExpenseByCategory(monthTransactions, DEMO_CATEGORIES);
  const recentTransactions = sortByDateDesc(DEMO_TRANSACTIONS).slice(0, 6);

  return {
    monthKey,
    monthLabel: formatMonthLabel(monthKey),
    availablePeriods: getAvailablePeriods(),
    isDemo: true,
    isEmpty: false,
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
      limitPaise: DEMO_MONTHLY_BUDGET_PAISE,
      spentPaise: totalExpenses,
      status: budget.status,
      usagePercent: budget.usagePercent,
      remainingPaise: budget.remainingPaise,
    },
  };
}
