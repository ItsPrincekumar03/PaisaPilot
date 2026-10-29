import { useEffect, useMemo, useState } from 'react';
import '../../styles/transactions.css';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import LoadingState from '../../components/common/LoadingState.jsx';
import TransactionFilters from '../../components/transactions/TransactionFilters.jsx';
import ActiveFilterChips from '../../components/transactions/ActiveFilterChips.jsx';
import TransactionList from '../../components/transactions/TransactionList.jsx';
import useTransactionFilters from '../../hooks/useTransactionFilters.js';
import { fetchTransactions } from '../../services/transactionService.js';
import {
  EMPTY_FILTERS,
  applyTransactionFilters,
  getActiveFilterChips,
} from '../../utils/transactionFilters.js';

export default function TransactionsPage() {
  const [state, setState] = useState({
    status: 'loading',
    transactions: [],
    categories: [],
    error: null,
  });
  const [reloadKey, setReloadKey] = useState(0);

  const { filters, errors, hasErrors, hasActiveFilters, updateFilter, clearFilters } =
    useTransactionFilters();

  useEffect(() => {
    let isActive = true;

    fetchTransactions()
      .then((data) => {
        if (isActive) {
          setState({
            status: 'ready',
            transactions: data.transactions,
            categories: data.categories,
            error: null,
          });
        }
      })
      .catch((error) => {
        if (isActive) {
          setState({ status: 'error', transactions: [], categories: [], error: error.message });
        }
      });

    return () => {
      isActive = false;
    };
  }, [reloadKey]);

  const { status, transactions, categories, error } = state;

  const visibleTransactions = useMemo(
    () => applyTransactionFilters(transactions, filters),
    [transactions, filters]
  );

  const chips = useMemo(() => getActiveFilterChips(filters, categories), [filters, categories]);

  function handleRetry() {
    setState((previous) => ({ ...previous, status: 'loading', error: null }));
    setReloadKey((key) => key + 1);
  }

  function handleRemoveChip(key) {
    updateFilter(key, EMPTY_FILTERS[key]);
  }

  function renderResults() {
    if (status === 'loading') {
      return <LoadingState label="Loading transactions..." />;
    }

    if (status === 'error') {
      return <ErrorState message={error} onRetry={handleRetry} />;
    }

    if (hasErrors) {
      return (
        <EmptyState
          title="Check your filters"
          message="Fix the highlighted filter values to see matching transactions."
        />
      );
    }

    if (transactions.length === 0) {
      return (
        <EmptyState
          title="No transactions yet"
          message="Transactions will appear here once they are recorded."
        />
      );
    }

    if (visibleTransactions.length === 0) {
      return (
        <EmptyState
          title="No matching transactions"
          message="No transactions match the selected filters. Try changing or clearing them."
        >
          {hasActiveFilters && (
            <button type="button" className="button button--secondary" onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </EmptyState>
      );
    }

    return <TransactionList transactions={visibleTransactions} categories={categories} />;
  }

  return (
    <div className="transactions-page">
      <section className="panel transactions-page__intro">
        <h2>Transactions</h2>
        <p>
          Showing sample data until transactions are connected. Filters run on the list below.
        </p>
      </section>

      <TransactionFilters
        filters={filters}
        errors={errors}
        categories={categories}
        onChange={updateFilter}
        onClear={clearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      <ActiveFilterChips chips={chips} onRemove={handleRemoveChip} />

      {status === 'ready' && !hasErrors && (
        <p className="transactions-page__count" aria-live="polite">
          Showing {visibleTransactions.length} of {transactions.length} transactions
        </p>
      )}

      <section className="panel" aria-label="Transaction results">
        {renderResults()}
      </section>
    </div>
  );
}
