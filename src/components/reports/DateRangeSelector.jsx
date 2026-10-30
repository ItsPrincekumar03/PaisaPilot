import { REPORT_PRESETS } from '../../utils/reportsConstants.js';

export default function DateRangeSelector({
  preset,
  startDate,
  endDate,
  errors = {},
  onSelectPreset,
  onChangeStartDate,
  onChangeEndDate,
  disabled = false,
}) {
  return (
    <div className="report-range-selector">
      <div className="report-range-selector__presets">
        <label htmlFor="report-preset-select" className="report-range-selector__label">
          Period Preset:
        </label>
        <select
          id="report-preset-select"
          className="report-range-selector__select"
          value={preset}
          disabled={disabled}
          onChange={(e) => onSelectPreset(e.target.value)}
        >
          {REPORT_PRESETS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div className="report-range-selector__custom">
        <div className="report-range-field">
          <label htmlFor="report-start-date">From:</label>
          <input
            id="report-start-date"
            type="date"
            value={startDate}
            disabled={disabled || preset !== 'custom'}
            onChange={(e) => onChangeStartDate(e.target.value)}
            aria-invalid={Boolean(errors.startDate || errors.range)}
          />
          {errors.startDate && <span className="report-field-error">{errors.startDate}</span>}
        </div>

        <div className="report-range-field">
          <label htmlFor="report-end-date">To:</label>
          <input
            id="report-end-date"
            type="date"
            value={endDate}
            disabled={disabled || preset !== 'custom'}
            onChange={(e) => onChangeEndDate(e.target.value)}
            aria-invalid={Boolean(errors.endDate || errors.range)}
          />
          {errors.endDate && <span className="report-field-error">{errors.endDate}</span>}
        </div>
      </div>

      {errors.range && <div className="report-range-error">{errors.range}</div>}
    </div>
  );
}
