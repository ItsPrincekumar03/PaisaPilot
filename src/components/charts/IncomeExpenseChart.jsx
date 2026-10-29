import { Bar } from 'react-chartjs-2';
import './registerCharts.js';
import EmptyState from '../common/EmptyState.jsx';
import { formatINR } from '../../utils/currency.js';
import { formatMonthLabel } from '../../utils/dates.js';
import { CHART_COLORS } from '../../utils/chartColors.js';

export default function IncomeExpenseChart({ data }) {
  const hasData = data.some((month) => month.incomePaise > 0 || month.expensePaise > 0);

  if (!hasData) {
    return (
      <EmptyState
        title="No monthly totals yet"
        message="The income and expense comparison appears once transactions exist."
      />
    );
  }

  const latest = data[data.length - 1];

  const chartData = {
    labels: data.map((month) => formatMonthLabel(month.monthKey)),
    datasets: [
      {
        label: 'Income',
        data: data.map((month) => month.incomePaise / 100),
        backgroundColor: CHART_COLORS.income,
        borderRadius: 6,
      },
      {
        label: 'Expenses',
        data: data.map((month) => month.expensePaise / 100),
        backgroundColor: CHART_COLORS.expense,
        borderRadius: 6,
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
    <>
      <div
        className="chart-box"
        role="img"
        aria-label={`Bar chart comparing monthly income and expenses for the last ${data.length} months.`}
      >
        <Bar data={chartData} options={options} />
      </div>
      <p className="chart-caption">
        Latest month ({formatMonthLabel(latest.monthKey)}): income {formatINR(latest.incomePaise)},
        expenses {formatINR(latest.expensePaise)}.
      </p>
    </>
  );
}
