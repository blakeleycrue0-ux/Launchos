-- MIO · Pagos recurrentes y objetivos de ahorro (datos privados de cada usuario).

create type public.pay_frequency as enum ('weekly', 'monthly', 'yearly');

create table public.recurring_payments (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  amount_minor bigint not null check (amount_minor > 0),
  frequency public.pay_frequency not null,
  next_due date not null,
  anchor_day int not null check (anchor_day between 1 and 31),
  account_id uuid not null,
  category_id uuid,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (account_id, user_id) references public.accounts (id, user_id),
  foreign key (category_id, user_id) references public.categories (id, user_id) on delete set null (category_id)
);
create index recurring_payments_user_idx on public.recurring_payments (user_id);

-- Un movimiento puede proceder de un pago recurrente; un mismo vencimiento solo se registra una vez.
alter table public.transactions
  add column recurring_payment_id uuid,
  add foreign key (recurring_payment_id, user_id) references public.recurring_payments (id, user_id) on delete set null (recurring_payment_id);
create unique index transactions_recurring_once on public.transactions (recurring_payment_id, occurred_on)
  where recurring_payment_id is not null;

create table public.goals (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  target_minor bigint not null check (target_minor > 0),
  due_date date,
  contributions jsonb not null default '[]'::jsonb check (jsonb_typeof(contributions) = 'array'),
  created_at timestamptz not null default now()
);
create index goals_user_idx on public.goals (user_id);

alter table public.recurring_payments enable row level security;
alter table public.goals enable row level security;
do $$
declare t text;
begin
  foreach t in array array['recurring_payments','goals'] loop
    execute format('create policy %I on public.%I for select to authenticated using (user_id = (select auth.uid()))', t||'_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (user_id = (select auth.uid()))', t||'_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t||'_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (user_id = (select auth.uid()))', t||'_delete', t);
  end loop;
end $$;
revoke all on public.recurring_payments, public.goals from anon;
