import { router } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StepHeader } from '@/features/StepHeader';
import { useSaveAccount, useSnapshot, useUpdateProfile } from '@/data/hooks';
import { SUPPORTED_CURRENCIES, currencySymbol, parseAmount } from '@/domain/money';
import { useT } from '@/i18n';
import { newId } from '@/lib/id';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/ui/Button';
import { Chip } from '@/ui/Chip';
import { Field } from '@/ui/Field';
import { PressableScale } from '@/ui/PressableScale';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

export default function Setup() {
  const { t, intl } = useT();
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const { data } = useSnapshot();
  const update = useUpdateProfile();
  const saveAccount = useSaveAccount();
  const [name, setName] = useState(data?.profile.displayName ?? '');
  const [currency, setCurrency] = useState(data?.profile.currency ?? 'EUR');
  const [balance, setBalance] = useState('');
  const [income, setIncome] = useState('');
  const [error, setError] = useState<string | null>(null);

  const finish = (skip: boolean) => {
    const bal = skip || !balance.trim() ? 0 : parseAmount(balance, currency);
    const inc = skip || !income.trim() ? 0 : parseAmount(income, currency);
    if (bal === null || inc === null || inc < 0) return setError(t('setup.errAmount'));
    // Siempre se crea una cuenta inicial para poder empezar a registrar; el saldo es opcional.
    if (!data?.accounts.length) {
      saveAccount.mutate({ id: newId(), name: t('setup.mainAccount'), kind: 'bank', initialBalanceMinor: bal, currency, archived: false, createdAt: new Date().toISOString() });
    }
    update.mutate({ displayName: skip ? data?.profile.displayName ?? '' : name.trim(), currency, monthlyIncomeMinor: inc, onboardingStep: 3 });
    router.push('/ready');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen contentStyle={{ gap: 18 }}>
        <StepHeader step={2} />
        <View style={{ gap: 8, marginTop: 8 }}>
          <Text variant="title">{t('setup.title')}</Text>
          <Text tone="soft">{t('setup.sub')}</Text>
        </View>
        <Field label={t('setup.name')} value={name} onChangeText={setName} autoComplete="given-name" textContentType="givenName" maxLength={40} testID="setup-name" />
        <View style={{ gap: 6 }}>
          <Text variant="caption" tone="soft" style={{ marginLeft: 4 }}>{t('setup.currency')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {SUPPORTED_CURRENCIES.map((cur) => (
              <Chip key={cur} label={`${cur} ${currencySymbol(cur, intl)}`} selected={cur === currency} onPress={() => setCurrency(cur)} />
            ))}
          </ScrollView>
        </View>
        <Field label={`${t('setup.balance')} (${currencySymbol(currency, intl)})`} value={balance} onChangeText={(v) => { setBalance(v); setError(null); }} keyboardType="numbers-and-punctuation" placeholder="0" testID="setup-balance" />
        <Field label={`${t('setup.income')} (${currencySymbol(currency, intl)})`} value={income} onChangeText={(v) => { setIncome(v); setError(null); }} keyboardType="decimal-pad" placeholder="0" testID="setup-income" />
        <Text variant="caption" tone="faint">{t('setup.later')}</Text>
        {error ? <Text variant="caption" tone="soft" accessibilityRole="alert">{error}</Text> : null}
      </Screen>
      <View style={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 12, paddingTop: 8, backgroundColor: c.bg }}>
        <Button label={t('common.continue')} onPress={() => finish(false)} testID="setup-next" />
        <PressableScale onPress={() => finish(true)} style={{ alignSelf: 'center', padding: 10 }}><Text tone="soft">{t('setup.skip')}</Text></PressableScale>
      </View>
    </KeyboardAvoidingView>
  );
}
