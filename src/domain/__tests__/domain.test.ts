import { acct, tx } from './helpers';
import { accountBalance, accountBalances, adjustmentDelta } from '../balance';
import { availableToSpend } from '../available';
import { monthSummary, UNCATEGORIZED } from '../summary';
import { allocate, formatMoney, minorToInput, parseAmount, splitEqually } from '../money';
import { pressKey, inputToMinor, displayInput } from '../amountInput';
import { upsertById, validateTransaction } from '../validation';
import { addDays, addMonths } from '../dates';

describe('parseAmount / format', () => {
  it.each([
    ['12,50', 1250], ['12.50', 1250], ['3', 300], ['0,05', 5], ['1.234,56', 123456], ['1,234.56', 123456],
    ['1.234', 123400], ['-7,5', -750], ['  9 ', 900],
  ])('parsea %s', (s, v) => expect(parseAmount(s)).toBe(v));
  it.each(['', 'abc', '1,2,3x', '12,3456'])('rechaza %j', (s) => expect(parseAmount(s)).toBeNull());
  it('moneda sin decimales', () => expect(parseAmount('1500', 'JPY')).toBe(1500));
  it('minorToInput', () => {
    expect(minorToInput(1250, 'EUR')).toBe('12,5');
    expect(minorToInput(1200, 'EUR')).toBe('12');
    expect(minorToInput(-5, 'EUR')).toBe('0,05');
  });
  it('formatMoney es-ES', () => {
    expect(formatMoney(66000, 'EUR', 'es-ES').replace(/\s/g, ' ')).toMatch(/660,00 €/);
    expect(formatMoney(66000, 'EUR', 'es-ES', { compact: true }).replace(/\s/g, ' ')).toMatch(/660 €/);
  });
});

describe('redondeo de céntimos (allocate)', () => {
  it('120 € entre 4 → 30 € cada uno', () => expect(splitEqually(12000, 4)).toEqual([3000, 3000, 3000, 3000]));
  it('10 € entre 3 no pierde ni crea céntimos', () => {
    const r = splitEqually(1000, 3);
    expect(r).toEqual([334, 333, 333]);
    expect(r.reduce((a, b) => a + b)).toBe(1000);
  });
  it('proporcional y suma exacta', () => {
    const r = allocate(10001, [1, 2, 3]);
    expect(r.reduce((a, b) => a + b)).toBe(10001);
    expect(r[2]).toBeGreaterThan(r[1]);
  });
  it('importes negativos conservan la suma', () => expect(allocate(-100, [1, 1, 1]).reduce((a, b) => a + b)).toBe(-100));
  it('suma de pesos 0 es error', () => expect(() => allocate(100, [0, 0])).toThrow());
  it('propiedad: la suma siempre cuadra', () => {
    for (let total = 0; total < 400; total += 7)
      for (let n = 1; n <= 7; n++) expect(splitEqually(total, n).reduce((a, b) => a + b, 0)).toBe(total);
  });
});

describe('saldos y transferencias', () => {
  const a = acct('a', { initialBalanceMinor: 100000 });
  const b = acct('b', { initialBalanceMinor: 5000 });
  it('saldo = inicial + movimientos', () => {
    const txs = [
      tx({ kind: 'expense', amountMinor: 2500, accountId: 'a' }),
      tx({ kind: 'income', amountMinor: 30000, accountId: 'a' }),
      tx({ kind: 'refund', amountMinor: 500, accountId: 'a' }),
      tx({ kind: 'debt_payment', amountMinor: 1000, accountId: 'a' }),
    ];
    expect(accountBalance(a, txs)).toBe(100000 - 2500 + 30000 + 500 - 1000);
  });
  it('una transferencia mueve dinero sin cambiar el total', () => {
    const t = tx({ kind: 'transfer', amountMinor: 4000, accountId: 'a', toAccountId: 'b' });
    const bals = accountBalances([a, b], [t]);
    expect(bals).toEqual({ a: 96000, b: 9000 });
    expect(bals.a + bals.b).toBe(105000);
  });
  it('la transferencia no cuenta como ingreso ni gasto', () => {
    const t = tx({ kind: 'transfer', amountMinor: 4000, accountId: 'a', toAccountId: 'b' });
    const s = monthSummary([t], '2026-11');
    expect(s.income).toBe(0);
    expect(s.spending).toBe(0);
  });
  it('permite saldos negativos', () => {
    const t = tx({ kind: 'expense', amountMinor: 7000, accountId: 'b' });
    expect(accountBalances([a, b], [t]).b).toBe(-2000);
  });
  it('ajuste de saldo: se registra la diferencia', () => {
    const delta = adjustmentDelta(accountBalance(a, []), 95000);
    const t = tx({ kind: 'adjustment', amountMinor: delta, accountId: 'a' });
    expect(accountBalance(a, [t])).toBe(95000);
  });
  it('accountBalances == accountBalance por cuenta', () => {
    const txs = [
      tx({ kind: 'transfer', amountMinor: 123, accountId: 'b', toAccountId: 'a' }),
      tx({ kind: 'expense', amountMinor: 77, accountId: 'a' }),
    ];
    const m = accountBalances([a, b], txs);
    expect(m.a).toBe(accountBalance(a, txs));
    expect(m.b).toBe(accountBalance(b, txs));
  });
});

describe('dinero disponible', () => {
  const bank = acct('bank', { initialBalanceMinor: 100000 });
  const cash = acct('cash', { kind: 'cash', initialBalanceMinor: 10000 });
  const sav = acct('sav', { kind: 'savings', initialBalanceMinor: 50000 });
  const bals = accountBalances([bank, cash, sav], []);
  it('sin reservas: cuentas gastables (sin ahorros)', () => {
    const r = availableToSpend({ accounts: [bank, cash, sav], balances: bals });
    expect(r.available).toBe(110000);
    expect(r.totalMoney).toBe(160000);
  });
  it('resta pagos, deudas y ahorro protegido', () => {
    const r = availableToSpend({
      accounts: [bank, cash, sav], balances: bals,
      reservedPaymentsMinor: 30000, reservedDebtsMinor: 10000, protectedSavingsMinor: 10000,
    });
    expect(r.available).toBe(60000);
  });
  it('lo que te deben NO es disponible', () => {
    const base = availableToSpend({ accounts: [bank], balances: bals });
    const withOwed = availableToSpend({ accounts: [bank], balances: bals, owedToUserMinor: 99999 });
    expect(withOwed.available).toBe(base.available);
  });
  it('puede ser negativo', () => {
    expect(availableToSpend({ accounts: [bank], balances: bals, reservedPaymentsMinor: 150000 }).available).toBe(-50000);
  });
  it('ignora cuentas archivadas', () => {
    const old = acct('old', { archived: true, initialBalanceMinor: 99999 });
    expect(availableToSpend({ accounts: [bank, old], balances: { ...bals, old: 99999 } }).available).toBe(100000);
  });
  it('usuario sin cuentas ni ingresos → 0', () => {
    expect(availableToSpend({ accounts: [], balances: {} }).available).toBe(0);
  });
  it('reservas negativas no inflan el disponible', () => {
    expect(availableToSpend({ accounts: [bank], balances: bals, reservedPaymentsMinor: -5000 }).available).toBe(100000);
  });
});

describe('resumen mensual y reembolsos', () => {
  it('gasto neto = gastos − reembolsos; ingresos aparte', () => {
    const txs = [
      tx({ kind: 'expense', amountMinor: 12000, accountId: 'a', categoryId: 'food' }),
      tx({ kind: 'refund', amountMinor: 2000, accountId: 'a', categoryId: 'food' }),
      tx({ kind: 'income', amountMinor: 200000, accountId: 'a' }),
      tx({ kind: 'expense', amountMinor: 999, accountId: 'a', occurredOn: '2026-10-31' }),
      tx({ kind: 'debt_payment', amountMinor: 5000, accountId: 'a' }),
    ];
    const s = monthSummary(txs, '2026-11');
    expect(s.spending).toBe(10000);
    expect(s.income).toBe(200000);
    expect(s.net).toBe(190000);
    expect(s.byCategory.food).toBe(10000);
  });
  it('sin categoría se agrupa aparte', () => {
    const s = monthSummary([tx({ kind: 'expense', amountMinor: 100, accountId: 'a' })], '2026-11');
    expect(s.byCategory[UNCATEGORIZED]).toBe(100);
  });
  it('mes sin movimientos', () => {
    expect(monthSummary([], '2026-11')).toEqual({ income: 0, spending: 0, net: 0, byCategory: {} });
  });
});

describe('validación e idempotencia (pérdida de conexión)', () => {
  const accounts = [acct('a'), acct('b'), acct('usd', { currency: 'USD' })];
  const base = tx({ kind: 'expense', amountMinor: 100, accountId: 'a' });
  it('acepta un gasto válido', () => expect(validateTransaction(base, accounts)).toEqual([]));
  it('importe cero o negativo', () => {
    expect(validateTransaction({ ...base, amountMinor: 0 }, accounts)).toContain('amount_required');
    expect(validateTransaction({ ...base, amountMinor: -5 }, accounts)).toContain('amount_required');
  });
  it('el ajuste admite signo', () => expect(validateTransaction({ ...base, kind: 'adjustment', amountMinor: -5 }, accounts)).toEqual([]));
  it('transferencias', () => {
    const t = { ...base, kind: 'transfer' as const };
    expect(validateTransaction(t, accounts)).toContain('transfer_needs_two_accounts');
    expect(validateTransaction({ ...t, toAccountId: 'a' }, accounts)).toContain('transfer_same_account');
    expect(validateTransaction({ ...t, toAccountId: 'usd' }, accounts)).toContain('currency_mismatch');
    expect(validateTransaction({ ...t, toAccountId: 'b' }, accounts)).toEqual([]);
    expect(validateTransaction({ ...t, toAccountId: 'b', categoryId: 'x' }, accounts)).toContain('transfer_has_category');
  });
  it('cuenta inexistente / fecha inválida', () => {
    expect(validateTransaction({ ...base, accountId: 'zzz' }, accounts)).toContain('unknown_account');
    expect(validateTransaction({ ...base, occurredOn: '10/11/2026' }, accounts)).toContain('invalid_date');
  });
  it('reintentar la misma operación no duplica', () => {
    let list = upsertById([], base);
    list = upsertById(list, base); // reintento de red
    list = upsertById(list, base);
    expect(list).toHaveLength(1);
    list = upsertById(list, { ...base, amountMinor: 250 }); // edición
    expect(list).toHaveLength(1);
    expect(list[0].amountMinor).toBe(250);
  });
});

describe('teclado numérico', () => {
  const type = (keys: string[]) => keys.reduce((s, k) => pressKey(s, k as never), '');
  it('digita 12,50', () => expect(type(['1', '2', 'dec', '5', '0'])).toBe('12.50'));
  it('limita decimales', () => expect(type(['1', 'dec', '2', '3', '4'])).toBe('1.23'));
  it('un solo separador', () => expect(type(['1', 'dec', 'dec', '5'])).toBe('1.5'));
  it('empieza con 0 al pulsar coma', () => expect(type(['dec', '7'])).toBe('0.7'));
  it('sin ceros a la izquierda', () => expect(type(['0', '0', '5'])).toBe('5'));
  it('borrar', () => expect(type(['1', '2', 'back', 'back', 'back'])).toBe(''));
  it('monedas sin decimales ignoran la coma', () => expect(pressKey('5', 'dec', 0)).toBe('5'));
  it('conversión', () => {
    expect(inputToMinor('12.5')).toBe(1250);
    expect(inputToMinor('')).toBe(0);
    expect(inputToMinor('7', 0)).toBe(7);
    expect(displayInput('12.5')).toBe('12,5');
    expect(displayInput('')).toBe('0');
  });
});

describe('fechas', () => {
  it('addDays cruza mes y año', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('addMonths', () => {
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(addMonths('2026-11', 2)).toBe('2027-01');
  });
});

import { csvCell, transactionsToCsv } from '../csv';
import { minorToEditText } from '../amountInput';
describe('exportación CSV', () => {
  it('escapa comillas y comas', () => expect(csvCell('a, "b"')).toBe('"a, ""b"""'));
  it('neutraliza inyección de fórmulas', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell('+1')).toBe("'+1");
  });
  it('genera cabecera, importes decimales y nombres', () => {
    const a = acct('a', { name: 'Banco' });
    const t = tx({ kind: 'expense', amountMinor: 1250, accountId: 'a', categoryId: 'c1', description: 'Café, grande' });
    const csv = transactionsToCsv([t], [a], [{ id: 'c1', key: 'food', name: null, icon: 'utensils', archived: false }], 'EUR', () => 'Alimentación');
    const [head, row] = csv.split('\n');
    expect(head.startsWith('date,type,amount')).toBe(true);
    expect(row).toBe('2026-11-10,expense,12.50,EUR,Alimentación,Banco,,"Café, grande",,false');
  });
  it('minorToEditText', () => {
    expect(minorToEditText(1250)).toBe('12.5');
    expect(minorToEditText(5)).toBe('0.05');
    expect(minorToEditText(300)).toBe('3');
  });
});

describe('formato de dinero', () => {
  const f = (m: number, o?: object, l = 'es-ES') => formatMoney(m, 'EUR', l, o).replace(/ /g, ' ');
  it('agrupa miles también con 4 cifras', () => expect(f(108750)).toBe('1.087,50 €'));
  it('millones', () => expect(f(123456789)).toBe('1.234.567,89 €'));
  it('negativos y signo explícito', () => { expect(f(-350)).toBe('-3,50 €'); expect(f(350, { sign: true })).toBe('+3,50 €'); expect(f(0, { sign: true })).toBe('0,00 €'); });
  it('inglés', () => expect(f(108750, {}, 'en-GB')).toBe('€1,087.50'));
  it('sin decimales', () => expect(formatMoney(1500, 'JPY').replace(/ /g, ' ')).toBe('1.500 ¥'));
});

import { simulatePurchase } from '../purchase';
import { answerQuestion } from '../assistant';
describe('¿puedo comprarlo? (simulación)', () => {
  it('encaja con margen', () => expect(simulatePurchase(108750, 18000)).toMatchObject({ after: 90750, remainingPct: 83, verdict: 'fits' }));
  it('margen reducido por debajo del 25 %', () => expect(simulatePurchase(100000, 80000)).toMatchObject({ after: 20000, remainingPct: 20, verdict: 'tight' }));
  it('justo en el 25 % encaja', () => expect(simulatePurchase(100000, 75000).verdict).toBe('fits'));
  it('gastarlo todo deja margen cero', () => expect(simulatePurchase(5000, 5000)).toMatchObject({ after: 0, verdict: 'tight' }));
  it('no alcanza', () => expect(simulatePurchase(10000, 18000)).toMatchObject({ after: -8000, verdict: 'no', remainingPct: 0 }));
  it('disponible negativo', () => expect(simulatePurchase(-500, 100).verdict).toBe('no'));
  it('precio inválido', () => { expect(() => simulatePurchase(1000, 0)).toThrow(); expect(() => simulatePurchase(1000, 1.5)).toThrow(); });
});
describe('asistente: respuestas calculadas', () => {
  const facts = { available: 100000, totalMoney: 150000, currency: 'EUR', reserved: { payments: 81299, debts: 0, savings: 40000 }, weekPayments: { count: 1, total: 1299 }, month: { income: 200000, spending: 34500, net: 165500, byCategory: { food: 30000, bus: 4500 } } };
  it('gasto del mes', () => expect(answerQuestion('¿Cuánto he gastado este mes?', facts)).toEqual({ kind: 'spent', amount: 34500 }));
  it('categoría principal', () => expect(answerQuestion('¿En qué gasto más dinero?', facts)).toEqual({ kind: 'topCategory', categoryId: 'food', amount: 30000 }));
  it('ingresos', () => expect(answerQuestion('ingresos de este mes', facts)).toEqual({ kind: 'income', amount: 200000 }));
  it('disponible', () => expect(answerQuestion('¿Cuánto puedo gastar?', facts)).toEqual({ kind: 'available', amount: 100000 }));
  it('compra con precio', () => expect(answerQuestion('¿Puedo comprar algo de 200 €?', facts)).toMatchObject({ kind: 'purchase', sim: { after: 80000, verdict: 'fits' } }));
  it('precio con decimales', () => expect(answerQuestion('puedo comprar unos cascos de 179,99', facts)).toMatchObject({ kind: 'purchase', sim: { price: 17999 } }));
  it('sin gastos no inventa categoría', () => expect(answerQuestion('en que gasto mas', { ...facts, month: { ...facts.month, byCategory: {} } })).toEqual({ kind: 'noSpending' }));
  it('reservado', () => expect(answerQuestion('¿Cuánto tengo reservado?', facts)).toEqual({ kind: 'reserved', payments: 81299, savings: 40000 }));
  it('pagos de la semana', () => expect(answerQuestion('¿Qué pagos tengo esta semana?', facts)).toEqual({ kind: 'weekPayments', count: 1, total: 1299 }));
  it('pregunta desconocida no inventa nada', () => expect(answerQuestion('¿qué tiempo hace?', facts)).toEqual({ kind: 'unknown' }));
});

import { confirmPayment, monthlyEquivalent, nextOccurrence, reservedForPayments, upcoming, yearlyCost } from '../recurring';
import { canWithdraw, goalProgress, protectedSavings } from '../goals';
import type { Goal, RecurringPayment } from '../types';
const pay = (o: Partial<RecurringPayment> = {}): RecurringPayment => ({
  id: 'p1', name: 'Netflix', amountMinor: 1299, frequency: 'monthly', nextDue: '2026-11-20', anchorDay: 20, accountId: 'a', categoryId: null, active: true, createdAt: '', ...o,
});
describe('pagos recurrentes', () => {
  it('semanal, mensual y anual', () => {
    expect(nextOccurrence('2026-11-20', 'weekly', 20)).toBe('2026-11-27');
    expect(nextOccurrence('2026-12-20', 'monthly', 20)).toBe('2027-01-20');
    expect(nextOccurrence('2026-11-20', 'yearly', 20)).toBe('2027-11-20');
  });
  it('un pago del día 31 no se queda en el 28', () => {
    expect(nextOccurrence('2027-01-31', 'monthly', 31)).toBe('2027-02-28');
    expect(nextOccurrence('2027-02-28', 'monthly', 31)).toBe('2027-03-31');
    expect(nextOccurrence('2028-02-29', 'yearly', 29)).toBe('2029-02-28');
  });
  it('reserva solo lo que vence en 30 días', () => {
    const ps = [pay(), pay({ id: 'p2', name: 'Alquiler', amountMinor: 80000, nextDue: '2026-12-01', anchorDay: 1 }), pay({ id: 'p3', name: 'Seguro', amountMinor: 30000, frequency: 'yearly', nextDue: '2027-03-01' })];
    expect(reservedForPayments(ps, '2026-11-15')).toBe(1299 + 80000);
  });
  it('un semanal aparece varias veces en la ventana', () => {
    expect(upcoming([pay({ frequency: 'weekly', nextDue: '2026-11-16' })], '2026-11-15').map((o) => o.due)).toEqual(['2026-11-16', '2026-11-23', '2026-11-30', '2026-12-07', '2026-12-14']);
  });
  it('los atrasados cuentan y se marcan; los inactivos no', () => {
    const o = upcoming([pay({ nextDue: '2026-11-10', anchorDay: 10 }), pay({ id: 'x', active: false })], '2026-11-15');
    expect(o.map((x) => [x.due, x.overdue])).toEqual([['2026-11-10', true], ['2026-12-10', false]]);
  });
  it('equivalente mensual y coste anual', () => {
    expect(monthlyEquivalent(pay({ frequency: 'yearly', amountMinor: 12000 }))).toBe(1000);
    expect(monthlyEquivalent(pay({ frequency: 'weekly', amountMinor: 1000 }))).toBe(4333);
    expect(yearlyCost(pay())).toBe(15588);
  });
  it('confirmar crea el gasto real y avanza el vencimiento', () => {
    const r = confirmPayment(pay(), [], 't-1', 'now');
    expect(r.tx).toMatchObject({ kind: 'expense', amountMinor: 1299, occurredOn: '2026-11-20', recurringPaymentId: 'p1', description: 'Netflix' });
    expect(r.payment.nextDue).toBe('2026-12-20');
  });
  it('pagos duplicados: confirmar dos veces el mismo vencimiento no crea dos gastos', () => {
    const first = confirmPayment(pay(), [], 't-1', 'now');
    const again = confirmPayment(pay(), [first.tx!], 't-2', 'now'); // reintento con el pago sin avanzar
    expect(again.tx).toBeNull();
    expect(again.payment.nextDue).toBe('2026-12-20');
  });
});
describe('objetivos de ahorro', () => {
  const goal = (o: Partial<Goal> = {}): Goal => ({ id: 'g', name: 'Portátil', targetMinor: 120000, dueDate: null, contributions: [], createdAt: '', ...o });
  const c = (amountMinor: number) => ({ id: String(amountMinor), amountMinor, on: '2026-11-01' });
  it('progreso con aportaciones y retiradas', () => {
    expect(goalProgress(goal({ contributions: [c(50000), c(-20000)] }), '2026-11-15')).toMatchObject({ saved: 30000, remaining: 90000, pct: 25, done: false, perMonth: null });
  });
  it('ahorro mensual necesario, redondeado hacia arriba', () => {
    expect(goalProgress(goal({ dueDate: '2027-02-15', contributions: [c(20000)] }), '2026-11-15')).toMatchObject({ monthsLeft: 3, perMonth: 33334 });
  });
  it('fecha pasada o sin fecha: no inventa cuota', () => expect(goalProgress(goal({ dueDate: '2026-01-01' }), '2026-11-15').perMonth).toBeNull());
  it('objetivo cumplido y superado', () => expect(goalProgress(goal({ contributions: [c(130000)] }), '2026-11-15')).toMatchObject({ pct: 100, done: true, remaining: 0 }));
  it('lo reservado se descuenta UNA vez del disponible', () => {
    const goals = [goal({ contributions: [c(30000)] }), goal({ id: 'g2', contributions: [c(10000)] })];
    const bank = acct('bank', { initialBalanceMinor: 100000 });
    const r = availableToSpend({ accounts: [bank], balances: { bank: 100000 }, protectedSavingsMinor: protectedSavings(goals), reservedPaymentsMinor: 5000 });
    expect(r.available).toBe(100000 - 40000 - 5000);
    expect(r.totalMoney).toBe(100000); // reservar no es gastar: el dinero sigue en la cuenta
  });
  it('no se puede retirar más de lo reservado', () => {
    const g = goal({ contributions: [c(5000)] });
    expect(canWithdraw(g, 5000)).toBe(true);
    expect(canWithdraw(g, 5001)).toBe(false);
    expect(canWithdraw(g, 0)).toBe(false);
  });
});

import { daysBetween, formatDisplayDate, parseDisplayDate } from '../dates';
describe('fechas escritas a mano', () => {
  it('acepta formatos habituales', () => {
    expect(parseDisplayDate('20/11/2026')).toBe('2026-11-20');
    expect(parseDisplayDate('1-2-27')).toBe('2027-02-01');
  });
  it('rechaza fechas imposibles', () => { expect(parseDisplayDate('31/02/2027')).toBeNull(); expect(parseDisplayDate('hoy')).toBeNull(); expect(parseDisplayDate('12/13/2026')).toBeNull(); });
  it('ida y vuelta', () => expect(formatDisplayDate('2026-11-05')).toBe('05/11/2026'));
  it('días entre fechas (cambio de hora incluido)', () => { expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2); expect(daysBetween('2026-11-15', '2026-11-10')).toBe(-5); });
});

import { computeShares, expenseEffects, groupSpent, myPosition, netBalances, settlementEffects, simplifyDebts } from '../groupLedger';
import type { GroupExpense, GroupSettlement } from '../groupLedger';
const gx = (o: Partial<GroupExpense> & Pick<GroupExpense, 'paidBy' | 'amountMinor' | 'shares'>): GroupExpense => ({
  id: 'e' + Math.random(), groupId: 'g', createdBy: o.paidBy, description: '', occurredOn: '2026-11-15', splitKind: 'equal', createdAt: '', ...o,
});
const gs = (fromUser: string, toUser: string, amountMinor: number, id = 's1'): GroupSettlement => ({ id, groupId: 'g', fromUser, toUser, amountMinor, occurredOn: '2026-11-16', createdBy: fromUser, createdAt: '' });
const sharesOf = (r: ReturnType<typeof computeShares>) => ('shares' in r ? r.shares : r.error);
describe('grupos: reparto de un gasto', () => {
  it('cena de 80 € entre 4 → 20 € cada uno', () => expect(sharesOf(computeShares(8000, 'equal', ['a', 'b', 'c', 'd']))).toEqual({ a: 2000, b: 2000, c: 2000, d: 2000 }));
  it('100 € entre 3: los céntimos sobrantes se reparten sin perderse', () => {
    const s = sharesOf(computeShares(10000, 'equal', ['a', 'b', 'c'])) as Record<string, number>;
    expect(s).toEqual({ a: 3334, b: 3333, c: 3333 });
    expect(Object.values(s).reduce((x, y) => x + y)).toBe(10000);
  });
  it('excluir participantes: solo pagan quienes participan', () => expect(sharesOf(computeShares(9000, 'equal', ['a', 'c']))).toEqual({ a: 4500, c: 4500 }));
  it('por porcentajes (60/40) y con decimales', () => {
    expect(sharesOf(computeShares(12000, 'percent', ['a', 'b'], { a: 60, b: 40 }))).toEqual({ a: 7200, b: 4800 });
    const s = sharesOf(computeShares(1000, 'percent', ['a', 'b', 'c'], { a: 33.33, b: 33.33, c: 33.34 })) as Record<string, number>;
    expect(Object.values(s).reduce((x, y) => x + y)).toBe(1000);
  });
  it('los porcentajes deben sumar 100', () => expect(sharesOf(computeShares(1000, 'percent', ['a', 'b'], { a: 60, b: 30 }))).toBe('percent_total'));
  it('importes personalizados desiguales', () => expect(sharesOf(computeShares(9000, 'amounts', ['a', 'b'], { a: 3000, b: 6000 }))).toEqual({ a: 3000, b: 6000 }));
  it('los importes deben sumar el total', () => expect(sharesOf(computeShares(9000, 'amounts', ['a', 'b'], { a: 3000, b: 5999 }))).toBe('amount_total'));
  it('sin participantes o con negativos es error', () => {
    expect(sharesOf(computeShares(100, 'equal', []))).toBe('no_participants');
    expect(sharesOf(computeShares(100, 'amounts', ['a', 'b'], { a: 150, b: -50 }))).toBe('negative');
  });
  it('propiedad: cualquier reparto igualitario suma el total', () => {
    for (let amount = 1; amount < 500; amount += 13)
      for (let n = 1; n <= 6; n++) {
        const s = sharesOf(computeShares(amount, 'equal', Array.from({ length: n }, (_, i) => `u${i}`))) as Record<string, number>;
        expect(Object.values(s).reduce((x, y) => x + y, 0)).toBe(amount);
      }
  });
});
describe('grupos: quién debe a quién', () => {
  const dinner = gx({ paidBy: 'ana', amountMinor: 12000, shares: { ana: 3000, leo: 3000, mar: 3000, pau: 3000 } });
  it('Ana paga 120 € por cuatro: le deben 90 €', () => expect(netBalances({ expenses: [dinner], settlements: [] })).toEqual({ ana: 9000, leo: -3000, mar: -3000, pau: -3000 }));
  it('los saldos siempre suman cero', () => {
    const l = { expenses: [dinner, gx({ paidBy: 'leo', amountMinor: 5001, shares: { ana: 1667, leo: 1667, mar: 1667 } })], settlements: [gs('mar', 'ana', 1000)] };
    expect(Object.values(netBalances(l)).reduce((a, b) => a + b, 0)).toBe(0);
  });
  it('deuda parcialmente liquidada', () => expect(netBalances({ expenses: [dinner], settlements: [gs('leo', 'ana', 1000)] })).toMatchObject({ ana: 8000, leo: -2000 }));
  it('deuda totalmente liquidada → en paz', () => {
    const l = { expenses: [dinner], settlements: [gs('leo', 'ana', 3000, 's1'), gs('mar', 'ana', 3000, 's2'), gs('pau', 'ana', 3000, 's3')] };
    expect(Object.values(netBalances(l)).every((v) => v === 0)).toBe(true);
    expect(simplifyDebts(netBalances(l))).toEqual([]);
  });
  it('simplifica: A→B y B→C se convierte en un solo pago A→C', () => {
    const l = { expenses: [gx({ paidBy: 'b', amountMinor: 1000, shares: { a: 1000 } }), gx({ paidBy: 'c', amountMinor: 1000, shares: { b: 1000 } })], settlements: [] };
    expect(simplifyDebts(netBalances(l))).toEqual([{ from: 'a', to: 'c', amountMinor: 1000 }]);
  });
  it('como máximo n−1 pagos y todos quedan a cero', () => {
    const net = { a: 5000, b: -1500, c: -2500, d: 3000, e: -4000 };
    const t = simplifyDebts(net);
    expect(t.length).toBeLessThanOrEqual(4);
    const after: Record<string, number> = { ...net };
    for (const x of t) { after[x.from] += x.amountMinor; after[x.to] -= x.amountMinor; }
    expect(Object.values(after).every((v) => v === 0)).toBe(true);
  });
  it('un miembro que ya no está sigue apareciendo en las cuentas', () => {
    expect(simplifyDebts(netBalances({ expenses: [dinner], settlements: [] }))).toContainEqual({ from: 'pau', to: 'ana', amountMinor: 3000 });
  });
  it('presupuesto: gastado = suma de gastos (las liquidaciones no cuentan)', () => expect(groupSpent({ expenses: [dinner, dinner] })).toBe(24000));
  it('mi posición suma por grupos sin compensar entre ellos', () => {
    const g1 = { expenses: [dinner], settlements: [] };
    const g2 = { expenses: [gx({ paidBy: 'leo', amountMinor: 4000, shares: { ana: 2000, leo: 2000 } })], settlements: [] };
    expect(myPosition([g1, g2], 'ana')).toEqual({ owedToMe: 9000, iOwe: 2000 });
  });
});
describe('grupos: efecto en el dinero personal (sin duplicar)', () => {
  const dinner = gx({ id: 'd1', paidBy: 'ana', amountMinor: 12000, shares: { ana: 3000, leo: 3000, mar: 3000, pau: 3000 } });
  const bank = acct('bank', { initialBalanceMinor: 100000 });
  const toTx = (fx: ReturnType<typeof expenseEffects>) => fx.map((f) => tx({ kind: f.kind, amountMinor: f.amountMinor, accountId: 'bank', groupRef: f.ref }));
  it('pago 120 € por cuatro: la cuenta baja 120, mi gasto es 30 y me deben 90', () => {
    const txs = toTx(expenseEffects(dinner, 'ana'));
    expect(accountBalance(bank, txs)).toBe(100000 - 12000);
    expect(monthSummary(txs, '2026-11').spending).toBe(3000);
    expect(myPosition([{ expenses: [dinner], settlements: [] }], 'ana').owedToMe).toBe(9000);
  });
  it('quien no pagó no tiene movimiento personal: solo una deuda pendiente', () => {
    expect(expenseEffects(dinner, 'leo')).toEqual([]);
    expect(myPosition([{ expenses: [dinner], settlements: [] }], 'leo').iOwe).toBe(3000);
  });
  it('la deuda pendiente se reserva del disponible, pero no es un gasto todavía', () => {
    const owe = myPosition([{ expenses: [dinner], settlements: [] }], 'leo').iOwe;
    const r = availableToSpend({ accounts: [bank], balances: { bank: 100000 }, reservedDebtsMinor: owe });
    expect(r.available).toBe(97000);
    expect(r.totalMoney).toBe(100000);
  });
  it('lo que me deben no aumenta mi disponible', () => {
    const txs = toTx(expenseEffects(dinner, 'ana'));
    expect(availableToSpend({ accounts: [bank], balances: accountBalances([bank], txs), owedToUserMinor: 9000 }).available).toBe(88000);
  });
  it('al cobrar, entra el dinero pero no cuenta como ingreso', () => {
    const txs = [...toTx(expenseEffects(dinner, 'ana')), ...toTx(settlementEffects(gs('leo', 'ana', 3000), 'ana'))];
    expect(accountBalance(bank, txs)).toBe(100000 - 12000 + 3000);
    expect(monthSummary(txs, '2026-11')).toMatchObject({ income: 0, spending: 3000 });
  });
  it('al pagar mi deuda, el gasto se registra UNA vez y la reserva desaparece', () => {
    const settle = gs('leo', 'ana', 3000);
    const txs = toTx(settlementEffects(settle, 'leo'));
    const owe = myPosition([{ expenses: [dinner], settlements: [settle] }], 'leo').iOwe;
    expect(owe).toBe(0);
    const r = availableToSpend({ accounts: [bank], balances: accountBalances([bank], txs), reservedDebtsMinor: owe });
    expect(r.available).toBe(97000); // igual que antes de pagar: no se resta dos veces
    expect(monthSummary(txs, '2026-11').spending).toBe(3000);
  });
  it('referencias únicas: reprocesar el mismo gasto da los mismos vínculos', () => {
    expect(expenseEffects(dinner, 'ana').map((f) => f.ref)).toEqual(['gx:d1:share', 'gx:d1:lent']);
    expect(settlementEffects(gs('leo', 'ana', 3000, 'z'), 'mar')).toEqual([]);
  });
  it('si pago algo en lo que no participo, todo es dinero adelantado', () => {
    expect(expenseEffects(gx({ id: 'x', paidBy: 'ana', amountMinor: 500, shares: { leo: 500 } }), 'ana')).toEqual([{ ref: 'gx:x:lent', kind: 'lent', amountMinor: 500, occurredOn: '2026-11-15' }]);
  });
});
