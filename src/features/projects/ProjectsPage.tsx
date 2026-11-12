import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States';
import { getAvailablePath } from '@/content/paths';
import { labels } from '@/content/options';
import { summarize } from '@/domain/progress';
import { formatRelative } from '@/lib/format';
import { getSupabase } from '@/lib/supabase';
import { useUser } from '@/features/auth/AuthProvider';
import { useProfile, useProjects } from './api';

function useTaskStatusesByProject() {
  const user = useUser();
  return useQuery({
    queryKey: ['task-statuses', user.id],
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await getSupabase().from('project_tasks').select('id, project_id, phase_key, position, status');
      if (error) throw error;
      const groups = new Map<string, typeof data>();
      for (const t of data) groups.set(t.project_id, [...(groups.get(t.project_id) ?? []), t]);
      const map = new Map<string, ReturnType<typeof summarize>>();
      for (const [id, list] of groups) map.set(id, summarize(list.map((t) => ({ id: t.id, phaseKey: t.phase_key, position: t.position, status: t.status }))));
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
      <header className="phead">
        <div>
          <p className="phead__eyebrow">LaunchOS</p>
          <h1 className="phead__title">Proyectos</h1>
        </div>
        <ButtonLink to="/app/new" variant="primary">
          <Icon name="plus" /> Nuevo proyecto
        </ButtonLink>
      </header>
      {projects.isPending ? (
        <div className="stack-md">
          <Skeleton height={96} />
          <Skeleton height={96} />
        </div>
      ) : projects.error ? (
        <ErrorState error={projects.error} onRetry={() => projects.refetch()} />
      ) : projects.data.length === 0 ? (
        <EmptyState
          title="Todavía no tienes proyectos"
          description="Crea el primero y recibe un roadmap adaptado a tu situación."
          actions={
            <ButtonLink to="/app/new" variant="primary">
              Crear proyecto
            </ButtonLink>
          }
        />
      ) : (
        <ul className="plist">
          {projects.data.map((p, i) => {
            const path = getAvailablePath(p.path_id);
            const s = progress.data?.get(p.id);
            return (
              <motion.li key={p.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: i * 0.06 }}>
                <Link to={`/app/projects/${p.id}`} className="pitem">
                  <span className="pitem__ring">
                    <ProgressRing value={s?.percent ?? 0} size={56} stroke={5} label={`Progreso de ${p.name}`} />
                    <span>{s ? `${s.percent}` : '·'}</span>
                  </span>
                  <span className="pitem__main">
                    <span className="pitem__name">
                      {p.name}
                      {profile.data?.active_project_id === p.id && <span className="tag tag--accent">Último abierto</span>}
                      {p.status === 'paused' && <span className="tag">En pausa</span>}
                    </span>
                    <span className="pitem__meta">
                      {path?.name ?? p.path_id} · {labels.stage(p.stage)}
                      {s ? ` · ${s.done} de ${s.total - s.skipped} tareas` : ''}
                    </span>
                  </span>
                  <span className="pitem__when">Actualizado {formatRelative(p.updated_at)}</span>
                  <Icon name="arrowRight" />
                </Link>
              </motion.li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
