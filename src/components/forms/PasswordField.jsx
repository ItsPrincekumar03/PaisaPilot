import { useState } from 'react';
import Icon from '../common/Icon.jsx';

export default function PasswordField({
  id,
  label,
  value,
  onChange,
  error,
  hint,
  autoComplete,
  disabled = false,
}) {
  const [isVisible, setIsVisible] = useState(false);
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ');

  return (
    <div className="form-field password-field">
      <label htmlFor={id}>{label}</label>
      <div className="password-field__input-wrap">
        <input
          id={id}
          name={id}
          type={isVisible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy || undefined}
        />
        <button
          type="button"
          className="password-field__toggle"
          onClick={() => setIsVisible((visible) => !visible)}
          aria-label={isVisible ? 'Hide password' : 'Show password'}
          aria-pressed={isVisible}
          disabled={disabled}
        >
          <Icon name={isVisible ? 'eye-off' : 'eye'} size={18} />
        </button>
      </div>
      {hint && (
        <p id={hintId} className="form-field__hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="form-field__error">
          {error}
        </p>
      )}
    </div>
  );
}