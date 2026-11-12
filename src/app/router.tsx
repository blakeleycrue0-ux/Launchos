import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage';
import { LoginPage } from '@/features/auth/LoginPage';
import { FullScreenLoader, RedirectIfAuthenticated, RequireAuth } from '@/features/auth/RequireAuth';
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage';
import { SignupPage } from '@/features/auth/SignupPage';
import { ProjectDashboardPage } from '@/features/dashboard/ProjectDashboardPage';
import { AccountPage } from '@/features/account/AccountPage';
import { MetricsPage } from '@/features/metrics/MetricsPage';
import { HomeRedirect } from '@/features/projects/HomeRedirect';
import { ProjectsPage } from '@/features/projects/ProjectsPage';
import { RoadmapPage } from '@/features/tasks/RoadmapPage';
import { TaskDetailPage } from '@/features/tasks/TaskDetailPage';
import { NotFoundPage } from './NotFoundPage';

// El onboarding es una experiencia a pantalla completa (sin la barra lateral)
// y se carga aparte junto con la librería de animación.
const OnboardingPage = lazy(() => import('@/features/onboarding/OnboardingPage').then((m) => ({ default: m.OnboardingPage })));
const LandingPage = lazy(() => import('@/features/landing/LandingPage').then((m) => ({ default: m.LandingPage })));

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <Suspense fallback={<FullScreenLoader />}>
        <LandingPage />
      </Suspense>
    ),
  },
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
        path: 'new',
        element: (
          <Suspense fallback={<FullScreenLoader />}>
            <OnboardingPage />
          </Suspense>
        ),
      },
      {
        element: <AppShell />,
        children: [
          { index: true, element: <HomeRedirect /> },
          { path: 'projects', element: <ProjectsPage /> },
          { path: 'projects/:projectId', element: <ProjectDashboardPage /> },
          { path: 'projects/:projectId/tasks/:taskId', element: <TaskDetailPage /> },
          { path: 'projects/:projectId/roadmap', element: <RoadmapPage /> },
          { path: 'projects/:projectId/metrics', element: <MetricsPage /> },
          { path: 'account', element: <AccountPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
