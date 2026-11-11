import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage';
import { LoginPage } from '@/features/auth/LoginPage';
import { RedirectIfAuthenticated, RequireAuth } from '@/features/auth/RequireAuth';
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage';
import { SignupPage } from '@/features/auth/SignupPage';
import { ProjectDashboardPage } from '@/features/dashboard/ProjectDashboardPage';
import { MetricsHistoryPage } from '@/features/metrics/MetricsHistoryPage';
import { OnboardingPage } from '@/features/onboarding/OnboardingPage';
import { HomeRedirect } from '@/features/projects/HomeRedirect';
import { ProjectsPage } from '@/features/projects/ProjectsPage';
import { TaskDetailPage } from '@/features/tasks/TaskDetailPage';
import { NotFoundPage } from './NotFoundPage';

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/app" replace /> },
  {
    element: <RedirectIfAuthenticated />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/signup', element: <SignupPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
    ],
  },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  {
    path: '/app',
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <HomeRedirect /> },
          { path: 'new', element: <OnboardingPage /> },
          { path: 'projects', element: <ProjectsPage /> },
          { path: 'projects/:projectId', element: <ProjectDashboardPage /> },
          { path: 'projects/:projectId/tasks/:taskId', element: <TaskDetailPage /> },
          { path: 'projects/:projectId/metrics', element: <MetricsHistoryPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
