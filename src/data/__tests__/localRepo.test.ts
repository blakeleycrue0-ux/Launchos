jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
import { createLocalRepo } from '../localRepo';
import type { Transaction } from '@/domain/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const acct = { id: 'a1', name: 'Banco', kind: 'bank' as const, initialBalanceMinor: 1000, currency: 'EUR', archived: false, createdAt: '2026-01-01' };
const tx = (id: string, amountMinor = 100): Transaction => ({
  id, kind: 'expense', amountMinor, occurredOn: '2026-11-10', accountId: 'a1', toAccountId: null, categoryId: null,
  description: '', notes: '', isRecurring: false, createdAt: '2026-11-10',
});

beforeEach(() => AsyncStorage.clear());

describe('localRepo', () => {
  it('arranca con perfil vacío y las 10 categorías iniciales', async () => {
    const s = await createLocalRepo().load();
    expect(s.profile.onboardingDone).toBe(false);
    expect(s.categories).toHaveLength(10);
    expect(s.accounts).toEqual([]);
  });
  it('guarda el progreso del onboarding', async () => {
    const repo = createLocalRepo();
    await repo.updateProfile({ onboardingStep: 2, intents: ['saving'] });
    const again = await createLocalRepo().load(); // «reabrir la app»
    expect(again.profile.onboardingStep).toBe(2);
    expect(again.profile.intents).toEqual(['saving']);
  });
  it('reintentos de la misma operación no duplican (pérdida de conexión)', async () => {
    const repo = createLocalRepo();
    await repo.upsertAccount(acct);
    await Promise.all([repo.upsertTransaction(tx('t1')), repo.upsertTransaction(tx('t1')), repo.upsertTransaction(tx('t1'))]);
    expect((await repo.load()).transactions).toHaveLength(1);
  });
  it('escrituras concurrentes no se pisan', async () => {
    const repo = createLocalRepo();
    await Promise.all(Array.from({ length: 25 }, (_, i) => repo.upsertTransaction(tx(`t${i}`))));
    expect((await repo.load()).transactions).toHaveLength(25);
  });
  it('editar y borrar', async () => {
    const repo = createLocalRepo();
    await repo.upsertTransaction(tx('t1', 100));
    await repo.upsertTransaction(tx('t1', 250));
    expect((await repo.load()).transactions[0].amountMinor).toBe(250);
    await repo.deleteTransaction('t1');
    expect((await repo.load()).transactions).toEqual([]);
  });
  it('grupos: crear, editar sin duplicar y borrar', async () => {
    const repo = createLocalRepo();
    const g = { id: 'g1', name: 'Ibiza 2027', kind: 'travel' as const, photoPreset: null, photoUri: null, currency: 'EUR', budgetMinor: 120000, createdAt: '2026-11-14' };
    await repo.upsertGroup(g);
    await repo.upsertGroup({ ...g, name: 'Ibiza' });
    expect((await repo.load()).groups).toEqual([{ ...g, name: 'Ibiza' }]);
    await repo.deleteGroup('g1');
    expect((await repo.load()).groups).toEqual([]);
  });
  it('lee datos guardados antes de existir los grupos', async () => {
    await AsyncStorage.setItem('mio.local.v1', JSON.stringify({ profile: { id: 'local' }, accounts: [], categories: [], transactions: [] }));
    const old = await createLocalRepo().load();
    expect([old.groups, old.payments, old.goals]).toEqual([[], [], []]);
  });
  it('borrar todo devuelve un espacio nuevo', async () => {
    const repo = createLocalRepo();
    await repo.upsertAccount(acct);
    await repo.updateProfile({ onboardingDone: true });
    await repo.deleteEverything();
    const s = await repo.load();
    expect(s.accounts).toEqual([]);
    expect(s.profile.onboardingDone).toBe(false);
  });
});
