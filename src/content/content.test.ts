import { describe, expect, it } from 'vitest';
import { ALL_PATHS, AVAILABLE_PATHS } from './paths';
import { scorePaths } from './guidance';

describe('contenido de los caminos', () => {
  it('los ids de camino son únicos y válidos para la BD', () => {
    const ids = ALL_PATHS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]{2,40}$/);
  });

  for (const path of AVAILABLE_PATHS) {
    describe(path.name, () => {
      it('las claves de tarea son únicas globalmente dentro del camino', () => {
        const keys = path.phases.flatMap((ph) => ph.tasks.map((t) => t.key));
        expect(new Set(keys).size).toBe(keys.length);
      });
      it('las métricas tienen claves válidas y únicas', () => {
        const keys = path.metrics.map((m) => m.key);
        expect(new Set(keys).size).toBe(keys.length);
        for (const k of keys) expect(k).toMatch(/^[a-z0-9_]{2,40}$/);
      });
      it('las condiciones solo usan preguntas y opciones existentes', () => {
        const questions = new Map(path.questions.map((q) => [q.key, new Set(q.options.map((o) => o.value))]));
        for (const phase of path.phases) {
          for (const task of phase.tasks) {
            for (const cond of [task.when, task.autoCompleteWhen]) {
              for (const [key, values] of Object.entries(cond?.answers ?? {})) {
                const allowed = questions.get(key);
                expect(allowed, `${task.key}: pregunta ${key}`).toBeDefined();
                for (const v of values) expect(allowed!.has(v), `${task.key}: ${key}=${v}`).toBe(true);
              }
            }
          }
        }
      });
      it('cada tarea tiene pasos y criterio de finalización', () => {
        for (const phase of path.phases) {
          for (const task of phase.tasks) {
            expect(task.steps.length).toBeGreaterThan(0);
            expect(task.doneWhen.length).toBeGreaterThan(0);
            for (const tool of task.tools ?? []) expect(tool.url).toMatch(/^https:\/\//);
          }
        }
      });
    });
  }
});

describe('orientación', () => {
  it('recomienda Vinted para ingresos rápidos con perfil comercial', () => {
    const [top] = scorePaths({ motivation: 'fast_income', strength: 'commercial', exposure: 'ok_selling', experience: 'none', budget: 'zero', weeklyHours: 'h5_10' });
    expect(top?.pathId).toBe('vinted-reselling');
  });
  it('recomienda Faceless para perfil creativo que no quiere exponerse', () => {
    const [top] = scorePaths({ motivation: 'long_term_asset', strength: 'creative', exposure: 'private', experience: 'some', budget: 'low', weeklyHours: 'h5_10' });
    expect(top?.pathId).toBe('faceless');
  });
  it('recomienda SaaS para perfil técnico que busca escalar', () => {
    const [top] = scorePaths({ motivation: 'scalable_business', strength: 'technical', exposure: 'ok_selling', experience: 'experienced', budget: 'medium', weeklyHours: 'h10_20' });
    expect(top?.pathId).toBe('apps-saas');
  });
  it('solo recomienda caminos disponibles', () => {
    const available = new Set(AVAILABLE_PATHS.map((p) => p.id));
    const scores = scorePaths({ motivation: 'fast_income', strength: 'technical', exposure: 'private', experience: 'none', budget: 'zero', weeklyHours: 'h0_5' });
    for (const s of scores) expect(available.has(s.pathId)).toBe(true);
  });
});
