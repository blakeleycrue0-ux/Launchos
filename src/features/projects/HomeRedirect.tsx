import { Navigate } from 'react-router-dom';
import { ErrorState } from '@/components/ui/States';
import { FullScreenLoader } from '@/features/auth/RequireAuth';
import { useProfile, useProjects } from './api';

/**
 * /app: lleva al usuario a donde lo dejó.
 * - Sin proyectos → onboarding.
 * - Con proyecto activo guardado → ese proyecto.
 * - Si no → el proyecto más reciente.
 */
export function HomeRedirect() {
  const profile = useProfile();
  const projects = useProjects();

  if (profile.isPending || projects.isPending) return <FullScreenLoader />;
  const error = profile.error ?? projects.error;
  if (error) {
    return (
      <div className="page">
        <ErrorState error={error} onRetry={() => { void profile.refetch(); void projects.refetch(); }} />
      </div>
    );
  }
  const list = projects.data ?? [];
  if (list.length === 0) return <Navigate to="/app/new" replace />;
  const activeId = profile.data?.active_project_id;
  const target = list.find((p) => p.id === activeId) ?? list[0]!;
  return <Navigate to={`/app/projects/${target.id}`} replace />;
}
