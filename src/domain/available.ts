import type { Account, Minor } from './types';

export interface AvailabilityInput {
  accounts: Account[];
  balances: Record<string, Minor>;
  /** Pagos próximos reservados (Fase 2). */
  reservedPaymentsMinor?: Minor;
  /** Deudas propias pendientes reservadas (Fase 2). */
  reservedDebtsMinor?: Minor;
  /** Ahorro protegido por objetivos (Fase 3). */
  protectedSavingsMinor?: Minor;
  /**
   * Dinero que otros deben al usuario. Se acepta para documentar la regla,
   * pero NO se suma nunca: no es disponible hasta que se recibe.
   */
  owedToUserMinor?: Minor;
}

export interface Availability {
  /** Dinero total en cuentas activas (incluye ahorros). */
  totalMoney: Minor;
  /** Dinero en cuentas que se pueden gastar (excluye cuentas de ahorro). */
  spendable: Minor;
  reserved: { payments: Minor; debts: Minor; savings: Minor };
  /** spendable − reservas. Puede ser negativo. */
  available: Minor;
}

/**
 * Disponible para gastar = saldo de cuentas gastables
 *                         − pagos pendientes reservados
 *                         − deudas pendientes reservadas
 *                         − ahorro protegido.
 */
export function availableToSpend(input: AvailabilityInput): Availability {
  const active = input.accounts.filter((a) => !a.archived);
  const bal = (a: Account) => input.balances[a.id] ?? a.initialBalanceMinor;
  const totalMoney = active.reduce((s, a) => s + bal(a), 0);
  const spendable = active.filter((a) => a.kind !== 'savings').reduce((s, a) => s + bal(a), 0);
  const reserved = {
    payments: Math.max(0, input.reservedPaymentsMinor ?? 0),
    debts: Math.max(0, input.reservedDebtsMinor ?? 0),
    savings: Math.max(0, input.protectedSavingsMinor ?? 0),
  };
  return {
    totalMoney,
    spendable,
    reserved,
    available: spendable - reserved.payments - reserved.debts - reserved.savings,
  };
}
