import { NavLink } from 'react-router-dom';
import PlaceholderPage from '../components/common/PlaceholderPage.jsx';

export function BudgetsPage() {
  return (
    <PlaceholderPage
      moduleLabel="Planned · Module 8"
      description="Monthly budget setup and warnings will be built in Module 8. The budget figures on the dashboard are demo data."
    />
  );
}

export function ReportsPage() {
  return (
    <PlaceholderPage
      moduleLabel="Planned · Module 9"
      description="Monthly reports and CSV or PDF exports will be built in Module 9. No report data is shown here yet."
    />
  );
}

export function AdminPage() {
  return (
    <PlaceholderPage
      moduleLabel="Preview · Module 10"
      description="This is a layout preview only. Administrator permissions are not checked yet, and no account or financial data is shown. Authorization is planned for Module 3 and admin tools for Module 10."
    />
  );
}

export function NotFoundPage() {
  return (
    <section className="panel placeholder-page">
      <h2>Page not found</h2>
      <p>The page you requested does not exist.</p>
      <NavLink to="/dashboard" className="button">
        Go to dashboard
      </NavLink>
    </section>
  );
}
