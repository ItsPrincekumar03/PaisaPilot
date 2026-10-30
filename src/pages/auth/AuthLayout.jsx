import '../../styles/auth.css';
import { useAuth } from '../../features/auth/useAuth.js';

export default function AuthLayout({ title, subtitle, children }) {
  const { isConfigured } = useAuth();

  return (
    <div className="auth-page">
      <main className="auth-card">
        <div className="auth-card__brand">
          <span className="brand-mark" aria-hidden="true">
            ₹
          </span>
          <p className="auth-card__app">PaisaPilot</p>
        </div>

        <header className="auth-card__title">
          <h1>{title}</h1>
          {subtitle && <p className="panel__subtitle">{subtitle}</p>}
        </header>

        {!isConfigured && (
          <div className="demo-banner" role="note">
            <strong>Sign-in is unavailable.</strong> Firebase is not configured. Add the
            VITE_FIREBASE_* values to .env.local and restart npm run dev. See
            docs/database/firebase-setup.md.
          </div>
        )}

        {children}
      </main>
    </div>
  );
}