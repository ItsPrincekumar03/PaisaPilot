import { formatINR } from '../../utils/currency.js';

export default function DeleteBudgetDialog({ row, isDeleting = false, onConfirm, onCancel }) {
  function handleKeyDown(event) {
    if (event.key === 'Escape' && !isDeleting) {
      onCancel();
    }
  }

  return (
    <div className="dialog-backdrop">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-budget-title"
        aria-describedby="delete-budget-description"
        className="dialog"
        onKeyDown={handleKeyDown}
      >
        <h3 id="delete-budget-title">Delete the {row.categoryName} budget?</h3>
        <p id="delete-budget-description">
          This removes the {formatINR(row.limitPaise)} monthly limit for this category. Your transactions are not changed.
        </p>
        <div className="dialog__actions">
          <button type="button" className="button button--secondary" onClick={onCancel} disabled={isDeleting} autoFocus>
            Keep budget
          </button>
          <button type="button" className="button button--danger" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? 'Deleting...' : 'Delete budget'}
          </button>
        </div>
      </div>
    </div>
  );
}
