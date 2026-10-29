import PeriodSelector from './PeriodSelector.jsx';

export default function DashboardToolbar({
  availablePeriods = [],
  selectedPeriod,
  onSelectPeriod,
  viewMode = 'demo',
  onSelectViewMode,
  isLoading = false,
}) {
  return (
    <div className="dashboard-toolbar" role="region" aria-label="Dashboard controls">
      <PeriodSelector
        periods={availablePeriods}
        selectedPeriod={selectedPeriod}
        onSelectPeriod={onSelectPeriod}
        disabled={isLoading || viewMode !== 'demo'}
      />

      <div className="dashboard-toolbar__modes" role="group" aria-label="Data preview modes">
        <span className="dashboard-toolbar__modes-label">Preview state:</span>
        <div className="segmented-control">
          <button
            type="button"
            className={`segmented-control__button ${viewMode === 'demo' ? 'is-active' : ''}`}
            onClick={() => onSelectViewMode('demo')}
            aria-pressed={viewMode === 'demo'}
          >
            Active data
          </button>
          <button
            type="button"
            className={`segmented-control__button ${viewMode === 'empty' ? 'is-active' : ''}`}
            onClick={() => onSelectViewMode('empty')}
            aria-pressed={viewMode === 'empty'}
          >
            New user (empty)
          </button>
          <button
            type="button"
            className={`segmented-control__button ${viewMode === 'error' ? 'is-active' : ''}`}
            onClick={() => onSelectViewMode('error')}
            aria-pressed={viewMode === 'error'}
          >
            Simulate error
          </button>
        </div>
      </div>
    </div>
  );
}
