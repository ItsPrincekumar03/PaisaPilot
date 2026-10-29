import DemoBanner from '../../components/common/DemoBanner.jsx';
import SummaryCard from '../../components/dashboard/SummaryCard.jsx';
import RecentTransactions from '../../components/dashboard/RecentTransactions.jsx';
import BudgetProgress from '../../components/dashboard/BudgetProgress.jsx';
import IncomeExpenseChart from '../../components/charts/IncomeExpenseChart.jsx';
import CategoryChart from '../../components/charts/CategoryChart.jsx';
import {
  DEMO_CATEGORIES,
  DEMO_MONTH_KEY,
  DEMO_MONTHLY_BUDGET_PAISE,
  DEMO_TRANSACTIONS,
} from '../../data/demoData.js';
import {
  filterByMonth,
  getBudgetStatus,
  getExpenseByCategory,
  getMonthlyTotals,
  sortByDateDesc,
  sumByType,
} from '../../utils/financeCalculations.js';
import { formatINR } from '../../utils/currency.js';
import { formatMonthLabel, getRecentMonthKeys } from '../../utils/dates.js';

export default function DashboardPage() {
  const monthLabel = formatMonthLabel(DEMO_MONTH_KEY);
  const monthTransactions = filterByMonth(DEMO_TRANSACTIONS, DEMO_MONTH_KEY);
  const totalIncome = sumByType(monthTransactions, 'income');
  const totalExpenses = sumByType(monthTransactions, 'expense');
  const netBalance = totalIncome - totalExpenses;
  const budget = getBudgetStatus(DEMO_MONTHLY_BUDGET_PAISE, totalExpenses);

  const monthlyTotals = getMonthlyTotals(
    DEMO_TRANSACTIONS,
    getRecentMonthKeys(DEMO_MONTH_KEY, 6)
  );
  const expenseByCategory = getExpenseByCategory(monthTransactions, DEMO_CATEGORIES);
  const recentTransactions = sortByDateDesc(DEMO_TRANSACTIONS).slice(0, 6);

  let budgetHelper = 'No monthly limit configured';
  if (budget.status === 'over') {
    budgetHelper = `Over by ${formatINR(Math.abs(budget.remainingPaise))}`;
  } else if (budget.status !== 'none') {
    budgetHelper = `${formatINR(budget.remainingPaise)} remaining`;
  }

  return (
    <>
      <DemoBanner />

      <section aria-labelledby="summary-heading">
        <h2 id="summary-heading" className="sr-only">
          Summary for {monthLabel}
        </h2>
        <div className="summary-grid">
          <SummaryCard
            tone="income"
            icon="income"
            label="Total income"
            value={formatINR(totalIncome)}
            helper={`Demo · ${monthLabel}`}
          />
          <SummaryCard
            tone="expense"
            icon="expense"
            label="Total expenses"
            value={formatINR(totalExpenses)}
            helper={`Demo · ${monthLabel}`}
          />
          <SummaryCard
            tone={netBalance >= 0 ? 'balance' : 'expense'}
            icon="wallet"
            label="Net balance"
            value={formatINR(netBalance)}
            helper={netBalance >= 0 ? 'Income is higher than expenses' : 'Expenses are higher than income'}
          />
          <SummaryCard
            tone="budget"
            icon="target"
            label="Budget used"
            value={budget.status === 'none' ? 'No budget' : `${Math.round(budget.usagePercent)}%`}
            helper={budgetHelper}
          />
        </div>
      </section>

      <div className="grid-two">
        <section className="panel" aria-labelledby="trend-heading">
          <div className="panel__header">
            <h2 id="trend-heading">Income vs expenses</h2>
            <p className="panel__subtitle">Last 6 months · demo data</p>
          </div>
          <IncomeExpenseChart data={monthlyTotals} />
        </section>

        <section className="panel" aria-labelledby="category-heading">
          <div className="panel__header">
            <h2 id="category-heading">Expenses by category</h2>
            <p className="panel__subtitle">{monthLabel} · demo data</p>
          </div>
          <CategoryChart data={expenseByCategory} />
        </section>
      </div>

      <div className="grid-two">
        <section className="panel" aria-labelledby="budget-heading">
          <div className="panel__header">
            <h2 id="budget-heading">Monthly budget</h2>
            <p className="panel__subtitle">{monthLabel} · demo data</p>
          </div>
          <BudgetProgress limitPaise={DEMO_MONTHLY_BUDGET_PAISE} spentPaise={totalExpenses} />
        </section>

        <section className="panel" aria-labelledby="recent-heading">
          <div className="panel__header">
            <h2 id="recent-heading">Recent transactions</h2>
            <p className="panel__subtitle">Newest first · demo data</p>
          </div>
          <RecentTransactions transactions={recentTransactions} categories={DEMO_CATEGORIES} />
        </section>
      </div>
    </>
  );
}
