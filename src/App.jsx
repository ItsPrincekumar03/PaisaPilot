import { BrowserRouter } from 'react-router-dom';
import AppRouter from './app/router.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  );
}
