import { describe, expect, it } from 'vitest';
import { AVAILABLE_PATHS, getAvailablePath } from '@/content/paths';
import { fillPrompt, generateRoadmap, matchesCondition } from './roadmap';
import type { RoadmapContext } from './types';

const base: RoadmapContext = {
  experience: 'none',
  budget: 'zero',
  weeklyHours: 'h5_10',
  stage: 'idea',
  pathAnswers: {},
};

describe('matchesCondition', () => {
  it('acepta cuando no hay condición', () => {
    expect(matchesCondition(undefined, base)).toBe(true);
  });
  it('aplica AND entre claves y OR dentro de cada clave', () => {
    expect(matchesCondition({ experience: ['none', 'some'], budget: ['zero'] }, base)).toBe(true);
    expect(matchesCondition({ experience: ['none'], budget: ['high'] }, base)).toBe(false);
  });
  it('requiere la respuesta específica del camino', () => {
    expect(matchesCondition({ answers: { format: ['both'] } }, base)).toBe(false);
    expect(matchesCondition({ answers: { format: ['both'] } }, { ...base, pathAnswers: { format: 'both' } })).toBe(true);
  });
});

describe('generateRoadmap', () => {
  const faceless = getAvailablePath('faceless')!;

  it('genera posiciones consecutivas empezando en 0', () => {
    const tasks = generateRoadmap(faceless, { ...base, pathAnswers: { format: 'long', voice: 'own' } });
    expect(tasks.map((t) => t.position)).toEqual(tasks.map((_, i) => i));
  });

  it('incluye o excluye tareas condicionales', () => {
    const longOnly = generateRoadmap(faceless, { ...base, pathAnswers: { format: 'long', voice: 'own' } });
    const both = generateRoadmap(faceless, { ...base, pathAnswers: { format: 'both', voice: 'own' } });
    expect(longOnly.some((t) => t.templateKey === 'faceless-shorts-repurpose')).toBe(false);
    expect(both.some((t) => t.templateKey === 'faceless-shorts-repurpose')).toBe(true);
  });

  it('marca como hechas las tareas de etapas ya superadas', () => {
    const tasks = generateRoadmap(faceless, { ...base, stage: 'started', pathAnswers: { format: 'long', voice: 'own' } });
    expect(tasks.find((t) => t.templateKey === 'faceless-accounts')?.status).toBe('done');
    expect(tasks.find((t) => t.templateKey === 'faceless-analytics-review')?.status).toBe('todo');
  });

  it('nunca genera un roadmap vacío para ninguna combinación de respuestas', () => {
    for (const path of AVAILABLE_PATHS) {
      const combos = path.questions.reduce<Record<string, string>[]>(
        (acc, q) => acc.flatMap((c) => q.options.map((o) => ({ ...c, [q.key]: o.value }))),
        [{}],
      );
      for (const pathAnswers of combos) {
        for (const stage of ['idea', 'started', 'earning'] as const) {
          const tasks = generateRoadmap(path, { ...base, stage, pathAnswers });
          expect(tasks.length).toBeGreaterThan(0);
          expect(tasks.some((t) => t.status === 'todo')).toBe(true);
        }
      }
    }
  });
});

describe('fillPrompt', () => {
  it('sustituye variables conocidas y deja visibles las desconocidas', () => {
    expect(fillPrompt('Hola {{name}}, {{missing}}', { name: 'Ana' })).toBe('Hola Ana, {{missing}}');
  });
  it('usa el valor de respaldo si la variable está vacía', () => {
    expect(fillPrompt('Objetivo: {{goal}}', { goal: '' }, { goal: '[tu objetivo]' })).toBe('Objetivo: [tu objetivo]');
  });
});
