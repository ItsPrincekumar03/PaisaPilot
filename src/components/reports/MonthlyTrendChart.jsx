import { Bar } from 'react-chartjs-2';
import '../charts/registerCharts.js';
import EmptyState from '../common/EmptyState.jsx';
import { formatINR } from '../../utils/currency.js';
import { CHART_COLORS } from '../../utils/chartColors.js';

export default function MonthlyTrendChart({ monthly = [] }) {
  const hasData = monthly.some((m) => m.incomePaise > 0 || m.expensePaise > 0);

  if (!hasData) {
    return (
      <EmptyState
        title="No monthly trend data"
        message="Monthly trends appear once transactions are recorded in this date range."
      />
    );
  }

  const chartData = {
    labels: monthly.map((m) => m.label),
    datasets: [
      {
        label: 'Income',
        data: monthly.map((m) => m.incomePaise / 100),
        backgroundColor: CHART_COLORS.income,
        borderRadius: 4,
      },
      {
        label: 'Expenses',
        data: monthly.map((m) => m.expensePaise / 100),
        backgroundColor: CHART_COLORS.expense,
        borderRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' },
      tooltip: {
        callbacks: {
          label: (context) =>
            `${context.dataset.label}: ${formatINR(Math.round(context.parsed.y * 100))}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => formatINR(Math.round(value * 100)),
        },
      },
    },
  };

  return (
    <div className="chart-box" role="img" aria-label="Monthly income vs expense trend chart">
      <Bar data={chartData} options={options} />
    </div>
  );
}
