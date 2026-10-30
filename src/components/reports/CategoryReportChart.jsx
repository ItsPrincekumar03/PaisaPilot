import { Doughnut } from 'react-chartjs-2';
import '../charts/registerCharts.js';
import EmptyState from '../common/EmptyState.jsx';
import { formatINR } from '../../utils/currency.js';
import { formatTenthsPercent } from '../../utils/reportCalculations.js';

export default function CategoryReportChart({ categoryBreakdown = [] }) {
  if (categoryBreakdown.length === 0) {
    return (
      <EmptyState
        title="No expense categories"
        message="Category spending appears once expense transactions exist in this period."
      />
    );
  }

  const total = categoryBreakdown.reduce((sum, item) => sum + item.amountPaise, 0);

  const chartData = {
    labels: categoryBreakdown.map((item) => item.name),
    datasets: [
      {
        data: categoryBreakdown.map((item) => item.amountPaise / 100),
        backgroundColor: categoryBreakdown.map((item) => item.color),
        borderColor: '#FFFFFF',
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '60%',
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => `${context.label}: ${formatINR(Math.round(context.parsed * 100))}`,
        },
      },
    },
  };

  return (
    <>
      <div
        className="chart-box"
        role="img"
        aria-label={`Doughnut chart showing expense distribution by category. Total ${formatINR(total)}.`}
      >
        <Doughnut data={chartData} options={options} />
      </div>
      <ul className="category-legend">
        {categoryBreakdown.map((item) => (
          <li key={item.name} className="category-legend__item">
            <span className="category-dot" style={{ backgroundColor: item.color }} aria-hidden="true" />
            <span className="category-legend__name">{item.name}</span>
            <span className="category-legend__value">
              {formatINR(item.amountPaise)} · {formatTenthsPercent(item.percentTenths)}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
