import { formatINR } from './currency.js';
import { formatDisplayDate, formatMonthLabel } from './dates.js';
import { getExpenseByCategory, getMonthlyTotals, sortByDateDesc, sumByType } from './financeCalculations.js';
import { filterTransactionsByRange, getMonthKeysInRange } from './reportFilters.js';
import { CATEGORY_UNKNOWN_LABEL, UNKNOWN_CATEGORY_COLOR } from './reportsConstants.js';

/*
 * Pure reporting calculations. No React, no Chart.js, no file I/O.
 * Money is integer paise throughout. Formatting happens only at the output edges.
 * Percentages are stored as integer tenths of a percent (255 = 25.5%).
 */

/** Savings rate in tenths of a percent, or null when income is zero. */
export function getSavingsRateTenths(incomePaise, netPaise) {
  if (!Number.isSafeInteger(incomePaise) || incomePaise <= 0) return null;
  return Math.round((netPaise * 1000) / incomePaise);
}

/** "255" -> "25.5%", "-2000" -> "-200.0%". Integer-only formatting. */
export function formatTenthsPercent(tenths) {
  if (tenths === null) return 'Not available';
  const sign = tenths < 0 ? '-' : '';
  const abs = Math.abs(tenths);
  return `${sign}${Math.floor(abs / 10)}.${abs % 10}%`;
}

/** Totals for a transaction set. Assumes transactions were already filtered to the period. */
export function summarizeReport(transactions) {
  const incomePaise = sumByType(transactions, 'income');
  const expensePaise = sumByType(transactions, 'expense');
  const netSavingsPaise = incomePaise - expensePaise;

  return {
    incomePaise,
    expensePaise,
    netSavingsPaise,
    savingsRateTenths: getSavingsRateTenths(incomePaise, netSavingsPaise),
    transactionCount: transactions.length,
    expensesExceededIncome: netSavingsPaise < 0,
  };
}

/** One entry per month in the range, including zero-activity months, oldest first. */
export function buildMonthlySeries(transactions, monthKeys) {
  return getMonthlyTotals(transactions, monthKeys).map((item) => ({
    monthKey: item.monthKey,
    label: formatMonthLabel(item.monthKey),
    incomePaise: item.incomePaise,
    expensePaise: item.expensePaise,
    netPaise: item.incomePaise - item.expensePaise,
  }));
}

/**
 * Expense totals per category, largest first.
 * Duplicate category IDs are counted once (first definition wins).
 * Expenses whose category is missing from the list are grouped as "Uncategorized",
 * so the items always add up to total expenses.
 */
export function buildCategoryBreakdown(transactions, categories) {
  const uniqueCategories = [];
  const seenIds = new Set();
  for (const category of categories) {
    if (!seenIds.has(category.id)) {
      seenIds.add(category.id);
      uniqueCategories.push(category);
    }
  }

  const totalExpensePaise = sumByType(transactions, 'expense');
  const known = getExpenseByCategory(transactions, uniqueCategories).map((item) => ({
    categoryId: item.categoryId,
    name: item.name,
    color: item.color,
    amountPaise: item.amountPaise,
  }));

  const knownTotal = known.reduce((total, item) => total + item.amountPaise, 0);
  const unknownPaise = totalExpensePaise - knownTotal;
  if (unknownPaise > 0) {
    known.push({
      categoryId: null,
      name: CATEGORY_UNKNOWN_LABEL,
      color: UNKNOWN_CATEGORY_COLOR,
      amountPaise: unknownPaise,
    });
  }

  return known
    .sort((a, b) => b.amountPaise - a.amountPaise)
    .map((item) => ({
      ...item,
      percentTenths: totalExpensePaise > 0 ? Math.round((item.amountPaise * 1000) / totalExpensePaise) : 0,
    }));
}

/** Table rows for the transaction report. Original transaction objects are not modified. */
export function buildTransactionReportRows(transactions, categories) {
  const categoryById = new Map();
  for (const category of categories) {
    if (!categoryById.has(category.id)) categoryById.set(category.id, category);
  }

  return sortByDateDesc(transactions).map((transaction) => {
    const category = categoryById.get(transaction.categoryId);
    return {
      id: transaction.id,
      date: transaction.date,
      dateLabel: formatDisplayDate(transaction.date),
      description: transaction.description || '(no description)',
      categoryName: category?.name ?? CATEGORY_UNKNOWN_LABEL,
      type: transaction.type,
      typeLabel: transaction.type === 'income' ? 'Income' : 'Expense',
      amountPaise: transaction.amountPaise,
      amountLabel: formatINR(transaction.amountPaise),
    };
  });
}

/**
 * Single source of truth for the reports page AND both exports.
 * Export totals therefore match what the page displays.
 */
export function buildReportData({ allTransactions, categories, startDate, endDate }) {
  const transactions = filterTransactionsByRange(allTransactions, { startDate, endDate });
  const monthKeys = getMonthKeysInRange(startDate, endDate);

  return {
    startDate,
    endDate,
    transactions,
    summary: summarizeReport(transactions),
    monthly: buildMonthlySeries(transactions, monthKeys),
    categoryBreakdown: buildCategoryBreakdown(transactions, categories),
    rows: buildTransactionReportRows(transactions, categories),
  };
}

/**
 * Amount for PDF output. The standard PDF font has no rupee glyph, so this uses "INR" as a prefix.
 * Integer arithmetic only. Example: -123450 -> "-INR 1,234.50".
 */
export function formatPaiseForPdf(paise) {
  const sign = paise < 0 ? '-' : '';
  const abs = Math.abs(paise);
  const whole = Math.floor(abs / 100);
  const fraction = String(abs % 100).padStart(2, '0');
  return `${sign}INR ${new Intl.NumberFormat('en-IN').format(whole)}.${fraction}`;
}

/** Plain-text model for the PDF. Built from the same reportData the page shows. */
export function buildPdfReportModel(reportData, generatedLabel) {
  const { summary, categoryBreakdown, rows, startDate, endDate } = reportData;

  return {
    title: 'PaisaPilot Financial Report',
    periodLabel: `${formatDisplayDate(startDate)} to ${formatDisplayDate(endDate)}`,
    generatedLabel,
    note: summary.expensesExceededIncome ? 'Expenses exceeded income in this period.' : '',
    summaryRows: [
      ['Total income', formatPaiseForPdf(summary.incomePaise)],
      ['Total expenses', formatPaiseForPdf(summary.expensePaise)],
      ['Net savings', formatPaiseForPdf(summary.netSavingsPaise)],
      ['Savings rate', formatTenthsPercent(summary.savingsRateTenths)],
      ['Number of transactions', String(summary.transactionCount)],
    ],
    categoryRows: categoryBreakdown.map((item) => [
      item.name,
      formatPaiseForPdf(item.amountPaise),
      formatTenthsPercent(item.percentTenths),
    ]),
    transactionRows: rows.map((row) => [
      row.dateLabel,
      row.description,
      row.categoryName,
      row.typeLabel,
      formatPaiseForPdf(row.amountPaise),
    ]),
  };
}
