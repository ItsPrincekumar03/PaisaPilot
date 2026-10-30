import { fetchTransactions } from './transactionService.js';
import { buildReportData } from '../utils/reportCalculations.js';
import { validateDateRange } from '../utils/reportFilters.js';

export async function loadReportData({ startDate, endDate, mode = 'active' } = {}) {
  const rangeErrors = validateDateRange({ startDate, endDate });
  if (Object.keys(rangeErrors).length > 0) {
    throw new Error(rangeErrors.startDate || rangeErrors.endDate || rangeErrors.range);
  }

  const { transactions, categories } = await fetchTransactions({ mode });

  return buildReportData({
    allTransactions: transactions,
    categories,
    startDate,
    endDate,
  });
}
