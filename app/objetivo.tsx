import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { dayLabel } from '@/features/labels';
import { useDeleteGoal, useFinance, useSaveGoal } from '@/data/hooks';
import { formatDisplayDate, parseDisplayDate } from '@/domain/dates';
import { canWithdraw, goalProgress } from '@/domain/goals';
import { currencySymbol, formatMoney, minorToInput, parseAmount } from '@/domain/money';
import { useT } from '@/i18n';
import { haptic } from '@/lib/haptics';
import { newId } from '@/lib/id';
import { confirm } from '@/lib/platform';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Field } from '@/ui/Field';
import { Header, IconButton } from '@/ui/Header';
import { ProgressBar } from '@/ui/ProgressBar';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

export default function GoalModal() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const f = useFinance();
  const { t, intl, decimalSep } = useT();
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const save = useSaveGoal();
  const del = useDeleteGoal();
  const existing = f?.goals.find((g) => g.id === id);
  const cur = f?.profile.currency ?? 'EUR';
  const [name, setName] = useState(existing?.name ?? '');
  const [target, setTarget] = useState(existing ? minorToInput(existing.targetMinor, cur, decimalSep) : '');
  const [date, setDate] = useState(existing?.dueDate ? formatDisplayDate(existing.dueDate) : '');
  const [move, setMove] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  if (!f) return null;
  const money = (v: number, sign = false) => formatMoney(v, cur, intl, { sign });
  const p = existing ? goalProgress(existing, f.today) : null;

  const submit = () => {
    const tg = parseAmount(target, cur);
    const due = date.trim() ? parseDisplayDate(date) : null;
    if (!name.trim()) return setError(t('goal.errName'));
    if (!tg || tg <= 0) return setError(t('err.amount_required'));
    if (date.trim() && !due) return setError(t('pay.errDate'));
    haptic.success();
    save.mutate({ id: existing?.id ?? newId(), name: name.trim(), targetMinor: tg, dueDate: due, contributions: existing?.contributions ?? [], createdAt: existing?.createdAt ?? new Date().toISOString() });
    router.back();
  };
  const contribute = (sign: 1 | -1) => {
    if (!existing) return;
    const a = parseAmount(move, cur);
    if (!a || a <= 0) return setMoveError(t('err.amount_required'));
    if (sign === -1 && !canWithdraw(existing, a)) return setMoveError(t('goal.errWithdraw'));
    // Reservar no puede dejar el disponible en negativo: sería apartar dinero que no hay.
    if (sign === 1 && a > f.availability.available) return setMoveError(t('goal.errNoMoney', { amount: money(Math.max(0, f.availability.available)) }));
    haptic.success();
    save.mutate({ ...existing, contributions: [...existing.contributions, { id: newId(), amountMinor: sign * a, on: f.today }] });
    setMove(''); setMoveError(null);
  };
  const remove = async () => {
    if (existing && (await confirm(t('goal.deleteTitle'), t('goal.deleteBody'), t('common.delete'), t('common.cancel')))) { del.mutate(existing.id); router.back(); }
  };
  const history = existing ? existing.contributions.slice().reverse().slice(0, 8) : [];

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen contentStyle={{ gap: 14 }}>
        <Header close backLabel={t('common.close')} title={existing ? existing.name : t('goal.new')}
          right={existing ? <IconButton icon="trash" label={t('common.delete')} onPress={remove} testID="goal-delete" /> : undefined} />
        {existing && p ? (
          <Card style={{ padding: 14, gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <Text variant="title" testID="goal-saved">{money(p.saved)}</Text>
              <Text tone="soft">{t('goal.ofTarget', { target: money(existing.targetMinor) })}</Text>
            </View>
            <ProgressBar value={p.pct} height={8} />
            <Text variant="caption" tone="soft">
              {p.done ? t('goal.done') : p.perMonth && p.monthsLeft ? t('goal.plan', { remaining: money(p.remaining), amount: money(p.perMonth), months: p.monthsLeft }) : t('goal.remaining', { amount: money(p.remaining) })}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
              <View style={{ flex: 1 }}><Field label={`${t('add.amount')} (${currencySymbol(cur, intl)})`} value={move} onChangeText={(v) => { setMove(v); setMoveError(null); }} keyboardType="decimal-pad" placeholder="0" testID="goal-move" /></View>
              <View style={{ height: 48, justifyContent: 'center' }}><Button compact label={t('goal.add')} onPress={() => contribute(1)} testID="goal-add" /></View>
              <View style={{ height: 48, justifyContent: 'center' }}><Button compact variant="secondary" label={t('goal.withdraw')} onPress={() => contribute(-1)} testID="goal-withdraw" /></View>
            </View>
            {moveError ? <Text variant="caption" accessibilityRole="alert" testID="goal-error" style={{ color: c.accent }}>{moveError}</Text> : null}
            {history.length ? (
              <View>
                {history.map((h, i) => (
                  <View key={h.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: i === 0 ? StyleSheet.hairlineWidth : 0, borderTopColor: c.line }}>
                    <Text variant="caption" tone="soft">{dayLabel(h.on, t, intl)}</Text>
                    <Text variant="caption" style={{ fontWeight: '700' }}>{money(h.amountMinor, true)}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </Card>
        ) : null}
        <Field label={t('goal.name')} value={name} onChangeText={(v) => { setName(v); setError(null); }} placeholder={t('goal.namePlaceholder')} maxLength={40} testID="goal-name" autoFocus={!existing} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><Field label={`${t('goal.target')} (${currencySymbol(cur, intl)})`} value={target} onChangeText={(v) => { setTarget(v); setError(null); }} keyboardType="decimal-pad" placeholder="0" testID="goal-target" /></View>
          <View style={{ flex: 1 }}><Field label={t('goal.date')} value={date} onChangeText={(v) => { setDate(v); setError(null); }} keyboardType="numbers-and-punctuation" placeholder="DD/MM/AAAA" maxLength={10} testID="goal-date" /></View>
        </View>
        {error ? <Text variant="caption" accessibilityRole="alert">{error}</Text> : null}
        <Text variant="caption" tone="faint">{t('goal.note')}</Text>
      </Screen>
      <View style={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 12, paddingTop: 6 }}>
        <Button label={existing ? t('common.save') : t('goal.create')} onPress={submit} testID="goal-save" />
      </View>
    </KeyboardAvoidingView>
  );
}
