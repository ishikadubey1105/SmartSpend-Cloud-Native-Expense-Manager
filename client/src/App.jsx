import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ExpensesPage from './pages/ExpensesPage';
import AnalyticsPage from './pages/AnalyticsPage';
import BudgetPage from './pages/BudgetPage';
import SettingsPage from './pages/SettingsPage';
import InsightsPage from './pages/InsightsPage';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div className="spinner" style={{ width: 40, height: 40, borderWidth: 4 }} />
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/expenses" element={<ExpensesPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/budgets" element={<BudgetPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/insights" element={<InsightsPage />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
