import Icon from '../common/Icon.jsx';

export default function SummaryCard({ tone = 'primary', icon, label, value, helper }) {
  return (
    <article className={`summary-card summary-card--${tone}`}>
      <div className="summary-card__header">
        <span className="summary-card__label">{label}</span>
        <span className="summary-card__icon" aria-hidden="true">
          <Icon name={icon} />
        </span>
      </div>
      <p className="summary-card__value">{value ?? '—'}</p>
      {helper ? <p className="summary-card__helper">{helper}</p> : null}
    </article>
  );
}
