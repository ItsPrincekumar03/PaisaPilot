import { useState } from 'react';
import EmptyState from '../common/EmptyState.jsx';
import { TRANSACTION_TABLE_PAGE_SIZE } from '../../utils/reportsConstants.js';

export default function TransactionReportTable({ rows = [] }) {
  const [visibleCount, setVisibleCount] = useState(TRANSACTION_TABLE_PAGE_SIZE);

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No transactions found"
        message="There are no transactions recorded within the chosen date range."
      />
    );
  }

  const displayedRows = rows.slice(0, visibleCount);
  const hasMore = visibleCount < rows.length;

  return (
    <div className="report-table-container">
      <div className="report-table-wrapper">
        <table className="report-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Category</th>
              <th>Type</th>
              <th className="report-table__amount">Amount</th>
            </tr>
          </thead>
          <tbody>
            {displayedRows.map((row) => {
              const isIncome = row.type === 'income';
              return (
                <tr key={row.id}>
                  <td>{row.dateLabel}</td>
                  <td className="report-table__desc">{row.description}</td>
                  <td>{row.categoryName}</td>
                  <td>
                    <span className={`badge badge--${isIncome ? 'income' : 'expense'}`}>
                      {row.typeLabel}
                    </span>
                  </td>
                  <td className={`report-table__amount amount--${isIncome ? 'income' : 'expense'}`}>
                    {isIncome ? '+' : '−'}
                    {row.amountLabel}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="report-table-pagination">
        <span>
          Showing {displayedRows.length} of {rows.length} records
        </span>
        {hasMore && (
          <button
            type="button"
            className="button button--secondary"
            onClick={() => setVisibleCount((prev) => prev + TRANSACTION_TABLE_PAGE_SIZE)}
          >
            Show more
          </button>
        )}
      </div>
    </div>
  );
}
