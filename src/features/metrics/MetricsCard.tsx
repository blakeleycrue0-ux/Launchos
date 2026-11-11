import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { ErrorState, Skeleton } from '@/components/ui/States';
import type { AvailablePath } from '@/domain/types';
import { formatDate, formatMetric } from '@/lib/format';
import { useMetricEntries } from './api';
import { MetricEntryForm } from './MetricEntryForm';
import { summarizeMetric } from './summary';

export function MetricsCard({ projectId, path }: { projectId: string; path: AvailablePath }) {
  const entries = useMetricEntries(projectId);
  const [adding, setAdding] = useState(false);

  const summaries = useMemo(() => {
    const points = (entries.data ?? []).map((e) => ({ metricKey: e.metric_key, value: e.value, recordedOn: e.recorded_on }));
    return path.metrics.map((m) => summarizeMetric(m, points));
  }, [entries.data, path.metrics]);

  const hasData = (entries.data?.length ?? 0) > 0;

  return (
    <section className="card" aria-labelledby="metrics-title">
      <div className="card__header">
        <h2 id="metrics-title" className="card__title">
          Resultados
        </h2>
        {hasData && (
          <Link to={`/app/projects/${projectId}/metrics`} className="link" style={{ fontSize: 'var(--text-sm)' }}>
            Historial
          </Link>
        )}
      </div>
      <div className="card__body stack-md">
        {entries.isPending ? (
          <>
            <Skeleton height={40} />
            <Skeleton height={40} />
          </>
        ) : entries.error ? (
          <ErrorState error={entries.error} onRetry={() => entries.refetch()} />
        ) : adding ? (
          <MetricEntryForm projectId={projectId} path={path} onDone={() => setAdding(false)} />
        ) : (
          <>
            {hasData ? (
              <dl className="metric-list">
                {summaries.map((s) => (
                  <div key={s.definition.key}>
                    <dt>{s.definition.label}</dt>
                    <dd>
                      <span className="metric-list__value">{s.value === null ? '—' : formatMetric(s.value, s.definition.unit)}</span>
                      {s.value !== null && s.secondary !== null && (
                        <span className="metric-list__secondary">
                          {s.definition.kind === 'flow'
                            ? `${formatMetric(s.secondary, s.definition.unit)} últimos 30 días`
                            : `${s.secondary >= 0 ? '+' : '−'}${formatMetric(Math.abs(s.secondary), s.definition.unit)} vs. anterior`}
                        </span>
                      )}
                      {s.value !== null && s.secondary === null && s.lastRecordedOn && (
                        <span className="metric-list__secondary">{formatDate(s.lastRecordedOn, true)}</span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="field__hint">
                Todavía no has registrado resultados. Anota tus cifras reales para ver tu evolución: {path.metrics.map((m) => m.label).join(', ')}.
              </p>
            )}
            <Button size="sm" onClick={() => setAdding(true)}>
              Registrar resultado
            </Button>
          </>
        )}
      </div>
    </section>
  );
}
