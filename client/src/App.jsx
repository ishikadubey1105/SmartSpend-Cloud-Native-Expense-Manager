import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import { PageSkeleton } from './components/Skeleton';

// ── Code-split every page for faster initial load ────────────────────────────
const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ExpensesPage = lazy(() => import('./pages/ExpensesPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const BudgetsPage = lazy(() => import('./pages/BudgetsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const InsightsPage = lazy(() => import('./pages/InsightsPage'));
const SubscriptionsPage = lazy(() => import('./pages/SubscriptionsPage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageSkeleton />;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const { user, loading } = useAuth();

  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route path="/login" element={
          loading ? <PageSkeleton /> : user ? <Navigate to="/dashboard" replace /> : <LoginPage />
        } />

        <Route path="/*" element={
          <ProtectedRoute>
            <Layout>
              <Suspense fallback={<PageSkeleton />}>
                <Routes>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/expenses" element={<ExpensesPage />} />
                  <Route path="/analytics" element={<AnalyticsPage />} />
                  <Route path="/budgets" element={<BudgetsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/insights" element={<InsightsPage />} />
                  <Route path="/subscriptions" element={<SubscriptionsPage />} />
                  <Route path="/chat" element={<ChatPage />} />
                  <Route path="/notifications" element={<NotificationsPage />} />
                  <Route path="/404" element={<NotFoundPage />} />
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Suspense>
            </Layout>
          </ProtectedRoute>
        } />
      </Routes>
    </Suspense>
  );
}
