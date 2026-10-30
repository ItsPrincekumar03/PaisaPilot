import SummaryCard from '../dashboard/SummaryCard.jsx';
import { formatINR } from '../../utils/currency.js';

export default function BudgetOverview({ summary }) {
  const hasBudgets = summary.categoryCount > 0;
  const isOver = summary.remainingPaise < 0;

  return (
    <div className="summary-grid">
      <SummaryCard
        tone="budget"
        icon="target"
        label="Total budget"
        value={hasBudgets ? formatINR(summary.totalBudgetPaise) : 'No budgets'}
        helper={`${summary.categoryCount} ${summary.categoryCount === 1 ? 'category' : 'categories'} with budgets`}
      />
      <SummaryCard
        tone="expense"
        icon="expense"
        label="Spent"
        value={formatINR(summary.totalSpentPaise)}
        helper="In budgeted categories"
      />
      <SummaryCard
        tone={isOver ? 'expense' : 'balance'}
        icon="wallet"
        label={isOver ? 'Over budget' : 'Remaining'}
        value={formatINR(Math.abs(summary.remainingPaise))}
        helper={isOver ? 'Planned limits exceeded in total' : 'Left across planned budgets'}
      />
      <SummaryCard
        tone="budget"
        icon="target"
        label="Budget used"
        value={`${summary.utilizationPercent}%`}
        helper={`${summary.overCount} over budget, ${summary.warningCount} approaching limit`}
      />
    </div>
  );
}
