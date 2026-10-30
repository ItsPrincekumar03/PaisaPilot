import { useEffect, useRef } from 'react';
import { formatINR } from '../../utils/currency.js';
import { formatDisplayDate } from '../../utils/dates.js';

export default function DeleteConfirm({ transaction, isDeleting = false, error = '', onConfirm, onCancel }) {
  const cancelRef = useRef(null);

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape' && !isDeleting) {
        onCancel();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isDeleting, onCancel]);

  return (
    <div className="confirm-overlay">
      <div
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-transaction-title"
        aria-describedby="delete-transaction-description"
      >
        <h3 id="delete-transaction-title">Delete this transaction?</h3>
        <p id="delete-transaction-description">
          {transaction.description} for {formatINR(transaction.amountPaise)} on{' '}
          {formatDisplayDate(transaction.date)}. This cannot be undone.
        </p>

        {error && (
          <p className="form-message form-message--error" role="alert">
            {error}
          </p>
        )}

        <div className="confirm-dialog__actions">
          <button
            ref={cancelRef}
            type="button"
            className="button button--secondary"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="button button--danger"
            onClick={onConfirm}
            disabled={isDeleting}
            aria-busy={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}