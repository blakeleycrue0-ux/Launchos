/** Actividad reciente de un proyecto, derivada de datos que ya existen (sin tabla propia). */
export type ActivityKind = 'project_created' | 'task_started' | 'task_done' | 'metric';

export interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  /** Marca de tiempo ISO. */
  at: string;
  title: string;
  detail?: string;
}

export interface ActivityInput {
  project: { id: string; created_at: string };
  tasks: { id: string; title: string; status: string; started_at: string | null; completed_at: string | null; created_at: string }[];
  metrics: { id: string; label: string; formatted: string; created_at: string; recorded_on: string }[];
}

export function buildActivity({ project, tasks, metrics }: ActivityInput, limit = 8): ActivityEvent[] {
  const events: ActivityEvent[] = [{ id: `p-${project.id}`, kind: 'project_created', at: project.created_at, title: 'Proyecto creado' }];
  for (const t of tasks) {
    // Las tareas marcadas como hechas al crear el proyecto (por la etapa) no son actividad del usuario.
    const auto = t.completed_at !== null && Math.abs(new Date(t.completed_at).getTime() - new Date(t.created_at).getTime()) < 2000;
    if (t.status === 'done' && t.completed_at && !auto) events.push({ id: `d-${t.id}`, kind: 'task_done', at: t.completed_at, title: 'Tarea completada', detail: t.title });
    else if (t.status === 'in_progress' && t.started_at) events.push({ id: `s-${t.id}`, kind: 'task_started', at: t.started_at, title: 'Tarea empezada', detail: t.title });
  }
  for (const m of metrics) events.push({ id: `m-${m.id}`, kind: 'metric', at: m.created_at, title: 'Resultado registrado', detail: `${m.label}: ${m.formatted}` });
  return events.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0)).slice(0, limit);
}
