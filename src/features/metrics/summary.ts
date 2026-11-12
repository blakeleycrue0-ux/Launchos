import type { MetricDefinition } from '@/domain/types';

export interface MetricPoint {
  metricKey: string;
  value: number;
  recordedOn: string; // YYYY-MM-DD
}

export interface MetricSummary {
  definition: MetricDefinition;
  /** Snapshot: último valor. Flow: suma total. null si no hay registros. */
  value: number | null;
  /** Flow: suma de los últimos 30 días. Snapshot: variación frente al registro anterior. */
  secondary: number | null;
  lastRecordedOn: string | null;
  entries: number;
}

function daysAgoIso(days: number, today: Date): string {
  const d = new Date(today);
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export function summarizeMetric(def: MetricDefinition, points: readonly MetricPoint[], today = new Date()): MetricSummary {
  const own = points
    .filter((p) => p.metricKey === def.key)
    .sort((a, b) => (a.recordedOn < b.recordedOn ? 1 : a.recordedOn > b.recordedOn ? -1 : 0));
  if (own.length === 0) {
    return { definition: def, value: null, secondary: null, lastRecordedOn: null, entries: 0 };
  }
  const last = own[0]!;
  if (def.kind === 'snapshot') {
    const prev = own[1];
    return {
      definition: def,
      value: last.value,
      secondary: prev ? last.value - prev.value : null,
      lastRecordedOn: last.recordedOn,
      entries: own.length,
    };
  }
  const since = daysAgoIso(30, today);
  const total = own.reduce((acc, p) => acc + p.value, 0);
  const recent = own.filter((p) => p.recordedOn >= since).reduce((acc, p) => acc + p.value, 0);
  return { definition: def, value: total, secondary: recent, lastRecordedOn: last.recordedOn, entries: own.length };
}

export interface SeriesPoint {
  date: string;
  value: number;
}

/**
 * Serie temporal para la gráfica, en orden cronológico y con un punto por día.
 * - snapshot: el último valor registrado cada día.
 * - flow: el acumulado hasta ese día.
 */
export function buildSeries(def: MetricDefinition, points: readonly MetricPoint[]): SeriesPoint[] {
  const own = points.filter((p) => p.metricKey === def.key);
  const byDay = new Map<string, number>();
  if (def.kind === 'snapshot') {
    // points llega del más reciente al más antiguo: el primero de cada día es el último registrado.
    for (const p of own) if (!byDay.has(p.recordedOn)) byDay.set(p.recordedOn, p.value);
    return [...byDay].map(([date, value]) => ({ date, value })).sort((a, b) => (a.date < b.date ? -1 : 1));
  }
  for (const p of own) byDay.set(p.recordedOn, (byDay.get(p.recordedOn) ?? 0) + p.value);
  let total = 0;
  return [...byDay]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([date, value]) => ({ date, value: (total += value) }));
}
