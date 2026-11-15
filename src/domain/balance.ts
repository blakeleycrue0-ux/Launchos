import type { Account, Minor, Transaction } from './types';

/**
 * Efecto de un movimiento sobre una cuenta concreta.
 *  - income / refund / repaid: suman
 *  - expense / debt_payment / lent: restan
 *  - adjustment: suma su diferencia con signo
 *  - transfer: resta en origen, suma en destino (una sola fila → atómica por diseño)
 */
export function effectOnAccount(tx: Transaction, accountId: string): Minor {
  switch (tx.kind) {
    case 'income':
    case 'refund':
    case 'repaid':
      return tx.accountId === accountId ? tx.amountMinor : 0;
    case 'expense':
    case 'debt_payment':
    case 'lent':
      return tx.accountId === accountId ? -tx.amountMinor : 0;
    case 'adjustment':
      return tx.accountId === accountId ? tx.amountMinor : 0;
    case 'transfer':
      return (
        (tx.accountId === accountId ? -tx.amountMinor : 0) +
        (tx.toAccountId === accountId ? tx.amountMinor : 0)
      );
  }
}

export function accountBalance(account: Account, txs: Transaction[]): Minor {
  return txs.reduce((acc, tx) => acc + effectOnAccount(tx, account.id), account.initialBalanceMinor);
}

export function accountBalances(accounts: Account[], txs: Transaction[]): Record<string, Minor> {
  const out: Record<string, Minor> = {};
  for (const a of accounts) out[a.id] = a.initialBalanceMinor;
  for (const tx of txs) {
    if (tx.accountId in out) out[tx.accountId] += effectOnAccount(tx, tx.accountId);
    if (tx.kind === 'transfer' && tx.toAccountId && tx.toAccountId in out) {
      out[tx.toAccountId] += tx.amountMinor;
    }
  }
  return out;
}

/** Saldo que debería tener la cuenta tras un ajuste: devuelve la diferencia a registrar. */
export const adjustmentDelta = (currentBalance: Minor, realBalance: Minor): Minor => realBalance - currentBalance;
