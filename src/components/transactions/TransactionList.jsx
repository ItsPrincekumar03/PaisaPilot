import { formatINR } from '../../utils/currency.js';
import { formatDisplayDate } from '../../utils/dates.js';

export default function TransactionList({ transactions = [], categories = [] }) {
  const categoryById = new Map(categories.map((category) => [category.id, category]));

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
                <span aria-hidden="true">-</span>
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
            </div>
          </li>
        );
      })}
    </ul>
  );
}
