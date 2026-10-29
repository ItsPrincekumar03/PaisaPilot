import { getPageTitle } from '../../app/navigation.js';
import { getGreeting } from '../../utils/dates.js';
import Icon from '../common/Icon.jsx';

export default function Header({ pathname, isNavOpen, onToggleNav }) {
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
    </header>
  );
}
