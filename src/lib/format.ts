import type { MetricUnit } from '@/domain/types';

const numberFmt = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 });
const currencyFmt = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });
const dateFmt = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
const shortDateFmt = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' });

export function formatMetric(value: number, unit: MetricUnit): string {
  if (unit === 'currency') return currencyFmt.format(value);
  if (unit === 'percent') return `${numberFmt.format(value)} %`;
  return numberFmt.format(value);
}

/** Fecha en formato YYYY-MM-DD (columna `date` de Postgres) → texto legible. */
export function formatDate(isoDate: string, short = false): string {
  const d = isoDate.length === 10 ? new Date(`${isoDate}T00:00:00`) : new Date(isoDate);
  return (short ? shortDateFmt : dateFmt).format(d);
}

export function todayIso(): string {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}
