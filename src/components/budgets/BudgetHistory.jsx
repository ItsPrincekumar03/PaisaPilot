import { formatINR } from '../../utils/currency.js';
import { formatMonthLabel } from '../../utils/dates.js';

export default function BudgetHistory({ history }) {
  return (
    <section className="panel" aria-labelledby="budget-history-heading">
      <div className="panel__header">
        <h3 id="budget-history-heading">Budget history</h3>
        <p className="panel__subtitle">
          Last {history.length} months. Spending uses sample transaction data until Module 5 is connected.
        </p>
      </div>
      <div className="budget-history__scroll">
        <table className="budget-history">
          <caption className="sr-only">Monthly budget totals</caption>
          <thead>
            <tr>
              <th scope="col">Month</th>
              <th scope="col">Planned</th>
              <th scope="col">Spent</th>
              <th scope="col">Remaining or over</th>
              <th scope="col">Over budget</th>
            </tr>
          </thead>
          <tbody>
            {history.map(({ monthKey, summary }) => (
              <tr key={monthKey}>
                <th scope="row">{formatMonthLabel(monthKey)}</th>
                {summary.categoryCount === 0 ? (
                  <td colSpan={4}>No budgets set</td>
                ) : (
                  <>
                    <td>{formatINR(summary.totalBudgetPaise)}</td>
                    <td>{formatINR(summary.totalSpentPaise)}</td>
                    <td>
                      {summary.remainingPaise >= 0
                        ? `${formatINR(summary.remainingPaise)} left`
                        : `${formatINR(-summary.remainingPaise)} over`}
                    </td>
                    <td>{summary.overCount}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
