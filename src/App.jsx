import { BrowserRouter } from 'react-router-dom';
import AppRouter from './app/router.jsx';
import AuthProvider from './features/auth/AuthProvider.jsx';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </AuthProvider>
  );
}