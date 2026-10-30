import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import AuthLayout from './AuthLayout.jsx';
import FormField from '../../components/forms/FormField.jsx';
import { sendPasswordReset } from '../../services/auth.service.js';
import { validateEmail } from '../../features/auth/authValidation.js';
import { useAuth } from '../../features/auth/useAuth.js';

export default function ForgotPassword() {
  const location = useLocation();
  const { isConfigured } = useAuth();

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    const validationError = validateEmail(email);
    setEmailError(validationError ?? '');
    setFormError('');
    setSuccessMessage('');
    if (validationError) {
      return;
    }

    setIsSubmitting(true);
    const result = await sendPasswordReset(email);
    setIsSubmitting(false);

    if (result.ok) {
      setSuccessMessage(result.message);
    } else {
      setFormError(result.message);
    }
  }

  return (
    <AuthLayout title="Reset password" subtitle="Enter your email and we will send a reset link.">
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
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
          id="reset-email"
          label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={emailError}
          autoComplete="email"
          disabled={isSubmitting}
        />

        <button
          type="submit"
          className="button"
          disabled={isSubmitting || !isConfigured}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? 'Sending…' : 'Send reset link'}
        </button>
      </form>

      <nav className="auth-links" aria-label="Account options">
        <Link to="/login" state={location.state}>
          Back to sign in
        </Link>
      </nav>
    </AuthLayout>
  );
}