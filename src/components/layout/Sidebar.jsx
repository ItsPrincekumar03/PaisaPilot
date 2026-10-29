import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from '../../app/navigation.js';
import Icon from '../common/Icon.jsx';

export default function Sidebar({ isOpen, onNavigate }) {
  return (
    <aside
      id="primary-navigation"
      className={`sidebar ${isOpen ? 'is-open' : ''}`}
      aria-label="Main navigation"
    >
      <div className="sidebar__brand">
        <span className="brand-mark" aria-hidden="true">
          ₹
        </span>
        <div>
          <p className="brand-name">PaisaPilot</p>
          <p className="brand-tagline">Track Smart. Spend Better.</p>
        </div>
      </div>

      <nav>
        <ul className="sidebar__list">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) => `nav-link ${isActive ? 'is-active' : ''}`}
                onClick={onNavigate}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
                {item.preview && <span className="badge badge--preview">Preview</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
