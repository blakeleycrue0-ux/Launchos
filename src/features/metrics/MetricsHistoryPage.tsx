import { useParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Alert, EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { getAvailablePath } from '@/content/paths';
import { toUserMessage } from '@/lib/errors';
import { formatDate, formatMetric } from '@/lib/format';
import { useProject } from '@/features/projects/api';
import { useDeleteMetricEntry, useMetricEntries } from './api';

export function MetricsHistoryPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const project = useProject(projectId);
  const entries = useMetricEntries(projectId);
  const remove = useDeleteMetricEntry(projectId ?? '');

  if (project.isPending || entries.isPending) return <div className="page"><LoadingState /></div>;
  const error = project.error ?? entries.error;
  if (error) return <div className="page"><ErrorState error={error} onRetry={() => { void project.refetch(); void entries.refetch(); }} /></div>;
  if (!project.data) return <div className="page"><EmptyState title="Proyecto no encontrado" actions={<ButtonLink to="/app/projects">Ver proyectos</ButtonLink>} /></div>;

  const path = getAvailablePath(project.data.path_id);
  const defs = new Map(path?.metrics.map((m) => [m.key, m]));

  return (
    <div className="page page--narrow">
      <ButtonLink to={`/app/projects/${project.data.id}`} variant="ghost" size="sm" className="breadcrumb-btn">
        <Icon name="arrowLeft" size={14} /> {project.data.name}
      </ButtonLink>
      <PageHeader title="Historial de resultados" description="Todos los registros de métricas de este proyecto, del más reciente al más antiguo." />
      {remove.error && <Alert tone="error">{toUserMessage(remove.error)}</Alert>}
      {entries.data && entries.data.length > 0 ? (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Fecha</th>
                <th scope="col">Métrica</th>
                <th scope="col" className="num">Valor</th>
                <th scope="col">Nota</th>
                <th scope="col"><span className="visually-hidden">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {entries.data.map((e) => {
                const def = defs.get(e.metric_key);
                return (
                  <tr key={e.id}>
                    <td>{formatDate(e.recorded_on)}</td>
                    <td>{def?.label ?? e.metric_key}</td>
                    <td className="num">{formatMetric(e.value, def?.unit ?? 'count')}</td>
                    <td className="muted">{e.note ?? ''}</td>
                    <td className="num">
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`Eliminar registro de ${def?.label ?? e.metric_key} del ${formatDate(e.recorded_on)}`}
                        loading={remove.isPending && remove.variables === e.id}
                        onClick={() => remove.mutate(e.id)}
                      >
                        Eliminar
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="Sin registros" description="Registra tus primeros resultados desde el panel del proyecto." actions={<ButtonLink to={`/app/projects/${project.data.id}`}>Ir al proyecto</ButtonLink>} />
      )}
    </div>
  );
}
