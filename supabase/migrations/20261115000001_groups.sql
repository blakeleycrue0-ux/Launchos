-- MIO · Grupos compartidos: estructura y permisos.
-- Un grupo pertenece a su creador (owner) y lo ven únicamente sus miembros.
-- Las invitaciones (alta de otros miembros) llegarán con una RPC en la fase de sincronización;
-- hasta entonces ningún cliente puede añadir miembros por su cuenta.

create type public.group_kind as enum ('travel', 'couple', 'home', 'friends', 'event', 'other');

create table public.groups (
  id uuid primary key,                         -- generado por el cliente (idempotencia)
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  kind public.group_kind not null default 'other',
  photo_preset text check (char_length(photo_preset) <= 40),
  photo_path text,                             -- ruta en Storage (fase de sincronización)
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  budget_minor bigint not null default 0 check (budget_minor >= 0),
  created_at timestamptz not null default now()
);
create index groups_owner_idx on public.groups (owner_id);

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index group_members_user_idx on public.group_members (user_id);

-- security definer para evitar recursión de RLS al consultar la pertenencia.
create function public.is_group_member(gid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.group_members m where m.group_id = gid and m.user_id = auth.uid());
$$;
revoke all on function public.is_group_member(uuid) from public, anon;
grant execute on function public.is_group_member(uuid) to authenticated;

create function public.handle_new_group() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.group_members (group_id, user_id, role) values (new.id, new.owner_id, 'owner');
  return new;
end $$;
revoke all on function public.handle_new_group() from public, anon, authenticated;
create trigger on_group_created after insert on public.groups
  for each row execute function public.handle_new_group();

create function public.protect_group_owner() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.owner_id <> old.owner_id then raise exception 'owner_id is immutable'; end if;
  return new;
end $$;
create trigger groups_owner_immutable before update on public.groups
  for each row execute function public.protect_group_owner();

alter table public.groups enable row level security;
alter table public.group_members enable row level security;

create policy groups_select on public.groups for select to authenticated
  using (owner_id = (select auth.uid()) or public.is_group_member(id));
create policy groups_insert on public.groups for insert to authenticated with check (owner_id = (select auth.uid()));
create policy groups_update on public.groups for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy groups_delete on public.groups for delete to authenticated using (owner_id = (select auth.uid()));

create policy members_select on public.group_members for select to authenticated using (public.is_group_member(group_id));
-- Un miembro (no propietario) puede abandonar el grupo. Nadie puede añadirse ni cambiar roles desde el cliente.
create policy members_leave on public.group_members for delete to authenticated
  using (user_id = (select auth.uid()) and role <> 'owner');

revoke all on public.groups, public.group_members from anon;
revoke insert, update on public.group_members from authenticated;
