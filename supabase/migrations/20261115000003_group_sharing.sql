-- MIO · Grupos compartidos reales: invitaciones por enlace, gastos, repartos y liquidaciones.
--
-- Modelo de permisos
--   · Solo los miembros ACTIVOS de un grupo pueden leer sus datos (RLS con is_group_member).
--   · Ninguna tabla de grupo admite escrituras directas del cliente: todo pasa por funciones
--     SECURITY DEFINER que validan pertenencia, importes y coherencia del reparto en una sola transacción.
--   · Los miembros solo ven de los demás el nombre visible elegido para el grupo (nunca email ni saldos personales).

-- Movimientos personales vinculados a un grupo: dinero adelantado (no es gasto) y dinero devuelto (no es ingreso).
alter type public.tx_kind add value if not exists 'lent';
alter type public.tx_kind add value if not exists 'repaid';
alter table public.transactions add column group_ref text check (char_length(group_ref) <= 120);
create unique index transactions_group_ref_once on public.transactions (user_id, group_ref) where group_ref is not null;

-- Miembros: nombre visible y baja sin borrar (el historial conserva quién pagó qué).
alter table public.group_members
  add column display_name text not null default '' check (char_length(display_name) <= 40),
  add column left_at timestamptz;
drop policy members_leave on public.group_members;

create or replace function public.is_group_member(gid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.group_members m where m.group_id = gid and m.user_id = auth.uid() and m.left_at is null);
$$;

create or replace function public.member_name(uid uuid) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce(nullif(trim((select display_name from public.profiles where id = uid)), ''), 'Miembro');
$$;
revoke all on function public.member_name(uuid) from public, anon, authenticated;

create or replace function public.handle_new_group() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.group_members (group_id, user_id, role, display_name)
  values (new.id, new.owner_id, 'owner', public.member_name(new.owner_id));
  return new;
end $$;

-- Quien ya no es miembro activo tampoco ve el grupo, salvo su propietario.
drop policy members_select on public.group_members;
create policy members_select on public.group_members for select to authenticated using (public.is_group_member(group_id));

-- ───────────────────────── invitaciones ─────────────────────────
create table public.group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  token_hash text not null unique,              -- solo se guarda el hash: el enlace no se puede reconstruir desde la base
  created_by uuid not null references auth.users (id) on delete cascade,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  uses int not null default 0,
  created_at timestamptz not null default now()
);
create index group_invites_group_idx on public.group_invites (group_id);
alter table public.group_invites enable row level security;
create policy invites_select on public.group_invites for select to authenticated
  using (exists (select 1 from public.groups g where g.id = group_id and g.owner_id = (select auth.uid())));

create function public.create_group_invite(p_group uuid, p_days int default 7) returns text
language plpgsql security definer set search_path = '' as $$
declare v_token text;
begin
  if not exists (select 1 from public.groups where id = p_group and owner_id = auth.uid()) then
    raise exception 'only the group owner can invite';
  end if;
  if p_days is null or p_days < 1 or p_days > 30 then raise exception 'invalid expiry'; end if;
  v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  insert into public.group_invites (group_id, token_hash, created_by, expires_at)
  values (p_group, encode(sha256(convert_to(v_token, 'UTF8')), 'hex'), auth.uid(), now() + make_interval(days => p_days));
  return v_token;
end $$;

create function public.revoke_group_invite(p_invite uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.group_invites i set revoked_at = now()
  where i.id = p_invite and i.revoked_at is null
    and exists (select 1 from public.groups g where g.id = i.group_id and g.owner_id = auth.uid());
  if not found then raise exception 'invite not found'; end if;
end $$;

-- Vista previa mínima para la pantalla de aceptar (nombre, tipo y foto; nada más).
create function public.preview_group_invite(p_token text) returns table (group_id uuid, name text, kind public.group_kind, photo_preset text, already_member boolean)
language sql stable security definer set search_path = '' as $$
  select g.id, g.name, g.kind, g.photo_preset, public.is_group_member(g.id)
  from public.group_invites i join public.groups g on g.id = i.group_id
  where auth.uid() is not null
    and i.token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
    and i.revoked_at is null and i.expires_at > now();
$$;

create function public.accept_group_invite(p_token text, p_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_inv public.group_invites; v_name text;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select * into v_inv from public.group_invites
  where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex') for update;
  if not found or v_inv.revoked_at is not null or v_inv.expires_at <= now() then
    raise exception 'invite invalid or expired';
  end if;
  v_name := left(coalesce(nullif(trim(p_name), ''), public.member_name(auth.uid())), 40);
  insert into public.group_members (group_id, user_id, role, display_name)
  values (v_inv.group_id, auth.uid(), 'member', v_name)
  on conflict (group_id, user_id) do update set left_at = null, display_name = excluded.display_name;
  update public.group_invites set uses = uses + 1 where id = v_inv.id;
  return v_inv.group_id;
end $$;

create function public.leave_group(p_group uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.group_members set left_at = now()
  where group_id = p_group and user_id = auth.uid() and role <> 'owner' and left_at is null;
  if not found then raise exception 'cannot leave this group'; end if;
end $$;

-- ───────────────────────── gastos y repartos ─────────────────────────
create table public.group_expenses (
  id uuid primary key,                           -- generado por el cliente (idempotencia)
  group_id uuid not null references public.groups (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade,
  paid_by uuid not null references auth.users (id) on delete cascade,
  amount_minor bigint not null check (amount_minor > 0),
  description text not null default '' check (char_length(description) <= 80),
  occurred_on date not null,
  split_kind text not null check (split_kind in ('equal', 'percent', 'amounts')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index group_expenses_group_idx on public.group_expenses (group_id, occurred_on desc);

create table public.group_expense_shares (
  expense_id uuid not null references public.group_expenses (id) on delete cascade,
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  share_minor bigint not null check (share_minor >= 0),
  primary key (expense_id, user_id)
);
create index group_expense_shares_group_idx on public.group_expense_shares (group_id);

create table public.group_settlements (
  id uuid primary key,
  group_id uuid not null references public.groups (id) on delete cascade,
  from_user uuid not null references auth.users (id) on delete cascade,
  to_user uuid not null references auth.users (id) on delete cascade,
  amount_minor bigint not null check (amount_minor > 0),
  occurred_on date not null,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (from_user <> to_user)
);
create index group_settlements_group_idx on public.group_settlements (group_id);

alter table public.group_expenses enable row level security;
alter table public.group_expense_shares enable row level security;
alter table public.group_settlements enable row level security;
create policy gexp_select on public.group_expenses for select to authenticated using (public.is_group_member(group_id));
create policy gshare_select on public.group_expense_shares for select to authenticated using (public.is_group_member(group_id));
create policy gset_select on public.group_settlements for select to authenticated using (public.is_group_member(group_id));

create function public.was_group_member(gid uuid, uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.group_members m where m.group_id = gid and m.user_id = uid);
$$;
revoke all on function public.was_group_member(uuid, uuid) from public, anon, authenticated;

-- Alta o edición atómica de un gasto con su reparto. p_shares: [{"user_id": "...", "share_minor": 123}, ...]
create function public.save_group_expense(
  p_id uuid, p_group uuid, p_paid_by uuid, p_amount bigint, p_description text, p_date date, p_split_kind text, p_shares jsonb
) returns void
language plpgsql security definer set search_path = '' as $$
declare v_existing public.group_expenses; v_sum bigint; v_bad int; v_count int; v_distinct int;
begin
  if not public.is_group_member(p_group) then raise exception 'not a member of this group'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'amount must be positive'; end if;
  if not public.was_group_member(p_group, p_paid_by) then raise exception 'payer is not a member'; end if;
  if jsonb_typeof(p_shares) <> 'array' or jsonb_array_length(p_shares) = 0 then raise exception 'shares required'; end if;

  select coalesce(sum((s->>'share_minor')::bigint), 0), count(*), count(distinct (s->>'user_id')),
         count(*) filter (where (s->>'share_minor')::bigint < 0 or not public.was_group_member(p_group, (s->>'user_id')::uuid))
    into v_sum, v_count, v_distinct, v_bad
  from jsonb_array_elements(p_shares) s;
  if v_bad > 0 then raise exception 'invalid share'; end if;
  if v_count <> v_distinct then raise exception 'duplicated participant'; end if;
  if v_sum <> p_amount then raise exception 'shares must add up to the amount'; end if;

  select * into v_existing from public.group_expenses where id = p_id for update;
  if found then
    if v_existing.group_id <> p_group then raise exception 'expense belongs to another group'; end if;
    if v_existing.created_by <> auth.uid()
       and not exists (select 1 from public.groups where id = p_group and owner_id = auth.uid()) then
      raise exception 'only the author or the owner can edit this expense';
    end if;
    update public.group_expenses set paid_by = p_paid_by, amount_minor = p_amount, description = left(coalesce(p_description, ''), 80),
      occurred_on = p_date, split_kind = p_split_kind, updated_at = now() where id = p_id;
    delete from public.group_expense_shares where expense_id = p_id;
  else
    insert into public.group_expenses (id, group_id, created_by, paid_by, amount_minor, description, occurred_on, split_kind)
    values (p_id, p_group, auth.uid(), p_paid_by, p_amount, left(coalesce(p_description, ''), 80), p_date, p_split_kind);
  end if;
  insert into public.group_expense_shares (expense_id, group_id, user_id, share_minor)
  select p_id, p_group, (s->>'user_id')::uuid, (s->>'share_minor')::bigint from jsonb_array_elements(p_shares) s;
end $$;

create function public.delete_group_expense(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.group_expenses e
  where e.id = p_id and public.is_group_member(e.group_id)
    and (e.created_by = auth.uid() or exists (select 1 from public.groups g where g.id = e.group_id and g.owner_id = auth.uid()));
  if not found then raise exception 'expense not found or not allowed'; end if;
end $$;

-- Liquidación manual: solo la registra una de las dos partes. No mueve dinero real.
create function public.save_group_settlement(p_id uuid, p_group uuid, p_from uuid, p_to uuid, p_amount bigint, p_date date) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_group_member(p_group) then raise exception 'not a member of this group'; end if;
  if auth.uid() not in (p_from, p_to) then raise exception 'only the people involved can record a settlement'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'amount must be positive'; end if;
  if p_from = p_to or not public.was_group_member(p_group, p_from) or not public.was_group_member(p_group, p_to) then
    raise exception 'invalid people';
  end if;
  insert into public.group_settlements (id, group_id, from_user, to_user, amount_minor, occurred_on, created_by)
  values (p_id, p_group, p_from, p_to, p_amount, p_date, auth.uid())
  on conflict (id) do nothing;                    -- reintento de red: no duplica
end $$;

create function public.delete_group_settlement(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.group_settlements s where s.id = p_id and s.created_by = auth.uid() and public.is_group_member(s.group_id);
  if not found then raise exception 'settlement not found or not allowed'; end if;
end $$;

-- Permisos de ejecución: solo usuarios autenticados; nada para anon.
do $$
declare f text;
begin
  foreach f in array array[
    'create_group_invite(uuid, int)', 'revoke_group_invite(uuid)', 'preview_group_invite(text)', 'accept_group_invite(text, text)',
    'leave_group(uuid)', 'save_group_expense(uuid, uuid, uuid, bigint, text, date, text, jsonb)', 'delete_group_expense(uuid)',
    'save_group_settlement(uuid, uuid, uuid, uuid, bigint, date)', 'delete_group_settlement(uuid)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
revoke all on public.group_invites, public.group_expenses, public.group_expense_shares, public.group_settlements from anon;
revoke insert, update, delete on public.group_invites, public.group_expenses, public.group_expense_shares, public.group_settlements from authenticated;
revoke delete on public.group_members from authenticated;

-- Sincronización en tiempo real (la publicación existe en Supabase; no en entornos de prueba).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.groups, public.group_members, public.group_expenses, public.group_expense_shares, public.group_settlements;
  end if;
end $$;
