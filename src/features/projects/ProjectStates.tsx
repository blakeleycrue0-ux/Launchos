import { ButtonLink } from '@/components/ui/Button';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States';
import type { useProjectWorkspace } from './useProjectWorkspace';

type Workspace = ReturnType<typeof useProjectWorkspace>;

export function PageSkeleton() {
  return (
    <div className="page" aria-busy="true" aria-label="Cargando">
      <Skeleton height={300} style={{ borderRadius: 28 }} />
      <Skeleton height={22} width={180} style={{ marginTop: 40 }} />
      <Skeleton height={120} style={{ marginTop: 16 }} />
      <Skeleton height={200} style={{ marginTop: 16 }} />
    </div>
  );
}

/** Estados comunes de las pantallas de proyecto. Devuelve null cuando hay datos listos. */
export function workspaceGate(ws: Workspace) {
  if (ws.isPending) return <PageSkeleton />;
  if (ws.error)
    return (
      <div className="page">
        <ErrorState error={ws.error} onRetry={ws.refetch} />
      </div>
    );
  if (!ws.project.data)
    return (
      <div className="page">
        <EmptyState title="Proyecto no encontrado" description="Puede que se haya eliminado o que el enlace no sea correcto." actions={<ButtonLink to="/app/projects">Ver proyectos</ButtonLink>} />
      </div>
    );
  if (!ws.path)
    return (
      <div className="page">
        <EmptyState title="Camino no disponible" description="El camino de este proyecto ya no está disponible en esta versión de LaunchOS." />
      </div>
    );
  if (!ws.data) return <PageSkeleton />;
  return null;
}
