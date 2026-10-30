import { useEffect, useRef, useState } from 'react';
import {
  FREQUENCIES,
  SCHEDULE_STATUS,
  TRANSACTION_TYPES,
} from '../../features/recurring/recurringConstants.js';
import { validateSchedule } from '../../features/recurring/recurringValidation.js';
import { paiseToRupeeInput, todayIsoDate } from '../../features/transactions/transactionValidation.js';

const TYPE_LABELS = { income: 'Income', expense: 'Expense' };
const FREQUENCY_LABELS = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

function buildInitialForm(schedule, categories) {
  if (schedule) {
    return {
      type: schedule.type,
      amount: paiseToRupeeInput(schedule.amountPaise),
      description: schedule.description,
      categoryId: schedule.categoryId,
      frequency: schedule.frequency,
      startDate: schedule.startDate,
      endDate: schedule.endDate || '',
    };
  }

  const firstExpense = categories.find((c) => c.type === 'expense');
  return {
    type: 'expense',
    amount: '',
    description: '',
    categoryId: firstExpense?.id ?? '',
    frequency: 'monthly',
    startDate: todayIsoDate(),
    endDate: '',
  };
}

export default function RecurringScheduleForm({
  categories = [],
  schedule = null,
  onSubmit,
  onCancel,
}) {
  const [form, setForm] = useState(() => buildInitialForm(schedule, categories));
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const headingRef = useRef(null);

  const isEditing = Boolean(schedule);
  const typeCategories = categories.filter((c) => c.type === form.type);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleTypeChange(nextType) {
    setForm((prev) => {
      const stillValid = categories.some((c) => c.id === prev.categoryId && c.type === nextType);
      const fallback = categories.find((c) => c.type === nextType);
      return {
        ...prev,
        type: nextType,
        categoryId: stillValid ? prev.categoryId : (fallback?.id ?? ''),
      };
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');

    const validation = validateSchedule(form, categories);
    if (validation.errors && Object.keys(validation.errors).length > 0) {
      setFieldErrors(validation.errors);
      return;
    }

    setFieldErrors({});
    setIsSaving(true);

    try {
      await onSubmit(form);
    } catch (err) {
      setFormError(err.message || 'Could not save recurring schedule.');
      setIsSaving(false);
    }
  }

  return (
    <section className="panel recurring-form-panel" aria-labelledby="schedule-form-heading">
      <div className="panel__header">
        <h2 id="schedule-form-heading" tabIndex="-1" ref={headingRef}>
          {isEditing ? 'Edit Recurring Schedule' : 'New Recurring Schedule'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} noValidate className="form-grid">
        {formError && (
          <div className="alert alert--danger" role="alert">
            {formError}
          </div>
        )}

        <div className="form-field">
          <label className="form-field__label">Type</label>
          <div className="segmented-control" role="radiogroup" aria-label="Transaction Type">
            {TRANSACTION_TYPES.map((type) => (
              <label
                key={type}
                className={`segmented-control__option ${form.type === type ? 'is-selected' : ''}`}
              >
                <input
                  type="radio"
                  name="type"
                  value={type}
                  checked={form.type === type}
                  onChange={() => handleTypeChange(type)}
                  className="visually-hidden"
                />
                <span>{TYPE_LABELS[type]}</span>
              </label>
            ))}
          </div>
          {fieldErrors.type && <p className="form-field__error">{fieldErrors.type}</p>}
        </div>

        <div className="form-field">
          <label htmlFor="recurring-amount" className="form-field__label">
            Amount (₹)
          </label>
          <input
            id="recurring-amount"
            name="amount"
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={form.amount}
            onChange={(e) => updateField('amount', e.target.value)}
            aria-invalid={Boolean(fieldErrors.amount)}
            className="input"
          />
          {fieldErrors.amount && <p className="form-field__error">{fieldErrors.amount}</p>}
        </div>

        <div className="form-field">
          <label htmlFor="recurring-category" className="form-field__label">
            Category
          </label>
          <select
            id="recurring-category"
            name="categoryId"
            value={form.categoryId}
            onChange={(e) => updateField('categoryId', e.target.value)}
            aria-invalid={Boolean(fieldErrors.categoryId)}
            className="input select"
          >
            <option value="">Select a category</option>
            {typeCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {fieldErrors.categoryId && <p className="form-field__error">{fieldErrors.categoryId}</p>}
        </div>

        <div className="form-field">
          <label htmlFor="recurring-frequency" className="form-field__label">
            Frequency
          </label>
          <select
            id="recurring-frequency"
            name="frequency"
            value={form.frequency}
            onChange={(e) => updateField('frequency', e.target.value)}
            aria-invalid={Boolean(fieldErrors.frequency)}
            className="input select"
          >
            {FREQUENCIES.map((f) => (
              <option key={f} value={f}>
                {FREQUENCY_LABELS[f]}
              </option>
            ))}
          </select>
          {fieldErrors.frequency && <p className="form-field__error">{fieldErrors.frequency}</p>}
        </div>

        <div className="form-field">
          <label htmlFor="recurring-start-date" className="form-field__label">
            Start Date
          </label>
          <input
            id="recurring-start-date"
            name="startDate"
            type="date"
            value={form.startDate}
            onChange={(e) => updateField('startDate', e.target.value)}
            aria-invalid={Boolean(fieldErrors.startDate)}
            className="input"
          />
          {fieldErrors.startDate && <p className="form-field__error">{fieldErrors.startDate}</p>}
        </div>

        <div className="form-field">
          <label htmlFor="recurring-end-date" className="form-field__label">
            End Date (Optional)
          </label>
          <input
            id="recurring-end-date"
            name="endDate"
            type="date"
            value={form.endDate}
            onChange={(e) => updateField('endDate', e.target.value)}
            aria-invalid={Boolean(fieldErrors.endDate)}
            className="input"
          />
          {fieldErrors.endDate && <p className="form-field__error">{fieldErrors.endDate}</p>}
        </div>

        <div className="form-field form-field--full">
          <label htmlFor="recurring-description" className="form-field__label">
            Description
          </label>
          <input
            id="recurring-description"
            name="description"
            type="text"
            placeholder="e.g. Monthly Netflix subscription"
            value={form.description}
            onChange={(e) => updateField('description', e.target.value)}
            aria-invalid={Boolean(fieldErrors.description)}
            className="input"
          />
          {fieldErrors.description && <p className="form-field__error">{fieldErrors.description}</p>}
        </div>

        <div className="form-actions form-field--full">
          <button type="button" onClick={onCancel} className="button button--secondary" disabled={isSaving}>
            Cancel
          </button>
          <button type="submit" className="button" disabled={isSaving}>
            {isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Schedule'}
          </button>
        </div>
      </form>
    </section>
  );
}
