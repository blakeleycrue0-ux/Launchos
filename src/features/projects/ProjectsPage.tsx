import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { ProgressBar } from '@/components/ui/Progress';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States';
import { getAvailablePath } from '@/content/paths';
import { labels } from '@/content/options';
import { summarize } from '@/domain/progress';
import { formatDate } from '@/lib/format';
import { getSupabase } from '@/lib/supabase';
import { useUser } from '@/features/auth/AuthProvider';
import { useProfile, useProjects } from './api';

function useTaskStatusesByProject() {
  const user = useUser();
  return useQuery({
    queryKey: ['task-statuses', user.id],
    queryFn: async () => {
      const { data, error } = await getSupabase().from('project_tasks').select('id, project_id, phase_key, position, status');
      if (error) throw error;
      const map = new Map<string, ReturnType<typeof summarize>>();
      const groups = new Map<string, typeof data>();
      for (const t of data) groups.set(t.project_id, [...(groups.get(t.project_id) ?? []), t]);
      for (const [id, list] of groups) {
        map.set(id, summarize(list.map((t) => ({ id: t.id, phaseKey: t.phase_key, position: t.position, status: t.status }))));
      }
      return map;
    },
  });
}

export function ProjectsPage() {
  const projects = useProjects();
  const profile = useProfile();
  const progress = useTaskStatusesByProject();

  return (
    <div className="page">
      <PageHeader
        title="Proyectos"
        description="Todos tus proyectos y su avance."
        actions={
          <ButtonLink to="/app/new" variant="primary">
            <Icon name="plus" /> Nuevo proyecto
          </ButtonLink>
        }
      />
      {projects.isPending ? (
        <div className="stack-md">
          <Skeleton height={88} />
          <Skeleton height={88} />
        </div>
      ) : projects.error ? (
        <ErrorState error={projects.error} onRetry={() => projects.refetch()} />
      ) : projects.data.length === 0 ? (
        <EmptyState
          title="Todavía no tienes proyectos"
          description="Crea tu primer proyecto y recibe un roadmap adaptado a tu situación."
          actions={<ButtonLink to="/app/new" variant="primary">Crear proyecto</ButtonLink>}
        />
      ) : (
        <ul className="project-list">
          {projects.data.map((p) => {
            const path = getAvailablePath(p.path_id);
            const s = progress.data?.get(p.id);
            return (
              <li key={p.id}>
                <Link to={`/app/projects/${p.id}`} className="card project-item">
                  <div className="project-item__main">
                    <span className="project-item__name">
                      {p.name}
                      {profile.data?.active_project_id === p.id && <span className="badge">Último abierto</span>}
                      {p.status === 'paused' && <span className="badge badge--warning">En pausa</span>}
                    </span>
                    <span className="project-item__meta">
                      {path?.name ?? p.path_id} · {labels.stage(p.stage)} · Creado el {formatDate(p.created_at)}
                    </span>
                  </div>
                  <div className="project-item__progress">
                    {s ? (
                      <>
                        <ProgressBar value={s.percent} label={`Progreso de ${p.name}`} />
                        <span className="phase-progress__pct">{s.percent}%</span>
                      </>
                    ) : progress.isPending ? (
                      <Skeleton height={6} />
                    ) : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
