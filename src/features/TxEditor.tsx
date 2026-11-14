import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDeleteTransaction, useFinance, useSaveTransaction } from '@/data/hooks';
import { adjustmentDelta, effectOnAccount } from '@/domain/balance';
import { addDays, fromISODate, todayISO } from '@/domain/dates';
import { currencyExponent, currencySymbol, formatMoney } from '@/domain/money';
import { displayInput, inputToMinor, minorToEditText, pressKey, type NumpadKey } from '@/domain/amountInput';
import type { Transaction, TxKind } from '@/domain/types';
import { validateTransaction } from '@/domain/validation';
import { useT, type TKey } from '@/i18n';
import { haptic } from '@/lib/haptics';
import { newId } from '@/lib/id';
import { confirm } from '@/lib/platform';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/ui/Button';
import { Chip } from '@/ui/Chip';
import { Field } from '@/ui/Field';
import { Icon } from '@/ui/Icon';
import { Numpad } from '@/ui/Numpad';
import { PressableScale } from '@/ui/PressableScale';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';
import { categoryLabel, dayLabel } from './labels';

const KINDS: TxKind[] = ['expense', 'income', 'transfer', 'refund', 'adjustment'];

/** Alta y edición de movimientos: importe → categoría → guardar. */
export function TxEditor({ id }: { id?: string }) {
  const f = useFinance();
  const params = useLocalSearchParams<{ kind?: string }>();
  const { t, intl, decimalSep } = useT();
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const save = useSaveTransaction();
  const del = useDeleteTransaction();
  const editing = useMemo(() => (id && f ? f.transactions.find((x) => x.id === id) : undefined), [id, f]);

  const cur = f?.profile.currency ?? 'EUR';
  const exp = currencyExponent(cur);
  const firstAccount = f?.activeAccounts[0]?.id ?? '';
  const initialKind = (editing?.kind ?? (KINDS.includes(params.kind as TxKind) ? (params.kind as TxKind) : 'expense')) as TxKind;

  const [kind, setKind] = useState<TxKind>(initialKind);
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState(editing?.accountId ?? firstAccount);
  const [toAccountId, setToAccountId] = useState<string | null>(editing?.toAccountId ?? null);
  const [categoryId, setCategoryId] = useState<string | null>(editing?.categoryId ?? null);
  const [date, setDate] = useState(editing?.occurredOn ?? todayISO());
  const [description, setDescription] = useState(editing?.description ?? '');
  const [notes, setNotes] = useState(editing?.notes ?? '');
  const [recurring, setRecurring] = useState(editing?.isRecurring ?? false);
  const [more, setMore] = useState(false);
  const [sheet, setSheet] = useState<'from' | 'to' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Datos de edición: se vuelcan una sola vez cuando el movimiento está disponible.
  if (editing && !loaded && f) {
    setLoaded(true);
    const bal = f.balances[editing.accountId] ?? 0;
    setAmount(minorToEditText(editing.kind === 'adjustment' ? bal : editing.amountMinor, exp));
    if (editing.notes) setMore(true);
  }
  if (!f) return null;
  if (id && !editing) { setTimeout(() => router.back(), 0); return null; }

  const isAdjust = kind === 'adjustment';
  const isTransfer = kind === 'transfer';
  const accounts = f.activeAccounts;
  const accName = (x: string | null) => f.accounts.find((a) => a.id === x)?.name ?? '—';
  const small = height < 700;

  const onKey = (k: NumpadKey) => { setError(null); setAmount((a) => pressKey(a, k, exp)); };
  const shiftDate = (d: number) => { haptic.select(); setDate((x) => addDays(x, d)); };

  // En un ajuste el usuario escribe el saldo REAL; se registra la diferencia.
  const baseBalance = (f.balances[accountId] ?? 0) - (editing ? effectOnAccount(editing, accountId) : 0);
  const typedMinor = inputToMinor(amount, exp);
  const amountMinor = isAdjust ? adjustmentDelta(baseBalance, typedMinor) : typedMinor;
  const canSave = amount !== '' && (isAdjust ? amountMinor !== 0 : typedMinor > 0) && !!accountId;

  const doSave = () => {
    if (!canSave) return;
    const toId = isTransfer ? toAccountId ?? accounts.find((a) => a.id !== accountId)?.id ?? null : null;
    const tx: Transaction = {
      id: editing?.id ?? newId(), kind, amountMinor, occurredOn: date, accountId, toAccountId: toId,
      categoryId: isTransfer || isAdjust ? null : categoryId, description: description.trim(), notes: notes.trim(),
      isRecurring: recurring && !isTransfer && !isAdjust, createdAt: editing?.createdAt ?? new Date().toISOString(),
    };
    const errs = validateTransaction(tx, f.accounts);
    if (errs.length) { haptic.warn(); setError(t(`err.${errs[0]}` as TKey)); return; }
    haptic.success();
    save.mutate(tx);
    router.back();
  };

  const doDelete = async () => {
    if (!editing) return;
    if (await confirm(t('add.deleteTitle'), t('add.deleteBody'), t('common.delete'), t('common.cancel'))) {
      del.mutate(editing.id);
      router.back();
    }
  };

  const catRow = !isTransfer && !isAdjust;
  const display = displayInput(amount, decimalSep);
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 20, gap: 12 }}>
        <View style={styles.top}>
          <PressableScale onPress={() => router.back()} style={[styles.close, { backgroundColor: c.surfaceAlt }]} accessibilityRole="button" accessibilityLabel={t('common.close')} testID="tx-close"><Icon name="close" size={20} color={c.ink} /></PressableScale>
          <Text variant="headline">{editing ? t('add.edit') : t('add.title')}</Text>
          {editing ? (
            <PressableScale onPress={doDelete} style={[styles.close, { backgroundColor: c.surfaceAlt }]} accessibilityRole="button" accessibilityLabel={t('common.delete')} testID="tx-delete"><Icon name="trash" size={20} color={c.ink} /></PressableScale>
          ) : <View style={styles.close} />}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {KINDS.map((k) => (
            <Chip key={k} label={t(`kind.${k}` as TKey)} selected={k === kind} testID={`kind-${k}`} onPress={() => { setKind(k); setError(null); if (k === 'transfer' || k === 'adjustment') setCategoryId(null); }} />
          ))}
        </ScrollView>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, gap: 14 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: 'center', paddingVertical: small ? 4 : 12 }} accessibilityRole="text" accessibilityLabel={`${t('add.amount')} ${display} ${currencySymbol(cur, intl)}`}>
          {isAdjust ? <Text variant="caption" tone="soft">{t('add.realBalance', { account: accName(accountId) })}</Text> : null}
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
            <Text variant="amount" testID="amount-display" style={{ fontSize: small ? 52 : 64, lineHeight: small ? 58 : 70, color: amount ? c.ink : c.inkFaint }} adjustsFontSizeToFit numberOfLines={1}>{display}</Text>
            <Text variant="title" tone="soft">{currencySymbol(cur, intl)}</Text>
          </View>
          {isAdjust && amount ? <Text variant="caption" tone="soft">{t('add.adjustDiff', { diff: formatMoney(amountMinor, cur, intl, { sign: true }) })}</Text> : null}
        </View>

        {catRow ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ marginHorizontal: -20 }}>
            <View style={{ width: 12 }} />
            {f.categories.map((cat) => (
              <Chip key={cat.id} icon={cat.icon} label={categoryLabel(cat, t)} selected={cat.id === categoryId} testID={`cat-${cat.key ?? cat.name}`} onPress={() => setCategoryId(cat.id === categoryId ? null : cat.id)} />
            ))}
            <View style={{ width: 12 }} />
          </ScrollView>
        ) : null}

        <View style={styles.metaRow}>
          <Chip icon="wallet" label={accName(accountId)} trailing="chevron-down" onPress={() => setSheet('from')} testID="account-chip" />
          {isTransfer ? <><Icon name="arrow-up-right" size={16} color={c.inkFaint} /><Chip icon="wallet" label={accName(toAccountId ?? accounts.find((a) => a.id !== accountId)?.id ?? null)} trailing="chevron-down" onPress={() => setSheet('to')} testID="to-account-chip" /></> : null}
          <View style={{ flex: 1 }} />
          <View style={[styles.date, { backgroundColor: c.surfaceAlt }]}>
            <PressableScale onPress={() => shiftDate(-1)} accessibilityLabel={t('add.prevDay')} style={styles.dateBtn}><Icon name="chevron-left" size={16} color={c.ink} /></PressableScale>
            <Text variant="caption" style={{ fontWeight: '700', minWidth: 62, textAlign: 'center' }} testID="date-label">{dayLabel(date, t, intl)}</Text>
            <PressableScale onPress={() => shiftDate(1)} accessibilityLabel={t('add.nextDay')} style={styles.dateBtn}><Icon name="chevron-right" size={16} color={c.ink} /></PressableScale>
          </View>
        </View>

        {!isAdjust ? <Field value={description} onChangeText={setDescription} placeholder={t('add.description')} maxLength={80} testID="tx-description" accessibilityLabel={t('add.description')} /> : null}

        {more && !isAdjust ? (
          <View style={{ gap: 12 }}>
            <Field value={notes} onChangeText={setNotes} placeholder={t('add.notes')} multiline maxLength={500} style={{ height: 80, paddingTop: 14 }} />
            {!isTransfer ? (
              <View style={styles.switchRow}>
                <Text style={{ flex: 1 }}>{t('add.recurring')}</Text>
                <Switch value={recurring} onValueChange={setRecurring} trackColor={{ true: c.ink, false: c.surfaceAlt }} accessibilityLabel={t('add.recurring')} />
              </View>
            ) : null}
          </View>
        ) : !isAdjust ? (
          <PressableScale onPress={() => setMore(true)} style={{ alignSelf: 'flex-start', paddingVertical: 4 }} accessibilityRole="button"><Text variant="caption" tone="soft">{t('add.more')}</Text></PressableScale>
        ) : null}
        {error ? <Text variant="caption" accessibilityRole="alert" style={{ textAlign: 'center' }}>{error}</Text> : null}
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 10, paddingTop: 8, gap: 10 }}>
        <Numpad onKey={onKey} decimalSep={decimalSep} allowDecimal={exp > 0} />
        <Button label={t(editing ? 'common.save' : (`add.save.${kind}` as TKey))} onPress={doSave} disabled={!canSave} testID="tx-save" />
      </View>

      <Sheet<string> visible={sheet === 'from'} title={t('add.account')} value={accountId} onClose={() => setSheet(null)} onSelect={(v) => { setAccountId(v); if (v === toAccountId) setToAccountId(null); }}
        options={accounts.map((a) => ({ value: a.id, label: a.name, hint: formatMoney(f.balances[a.id] ?? 0, a.currency, intl) }))} />
      <Sheet<string> visible={sheet === 'to'} title={t('add.toAccount')} value={toAccountId ?? ''} onClose={() => setSheet(null)} onSelect={setToAccountId}
        options={accounts.filter((a) => a.id !== accountId).map((a) => ({ value: a.id, label: a.name, hint: formatMoney(f.balances[a.id] ?? 0, a.currency, intl) }))} />
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  close: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  date: { flexDirection: 'row', alignItems: 'center', height: 38, borderRadius: 19, paddingHorizontal: 2 },
  dateBtn: { width: 32, height: 38, alignItems: 'center', justifyContent: 'center' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
});
