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
