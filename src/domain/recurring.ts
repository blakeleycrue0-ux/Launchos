import { addDays, fromISODate, toISODate } from './dates';
import type { Frequency, ISODate, Minor, RecurringPayment, Transaction } from './types';

/** Ventana de reserva: los pagos que vencen en los próximos 30 días se descuentan del disponible. */
export const RESERVE_WINDOW_DAYS = 30;

const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();

/** Siguiente vencimiento. En mensual/anual respeta el día original (31 → 28/29 → 31). */
export function nextOccurrence(date: ISODate, frequency: Frequency, anchorDay: number): ISODate {
  if (frequency === 'weekly') return addDays(date, 7);
  const d = fromISODate(date);
  const months = frequency === 'monthly' ? 1 : 12;
  const y = d.getFullYear() + Math.floor((d.getMonth() + months) / 12);
  const m = (d.getMonth() + months) % 12;
  return toISODate(new Date(y, m, Math.min(anchorDay, daysInMonth(y, m))));
}

export interface Occurrence { paymentId: string; name: string; amountMinor: Minor; due: ISODate; overdue: boolean }

/** Vencimientos de los pagos activos hasta `until` (incluido). Los atrasados cuentan una vez. */
export function occurrencesUntil(payments: RecurringPayment[], today: ISODate, until: ISODate): Occurrence[] {
  const out: Occurrence[] = [];
  for (const p of payments) {
    if (!p.active) continue;
    let due = p.nextDue;
    for (let guard = 0; due <= until && guard < 400; guard++) {
      out.push({ paymentId: p.id, name: p.name, amountMinor: p.amountMinor, due, overdue: due < today });
      due = nextOccurrence(due, p.frequency, p.anchorDay);
    }
  }
  return out.sort((a, b) => a.due.localeCompare(b.due) || a.name.localeCompare(b.name));
}

export const upcoming = (payments: RecurringPayment[], today: ISODate, days = RESERVE_WINDOW_DAYS) =>
  occurrencesUntil(payments, today, addDays(today, days));

/** Importe a reservar: todo lo que vence (o está atrasado) dentro de la ventana. */
export const reservedForPayments = (payments: RecurringPayment[], today: ISODate): Minor =>
  upcoming(payments, today).reduce((s, o) => s + o.amountMinor, 0);

/** Equivalente mensual redondeado al céntimo (semanal ×52/12, anual /12). */
export function monthlyEquivalent(p: Pick<RecurringPayment, 'amountMinor' | 'frequency'>): Minor {
  if (p.frequency === 'monthly') return p.amountMinor;
  return Math.round(p.frequency === 'weekly' ? (p.amountMinor * 52) / 12 : p.amountMinor / 12);
}
export function yearlyCost(p: Pick<RecurringPayment, 'amountMinor' | 'frequency'>): Minor {
  return p.amountMinor * (p.frequency === 'weekly' ? 52 : p.frequency === 'monthly' ? 12 : 1);
}

export const isAlreadyPaid = (txs: Transaction[], paymentId: string, due: ISODate) =>
  txs.some((t) => t.recurringPaymentId === paymentId && t.occurredOn === due);

/**
 * Confirma el vencimiento pendiente de un pago: devuelve el gasto real y el pago avanzado al siguiente vencimiento.
 * Si ese vencimiento ya tiene movimiento (doble pulsación, reintento) no crea otro: tx = null.
 */
export function confirmPayment(p: RecurringPayment, txs: Transaction[], txId: string, nowIso: string): { tx: Transaction | null; payment: RecurringPayment } {
  const payment = { ...p, nextDue: nextOccurrence(p.nextDue, p.frequency, p.anchorDay) };
  if (isAlreadyPaid(txs, p.id, p.nextDue)) return { tx: null, payment };
  const tx: Transaction = {
    id: txId, kind: 'expense', amountMinor: p.amountMinor, occurredOn: p.nextDue, accountId: p.accountId, toAccountId: null,
    categoryId: p.categoryId, description: p.name, notes: '', isRecurring: true, recurringPaymentId: p.id, createdAt: nowIso,
  };
  return { tx, payment };
}
