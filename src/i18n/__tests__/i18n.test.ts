import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { en } from '../en';
import { es } from '../es';

const walk = (d: string): string[] =>
  readdirSync(d).flatMap((f) => (['node_modules', '__tests__'].includes(f) ? [] : statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : /\.tsx?$/.test(f) ? [join(d, f)] : []));

describe('traducciones', () => {
  it('es y en tienen exactamente las mismas claves', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(es).sort());
  });
  it('ninguna traducción está vacía', () => {
    for (const [k, v] of Object.entries({ ...es })) expect([k, v.length > 0]).toEqual([k, true]);
    for (const [k, v] of Object.entries({ ...en })) expect([k, v.length > 0]).toEqual([k, true]);
  });
  it('las variables {x} coinciden entre idiomas', () => {
    const vars = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
    for (const k of Object.keys(es) as (keyof typeof es)[]) expect([k, vars(en[k])]).toEqual([k, vars(es[k])]);
  });
  it('todas las claves usadas en el código existen', () => {
    const keys = new Set(Object.keys(es));
    const missing: string[] = [];
    for (const file of [...walk(join(__dirname, '../../../app')), ...walk(join(__dirname, '../../../src'))]) {
      const src = readFileSync(file, 'utf8');
      for (const m of src.matchAll(/\bt\('([a-zA-Z_.]+)'/g)) if (!keys.has(m[1])) missing.push(`${file}: ${m[1]}`);
      for (const m of src.matchAll(/'((?:home|set|tx|acc|add|cats|tab|ready|setup|auth|welcome|intents|common|error|date|group|buy|ai|pay|goal|gexp|join)\.[a-zA-Z_.]+)'/g)) if (!keys.has(m[1])) missing.push(`${file}: ${m[1]}`);
    }
    expect(missing).toEqual([]);
  });
  it('claves dinámicas cubiertas', () => {
    for (const k of ['expense', 'income', 'transfer', 'refund', 'adjustment', 'debt_payment', 'lent', 'repaid']) expect(es).toHaveProperty([`kind.${k}`]);
    for (const k of ['expense', 'income', 'transfer', 'refund', 'adjustment', 'debt_payment']) expect(es).toHaveProperty([`add.save.${k}`]);
    for (const m of ['login', 'signup', 'forgot']) for (const s of ['Title', 'Sub', 'Cta']) expect(es).toHaveProperty([`auth.${m}${s}`]);
    for (const k of ['food', 'transport', 'housing', 'leisure', 'shopping', 'health', 'education', 'subscriptions', 'travel', 'other']) expect(es).toHaveProperty([`cat.${k}`]);
    for (const k of ['bank', 'cash', 'savings', 'other']) expect(es).toHaveProperty([`accountKind.${k}`]);
    for (const k of ['amount_required', 'account_required', 'transfer_needs_two_accounts', 'transfer_same_account', 'transfer_has_category', 'invalid_date', 'currency_mismatch', 'unknown_account']) expect(es).toHaveProperty([`err.${k}`]);
  });
});
