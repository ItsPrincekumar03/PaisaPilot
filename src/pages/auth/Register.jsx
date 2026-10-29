import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from './AuthLayout.jsx';
import FormField from '../../components/forms/FormField.jsx';
import PasswordField from '../../components/forms/PasswordField.jsx';
import { registerWithEmail } from '../../services/auth.service.js';
import { PASSWORD_MIN_LENGTH, validateEmail, validatePassword } from '../../features/auth/authValidation.js';
import { useAuth } from '../../features/auth/useAuth.js';

export default function Register() {
  const navigate = useNavigate();
  const { isConfigured } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    const nextErrors = {};
    const emailError = validateEmail(email);
    if (emailError) {
      nextErrors.email = emailError;
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      nextErrors.password = passwordError;
    }

    setFieldErrors(nextErrors);
    setFormError('');
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    const result = await registerWithEmail(email, password);

    if (!result.ok) {
      setFormError(result.message);
      setIsSubmitting(false);
      return;
    }

    // Successful registration signs the user in. The route change follows the auth state.
    // The Firestore profile is created in Module 4, not here.
    navigate('/dashboard', { replace: true });
  }

  return (
    <AuthLayout title="Create your account" subtitle="Start tracking your income and expenses.">
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {formError && (
          <div className="form-message form-message--error" role="alert">
            {formError}
          </div>
        )}

        <FormField
          id="register-email"
          label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={fieldErrors.email}
          autoComplete="email"
          disabled={isSubmitting}
        />

        <PasswordField
          id="register-password"
          label="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={fieldErrors.password}
          hint={`Use at least ${PASSWORD_MIN_LENGTH} characters.`}
          autoComplete="new-password"
          disabled={isSubmitting}
        />

        <button
          type="submit"
          className="button"
          disabled={isSubmitting || !isConfigured}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <nav className="auth-links" aria-label="Account options">
        <span>
          Already registered? <Link to="/login">Sign in</Link>
        </span>
      </nav>
    </AuthLayout>
  );
}