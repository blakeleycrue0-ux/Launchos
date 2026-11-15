import type { SupabaseClient } from '@supabase/supabase-js';
import type { Account, Category, Goal, Group, Profile, RecurringPayment, Snapshot, Transaction } from '@/domain/types';
import type { Repository } from './repository';

const fail = (error: { message: string } | null) => {
  if (error) throw new Error(error.message);
};

/** user_id lo rellena la base de datos (default auth.uid()); nunca se envía desde el cliente. */
export function createSupabaseRepo(client: SupabaseClient, userId: string): Repository {
  return {
    async load(): Promise<Snapshot> {
      const [p, a, c, t, g, rp, go] = await Promise.all([
        client.from('profiles').select('*').eq('id', userId).single(),
        client.from('accounts').select('*').order('created_at'),
        client.from('categories').select('*').order('created_at'),
        client.from('transactions').select('*').order('occurred_on', { ascending: false }).order('created_at', { ascending: false }),
        client.from('groups').select('*').order('created_at'),
        client.from('recurring_payments').select('*').order('next_due'),
        client.from('goals').select('*').order('created_at'),
      ]);
      fail(p.error); fail(a.error); fail(c.error); fail(t.error); fail(g.error); fail(rp.error); fail(go.error);
      const pr = p.data!;
      const profile: Profile = {
        id: pr.id,
        displayName: pr.display_name ?? '',
        currency: pr.currency,
        monthlyIncomeMinor: Number(pr.monthly_income_minor),
        intents: pr.intents ?? [],
        onboardingStep: pr.onboarding_step,
        onboardingDone: pr.onboarding_done,
      };
      const accounts: Account[] = (a.data ?? []).map((r) => ({
        id: r.id, name: r.name, kind: r.kind, initialBalanceMinor: Number(r.initial_balance_minor),
        currency: r.currency, archived: r.archived, createdAt: r.created_at,
      }));
      const categories: Category[] = (c.data ?? []).map((r) => ({
        id: r.id, key: r.key, name: r.name, icon: r.icon, archived: r.archived,
      }));
      const transactions: Transaction[] = (t.data ?? []).map((r) => ({
        id: r.id, kind: r.kind, amountMinor: Number(r.amount_minor), occurredOn: r.occurred_on,
        accountId: r.account_id, toAccountId: r.to_account_id, categoryId: r.category_id,
        description: r.description ?? '', notes: r.notes ?? '', isRecurring: r.is_recurring, recurringPaymentId: r.recurring_payment_id, groupRef: r.group_ref, createdAt: r.created_at,
      }));
      const groups: Group[] = (g.data ?? []).map((r) => ({
        id: r.id, name: r.name, kind: r.kind, photoPreset: r.photo_preset, photoUri: null, currency: r.currency,
        budgetMinor: Number(r.budget_minor), createdAt: r.created_at,
      }));
      const payments: RecurringPayment[] = (rp.data ?? []).map((r) => ({
        id: r.id, name: r.name, amountMinor: Number(r.amount_minor), frequency: r.frequency, nextDue: r.next_due, anchorDay: r.anchor_day,
        accountId: r.account_id, categoryId: r.category_id, active: r.active, createdAt: r.created_at,
      }));
      const goals: Goal[] = (go.data ?? []).map((r) => ({
        id: r.id, name: r.name, targetMinor: Number(r.target_minor), dueDate: r.due_date, contributions: r.contributions ?? [], createdAt: r.created_at,
      }));
      return { profile, accounts, categories, transactions, groups, payments, goals };
    },

    async updateProfile(patch) {
      const row: Record<string, unknown> = {};
      if (patch.displayName !== undefined) row.display_name = patch.displayName;
      if (patch.currency !== undefined) row.currency = patch.currency;
      if (patch.monthlyIncomeMinor !== undefined) row.monthly_income_minor = patch.monthlyIncomeMinor;
      if (patch.intents !== undefined) row.intents = patch.intents;
      if (patch.onboardingStep !== undefined) row.onboarding_step = patch.onboardingStep;
      if (patch.onboardingDone !== undefined) row.onboarding_done = patch.onboardingDone;
      fail((await client.from('profiles').update(row).eq('id', userId)).error);
    },

    async upsertAccount(a) {
      fail(
        (await client.from('accounts').upsert(
          { id: a.id, name: a.name, kind: a.kind, initial_balance_minor: a.initialBalanceMinor, currency: a.currency, archived: a.archived },
          { onConflict: 'id' },
        )).error,
      );
    },

    async upsertTransaction(t) {
      fail(
        (await client.from('transactions').upsert(
          {
            id: t.id, kind: t.kind, amount_minor: t.amountMinor, occurred_on: t.occurredOn, account_id: t.accountId,
            to_account_id: t.toAccountId, category_id: t.categoryId, description: t.description, notes: t.notes,
            is_recurring: t.isRecurring, recurring_payment_id: t.recurringPaymentId ?? null, group_ref: t.groupRef ?? null,
          },
          { onConflict: 'id' },
        )).error,
      );
    },

    async deleteTransaction(id) {
      fail((await client.from('transactions').delete().eq('id', id)).error);
    },

    async upsertCategory(c) {
      fail(
        (await client.from('categories').upsert(
          { id: c.id, key: c.key, name: c.name, icon: c.icon, archived: c.archived },
          { onConflict: 'id' },
        )).error,
      );
    },

    async upsertGroup(g) {
      // Las fotos subidas por el usuario necesitan Storage (fase de sincronización): aquí solo viaja la predeterminada.
      fail(
        (await client.from('groups').upsert(
          { id: g.id, name: g.name, kind: g.kind, photo_preset: g.photoPreset, currency: g.currency, budget_minor: g.budgetMinor },
          { onConflict: 'id' },
        )).error,
      );
    },

    async deleteGroup(id) {
      fail((await client.from('groups').delete().eq('id', id)).error);
    },

    async upsertPayment(p) {
      fail(
        (await client.from('recurring_payments').upsert(
          { id: p.id, name: p.name, amount_minor: p.amountMinor, frequency: p.frequency, next_due: p.nextDue, anchor_day: p.anchorDay,
            account_id: p.accountId, category_id: p.categoryId, active: p.active },
          { onConflict: 'id' },
        )).error,
      );
    },
    async deletePayment(id) {
      fail((await client.from('recurring_payments').delete().eq('id', id)).error);
    },
    async upsertGoal(g) {
      fail(
        (await client.from('goals').upsert(
          { id: g.id, name: g.name, target_minor: g.targetMinor, due_date: g.dueDate, contributions: g.contributions },
          { onConflict: 'id' },
        )).error,
      );
    },
    async deleteGoal(id) {
      fail((await client.from('goals').delete().eq('id', id)).error);
    },

    async deleteEverything() {
      fail((await client.rpc('delete_my_account')).error);
      await client.auth.signOut();
    },
  };
}
