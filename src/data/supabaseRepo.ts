import type { SupabaseClient } from '@supabase/supabase-js';
import type { Account, Category, Profile, Snapshot, Transaction } from '@/domain/types';
import type { Repository } from './repository';

const fail = (error: { message: string } | null) => {
  if (error) throw new Error(error.message);
};

/** user_id lo rellena la base de datos (default auth.uid()); nunca se envía desde el cliente. */
export function createSupabaseRepo(client: SupabaseClient, userId: string): Repository {
  return {
    async load(): Promise<Snapshot> {
      const [p, a, c, t] = await Promise.all([
        client.from('profiles').select('*').eq('id', userId).single(),
        client.from('accounts').select('*').order('created_at'),
        client.from('categories').select('*').order('created_at'),
        client.from('transactions').select('*').order('occurred_on', { ascending: false }).order('created_at', { ascending: false }),
      ]);
      fail(p.error); fail(a.error); fail(c.error); fail(t.error);
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
        description: r.description ?? '', notes: r.notes ?? '', isRecurring: r.is_recurring, createdAt: r.created_at,
      }));
      return { profile, accounts, categories, transactions };
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
            is_recurring: t.isRecurring,
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

    async deleteEverything() {
      fail((await client.rpc('delete_my_account')).error);
      await client.auth.signOut();
    },
  };
}
