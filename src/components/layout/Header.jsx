import { useState } from 'react';
import { getPageTitle } from '../../app/navigation.js';
import { getGreeting } from '../../utils/dates.js';
import Icon from '../common/Icon.jsx';
import { useAuth } from '../../features/auth/useAuth.js';
import { signOutUser } from '../../services/auth.service.js';

export default function Header({ pathname, isNavOpen, onToggleNav }) {
  const { status } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState('');

  async function handleSignOut() {
    if (isSigningOut) {
      return;
    }
    setIsSigningOut(true);
    setSignOutError('');

    const result = await signOutUser();
    if (!result.ok) {
      setSignOutError(result.message);
      setIsSigningOut(false);
    }
    // On success, the auth state changes and ProtectedRoute redirects to /login.
  }

  return (
    <header className="app-header">
      <button
        type="button"
        className="menu-button"
        onClick={onToggleNav}
        aria-expanded={isNavOpen}
        aria-controls="primary-navigation"
        aria-label={isNavOpen ? 'Close menu' : 'Open menu'}
      >
        <Icon name={isNavOpen ? 'close' : 'menu'} />
      </button>

      <div className="app-header__titles">
        <p className="app-header__greeting">{getGreeting()}. Here is your overview.</p>
        <h1>{getPageTitle(pathname)}</h1>
      </div>

      {status === 'authenticated' && (
        <div className="app-header__actions">
          <button
            type="button"
            className="button button--secondary"
            onClick={handleSignOut}
            disabled={isSigningOut}
            aria-busy={isSigningOut}
          >
            {isSigningOut ? 'Signing out…' : 'Sign out'}
          </button>
          {signOutError && (
            <p className="form-message form-message--error" role="alert">
              {signOutError}
            </p>
          )}
        </div>
      )}
    </header>
  );
}