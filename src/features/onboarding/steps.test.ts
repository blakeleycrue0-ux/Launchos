import { describe, expect, it } from 'vitest';
import { getAvailablePath } from '@/content/paths';
import { buildSteps, EMPTY_DRAFT, firstIncomplete, isStepComplete, type Draft } from './steps';

const faceless = getAvailablePath('faceless')!;

describe('buildSteps', () => {
  it('flujo directo: una pregunta por paso con las preguntas del camino', () => {
    const steps = buildSteps({ ...EMPTY_DRAFT, pathId: 'faceless' }, faceless);
    expect(steps).toEqual(['path', 'stage', 'experience', 'budget', 'weeklyHours', 'q:format', 'q:voice', 'name', 'goal', 'review']);
  });
  it('flujo guiado: no repite experiencia, presupuesto ni horas', () => {
    const steps = buildSteps({ ...EMPTY_DRAFT, mode: 'guided' }, undefined);
    for (const id of ['experience', 'budget', 'weeklyHours']) expect(steps.filter((s) => s === id)).toHaveLength(1);
    expect(steps.indexOf('g-result')).toBeGreaterThan(steps.indexOf('weeklyHours'));
    expect(steps.indexOf('stage')).toBeGreaterThan(steps.indexOf('g-result'));
  });
});

describe('isStepComplete / firstIncomplete', () => {
  const full: Draft = {
    mode: 'direct', pathId: 'faceless', stage: 'idea', experience: 'none', budget: 'zero', weeklyHours: 'h5_10',
    pathAnswers: { format: 'both', voice: 'own' }, name: 'Canal', goal: '', guidance: {},
  };
  it('el objetivo es opcional y el nombre obligatorio', () => {
    expect(isStepComplete('goal', full)).toBe(true);
    expect(isStepComplete('name', { ...full, name: '  ' })).toBe(false);
  });
  it('detecta el primer hueco', () => {
    const steps = buildSteps(full, faceless);
    expect(firstIncomplete(steps, full)).toBeNull();
    expect(firstIncomplete(steps, { ...full, pathAnswers: { format: 'both' } })).toBe('q:voice');
  });
});
