import { currencyExponent } from './money';
import type { Account, Category, Transaction } from './types';

/** Escapa una celda CSV y neutraliza fórmulas (=, +, -, @) para evitar inyección en hojas de cálculo. */
export function csvCell(value: string | number | boolean): string {
  let s = String(value);
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function transactionsToCsv(
  txs: Transaction[], accounts: Account[], categories: Category[], currency: string,
  categoryName: (c: Category) => string,
): string {
  const exp = currencyExponent(currency);
  const acc = new Map(accounts.map((a) => [a.id, a.name]));
  const cat = new Map(categories.map((c) => [c.id, categoryName(c)]));
  const head = ['date', 'type', 'amount', 'currency', 'category', 'account', 'to_account', 'description', 'notes', 'recurring'];
  const rows = txs
    .slice()
    .sort((a, b) => a.occurredOn.localeCompare(b.occurredOn) || a.createdAt.localeCompare(b.createdAt))
    .map((t) => [
      t.occurredOn, t.kind, (t.amountMinor / 10 ** exp).toFixed(exp), currency,
      t.categoryId ? cat.get(t.categoryId) ?? '' : '', acc.get(t.accountId) ?? '', t.toAccountId ? acc.get(t.toAccountId) ?? '' : '',
      t.description, t.notes, t.isRecurring,
    ].map(csvCell).join(','));
  return [head.join(','), ...rows].join('\n');
}
