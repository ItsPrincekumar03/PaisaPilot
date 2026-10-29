import EmptyState from '../common/EmptyState.jsx';
import { formatINR } from '../../utils/currency.js';
import { getBudgetStatus } from '../../utils/financeCalculations.js';

export default function BudgetProgress({ limitPaise, spentPaise }) {
  const budget = getBudgetStatus(limitPaise, spentPaise);

  if (budget.status === 'none') {
    return (
      <EmptyState
        title="No monthly budget set"
        message="A monthly limit will appear here once budgets are configured."
      />
    );
  }

  const roundedUsage = Math.round(budget.usagePercent);
  const barWidth = Math.min(budget.usagePercent, 100);

  let fillClass = '';
  let statusText = 'You are within your budget.';
  if (budget.status === 'over') {
    fillClass = 'progress__fill--over';
    statusText = `You are over budget by ${formatINR(Math.abs(budget.remainingPaise))}.`;
  } else if (budget.status === 'warning') {
    fillClass = 'progress__fill--warning';
    statusText = 'You are approaching your limit.';
  }

  return (
    <div className="budget-progress">
      <div
        className="progress"
        role="progressbar"
        aria-label="Monthly budget usage"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(barWidth)}
        aria-valuetext={`${roundedUsage} percent used`}
      >
        <div className={`progress__fill ${fillClass}`} style={{ width: `${barWidth}%` }} />
      </div>
      <p className="budget-progress__status">{statusText}</p>
      <dl className="budget-stats">
        <div>
          <dt>Monthly limit</dt>
          <dd>{formatINR(limitPaise)}</dd>
        </div>
        <div>
          <dt>Spent</dt>
          <dd>{formatINR(spentPaise)}</dd>
        </div>
        <div>
          <dt>{budget.status === 'over' ? 'Over budget' : 'Remaining'}</dt>
          <dd>{formatINR(Math.abs(budget.remainingPaise))}</dd>
        </div>
        <div>
          <dt>Usage</dt>
          <dd>{roundedUsage}%</dd>
        </div>
      </dl>
    </div>
  );
}
