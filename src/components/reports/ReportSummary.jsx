import SummaryCard from '../dashboard/SummaryCard.jsx';
import { formatINR } from '../../utils/currency.js';
import { formatTenthsPercent } from '../../utils/reportCalculations.js';

export default function ReportSummary({ summary }) {
  if (!summary) return null;

  return (
    <section className="summary-grid" aria-labelledby="report-summary-heading">
      <h2 id="report-summary-heading" className="sr-only">
        Financial Report Summary
      </h2>
      <SummaryCard
        tone="income"
        icon="income"
        label="Total Income"
        value={formatINR(summary.incomePaise)}
        helper="All income in selected range"
      />
      <SummaryCard
        tone="expense"
        icon="expense"
        label="Total Expenses"
        value={formatINR(summary.expensePaise)}
        helper="All spending in selected range"
      />
      <SummaryCard
        tone={summary.netSavingsPaise >= 0 ? 'balance' : 'expense'}
        icon="wallet"
        label="Net Savings"
        value={formatINR(summary.netSavingsPaise)}
        helper={
          summary.expensesExceededIncome
            ? 'Expenses exceeded income'
            : 'Savings retained in period'
        }
      />
      <SummaryCard
        tone="budget"
        icon="target"
        label="Savings Rate"
        value={formatTenthsPercent(summary.savingsRateTenths)}
        helper={`${summary.transactionCount} transaction${summary.transactionCount === 1 ? '' : 's'} recorded`}
      />
    </section>
  );
}
