import { describe, expect, it } from 'vitest';
import { summarizeMetric } from './summary';
import type { MetricDefinition } from '@/domain/types';

const snapshot: MetricDefinition = { key: 'followers', label: 'Seguidores', unit: 'count', kind: 'snapshot', help: '' };
const flow: MetricDefinition = { key: 'revenue', label: 'Ingresos', unit: 'currency', kind: 'flow', help: '' };
const today = new Date('2026-11-11T12:00:00Z');

describe('summarizeMetric', () => {
  it('devuelve null sin registros', () => {
    expect(summarizeMetric(snapshot, [], today).value).toBeNull();
  });
  it('snapshot: último valor y variación', () => {
    const s = summarizeMetric(snapshot, [
      { metricKey: 'followers', value: 120, recordedOn: '2026-11-01' },
      { metricKey: 'followers', value: 200, recordedOn: '2026-11-10' },
    ], today);
    expect(s.value).toBe(200);
    expect(s.secondary).toBe(80);
  });
  it('flow: total y últimos 30 días', () => {
    const s = summarizeMetric(flow, [
      { metricKey: 'revenue', value: 50, recordedOn: '2026-08-01' },
      { metricKey: 'revenue', value: 30, recordedOn: '2026-11-05' },
      { metricKey: 'other', value: 999, recordedOn: '2026-11-05' },
    ], today);
    expect(s.value).toBe(80);
    expect(s.secondary).toBe(30);
  });
});
