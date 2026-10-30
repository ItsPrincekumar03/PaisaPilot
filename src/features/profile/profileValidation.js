import {
  CURRENCY_OPTIONS,
  DISPLAY_NAME_MAX_LENGTH,
  LANGUAGE_OPTIONS,
  THEME_OPTIONS,
} from './profileConstants.js';

const ALLOWED_FIELDS = ['displayName', 'currency', 'theme', 'language'];

export function validateDisplayName(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    return 'Enter a display name.';
  }
  if (value.trim().length > DISPLAY_NAME_MAX_LENGTH) {
    return `Use no more than ${DISPLAY_NAME_MAX_LENGTH} characters.`;
  }
  return null;
}

function validateChoice(value, options, label) {
  const allowed = options.map((option) => option.value);
  return allowed.includes(value) ? null : `Choose a valid ${label}.`;
}

const FIELD_VALIDATORS = {
  displayName: validateDisplayName,
  currency: (value) => validateChoice(value, CURRENCY_OPTIONS, 'currency'),
  theme: (value) => validateChoice(value, THEME_OPTIONS, 'theme'),
  language: (value) => validateChoice(value, LANGUAGE_OPTIONS, 'language'),
};

export function validateProfileUpdates(input) {
  const values = {};
  const errors = {};

  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { values, errors: { form: 'Profile data is invalid.' } };
  }

  for (const key of Object.keys(input)) {
    if (!ALLOWED_FIELDS.includes(key)) {
      errors.form = 'This field cannot be changed.';
      continue;
    }

    const rawValue = input[key];
    const error = FIELD_VALIDATORS[key](rawValue);
    if (error) {
      errors[key] = error;
    } else {
      values[key] = key === 'displayName' ? rawValue.trim() : rawValue;
    }
  }

  return { values, errors };
}

export function hasProfileChanges(form, saved) {
  if (!form || !saved) {
    return false;
  }
  return (
    form.displayName.trim() !== saved.displayName ||
    form.currency !== saved.currency ||
    form.theme !== saved.theme ||
    form.language !== saved.language
  );
}