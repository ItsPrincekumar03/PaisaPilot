import DemoBanner from '../../components/common/DemoBanner.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import LoadingState from '../../components/common/LoadingState.jsx';
import SummaryCard from '../../components/dashboard/SummaryCard.jsx';
import RecentTransactions from '../../components/dashboard/RecentTransactions.jsx';
import BudgetProgress from '../../components/dashboard/BudgetProgress.jsx';
import IncomeExpenseChart from '../../components/charts/IncomeExpenseChart.jsx';
import CategoryChart from '../../components/charts/CategoryChart.jsx';
import DashboardToolbar from '../../components/dashboard/DashboardToolbar.jsx';
import { useDashboardData } from '../../hooks/useDashboardData.js';
import { formatINR } from '../../utils/currency.js';

export default function DashboardPage() {
  const {
    isLoading,
    isError,
    data,
    error,
    selectedMonthKey,
    setSelectedMonthKey,
    viewMode,
    setViewMode,
    refetch,
  } = useDashboardData();

  const availablePeriods = data?.availablePeriods ?? [];

  return (
    <>
      <DashboardToolbar
        availablePeriods={availablePeriods}
        selectedPeriod={selectedMonthKey}
        onSelectPeriod={setSelectedMonthKey}
        viewMode={viewMode}
        onSelectViewMode={setViewMode}
        isLoading={isLoading}
      />

      {data?.isDemo && <DemoBanner />}

      {isLoading && (
        <section className="panel dashboard-loading-panel" aria-busy="true">
          <LoadingState label="Loading your financial dashboard…" />
        </section>
      )}

      {isError && (
        <section className="dashboard-error-container">
          <ErrorState
            title="Unable to load financial dashboard"
            message={error?.message || 'An error occurred while loading your financial overview.'}
            onRetry={refetch}
          />
        </section>
      )}

      {!isLoading && !isError && data && (
        <>
          {data.isEmpty && (
            <div className="empty-user-notice" role="status">
              <p>
                <strong>Welcome to PaisaPilot!</strong> You do not have any transactions or active budgets
                recorded yet for {data.monthLabel}. Transactions and insights will appear here once recorded.
              </p>
            </div>
          )}

          <section aria-labelledby="summary-heading">
            <h2 id="summary-heading" className="sr-only">
              Summary for {data.monthLabel}
            </h2>
            <div className="summary-grid">
              <SummaryCard
                tone="income"
                icon="income"
                label="Total income"
                value={formatINR(data.summary.totalIncomePaise)}
                helper={data.isDemo ? `Demo · ${data.monthLabel}` : data.monthLabel}
              />
              <SummaryCard
                tone="expense"
                icon="expense"
                label="Total expenses"
                value={formatINR(data.summary.totalExpensesPaise)}
                helper={data.isDemo ? `Demo · ${data.monthLabel}` : data.monthLabel}
              />
              <SummaryCard
                tone={data.summary.netBalancePaise >= 0 ? 'balance' : 'expense'}
                icon="wallet"
                label="Net balance"
                value={formatINR(data.summary.netBalancePaise)}
                helper={
                  data.summary.netBalancePaise >= 0
                    ? 'Income is higher than expenses'
                    : 'Expenses are higher than income'
                }
              />
              <SummaryCard
                tone="budget"
                icon="target"
                label="Budget used"
                value={
                  data.summary.budgetStatus === 'none'
                    ? 'No budget'
                    : `${Math.round(data.summary.budgetUsagePercent)}%`
                }
                helper={
                  data.summary.budgetStatus === 'over'
                    ? `Over by ${formatINR(Math.abs(data.summary.remainingBudgetPaise))}`
                    : data.summary.budgetStatus !== 'none'
                    ? `${formatINR(data.summary.remainingBudgetPaise)} remaining`
                    : 'No monthly limit configured'
                }
              />
            </div>
          </section>

          <div className="grid-two">
            <section className="panel" aria-labelledby="trend-heading">
              <div className="panel__header">
                <h2 id="trend-heading">Income vs expenses</h2>
                <p className="panel__subtitle">
                  Last 6 months {data.isDemo ? '· demo data' : ''}
                </p>
              </div>
              <IncomeExpenseChart data={data.monthlyTotals} />
            </section>

            <section className="panel" aria-labelledby="category-heading">
              <div className="panel__header">
                <h2 id="category-heading">Expenses by category</h2>
                <p className="panel__subtitle">
                  {data.monthLabel} {data.isDemo ? '· demo data' : ''}
                </p>
              </div>
              <CategoryChart data={data.expenseByCategory} />
            </section>
          </div>

          <div className="grid-two">
            <section className="panel" aria-labelledby="budget-heading">
              <div className="panel__header">
                <h2 id="budget-heading">Monthly budget</h2>
                <p className="panel__subtitle">
                  {data.monthLabel} {data.isDemo ? '· demo data' : ''}
                </p>
              </div>
              <BudgetProgress
                limitPaise={data.budget?.limitPaise}
                spentPaise={data.budget?.spentPaise ?? 0}
              />
            </section>

            <section className="panel" aria-labelledby="recent-heading">
              <div className="panel__header">
                <h2 id="recent-heading">Recent transactions</h2>
                <p className="panel__subtitle">
                  Newest first {data.isDemo ? '· demo data' : ''}
                </p>
              </div>
              <RecentTransactions
                transactions={data.recentTransactions}
                categories={data.categories}
              />
            </section>
          </div>
        </>
      )}
    </>
  );
}
