import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';

export default function AppLayout() {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (!isNavOpen) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsNavOpen(false);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isNavOpen]);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      <Sidebar isOpen={isNavOpen} onNavigate={() => setIsNavOpen(false)} />

      {isNavOpen && (
        <button
          type="button"
          className="nav-overlay"
          aria-label="Close navigation menu"
          onClick={() => setIsNavOpen(false)}
        />
      )}

      <div className="main-area">
        <Header
          pathname={location.pathname}
          isNavOpen={isNavOpen}
          onToggleNav={() => setIsNavOpen((open) => !open)}
        />
        <main id="main-content" className="page-content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
