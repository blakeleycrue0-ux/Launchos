// Prueba la migración y la RLS en un PostgreSQL embebido (PGlite), simulando Supabase Auth.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dir = dirname(fileURLToPath(import.meta.url));
const db = new PGlite();
let failed = 0;
const ok = (name, cond) => { console.log(`${cond ? '  ✓' : '  ✗'} ${name}`); if (!cond) failed++; };
const throws = async (name, fn, re) => {
  try { await fn(); ok(name, false); } catch (e) { ok(`${name} → ${String(e.message).slice(0, 60)}`, re ? re.test(e.message) : true); }
};

// Stub mínimo de Supabase: esquema auth, auth.uid() y roles.
await db.exec(`
  create role anon nologin; create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated;
  grant usage on schema public to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant execute on functions to anon, authenticated;
`);
for (const f of readdirSync(join(dir, '../migrations')).sort()) {
  await db.exec(readFileSync(join(dir, '../migrations', f), 'utf8'));
}
const asUser = async (uid, fn) => {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${uid}',false);`);
  try { return await fn(); } finally { await db.exec(`reset role; select set_config('request.jwt.claim.sub','',false);`); }
};
const q = (sql, p) => db.query(sql, p).then((r) => r.rows);

console.log('Migración aplicada. Probando…');
const A = (await q(`insert into auth.users(email) values ('a@x') returning id`))[0].id;
const B = (await q(`insert into auth.users(email) values ('b@x') returning id`))[0].id;

ok('alta de usuario crea perfil', (await q(`select 1 from profiles where id=$1`, [A])).length === 1);
ok('alta de usuario siembra 10 categorías', (await q(`select count(*)::int c from categories where user_id=$1`, [A]))[0].c === 10);

const acc = async (uid, name, cur = 'EUR') =>
  asUser(uid, async () => (await q(`insert into accounts(name,currency,initial_balance_minor) values ($1,$2,10000) returning id`, [name, cur]))[0].id);
const a1 = await acc(A, 'Banco'); const a2 = await acc(A, 'Efectivo'); const aUsd = await acc(A, 'USD', 'USD'); const b1 = await acc(B, 'Banco B');
const T1 = '00000000-0000-4000-8000-000000000001';

await asUser(A, async () => {
  await db.query(`insert into transactions(id,kind,amount_minor,occurred_on,account_id) values ($1,'expense',350,'2026-11-10',$2)`, [T1, a1]);
});
ok('A inserta un gasto (user_id = auth.uid() por defecto)', (await q(`select user_id from transactions where id=$1`, [T1]))[0].user_id === A);

await asUser(B, async () => {
  ok('B no ve las cuentas de A', (await q(`select * from accounts where user_id=$1`, [A])).length === 0);
  ok('B no ve los movimientos de A', (await q(`select * from transactions`)).length === 0);
  ok('B no ve el perfil de A', (await q(`select * from profiles where id=$1`, [A])).length === 0);
  ok('B no puede borrar movimientos de A (0 filas)', (await db.query(`delete from transactions where id=$1`, [T1])).affectedRows === 0);
  ok('B no puede editar movimientos de A (0 filas)', (await db.query(`update transactions set amount_minor=1 where id=$1`, [T1])).affectedRows === 0);
  await throws('B no puede insertar a nombre de A (RLS)', () =>
    db.query(`insert into transactions(id,user_id,kind,amount_minor,occurred_on,account_id) values (gen_random_uuid(),$1,'expense',1,'2026-11-10',$2)`, [A, a1]), /row-level security|violates/i);
  await throws('B no puede usar una cuenta de A (FK compuesta)', () =>
    db.query(`insert into transactions(id,kind,amount_minor,occurred_on,account_id) values (gen_random_uuid(),'expense',1,'2026-11-10',$1)`, [a1]), /foreign key/i);
});
ok('el movimiento de A sigue intacto', (await q(`select amount_minor::int a from transactions where id=$1`, [T1]))[0].a === 350);

await asUser(A, async () => {
  await db.query(`insert into transactions(id,kind,amount_minor,occurred_on,account_id) values ($1,'expense',350,'2026-11-10',$2) on conflict (id) do update set amount_minor=excluded.amount_minor`, [T1, a1]);
  ok('reintento idempotente (upsert) no duplica', (await q(`select count(*)::int c from transactions where id=$1`, [T1]))[0].c === 1);
  await throws('importe 0 rechazado', () => db.query(`insert into transactions(id,kind,amount_minor,occurred_on,account_id) values (gen_random_uuid(),'expense',0,'2026-11-10',$1)`, [a1]), /check/i);
  await throws('gasto negativo rechazado', () => db.query(`insert into transactions(id,kind,amount_minor,occurred_on,account_id) values (gen_random_uuid(),'expense',-5,'2026-11-10',$1)`, [a1]), /check/i);
  ok('ajuste con signo permitido', (await db.query(`insert into transactions(id,kind,amount_minor,occurred_on,account_id) values (gen_random_uuid(),'adjustment',-5,'2026-11-10',$1)`, [a1])).affectedRows === 1);
  await throws('transferencia sin destino rechazada', () => db.query(`insert into transactions(id,kind,amount_minor,occurred_on,account_id) values (gen_random_uuid(),'transfer',5,'2026-11-10',$1)`, [a1]), /check|same currency/i);
  await throws('transferencia a la misma cuenta rechazada', () => db.query(`insert into transactions(id,kind,amount_minor,occurred_on,account_id,to_account_id) values (gen_random_uuid(),'transfer',5,'2026-11-10',$1,$1)`, [a1]), /check/i);
  await throws('transferencia entre monedas distintas rechazada', () => db.query(`insert into transactions(id,kind,amount_minor,occurred_on,account_id,to_account_id) values (gen_random_uuid(),'transfer',5,'2026-11-10',$1,$2)`, [a1, aUsd]), /same currency/i);
  ok('transferencia válida', (await db.query(`insert into transactions(id,kind,amount_minor,occurred_on,account_id,to_account_id) values (gen_random_uuid(),'transfer',5,'2026-11-10',$1,$2)`, [a1, a2])).affectedRows === 1);
  await throws('gasto con to_account_id rechazado', () => db.query(`insert into transactions(id,kind,amount_minor,occurred_on,account_id,to_account_id) values (gen_random_uuid(),'expense',5,'2026-11-10',$1,$2)`, [a1, a2]), /check/i);
  await throws('no se puede cambiar user_id', () => db.query(`update transactions set user_id=$1 where id=$2`, [B, T1]), /row-level security|immutable/i);
});

// ── Pagos recurrentes y objetivos ──
const P1 = '00000000-0000-4000-8000-0000000000b1';
await asUser(A, async () => {
  await db.query(`insert into recurring_payments(id,name,amount_minor,frequency,next_due,anchor_day,account_id) values ($1,'Netflix',1299,'monthly','2026-11-20',20,$2)`, [P1, a1]);
  await db.query(`insert into transactions(id,kind,amount_minor,occurred_on,account_id,recurring_payment_id) values (gen_random_uuid(),'expense',1299,'2026-11-20',$1,$2)`, [a1, P1]);
  await throws('el mismo vencimiento no se registra dos veces', () => db.query(`insert into transactions(id,kind,amount_minor,occurred_on,account_id,recurring_payment_id) values (gen_random_uuid(),'expense',1299,'2026-11-20',$1,$2)`, [a1, P1]), /unique|duplicate/i);
  ok('el siguiente vencimiento sí se registra', (await db.query(`insert into transactions(id,kind,amount_minor,occurred_on,account_id,recurring_payment_id) values (gen_random_uuid(),'expense',1299,'2026-12-20',$1,$2)`, [a1, P1])).affectedRows === 1);
  await throws('pago recurrente con importe 0 rechazado', () => db.query(`insert into recurring_payments(id,name,amount_minor,frequency,next_due,anchor_day,account_id) values (gen_random_uuid(),'x',0,'monthly','2026-11-20',20,$1)`, [a1]), /check/i);
  await db.query(`insert into goals(id,name,target_minor,contributions) values (gen_random_uuid(),'Portátil',120000,'[{"id":"c1","amountMinor":5000,"on":"2026-11-01"}]')`);
  await throws('objetivo sin importe rechazado', () => db.query(`insert into goals(id,name,target_minor) values (gen_random_uuid(),'x',0)`), /check/i);
});
await asUser(B, async () => {
  ok('B no ve los pagos de A', (await q(`select * from recurring_payments`)).length === 0);
  ok('B no ve los objetivos de A', (await q(`select * from goals`)).length === 0);
  await throws('B no puede colgar un pago de la cuenta de A', () => db.query(`insert into recurring_payments(id,name,amount_minor,frequency,next_due,anchor_day,account_id) values (gen_random_uuid(),'x',1,'monthly','2026-11-20',20,$1)`, [a1]), /foreign key/i);
});
await asUser(A, async () => {
  await db.query(`delete from recurring_payments where id=$1`, [P1]);
  ok('borrar un pago conserva sus movimientos (sin vínculo)', (await q(`select count(*)::int c from transactions where amount_minor=1299 and recurring_payment_id is null`))[0].c === 2);
});

// ── Grupos ──
const G1 = '00000000-0000-4000-8000-0000000000a1';
await asUser(A, async () => {
  await db.query(`insert into groups(id,name,kind,currency,budget_minor) values ($1,'Ibiza 2027','travel','EUR',120000)`, [G1]);
  ok('A crea un grupo y queda como propietario', (await q(`select role from group_members where group_id=$1`, [G1]))[0]?.role === 'owner');
  await db.query(`insert into groups(id,name,kind,currency) values ($1,'Ibiza 2027','travel','EUR') on conflict (id) do update set name=excluded.name`, [G1]);
  ok('reintento de crear grupo no duplica', (await q(`select count(*)::int c from groups`))[0].c === 1);
  await throws('presupuesto negativo rechazado', () => db.query(`update groups set budget_minor=-1 where id=$1`, [G1]), /check/i);
});
await asUser(B, async () => {
  ok('B (no miembro) no ve el grupo', (await q(`select * from groups`)).length === 0);
  ok('B no ve los miembros', (await q(`select * from group_members`)).length === 0);
  ok('B no puede editar el grupo (0 filas)', (await db.query(`update groups set name='hack' where id=$1`, [G1])).affectedRows === 0);
  ok('B no puede borrar el grupo (0 filas)', (await db.query(`delete from groups where id=$1`, [G1])).affectedRows === 0);
  await throws('B no puede añadirse como miembro', () => db.query(`insert into group_members(group_id,user_id) values ($1,$2)`, [G1, B]), /permission denied|row-level/i);
  await throws('B no puede crear un grupo a nombre de A', () => db.query(`insert into groups(id,owner_id,name,currency) values (gen_random_uuid(),$1,'x','EUR')`, [A]), /row-level/i);
});
await db.query(`insert into group_members(group_id,user_id) values ($1,$2)`, [G1, B]); // alta por backend (futura RPC de invitación)
await asUser(B, async () => {
  ok('B, ya miembro, ve el grupo', (await q(`select * from groups`)).length === 1);
  ok('B ve a los 2 miembros', (await q(`select * from group_members`)).length === 2);
  ok('B, miembro, no puede editar (solo el propietario)', (await db.query(`update groups set name='hack' where id=$1`, [G1])).affectedRows === 0);
  await throws('B no puede ascenderse a propietario', () => db.query(`update group_members set role='owner' where user_id=$1`, [B]), /permission denied/i);
  ok('B puede abandonar el grupo', (await db.query(`delete from group_members where user_id=$1`, [B])).affectedRows === 1);
  ok('…y deja de verlo', (await q(`select * from groups`)).length === 0);
});
await asUser(A, async () => {
  ok('el propietario no puede abandonar su grupo (0 filas)', (await db.query(`delete from group_members where user_id=$1`, [A])).affectedRows === 0);
  await throws('owner_id inmutable', () => db.query(`update groups set owner_id=$1 where id=$2`, [B, G1]), /immutable|row-level/i);
});

await db.exec('reset role');
await throws('anon no puede leer', async () => { await db.exec(`set role anon`); try { await db.query('select * from transactions'); } finally { await db.exec('reset role'); } }, /permission denied/i);

await asUser(A, async () => { await db.query(`select delete_my_account()`); });
ok('borrar cuenta elimina usuario, cuentas y movimientos',
  (await q(`select (select count(*) from auth.users where id=$1)+(select count(*) from accounts where user_id=$1)+(select count(*) from transactions where user_id=$1)+(select count(*) from profiles where id=$1) n`, [A]))[0].n == 0);
ok('borrar cuenta elimina también sus grupos', (await q(`select count(*)::int c from groups`))[0].c === 0);
ok('…y no toca a B', (await q(`select count(*)::int c from accounts where user_id=$1`, [B]))[0].c === 1);
await throws('delete_my_account sin sesión falla', async () => { await db.exec(`set role authenticated`); try { await db.query('select delete_my_account()'); } finally { await db.exec('reset role'); } }, /not authenticated/);

console.log(failed ? `\n${failed} FALLOS` : '\nTodas las pruebas de base de datos pasan.');
process.exit(failed ? 1 : 0);
