import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateDisplayName,
  validateProfileUpdates,
  hasProfileChanges,
} from '../../src/features/profile/profileValidation.js';
import {
  CURRENCY_OPTIONS,
  DEFAULT_PREFERENCES,
  DISPLAY_NAME_MAX_LENGTH,
  LANGUAGE_OPTIONS,
  THEME_OPTIONS,
} from '../../src/features/profile/profileConstants.js';

const allowed = (options) => options.map((option) => option.value);

describe('default preferences', () => {
  it('are all inside their allowlists', () => {
    assert.ok(allowed(CURRENCY_OPTIONS).includes(DEFAULT_PREFERENCES.currency));
    assert.ok(allowed(THEME_OPTIONS).includes(DEFAULT_PREFERENCES.theme));
    assert.ok(allowed(LANGUAGE_OPTIONS).includes(DEFAULT_PREFERENCES.language));
  });
});

describe('validateDisplayName', () => {
  it('rejects blank input', () => {
    assert.notEqual(validateDisplayName('   '), null);
    assert.notEqual(validateDisplayName(undefined), null);
  });

  it('rejects names longer than the maximum', () => {
    assert.notEqual(validateDisplayName('a'.repeat(DISPLAY_NAME_MAX_LENGTH + 1)), null);
  });

  it('accepts a name at the maximum length', () => {
    assert.equal(validateDisplayName('a'.repeat(DISPLAY_NAME_MAX_LENGTH)), null);
  });
});

describe('validateProfileUpdates', () => {
  it('accepts valid preferences and trims the display name', () => {
    const { values, errors } = validateProfileUpdates({
      displayName: '  Asha  ',
      currency: 'USD',
      theme: 'dark',
      language: 'en',
    });
    assert.deepEqual(errors, {});
    assert.deepEqual(values, { displayName: 'Asha', currency: 'USD', theme: 'dark', language: 'en' });
  });

  it('rejects a currency outside the allowlist', () => {
    const { errors } = validateProfileUpdates({ currency: 'JPY' });
    assert.ok(errors.currency);
  });

  it('rejects an unknown theme', () => {
    const { errors } = validateProfileUpdates({ theme: 'purple' });
    assert.ok(errors.theme);
  });

  it('rejects an unsupported language', () => {
    const { errors } = validateProfileUpdates({ language: 'fr' });
    assert.ok(errors.language);
  });

  it('rejects privileged and server-controlled fields without saving them', () => {
    for (const key of ['role', 'isAdmin', 'accountStatus', 'email', 'uid', 'createdAt']) {
      const { values, errors } = validateProfileUpdates({ [key]: 'x' });
      assert.ok(errors.form, `${key} should be rejected`);
      assert.equal(Object.keys(values).length, 0, `${key} must not be saved`);
    }
  });

  it('returns empty results for an empty update', () => {
    assert.deepEqual(validateProfileUpdates({}), { values: {}, errors: {} });
  });

  it('rejects non-object input', () => {
    assert.ok(validateProfileUpdates(null).errors.form);
    assert.ok(validateProfileUpdates(['displayName']).errors.form);
  });
});

describe('hasProfileChanges', () => {
  const saved = { displayName: 'Asha', currency: 'INR', theme: 'system', language: 'en' };

  it('ignores surrounding spaces in the display name', () => {
    assert.equal(hasProfileChanges({ ...saved, displayName: '  Asha ' }, saved), false);
  });

  it('detects a changed currency', () => {
    assert.equal(hasProfileChanges({ ...saved, currency: 'USD' }, saved), true);
  });

  it('returns false when either side is missing', () => {
    assert.equal(hasProfileChanges(null, saved), false);
    assert.equal(hasProfileChanges(saved, null), false);
  });
});