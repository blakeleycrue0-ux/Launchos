import type { MetricUnit } from '@/domain/types';

const numberFmt = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2, useGrouping: 'always' as unknown as boolean });
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

const rtf = new Intl.RelativeTimeFormat('es-ES', { numeric: 'auto' });

/** «hace 5 minutos», «ayer», «hace 3 días»… y fecha corta a partir de una semana. */
export function formatRelative(iso: string, now = new Date()): string {
  const diff = (new Date(iso).getTime() - now.getTime()) / 1000;
  const abs = Math.abs(diff);
  if (abs < 60) return 'ahora mismo';
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
  if (abs < 86400 * 7) return rtf.format(Math.round(diff / 86400), 'day');
  return formatDate(iso, true);
}
