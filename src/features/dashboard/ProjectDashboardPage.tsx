import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Sparkline } from '@/components/charts/Sparkline';
import { Button, ButtonLink } from '@/components/ui/Button';
import { CountUp } from '@/components/ui/CountUp';
import { Dialog } from '@/components/ui/Dialog';
import { Icon } from '@/components/ui/Icon';
import { Planes } from '@/components/ui/Planes';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Alert, ErrorState, Skeleton } from '@/components/ui/States';
import { labels } from '@/content/options';
import { buildActivity } from '@/domain/activity';
import { estimateWeeks } from '@/domain/progress';
import { toUserMessage } from '@/lib/errors';
import { formatMetric, formatMinutes, formatRelative } from '@/lib/format';
import { useMetricEntries } from '@/features/metrics/api';
import { MetricEntryForm } from '@/features/metrics/MetricEntryForm';
import { buildSeries, summarizeMetric } from '@/features/metrics/summary';
import { useProfile, useSetActiveProject, useUpdateTask } from '@/features/projects/api';
import { ProjectSettings } from '@/features/projects/ProjectSettings';
import { workspaceGate } from '@/features/projects/ProjectStates';
import { useProjectWorkspace } from '@/features/projects/useProjectWorkspace';
import { TaskRow } from '@/features/tasks/TaskRow';

const EASE = [0.22, 1, 0.36, 1] as const;

export function ProjectDashboardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const ws = useProjectWorkspace(projectId);
  const profile = useProfile();
  const setActive = useSetActiveProject();
  const updateTask = useUpdateTask(projectId ?? '');
  const metrics = useMetricEntries(projectId);
  const [adding, setAdding] = useState(false);

  // Recuerda el último proyecto abierto para continuar aquí la próxima vez.
  const shouldMarkActive = Boolean(ws.project.data && profile.data && profile.data.active_project_id !== ws.project.data.id);
  const mutateActive = setActive.mutate;
  useEffect(() => {
    if (shouldMarkActive && projectId) mutateActive(projectId);
  }, [shouldMarkActive, projectId, mutateActive]);

  const project = ws.project.data;
  const path = ws.path;
  const data = ws.data;

  const metricTiles = useMemo(() => {
    if (!path) return [];
    const points = (metrics.data ?? []).map((e) => ({ metricKey: e.metric_key, value: e.value, recordedOn: e.recorded_on }));
    return path.metrics.map((def) => ({ summary: summarizeMetric(def, points), series: buildSeries(def, points) }));
  }, [metrics.data, path]);

  const activity = useMemo(() => {
    if (!project || !data || !path) return [];
    const defs = new Map(path.metrics.map((m) => [m.key, m]));
    return buildActivity(
      {
        project,
        tasks: data.items.map((i) => ({ id: i.row.id, title: i.template.title, status: i.row.status, started_at: i.row.started_at, completed_at: i.row.completed_at, created_at: i.row.created_at })),
        metrics: (metrics.data ?? []).map((e) => {
          const def = defs.get(e.metric_key);
          return { id: e.id, label: def?.label ?? e.metric_key, formatted: formatMetric(e.value, def?.unit ?? 'count'), created_at: e.created_at, recorded_on: e.recorded_on };
        }),
      },
      7,
    );
  }, [project, data, path, metrics.data]);

  const gate = workspaceGate(ws);
  if (gate || !project || !path || !data) return gate;

  const { items, summary, byPhase, next, remainingMinutes, orphanCount } = data;
  const weeks = estimateWeeks(remainingMinutes, project.weekly_hours);
  const base = `/app/projects/${project.id}`;
  const currentPhase = path.phases.find((p) => p.key === (next?.row.phase_key ?? items[items.length - 1]?.row.phase_key));
  const phaseItems = items.filter((i) => i.row.phase_key === currentPhase?.key);
  const phaseSummary = currentPhase ? byPhase.get(currentPhase.key) : undefined;
  const busy = (id: string) => updateTask.isPending && updateTask.variables?.taskId === id;
  const hasMetrics = (metrics.data?.length ?? 0) > 0;

  return (
    <div className="page">
      <section className="hero" aria-labelledby="project-title">
        <Planes />
        <div className="hero__top">
          <div className="hero__id">
            <p className="hero__eyebrow">
              {path.name} · {labels.stage(project.stage)}
              {project.status === 'paused' && <span className="tag tag--dark">En pausa</span>}
            </p>
            <h1 id="project-title" className="hero__title">
              {project.name}
            </h1>
            {project.goal && <p className="hero__goal">{project.goal}</p>}
          </div>
          <div className="hero__progress">
            <ProgressRing value={summary.percent} size={104} stroke={7} label="Progreso del roadmap" track="rgb(255 255 255 / 0.12)" />
            <span className="hero__pct">
              <CountUp value={summary.percent} />
              <small>%</small>
            </span>
          </div>
        </div>

        <dl className="hero__stats">
          <div>
            <dt>Completadas</dt>
            <dd>
              <CountUp value={summary.done} /> <small>de {summary.total - summary.skipped}</small>
            </dd>
          </div>
          <div>
            <dt>En curso</dt>
            <dd>
              <CountUp value={summary.inProgress} />
            </dd>
          </div>
          <div>
            <dt>Queda</dt>
            <dd>{remainingMinutes > 0 ? <>≈ <CountUp value={weeks} /> <small>sem.</small></> : '—'}</dd>
          </div>
          <div>
            <dt>Fase</dt>
            <dd className="hero__phase">{currentPhase?.title ?? '—'}</dd>
          </div>
        </dl>

        <div className="next" aria-labelledby="next-title">
          <p className="next__label">Próxima acción</p>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={next?.row.id ?? 'done'} className="next__body" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.35, ease: EASE }}>
              {next ? (
                <>
                  <div className="next__text">
                    <h2 id="next-title" className="next__title">
                      {next.template.title}
                    </h2>
                    <p className="next__summary">{next.template.summary}</p>
                    <p className="next__meta">
                      <span>{next.phase.title}</span>
                      <span>{formatMinutes(next.template.estimatedMinutes)}</span>
                      {next.row.status === 'in_progress' && <span className="next__live">En curso</span>}
                    </p>
                  </div>
                  <div className="next__actions">
                    <ButtonLink to={`${base}/tasks/${next.row.id}`} variant="light">
                      Ver instrucciones <Icon name="arrowRight" />
                    </ButtonLink>
                    {next.row.status === 'todo' ? (
                      <Button variant="outline-dark" loading={busy(next.row.id)} onClick={() => updateTask.mutate({ taskId: next.row.id, patch: { status: 'in_progress' } })}>
                        Empezar
                      </Button>
                    ) : (
                      <Button variant="outline-dark" loading={busy(next.row.id)} onClick={() => updateTask.mutate({ taskId: next.row.id, patch: { status: 'done' } })}>
                        <Icon name="check" /> Marcar como hecha
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <div className="next__text">
                  <h2 id="next-title" className="next__title">
                    Roadmap completado
                  </h2>
                  <p className="next__summary">Has terminado todas las tareas. Sigue registrando tus resultados para medir cómo crece el proyecto.</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {updateTask.error && <Alert tone="error">No se ha podido guardar el cambio: {toUserMessage(updateTask.error)}</Alert>}
      {orphanCount > 0 && (
        <Alert>
          {orphanCount} {orphanCount === 1 ? 'tarea guardada pertenece' : 'tareas guardadas pertenecen'} a una versión anterior del roadmap y no se muestran.
        </Alert>
      )}

      <div className="cols">
        <div className="cols__main">
          <section className="block" aria-labelledby="results-title">
            <header className="block__head">
              <h2 id="results-title" className="block__title">
                Resultados
              </h2>
              <div className="block__actions">
                {hasMetrics && (
                  <Link to={`${base}/metrics`} className="textlink">
                    Ver métricas
                  </Link>
                )}
                <Button size="sm" onClick={() => setAdding(true)}>
                  <Icon name="plus" size={14} /> Registrar resultado
                </Button>
              </div>
            </header>
            {metrics.isPending ? (
              <Skeleton height={112} />
            ) : metrics.error ? (
              <ErrorState error={metrics.error} onRetry={() => metrics.refetch()} />
            ) : hasMetrics ? (
              <ul className="tiles">
                {metricTiles.map(({ summary: s, series }, i) => (
                  <motion.li key={s.definition.key} className="tile" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: EASE, delay: i * 0.06 }}>
                    <span className="tile__label">{s.definition.label}</span>
                    <span className="tile__value" data-empty={s.value === null}>
                      {s.value === null ? '—' : <CountUp value={s.value} format={(n) => formatMetric(Math.round(n * 100) / 100, s.definition.unit)} />}
                    </span>
                    <span className="tile__sub">
                      {s.value === null
                        ? 'Sin registros'
                        : s.secondary === null
                          ? 'Primer registro'
                          : s.definition.kind === 'flow'
                            ? `${formatMetric(s.secondary, s.definition.unit)} en 30 días`
                            : `${s.secondary >= 0 ? '+' : '−'}${formatMetric(Math.abs(s.secondary), s.definition.unit)} desde el anterior`}
                    </span>
                    <span className="tile__spark">
                      <Sparkline values={series.map((p) => p.value)} />
                    </span>
                  </motion.li>
                ))}
              </ul>
            ) : (
              <div className="quiet">
                <p>Todavía no has registrado resultados. Anota tus cifras reales y aquí verás su evolución.</p>
                <p className="quiet__list">{path.metrics.map((m) => m.label).join(' · ')}</p>
              </div>
            )}
          </section>

          {currentPhase && (
            <section className="block" aria-labelledby="phase-title">
              <header className="block__head">
                <div>
                  <p className="block__eyebrow">{next ? 'Fase actual' : 'Última fase'}</p>
                  <h2 id="phase-title" className="block__title">
                    {currentPhase.title}
                  </h2>
                </div>
                <div className="block__actions">
                  <span className="block__count">
                    {phaseSummary?.done ?? 0} de {(phaseSummary?.total ?? 0) - (phaseSummary?.skipped ?? 0)}
                  </span>
                  <Link to={`${base}/roadmap`} className="textlink">
                    Roadmap completo
                  </Link>
                </div>
              </header>
              <ul className="tlist">
                {phaseItems.map((item) => (
                  <TaskRow key={item.row.id} item={item} projectId={project.id} pending={busy(item.row.id)} highlight={item.row.id === next?.row.id} onToggle={(status) => updateTask.mutate({ taskId: item.row.id, patch: { status } })} />
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="cols__side">
          <section className="block" aria-labelledby="activity-title">
            <header className="block__head">
              <h2 id="activity-title" className="block__title">
                Actividad
              </h2>
            </header>
            <ol className="activity">
              <AnimatePresence initial={false}>
                {activity.map((e) => (
                  <motion.li key={e.id} layout="position" data-kind={e.kind} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35, ease: EASE }}>
                    <span className="activity__dot" aria-hidden="true" />
                    <span className="activity__text">
                      <strong>{e.title}</strong>
                      {e.detail && <span>{e.detail}</span>}
                    </span>
                    <time dateTime={e.at}>{formatRelative(e.at)}</time>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ol>
          </section>

          <section className="block" aria-labelledby="start-title">
            <header className="block__head">
              <h2 id="start-title" className="block__title">
                Tu punto de partida
              </h2>
            </header>
            <dl className="facts">
              <div>
                <dt>Experiencia</dt>
                <dd>{labels.experience(project.experience)}</dd>
              </div>
              <div>
                <dt>Presupuesto</dt>
                <dd>{labels.budget(project.budget)}</dd>
              </div>
              <div>
                <dt>Tiempo semanal</dt>
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
          </section>

          <ProjectSettings project={project} />
        </aside>
      </div>

      <AnimatePresence>
        {adding && (
          <Dialog title="Registrar resultado" onClose={() => setAdding(false)}>
            <MetricEntryForm projectId={project.id} path={path} onDone={() => setAdding(false)} />
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
}
