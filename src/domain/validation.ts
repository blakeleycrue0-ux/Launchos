import type { Account, Transaction } from './types';

export type TxError =
  | 'amount_required'
  | 'account_required'
  | 'transfer_needs_two_accounts'
  | 'transfer_same_account'
  | 'transfer_has_category'
  | 'invalid_date'
  | 'currency_mismatch'
  | 'unknown_account';

/** Reglas de integridad de un movimiento (el SQL aplica las mismas con CHECK). */
export function validateTransaction(tx: Transaction, accounts: Account[]): TxError[] {
  const errs: TxError[] = [];
  if (!Number.isInteger(tx.amountMinor) || tx.amountMinor === 0) errs.push('amount_required');
  if (tx.kind !== 'adjustment' && tx.amountMinor < 0) errs.push('amount_required');
  if (!tx.accountId) errs.push('account_required');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tx.occurredOn)) errs.push('invalid_date');
  const from = accounts.find((a) => a.id === tx.accountId);
  if (tx.accountId && !from) errs.push('unknown_account');
  if (tx.kind === 'transfer') {
    if (!tx.toAccountId) errs.push('transfer_needs_two_accounts');
    else if (tx.toAccountId === tx.accountId) errs.push('transfer_same_account');
    else {
      const to = accounts.find((a) => a.id === tx.toAccountId);
      if (!to) errs.push('unknown_account');
      else if (from && from.currency !== to.currency) errs.push('currency_mismatch');
    }
    if (tx.categoryId) errs.push('transfer_has_category');
  } else if (tx.toAccountId) {
    errs.push('transfer_needs_two_accounts');
  }
  return errs;
}

/** Inserción idempotente por id: reintentar la misma operación no duplica el movimiento. */
export function upsertById<T extends { id: string }>(list: T[], item: T): T[] {
  const i = list.findIndex((x) => x.id === item.id);
  if (i === -1) return [...list, item];
  const copy = list.slice();
  copy[i] = item;
  return copy;
}
