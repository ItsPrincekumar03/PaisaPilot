export default function BudgetInsights({ insights }) {
  return (
    <section className="panel" aria-labelledby="budget-insights-heading">
      <div className="panel__header">
        <h3 id="budget-insights-heading">Monthly insights</h3>
        <p className="panel__subtitle">Calculated from the budgets and transactions shown on this page.</p>
      </div>
      <ul className="budget-insights">
        {insights.map((insight) => (
          <li key={insight.id} className={`budget-insight budget-insight--${insight.tone}`}>
            {insight.text}
          </li>
        ))}
      </ul>
    </section>
  );
}
