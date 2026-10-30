import { useState } from 'react';
import '../../styles/budgets.css';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import LoadingState from '../../components/common/LoadingState.jsx';
import PeriodSelector from '../../components/dashboard/PeriodSelector.jsx';
import BudgetOverview from '../../components/budgets/BudgetOverview.jsx';
import BudgetCard from '../../components/budgets/BudgetCard.jsx';
import BudgetForm from '../../components/budgets/BudgetForm.jsx';
import BudgetInsights from '../../components/budgets/BudgetInsights.jsx';
import BudgetHistory from '../../components/budgets/BudgetHistory.jsx';
import DeleteBudgetDialog from '../../components/budgets/DeleteBudgetDialog.jsx';
import useBudgetManager from '../../hooks/useBudgetManager.js';
import { DEMO_MONTH_KEY } from '../../data/demoData.js';
import { BUDGET_HISTORY_MONTH_COUNT } from '../../utils/budgetConstants.js';
import { buildBudgetInsights } from '../../utils/budgetCalculations.js';
import { formatMonthLabel, getRecentMonthKeys } from '../../utils/dates.js';

const MONTH_KEYS_NEWEST_FIRST = getRecentMonthKeys(DEMO_MONTH_KEY, BUDGET_HISTORY_MONTH_COUNT).reverse();
const PERIOD_OPTIONS = MONTH_KEYS_NEWEST_FIRST.map((key) => ({ value: key, label: formatMonthLabel(key) }));

export default function BudgetPage() {
  const [selectedMonthKey, setSelectedMonthKey] = useState(DEMO_MONTH_KEY);
  const [formState, setFormState] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    status,
    error,
    isSampleData,
    notice,
    budgets,
    categories,
    rows,
    summary,
    history,
    retry,
    saveBudget,
    removeBudget,
  } = useBudgetManager({ monthKey: selectedMonthKey, historyMonthKeys: MONTH_KEYS_NEWEST_FIRST });

  const monthLabel = formatMonthLabel(selectedMonthKey);
  const monthBudgets = budgets.filter((budget) => budget.monthKey === selectedMonthKey);
  const insights = buildBudgetInsights({ rows, summary, monthLabel });

  async function handleSave(payload) {
    setIsSaving(true);
    const saved = await saveBudget(payload);
    setIsSaving(false);
    if (saved) setFormState(null);
    return saved;
  }

  async function handleConfirmDelete() {
    setIsDeleting(true);
    const deleted = await removeBudget(pendingDelete.budgetId);
    setIsDeleting(false);
    if (deleted) setPendingDelete(null);
  }

  function openCreateForm() {
    setFormState({ mode: 'create' });
  }

  function openEditForm(row) {
    setFormState({ mode: 'edit', budget: row });
  }

  return (
    <div className="budgets-page">
      <section className="panel">
        <div className="budgets-page__heading">
          <div>
            <h2>Monthly budgets</h2>
            <p>Set a monthly limit for each expense category and see how much you have used.</p>
          </div>
          <PeriodSelector
            value={selectedMonthKey}
            options={PERIOD_OPTIONS}
            onChange={setSelectedMonthKey}
            disabled={status === 'loading'}
          />
        </div>
      </section>

      {isSampleData ? (
        <p className="budget-notice">
          Spending figures come from sample transaction data until Module 5 is connected. Budgets are kept for this
          session only and are not saved to your account yet.
        </p>
      ) : (
        <p className="budget-notice">Budgets are kept for this session only and are not saved to your account yet.</p>
      )}

      {notice && (
        <p className={`budget-message budget-message--${notice.type}`} role="status">
          {notice.text}
        </p>
      )}

      {status === 'loading' && (
        <section className="panel" aria-busy="true">
          <LoadingState label="Loading budgets..." />
        </section>
      )}

      {status === 'error' && <ErrorState message={error} onRetry={retry} />}

      {status === 'ready' && (
        <>
          <section aria-labelledby="budget-overview-heading">
            <h2 id="budget-overview-heading" className="sr-only">
              Overview for {monthLabel}
            </h2>
            <BudgetOverview summary={summary} />
          </section>

          <div className="budgets-page__actions">
            <button type="button" className="button" onClick={openCreateForm} disabled={formState !== null}>
              Add category budget
            </button>
          </div>

          {formState && (
            <section className="panel" aria-labelledby="budget-form-heading">
              <div className="panel__header">
                <h3 id="budget-form-heading">
                  {formState.mode === 'edit' ? 'Edit monthly budget' : 'Add a category budget'}
                </h3>
              </div>
              <BudgetForm
                key={`${formState.mode}-${formState.budget?.budgetId ?? 'new'}-${selectedMonthKey}`}
                mode={formState.mode}
                monthKey={selectedMonthKey}
                monthLabel={monthLabel}
                categories={categories}
                monthBudgets={monthBudgets}
                initialBudget={formState.budget ?? null}
                isSaving={isSaving}
                onSubmit={handleSave}
                onCancel={() => setFormState(null)}
              />
            </section>
          )}

          <section className="panel" aria-labelledby="budget-list-heading">
            <div className="panel__header">
              <h3 id="budget-list-heading">Category budgets for {monthLabel}</h3>
            </div>
            {rows.length === 0 ? (
              <EmptyState
                title="No budgets for this month"
                message="Add a monthly limit for an expense category to start tracking spending."
              />
            ) : (
              <div className="budget-list">
                {rows.map((row) => (
                  <BudgetCard key={row.budgetId} row={row} onEdit={openEditForm} onDelete={setPendingDelete} />
                ))}
              </div>
            )}
          </section>

          <BudgetInsights insights={insights} />
          <BudgetHistory history={history} />
        </>
      )}

      {pendingDelete && (
        <DeleteBudgetDialog
          row={pendingDelete}
          isDeleting={isDeleting}
          onConfirm={handleConfirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
