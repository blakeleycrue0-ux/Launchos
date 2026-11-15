import AsyncStorage from '@react-native-async-storage/async-storage';
import { upsertById } from '@/domain/validation';
import type { Snapshot } from '@/domain/types';
import { seedCategories } from './defaults';
import { EMPTY_PROFILE, type Repository } from './repository';

const KEY = 'mio.local.v1';

async function read(): Promise<Snapshot> {
  const raw = await AsyncStorage.getItem(KEY);
  if (raw) {
    const s = JSON.parse(raw) as Snapshot;
    return { ...s, groups: s.groups ?? [] }; // datos guardados antes de existir los grupos
  }
  const fresh: Snapshot = { profile: EMPTY_PROFILE('local'), accounts: [], categories: seedCategories(), transactions: [], groups: [] };
  await AsyncStorage.setItem(KEY, JSON.stringify(fresh));
  return fresh;
}

/** Repositorio local. Las escrituras se serializan para no pisarse entre sí. */
export function createLocalRepo(): Repository {
  let chain: Promise<unknown> = Promise.resolve();
  const mutate = (fn: (s: Snapshot) => Snapshot): Promise<void> => {
    const run = chain.then(async () => {
      const next = fn(await read());
      await AsyncStorage.setItem(KEY, JSON.stringify(next));
    });
    chain = run.catch(() => undefined);
    return run;
  };
  return {
    load: () => chain.then(read),
    updateProfile: (patch) => mutate((s) => ({ ...s, profile: { ...s.profile, ...patch } })),
    upsertAccount: (a) => mutate((s) => ({ ...s, accounts: upsertById(s.accounts, a) })),
    upsertTransaction: (t) => mutate((s) => ({ ...s, transactions: upsertById(s.transactions, t) })),
    deleteTransaction: (id) => mutate((s) => ({ ...s, transactions: s.transactions.filter((t) => t.id !== id) })),
    upsertCategory: (c) => mutate((s) => ({ ...s, categories: upsertById(s.categories, c) })),
    upsertGroup: (g) => mutate((s) => ({ ...s, groups: upsertById(s.groups, g) })),
    deleteGroup: (id) => mutate((s) => ({ ...s, groups: s.groups.filter((g) => g.id !== id) })),
    deleteEverything: async () => {
      await chain;
      await AsyncStorage.removeItem(KEY);
    },
  };
}
