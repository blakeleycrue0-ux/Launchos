import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { AreaChart } from '@/components/charts/AreaChart';
import { Button, ButtonLink } from '@/components/ui/Button';
import { CountUp } from '@/components/ui/CountUp';
import { Dialog } from '@/components/ui/Dialog';
import { Icon } from '@/components/ui/Icon';
import { Alert, EmptyState, ErrorState } from '@/components/ui/States';
import { getAvailablePath } from '@/content/paths';
import { toUserMessage } from '@/lib/errors';
import { formatDate, formatMetric } from '@/lib/format';
import { useProject } from '@/features/projects/api';
import { PageSkeleton } from '@/features/projects/ProjectStates';
import { useDeleteMetricEntry, useMetricEntries } from './api';
import { MetricEntryForm } from './MetricEntryForm';
import { buildSeries, summarizeMetric } from './summary';

const EASE = [0.22, 1, 0.36, 1] as const;

export function MetricsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const project = useProject(projectId);
  const entries = useMetricEntries(projectId);
  const remove = useDeleteMetricEntry(projectId ?? '');
  const [adding, setAdding] = useState<string | null>(null);

  const path = project.data ? getAvailablePath(project.data.path_id) : undefined;
  const rows = useMemo(() => {
    if (!path) return [];
    const points = (entries.data ?? []).map((e) => ({ metricKey: e.metric_key, value: e.value, recordedOn: e.recorded_on }));
    return path.metrics.map((def) => ({ def, summary: summarizeMetric(def, points), series: buildSeries(def, points) }));
  }, [entries.data, path]);

  if (project.isPending || entries.isPending) return <PageSkeleton />;
  const error = project.error ?? entries.error;
  if (error)
    return (
      <div className="page">
        <ErrorState
          error={error}
          onRetry={() => {
            void project.refetch();
            void entries.refetch();
          }}
        />
      </div>
    );
  if (!project.data || !path)
    return (
      <div className="page">
        <EmptyState title="Proyecto no encontrado" actions={<ButtonLink to="/app/projects">Ver proyectos</ButtonLink>} />
      </div>
    );

  const defs = new Map(path.metrics.map((m) => [m.key, m]));
  const history = entries.data ?? [];

  return (
    <div className="page">
      <header className="phead">
        <div>
          <p className="phead__eyebrow">{project.data.name}</p>
          <h1 className="phead__title">Métricas</h1>
        </div>
        <Button variant="primary" onClick={() => setAdding(path.metrics[0]?.key ?? '')}>
          <Icon name="plus" /> Registrar resultado
        </Button>
      </header>

      <div className="mlist">
        {rows.map(({ def, summary: s, series }, i) => (
          <motion.section key={def.key} className="metric" aria-labelledby={`m-${def.key}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE, delay: i * 0.07 }}>
            <div className="metric__info">
              <h2 id={`m-${def.key}`} className="metric__label">
                {def.label}
              </h2>
              <p className="metric__value" data-empty={s.value === null}>
                {s.value === null ? '—' : <CountUp value={s.value} format={(n) => formatMetric(Math.round(n * 100) / 100, def.unit)} />}
              </p>
              <p className="metric__sub">
                {s.value === null
                  ? def.help
                  : `${def.kind === 'flow' ? 'Acumulado' : 'Último valor'} · ${s.entries} ${s.entries === 1 ? 'registro' : 'registros'}${
                      s.secondary === null ? '' : def.kind === 'flow' ? ` · ${formatMetric(s.secondary, def.unit)} en 30 días` : ` · ${s.secondary >= 0 ? '+' : '−'}${formatMetric(Math.abs(s.secondary), def.unit)} desde el anterior`
                    }`}
              </p>
              <Button size="sm" onClick={() => setAdding(def.key)}>
                Añadir registro
              </Button>
            </div>
            <div className="metric__chart">
              {series.length >= 2 ? (
                <AreaChart points={series} formatValue={(v) => formatMetric(Math.round(v * 100) / 100, def.unit)} formatDate={(d) => formatDate(d, true)} label={`${def.label}${def.kind === 'flow' ? ' (acumulado)' : ''}`} />
              ) : (
                <div className="metric__empty">
                  <span aria-hidden="true" />
                  <p>{series.length === 0 ? 'Sin registros todavía.' : 'Añade un segundo registro, en otra fecha, para ver la evolución.'}</p>
                </div>
              )}
            </div>
          </motion.section>
        ))}
      </div>

      <section className="block" aria-labelledby="history-title">
        <header className="block__head">
          <h2 id="history-title" className="block__title">
            Historial
          </h2>
          <span className="block__count">
            {history.length} {history.length === 1 ? 'registro' : 'registros'}
          </span>
        </header>
        {remove.error && <Alert tone="error">{toUserMessage(remove.error)}</Alert>}
        {history.length > 0 ? (
          <div className="tablewrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Fecha</th>
                  <th scope="col">Métrica</th>
                  <th scope="col" className="num">
                    Valor
                  </th>
                  <th scope="col">Nota</th>
                  <th scope="col">
                    <span className="visually-hidden">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {history.map((e) => {
                  const def = defs.get(e.metric_key);
                  return (
                    <tr key={e.id}>
                      <td>{formatDate(e.recorded_on)}</td>
                      <td>{def?.label ?? e.metric_key}</td>
                      <td className="num">{formatMetric(e.value, def?.unit ?? 'count')}</td>
                      <td className="muted">{e.note ?? ''}</td>
                      <td className="num">
                        <Button size="sm" variant="ghost" aria-label={`Eliminar registro de ${def?.label ?? e.metric_key} del ${formatDate(e.recorded_on)}`} loading={remove.isPending && remove.variables === e.id} onClick={() => remove.mutate(e.id)}>
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
          <div className="quiet">
            <p>Cuando registres resultados, aparecerán aquí del más reciente al más antiguo.</p>
          </div>
        )}
      </section>

      <AnimatePresence>
        {adding !== null && (
          <Dialog title="Registrar resultado" onClose={() => setAdding(null)}>
            <MetricEntryForm projectId={project.data.id} path={path} initialKey={adding} onDone={() => setAdding(null)} />
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
}
