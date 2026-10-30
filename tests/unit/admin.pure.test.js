import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hasAdminClaim } from '../../src/features/admin/adminPolicy.js';
import {
  ACCOUNT_STATUS,
  VALID_ACCOUNT_STATUSES,
  isValidAccountStatus,
  canTransitionStatus,
  validateSuspensionAction,
} from '../../src/features/admin/adminValidation.js';

describe('hasAdminClaim', () => {
  it('returns true when admin claim is explicitly boolean true', () => {
    assert.equal(hasAdminClaim({ admin: true }), true);
  });

  it('returns false when admin claim is false', () => {
    assert.equal(hasAdminClaim({ admin: false }), false);
  });

  it('returns false when claims is null', () => {
    assert.equal(hasAdminClaim(null), false);
  });

  it('returns false when claims is undefined', () => {
    assert.equal(hasAdminClaim(undefined), false);
  });

  it('returns false for an empty claims object', () => {
    assert.equal(hasAdminClaim({}), false);
  });

  it('returns false when admin property is missing', () => {
    assert.equal(hasAdminClaim({ role: 'user' }), false);
  });

  it('returns false when admin claim is string "true"', () => {
    assert.equal(hasAdminClaim({ admin: 'true' }), false);
  });

  it('returns false when admin claim is number 1', () => {
    assert.equal(hasAdminClaim({ admin: 1 }), false);
  });

  it('returns false when other unrelated claims do not grant admin access', () => {
    assert.equal(hasAdminClaim({ role: 'admin', premium: true }), false);
    assert.equal(hasAdminClaim({ admin: false, editor: true }), false);
  });
});

describe('adminValidation', () => {
  describe('ACCOUNT_STATUS & isValidAccountStatus', () => {
    it('defines expected status constants', () => {
      assert.equal(ACCOUNT_STATUS.ACTIVE, 'active');
      assert.equal(ACCOUNT_STATUS.SUSPENDED, 'suspended');
      assert.deepEqual(VALID_ACCOUNT_STATUSES, ['active', 'suspended']);
    });

    it('validates active and suspended as valid statuses', () => {
      assert.equal(isValidAccountStatus('active'), true);
      assert.equal(isValidAccountStatus('suspended'), true);
    });

    it('rejects invalid or unknown statuses', () => {
      assert.equal(isValidAccountStatus('pending'), false);
      assert.equal(isValidAccountStatus('deleted'), false);
      assert.equal(isValidAccountStatus(''), false);
      assert.equal(isValidAccountStatus(null), false);
      assert.equal(isValidAccountStatus(undefined), false);
      assert.equal(isValidAccountStatus(123), false);
    });
  });

  describe('canTransitionStatus', () => {
    it('allows transition from active to suspended', () => {
      assert.equal(canTransitionStatus('active', 'suspended'), true);
    });

    it('allows transition from suspended to active', () => {
      assert.equal(canTransitionStatus('suspended', 'active'), true);
    });

    it('rejects identical transitions (no-op)', () => {
      assert.equal(canTransitionStatus('active', 'active'), false);
      assert.equal(canTransitionStatus('suspended', 'suspended'), false);
    });

    it('rejects transitions involving invalid statuses', () => {
      assert.equal(canTransitionStatus('active', 'archived'), false);
      assert.equal(canTransitionStatus('unknown', 'active'), false);
    });
  });

  describe('validateSuspensionAction', () => {
    const adminUid = 'admin_uid_123';
    const targetUid = 'user_target_456';

    it('allows valid suspension transition', () => {
      const result = validateSuspensionAction({
        currentAdminUid: adminUid,
        targetUid,
        currentStatus: 'active',
        nextStatus: 'suspended',
      });
      assert.equal(result.valid, true);
    });

    it('allows valid restoration transition', () => {
      const result = validateSuspensionAction({
        currentAdminUid: adminUid,
        targetUid,
        currentStatus: 'suspended',
        nextStatus: 'active',
      });
      assert.equal(result.valid, true);
    });

    it('prevents self-suspension (admin locking themselves out)', () => {
      const result = validateSuspensionAction({
        currentAdminUid: adminUid,
        targetUid: adminUid,
        currentStatus: 'active',
        nextStatus: 'suspended',
      });
      assert.equal(result.valid, false);
      assert.match(result.error, /themselves out|own account/i);
    });

    it('rejects missing admin identity', () => {
      const result = validateSuspensionAction({
        currentAdminUid: null,
        targetUid,
        currentStatus: 'active',
        nextStatus: 'suspended',
      });
      assert.equal(result.valid, false);
      assert.match(result.error, /Unauthorized/i);
    });

    it('rejects missing target user identifier', () => {
      const result = validateSuspensionAction({
        currentAdminUid: adminUid,
        targetUid: '',
        currentStatus: 'active',
        nextStatus: 'suspended',
      });
      assert.equal(result.valid, false);
      assert.match(result.error, /Invalid target user/i);
    });

    it('rejects invalid next status', () => {
      const result = validateSuspensionAction({
        currentAdminUid: adminUid,
        targetUid,
        currentStatus: 'active',
        nextStatus: 'banned',
      });
      assert.equal(result.valid, false);
      assert.match(result.error, /Invalid account status/i);
    });

    it('rejects redundant transition when currentStatus already equals nextStatus', () => {
      const result = validateSuspensionAction({
        currentAdminUid: adminUid,
        targetUid,
        currentStatus: 'suspended',
        nextStatus: 'suspended',
      });
      assert.equal(result.valid, false);
      assert.match(result.error, /already suspended/i);
    });
  });
});
