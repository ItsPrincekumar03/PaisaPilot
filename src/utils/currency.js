const INR_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/**
 * Formats an integer amount in paise as an INR string, e.g. 8500000 -> "₹85,000".
 * Money is stored in paise to avoid floating-point errors; conversion happens only here.
 */
export function formatINR(paise) {
  if (!Number.isFinite(paise)) {
    return '—';
  }
  return INR_FORMATTER.format(paise / 100);
}
