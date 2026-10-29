import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout.jsx';
import DashboardPage from '../pages/dashboard/DashboardPage.jsx';
import TransactionsPage from '../pages/transactions/TransactionsPage.jsx';
import LoginPage from '../pages/auth/Login.jsx';
import RegisterPage from '../pages/auth/Register.jsx';
import ForgotPasswordPage from '../pages/auth/ForgotPassword.jsx';
import {
  BudgetsPage,
  ReportsPage,
  AdminPage,
  NotFoundPage,
} from '../pages/PlaceholderPages.jsx';
import ProfilePage from '../pages/profile/Profile.jsx';
import ProtectedRoute from '../features/auth/ProtectedRoute.jsx';
import PublicOnlyRoute from '../features/auth/PublicOnlyRoute.jsx';

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
          <Route path="budgets" element={<BudgetsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="admin" element={<AdminPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
