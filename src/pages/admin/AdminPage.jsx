import { useEffect, useMemo, useState } from 'react';
import LoadingState from '../../components/common/LoadingState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import { useAuth } from '../../features/auth/useAuth.js';
import { ACCOUNT_STATUS } from '../../features/admin/adminValidation.js';
import { fetchUsers, setUserAccountStatus } from '../../services/adminService.js';
import '../../styles/admin.css';

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatTimestamp(date) {
  return date ? dateFormatter.format(date) : '—';
}

export default function AdminPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    targetUser: null,
    nextStatus: null,
    isSubmitting: false,
  });

  const [feedback, setFeedback] = useState(null);

  const loadData = async () => {
    setIsLoading(true);
    setLoadError(null);
    const result = await fetchUsers();
    if (result.ok) {
      setUsers(result.users);
    } else {
      setLoadError(result.message);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const metrics = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.accountStatus === ACCOUNT_STATUS.ACTIVE).length;
    const suspended = users.filter((u) => u.accountStatus === ACCOUNT_STATUS.SUSPENDED).length;
    return { total, active, suspended };
  }, [users]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesFilter =
        statusFilter === 'all' || u.accountStatus === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        u.email.toLowerCase().includes(q) ||
        u.displayName.toLowerCase().includes(q) ||
        u.uid.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [users, statusFilter, searchQuery]);

  const handleOpenConfirm = (targetUser, nextStatus) => {
    setFeedback(null);
    setConfirmModal({
      isOpen: true,
      targetUser,
      nextStatus,
      isSubmitting: false,
    });
  };

  const handleCloseConfirm = () => {
    if (confirmModal.isSubmitting) return;
    setConfirmModal({
      isOpen: false,
      targetUser: null,
      nextStatus: null,
      isSubmitting: false,
    });
  };

  const handleConfirmStatusChange = async () => {
    const { targetUser, nextStatus } = confirmModal;
    if (!targetUser || !nextStatus) return;

    setConfirmModal((prev) => ({ ...prev, isSubmitting: true }));
    const res = await setUserAccountStatus({
      targetUid: targetUser.uid,
      currentStatus: targetUser.accountStatus,
      nextStatus,
    });

    if (res.ok) {
      setUsers((prev) =>
        prev.map((u) =>
          u.uid === targetUser.uid ? { ...u, accountStatus: nextStatus } : u
        )
      );
      setFeedback({
        type: 'success',
        message: `Successfully updated account status for ${targetUser.email} to "${nextStatus}".`,
      });
      setConfirmModal({
        isOpen: false,
        targetUser: null,
        nextStatus: null,
        isSubmitting: false,
      });
    } else {
      setFeedback({
        type: 'error',
        message: res.message || 'Failed to update account status.',
      });
      setConfirmModal((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  if (isLoading) {
    return <LoadingState label="Loading registered user accounts…" />;
  }

  if (loadError) {
    return (
      <ErrorState
        title="Admin Dashboard Error"
        message={loadError}
        onRetry={loadData}
      />
    );
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1 className="admin-header__title">Admin Dashboard</h1>
        <p className="admin-header__subtitle">
          Manage system users, oversee platform security, and administer account statuses.
        </p>
      </header>

      {feedback && (
        <div className={`admin-banner admin-banner--${feedback.type}`} role="alert">
          {feedback.message}
        </div>
      )}

      <section className="admin-metrics" aria-label="Account Summary Metrics">
        <div className="admin-metric-card">
          <span className="admin-metric-card__label">Total Registered</span>
          <span className="admin-metric-card__value">{metrics.total}</span>
        </div>
        <div className="admin-metric-card">
          <span className="admin-metric-card__label">Active Accounts</span>
          <span className="admin-metric-card__value admin-metric-card__value--active">
            {metrics.active}
          </span>
        </div>
        <div className="admin-metric-card">
          <span className="admin-metric-card__label">Suspended Accounts</span>
          <span className="admin-metric-card__value admin-metric-card__value--suspended">
            {metrics.suspended}
          </span>
        </div>
      </section>

      <section className="admin-controls" aria-label="Search and Filter Users">
        <input
          type="search"
          className="admin-search-input"
          placeholder="Search by name, email, or UID…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Search users"
        />

        <div className="admin-filter-group" role="group" aria-label="Filter by status">
          <button
            type="button"
            className={`admin-filter-btn ${statusFilter === 'all' ? 'admin-filter-btn--active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All ({metrics.total})
          </button>
          <button
            type="button"
            className={`admin-filter-btn ${statusFilter === ACCOUNT_STATUS.ACTIVE ? 'admin-filter-btn--active' : ''}`}
            onClick={() => setStatusFilter(ACCOUNT_STATUS.ACTIVE)}
          >
            Active ({metrics.active})
          </button>
          <button
            type="button"
            className={`admin-filter-btn ${statusFilter === ACCOUNT_STATUS.SUSPENDED ? 'admin-filter-btn--active' : ''}`}
            onClick={() => setStatusFilter(ACCOUNT_STATUS.SUSPENDED)}
          >
            Suspended ({metrics.suspended})
          </button>
        </div>
      </section>

      <section className="admin-table-container" aria-label="User Accounts Table">
        {filteredUsers.length === 0 ? (
          <EmptyState
            title="No accounts found"
            message={
              searchQuery || statusFilter !== 'all'
                ? 'No users match your filter criteria.'
                : 'No registered user profiles found in Firestore.'
            }
          />
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">User</th>
                <th scope="col">User ID</th>
                <th scope="col">Currency</th>
                <th scope="col">Status</th>
                <th scope="col">Created Date</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => {
                const isCurrentAdmin = user?.uid === u.uid;
                const isSuspended = u.accountStatus === ACCOUNT_STATUS.SUSPENDED;

                return (
                  <tr key={u.uid}>
                    <td>
                      <div className="admin-user-cell">
                        <span className="admin-user-name">
                          {u.displayName}
                          {isCurrentAdmin && (
                            <span className="admin-self-badge">(You)</span>
                          )}
                        </span>
                        <span className="admin-user-email">{u.email}</span>
                      </div>
                    </td>
                    <td>
                      <span className="admin-uid-badge" title={u.uid}>
                        {u.uid.slice(0, 10)}…
                      </span>
                    </td>
                    <td>{u.currency}</td>
                    <td>
                      <span
                        className={`admin-status-badge admin-status-badge--${u.accountStatus}`}
                      >
                        {u.accountStatus}
                      </span>
                    </td>
                    <td>{formatTimestamp(u.createdAt)}</td>
                    <td>
                      {isCurrentAdmin ? (
                        <span className="admin-user-email" title="Self-suspension is disabled to prevent lockout">
                          Protected (Self)
                        </span>
                      ) : isSuspended ? (
                        <button
                          type="button"
                          className="admin-action-btn admin-action-btn--restore"
                          onClick={() =>
                            handleOpenConfirm(u, ACCOUNT_STATUS.ACTIVE)
                          }
                        >
                          Restore Account
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="admin-action-btn admin-action-btn--suspend"
                          onClick={() =>
                            handleOpenConfirm(u, ACCOUNT_STATUS.SUSPENDED)
                          }
                        >
                          Suspend Account
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {confirmModal.isOpen && (
        <div
          className="admin-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-confirm-title"
        >
          <div className="admin-modal">
            <div className="admin-modal__header">
              <h2 id="admin-confirm-title" className="admin-modal__title">
                {confirmModal.nextStatus === ACCOUNT_STATUS.SUSPENDED
                  ? 'Confirm Account Suspension'
                  : 'Confirm Account Restoration'}
              </h2>
            </div>
            <div className="admin-modal__body">
              <p>
                {confirmModal.nextStatus === ACCOUNT_STATUS.SUSPENDED
                  ? 'Are you sure you want to suspend this account? The user will be restricted from accessing standard application services.'
                  : 'Are you sure you want to restore this account? Active access will be returned to the user.'}
              </p>
              <div className="admin-modal__user-summary">
                <div>
                  <strong>User:</strong> {confirmModal.targetUser?.displayName} ({confirmModal.targetUser?.email})
                </div>
                <div>
                  <strong>UID:</strong> <code>{confirmModal.targetUser?.uid}</code>
                </div>
                <div>
                  <strong>Current Status:</strong> {confirmModal.targetUser?.accountStatus}
                </div>
                <div>
                  <strong>Target Status:</strong> {confirmModal.nextStatus}
                </div>
              </div>
            </div>
            <div className="admin-modal__actions">
              <button
                type="button"
                className="button button--secondary"
                onClick={handleCloseConfirm}
                disabled={confirmModal.isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`button ${
                  confirmModal.nextStatus === ACCOUNT_STATUS.SUSPENDED
                    ? 'button--danger'
                    : 'button--primary'
                }`}
                onClick={handleConfirmStatusChange}
                disabled={confirmModal.isSubmitting}
              >
                {confirmModal.isSubmitting
                  ? 'Processing…'
                  : confirmModal.nextStatus === ACCOUNT_STATUS.SUSPENDED
                  ? 'Suspend Account'
                  : 'Restore Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
