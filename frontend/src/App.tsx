import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { useAuth } from './hooks/useAuth';
import { LoadingSpinner } from './components/ui/LoadingSpinner';

// Pages
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { MissionList } from './pages/missions/MissionList';
import { MissionDetail } from './pages/missions/MissionDetail';
import { MissionForm } from './pages/missions/MissionForm';
import { RecommendationList } from './pages/recommendations/RecommendationList';
import { RecommendationDetail } from './pages/recommendations/RecommendationDetail';
import { RecommendationForm } from './pages/recommendations/RecommendationForm';
import { ActionPlanList } from './pages/actionPlans/ActionPlanList';
import { ActionPlanDetail } from './pages/actionPlans/ActionPlanDetail';
import { ActionPlanForm } from './pages/actionPlans/ActionPlanForm';
import { EvidenceList } from './pages/evidences/EvidenceList';
import { Reports } from './pages/reports/Reports';
import { Notifications } from './pages/notifications/Notifications';
import { AuditLogs } from './pages/audit/AuditLogs';
import { Users } from './pages/admin/Users';
import { Parameters } from './pages/admin/Parameters';
import { Sources } from './pages/admin/Sources';
import { Entities } from './pages/admin/Entities';
import { RolesPermissions } from './pages/admin/RolesPermissions';
import { WorkflowConfig } from './pages/admin/WorkflowConfig';
import { ReminderRules } from './pages/admin/ReminderRules';
import { Profile } from './pages/Profile';

const AuthGuard: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner fullPage label="Vérification de la session..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    element: <AuthGuard />,
    children: [
      {
        element: <Layout />,
        children: [
          { index: true, element: <Dashboard /> },
          // Missions
          { path: 'missions', element: <MissionList /> },
          { path: 'missions/new', element: <MissionForm /> },
          { path: 'missions/:id', element: <MissionDetail /> },
          { path: 'missions/:id/edit', element: <MissionForm /> },
          // Recommendations
          { path: 'recommendations', element: <RecommendationList /> },
          { path: 'recommendations/new', element: <RecommendationForm /> },
          { path: 'recommendations/:id', element: <RecommendationDetail /> },
          { path: 'recommendations/:id/edit', element: <RecommendationForm /> },
          // Action Plans
          { path: 'action-plans', element: <ActionPlanList /> },
          { path: 'action-plans/new', element: <ActionPlanForm /> },
          { path: 'action-plans/:id', element: <ActionPlanDetail /> },
          { path: 'action-plans/:id/edit', element: <ActionPlanForm /> },
          // Evidences
          { path: 'evidences', element: <EvidenceList /> },
          // Reports
          { path: 'reports', element: <Reports /> },
          // Notifications
          { path: 'notifications', element: <Notifications /> },
          // Audit
          { path: 'audit-logs', element: <AuditLogs /> },
          // Admin
          { path: 'admin', element: <Navigate to="/admin/users" replace /> },
          { path: 'admin/users', element: <Users /> },
          { path: 'admin/parameters', element: <Parameters /> },
          { path: 'admin/sources', element: <Sources /> },
          { path: 'admin/entities', element: <Entities /> },
          { path: 'admin/roles', element: <RolesPermissions /> },
          { path: 'admin/workflow', element: <WorkflowConfig /> },
          { path: 'admin/reminders', element: <ReminderRules /> },
          // Profile
          { path: 'profile', element: <Profile /> },
          // Fallback
          { path: '*', element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
]);

export const App: React.FC = () => {
  return <RouterProvider router={router} />;
};
