export const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', title: 'Dashboard', icon: 'dashboard' },
  { to: '/transactions', label: 'Transactions', title: 'Transactions', icon: 'transactions' },
  { to: '/recurring', label: 'Recurring', title: 'Recurring Transactions', icon: 'recurring' },
  { to: '/budgets', label: 'Budgets', title: 'Budgets', icon: 'budget' },
  { to: '/reports', label: 'Reports', title: 'Reports', icon: 'reports' },
  { to: '/profile', label: 'Profile', title: 'Profile & Preferences', icon: 'profile' },
  { to: '/admin', label: 'Admin', title: 'Admin Dashboard', icon: 'admin' },
];

export function getPageTitle(pathname) {
  const item = NAV_ITEMS.find(
    (navItem) => pathname === navItem.to || pathname.startsWith(`${navItem.to}/`)
  );
  return item ? item.title : 'Page not found';
}
