import { useState } from 'react';
import EmptyState from '../../components/common/EmptyState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import LoadingState from '../../components/common/LoadingState.jsx';
import RecurringScheduleForm from '../../components/recurring/RecurringScheduleForm.jsx';
import RecurringScheduleList from '../../components/recurring/RecurringScheduleList.jsx';
import { useAuth } from '../../features/auth/useAuth.js';
import useRecurringManager from '../../hooks/useRecurringManager.js';

export default function RecurringPage() {
  const { user } = useAuth();
  const ownerId = user?.uid;

  const [formState, setFormState] = useState(null); // null | { mode: 'create' } | { mode: 'edit', schedule }
  const [pendingDelete, setPendingDelete] = useState(null);
  const [actionError, setActionError] = useState('');

  const {
    status,
    error,
    schedules,
    categories,
    isProcessing,
    lastProcessedCount,
    retry,
    addSchedule,
    editSchedule,
    changeStatus,
    removeSchedule,
    triggerManualProcess,
  } = useRecurringManager({ ownerId });

  async function handleFormSubmit(formData) {
    setActionError('');
    if (formState?.mode === 'edit') {
      await editSchedule(formState.schedule.id, formData);
    } else {
      await addSchedule(formData);
    }
    setFormState(null);
  }

  async function handleStatusChange(schedule, nextStatus) {
    setActionError('');
    try {
      await changeStatus(schedule.id, nextStatus);
    } catch (err) {
      setActionError(err.message || 'Failed to update schedule status.');
    }
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    setActionError('');
    try {
      await removeSchedule(pendingDelete.id);
      setPendingDelete(null);
    } catch (err) {
      setActionError(err.message || 'Failed to delete schedule.');
    }
  }

  return (
    <div className="recurring-page">
      <div className="page-header">
        <div>
          <h1 className="page-header__title">Recurring Transactions</h1>
          <p className="page-header__subtitle">
            Automate routine income and expenses with customizable schedules.
          </p>
        </div>
        <div className="page-header__actions">
          <button
            type="button"
            className="button button--secondary"
            onClick={triggerManualProcess}
            disabled={isProcessing || status !== 'ready'}
          >
            {isProcessing ? 'Processing...' : 'Run Due Schedules'}
          </button>
          <button
            type="button"
            className="button"
            onClick={() => setFormState({ mode: 'create' })}
          >
            + New Schedule
          </button>
        </div>
      </div>

      {actionError && (
        <div className="alert alert--danger" role="alert">
          {actionError}
        </div>
      )}

      {lastProcessedCount > 0 && (
        <div className="alert alert--success" role="status">
          Processed {lastProcessedCount} scheduled transaction{lastProcessedCount > 1 ? 's' : ''} for today.
        </div>
      )}

      {formState && (
        <RecurringScheduleForm
          categories={categories}
          schedule={formState.mode === 'edit' ? formState.schedule : null}
          onSubmit={handleFormSubmit}
          onCancel={() => setFormState(null)}
        />
      )}

      {status === 'loading' && <LoadingState label="Loading recurring schedules..." />}

      {status === 'error' && (
        <ErrorState
          title="Could not load recurring schedules"
          message={error}
          onRetry={retry}
        />
      )}

      {status === 'ready' && schedules.length === 0 && !formState && (
        <EmptyState
          title="No recurring schedules"
          message="Set up recurring expenses (like rent or subscriptions) or recurring income (like salary) to track them automatically."
          action={
            <button
              type="button"
              className="button"
              onClick={() => setFormState({ mode: 'create' })}
            >
              Create your first schedule
            </button>
          }
        />
      )}

      {status === 'ready' && schedules.length > 0 && (
        <RecurringScheduleList
          schedules={schedules}
          categories={categories}
          onEdit={(schedule) => setFormState({ mode: 'edit', schedule })}
          onToggleStatus={handleStatusChange}
          onDelete={(schedule) => setPendingDelete(schedule)}
        />
      )}

      {pendingDelete && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title">
          <div className="modal panel">
            <h3 id="delete-dialog-title">Delete Recurring Schedule?</h3>
            <p>
              Are you sure you want to delete <strong>{pendingDelete.description}</strong>?
              Past generated transactions will remain intact.
            </p>
            <div className="modal__actions">
              <button
                type="button"
                className="button button--secondary"
                onClick={() => setPendingDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="button button--danger"
                onClick={handleConfirmDelete}
              >
                Delete Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
