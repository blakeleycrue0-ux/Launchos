import { allocate } from './money';
import type { ISODate, Minor, TxKind } from './types';

export type SplitKind = 'equal' | 'percent' | 'amounts';

export interface GroupMember { groupId: string; userId: string; name: string; role: 'owner' | 'member'; active: boolean }
export interface GroupExpense {
  id: string; groupId: string; createdBy: string; paidBy: string; amountMinor: Minor; description: string;
  occurredOn: ISODate; splitKind: SplitKind; createdAt: string;
  /** userId → parte en céntimos. Siempre suma amountMinor. */
  shares: Record<string, Minor>;
}
export interface GroupSettlement { id: string; groupId: string; fromUser: string; toUser: string; amountMinor: Minor; occurredOn: ISODate; createdBy: string; createdAt: string }
export interface GroupLedger { members: GroupMember[]; expenses: GroupExpense[]; settlements: GroupSettlement[] }

export type SplitError = 'no_participants' | 'percent_total' | 'amount_total' | 'negative';

/**
 * Calcula el reparto de un gasto. Nunca pierde ni crea céntimos.
 *  - equal:   a partes iguales entre los participantes (quien no participa, no aparece).
 *  - percent: `values` son porcentajes que deben sumar 100.
 *  - amounts: `values` son importes en céntimos que deben sumar el total.
 */
export function computeShares(
  amount: Minor, kind: SplitKind, participants: string[], values: Record<string, number> = {},
): { shares: Record<string, Minor> } | { error: SplitError } {
  if (!participants.length) return { error: 'no_participants' };
  const vals = participants.map((p) => values[p] ?? 0);
  if (vals.some((v) => v < 0)) return { error: 'negative' };
  let parts: Minor[];
  if (kind === 'equal') parts = allocate(amount, participants.map(() => 1));
  else if (kind === 'percent') {
    // se compara en centésimas de punto para no depender de decimales binarios
    if (Math.round(vals.reduce((a, b) => a + b, 0) * 100) !== 10000) return { error: 'percent_total' };
    parts = allocate(amount, vals.map((v) => Math.round(v * 100)));
  } else {
    if (vals.some((v) => !Number.isInteger(v)) || vals.reduce((a, b) => a + b, 0) !== amount) return { error: 'amount_total' };
    parts = vals;
  }
  const shares: Record<string, Minor> = {};
  participants.forEach((p, i) => { if (parts[i] > 0 || kind === 'amounts') shares[p] = parts[i]; });
  for (const k of Object.keys(shares)) if (shares[k] === 0) delete shares[k];
  return { shares };
}

/**
 * Saldo neto por persona: positivo = le deben, negativo = debe.
 * Pagar un gasto suma; tu parte resta. Una liquidación de A a B sube a A y baja a B.
 * La suma de todos los saldos es siempre 0.
 */
export function netBalances(ledger: Pick<GroupLedger, 'expenses' | 'settlements'>): Record<string, Minor> {
  const net: Record<string, Minor> = {};
  const add = (u: string, v: Minor) => { net[u] = (net[u] ?? 0) + v; };
  for (const e of ledger.expenses) {
    add(e.paidBy, e.amountMinor);
    for (const [u, s] of Object.entries(e.shares)) add(u, -s);
  }
  for (const s of ledger.settlements) { add(s.fromUser, s.amountMinor); add(s.toUser, -s.amountMinor); }
  return net;
}

export interface Transfer { from: string; to: string; amountMinor: Minor }

/**
 * Forma sencilla de saldar: empareja al que más debe con al que más le deben.
 * Como máximo n−1 pagos para n personas. Determinista (empates por id).
 */
export function simplifyDebts(net: Record<string, Minor>): Transfer[] {
  const debtors = Object.entries(net).filter(([, v]) => v < 0).map(([u, v]) => ({ u, v: -v }));
  const creditors = Object.entries(net).filter(([, v]) => v > 0).map(([u, v]) => ({ u, v }));
  const order = (a: { u: string; v: number }, b: { u: string; v: number }) => b.v - a.v || a.u.localeCompare(b.u);
  const out: Transfer[] = [];
  for (let guard = 0; guard < 1000; guard++) {
    debtors.sort(order); creditors.sort(order);
    const d = debtors[0], c = creditors[0];
    if (!d || !c || d.v === 0 || c.v === 0) break;
    const amountMinor = Math.min(d.v, c.v);
    out.push({ from: d.u, to: c.u, amountMinor });
    d.v -= amountMinor; c.v -= amountMinor;
    if (d.v === 0) debtors.shift();
    if (c.v === 0) creditors.shift();
  }
  return out;
}

export const groupSpent = (ledger: Pick<GroupLedger, 'expenses'>): Minor => ledger.expenses.reduce((s, e) => s + e.amountMinor, 0);

/** Lo que me deben y lo que debo, sumando el saldo neto de cada grupo por separado. */
export function myPosition(ledgers: Pick<GroupLedger, 'expenses' | 'settlements'>[], me: string): { owedToMe: Minor; iOwe: Minor } {
  let owedToMe = 0, iOwe = 0;
  for (const l of ledgers) {
    const v = netBalances(l)[me] ?? 0;
    if (v > 0) owedToMe += v; else iOwe += -v;
  }
  return { owedToMe, iOwe };
}

/**
 * EFECTO EN EL DINERO PERSONAL (regla de caja: solo cuenta el dinero que entra o sale de mis cuentas).
 *
 *  · Pago yo un gasto del grupo  → mi parte es un GASTO; el resto es dinero ADELANTADO ('lent'):
 *                                   sale de mi cuenta pero no es gasto mío, es una deuda pendiente a mi favor.
 *  · Paga otra persona           → no afecta a mis cuentas. Mi parte es una DEUDA pendiente (se reserva del disponible).
 *  · Pago una liquidación        → GASTO (ahí es cuando mi parte sale de verdad de mi cuenta).
 *  · Recibo una liquidación      → dinero DEVUELTO ('repaid'): entra en mi cuenta pero no es un ingreso.
 *
 * Cada efecto lleva una referencia única: guardarlo dos veces no duplica movimientos.
 */
export interface PersonalEffect { ref: string; kind: Extract<TxKind, 'expense' | 'lent' | 'repaid'>; amountMinor: Minor; occurredOn: ISODate }

export function expenseEffects(e: Pick<GroupExpense, 'id' | 'paidBy' | 'amountMinor' | 'shares' | 'occurredOn'>, me: string): PersonalEffect[] {
  if (e.paidBy !== me) return [];
  const mine = e.shares[me] ?? 0;
  const out: PersonalEffect[] = [];
  if (mine > 0) out.push({ ref: `gx:${e.id}:share`, kind: 'expense', amountMinor: mine, occurredOn: e.occurredOn });
  if (e.amountMinor - mine > 0) out.push({ ref: `gx:${e.id}:lent`, kind: 'lent', amountMinor: e.amountMinor - mine, occurredOn: e.occurredOn });
  return out;
}
export function settlementEffects(s: Pick<GroupSettlement, 'id' | 'fromUser' | 'toUser' | 'amountMinor' | 'occurredOn'>, me: string): PersonalEffect[] {
  if (s.fromUser === me) return [{ ref: `gs:${s.id}`, kind: 'expense', amountMinor: s.amountMinor, occurredOn: s.occurredOn }];
  if (s.toUser === me) return [{ ref: `gs:${s.id}`, kind: 'repaid', amountMinor: s.amountMinor, occurredOn: s.occurredOn }];
  return [];
}
/** Prefijos de referencia de un gasto/liquidación, para localizar sus movimientos personales. */
export const expenseRefPrefix = (id: string) => `gx:${id}:`;
export const settlementRef = (id: string) => `gs:${id}`;
