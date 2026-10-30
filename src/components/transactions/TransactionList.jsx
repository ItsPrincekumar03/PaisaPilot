import { formatINR } from '../../utils/currency.js';
import { formatDisplayDate } from '../../utils/dates.js';

const SEPARATOR = '\u00B7';

export default function TransactionList({
  transactions = [],
  categories = [],
  onEdit,
  onDelete,
}) {
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const showActions = Boolean(onEdit || onDelete);

  return (
    <ul className="transaction-list transaction-list--full">
      {transactions.map((transaction) => {
        const category = categoryById.get(transaction.categoryId);
        const isIncome = transaction.type === 'income';

        return (
          <li key={transaction.id} className="transaction-item">
            <div className="transaction-item__main">
              <p className="transaction-item__description">{transaction.description}</p>
              <p className="transaction-item__meta">
                <span
                  className="category-dot"
                  style={{ backgroundColor: category?.color ?? '#A9A6BF' }}
                  aria-hidden="true"
                />
                <span>{category?.name ?? 'Uncategorized'}</span>
                <span aria-hidden="true">{SEPARATOR}</span>
                <time dateTime={transaction.date}>{formatDisplayDate(transaction.date)}</time>
              </p>
            </div>

            <div className="transaction-item__side">
              <span className={`badge badge--${isIncome ? 'income' : 'expense'}`}>
                {isIncome ? 'Income' : 'Expense'}
              </span>
              <span className={`amount amount--${isIncome ? 'income' : 'expense'}`}>
                {isIncome ? '+' : '-'}
                {formatINR(transaction.amountPaise)}
              </span>

              {showActions && (
                <div className="transaction-item__actions">
                  {onEdit && (
                    <button
                      type="button"
                      className="button button--secondary button--small"
                      onClick={() => onEdit(transaction)}
                      aria-label={`Edit ${transaction.description}`}
                    >
                      Edit
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      className="button button--danger button--small"
                      onClick={() => onDelete(transaction)}
                      aria-label={`Delete ${transaction.description}`}
                    >
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}