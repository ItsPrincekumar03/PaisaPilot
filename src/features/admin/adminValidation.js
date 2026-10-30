export const ACCOUNT_STATUS = Object.freeze({
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
});

export const VALID_ACCOUNT_STATUSES = Object.freeze([
  ACCOUNT_STATUS.ACTIVE,
  ACCOUNT_STATUS.SUSPENDED,
]);

export function isValidAccountStatus(status) {
  return typeof status === 'string' && VALID_ACCOUNT_STATUSES.includes(status);
}

export function canTransitionStatus(currentStatus, nextStatus) {
  if (!isValidAccountStatus(currentStatus) || !isValidAccountStatus(nextStatus)) {
    return false;
  }
  return currentStatus !== nextStatus;
}

export function validateSuspensionAction({ currentAdminUid, targetUid, currentStatus, nextStatus }) {
  if (!currentAdminUid || typeof currentAdminUid !== 'string') {
    return { valid: false, error: 'Unauthorized: missing administrator identity.' };
  }
  if (!targetUid || typeof targetUid !== 'string') {
    return { valid: false, error: 'Invalid target user identifier.' };
  }
  if (currentAdminUid === targetUid) {
    return { valid: false, error: 'Administrators cannot suspend or modify their own account status.' };
  }
  if (!isValidAccountStatus(nextStatus)) {
    return { valid: false, error: `Invalid account status: "${nextStatus}".` };
  }
  if (currentStatus && !canTransitionStatus(currentStatus, nextStatus)) {
    return { valid: false, error: `Account is already ${nextStatus}.` };
  }
  return { valid: true };
}
