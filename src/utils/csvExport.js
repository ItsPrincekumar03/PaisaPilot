import { CSV_CURRENCY_CODE } from './reportsConstants.js';
import { isValidIsoDate } from './transactionFilters.js';

export const CSV_HEADERS = ['Transaction ID', 'Date', 'Description', 'Category', 'Type', 'Amount', 'Currency'];

/*
 * Amount convention: the Amount column is a plain decimal in rupees with two places, e.g. 1234.50.
 * It has no currency symbol and no thousands separator, so spreadsheets read it as a number.
 * The Currency column states INR.
 */

const FORMULA_PREFIX = /^[=+\-@\t\r]/;

/** Stops spreadsheet formula injection in untrusted text by prefixing a quote. */
export function protectFromFormula(value) {
  const text = String(value ?? '');
  return FORMULA_PREFIX.test(text) ? `'${text}` : text;
}

/** RFC 4180 escaping: wrap in quotes when needed, double any inner quotes. */
export function escapeCsvField(value) {
  const text = String(value ?? '');
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/** Integer paise to a decimal rupee string. 123450 -> "1234.50". No floats. */
export function formatPaiseAsCsvAmount(paise) {
  const sign = paise < 0 ? '-' : '';
  const abs = Math.abs(paise);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

/** Builds the full CSV text. UTF-8 BOM first so Excel reads Unicode correctly. */
export function buildCsvContent(rows) {
  const lines = [CSV_HEADERS.map(escapeCsvField).join(',')];

  for (const row of rows) {
    const fields = [
      protectFromFormula(row.id),
      row.date,
      protectFromFormula(row.description),
      protectFromFormula(row.categoryName),
      row.typeLabel,
      formatPaiseAsCsvAmount(row.amountPaise),
      CSV_CURRENCY_CODE,
    ];
    lines.push(fields.map(escapeCsvField).join(','));
  }

  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

/** paisapilot-transactions-YYYY-MM-DD-to-YYYY-MM-DD.csv */
export function buildCsvFilename(startDate, endDate) {
  if (!isValidIsoDate(startDate) || !isValidIsoDate(endDate)) {
    throw new Error('Export dates must be valid YYYY-MM-DD values.');
  }
  return `paisapilot-transactions-${startDate}-to-${endDate}.csv`;
}

/** Triggers a browser download. Only the rows passed in are exported. */
export function downloadCsv(rows, startDate, endDate) {
  const content = buildCsvContent(rows);
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = buildCsvFilename(startDate, endDate);
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
