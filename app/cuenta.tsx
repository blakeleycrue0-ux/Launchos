import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { accountKindLabel } from '@/features/labels';
import { useFinance, useSaveAccount } from '@/data/hooks';
import { minorToInput, parseAmount, currencySymbol } from '@/domain/money';
import type { AccountKind } from '@/domain/types';
import { useT } from '@/i18n';
import { haptic } from '@/lib/haptics';
import { newId } from '@/lib/id';
import { confirm } from '@/lib/platform';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/ui/Button';
import { Chip } from '@/ui/Chip';
import { Field } from '@/ui/Field';
import { Header } from '@/ui/Header';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

const KINDS: AccountKind[] = ['bank', 'cash', 'savings', 'other'];

export default function AccountModal() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const f = useFinance();
  const { t, intl, decimalSep } = useT();
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const save = useSaveAccount();
  const acc = f?.accounts.find((a) => a.id === id);
  const [name, setName] = useState(acc?.name ?? '');
  const [kind, setKind] = useState<AccountKind>(acc?.kind ?? 'bank');
  const [balance, setBalance] = useState(acc ? minorToInput(acc.initialBalanceMinor, acc.currency, decimalSep) : '');
  const [error, setError] = useState<string | null>(null);
  if (!f) return null;
  const cur = acc?.currency ?? f.profile.currency;

  const submit = () => {
    const bal = balance.trim() ? parseAmount(balance, cur) : 0;
    if (!name.trim()) return setError(t('acc.errName'));
    if (bal === null) return setError(t('setup.errAmount'));
    haptic.success();
    save.mutate({ id: acc?.id ?? newId(), name: name.trim(), kind, initialBalanceMinor: bal, currency: cur, archived: acc?.archived ?? false, createdAt: acc?.createdAt ?? new Date().toISOString() });
    router.back();
  };
  const toggleArchive = async () => {
    if (!acc) return;
    if (!acc.archived && f.activeAccounts.length <= 1) return setError(t('acc.errLast'));
    if (acc.archived || (await confirm(t('acc.archiveTitle'), t('acc.archiveBody'), t('acc.archive'), t('common.cancel'), false))) {
      save.mutate({ ...acc, archived: !acc.archived });
      router.back();
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen contentStyle={{ gap: 14 }}>
        <Header close backLabel={t('common.close')} title={acc ? t('acc.edit') : t('acc.new')} />
        <Field label={t('acc.name')} value={name} onChangeText={(v) => { setName(v); setError(null); }} maxLength={40} testID="acc-name" autoFocus={!acc} />
        <View style={{ gap: 8 }}>
          <Text variant="caption" tone="soft" style={{ marginLeft: 4 }}>{t('acc.kind')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {KINDS.map((k) => <Chip key={k} label={accountKindLabel(k, t)} selected={k === kind} onPress={() => setKind(k)} testID={`kind-${k}`} />)}
          </View>
          {kind === 'savings' ? <Text variant="caption" tone="soft" style={{ marginLeft: 4 }}>{t('acc.savingsHint')}</Text> : null}
        </View>
        <Field label={`${t('acc.initial')} (${currencySymbol(cur, intl)})`} value={balance} onChangeText={(v) => { setBalance(v); setError(null); }} keyboardType="numbers-and-punctuation" placeholder="0" testID="acc-balance" />
        {error ? <Text variant="caption" accessibilityRole="alert">{error}</Text> : null}
      </Screen>
      <View style={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 12, gap: 6 }}>
        <Button label={t('common.save')} onPress={submit} testID="acc-save" />
        {acc && !acc.archived ? <Button variant="secondary" icon="scale" label={t('acc.adjust')} onPress={() => router.replace({ pathname: '/movimiento/nuevo', params: { kind: 'adjustment', account: acc.id } })} testID="acc-adjust" /> : null}
        {acc ? <Button variant="ghost" label={acc.archived ? t('acc.restore') : t('acc.archive')} onPress={toggleArchive} /> : null}
      </View>
    </KeyboardAvoidingView>
  );
}
