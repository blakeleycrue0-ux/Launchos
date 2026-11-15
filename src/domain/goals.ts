import { fromISODate } from './dates';
import type { Goal, ISODate, Minor } from './types';

export const goalSaved = (g: Goal): Minor => g.contributions.reduce((s, c) => s + c.amountMinor, 0);

export interface GoalProgress {
  saved: Minor;
  remaining: Minor;
  /** 0–100, entero. */
  pct: number;
  done: boolean;
  /** Meses que quedan hasta la fecha (mínimo 1) o null si no hay fecha o ya pasó. */
  monthsLeft: number | null;
  /** Ahorro mensual necesario para llegar a tiempo (redondeado hacia arriba) o null. */
  perMonth: Minor | null;
}

export function goalProgress(g: Goal, today: ISODate): GoalProgress {
  const saved = goalSaved(g);
  const remaining = Math.max(0, g.targetMinor - saved);
  const pct = g.targetMinor > 0 ? Math.min(100, Math.max(0, Math.floor((saved * 100) / g.targetMinor))) : 0;
  let monthsLeft: number | null = null;
  if (g.dueDate && g.dueDate > today) {
    const a = fromISODate(today), b = fromISODate(g.dueDate);
    monthsLeft = Math.max(1, (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) + (b.getDate() >= a.getDate() ? 0 : -1) + 0);
    if (monthsLeft < 1) monthsLeft = 1;
  }
  return { saved, remaining, pct, done: remaining === 0 && g.targetMinor > 0, monthsLeft, perMonth: monthsLeft && remaining > 0 ? Math.ceil(remaining / monthsLeft) : null };
}

/** Ahorro protegido: lo reservado en objetivos (nunca negativo). Es una reserva contable, no un gasto. */
export const protectedSavings = (goals: Goal[]): Minor => goals.reduce((s, g) => s + Math.max(0, goalSaved(g)), 0);

/** Una retirada no puede dejar el objetivo en negativo. */
export const canWithdraw = (g: Goal, amount: Minor) => amount > 0 && amount <= goalSaved(g);
