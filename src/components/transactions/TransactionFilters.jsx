import CategoryFilter from './CategoryFilter.jsx';
import { TYPE_OPTIONS } from '../../utils/transactionFilters.js';

export default function TransactionFilters({
  filters,
  errors,
  categories,
  onChange,
  onClear,
  hasActiveFilters,
}) {
  const dateRangeError = errors.dateRange;

  return (
    <section className="panel transaction-filters" aria-labelledby="transaction-filters-heading">
      <h3 id="transaction-filters-heading">Filter transactions</h3>

      <form className="transaction-filters__grid" onSubmit={(event) => event.preventDefault()}>
        <div className="transaction-field transaction-field--wide">
          <label htmlFor="filter-search">Search description</label>
          <input
            id="filter-search"
            type="search"
            value={filters.search}
            placeholder="e.g. groceries"
            onChange={(event) => onChange('search', event.target.value)}
          />
        </div>

        <div className="transaction-field">
          <label htmlFor="filter-type">Type</label>
          <select
            id="filter-type"
            value={filters.type}
            onChange={(event) => onChange('type', event.target.value)}
          >
            {TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <CategoryFilter
          id="filter-category"
          categories={categories}
          value={filters.categoryId}
          onChange={(value) => onChange('categoryId', value)}
        />

        <div className="transaction-field">
          <label htmlFor="filter-start-date">Start date</label>
          <input
            id="filter-start-date"
            type="date"
            value={filters.startDate}
            aria-invalid={Boolean(errors.startDate || dateRangeError)}
            aria-describedby={errors.startDate ? 'filter-start-error' : undefined}
            onChange={(event) => onChange('startDate', event.target.value)}
          />
          {errors.startDate && (
            <span id="filter-start-error" className="transaction-field__error">
              {errors.startDate}
            </span>
          )}
        </div>

        <div className="transaction-field">
          <label htmlFor="filter-end-date">End date</label>
          <input
            id="filter-end-date"
            type="date"
            value={filters.endDate}
            aria-invalid={Boolean(errors.endDate || dateRangeError)}
            aria-describedby={errors.endDate ? 'filter-end-error' : undefined}
            onChange={(event) => onChange('endDate', event.target.value)}
          />
          {errors.endDate && (
            <span id="filter-end-error" className="transaction-field__error">
              {errors.endDate}
            </span>
          )}
        </div>

        <div className="transaction-field">
          <label htmlFor="filter-min-amount">Min amount (INR)</label>
          <input
            id="filter-min-amount"
            type="text"
            inputMode="decimal"
            value={filters.minAmount}
            placeholder="0"
            aria-invalid={Boolean(errors.minAmount || errors.amountRange)}
            aria-describedby={errors.minAmount ? 'filter-min-error' : undefined}
            onChange={(event) => onChange('minAmount', event.target.value)}
          />
          {errors.minAmount && (
            <span id="filter-min-error" className="transaction-field__error">
              {errors.minAmount}
            </span>
          )}
        </div>

        <div className="transaction-field">
          <label htmlFor="filter-max-amount">Max amount (INR)</label>
          <input
            id="filter-max-amount"
            type="text"
            inputMode="decimal"
            value={filters.maxAmount}
            placeholder="No limit"
            aria-invalid={Boolean(errors.maxAmount || errors.amountRange)}
            aria-describedby={errors.maxAmount ? 'filter-max-error' : undefined}
            onChange={(event) => onChange('maxAmount', event.target.value)}
          />
          {errors.maxAmount && (
            <span id="filter-max-error" className="transaction-field__error">
              {errors.maxAmount}
            </span>
          )}
        </div>

        {(dateRangeError || errors.amountRange) && (
          <p className="transaction-field__error transaction-field--wide" role="alert">
            {dateRangeError || errors.amountRange}
          </p>
        )}

        <div className="transaction-filters__actions">
          <button
            type="button"
            className="button button--secondary"
            onClick={onClear}
            disabled={!hasActiveFilters}
          >
            Clear all filters
          </button>
        </div>
      </form>
    </section>
  );
}
