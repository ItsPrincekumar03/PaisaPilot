import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from './AuthLayout.jsx';
import FormField from '../../components/forms/FormField.jsx';
import PasswordField from '../../components/forms/PasswordField.jsx';
import { signInWithEmail } from '../../services/auth.service.js';
import { validateEmail } from '../../features/auth/authValidation.js';
import { getSafeRedirectPath } from '../../features/auth/safeRedirect.js';
import { useAuth } from '../../features/auth/useAuth.js';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
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
    if (!password) {
      nextErrors.password = 'Enter your password.';
    }

    setFieldErrors(nextErrors);
    setFormError('');
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    const result = await signInWithEmail(email, password);

    if (!result.ok) {
      setFormError(result.message);
      setIsSubmitting(false);
      return;
    }

    // Stay in the submitting state on success: the route is about to change.
    navigate(getSafeRedirectPath(location.state?.from), { replace: true });
  }

  return (
    <AuthLayout title="Sign in" subtitle="Welcome back. Track smart, spend better.">
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {formError && (
          <div className="form-message form-message--error" role="alert">
            {formError}
          </div>
        )}

        <FormField
          id="login-email"
          label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={fieldErrors.email}
          autoComplete="email"
          disabled={isSubmitting}
        />

        <PasswordField
          id="login-password"
          label="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={fieldErrors.password}
          autoComplete="current-password"
          disabled={isSubmitting}
        />

        <button
          type="submit"
          className="button"
          disabled={isSubmitting || !isConfigured}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <nav className="auth-links" aria-label="Account options">
        <Link to="/forgot-password" state={location.state}>
          Forgot your password?
        </Link>
        <span>
          New to PaisaPilot? <Link to="/register" state={location.state}>Create an account</Link>
        </span>
      </nav>
    </AuthLayout>
  );
}