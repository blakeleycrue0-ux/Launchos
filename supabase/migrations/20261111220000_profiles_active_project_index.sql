-- Índice para la FK profiles.active_project_id (sugerido por el análisis de rendimiento de Supabase).
create index if not exists profiles_active_project_idx on public.profiles (active_project_id);
