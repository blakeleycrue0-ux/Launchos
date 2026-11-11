import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { generateRoadmap } from '@/domain/roadmap';
import type { AvailablePath, ProfileAnswers, PathAnswers, ProjectStatus, TaskStatus } from '@/domain/types';
import type { Json, ProfileRow, ProjectRow, TaskRow } from '@/lib/database.types';
import { getSupabase } from '@/lib/supabase';
import { useUser } from '@/features/auth/AuthProvider';

export const queryKeys = {
  profile: (userId: string) => ['profile', userId] as const,
  projects: (userId: string) => ['projects', userId] as const,
  project: (projectId: string) => ['project', projectId] as const,
  tasks: (projectId: string) => ['tasks', projectId] as const,
  metrics: (projectId: string) => ['metrics', projectId] as const,
};

// ---------- Lecturas ----------

export function useProfile() {
  const user = useUser();
  return useQuery({
    queryKey: queryKeys.profile(user.id),
    queryFn: async (): Promise<ProfileRow | null> => {
      const { data, error } = await getSupabase().from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useProjects() {
  const user = useUser();
  return useQuery({
    queryKey: queryKeys.projects(user.id),
    queryFn: async (): Promise<ProjectRow[]> => {
      const { data, error } = await getSupabase()
        .from('projects')
        .select('*')
        .neq('status', 'archived')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useProject(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.project(projectId ?? ''),
    enabled: Boolean(projectId),
    queryFn: async (): Promise<ProjectRow | null> => {
      const { data, error } = await getSupabase().from('projects').select('*').eq('id', projectId!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useProjectTasks(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.tasks(projectId ?? ''),
    enabled: Boolean(projectId),
    queryFn: async (): Promise<TaskRow[]> => {
      const { data, error } = await getSupabase()
        .from('project_tasks')
        .select('*')
        .eq('project_id', projectId!)
        .order('position', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

// ---------- Escrituras ----------

export interface CreateProjectInput {
  path: AvailablePath;
  name: string;
  goal: string;
  answers: ProfileAnswers;
  pathAnswers: PathAnswers;
}

export function useCreateProject() {
  const user = useUser();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateProjectInput): Promise<string> => {
      const tasks = generateRoadmap(input.path, { ...input.answers, pathAnswers: input.pathAnswers });
      const { data, error } = await getSupabase().rpc('create_project_with_tasks', {
        p_path_id: input.path.id,
        p_name: input.name,
        p_goal: input.goal,
        p_experience: input.answers.experience,
        p_budget: input.answers.budget,
        p_weekly_hours: input.answers.weeklyHours,
        p_stage: input.answers.stage,
        p_path_answers: input.pathAnswers as Json,
        p_content_version: input.path.contentVersion,
        p_tasks: tasks.map((t) => ({
          template_key: t.templateKey,
          phase_key: t.phaseKey,
          position: t.position,
          status: t.status,
        })) as Json,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects(user.id) });
      qc.invalidateQueries({ queryKey: queryKeys.profile(user.id) });
    },
  });
}

export function useSetActiveProject() {
  const user = useUser();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (projectId: string | null) => {
      const { error } = await getSupabase().from('profiles').update({ active_project_id: projectId }).eq('id', user.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.profile(user.id) }),
  });
}

export function useUpdateProject(projectId: string) {
  const user = useUser();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: { name?: string; goal?: string | null; status?: ProjectStatus }) => {
      const { data, error } = await getSupabase().from('projects').update(patch).eq('id', projectId).select('*').single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.project(projectId), data);
      qc.invalidateQueries({ queryKey: queryKeys.projects(user.id) });
    },
  });
}

export function useDeleteProject() {
  const user = useUser();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await getSupabase().from('projects').delete().eq('id', projectId);
      if (error) throw error;
    },
    // No se eliminan aquí las queries del proyecto borrado: la pantalla actual
    // sigue montada hasta que el llamador navega, y eliminarlas provocaría
    // una nueva petición. Quedan inactivas y la caché las descarta sola.
    onSuccess: (_d, projectId) => {
      // Actualización inmediata para que /app no redirija al proyecto borrado.
      qc.setQueryData<ProjectRow[]>(queryKeys.projects(user.id), (old) => old?.filter((p) => p.id !== projectId));
      qc.setQueryData<ProfileRow | null>(queryKeys.profile(user.id), (old) =>
        old && old.active_project_id === projectId ? { ...old, active_project_id: null } : old,
      );
      qc.invalidateQueries({ queryKey: queryKeys.projects(user.id) });
      qc.invalidateQueries({ queryKey: queryKeys.profile(user.id) });
    },
  });
}

/** Cambia el estado de una tarea con actualización optimista. */
export function useUpdateTask(projectId: string) {
  const qc = useQueryClient();
  const key = queryKeys.tasks(projectId);
  return useMutation({
    mutationFn: async ({ taskId, patch }: { taskId: string; patch: { status?: TaskStatus; notes?: string | null } }) => {
      const { data, error } = await getSupabase().from('project_tasks').update(patch).eq('id', taskId).select('*').single();
      if (error) throw error;
      return data;
    },
    onMutate: async ({ taskId, patch }) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<TaskRow[]>(key);
      qc.setQueryData<TaskRow[]>(key, (old) => old?.map((t) => (t.id === taskId ? { ...t, ...patch } : t)));
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(key, ctx.previous);
    },
    onSuccess: (row) => {
      qc.setQueryData<TaskRow[]>(key, (old) => old?.map((t) => (t.id === row.id ? row : t)));
    },
  });
}
