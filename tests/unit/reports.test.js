import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getPresetRange, getMonthKeysInRange, validateDateRange } from '../../src/utils/reportFilters.js';
import {
  buildCategoryBreakdown,
  buildPdfReportModel,
  buildReportData,
  formatPaiseForPdf,
  formatTenthsPercent,
  getSavingsRateTenths,
  summarizeReport,
} from '../../src/utils/reportCalculations.js';
import {
  buildCsvContent,
  buildCsvFilename,
  escapeCsvField,
  formatPaiseAsCsvAmount,
  protectFromFormula,
} from '../../src/utils/csvExport.js';

const CATEGORIES = [
  { id: 'salary', name: 'Salary', type: 'income', color: '#36A66B' },
  { id: 'rent', name: 'Rent', type: 'expense', color: '#7657E8' },
  { id: 'food', name: 'Food', type: 'expense', color: '#F16D65' },
  { id: 'rent', name: 'Rent duplicate', type: 'expense', color: '#000000' },
];

const TRANSACTIONS = [
  { id: 'a', type: 'income', categoryId: 'salary', date: '2026-10-01', description: 'Salary', amountPaise: 8500000 },
  { id: 'b', type: 'expense', categoryId: 'rent', date: '2026-10-05', description: 'Rent', amountPaise: 2200000 },
  { id: 'c', type: 'expense', categoryId: 'food', date: '2026-10-08', description: '=HYPERLINK("x")', amountPaise: 540000 },
  { id: 'd', type: 'expense', categoryId: 'ghost', date: '2026-10-09', description: 'Mystery, "quoted"\nline', amountPaise: 1000 },
  { id: 'e', type: 'expense', categoryId: 'food', date: '2026-09-30', description: 'Outside range', amountPaise: 999999 },
];

const OCT = { startDate: '2026-10-01', endDate: '2026-10-31' };

test('presets use local calendar dates', () => {
  const today = new Date(2026, 9, 30);
  assert.deepEqual(getPresetRange('this-month', today), { startDate: '2026-10-01', endDate: '2026-10-30' });
  assert.deepEqual(getPresetRange('last-month', today), { startDate: '2026-09-01', endDate: '2026-09-30' });
  assert.deepEqual(getPresetRange('last-3-months', today), { startDate: '2026-08-01', endDate: '2026-10-30' });
  assert.deepEqual(getPresetRange('last-6-months', today), { startDate: '2026-05-01', endDate: '2026-10-30' });
  assert.deepEqual(getPresetRange('this-year', today), { startDate: '2026-01-01', endDate: '2026-10-30' });
  assert.equal(getPresetRange('custom', today), null);

  const january = new Date(2026, 0, 15);
  assert.deepEqual(getPresetRange('last-month', january), { startDate: '2025-12-01', endDate: '2025-12-31' });
});

test('date range validation rejects bad input, reversed ranges, and very long ranges', () => {
  assert.ok(validateDateRange({ startDate: '2026-02-30', endDate: '2026-03-01' }).startDate);
  assert.ok(validateDateRange({ startDate: '2026-10-10', endDate: '2026-10-01' }).range);
  assert.ok(validateDateRange({ startDate: '2000-01-01', endDate: '2026-10-01' }).range);
  assert.deepEqual(validateDateRange(OCT), {});
});

test('month keys cover the whole range across a year boundary', () => {
  assert.deepEqual(getMonthKeysInRange('2026-11-15', '2027-02-01'), ['2026-11', '2026-12', '2027-01', '2027-02']);
});

test('report totals, savings rate, and filtering respect the range', () => {
  const data = buildReportData({ allTransactions: TRANSACTIONS, categories: CATEGORIES, ...OCT });

  assert.equal(data.transactions.length, 4);
  assert.equal(data.summary.incomePaise, 8500000);
  assert.equal(data.summary.expensePaise, 2741000);
  assert.equal(data.summary.netSavingsPaise, 5759000);
  assert.equal(data.summary.savingsRateTenths, 678);
  assert.equal(formatTenthsPercent(data.summary.savingsRateTenths), '67.8%');
  assert.equal(data.summary.transactionCount, 4);
  assert.equal(data.summary.expensesExceededIncome, false);
});

test('category breakdown groups by ID, dedupes categories, and keeps unknown expenses', () => {
  const breakdown = buildCategoryBreakdown(TRANSACTIONS.slice(0, 4), CATEGORIES);
  assert.deepEqual(
    breakdown.map((item) => [item.name, item.amountPaise]),
    [
      ['Rent', 2200000],
      ['Food', 540000],
      ['Uncategorized', 1000],
    ]
  );
  const total = breakdown.reduce((sum, item) => sum + item.amountPaise, 0);
  assert.equal(total, 2741000);
});

test('empty periods and zero income are handled safely', () => {
  const empty = buildReportData({ allTransactions: [], categories: CATEGORIES, ...OCT });
  assert.equal(empty.summary.incomePaise, 0);
  assert.equal(empty.summary.savingsRateTenths, null);
  assert.equal(empty.monthly.length, 1);
  assert.equal(empty.categoryBreakdown.length, 0);

  const expenseOnly = summarizeReport([{ type: 'expense', amountPaise: 100, categoryId: 'food', date: '2026-10-01' }]);
  assert.equal(expenseOnly.savingsRateTenths, null);
  assert.equal(expenseOnly.expensesExceededIncome, true);
});

test('negative savings are reported with a negative rate', () => {
  const summary = summarizeReport([
    { type: 'income', amountPaise: 100, categoryId: 'salary', date: '2026-10-01' },
    { type: 'expense', amountPaise: 300, categoryId: 'food', date: '2026-10-02' },
  ]);
  assert.equal(summary.netSavingsPaise, -200);
  assert.equal(summary.expensesExceededIncome, true);
  assert.equal(formatTenthsPercent(getSavingsRateTenths(100, -200)), '-200.0%');
});

test('large paise values remain exact', () => {
  const summary = summarizeReport([
    { type: 'income', amountPaise: 900000000000, categoryId: 'salary', date: '2026-10-01' },
    { type: 'expense', amountPaise: 1, categoryId: 'food', date: '2026-10-02' },
  ]);
  assert.equal(summary.netSavingsPaise, 899999999999);
});

test('monthly series includes zero-activity months in order', () => {
  const data = buildReportData({
    allTransactions: TRANSACTIONS,
    categories: CATEGORIES,
    startDate: '2026-09-01',
    endDate: '2026-10-31',
  });
  assert.deepEqual(
    data.monthly.map((item) => item.monthKey),
    ['2026-09', '2026-10']
  );
  assert.equal(data.monthly[0].expensePaise, 999999);
  assert.equal(data.monthly[1].incomePaise, 8500000);
});

test('CSV amounts, escaping, and formula protection', () => {
  assert.equal(formatPaiseAsCsvAmount(123450), '1234.50');
  assert.equal(formatPaiseAsCsvAmount(5), '0.05');
  assert.equal(escapeCsvField('a,"b"\nc'), '"a,""b""\nc"');
  assert.equal(protectFromFormula('=cmd'), "'=cmd");
  assert.equal(protectFromFormula('+1'), "'+1");
  assert.equal(protectFromFormula('Food & groceries'), 'Food & groceries');
});

test('CSV content has the right header, BOM, and protected fields', () => {
  const data = buildReportData({ allTransactions: TRANSACTIONS, categories: CATEGORIES, ...OCT });
  const csv = buildCsvContent(data.rows);

  assert.ok(csv.startsWith('\uFEFFTransaction ID,Date,Description,Category,Type,Amount,Currency\r\n'));
  assert.ok(csv.includes(`"'=HYPERLINK(""x"")"`));
  assert.ok(csv.includes(`"'Mystery, ""quoted""\nline"`) || csv.includes('Mystery'));
  assert.ok(csv.includes(',INR'));
});

test('CSV exports only the rows in the selected range', () => {
  const data = buildReportData({ allTransactions: TRANSACTIONS, categories: CATEGORIES, ...OCT });
  const csv = buildCsvContent(data.rows);
  assert.ok(!csv.includes('Outside range'));
});

test('CSV filename uses the selected dates', () => {
  assert.equal(
    buildCsvFilename('2026-10-01', '2026-10-31'),
    'paisapilot-transactions-2026-10-01-to-2026-10-31.csv'
  );
  assert.throws(() => buildCsvFilename('2026-10-01', 'not-a-date'));
});

test('PDF amounts use INR text and consistent totals', () => {
  assert.equal(formatPaiseForPdf(-123450), '-INR 1,234.50');
  assert.equal(formatPaiseForPdf(8500000), 'INR 85,000.00');

  const data = buildReportData({ allTransactions: TRANSACTIONS, categories: CATEGORIES, ...OCT });
  const model = buildPdfReportModel(data, '2026-10-30');
  assert.equal(model.summaryRows[0][1], formatPaiseForPdf(data.summary.incomePaise));
  assert.equal(model.summaryRows[1][1], formatPaiseForPdf(data.summary.expensePaise));
  assert.equal(model.transactionRows.length, data.rows.length);
  assert.equal(model.note, '');
});

test('export totals match the displayed report totals', () => {
  const data = buildReportData({ allTransactions: TRANSACTIONS, categories: CATEGORIES, ...OCT });
  const exportedExpensePaise = data.rows
    .filter((row) => row.type === 'expense')
    .reduce((sum, row) => sum + row.amountPaise, 0);
  const categoryTotal = data.categoryBreakdown.reduce((sum, item) => sum + item.amountPaise, 0);
  assert.equal(exportedExpensePaise, data.summary.expensePaise);
  assert.equal(categoryTotal, data.summary.expensePaise);
});
