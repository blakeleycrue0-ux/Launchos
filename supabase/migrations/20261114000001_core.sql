-- MIO · Fase 1 · núcleo: perfiles, cuentas, categorías y movimientos.
-- Importes en unidades menores (bigint). Nunca float.
-- Cada fila lleva user_id (default auth.uid()); RLS aísla a los usuarios entre sí.
-- Las claves foráneas compuestas (id, user_id) impiden referenciar filas de OTRO usuario.

create type public.account_kind as enum ('bank', 'cash', 'savings', 'other');
create type public.tx_kind as enum ('expense', 'income', 'transfer', 'adjustment', 'refund', 'debt_payment');

-- ───────────────────────── profiles ─────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 80),
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  monthly_income_minor bigint not null default 0 check (monthly_income_minor >= 0),
  intents text[] not null default '{}',
  onboarding_step int not null default 0 check (onboarding_step between 0 and 10),
  onboarding_done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ───────────────────────── accounts ─────────────────────────
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  kind public.account_kind not null default 'bank',
  initial_balance_minor bigint not null default 0,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  unique (id, user_id)
);
create index accounts_user_idx on public.accounts (user_id);

-- ───────────────────────── categories ─────────────────────────
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  key text,                                   -- categorías iniciales (traducibles)
  name text check (char_length(name) between 1 and 60),
  icon text not null default 'dots',
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  unique (id, user_id),
  check (key is not null or name is not null)
);
create index categories_user_idx on public.categories (user_id);

-- ───────────────────────── transactions ─────────────────────────
create table public.transactions (
  id uuid primary key,                        -- lo genera el cliente: clave de idempotencia
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind public.tx_kind not null,
  amount_minor bigint not null,
  occurred_on date not null,
  account_id uuid not null,
  to_account_id uuid,
  category_id uuid,
  description text not null default '' check (char_length(description) <= 200),
  notes text not null default '' check (char_length(notes) <= 2000),
  is_recurring boolean not null default false,
  created_at timestamptz not null default now(),
  foreign key (account_id, user_id) references public.accounts (id, user_id),
  foreign key (to_account_id, user_id) references public.accounts (id, user_id),
  foreign key (category_id, user_id) references public.categories (id, user_id) on delete set null (category_id),
  check (amount_minor <> 0),
  check (kind = 'adjustment' or amount_minor > 0),
  check ((kind = 'transfer') = (to_account_id is not null)),
  check (to_account_id is null or to_account_id <> account_id),
  check (kind <> 'transfer' or category_id is null)
);
create index transactions_user_date_idx on public.transactions (user_id, occurred_on desc);
create index transactions_account_idx on public.transactions (account_id);

-- Las transferencias sólo entre cuentas de la misma moneda; user_id inmutable.
create function public.enforce_transaction_rules() returns trigger
language plpgsql set search_path = '' as $$
declare c_from text; c_to text;
begin
  if tg_op = 'UPDATE' and new.user_id <> old.user_id then
    raise exception 'user_id is immutable';
  end if;
  if new.kind = 'transfer' then
    select currency into c_from from public.accounts where id = new.account_id;
    select currency into c_to from public.accounts where id = new.to_account_id;
    if c_from is distinct from c_to then
      raise exception 'transfers require accounts with the same currency';
    end if;
  end if;
  return new;
end $$;
create trigger transactions_rules before insert or update on public.transactions
  for each row execute function public.enforce_transaction_rules();

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ───────────────────────── alta de usuario ─────────────────────────
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id);
  insert into public.categories (user_id, key, icon)
  values (new.id,'food','utensils'),(new.id,'transport','bus'),(new.id,'housing','home'),
         (new.id,'leisure','ticket'),(new.id,'shopping','bag'),(new.id,'health','pulse'),
         (new.id,'education','book'),(new.id,'subscriptions','repeat'),(new.id,'travel','plane'),
         (new.id,'other','dots');
  return new;
end $$;
revoke all on function public.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────────────────── borrar cuenta ─────────────────────────
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  delete from auth.users where id = auth.uid();   -- cascada a todos los datos del usuario
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ───────────────────────── Row Level Security ─────────────────────────
alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;

create policy profiles_select on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

do $$
declare t text;
begin
  foreach t in array array['accounts','categories','transactions'] loop
    execute format('create policy %I on public.%I for select to authenticated using (user_id = (select auth.uid()))', t||'_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (user_id = (select auth.uid()))', t||'_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t||'_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (user_id = (select auth.uid()))', t||'_delete', t);
  end loop;
end $$;

-- El rol anónimo no toca nada.
revoke all on public.profiles, public.accounts, public.categories, public.transactions from anon;
