import type { TKey } from '@/i18n';
import type { Account, Category, Transaction, TxKind } from '@/domain/types';
import { addDays, fromISODate, todayISO } from '@/domain/dates';

type T = (k: TKey, v?: Record<string, string | number>) => string;

export const categoryLabel = (c: Category, t: T) => c.name ?? t(`cat.${c.key ?? 'other'}` as TKey);
export const kindLabel = (k: TxKind, t: T) => t(`kind.${k}` as TKey);
export const accountKindLabel = (k: Account['kind'], t: T) => t(`accountKind.${k}` as TKey);

export function txTitle(tx: Transaction, cats: Category[], t: T): string {
  if (tx.description) return tx.description;
  const c = cats.find((x) => x.id === tx.categoryId);
  return c ? categoryLabel(c, t) : kindLabel(tx.kind, t);
}

export function dayLabel(date: string, t: T, intl: string, now = new Date()): string {
  const today = todayISO(now);
  if (date === today) return t('date.today');
  if (date === addDays(today, -1)) return t('date.yesterday');
  const d = fromISODate(date);
  const sameYear = d.getFullYear() === now.getFullYear();
  return new Intl.DateTimeFormat(intl, { weekday: 'short', day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) }).format(d);
}

export const monthLabel = (key: string, intl: string) => {
  const [y, m] = key.split('-').map(Number);
  const label = new Intl.DateTimeFormat(intl, { month: 'long', year: 'numeric' }).format(new Date(y, m - 1, 1));
  return label.charAt(0).toUpperCase() + label.slice(1); // "noviembre de 2026" → "Noviembre de 2026"
};
