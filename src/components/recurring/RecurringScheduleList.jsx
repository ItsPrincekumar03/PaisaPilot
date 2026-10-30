import { formatINR } from '../../utils/currency.js';
import { formatDisplayDate } from '../../utils/dates.js';
import Icon from '../common/Icon.jsx';

const STATUS_BADGES = {
  active: 'badge--success',
  paused: 'badge--warning',
  cancelled: 'badge--muted',
};

export default function RecurringScheduleList({
  schedules = [],
  categories = [],
  onEdit,
  onToggleStatus,
  onDelete,
}) {
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  return (
    <div className="table-container">
      <table className="table" aria-label="Recurring transactions list">
        <thead>
          <tr>
            <th>Type</th>
            <th>Description</th>
            <th>Category</th>
            <th>Frequency</th>
            <th>Amount</th>
            <th>Next Occurrence</th>
            <th>Status</th>
            <th className="table__actions-header">Actions</th>
          </tr>
        </thead>
        <tbody>
          {schedules.map((schedule) => {
            const category = categoryMap.get(schedule.categoryId);
            const isExpense = schedule.type === 'expense';
            const badgeClass = STATUS_BADGES[schedule.status] || 'badge--muted';

            return (
              <tr key={schedule.id} className="table__row">
                <td>
                  <span className={`transaction-type-pill transaction-type-pill--${schedule.type}`}>
                    <Icon name={isExpense ? 'expense' : 'income'} size={14} />
                    <span>{schedule.type}</span>
                  </span>
                </td>
                <td className="table__description-cell">
                  <strong>{schedule.description}</strong>
                  {schedule.endDate && (
                    <span className="table__subtext">Ends {formatDisplayDate(schedule.endDate)}</span>
                  )}
                </td>
                <td>{category?.name || 'Uncategorized'}</td>
                <td className="capitalize">{schedule.frequency}</td>
                <td className={`table__amount ${isExpense ? 'text-expense' : 'text-income'}`}>
                  {isExpense ? '-' : '+'}
                  {formatINR(schedule.amountPaise)}
                </td>
                <td>
                  {schedule.nextDate ? (
                    formatDisplayDate(schedule.nextDate)
                  ) : (
                    <span className="text-muted">None (Completed)</span>
                  )}
                </td>
                <td>
                  <span className={`badge ${badgeClass} capitalize`}>
                    {schedule.status}
                  </span>
                </td>
                <td className="table__actions">
                  <button
                    type="button"
                    className="button button--secondary button--small"
                    onClick={() => onEdit(schedule)}
                    aria-label={`Edit ${schedule.description}`}
                  >
                    Edit
                  </button>

                  {schedule.status === 'active' && (
                    <button
                      type="button"
                      className="button button--secondary button--small"
                      onClick={() => onToggleStatus(schedule, 'paused')}
                      aria-label={`Pause ${schedule.description}`}
                    >
                      Pause
                    </button>
                  )}

                  {schedule.status === 'paused' && (
                    <button
                      type="button"
                      className="button button--secondary button--small"
                      onClick={() => onToggleStatus(schedule, 'active')}
                      aria-label={`Resume ${schedule.description}`}
                    >
                      Resume
                    </button>
                  )}

                  {schedule.status !== 'cancelled' && (
                    <button
                      type="button"
                      className="button button--secondary button--small"
                      onClick={() => onToggleStatus(schedule, 'cancelled')}
                      aria-label={`Cancel ${schedule.description}`}
                    >
                      Cancel
                    </button>
                  )}

                  <button
                    type="button"
                    className="button button--danger button--small"
                    onClick={() => onDelete(schedule)}
                    aria-label={`Delete ${schedule.description}`}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
