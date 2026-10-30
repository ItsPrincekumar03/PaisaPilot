import PeriodSelector from './PeriodSelector.jsx';

const MODE_OPTIONS = [
  { value: 'active', label: 'Live data' },
  { value: 'demo', label: 'Demo data' },
  { value: 'empty', label: 'New user (empty)' },
  { value: 'error', label: 'Simulate error' },
];

export default function DashboardToolbar({
  availablePeriods = [],
  selectedPeriod,
  onSelectPeriod,
  viewMode = 'active',
  onSelectViewMode,
  isLoading = false,
}) {
  return (
    <div className="dashboard-toolbar" role="region" aria-label="Dashboard controls">
      <PeriodSelector
        periods={availablePeriods}
        selectedPeriod={selectedPeriod}
        onSelectPeriod={onSelectPeriod}
        disabled={isLoading}
      />

      <div className="dashboard-toolbar__modes" role="group" aria-label="Data source">
        <span className="dashboard-toolbar__modes-label">Data source:</span>
        <div className="segmented-control">
          {MODE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`segmented-control__button ${viewMode === option.value ? 'is-active' : ''}`}
              onClick={() => onSelectViewMode(option.value)}
              aria-pressed={viewMode === option.value}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}