import { formatINR } from '../../utils/currency.js';
import { BUDGET_STATUS } from '../../utils/budgetConstants.js';

const STATUS_LABELS = {
  [BUDGET_STATUS.NORMAL]: 'Within budget',
  [BUDGET_STATUS.WARNING]: 'Approaching limit',
  [BUDGET_STATUS.EXCEEDED]: 'Over budget',
};

const FILL_CLASSES = {
  [BUDGET_STATUS.NORMAL]: '',
  [BUDGET_STATUS.WARNING]: 'progress__fill--warning',
  [BUDGET_STATUS.EXCEEDED]: 'progress__fill--over',
};

export default function BudgetCard({ row, onEdit, onDelete }) {
  const isExceeded = row.status === BUDGET_STATUS.EXCEEDED;
  const barWidth = Math.min(row.usagePercent, 100);
  const titleId = `budget-title-${row.budgetId}`;

  return (
    <article className="budget-card" aria-labelledby={titleId}>
      <header className="budget-card__header">
        <div className="budget-card__title">
          <span className="category-dot" style={{ backgroundColor: row.categoryColor }} aria-hidden="true" />
          <h3 id={titleId}>{row.categoryName}</h3>
        </div>
        <span className={`budget-status budget-status--${row.status}`}>{STATUS_LABELS[row.status]}</span>
      </header>

      {!row.categoryAvailable && (
        <p className="budget-card__notice">
          This category is no longer in your category list, so its spending is not counted. You can still delete this budget.
        </p>
      )}

      <div
        className="progress"
        role="progressbar"
        aria-label={`${row.categoryName} budget usage`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={barWidth}
        aria-valuetext={`${row.usagePercent} percent used`}
      >
        <div className={`progress__fill ${FILL_CLASSES[row.status]}`} style={{ width: `${barWidth}%` }} />
      </div>

      <dl className="budget-stats">
        <div>
          <dt>Budget</dt>
          <dd>{formatINR(row.limitPaise)}</dd>
        </div>
        <div>
          <dt>Spent</dt>
          <dd>{formatINR(row.spentPaise)}</dd>
        </div>
        <div>
          <dt>{isExceeded ? 'Over by' : 'Remaining'}</dt>
          <dd>{formatINR(Math.abs(row.remainingPaise))}</dd>
        </div>
        <div>
          <dt>Used</dt>
          <dd>{row.usagePercent}%</dd>
        </div>
      </dl>

      <div className="budget-card__actions">
        <button type="button" className="button button--secondary" onClick={() => onEdit(row)}>
          Edit<span className="sr-only"> {row.categoryName} budget</span>
        </button>
        <button type="button" className="button button--danger" onClick={() => onDelete(row)}>
          Delete<span className="sr-only"> {row.categoryName} budget</span>
        </button>
      </div>
    </article>
  );
}
