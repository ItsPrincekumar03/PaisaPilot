import { useEffect, useState } from 'react';
import ErrorState from '../../components/common/ErrorState.jsx';
import LoadingState from '../../components/common/LoadingState.jsx';
import FormField from '../../components/forms/FormField.jsx';
import SelectField from '../../components/forms/SelectField.jsx';
import { useAuth } from '../../features/auth/useAuth.js';
import {
  CURRENCY_OPTIONS,
  DISPLAY_NAME_MAX_LENGTH,
  LANGUAGE_OPTIONS,
  THEME_OPTIONS,
} from '../../features/profile/profileConstants.js';
import {
  hasProfileChanges,
  validateProfileUpdates,
} from '../../features/profile/profileValidation.js';
import { getUserProfile, updateUserProfile } from '../../services/profile.service.js';
import '../../styles/profile.css';

const dateFormatter = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

function formatOptionalDate(date) {
  return date ? dateFormatter.format(date) : 'Not available yet';
}

function toForm(profile) {
  return {
    displayName: profile.displayName,
    currency: profile.currency,
    theme: profile.theme,
    language: profile.language,
  };
}

export default function Profile() {
  const { user, status } = useAuth();

  if (status !== 'authenticated' || !user) {
    return <LoadingState label="Checking your session…" />;
  }

  return <ProfileContent key={user.uid} user={user} />;
}

function ProfileContent({ user }) {
  const [loadState, setLoadState] = useState('loading');
  const [loadError, setLoadError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [saved, setSaved] = useState(null);
  const [form, setForm] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isActive = true;

    getUserProfile(user.uid).then((result) => {
      if (!isActive) {
        return;
      }
      if (result.ok) {
        setSaved(result.profile);
        setForm(toForm(result.profile));
        setLoadState('ready');
      } else {
        setLoadError(result.message);
        setLoadState('error');
      }
    });

    return () => {
      isActive = false;
    };
  }, [user, attempt]);

  function handleRetry() {
    setLoadError('');
    setLoadState('loading');
    setAttempt((count) => count + 1);
  }

  if (loadState === 'loading') {
    return (
      <div className="panel">
        <LoadingState label="Loading your profile…" />
      </div>
    );
  }

  if (loadState === 'error') {
    return <ErrorState title="Profile unavailable" message={loadError} onRetry={handleRetry} />;
  }

  const isDirty = hasProfileChanges(form, saved);

  function handleChange(field) {
    return (event) => {
      setForm((previous) => ({ ...previous, [field]: event.target.value }));
      setSuccessMessage('');
    };
  }

  function handleDiscard() {
    setForm(toForm(saved));
    setFieldErrors({});
    setFormError('');
    setSuccessMessage('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSaving) {
      return;
    }

    const { values, errors } = validateProfileUpdates(form);
    setFieldErrors(errors);
    setFormError('');
    setSuccessMessage('');
    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSaving(true);
    const result = await updateUserProfile(user.uid, values);
    setIsSaving(false);

    if (!result.ok) {
      setFormError(result.message);
      return;
    }

    setSaved((previous) => ({ ...previous, ...values, updatedAt: new Date() }));
    setForm({ ...values });
    setSuccessMessage('Your profile has been saved.');
  }

  return (
    <div className="profile-layout">
      <section className="panel" aria-labelledby="profile-form-heading">
        <div className="panel__header">
          <h2 id="profile-form-heading">Edit profile</h2>
          <p className="panel__subtitle">Changes are saved to your account only.</p>
        </div>

        <form className="profile-form" onSubmit={handleSubmit} noValidate>
          {formError && (
            <div className="form-message form-message--error" role="alert">
              {formError}
            </div>
          )}
          {successMessage && (
            <div className="form-message form-message--success" role="status">
              {successMessage}
            </div>
          )}

          <FormField
            id="profile-display-name"
            label="Display name"
            value={form.displayName}
            onChange={handleChange('displayName')}
            error={fieldErrors.displayName}
            hint={`Up to ${DISPLAY_NAME_MAX_LENGTH} characters.`}
            autoComplete="name"
            disabled={isSaving}
          />

          <SelectField
            id="profile-currency"
            label="Preferred currency"
            value={form.currency}
            onChange={handleChange('currency')}
            options={CURRENCY_OPTIONS}
            error={fieldErrors.currency}
            hint="Saved to your profile. Amounts are not converted yet."
            disabled={isSaving}
          />

          <SelectField
            id="profile-theme"
            label="Theme"
            value={form.theme}
            onChange={handleChange('theme')}
            options={THEME_OPTIONS}
            error={fieldErrors.theme}
            hint="Saved for later. The app currently uses the light theme only."
            disabled={isSaving}
          />

          <SelectField
            id="profile-language"
            label="Language"
            value={form.language}
            onChange={handleChange('language')}
            options={LANGUAGE_OPTIONS}
            error={fieldErrors.language}
            hint="Only English is available right now."
            disabled={isSaving}
          />

          <div className="profile-form__actions">
            <button
              type="submit"
              className="button"
              disabled={!isDirty || isSaving}
              aria-busy={isSaving}
            >
              {isSaving ? 'Saving…' : 'Save changes'}
            </button>
            <button
              type="button"
              className="button button--secondary"
              onClick={handleDiscard}
              disabled={!isDirty || isSaving}
            >
              Discard changes
            </button>
          </div>
        </form>
      </section>

      <section className="panel" aria-labelledby="account-heading">
        <div className="panel__header">
          <h2 id="account-heading">Account</h2>
          <p className="panel__subtitle">Managed through your sign-in account.</p>
        </div>

        <dl className="profile-facts">
          <div>
            <dt>Email</dt>
            <dd>{user.email}</dd>
          </div>
          <div>
            <dt>Account created</dt>
            <dd>
              {formatOptionalDate(
                user.metadata?.creationTime ? new Date(user.metadata.creationTime) : null
              )}
            </dd>
          </div>
          <div>
            <dt>Profile last updated</dt>
            <dd>{formatOptionalDate(saved.updatedAt)}</dd>
          </div>
        </dl>

        <p className="panel__subtitle">
          Changing your email and uploading a profile photo are not available yet.
        </p>
      </section>
    </div>
  );
}