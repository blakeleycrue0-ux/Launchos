import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { categoryLabel } from '@/features/labels';
import { useDeletePayment, useFinance, useSavePayment } from '@/data/hooks';
import { addDays, fromISODate } from '@/domain/dates';
import { currencySymbol, minorToInput, parseAmount } from '@/domain/money';
import type { Frequency } from '@/domain/types';
import { useT, type TKey } from '@/i18n';
import { haptic } from '@/lib/haptics';
import { newId } from '@/lib/id';
import { confirm } from '@/lib/platform';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/ui/Button';
import { Chip } from '@/ui/Chip';
import { DateField } from '@/ui/DateField';
import { Field } from '@/ui/Field';
import { Header, IconButton } from '@/ui/Header';
import { Screen } from '@/ui/Screen';
import { Segmented } from '@/ui/Segmented';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';
import { Toggle } from '@/ui/Toggle';

export default function PaymentModal() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const f = useFinance();
  const { t, intl, decimalSep } = useT();
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const save = useSavePayment();
  const del = useDeletePayment();
  const existing = f?.payments.find((p) => p.id === id);
  const cur = f?.profile.currency ?? 'EUR';
  const [name, setName] = useState(existing?.name ?? '');
  const [amount, setAmount] = useState(existing ? minorToInput(existing.amountMinor, cur, decimalSep) : '');
  const [frequency, setFrequency] = useState<Frequency>(existing?.frequency ?? 'monthly');
  const [date, setDate] = useState<string | null>(existing?.nextDue ?? addDays(f?.today ?? '2026-01-01', 1));
  const [accountId, setAccountId] = useState(existing?.accountId ?? f?.activeAccounts[0]?.id ?? '');
  const [categoryId, setCategoryId] = useState<string | null>(existing ? existing.categoryId : f?.categories.find((x) => x.key === 'subscriptions')?.id ?? null);
  const [active, setActive] = useState(existing?.active ?? true);
  const [sheet, setSheet] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!f) return null;

  const submit = () => {
    const a = parseAmount(amount, cur);
    const due = date;
    if (!name.trim()) return setError(t('pay.errName'));
    if (!a || a <= 0) return setError(t('err.amount_required'));
    if (!due) return setError(t('pay.errDate'));
    if (!accountId) return setError(t('err.account_required'));
    haptic.success();
    // Si cambia la fecha, el día de referencia pasa a ser el de la nueva fecha.
    const anchorDay = existing && existing.nextDue === due ? existing.anchorDay : fromISODate(due).getDate();
    save.mutate({ id: existing?.id ?? newId(), name: name.trim(), amountMinor: a, frequency, nextDue: due, anchorDay, accountId, categoryId, active, createdAt: existing?.createdAt ?? new Date().toISOString() });
    router.back();
  };
  const remove = async () => {
    if (existing && (await confirm(t('pay.deleteTitle'), t('pay.deleteBody'), t('common.delete'), t('common.cancel')))) { del.mutate(existing.id); router.back(); }
  };
  const clear = () => setError(null);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen contentStyle={{ gap: 14 }}>
        <Header close backLabel={t('common.close')} title={existing ? t('pay.edit') : t('pay.new')}
          right={existing ? <IconButton icon="trash" label={t('common.delete')} onPress={remove} testID="payment-delete" /> : undefined} />
        <Field label={t('pay.name')} value={name} onChangeText={(v) => { setName(v); clear(); }} placeholder="Netflix" maxLength={40} testID="pay-name" autoFocus={!existing} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><Field label={`${t('add.amount')} (${currencySymbol(cur, intl)})`} value={amount} onChangeText={(v) => { setAmount(v); clear(); }} keyboardType="decimal-pad" placeholder="0" testID="pay-amount" /></View>
          <View style={{ flex: 1 }}><DateField label={t('pay.nextDue')} value={date} onChange={(v) => { setDate(v); clear(); }} testID="pay-date" /></View>
        </View>
        <View style={{ gap: 6 }}>
          <Text variant="caption" tone="soft" style={{ marginLeft: 4 }}>{t('pay.frequency')}</Text>
          <Segmented<Frequency> value={frequency} onChange={setFrequency} options={(['weekly', 'monthly', 'yearly'] as const).map((k) => ({ value: k, label: t(`pay.freq.${k}` as TKey) }))} />
        </View>
        <View style={{ gap: 6 }}>
          <Text variant="caption" tone="soft" style={{ marginLeft: 4 }}>{t('tx.category')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 20 }} style={{ marginHorizontal: -20 }} keyboardShouldPersistTaps="handled">
            {f.categories.map((cat) => <Chip key={cat.id} icon={cat.icon} label={categoryLabel(cat, t)} selected={cat.id === categoryId} onPress={() => setCategoryId(cat.id === categoryId ? null : cat.id)} />)}
          </ScrollView>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text tone="soft" style={{ flex: 1 }}>{t('add.account')}</Text>
          <Chip icon="wallet" label={f.accounts.find((a) => a.id === accountId)?.name ?? '—'} trailing="chevron-down" onPress={() => setSheet(true)} />
        </View>
        {existing ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 40 }}>
            <Text tone="soft" style={{ flex: 1 }}>{t('pay.active')}</Text>
            <Toggle value={active} onChange={setActive} label={t('pay.active')} />
          </View>
        ) : null}
        {error ? <Text variant="caption" accessibilityRole="alert">{error}</Text> : null}
        <Text variant="caption" tone="faint">{t('pay.noCharge')}</Text>
      </Screen>
      <View style={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 12, paddingTop: 6 }}>
        <Button label={t('common.save')} onPress={submit} testID="pay-save" />
      </View>
      <Sheet<string> visible={sheet} title={t('add.account')} value={accountId} onClose={() => setSheet(false)} onSelect={setAccountId}
        options={f.activeAccounts.map((a) => ({ value: a.id, label: a.name }))} />
    </KeyboardAvoidingView>
  );
}
