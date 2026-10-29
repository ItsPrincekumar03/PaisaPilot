export default function PeriodSelector({
  periods = [],
  selectedPeriod,
  onSelectPeriod,
  disabled = false,
}) {
  return (
    <div className="period-selector">
      <label htmlFor="dashboard-period-select" className="period-selector__label">
        Period:
      </label>
      <select
        id="dashboard-period-select"
        className="period-selector__select"
        value={selectedPeriod}
        disabled={disabled}
        onChange={(e) => onSelectPeriod(e.target.value)}
        aria-label="Select financial period"
      >
        {periods.map((period) => (
          <option key={period.key} value={period.key}>
            {period.label}
          </option>
        ))}
      </select>
    </div>
  );
}
