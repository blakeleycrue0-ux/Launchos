import { describe, expect, it } from 'vitest';
import { buildActivity } from './activity';

const project = { id: 'p', created_at: '2026-11-01T10:00:00Z' };
const task = (id: string, status: string, started: string | null, completed: string | null, created = '2026-11-01T10:00:00Z') => ({ id, title: `Tarea ${id}`, status, started_at: started, completed_at: completed, created_at: created });

describe('buildActivity', () => {
  it('ordena de más reciente a más antiguo e incluye la creación', () => {
    const events = buildActivity({
      project,
      tasks: [task('a', 'done', '2026-11-02T09:00:00Z', '2026-11-03T09:00:00Z'), task('b', 'in_progress', '2026-11-04T09:00:00Z', null)],
      metrics: [{ id: 'm', label: 'Seguidores', formatted: '120', created_at: '2026-11-05T09:00:00Z', recorded_on: '2026-11-05' }],
    });
    expect(events.map((e) => e.kind)).toEqual(['metric', 'task_started', 'task_done', 'project_created']);
  });
  it('ignora las tareas marcadas como hechas automáticamente al crear el proyecto', () => {
    const events = buildActivity({ project, tasks: [task('a', 'done', '2026-11-01T10:00:00Z', '2026-11-01T10:00:00Z')], metrics: [] });
    expect(events.map((e) => e.kind)).toEqual(['project_created']);
  });
  it('respeta el límite', () => {
    const tasks = Array.from({ length: 20 }, (_, i) => task(String(i), 'done', null, `2026-11-${String(i + 2).padStart(2, '0')}T09:00:00Z`));
    expect(buildActivity({ project, tasks, metrics: [] }, 5)).toHaveLength(5);
  });
});
