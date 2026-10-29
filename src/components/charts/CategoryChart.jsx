import { Doughnut } from 'react-chartjs-2';
import './registerCharts.js';
import EmptyState from '../common/EmptyState.jsx';
import { formatINR } from '../../utils/currency.js';

export default function CategoryChart({ data }) {
  if (data.length === 0) {
    return (
      <EmptyState
        title="No expenses this month"
        message="Expense categories appear here once expenses are recorded."
      />
    );
  }

  const total = data.reduce((sum, item) => sum + item.amountPaise, 0);

  const chartData = {
    labels: data.map((item) => item.name),
    datasets: [
      {
        data: data.map((item) => item.amountPaise / 100),
        backgroundColor: data.map((item) => item.color),
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
        aria-label={`Doughnut chart of expenses by category. Total ${formatINR(total)}.`}
      >
        <Doughnut data={chartData} options={options} />
      </div>
      <ul className="category-legend">
        {data.map((item) => (
          <li key={item.categoryId} className="category-legend__item">
            <span className="category-dot" style={{ backgroundColor: item.color }} aria-hidden="true" />
            <span className="category-legend__name">{item.name}</span>
            <span className="category-legend__value">
              {formatINR(item.amountPaise)} · {Math.round((item.amountPaise / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
