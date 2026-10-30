import { useState } from 'react';
import { formatPaiseAsInput, validateBudgetInput, validateLimitInput } from '../../utils/budgetValidation.js';

export default function BudgetForm({
  mode,
  monthKey,
  monthLabel,
  categories,
  monthBudgets,
  initialBudget = null,
  isSaving = false,
  onSubmit,
  onCancel,
}) {
  const isEdit = mode === 'edit';

  const categoryOptions = categories.filter(
    (category) =>
      category.type === 'expense' && !monthBudgets.some((budget) => budget.categoryId === category.id)
  );
  const noOptions = !isEdit && categoryOptions.length === 0;

  const [categoryId, setCategoryId] = useState(categoryOptions[0]?.id ?? '');
  const [limitInput, setLimitInput] = useState(isEdit ? formatPaiseAsInput(initialBudget.limitPaise) : '');
  const [errors, setErrors] = useState({});

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSaving) return;

    const result = isEdit
      ? validateLimitInput(limitInput)
      : validateBudgetInput({ monthKey, categoryId, limitInput }, { categories, existingBudgets: monthBudgets });

    setErrors(result.errors);
    if (Object.keys(result.errors).length > 0) return;

    await onSubmit({
      budgetId: isEdit ? initialBudget.budgetId : null,
      monthKey,
      categoryId: isEdit ? initialBudget.categoryId : categoryId,
      limitPaise: result.limitPaise,
    });
  }

  return (
    <form className="budget-form" onSubmit={handleSubmit} noValidate>
      <p className="budget-field__static">Month: {monthLabel}</p>

      {isEdit ? (
        <div className="budget-field">
          <p className="budget-field__static">Category: {initialBudget.categoryName}</p>
        </div>
      ) : (
        <div className="budget-field">
          <label htmlFor="budget-category">Expense category</label>
          <select
            id="budget-category"
            value={categoryId}
            disabled={noOptions}
            aria-invalid={Boolean(errors.categoryId)}
            aria-describedby={errors.categoryId ? 'budget-category-error' : undefined}
            onChange={(event) => setCategoryId(event.target.value)}
          >
            {noOptions && <option value="">No categories available</option>}
            {categoryOptions.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {errors.categoryId && (
            <span id="budget-category-error" className="budget-field__error">
              {errors.categoryId}
            </span>
          )}
        </div>
      )}

      <div className="budget-field">
        <label htmlFor="budget-limit">Monthly limit (INR)</label>
        <input
          id="budget-limit"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="e.g. 8000"
          value={limitInput}
          aria-invalid={Boolean(errors.limitInput)}
          aria-describedby={errors.limitInput ? 'budget-limit-error' : undefined}
          onChange={(event) => setLimitInput(event.target.value)}
        />
        {errors.limitInput && (
          <span id="budget-limit-error" className="budget-field__error">
            {errors.limitInput}
          </span>
        )}
      </div>

      <div className="budget-form__actions">
        <button type="button" className="button button--secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="button" disabled={isSaving || noOptions}>
          {isSaving ? 'Saving...' : isEdit ? 'Save changes' : 'Create budget'}
        </button>
      </div>
    </form>
  );
}
