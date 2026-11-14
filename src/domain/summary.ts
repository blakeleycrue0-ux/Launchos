import { isInMonth } from './dates';
import type { Minor, Transaction } from './types';

export interface MonthSummary {
  income: Minor;
  /** Gastos netos: gastos − reembolsos. Las transferencias, ajustes y pagos de deuda no cuentan. */
  spending: Minor;
  net: Minor;
  byCategory: Record<string, Minor>;
}

export const UNCATEGORIZED = '__none__';

export function monthSummary(txs: Transaction[], month: string): MonthSummary {
  let income = 0;
  let spending = 0;
  const byCategory: Record<string, Minor> = {};
  for (const tx of txs) {
    if (!isInMonth(tx.occurredOn, month)) continue;
    const cat = tx.categoryId ?? UNCATEGORIZED;
    if (tx.kind === 'income') income += tx.amountMinor;
    else if (tx.kind === 'expense') {
      spending += tx.amountMinor;
      byCategory[cat] = (byCategory[cat] ?? 0) + tx.amountMinor;
    } else if (tx.kind === 'refund') {
      spending -= tx.amountMinor;
      byCategory[cat] = (byCategory[cat] ?? 0) - tx.amountMinor;
    }
  }
  return { income, spending, net: income - spending, byCategory };
}
