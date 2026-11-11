import { useMemo } from 'react';
import { getAvailablePath } from '@/content/paths';
import { indexTemplates } from '@/domain/roadmap';
import { nextAction, summarize, summarizeByPhase } from '@/domain/progress';
import { useProject, useProjectTasks } from './api';

/**
 * Combina proyecto, tareas y contenido del camino en una única vista de datos
 * para las pantallas del proyecto.
 */
export function useProjectWorkspace(projectId: string | undefined) {
  const project = useProject(projectId);
  const tasks = useProjectTasks(projectId);

  const path = project.data ? getAvailablePath(project.data.path_id) : undefined;

  const derived = useMemo(() => {
    if (!path || !tasks.data) return null;
    const index = indexTemplates(path);
    const items = tasks.data
      .map((row) => {
        const lookup = index.get(row.template_key);
        return lookup ? { row, template: lookup.template, phase: lookup.phase } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
    const progressInput = items.map((i) => ({ id: i.row.id, phaseKey: i.row.phase_key, position: i.row.position, status: i.row.status }));
    const next = nextAction(progressInput);
    const remainingMinutes = items
      .filter((i) => i.row.status === 'todo' || i.row.status === 'in_progress')
      .reduce((acc, i) => acc + i.template.estimatedMinutes, 0);
    return {
      items,
      summary: summarize(progressInput),
      byPhase: summarizeByPhase(progressInput),
      next: next ? items.find((i) => i.row.id === next.id) ?? null : null,
      remainingMinutes,
      /** Tareas guardadas cuya plantilla ya no existe en el contenido actual. */
      orphanCount: tasks.data.length - items.length,
    };
  }, [path, tasks.data]);

  return {
    project,
    tasks,
    path,
    data: derived,
    isPending: project.isPending || (Boolean(project.data) && tasks.isPending),
    error: project.error ?? tasks.error,
    refetch: () => {
      void project.refetch();
      void tasks.refetch();
    },
  };
}

export type WorkspaceItem = NonNullable<ReturnType<typeof useProjectWorkspace>['data']>['items'][number];
