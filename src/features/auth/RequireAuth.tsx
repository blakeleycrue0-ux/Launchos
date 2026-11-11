import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from './AuthProvider';

export function FullScreenLoader() {
  return (
    <div className="fullscreen-center" style={{ color: 'var(--color-text-tertiary)' }}>
      <Spinner label="Cargando" />
    </div>
  );
}

export function RequireAuth() {
  const { user, initializing } = useAuth();
  const location = useLocation();
  if (initializing) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <Outlet />;
}

/** Rutas públicas de autenticación: si ya hay sesión, se envía a la app. */
export function RedirectIfAuthenticated() {
  const { user, initializing, passwordRecovery } = useAuth();
  if (initializing) return <FullScreenLoader />;
  if (passwordRecovery) return <Navigate to="/reset-password" replace />;
  if (user) return <Navigate to="/app" replace />;
  return <Outlet />;
}
