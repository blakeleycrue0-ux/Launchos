import type { TaskStatus, WeeklyHours } from './types';

export interface ProgressTask {
  id: string;
  phaseKey: string;
  position: number;
  status: TaskStatus;
}

export interface ProgressSummary {
  total: number;
  done: number;
  skipped: number;
  inProgress: number;
  /** 0–100, calculado sobre las tareas no omitidas. */
  percent: number;
}

export function summarize(tasks: readonly ProgressTask[]): ProgressSummary {
  let done = 0;
  let skipped = 0;
  let inProgress = 0;
  for (const t of tasks) {
    if (t.status === 'done') done++;
    else if (t.status === 'skipped') skipped++;
    else if (t.status === 'in_progress') inProgress++;
  }
  const relevant = tasks.length - skipped;
  const percent = relevant === 0 ? (tasks.length > 0 ? 100 : 0) : Math.round((done / relevant) * 100);
  return { total: tasks.length, done, skipped, inProgress, percent };
}

/**
 * Próxima acción recomendada: primero lo que ya está en curso, después la
 * primera tarea pendiente en el orden del roadmap.
 */
export function nextAction<T extends ProgressTask>(tasks: readonly T[]): T | null {
  const sorted = [...tasks].sort((a, b) => a.position - b.position);
  return (
    sorted.find((t) => t.status === 'in_progress') ??
    sorted.find((t) => t.status === 'todo') ??
    null
  );
}

export function summarizeByPhase<T extends ProgressTask>(
  tasks: readonly T[],
): Map<string, ProgressSummary> {
  const groups = new Map<string, T[]>();
  for (const t of tasks) {
    const list = groups.get(t.phaseKey) ?? [];
    list.push(t);
    groups.set(t.phaseKey, list);
  }
  const result = new Map<string, ProgressSummary>();
  for (const [key, list] of groups) result.set(key, summarize(list));
  return result;
}

const HOURS_PER_WEEK: Record<WeeklyHours, number> = {
  h0_5: 3,
  h5_10: 7.5,
  h10_20: 15,
  h20_plus: 25,
};

/** Estimación orientativa de semanas para completar los minutos pendientes. */
export function estimateWeeks(remainingMinutes: number, weeklyHours: WeeklyHours): number {
  if (remainingMinutes <= 0) return 0;
  return Math.max(1, Math.ceil(remainingMinutes / 60 / HOURS_PER_WEEK[weeklyHours]));
}
