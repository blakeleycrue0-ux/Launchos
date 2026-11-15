import { useEffect, useMemo } from 'react';
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
import { myPosition, type GroupLedger, type PersonalEffect } from '@/domain/groupLedger';
import { newId } from '@/lib/id';
import { useSettings } from '@/lib/settings';
import { createGroupRepo, type GroupRepo } from './groupRepo';
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

const EMPTY_LEDGER: GroupLedger = { members: [], expenses: [], settlements: [] };
const groupRepo: GroupRepo | null = supabase ? createGroupRepo(supabase) : null;
export const ledgerKey = (userId: string) => ['ledger', userId] as const;

/** Repositorio de grupos compartidos (solo con cuenta). */
export const useGroupRepo = () => groupRepo;

/**
 * Datos compartidos de todos mis grupos. Se mantienen al día de tres formas:
 * tiempo real (cambios de otros miembros), al volver a la app y con un refresco periódico de respaldo.
 */
export function useGroupLedger() {
  const session = useAuth((s) => s.session);
  const userId = session?.user.id ?? null;
  const qc = useQueryClient();
  const enabled = !!groupRepo && !!userId;
  useEffect(() => {
    const sb = supabase;
    if (!sb || !userId) return;
    const refresh = () => { qc.invalidateQueries({ queryKey: ledgerKey(userId) }); qc.invalidateQueries({ queryKey: snapshotKey(userId) }); };
    const ch = sb.channel(`groups-${userId}`);
    for (const table of ['groups', 'group_members', 'group_expenses', 'group_expense_shares', 'group_settlements']) {
      ch.on('postgres_changes', { event: '*', schema: 'public', table }, refresh);
    }
    ch.subscribe();
    return () => { sb.removeChannel(ch); };
  }, [userId, qc]);
  return useQuery({
    queryKey: ledgerKey(userId ?? 'none'),
    queryFn: () => groupRepo!.loadLedger(),
    enabled,
    staleTime: 5_000,
    refetchInterval: 20_000,
    refetchOnWindowFocus: true,
  });
}

/**
 * Aplica en mis cuentas los efectos personales de un gasto o liquidación de grupo.
 * Reutiliza el movimiento existente con la misma referencia (no duplica) y borra los que ya no correspondan.
 */
export function useSyncPersonalEffects() {
  const r = useRepo();
  const qc = useQueryClient();
  return async (refPrefix: string, effects: PersonalEffect[], accountId: string | null, description: string) => {
    if (!r) return;
    const key = snapshotKey(r.userId);
    const snap = qc.getQueryData<Snapshot>(key) ?? (await r.repo.load());
    const existing = snap.transactions.filter((t) => t.groupRef && (t.groupRef === refPrefix || t.groupRef.startsWith(refPrefix)));
    const keep = new Set(accountId ? effects.map((e) => e.ref) : []);
    for (const t of existing) if (!keep.has(t.groupRef!)) await r.repo.deleteTransaction(t.id);
    if (accountId) {
      for (const e of effects) {
        const prev = existing.find((t) => t.groupRef === e.ref);
        await r.repo.upsertTransaction({
          id: prev?.id ?? newId(), kind: e.kind, amountMinor: e.amountMinor, occurredOn: e.occurredOn, accountId: prev?.accountId ?? accountId, toAccountId: null,
          categoryId: prev?.categoryId ?? null, description, notes: '', isRecurring: false, groupRef: e.ref, createdAt: prev?.createdAt ?? new Date().toISOString(),
        });
      }
    }
    await qc.invalidateQueries({ queryKey: key });
  };
}

/** Todas las cifras derivadas del snapshot, calculadas con funciones deterministas del dominio. */
export function useFinance() {
  const { data } = useSnapshot();
  const ledgerQ = useGroupLedger();
  const session = useAuth((s) => s.session);
  const reserveDays = useSettings((s) => s.reserveDays);
  const ledger = ledgerQ.data ?? EMPTY_LEDGER;
  const me = session?.user.id ?? 'local';
  return useMemo(() => {
    if (!data) return null;
    const accounts = data.accounts.filter((a) => !a.archived);
    const balances = accountBalances(data.accounts, data.transactions);
    const today = todayISO();
    // Cada grupo se salda por separado: lo que me deben en uno no compensa lo que debo en otro.
    const byGroup = data.groups.map((g) => ({
      expenses: ledger.expenses.filter((e) => e.groupId === g.id),
      settlements: ledger.settlements.filter((x) => x.groupId === g.id),
    }));
    const position = myPosition(byGroup, me);
    const availability = availableToSpend({
      accounts: data.accounts, balances,
      reservedPaymentsMinor: reservedForPayments(data.payments, today, reserveDays),
      protectedSavingsMinor: protectedSavings(data.goals),
      reservedDebtsMinor: position.iOwe,
      owedToUserMinor: position.owedToMe,
    });
    const month = monthKey(today);
    return {
      ...data,
      activeAccounts: accounts,
      categories: data.categories.filter((c) => !c.archived),
      balances,
      availability,
      today,
      upcomingPayments: upcoming(data.payments, today, reserveDays),
      reserveDays,
      ledger,
      me,
      position,
      month,
      thisMonth: monthSummary(data.transactions, month),
    };
  }, [data, ledger, me, reserveDays]);
}
