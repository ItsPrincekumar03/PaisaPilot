import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hasAdminClaim } from '../../src/features/admin/adminPolicy.js';

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
