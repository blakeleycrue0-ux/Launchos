import { daysBetween, fromISODate } from '@/domain/dates';
import type { TKey } from '@/i18n';

type T = (k: TKey, v?: Record<string, string | number>) => string;

/** «Hoy», «Mañana», «En 5 días», «Atrasado 3 días» o la fecha corta. */
export function dueLabel(due: string, today: string, t: T, intl: string): string {
  const d = daysBetween(today, due);
  if (d === 0) return t('date.today');
  if (d === 1) return t('pay.tomorrow');
  if (d < 0) return t('pay.overdue', { days: -d });
  if (d <= 14) return t('pay.inDays', { days: d });
  return new Intl.DateTimeFormat(intl, { day: 'numeric', month: 'short' }).format(fromISODate(due));
}
