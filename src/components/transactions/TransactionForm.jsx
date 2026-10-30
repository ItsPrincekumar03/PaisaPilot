import { useEffect, useRef, useState } from 'react';
import {
  TRANSACTION_TYPES,
  paiseToRupeeInput,
  todayIsoDate,
  validateTransactionInput,
} from '../../features/transactions/transactionValidation.js';

const TYPE_LABELS = { income: 'Income', expense: 'Expense' };

function buildInitialForm(transaction, categories) {
  if (transaction) {
    return {
      type: transaction.type,
      amount: paiseToRupeeInput(transaction.amountPaise),
      description: transaction.description,
      categoryId: transaction.categoryId,
      date: transaction.date,
    };
  }

  const firstExpense = categories.find((category) => category.type === 'expense');
  return {
    type: 'expense',
    amount: '',
    description: '',
    categoryId: firstExpense?.id ?? '',
    date: todayIsoDate(),
  };
}

export default function TransactionForm({ categories = [], transaction = null, onSubmit, onCancel }) {
  const [form, setForm] = useState(() => buildInitialForm(transaction, categories));
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const headingRef = useRef(null);

  const isEditing = Boolean(transaction);
  const typeCategories = categories.filter((category) => category.type === form.type);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  function updateField(key, value) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  function handleTypeChange(nextType) {
    setForm((previous) => {
      const stillValid = categories.some(
        (category) => category.id === previous.categoryId && category.type === nextType
      );
      const fallback = categories.find((category) => category.type === nextType);
      return {
        ...previous,
        type: nextType,
        categoryId: stillValid ? previous.categoryId : (fallback?.id ?? ''),
      };
    });
    setFieldErrors((previous) => ({ ...previous, categoryId: undefined }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSaving) {
      return;
    }

    const { values, errors } = validateTransactionInput(form, categories);
    setFieldErrors(errors);
    setFormError('');
    if (!values) {
      return;
    }

    setIsSaving(true);
    try {
      await onSubmit(values);
    } catch (error) {
      setFormError(error?.message ?? 'Could not save the transaction. Please try again.');
      setIsSaving(false);
    }
  }

  return (
    <form className="transaction-form" onSubmit={handleSubmit} noValidate>
      <h3 ref={headingRef} tabIndex={-1} className="transaction-form__title">
        {isEditing ? 'Edit transaction' : 'Add transaction'}
      </h3>

      {formError && (
        <div className="form-message form-message--error" role="alert">
          {formError}
        </div>
      )}

      <fieldset className="transaction-form__type" disabled={isSaving}>
        <legend>Type</legend>
        <div className="type-options">
          {TRANSACTION_TYPES.map((type) => (
            <label
              key={type}
              className={`type-option type-option--${type} ${form.type === type ? 'is-selected' : ''}`}
            >
              <input
                type="radio"
                name="transaction-type"
                value={type}
                checked={form.type === type}
                onChange={() => handleTypeChange(type)}
              />
              <span>{TYPE_LABELS[type]}</span>
            </label>
          ))}
        </div>
        {fieldErrors.type && <p className="form-field__error">{fieldErrors.type}</p>}
      </fieldset>

      <div className="form-field">
        <label htmlFor="txn-amount">Amount (INR)</label>
        <input
          id="txn-amount"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="e.g. 499.50"
          value={form.amount}
          disabled={isSaving}
          aria-invalid={Boolean(fieldErrors.amount)}
          aria-describedby={fieldErrors.amount ? 'txn-amount-error' : undefined}
          onChange={(event) => updateField('amount', event.target.value)}
        />
        {fieldErrors.amount && (
          <p id="txn-amount-error" className="form-field__error">
            {fieldErrors.amount}
          </p>
        )}
      </div>

      <div className="form-field">
        <label htmlFor="txn-description">Description</label>
        <input
          id="txn-description"
          type="text"
          autoComplete="off"
          maxLength={200}
          placeholder="e.g. Weekly groceries"
          value={form.description}
          disabled={isSaving}
          aria-invalid={Boolean(fieldErrors.description)}
          aria-describedby={fieldErrors.description ? 'txn-description-error' : undefined}
          onChange={(event) => updateField('description', event.target.value)}
        />
        {fieldErrors.description && (
          <p id="txn-description-error" className="form-field__error">
            {fieldErrors.description}
          </p>
        )}
      </div>

      <div className="form-field">
        <label htmlFor="txn-category">Category</label>
        <select
          id="txn-category"
          value={form.categoryId}
          disabled={isSaving || typeCategories.length === 0}
          aria-invalid={Boolean(fieldErrors.categoryId)}
          aria-describedby={fieldErrors.categoryId ? 'txn-category-error' : undefined}
          onChange={(event) => updateField('categoryId', event.target.value)}
        >
          {typeCategories.length === 0 && <option value="">No categories for this type</option>}
          {typeCategories.length > 0 && !form.categoryId && (
            <option value="">Choose a category</option>
          )}
          {typeCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        {fieldErrors.categoryId && (
          <p id="txn-category-error" className="form-field__error">
            {fieldErrors.categoryId}
          </p>
        )}
      </div>

      <div className="form-field">
        <label htmlFor="txn-date">Date</label>
        <input
          id="txn-date"
          type="date"
          max={todayIsoDate()}
          value={form.date}
          disabled={isSaving}
          aria-invalid={Boolean(fieldErrors.date)}
          aria-describedby={fieldErrors.date ? 'txn-date-error' : undefined}
          onChange={(event) => updateField('date', event.target.value)}
        />
        {fieldErrors.date && (
          <p id="txn-date-error" className="form-field__error">
            {fieldErrors.date}
          </p>
        )}
      </div>

      <div className="transaction-form__actions">
        <button
          type="submit"
          className="button"
          disabled={isSaving}
          aria-busy={isSaving}
        >
          {isSaving ? 'Saving...' : isEditing ? 'Save changes' : 'Add transaction'}
        </button>
        <button
          type="button"
          className="button button--secondary"
          onClick={onCancel}
          disabled={isSaving}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}