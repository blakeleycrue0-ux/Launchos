import type { ISODate } from './types';

const pad = (n: number) => String(n).padStart(2, '0');

export function toISODate(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export const todayISO = (now = new Date()): ISODate => toISODate(now);

export function fromISODate(s: ISODate): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function addDays(s: ISODate, days: number): ISODate {
  const d = fromISODate(s);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}
/** 'YYYY-MM' de una fecha. */
export const monthKey = (s: ISODate) => s.slice(0, 7);
export function addMonths(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}
export const isInMonth = (date: ISODate, key: string) => date.startsWith(key);

/** "20/11/2026" (o 20-11-2026, 20.11.26) → '2026-11-20'. null si no es una fecha real. */
export function parseDisplayDate(text: string): ISODate | null {
  const m = text.trim().match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2}|\d{4})$/);
  if (!m) return null;
  const d = Number(m[1]), mo = Number(m[2]), y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  return toISODate(date);
}
export const formatDisplayDate = (iso: ISODate) => iso.split('-').reverse().join('/');
/** Días naturales entre dos fechas (b − a). */
export const daysBetween = (a: ISODate, b: ISODate) => Math.round((fromISODate(b).getTime() - fromISODate(a).getTime()) / 86400000);
