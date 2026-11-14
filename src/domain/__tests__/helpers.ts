import type { Account, Transaction } from '../types';

export const acct = (id: string, o: Partial<Account> = {}): Account => ({
  id, name: id, kind: 'bank', initialBalanceMinor: 0, currency: 'EUR', archived: false, createdAt: '2026-01-01', ...o,
});
let n = 0;
export const tx = (o: Partial<Transaction> & Pick<Transaction, 'kind' | 'amountMinor' | 'accountId'>): Transaction => ({
  id: `t${++n}`, occurredOn: '2026-11-10', toAccountId: null, categoryId: null, description: '', notes: '',
  isRecurring: false, createdAt: '2026-11-10', ...o,
});
