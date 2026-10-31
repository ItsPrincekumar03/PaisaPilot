import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout.jsx';
import LoadingState from '../components/common/LoadingState.jsx';
import DashboardPage from '../pages/dashboard/DashboardPage.jsx';
import TransactionsPage from '../pages/transactions/TransactionsPage.jsx';
import BudgetPage from '../pages/budgets/BudgetPage.jsx';
import RecurringPage from '../pages/recurring/RecurringPage.jsx';
import LoginPage from '../pages/auth/Login.jsx';
import RegisterPage from '../pages/auth/Register.jsx';
import ForgotPasswordPage from '../pages/auth/ForgotPassword.jsx';
import { NotFoundPage } from '../pages/PlaceholderPages.jsx';
import ProfilePage from '../pages/profile/Profile.jsx';
import ProtectedRoute from '../features/auth/ProtectedRoute.jsx';
import PublicOnlyRoute from '../features/auth/PublicOnlyRoute.jsx';
import AdminRoute from '../features/admin/AdminRoute.jsx';

// Loaded on first visit. Reports pulls in the chart and PDF code. Admin is used rarely.
const ReportsPage = lazy(() => import('../pages/reports/ReportsPage.jsx'));
const AdminPage = lazy(() => import('../pages/admin/AdminPage.jsx'));

function LazyRoute({ children }) {
  return (
    <Suspense
      fallback={
        <div className="panel">
          <LoadingState label="Loading…" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

export default function AppRouter() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="transactions" element={<TransactionsPage />} />
          <Route path="budgets" element={<BudgetPage />} />
          <Route
            path="reports"
            element={
              <LazyRoute>
                <ReportsPage />
              </LazyRoute>
            }
          />
          <Route path="recurring" element={<RecurringPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route element={<AdminRoute />}>
            <Route
              path="admin"
              element={
                <LazyRoute>
                  <AdminPage />
                </LazyRoute>
              }
            />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
