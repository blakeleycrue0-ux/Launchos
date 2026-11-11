/**
 * Tipos del dominio de LaunchOS.
 *
 * El contenido de cada camino (fases, tareas, instrucciones, métricas) se define
 * en código (src/content/paths) y se referencia desde la base de datos por clave.
 */

export type Experience = 'none' | 'some' | 'experienced';
export type Budget = 'zero' | 'low' | 'medium' | 'high';
export type WeeklyHours = 'h0_5' | 'h5_10' | 'h10_20' | 'h20_plus';
export type Stage = 'idea' | 'started' | 'earning';

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'skipped';
export type ProjectStatus = 'active' | 'paused' | 'archived';

/** Respuestas comunes a todos los caminos. */
export interface ProfileAnswers {
  experience: Experience;
  budget: Budget;
  weeklyHours: WeeklyHours;
  stage: Stage;
}

/** Respuestas a preguntas específicas de un camino. */
export type PathAnswers = Record<string, string>;

export interface RoadmapContext extends ProfileAnswers {
  pathAnswers: PathAnswers;
}

/**
 * Condición declarativa para incluir una tarea en el roadmap.
 * Todas las claves presentes deben cumplirse (AND); dentro de cada clave
 * basta con que el valor esté en la lista (OR).
 */
export interface TaskCondition {
  experience?: Experience[];
  budget?: Budget[];
  weeklyHours?: WeeklyHours[];
  stage?: Stage[];
  answers?: Record<string, string[]>;
}

export interface ExternalTool {
  name: string;
  url: string;
  /** Para qué se usa en esta tarea. */
  purpose: string;
  pricing: 'free' | 'freemium' | 'paid';
}

export interface TaskPrompt {
  title: string;
  /** Texto del prompt. Puede contener {{variables}} que se rellenan con el proyecto. */
  body: string;
}

export interface TaskTemplate {
  /** Clave estable. NUNCA cambiarla una vez publicada: la BD la referencia. */
  key: string;
  title: string;
  summary: string;
  estimatedMinutes: number;
  /** Pasos accionables, en orden. */
  steps: string[];
  /** Cómo saber que la tarea está terminada. */
  doneWhen: string;
  tools?: ExternalTool[];
  prompts?: TaskPrompt[];
  tips?: string[];
  when?: TaskCondition;
  /** Si el usuario ya está en una etapa avanzada, la tarea se marca como hecha al crear el proyecto. */
  autoCompleteWhen?: TaskCondition;
}

export interface Phase {
  key: string;
  title: string;
  description: string;
  tasks: TaskTemplate[];
}

export interface PathQuestionOption {
  value: string;
  label: string;
  description?: string;
}

export interface PathQuestion {
  key: string;
  label: string;
  help?: string;
  options: PathQuestionOption[];
}

export type MetricUnit = 'count' | 'currency' | 'percent';

export interface MetricDefinition {
  key: string;
  label: string;
  unit: MetricUnit;
  help: string;
  /**
   * 'snapshot': el valor es el total en esa fecha (p. ej. suscriptores).
   * 'flow': el valor es lo ocurrido en ese periodo y se suma (p. ej. ventas).
   */
  kind: 'snapshot' | 'flow';
}

interface PathBase {
  id: string;
  name: string;
  tagline: string;
  category: 'content' | 'commerce' | 'services' | 'software';
}

export interface AvailablePath extends PathBase {
  status: 'available';
  description: string;
  /** Incrementar al cambiar el roadmap de forma significativa. */
  contentVersion: number;
  idealFor: string[];
  questions: PathQuestion[];
  phases: Phase[];
  metrics: MetricDefinition[];
}

export interface PlannedPath extends PathBase {
  status: 'planned';
}

export type BusinessPath = AvailablePath | PlannedPath;

export interface GeneratedTask {
  templateKey: string;
  phaseKey: string;
  position: number;
  status: TaskStatus;
}
