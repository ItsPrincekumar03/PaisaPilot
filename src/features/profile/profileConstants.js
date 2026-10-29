export const DISPLAY_NAME_MAX_LENGTH = 80;

export const CURRENCY_OPTIONS = [
  { value: 'INR', label: 'Indian Rupee (INR)' },
  { value: 'USD', label: 'US Dollar (USD)' },
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'GBP', label: 'British Pound (GBP)' },
];

export const THEME_OPTIONS = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

export const LANGUAGE_OPTIONS = [{ value: 'en', label: 'English' }];

export const DEFAULT_PREFERENCES = {
  currency: 'INR',
  theme: 'system',
  language: 'en',
};