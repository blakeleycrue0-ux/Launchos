import type { Budget, Experience, Stage, WeeklyHours } from '@/domain/types';

interface Option<T extends string> {
  value: T;
  label: string;
  description: string;
}

export const EXPERIENCE_OPTIONS: Option<Experience>[] = [
  { value: 'none', label: 'Empiezo de cero', description: 'Nunca he creado un proyecto o negocio digital.' },
  { value: 'some', label: 'Algo de experiencia', description: 'He probado cosas, pero sin un sistema claro.' },
  { value: 'experienced', label: 'Con experiencia', description: 'Ya he lanzado proyectos y conozco las herramientas.' },
];

export const BUDGET_OPTIONS: Option<Budget>[] = [
  { value: 'zero', label: 'Sin presupuesto', description: 'Solo herramientas gratuitas.' },
  { value: 'low', label: 'Hasta 100 €', description: 'Puedo pagar alguna herramienta puntual.' },
  { value: 'medium', label: '100 € – 500 €', description: 'Puedo invertir en herramientas y stock inicial.' },
  { value: 'high', label: 'Más de 500 €', description: 'Puedo invertir para acelerar.' },
];

export const WEEKLY_HOURS_OPTIONS: Option<WeeklyHours>[] = [
  { value: 'h0_5', label: 'Menos de 5 h', description: 'Algún rato suelto a la semana.' },
  { value: 'h5_10', label: '5 – 10 h', description: 'Tardes o fines de semana.' },
  { value: 'h10_20', label: '10 – 20 h', description: 'Dedicación seria a tiempo parcial.' },
  { value: 'h20_plus', label: 'Más de 20 h', description: 'Casi a tiempo completo.' },
];

export const STAGE_OPTIONS: Option<Stage>[] = [
  { value: 'idea', label: 'Todavía no he empezado', description: 'Tengo interés o una idea, pero nada en marcha.' },
  { value: 'started', label: 'Ya he empezado', description: 'Tengo algo en marcha, pero sin ingresos.' },
  { value: 'earning', label: 'Ya genera ingresos', description: 'Quiero ordenarlo y hacerlo crecer.' },
];

function labelFrom<T extends string>(options: Option<T>[], value: T): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

export const labels = {
  experience: (v: Experience) => labelFrom(EXPERIENCE_OPTIONS, v),
  budget: (v: Budget) => labelFrom(BUDGET_OPTIONS, v),
  weeklyHours: (v: WeeklyHours) => labelFrom(WEEKLY_HOURS_OPTIONS, v),
  stage: (v: Stage) => labelFrom(STAGE_OPTIONS, v),
};
