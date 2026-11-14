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
