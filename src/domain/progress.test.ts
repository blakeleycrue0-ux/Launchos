import { describe, expect, it } from 'vitest';
import { estimateWeeks, nextAction, summarize } from './progress';
import type { ProgressTask } from './progress';

const t = (id: string, position: number, status: ProgressTask['status']): ProgressTask => ({
  id,
  phaseKey: 'p',
  position,
  status,
});

describe('summarize', () => {
  it('calcula el porcentaje excluyendo las tareas omitidas', () => {
    const s = summarize([t('a', 0, 'done'), t('b', 1, 'skipped'), t('c', 2, 'todo')]);
    expect(s).toMatchObject({ total: 3, done: 1, skipped: 1, percent: 50 });
  });
  it('devuelve 0 sin tareas', () => {
    expect(summarize([]).percent).toBe(0);
  });
});

describe('nextAction', () => {
  it('prioriza la tarea en curso', () => {
    expect(nextAction([t('a', 0, 'todo'), t('b', 1, 'in_progress')])?.id).toBe('b');
  });
  it('si no hay ninguna en curso, devuelve la primera pendiente', () => {
    expect(nextAction([t('b', 1, 'todo'), t('a', 0, 'done'), t('c', 2, 'todo')])?.id).toBe('b');
  });
  it('devuelve null cuando todo está hecho', () => {
    expect(nextAction([t('a', 0, 'done')])).toBeNull();
  });
});

describe('estimateWeeks', () => {
  it('redondea hacia arriba y como mínimo 1 semana', () => {
    expect(estimateWeeks(30, 'h20_plus')).toBe(1);
    expect(estimateWeeks(60 * 30, 'h10_20')).toBe(2);
    expect(estimateWeeks(0, 'h0_5')).toBe(0);
  });
});
