import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { AuthProvider } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SheetsPage from './pages/SheetsPage';
import SheetDetailPage from './pages/SheetDetailPage';
import IssuesPage from './pages/IssuesPage';
import ChecklistPage from './pages/ChecklistPage';
import UsersPage from './pages/UsersPage';
import Layout from './components/Layout';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<DashboardPage />} />
        <Route path="sheets" element={<SheetsPage />} />
        <Route path="sheets/:id" element={<SheetDetailPage />} />
        <Route path="issues" element={<IssuesPage />} />
        <Route path="checklist" element={<ChecklistPage />} />
        <Route path="users" element={<UsersPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
