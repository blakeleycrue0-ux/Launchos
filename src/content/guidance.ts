import type { Budget, Experience, WeeklyHours } from '@/domain/types';

/**
 * Orientación determinista: recomienda un camino disponible según las
 * respuestas del usuario. No usa IA; las reglas son explícitas y testeables.
 */

export type Motivation = 'fast_income' | 'long_term_asset' | 'scalable_business';
export type Strength = 'creative' | 'commercial' | 'technical';
export type Exposure = 'private' | 'ok_selling';

export interface GuidanceAnswers {
  motivation: Motivation;
  strength: Strength;
  exposure: Exposure;
  experience: Experience;
  budget: Budget;
  weeklyHours: WeeklyHours;
}

export interface GuidanceQuestion<K extends keyof GuidanceAnswers = keyof GuidanceAnswers> {
  key: K;
  label: string;
  options: { value: GuidanceAnswers[K]; label: string; description: string }[];
}

export const GUIDANCE_QUESTIONS: GuidanceQuestion[] = [
  {
    key: 'motivation',
    label: '¿Qué buscas ahora mismo?',
    options: [
      { value: 'fast_income', label: 'Ingresos pronto', description: 'Quiero ver dinero en semanas, aunque escale menos.' },
      { value: 'long_term_asset', label: 'Construir un activo', description: 'Algo que crezca con el tiempo, aunque tarde.' },
      { value: 'scalable_business', label: 'Un negocio escalable', description: 'Algo que pueda crecer sin depender de mis horas.' },
    ],
  },
  {
    key: 'strength',
    label: '¿Qué se te da mejor?',
    options: [
      { value: 'creative', label: 'Crear y comunicar', description: 'Escribir, editar, contar historias.' },
      { value: 'commercial', label: 'Comprar, vender y negociar', description: 'Detectar oportunidades y cerrar tratos.' },
      { value: 'technical', label: 'Resolver problemas técnicos', description: 'Herramientas, lógica, sistemas.' },
    ],
  },
  {
    key: 'exposure',
    label: '¿Cómo te sientes tratando con clientes?',
    options: [
      { value: 'private', label: 'Prefiero trabajar en segundo plano', description: 'Poco trato directo.' },
      { value: 'ok_selling', label: 'No me importa hablar con clientes', description: 'Puedo atender y vender.' },
    ],
  },
];

export interface PathScore {
  pathId: string;
  score: number;
  reasons: string[];
}

/** Acepta respuestas parciales: las preguntas sin responder no puntúan. */
export function scorePaths(a: Partial<GuidanceAnswers>): PathScore[] {
  const faceless: PathScore = { pathId: 'faceless', score: 0, reasons: [] };
  const vinted: PathScore = { pathId: 'vinted-reselling', score: 0, reasons: [] };
  const saas: PathScore = { pathId: 'apps-saas', score: 0, reasons: [] };

  const add = (s: PathScore, points: number, reason?: string) => {
    s.score += points;
    if (reason) s.reasons.push(reason);
  };

  switch (a.motivation) {
    case 'fast_income':
      add(vinted, 3, 'Es el camino más rápido para generar las primeras ventas.');
      break;
    case 'long_term_asset':
      add(faceless, 3, 'Un canal de contenido es un activo que acumula valor con cada vídeo.');
      add(saas, 1);
      break;
    case 'scalable_business':
      add(saas, 3, 'Un producto de software escala sin depender de tus horas.');
      add(faceless, 1);
      break;
  }

  switch (a.strength) {
    case 'creative':
      add(faceless, 3, 'Encaja con tu perfil creativo.');
      break;
    case 'commercial':
      add(vinted, 3, 'Encaja con tu perfil comercial.');
      add(saas, 1);
      break;
    case 'technical':
      add(saas, 3, 'Encaja con tu perfil técnico.');
      break;
  }

  if (a.exposure === 'private') {
    add(faceless, 2, 'No necesitas mostrarte ni tratar con clientes.');
  } else if (a.exposure === 'ok_selling') {
    add(vinted, 1);
    add(saas, 1);
  }

  if (a.budget === 'zero') {
    add(vinted, 1, 'Puedes empezar sin dinero vendiendo lo que ya tienes.');
    add(faceless, 1);
  }

  if (a.weeklyHours === 'h0_5') {
    add(vinted, 1, 'Se adapta bien a poco tiempo semanal.');
    add(saas, -1);
  }

  if (a.experience === 'none') {
    add(vinted, 1);
    add(saas, -1);
  } else if (a.experience === 'experienced') {
    add(saas, 1);
  }

  return [faceless, vinted, saas].sort((x, y) => y.score - x.score);
}
