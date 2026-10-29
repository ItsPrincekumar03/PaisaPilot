/** Returns transactions whose date falls in the given "YYYY-MM" month. */
export function filterByMonth(transactions, monthKey) {
  return transactions.filter((transaction) => transaction.date.startsWith(`${monthKey}-`));
}

/** Sum of amountPaise for transactions of one type ("income" or "expense"). */
export function sumByType(transactions, type) {
  return transactions.reduce(
    (total, transaction) => (transaction.type === type ? total + transaction.amountPaise : total),
    0
  );
}

/** Newest first. Returns a new array and does not mutate the input. */
export function sortByDateDesc(transactions) {
  return [...transactions].sort((a, b) => b.date.localeCompare(a.date));
}

/** Income and expense totals for each month key, in the order given. */
export function getMonthlyTotals(transactions, monthKeys) {
  return monthKeys.map((monthKey) => {
    const monthTransactions = filterByMonth(transactions, monthKey);
    return {
      monthKey,
      incomePaise: sumByType(monthTransactions, 'income'),
      expensePaise: sumByType(monthTransactions, 'expense'),
    };
  });
}

/** Expense totals per category, excluding categories with no spending. */
export function getExpenseByCategory(transactions, categories) {
  return categories
    .map((category) => ({
      categoryId: category.id,
      name: category.name,
      color: category.color,
      amountPaise: transactions
        .filter((transaction) => transaction.type === 'expense' && transaction.categoryId === category.id)
        .reduce((total, transaction) => total + transaction.amountPaise, 0),
    }))
    .filter((item) => item.amountPaise > 0);
}

/**
 * Budget status for a monthly limit.
 * status: 'none' (no valid limit), 'ok', 'warning' (80%+ used), or 'over' (spent more than the limit).
 * Division is guarded so a zero or missing limit never causes a division error.
 */
export function getBudgetStatus(limitPaise, spentPaise) {
  if (!Number.isInteger(limitPaise) || limitPaise <= 0) {
    return { status: 'none', usagePercent: 0, remainingPaise: 0 };
  }

  const usagePercent = (spentPaise / limitPaise) * 100;
  const remainingPaise = limitPaise - spentPaise;

  let status = 'ok';
  if (spentPaise > limitPaise) {
    status = 'over';
  } else if (usagePercent >= 80) {
    status = 'warning';
  }

  return { status, usagePercent, remainingPaise };
}
