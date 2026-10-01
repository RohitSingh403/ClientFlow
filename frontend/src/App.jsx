import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Shell from './components/Shell.jsx';
import ActivityPage from './pages/Activity.jsx';
import BillingPage from './pages/Billing.jsx';
import ClientDetailPage from './pages/ClientDetail.jsx';
import ClientsPage from './pages/Clients.jsx';
import DashboardPage from './pages/Dashboard.jsx';
import InvoiceDetailPage from './pages/InvoiceDetail.jsx';
import InvoicesPage from './pages/Invoices.jsx';
import LandingPage from './pages/Landing.jsx';
import LoginPage from './pages/Login.jsx';
import NotificationsPage from './pages/Notifications.jsx';
import ProjectDetailPage from './pages/ProjectDetail.jsx';
import ProjectsPage from './pages/Projects.jsx';
import RegisterPage from './pages/Register.jsx';
import TeamPage from './pages/Team.jsx';

function RequireAuth({ children }) {
  const { ready, user } = useAuth();
  if (!ready) return <div className="p-10 text-sm text-ink-soft">Loading the studio…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function Guest({ children }) {
  const { ready, user } = useAuth();
  if (!ready) return <div className="p-10 text-sm text-ink-soft">Loading…</div>;
  if (user) return <Navigate to="/app" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Guest><LoginPage /></Guest>} />
      <Route path="/register" element={<Guest><RegisterPage /></Guest>} />
      <Route
        path="/app"
        element={
          <RequireAuth>
            <Shell />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="clients/:id" element={<ClientDetailPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:id" element={<ProjectDetailPage />} />
        <Route path="invoices" element={<InvoicesPage />} />
        <Route path="invoices/:id" element={<InvoiceDetailPage />} />
        <Route path="activity" element={<ActivityPage />} />
        <Route path="team" element={<TeamPage />} />
        <Route path="billing" element={<BillingPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
