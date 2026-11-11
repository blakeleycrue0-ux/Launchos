-- =====================================================================
-- LaunchOS · Esquema inicial (fase 1)
--
-- Tablas: profiles, projects, project_tasks, metric_entries
-- Todas protegidas con Row Level Security: cada usuario solo ve y
-- modifica sus propias filas.
--
-- El contenido (caminos, fases, tareas, instrucciones, métricas) NO vive
-- aquí: está versionado en el código (src/content). La base de datos solo
-- guarda el estado del usuario y referencia ese contenido por clave.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Utilidades
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- profiles · 1:1 con auth.users
-- ---------------------------------------------------------------------
create table public.profiles (
  id                 uuid primary key references auth.users (id) on delete cascade,
  display_name       text check (char_length(display_name) <= 80),
  active_project_id  uuid,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on table public.profiles is 'Datos de perfil de cada usuario de LaunchOS.';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Crea el perfil automáticamente al registrarse.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Usuarios que ya existían antes de esta migración.
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- projects · un usuario puede tener varios proyectos
-- ---------------------------------------------------------------------
create table public.projects (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  path_id         text not null check (path_id ~ '^[a-z0-9-]{2,40}$'),
  name            text not null check (char_length(trim(name)) between 1 and 80),
  goal            text check (char_length(goal) <= 500),
  status          text not null default 'active' check (status in ('active', 'paused', 'archived')),
  experience      text not null check (experience in ('none', 'some', 'experienced')),
  budget          text not null check (budget in ('zero', 'low', 'medium', 'high')),
  weekly_hours    text not null check (weekly_hours in ('h0_5', 'h5_10', 'h10_20', 'h20_plus')),
  stage           text not null check (stage in ('idea', 'started', 'earning')),
  path_answers    jsonb not null default '{}'::jsonb check (jsonb_typeof(path_answers) = 'object'),
  content_version integer not null default 1,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on column public.projects.path_id is 'Clave del camino de negocio definido en src/content/paths (p. ej. faceless).';
comment on column public.projects.path_answers is 'Respuestas a las preguntas específicas del camino.';
comment on column public.projects.content_version is 'Versión del roadmap del camino con la que se generaron las tareas.';

create index projects_user_id_idx on public.projects (user_id, created_at desc);

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- FK diferida desde profiles: el proyecto activo debe existir.
alter table public.profiles
  add constraint profiles_active_project_fk
  foreign key (active_project_id) references public.projects (id) on delete set null;

-- ---------------------------------------------------------------------
-- project_tasks · tareas generadas para un proyecto
-- ---------------------------------------------------------------------
create table public.project_tasks (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects (id) on delete cascade,
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  template_key  text not null check (char_length(template_key) between 1 and 80),
  phase_key     text not null check (char_length(phase_key) between 1 and 80),
  position      integer not null check (position >= 0),
  status        text not null default 'todo' check (status in ('todo', 'in_progress', 'done', 'skipped')),
  notes         text check (char_length(notes) <= 5000),
  started_at    timestamptz,
  completed_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (project_id, template_key)
);

create index project_tasks_project_idx on public.project_tasks (project_id, position);
create index project_tasks_user_idx on public.project_tasks (user_id);

create trigger project_tasks_set_updated_at
  before update on public.project_tasks
  for each row execute function public.set_updated_at();

-- Mantiene started_at / completed_at coherentes con el estado.
create or replace function public.project_tasks_track_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'in_progress' and new.started_at is null then
    new.started_at = now();
  end if;
  if new.status = 'done' then
    new.completed_at = coalesce(new.completed_at, now());
    new.started_at = coalesce(new.started_at, new.completed_at);
  else
    new.completed_at = null;
  end if;
  if new.status = 'todo' then
    new.started_at = null;
  end if;
  return new;
end;
$$;

create trigger project_tasks_track_status
  before insert or update of status on public.project_tasks
  for each row execute function public.project_tasks_track_status();

-- ---------------------------------------------------------------------
-- metric_entries · registros de resultados (serie temporal simple)
-- ---------------------------------------------------------------------
create table public.metric_entries (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects (id) on delete cascade,
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  metric_key   text not null check (metric_key ~ '^[a-z0-9_]{2,40}$'),
  value        numeric(14, 2) not null check (value >= 0),
  recorded_on  date not null default current_date,
  note         text check (char_length(note) <= 500),
  created_at   timestamptz not null default now()
);

create index metric_entries_project_idx on public.metric_entries (project_id, metric_key, recorded_on desc);
create index metric_entries_user_idx on public.metric_entries (user_id);

-- ---------------------------------------------------------------------
-- Integridad: las filas hijas pertenecen al mismo usuario que el proyecto
-- ---------------------------------------------------------------------
create or replace function public.owns_project(p_project_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1 from public.projects p
    where p.id = p_project_id and p.user_id = (select auth.uid())
  );
$$;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.profiles       enable row level security;
alter table public.projects       enable row level security;
alter table public.project_tasks  enable row level security;
alter table public.metric_entries enable row level security;

-- profiles: lectura y actualización del propio perfil (el alta la hace el trigger)
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (
    id = (select auth.uid())
    and (active_project_id is null or public.owns_project(active_project_id))
  );

-- projects
create policy "projects_select_own" on public.projects
  for select to authenticated using (user_id = (select auth.uid()));
create policy "projects_insert_own" on public.projects
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "projects_update_own" on public.projects
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "projects_delete_own" on public.projects
  for delete to authenticated using (user_id = (select auth.uid()));

-- project_tasks
create policy "tasks_select_own" on public.project_tasks
  for select to authenticated using (user_id = (select auth.uid()));
create policy "tasks_insert_own" on public.project_tasks
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.owns_project(project_id));
create policy "tasks_update_own" on public.project_tasks
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.owns_project(project_id));
create policy "tasks_delete_own" on public.project_tasks
  for delete to authenticated using (user_id = (select auth.uid()));

-- metric_entries
create policy "metrics_select_own" on public.metric_entries
  for select to authenticated using (user_id = (select auth.uid()));
create policy "metrics_insert_own" on public.metric_entries
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.owns_project(project_id));
create policy "metrics_update_own" on public.metric_entries
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.owns_project(project_id));
create policy "metrics_delete_own" on public.metric_entries
  for delete to authenticated using (user_id = (select auth.uid()));

-- Inmutabilidad de la pertenencia: una tarea o métrica no puede moverse de proyecto.
create or replace function public.prevent_project_reassignment()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.project_id <> old.project_id or new.user_id <> old.user_id then
    raise exception 'No se puede cambiar el proyecto o el propietario de este registro';
  end if;
  return new;
end;
$$;

create trigger project_tasks_no_reassign
  before update on public.project_tasks
  for each row execute function public.prevent_project_reassignment();
create trigger metric_entries_no_reassign
  before update on public.metric_entries
  for each row execute function public.prevent_project_reassignment();

create or replace function public.prevent_project_owner_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.user_id <> old.user_id then
    raise exception 'No se puede cambiar el propietario de un proyecto';
  end if;
  return new;
end;
$$;

create trigger projects_no_owner_change
  before update on public.projects
  for each row execute function public.prevent_project_owner_change();

-- ---------------------------------------------------------------------
-- RPC: crear proyecto + tareas en una única transacción
-- SECURITY INVOKER: se ejecuta con los permisos del usuario, por lo que
-- RLS sigue aplicando a cada insert.
-- ---------------------------------------------------------------------
create or replace function public.create_project_with_tasks(
  p_path_id         text,
  p_name            text,
  p_goal            text,
  p_experience      text,
  p_budget          text,
  p_weekly_hours    text,
  p_stage           text,
  p_path_answers    jsonb,
  p_content_version integer,
  p_tasks           jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id    uuid := auth.uid();
  v_project_id uuid;
begin
  if v_user_id is null then
    raise exception 'No autenticado' using errcode = '28000';
  end if;

  if jsonb_typeof(p_tasks) <> 'array' or jsonb_array_length(p_tasks) = 0 then
    raise exception 'El roadmap debe contener al menos una tarea';
  end if;

  insert into public.projects (
    user_id, path_id, name, goal, experience, budget, weekly_hours, stage, path_answers, content_version
  ) values (
    v_user_id, p_path_id, trim(p_name), nullif(trim(p_goal), ''), p_experience, p_budget,
    p_weekly_hours, p_stage, coalesce(p_path_answers, '{}'::jsonb), coalesce(p_content_version, 1)
  )
  returning id into v_project_id;

  insert into public.project_tasks (project_id, user_id, template_key, phase_key, position, status)
  select
    v_project_id,
    v_user_id,
    t ->> 'template_key',
    t ->> 'phase_key',
    (t ->> 'position')::integer,
    coalesce(t ->> 'status', 'todo')
  from jsonb_array_elements(p_tasks) as t;

  update public.profiles set active_project_id = v_project_id where id = v_user_id;

  return v_project_id;
end;
$$;

revoke execute on function public.create_project_with_tasks(text, text, text, text, text, text, text, jsonb, integer, jsonb) from public, anon;
grant execute on function public.create_project_with_tasks(text, text, text, text, text, text, text, jsonb, integer, jsonb) to authenticated;

revoke execute on function public.owns_project(uuid) from public, anon;
grant execute on function public.owns_project(uuid) to authenticated;
