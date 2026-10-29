export default function ActiveFilterChips({ chips = [], onRemove }) {
  if (chips.length === 0) return null;

  return (
    <div className="active-filters" aria-label="Active filters">
      <ul className="active-filters__list">
        {chips.map((chip) => (
          <li key={chip.key}>
            <button
              type="button"
              className="active-filters__chip"
              onClick={() => onRemove(chip.key)}
              aria-label={`Remove filter: ${chip.label}`}
            >
              {chip.label} <span aria-hidden="true">x</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
