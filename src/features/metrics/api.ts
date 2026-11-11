import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { MetricEntryRow } from '@/lib/database.types';
import { getSupabase } from '@/lib/supabase';
import { queryKeys } from '@/features/projects/api';

export function useMetricEntries(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.metrics(projectId ?? ''),
    enabled: Boolean(projectId),
    queryFn: async (): Promise<MetricEntryRow[]> => {
      const { data, error } = await getSupabase()
        .from('metric_entries')
        .select('*')
        .eq('project_id', projectId!)
        .order('recorded_on', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      // numeric llega como string desde PostgREST: lo normalizamos.
      return data.map((row) => ({ ...row, value: Number(row.value) }));
    },
  });
}

export function useAddMetricEntry(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { metricKey: string; value: number; recordedOn: string; note: string }) => {
      const { error } = await getSupabase().from('metric_entries').insert({
        project_id: projectId,
        metric_key: input.metricKey,
        value: input.value,
        recorded_on: input.recordedOn,
        note: input.note.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.metrics(projectId) }),
  });
}

export function useDeleteMetricEntry(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await getSupabase().from('metric_entries').delete().eq('id', entryId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.metrics(projectId) }),
  });
}
