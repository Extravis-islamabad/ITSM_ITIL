import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useAuth } from "@/hooks/useAuth";
import { NotificationProvider } from './contexts/NotificationContext';
import RoleProtectedRoute from "@/components/auth/RoleProtectedRoute";

// Auth Pages
import LoginPage from "@/pages/auth/LoginPage";
import AccessDeniedPage from "@/pages/AccessDeniedPage";
import NotFoundPage from "@/pages/NotFoundPage";

// Layout
import DashboardLayout from "@/components/layout/DashboardLayout";

// Dashboard
import Dashboard from "@/pages/Dashboard";
import ProfilePage from "@/pages/profile/ProfilePage";
import NotificationsPage from "@/pages/notifications/NotificationsPage";

// Incidents - All authenticated users
import IncidentsPage from "@/pages/incidents/IncidentsPage";
import IncidentDetailPage from "@/pages/incidents/IncidentDetailPage";
import IncidentEditPage from "@/pages/incidents/IncidentEditPage";

// Service Requests - All authenticated users
import ServiceRequestsPage from "@/pages/service-requests/ServiceRequestsPage";
import ServiceRequestDetailPage from "@/pages/service-requests/ServiceRequestDetailPage";

// Changes - All authenticated users can view, but actions are RBAC controlled in components
import ChangesPage from "@/pages/changes/ChangesPage";
import CreateChangePage from "@/pages/changes/CreateChangePage";
import ChangeDetailPage from "@/pages/changes/ChangeDetailPage";
import ChangeCalendarPage from "@/pages/changes/ChangeCalendarPage";

// Problems - Team Lead+ only
import ProblemsPage from "@/pages/ProblemsPage";
import ProblemDetailPage from "@/pages/ProblemDetailPage";

// Assets - Agent+ only
import AssetsPage from "@/pages/assets/AssetsPage";
import AssetDetailPage from "@/pages/assets/AssetDetailPage";
import AssetEditorPage from "@/pages/assets/AssetEditorPage";
import AssetTypesPage from "@/pages/assets/AssetTypesPage";

// Knowledge Base - All can view, Agent+ can edit
import ArticlesPage from "@/pages/knowledge/ArticlesPage";
import ArticleEditorPage from "@/pages/knowledge/ArticleEditorPage";
import KnowledgeCategoriesPage from "@/pages/knowledge/CategoriesPage";
import PublicKnowledgeBasePage from "@/pages/knowledge/PublicKnowledgeBasePage";
import ArticleViewPage from "@/pages/knowledge/ArticleViewPage";

// Reports - Team Lead+ only
import ReportsPage from "@/pages/reports/ReportsPage";
import SLADashboard from "@/pages/reports/SLADashboard";
import SLATrackingPage from "@/pages/reports/SLATrackingPage";
import TicketAgingReport from "@/pages/reports/TicketAgingReport";
import TechnicianPerformance from "@/pages/reports/TechnicianPerformance";
import ScheduledReportsPage from "@/pages/reports/ScheduledReportsPage";

// Admin - Users, Roles, Settings
import UsersPage from "@/pages/users/UsersPage";
import RolesPage from "@/pages/roles/RolesPage";
import SettingsPage from "@/pages/settings/SettingsPage";
import NotificationPreferencesPage from "@/pages/settings/NotificationPreferencesPage";
import SLAPoliciesPage from "@/pages/settings/SLAPoliciesPage";
import TicketCategoriesPage from "@/pages/settings/CategoriesPage";
import GroupsPage from "@/pages/settings/GroupsPage";
import SystemSettingsPage from "@/pages/settings/SystemSettingsPage";
import IntegrationsPage from "@/pages/settings/IntegrationsPage";
import ServiceTemplatesPage from "@/pages/settings/ServiceTemplatesPage";

// Live Chat
import ChatPage from "@/pages/chat/ChatPage";

// Projects
import ProjectsPage from "@/pages/projects/ProjectsPage";
import ProjectDetailPage from "@/pages/projects/ProjectDetailPage";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <NotificationProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/kb" element={<PublicKnowledgeBasePage />} />
            <Route path="/kb/:slug" element={<ArticleViewPage />} />
            <Route path="/access-denied" element={<AccessDeniedPage />} />

            {/* Protected Routes - Require Authentication */}
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <DashboardLayout />
                </PrivateRoute>
              }
            >
              {/* Dashboard - All authenticated users */}
              <Route index element={<Dashboard />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="notifications" element={<NotificationsPage />} />

              {/* Live Chat - All authenticated users */}
              <Route path="chat" element={<ChatPage />} />

              {/* Projects - All authenticated users */}
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="projects/:projectId/*" element={<ProjectDetailPage />} />

              {/* Incidents - All authenticated users */}
              <Route path="incidents" element={<IncidentsPage />} />
              <Route path="incidents/:id" element={<IncidentDetailPage />} />
              <Route path="incidents/:id/edit" element={
                <RoleProtectedRoute requiredRole="agent+">
                  <IncidentEditPage />
                </RoleProtectedRoute>
              } />

              {/* Service Requests - All authenticated users */}
              <Route path="service-requests" element={<ServiceRequestsPage />} />
              <Route path="service-requests/:id" element={<ServiceRequestDetailPage />} />

              {/* Changes - All authenticated users can view/create */}
              <Route path="changes" element={<ChangesPage />} />
              <Route path="changes/new" element={<CreateChangePage />} />
              <Route path="changes/:id" element={<ChangeDetailPage />} />
              <Route path="changes/calendar" element={<ChangeCalendarPage />} />

              {/* Problems - Team Lead and above only */}
              <Route path="problems" element={
                <RoleProtectedRoute requiredRole="teamlead+">
                  <ProblemsPage />
                </RoleProtectedRoute>
              } />
              <Route path="problems/:id" element={
                <RoleProtectedRoute requiredRole="teamlead+">
                  <ProblemDetailPage />
                </RoleProtectedRoute>
              } />

              {/* Assets - Agent and above only */}
              <Route path="assets" element={
                <RoleProtectedRoute requiredRole="agent+">
                  <AssetsPage />
                </RoleProtectedRoute>
              } />
              <Route path="assets/new" element={
                <RoleProtectedRoute requiredRole="agent+">
                  <AssetEditorPage />
                </RoleProtectedRoute>
              } />
              <Route path="assets/types" element={
                <RoleProtectedRoute requiredRole="manager+">
                  <AssetTypesPage />
                </RoleProtectedRoute>
              } />
              <Route path="assets/:id" element={
                <RoleProtectedRoute requiredRole="agent+">
                  <AssetDetailPage />
                </RoleProtectedRoute>
              } />
              <Route path="assets/:id/edit" element={
                <RoleProtectedRoute requiredRole="agent+">
                  <AssetEditorPage />
                </RoleProtectedRoute>
              } />

              {/* Knowledge Base - All can view articles */}
              <Route path="knowledge/articles" element={<ArticlesPage />} />
              <Route path="knowledge/articles/:id" element={
                <RoleProtectedRoute requiredRole="agent+">
                  <ArticleEditorPage />
                </RoleProtectedRoute>
              } />
              <Route path="knowledge/categories" element={
                <RoleProtectedRoute requiredRole="agent+">
                  <KnowledgeCategoriesPage />
                </RoleProtectedRoute>
              } />

              {/* Reports - Team Lead and above only */}
              <Route path="reports" element={
                <RoleProtectedRoute requiredRole="teamlead+">
                  <ReportsPage />
                </RoleProtectedRoute>
              } />
              <Route path="reports/sla-dashboard" element={
                <RoleProtectedRoute requiredRole="teamlead+">
                  <SLADashboard />
                </RoleProtectedRoute>
              } />
              <Route path="reports/ticket-aging" element={
                <RoleProtectedRoute requiredRole="teamlead+">
                  <TicketAgingReport />
                </RoleProtectedRoute>
              } />
              <Route path="reports/performance" element={
                <RoleProtectedRoute requiredRole="manager+">
                  <TechnicianPerformance />
                </RoleProtectedRoute>
              } />
              <Route path="reports/sla-tracking" element={
                <RoleProtectedRoute requiredRole="teamlead+">
                  <SLATrackingPage />
                </RoleProtectedRoute>
              } />
              <Route path="reports/scheduled" element={
                <RoleProtectedRoute requiredRole="manager+">
                  <ScheduledReportsPage />
                </RoleProtectedRoute>
              } />

              {/* User Management - Manager and above */}
              <Route path="users" element={
                <RoleProtectedRoute requiredRole="manager+">
                  <UsersPage />
                </RoleProtectedRoute>
              } />

              {/* Roles Management - Admin only */}
              <Route path="roles" element={
                <RoleProtectedRoute requiredRole="admin">
                  <RolesPage />
                </RoleProtectedRoute>
              } />

              {/* Settings */}
              <Route path="settings" element={
                <RoleProtectedRoute requiredRole="manager+">
                  <SettingsPage />
                </RoleProtectedRoute>
              } />
              <Route path="settings/notifications" element={<NotificationPreferencesPage />} />
              <Route path="settings/sla-policies" element={
                <RoleProtectedRoute requiredRole="manager+">
                  <SLAPoliciesPage />
                </RoleProtectedRoute>
              } />
              <Route path="settings/categories" element={
                <RoleProtectedRoute requiredRole="manager+">
                  <TicketCategoriesPage />
                </RoleProtectedRoute>
              } />
              <Route path="settings/groups" element={
                <RoleProtectedRoute requiredRole="manager+">
                  <GroupsPage />
                </RoleProtectedRoute>
              } />
              <Route path="settings/system" element={
                <RoleProtectedRoute requiredRole="admin">
                  <SystemSettingsPage />
                </RoleProtectedRoute>
              } />
              <Route path="settings/integrations" element={
                <RoleProtectedRoute requiredRole="admin">
                  <IntegrationsPage />
                </RoleProtectedRoute>
              } />
              <Route path="settings/service-templates" element={
                <RoleProtectedRoute requiredRole="manager+">
                  <ServiceTemplatesPage />
                </RoleProtectedRoute>
              } />
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </NotificationProvider>
      </Router>
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Check if we have a token in localStorage (for initial page load)
  const hasToken = !!localStorage.getItem('access_token');

  // Show loading while determining auth state
  // Also show loading if we have a token but auth state isn't resolved yet
  if (isLoading || (hasToken && !isAuthenticated && !user)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated and no token
  if (!isAuthenticated && !hasToken) {
    return <Navigate to="/login" replace />;
  }

  // If authenticated but no user data yet, show loading
  // This happens right after login before user data is fully loaded
  if (isAuthenticated && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // If we have a token but not authenticated (store not synced yet), wait
  if (hasToken && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Final check - redirect if truly not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default App;
