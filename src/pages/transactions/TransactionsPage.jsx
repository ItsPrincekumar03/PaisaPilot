import { useCallback, useEffect, useMemo, useState } from 'react';
import '../../styles/transactions.css';
import '../../styles/transactionManagement.css';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import LoadingState from '../../components/common/LoadingState.jsx';
import TransactionFilters from '../../components/transactions/TransactionFilters.jsx';
import ActiveFilterChips from '../../components/transactions/ActiveFilterChips.jsx';
import TransactionList from '../../components/transactions/TransactionList.jsx';
import TransactionForm from '../../components/transactions/TransactionForm.jsx';
import DeleteConfirm from '../../components/transactions/DeleteConfirm.jsx';
import useTransactionFilters from '../../hooks/useTransactionFilters.js';
import {
  createTransaction,
  deleteTransaction,
  fetchTransactions,
  updateTransaction,
} from '../../services/transactionService.js';
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

  const [editor, setEditor] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [notice, setNotice] = useState('');

  const { filters, errors, hasErrors, hasActiveFilters, updateFilter, clearFilters } =
    useTransactionFilters();

  const reload = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

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
          setState({
            status: 'error',
            transactions: [],
            categories: [],
            error: error.message,
          });
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
    reload();
  }

  function handleRemoveChip(key) {
    updateFilter(key, EMPTY_FILTERS[key]);
  }

  function openAddForm() {
    setNotice('');
    setEditor({ transaction: null });
  }

  function openEditForm(transaction) {
    setNotice('');
    setEditor({ transaction });
  }

  function closeEditor() {
    setEditor(null);
  }

  async function handleSave(values) {
    const isEdit = Boolean(editor?.transaction);

    if (isEdit) {
      await updateTransaction(editor.transaction.id, values);
    } else {
      await createTransaction(values);
    }

    setEditor(null);
    setNotice(isEdit ? 'Transaction updated.' : 'Transaction added.');
    reload();
  }

  function openDelete(transaction) {
    setNotice('');
    setDeleteError('');
    setDeleteTarget(transaction);
  }

  const handleCancelDelete = useCallback(() => {
    if (!isDeleting) {
      setDeleteTarget(null);
      setDeleteError('');
    }
  }, [isDeleting]);

  async function handleConfirmDelete() {
    if (!deleteTarget || isDeleting) {
      return;
    }

    setIsDeleting(true);
    setDeleteError('');

    try {
      await deleteTransaction(deleteTarget.id);
      setDeleteTarget(null);
      setNotice('Transaction deleted.');
      reload();
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setIsDeleting(false);
    }
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
          message="Add your first income or expense to see it here."
        >
          <button
            type="button"
            className="button"
            onClick={openAddForm}
            disabled={editor !== null}
          >
            Add transaction
          </button>
        </EmptyState>
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

    return (
      <TransactionList
        transactions={visibleTransactions}
        categories={categories}
        onEdit={openEditForm}
        onDelete={openDelete}
      />
    );
  }

  const canAdd = status === 'ready' && editor === null;

  return (
    <div className="transactions-page">
      <section className="panel transactions-page__intro">
        <h2>Transactions</h2>
        <p>
          Your transactions are saved to your account. After each change, the list, filters, and
          dashboard update.
        </p>
      </section>

      <div className="transaction-page-actions">
        <button type="button" className="button" onClick={openAddForm} disabled={!canAdd}>
          Add transaction
        </button>
      </div>

      {notice && (
        <p className="transaction-notice" role="status">
          {notice}
        </p>
      )}

      {editor && (
        <section
          className="panel transaction-editor"
          aria-label={editor.transaction ? 'Edit transaction' : 'Add transaction'}
        >
          <TransactionForm
            key={editor.transaction?.id ?? 'new'}
            categories={categories}
            transaction={editor.transaction}
            onSubmit={handleSave}
            onCancel={closeEditor}
          />
        </section>
      )}

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

      {deleteTarget && (
        <DeleteConfirm
          transaction={deleteTarget}
          isDeleting={isDeleting}
          error={deleteError}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
        />
      )}
    </div>
  );
}