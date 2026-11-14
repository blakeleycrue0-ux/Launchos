import type { Account, Category, Profile, Snapshot, Transaction } from '@/domain/types';

/**
 * Contrato de acceso a datos. Dos implementaciones:
 *  - localRepo: datos en el dispositivo (modo sin cuenta).
 *  - supabaseRepo: PostgreSQL con RLS (modo con cuenta).
 * Todas las operaciones de escritura son idempotentes por `id` (el cliente genera el UUID).
 */
export interface Repository {
  load(): Promise<Snapshot>;
  updateProfile(patch: Partial<Omit<Profile, 'id'>>): Promise<void>;
  upsertAccount(account: Account): Promise<void>;
  upsertTransaction(tx: Transaction): Promise<void>;
  deleteTransaction(id: string): Promise<void>;
  upsertCategory(category: Category): Promise<void>;
  /** Borra todos los datos del usuario (y la cuenta, en modo Supabase). */
  deleteEverything(): Promise<void>;
}

export const EMPTY_PROFILE = (id: string): Profile => ({
  id,
  displayName: '',
  currency: 'EUR',
  monthlyIncomeMinor: 0,
  intents: [],
  onboardingStep: 0,
  onboardingDone: false,
});
