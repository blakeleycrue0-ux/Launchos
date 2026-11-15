import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { accountBalances } from '@/domain/balance';
import { availableToSpend } from '@/domain/available';
import { monthKey, todayISO } from '@/domain/dates';
import { monthSummary } from '@/domain/summary';
import { upsertById } from '@/domain/validation';
import type { Account, Category, Goal, Group, Profile, RecurringPayment, Snapshot, Transaction } from '@/domain/types';
import { protectedSavings } from '@/domain/goals';
import { reservedForPayments, upcoming } from '@/domain/recurring';
import { currentUserId, useAuth } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/config';
import { supabase } from '@/lib/supabase';
import { createLocalRepo } from './localRepo';
import type { Repository } from './repository';
import { createSupabaseRepo } from './supabaseRepo';

const local = createLocalRepo();
const remoteCache = new Map<string, Repository>();

export function useRepo(): { repo: Repository; userId: string } | null {
  const session = useAuth((s) => s.session);
  const userId = currentUserId(session);
  if (!userId) return null;
  if (!isSupabaseConfigured) return { repo: local, userId };
  let repo = remoteCache.get(userId);
  if (!repo) { repo = createSupabaseRepo(supabase!, userId); remoteCache.set(userId, repo); }
  return { repo, userId };
}

export const snapshotKey = (userId: string) => ['snapshot', userId] as const;

export function useSnapshot() {
  const r = useRepo();
  return useQuery({
    queryKey: snapshotKey(r?.userId ?? 'none'),
    queryFn: () => r!.repo.load(),
    enabled: !!r,
    staleTime: 30_000,
  });
}

/** Mutación optimista e idempotente: se actualiza la caché al instante y se revierte si falla. */
function useOptimistic<V>(run: (repo: Repository, v: V) => Promise<void>, apply: (s: Snapshot, v: V) => Snapshot) {
  const r = useRepo();
  const qc = useQueryClient();
  const key = snapshotKey(r?.userId ?? 'none');
  return useMutation({
    mutationFn: (v: V) => run(r!.repo, v),
    retry: 2, // seguro: las escrituras son idempotentes por id
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Snapshot>(key);
      if (prev) qc.setQueryData<Snapshot>(key, apply(prev, v));
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(key, ctx.prev); },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export const useSaveTransaction = () =>
  useOptimistic<Transaction>((repo, t) => repo.upsertTransaction(t), (s, t) => ({ ...s, transactions: upsertById(s.transactions, t) }));
export const useDeleteTransaction = () =>
  useOptimistic<string>((repo, id) => repo.deleteTransaction(id), (s, id) => ({ ...s, transactions: s.transactions.filter((t) => t.id !== id) }));
export const useSaveAccount = () =>
  useOptimistic<Account>((repo, a) => repo.upsertAccount(a), (s, a) => ({ ...s, accounts: upsertById(s.accounts, a) }));
export const useSaveCategory = () =>
  useOptimistic<Category>((repo, c) => repo.upsertCategory(c), (s, c) => ({ ...s, categories: upsertById(s.categories, c) }));
export const useSaveGroup = () =>
  useOptimistic<Group>((repo, g) => repo.upsertGroup(g), (s, g) => ({ ...s, groups: upsertById(s.groups, g) }));
export const useDeleteGroup = () =>
  useOptimistic<string>((repo, id) => repo.deleteGroup(id), (s, id) => ({ ...s, groups: s.groups.filter((g) => g.id !== id) }));
export const useSavePayment = () =>
  useOptimistic<RecurringPayment>((repo, p) => repo.upsertPayment(p), (s, p) => ({ ...s, payments: upsertById(s.payments, p) }));
export const useDeletePayment = () =>
  useOptimistic<string>((repo, id) => repo.deletePayment(id), (s, id) => ({ ...s, payments: s.payments.filter((p) => p.id !== id) }));
export const useSaveGoal = () =>
  useOptimistic<Goal>((repo, g) => repo.upsertGoal(g), (s, g) => ({ ...s, goals: upsertById(s.goals, g) }));
export const useDeleteGoal = () =>
  useOptimistic<string>((repo, id) => repo.deleteGoal(id), (s, id) => ({ ...s, goals: s.goals.filter((g) => g.id !== id) }));
export const useUpdateProfile = () =>
  useOptimistic<Partial<Omit<Profile, 'id'>>>((repo, p) => repo.updateProfile(p), (s, p) => ({ ...s, profile: { ...s.profile, ...p } }));

export async function wipeAll(repo: Repository, qc: QueryClient) {
  await repo.deleteEverything();
  // Local: se vuelve a cargar un espacio vacío (reinicia el onboarding). Supabase: la sesión se cierra.
  if (isSupabaseConfigured) qc.clear();
  else await qc.resetQueries();
}

/** Todas las cifras derivadas del snapshot, calculadas con funciones deterministas del dominio. */
export function useFinance() {
  const { data } = useSnapshot();
  return useMemo(() => {
    if (!data) return null;
    const accounts = data.accounts.filter((a) => !a.archived);
    const balances = accountBalances(data.accounts, data.transactions);
    const today = todayISO();
    const availability = availableToSpend({
      accounts: data.accounts, balances,
      reservedPaymentsMinor: reservedForPayments(data.payments, today),
      protectedSavingsMinor: protectedSavings(data.goals),
    });
    const month = monthKey(today);
    return {
      ...data,
      activeAccounts: accounts,
      categories: data.categories.filter((c) => !c.archived),
      balances,
      availability,
      today,
      upcomingPayments: upcoming(data.payments, today),
      month,
      thisMonth: monthSummary(data.transactions, month),
    };
  }, [data]);
}
