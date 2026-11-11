import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { ProgressBar } from '@/components/ui/Progress';
import { Alert, EmptyState, ErrorState, Skeleton } from '@/components/ui/States';
import { labels } from '@/content/options';
import { estimateWeeks } from '@/domain/progress';
import { toUserMessage } from '@/lib/errors';
import { formatMinutes } from '@/lib/format';
import { MetricsCard } from '@/features/metrics/MetricsCard';
import { useProfile, useSetActiveProject, useUpdateTask } from '@/features/projects/api';
import { ProjectSettings } from '@/features/projects/ProjectSettings';
import { useProjectWorkspace } from '@/features/projects/useProjectWorkspace';
import { TaskStatusToggle } from '@/features/tasks/TaskStatusToggle';

export function ProjectDashboardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const ws = useProjectWorkspace(projectId);
  const profile = useProfile();
  const setActive = useSetActiveProject();
  const updateTask = useUpdateTask(projectId ?? '');

  // Recuerda el último proyecto abierto para continuar aquí la próxima vez.
  const shouldMarkActive = Boolean(ws.project.data && profile.data && profile.data.active_project_id !== ws.project.data.id);
  const mutateActive = setActive.mutate;
  useEffect(() => {
    if (shouldMarkActive && projectId) mutateActive(projectId);
  }, [shouldMarkActive, projectId, mutateActive]);

  if (ws.isPending) return <DashboardSkeleton />;
  if (ws.error) {
    return (
      <div className="page">
        <ErrorState error={ws.error} onRetry={ws.refetch} />
      </div>
    );
  }
  const project = ws.project.data;
  if (!project) {
    return (
      <div className="page">
        <EmptyState
          title="Proyecto no encontrado"
          description="Puede que se haya eliminado o que el enlace no sea correcto."
          actions={<ButtonLink to="/app/projects">Ver proyectos</ButtonLink>}
        />
      </div>
    );
  }
  if (!ws.path) {
    return (
      <div className="page">
        <EmptyState title="Camino no disponible" description="El camino de este proyecto ya no está disponible en esta versión de LaunchOS." />
      </div>
    );
  }
  if (!ws.data) return <DashboardSkeleton />;

  const { items, summary, byPhase, next, remainingMinutes, orphanCount } = ws.data;
  const path = ws.path;
  const weeks = estimateWeeks(remainingMinutes, project.weekly_hours);
  const taskUrl = (taskId: string) => `/app/projects/${project.id}/tasks/${taskId}`;

  return (
    <div className="page">
      <PageHeader
        eyebrow={
          <>
            <span>{path.name}</span>
            <span aria-hidden="true">·</span>
            <span>{labels.stage(project.stage)}</span>
            {project.status === 'paused' && <span className="badge badge--warning">En pausa</span>}
          </>
        }
        title={project.name}
        description={project.goal ?? undefined}
      />

      {updateTask.error && (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <Alert tone="error">No se ha podido guardar el cambio: {toUserMessage(updateTask.error)}</Alert>
        </div>
      )}
      {orphanCount > 0 && (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <Alert>
            {orphanCount} {orphanCount === 1 ? 'tarea guardada pertenece' : 'tareas guardadas pertenecen'} a una versión anterior del roadmap y no se muestran.
          </Alert>
        </div>
      )}

      <div className="dashboard">
        <div className="dashboard__main">
          {/* Próxima acción */}
          <section className="card next-action" aria-labelledby="next-title">
            <div className="card__body">
              <p className="next-action__label">Próxima acción</p>
              {next ? (
                <>
                  <h2 id="next-title" className="next-action__title">
                    {next.template.title}
                  </h2>
                  <p className="next-action__summary">{next.template.summary}</p>
                  <div className="next-action__meta">
                    <span className="badge">{next.phase.title}</span>
                    <span className="badge">{formatMinutes(next.template.estimatedMinutes)}</span>
                    {next.row.status === 'in_progress' && <span className="badge badge--accent">En curso</span>}
                  </div>
                  <div className="next-action__actions">
                    <ButtonLink to={taskUrl(next.row.id)} variant="primary">
                      Ver instrucciones <Icon name="arrowRight" />
                    </ButtonLink>
                    {next.row.status === 'todo' ? (
                      <Button
                        loading={updateTask.isPending && updateTask.variables?.taskId === next.row.id}
                        onClick={() => updateTask.mutate({ taskId: next.row.id, patch: { status: 'in_progress' } })}
                      >
                        Empezar
                      </Button>
                    ) : (
                      <Button
                        loading={updateTask.isPending && updateTask.variables?.taskId === next.row.id}
                        onClick={() => updateTask.mutate({ taskId: next.row.id, patch: { status: 'done' } })}
                      >
                        <Icon name="check" /> Marcar como hecha
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <h2 id="next-title" className="next-action__title">
                    Roadmap completado
                  </h2>
                  <p className="next-action__summary">
                    Has terminado todas las tareas de este roadmap. Sigue registrando tus resultados para medir el crecimiento.
                  </p>
                </>
              )}
            </div>
          </section>

          {/* Roadmap */}
          <section aria-labelledby="roadmap-title">
            <div className="section-head">
              <h2 id="roadmap-title" className="section-title">
                Roadmap
              </h2>
              <span className="field__hint">
                {summary.done} de {summary.total - summary.skipped} tareas
              </span>
            </div>
            <div className="stack-md">
              {path.phases.map((phase) => {
                const phaseItems = items.filter((i) => i.row.phase_key === phase.key);
                if (phaseItems.length === 0) return null;
                const ps = byPhase.get(phase.key);
                return (
                  <section key={phase.key} className="card phase" aria-labelledby={`phase-${phase.key}`}>
                    <header className="phase__header">
                      <div>
                        <h3 id={`phase-${phase.key}`} className="phase__title">
                          {phase.title}
                        </h3>
                        <p className="phase__desc">{phase.description}</p>
                      </div>
                      <span className="phase__count">
                        {ps?.done ?? 0}/{(ps?.total ?? 0) - (ps?.skipped ?? 0)}
                      </span>
                    </header>
                    <ul className="task-list">
                      {phaseItems.map((item) => (
                        <li key={item.row.id} className="task-row" data-status={item.row.status}>
                          <TaskStatusToggle
                            status={item.row.status}
                            title={item.template.title}
                            pending={updateTask.isPending && updateTask.variables?.taskId === item.row.id}
                            onToggle={(status) => updateTask.mutate({ taskId: item.row.id, patch: { status } })}
                          />
                          <Link to={taskUrl(item.row.id)} className="task-row__link">
                            <span className="task-row__title">{item.template.title}</span>
                            <span className="task-row__meta">
                              {item.row.status === 'in_progress' && <span className="badge badge--accent">En curso</span>}
                              {item.row.status === 'skipped' && <span className="badge">Omitida</span>}
                              <span>{formatMinutes(item.template.estimatedMinutes)}</span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="dashboard__side">
          <section className="card" aria-labelledby="progress-title">
            <div className="card__header">
              <h2 id="progress-title" className="card__title">
                Progreso
              </h2>
              <span className="progress-value">{summary.percent}%</span>
            </div>
            <div className="card__body stack-md">
              <ProgressBar value={summary.percent} label="Progreso del roadmap" />
              <dl className="stats stats--compact">
                <div>
                  <dt>Completadas</dt>
                  <dd>{summary.done}</dd>
                </div>
                <div>
                  <dt>En curso</dt>
                  <dd>{summary.inProgress}</dd>
                </div>
                <div>
                  <dt>Pendiente</dt>
                  <dd>{remainingMinutes > 0 ? `≈ ${weeks} sem.` : '—'}</dd>
                </div>
              </dl>
              <ul className="phase-progress">
                {path.phases.map((phase) => {
                  const ps = byPhase.get(phase.key);
                  if (!ps) return null;
                  return (
                    <li key={phase.key}>
                      <span>{phase.title}</span>
                      <span className="phase-progress__bar">
                        <ProgressBar value={ps.percent} label={`Progreso de ${phase.title}`} />
                      </span>
                      <span className="phase-progress__pct">{ps.percent}%</span>
                    </li>
                  );
                })}
              </ul>
              {remainingMinutes > 0 && (
                <p className="field__hint">
                  Estimación con tu disponibilidad de {labels.weeklyHours(project.weekly_hours).toLowerCase()} a la semana.
                </p>
              )}
            </div>
          </section>

          <MetricsCard projectId={project.id} path={path} />

          <section className="card" aria-labelledby="profile-title">
            <div className="card__header">
              <h2 id="profile-title" className="card__title">
                Tu punto de partida
              </h2>
            </div>
            <div className="card__body">
              <dl className="details">
                <div>
                  <dt>Experiencia</dt>
                  <dd>{labels.experience(project.experience)}</dd>
                </div>
                <div>
                  <dt>Presupuesto</dt>
                  <dd>{labels.budget(project.budget)}</dd>
                </div>
                <div>
                  <dt>Tiempo</dt>
                  <dd>{labels.weeklyHours(project.weekly_hours)}</dd>
                </div>
                {path.questions.map((q) => {
                  const answers = (project.path_answers ?? {}) as Record<string, string>;
                  const opt = q.options.find((o) => o.value === answers[q.key]);
                  return opt ? (
                    <div key={q.key}>
                      <dt>{q.label.replace(/^¿|\?$/g, '')}</dt>
                      <dd>{opt.label}</dd>
                    </div>
                  ) : null;
                })}
              </dl>
            </div>
          </section>

          <ProjectSettings project={project} />
        </aside>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="page" aria-busy="true" aria-label="Cargando proyecto">
      <Skeleton height={14} width={160} />
      <Skeleton height={34} width={320} style={{ marginTop: 12, marginBottom: 32 }} />
      <div className="dashboard">
        <div className="dashboard__main">
          <Skeleton height={190} />
          <Skeleton height={320} />
        </div>
        <div className="dashboard__side">
          <Skeleton height={220} />
          <Skeleton height={180} />
        </div>
      </div>
    </div>
  );
}
