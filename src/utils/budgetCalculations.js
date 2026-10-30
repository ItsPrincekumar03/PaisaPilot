import { formatINR } from './currency.js';
import { filterByMonth, getExpenseByCategory } from './financeCalculations.js';
import { BUDGET_STATUS, WARNING_THRESHOLD_PERCENT } from './budgetConstants.js';

export function getUsageStatus(limitPaise, spentPaise) {
  if (spentPaise >= limitPaise) return BUDGET_STATUS.EXCEEDED;
  if (spentPaise * 100 >= limitPaise * WARNING_THRESHOLD_PERCENT) return BUDGET_STATUS.WARNING;
  return BUDGET_STATUS.NORMAL;
}

export function getUsagePercent(limitPaise, spentPaise) {
  if (!Number.isSafeInteger(limitPaise) || limitPaise <= 0) return 0;
  const safeSpent = Math.max(0, spentPaise);
  return Math.floor((safeSpent * 100) / limitPaise);
}

export function buildCategoryBudgetRows({ budgets, transactions, categories, monthKey }) {
  const monthTransactions = filterByMonth(transactions, monthKey);
  const spentByCategory = new Map(
    getExpenseByCategory(monthTransactions, categories).map((item) => [item.categoryId, item.amountPaise])
  );
  const categoryById = new Map(categories.map((category) => [category.id, category]));

  return budgets
    .filter((budget) => budget.monthKey === monthKey)
    .map((budget) => {
      const category = categoryById.get(budget.categoryId);
      const spentPaise = spentByCategory.get(budget.categoryId) ?? 0;

      return {
        budgetId: budget.id,
        categoryId: budget.categoryId,
        categoryName: category?.name ?? 'Unavailable category',
        categoryColor: category?.color ?? '#A9A6BF',
        categoryAvailable: Boolean(category),
        limitPaise: budget.limitPaise,
        spentPaise,
        remainingPaise: budget.limitPaise - spentPaise,
        usagePercent: getUsagePercent(budget.limitPaise, spentPaise),
        status: getUsageStatus(budget.limitPaise, spentPaise),
      };
    })
    .sort((a, b) => a.categoryName.localeCompare(b.categoryName));
}

export function summarizeBudgetRows(rows) {
  const totalBudgetPaise = rows.reduce((sum, row) => sum + row.limitPaise, 0);
  const totalSpentPaise = rows.reduce((sum, row) => sum + row.spentPaise, 0);

  return {
    categoryCount: rows.length,
    totalBudgetPaise,
    totalSpentPaise,
    remainingPaise: totalBudgetPaise - totalSpentPaise,
    utilizationPercent: getUsagePercent(totalBudgetPaise, totalSpentPaise),
    overCount: rows.filter((row) => row.status === BUDGET_STATUS.EXCEEDED).length,
    warningCount: rows.filter((row) => row.status === BUDGET_STATUS.WARNING).length,
  };
}

export function buildMonthlyHistory({ budgets, transactions, categories, monthKeys }) {
  return monthKeys.map((monthKey) => {
    const rows = buildCategoryBudgetRows({ budgets, transactions, categories, monthKey });
    return { monthKey, summary: summarizeBudgetRows(rows) };
  });
}

export function buildBudgetInsights({ rows, summary, monthLabel }) {
  if (rows.length === 0) {
    return [
      {
        id: 'no-budgets',
        tone: 'neutral',
        text: `No category budgets are set for ${monthLabel}. Add one to start tracking.`,
      },
    ];
  }

  const insights = [];

  if (summary.totalSpentPaise === 0) {
    insights.push({
      id: 'no-spending',
      tone: 'neutral',
      text: `No expenses are recorded in your budgeted categories for ${monthLabel}.`,
    });
  } else {
    insights.push({
      id: 'utilization',
      tone: 'neutral',
      text: `You have used ${summary.utilizationPercent}% of your planned budget for ${monthLabel}.`,
    });
  }

  if (summary.remainingPaise >= 0) {
    insights.push({
      id: 'remaining',
      tone: 'neutral',
      text: `You have ${formatINR(summary.remainingPaise)} remaining across your planned budgets.`,
    });
  } else {
    insights.push({
      id: 'total-over',
      tone: 'exceeded',
      text: `Your planned budgets are over by ${formatINR(-summary.remainingPaise)} in total.`,
    });
  }

  for (const row of rows) {
    if (row.status === BUDGET_STATUS.EXCEEDED) {
      insights.push({
        id: `exceeded-${row.budgetId}`,
        tone: 'exceeded',
        text: `${row.categoryName} exceeded its monthly budget by ${formatINR(row.spentPaise - row.limitPaise)}.`,
      });
    } else if (row.status === BUDGET_STATUS.WARNING) {
      insights.push({
        id: `warning-${row.budgetId}`,
        tone: 'warning',
        text: `${row.categoryName} is approaching its budget limit (${row.usagePercent}% used).`,
      });
    }
  }

  const comparable = rows.filter((row) => row.categoryAvailable);
  if (comparable.length >= 2) {
    const lowestSpend = Math.min(...comparable.map((row) => row.spentPaise));
    const lowest = comparable.filter((row) => row.spentPaise === lowestSpend);
    if (lowest.length === 1) {
      insights.push({
        id: 'lowest',
        tone: 'neutral',
        text: `${lowest[0].categoryName} is currently your lowest-spending budget category.`,
      });
    }
  }

  return insights;
}
