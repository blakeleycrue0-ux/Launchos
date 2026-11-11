import type {
  AvailablePath,
  GeneratedTask,
  Phase,
  RoadmapContext,
  TaskCondition,
  TaskTemplate,
} from './types';

export function matchesCondition(condition: TaskCondition | undefined, ctx: RoadmapContext): boolean {
  if (!condition) return true;
  if (condition.experience && !condition.experience.includes(ctx.experience)) return false;
  if (condition.budget && !condition.budget.includes(ctx.budget)) return false;
  if (condition.weeklyHours && !condition.weeklyHours.includes(ctx.weeklyHours)) return false;
  if (condition.stage && !condition.stage.includes(ctx.stage)) return false;
  if (condition.answers) {
    for (const [key, allowed] of Object.entries(condition.answers)) {
      const answer = ctx.pathAnswers[key];
      if (answer === undefined || !allowed.includes(answer)) return false;
    }
  }
  return true;
}

/**
 * Genera la lista de tareas de un proyecto a partir del camino y las respuestas.
 * Es una función pura: misma entrada, misma salida. Se ejecuta en el cliente y
 * el resultado se guarda en la BD de forma atómica (RPC create_project_with_tasks).
 */
export function generateRoadmap(path: AvailablePath, ctx: RoadmapContext): GeneratedTask[] {
  const tasks: GeneratedTask[] = [];
  let position = 0;
  for (const phase of path.phases) {
    for (const template of phase.tasks) {
      if (!matchesCondition(template.when, ctx)) continue;
      const autoDone = template.autoCompleteWhen !== undefined && matchesCondition(template.autoCompleteWhen, ctx);
      tasks.push({
        templateKey: template.key,
        phaseKey: phase.key,
        position: position++,
        status: autoDone ? 'done' : 'todo',
      });
    }
  }
  return tasks;
}

export interface TemplateLookup {
  phase: Phase;
  template: TaskTemplate;
}

export function indexTemplates(path: AvailablePath): Map<string, TemplateLookup> {
  const map = new Map<string, TemplateLookup>();
  for (const phase of path.phases) {
    for (const template of phase.tasks) map.set(template.key, { phase, template });
  }
  return map;
}

/**
 * Sustituye {{variables}} en un prompt. Si la variable está vacía se usa el
 * valor de respaldo; si tampoco existe, se deja visible para que el usuario la edite.
 */
export function fillPrompt(
  body: string,
  vars: Record<string, string | null | undefined>,
  fallbacks: Record<string, string> = {},
): string {
  return body.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    const value = vars[key];
    if (value && value.trim()) return value.trim();
    return fallbacks[key] ?? match;
  });
}
