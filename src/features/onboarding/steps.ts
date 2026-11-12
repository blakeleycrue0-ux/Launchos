import type { Exposure, Motivation, Strength } from '@/content/guidance';
import type { AvailablePath, Budget, Experience, PathAnswers, Stage, WeeklyHours } from '@/domain/types';

/**
 * Flujo del onboarding: una pregunta por paso.
 * - direct: el usuario elige camino al principio.
 * - guided: responde a la orientación y recibe una recomendación.
 * En ambos casos se recogen las mismas respuestas que necesita el roadmap.
 */
export type Mode = 'direct' | 'guided';

export interface Draft {
  mode: Mode;
  pathId?: string;
  stage?: Stage;
  experience?: Experience;
  budget?: Budget;
  weeklyHours?: WeeklyHours;
  pathAnswers: PathAnswers;
  name: string;
  goal: string;
  guidance: { motivation?: Motivation; strength?: Strength; exposure?: Exposure };
}

export const EMPTY_DRAFT: Draft = { mode: 'direct', pathAnswers: {}, name: '', goal: '', guidance: {} };

export type StepId =
  | 'path'
  | 'g-motivation'
  | 'g-strength'
  | 'g-exposure'
  | 'g-result'
  | 'stage'
  | 'experience'
  | 'budget'
  | 'weeklyHours'
  | `q:${string}`
  | 'name'
  | 'goal'
  | 'review';

export function buildSteps(draft: Draft, path: AvailablePath | undefined): StepId[] {
  // Antes de conocer el camino se reservan dos huecos para sus preguntas.
  const questions: StepId[] = path ? path.questions.map((q) => `q:${q.key}` as const) : ['q:_1', 'q:_2'];
  const tail: StepId[] = [...questions, 'name', 'goal', 'review'];
  if (draft.mode === 'guided') {
    return ['path', 'g-motivation', 'g-strength', 'g-exposure', 'experience', 'budget', 'weeklyHours', 'g-result', 'stage', ...tail];
  }
  return ['path', 'stage', 'experience', 'budget', 'weeklyHours', ...tail];
}

export function isStepComplete(step: StepId, draft: Draft): boolean {
  switch (step) {
    case 'path':
      return draft.mode === 'guided' || Boolean(draft.pathId);
    case 'g-motivation':
      return Boolean(draft.guidance.motivation);
    case 'g-strength':
      return Boolean(draft.guidance.strength);
    case 'g-exposure':
      return Boolean(draft.guidance.exposure);
    case 'g-result':
      return Boolean(draft.pathId);
    case 'stage':
      return Boolean(draft.stage);
    case 'experience':
      return Boolean(draft.experience);
    case 'budget':
      return Boolean(draft.budget);
    case 'weeklyHours':
      return Boolean(draft.weeklyHours);
    case 'name': {
      const n = draft.name.trim();
      return n.length >= 1 && n.length <= 80;
    }
    case 'goal':
      return draft.goal.length <= 500;
    case 'review':
      return true;
    default:
      return Boolean(draft.pathAnswers[step.slice(2)]);
  }
}

/** Primer paso sin completar: evita llegar a la revisión con huecos. */
export function firstIncomplete(steps: StepId[], draft: Draft): StepId | null {
  return steps.find((s) => s !== 'review' && !isStepComplete(s, draft)) ?? null;
}
