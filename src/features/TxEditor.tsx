import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
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
import { fonts, radii } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Chip } from '@/ui/Chip';
import { DateField } from '@/ui/DateField';
import { Header, IconButton } from '@/ui/Header';
import { Icon } from '@/ui/Icon';
import { Numpad } from '@/ui/Numpad';
import { PressableScale } from '@/ui/PressableScale';
import { Segmented } from '@/ui/Segmented';
import { Sheet } from '@/ui/Sheet';
import { Toggle } from '@/ui/Toggle';
import { noOutline } from '@/ui/Field';
import { Text } from '@/ui/Text';
import { categoryLabel } from './labels';

const KINDS: TxKind[] = ['expense', 'income', 'transfer', 'refund'];
const ALL_KINDS: TxKind[] = [...KINDS, 'adjustment'];
/** Tipos que no se eligen a mano: nacen de un ajuste o de un grupo. */
const FIXED_KINDS: TxKind[] = ['adjustment', 'lent', 'repaid', 'debt_payment'];

/** Alta y edición de movimientos: importe → categoría → guardar. */
export function TxEditor({ id }: { id?: string }) {
  const f = useFinance();
  const params = useLocalSearchParams<{ kind?: string; account?: string }>();
  const { t, intl, decimalSep } = useT();
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const save = useSaveTransaction();
  const del = useDeleteTransaction();
  const editing = useMemo(() => (id && f ? f.transactions.find((x) => x.id === id) : undefined), [id, f]);

  const cur = f?.profile.currency ?? 'EUR';
  const exp = currencyExponent(cur);
  const firstAccount = f?.activeAccounts.find((a) => a.id === params.account)?.id ?? f?.activeAccounts[0]?.id ?? '';
  const initialKind = (editing?.kind ?? (ALL_KINDS.includes(params.kind as TxKind) ? (params.kind as TxKind) : 'expense')) as TxKind;

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
  const small = height < 720;

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
      categoryId: isTransfer || isAdjust ? null : categoryId, recurringPaymentId: editing?.recurringPaymentId ?? null, groupRef: editing?.groupRef ?? null, description: description.trim(), notes: notes.trim(),
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

  const catRow = !isTransfer && !isAdjust && kind !== 'lent' && kind !== 'repaid';
  const display = displayInput(amount, decimalSep);
  const toId = toAccountId ?? accounts.find((a) => a.id !== accountId)?.id ?? null;
  const line = { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line };
  const inputStyle = [{ flex: 1, color: c.ink, fontFamily: fonts[500], fontSize: 16, paddingVertical: 0, height: 46 }, noOutline] as const;
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 20, gap: 12 }}>
        <Header close backLabel={t('common.close')} title={editing ? t('add.edit') : t('add.title')}
          right={editing ? <IconButton icon="trash" label={t('common.delete')} onPress={doDelete} testID="tx-delete" /> : undefined} />
        {FIXED_KINDS.includes(kind) ? (
          <Text variant="caption" tone="soft" align="center">{t(`kind.${kind}` as TKey)}{editing?.groupRef ? ` · ${t('add.fromGroup')}` : ''}</Text>
        ) : (
          <Segmented<TxKind> value={kind} options={KINDS.map((k) => ({ value: k, label: t(`kind.${k}` as TKey) }))}
            onChange={(k) => { setKind(k); setError(null); if (k === 'transfer') setCategoryId(null); }} />
        )}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: small ? 6 : 14, paddingBottom: 8, gap: 12 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: 'center', gap: 2 }} accessibilityRole="text" accessibilityLabel={`${t('add.amount')} ${display} ${currencySymbol(cur, intl)}`}>
          {isAdjust ? <Text variant="caption" tone="soft">{t('add.realBalance', { account: accName(accountId) })}</Text> : null}
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
            <Text variant="amount" testID="amount-display" style={{ fontSize: small ? 40 : 46, lineHeight: small ? 46 : 52, color: amount ? c.ink : c.inkFaint }} adjustsFontSizeToFit numberOfLines={1}>{display}</Text>
            <Text variant="headline" style={{ color: c.accent, fontSize: 20 }}>{currencySymbol(cur, intl)}</Text>
          </View>
          {isAdjust && amount ? <Text variant="caption" tone="soft">{t('add.adjustDiff', { diff: formatMoney(amountMinor, cur, intl, { sign: true }) })}</Text> : null}
        </View>

        {catRow ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 20 }} style={{ marginHorizontal: -20 }}>
            {f.categories.map((cat) => (
              <Chip key={cat.id} icon={cat.icon} label={categoryLabel(cat, t)} selected={cat.id === categoryId} testID={`cat-${cat.key ?? cat.name}`} onPress={() => setCategoryId(cat.id === categoryId ? null : cat.id)} />
            ))}
          </ScrollView>
        ) : null}

        <View style={[styles.form, { backgroundColor: c.surface, borderColor: c.line }]}>
          <PressableScale onPress={() => setSheet('from')} scaleTo={0.99} style={[styles.formRow, line]} testID="account-chip" accessibilityRole="button" accessibilityLabel={t('add.account')}>
            <Icon name="wallet" size={17} color={c.inkSoft} />
            <Text tone="soft" style={{ flex: 1 }}>{isTransfer ? t('add.fromAccount') : t('add.account')}</Text>
            <Text variant="bodyStrong" numberOfLines={1} style={{ maxWidth: 170 }}>{accName(accountId)}</Text>
            <Icon name="chevron-right" size={15} color={c.inkFaint} />
          </PressableScale>
          {isTransfer ? (
            <PressableScale onPress={() => setSheet('to')} scaleTo={0.99} style={[styles.formRow, line]} testID="to-account-chip" accessibilityRole="button" accessibilityLabel={t('add.toAccount')}>
              <Icon name="transfer" size={17} color={c.inkSoft} />
              <Text tone="soft" style={{ flex: 1 }}>{t('add.toAccount')}</Text>
              <Text variant="bodyStrong" numberOfLines={1} style={{ maxWidth: 170 }}>{accName(toId)}</Text>
              <Icon name="chevron-right" size={15} color={c.inkFaint} />
            </PressableScale>
          ) : null}
          <View style={[styles.formRow, !isAdjust && line]}>
            <Icon name="calendar" size={17} color={c.inkSoft} />
            <Text tone="soft" style={{ flex: 1 }}>{t('add.date')}</Text>
            <PressableScale onPress={() => shiftDate(-1)} hitSlop={8} accessibilityLabel={t('add.prevDay')} style={styles.dateBtn}><Icon name="chevron-left" size={16} color={c.inkSoft} /></PressableScale>
            <DateField inline value={date} onChange={(v) => v && setDate(v)} testID="date-label" />
            <PressableScale onPress={() => shiftDate(1)} hitSlop={8} accessibilityLabel={t('add.nextDay')} style={styles.dateBtn}><Icon name="chevron-right" size={16} color={c.inkSoft} /></PressableScale>
          </View>
          {!isAdjust ? (
            <View style={[styles.formRow, more && line]}>
              <Icon name="text" size={17} color={c.inkSoft} />
              <TextInput value={description} onChangeText={setDescription} placeholder={t('add.description')} placeholderTextColor={c.inkFaint} maxLength={80}
                testID="tx-description" accessibilityLabel={t('add.description')} selectionColor={c.accent} style={inputStyle} />
              {!more ? (
                <PressableScale onPress={() => setMore(true)} hitSlop={8} accessibilityRole="button"><Text variant="caption" style={{ color: c.accent, fontWeight: '700' }}>{t('add.more')}</Text></PressableScale>
              ) : null}
            </View>
          ) : null}
          {more && !isAdjust ? (
            <>
              <View style={[styles.formRow, !isTransfer && line]}>
                <Icon name="edit" size={17} color={c.inkSoft} />
                <TextInput value={notes} onChangeText={setNotes} placeholder={t('add.notes')} placeholderTextColor={c.inkFaint} maxLength={500} accessibilityLabel={t('add.notes')} selectionColor={c.accent} style={inputStyle} />
              </View>
              {!isTransfer ? (
                <View style={styles.formRow}>
                  <Icon name="recurring" size={17} color={c.inkSoft} />
                  <Text tone="soft" style={{ flex: 1 }}>{t('add.recurring')}</Text>
                  <Toggle value={recurring} onChange={setRecurring} label={t('add.recurring')} />
                </View>
              ) : null}
            </>
          ) : null}
        </View>
        {error ? <Text variant="caption" accessibilityRole="alert" style={{ textAlign: 'center' }}>{error}</Text> : null}
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 10, paddingTop: 6, gap: 10 }}>
        <Numpad onKey={onKey} decimalSep={decimalSep} allowDecimal={exp > 0} keyHeight={small ? 40 : 46} />
        <Button label={t(editing ? 'common.save' : (`add.save.${kind}` as TKey))} onPress={doSave} disabled={!canSave} testID="tx-save" />
      </View>

      <Sheet<string> visible={sheet === 'from'} title={t('add.account')} value={accountId} onClose={() => setSheet(null)} onSelect={(v) => { setAccountId(v); if (v === toAccountId) setToAccountId(null); }}
        options={accounts.map((a) => ({ value: a.id, label: a.name, hint: formatMoney(f.balances[a.id] ?? 0, a.currency, intl) }))} />
      <Sheet<string> visible={sheet === 'to'} title={t('add.toAccount')} value={toId ?? ''} onClose={() => setSheet(null)} onSelect={setToAccountId}
        options={accounts.filter((a) => a.id !== accountId).map((a) => ({ value: a.id, label: a.name, hint: formatMoney(f.balances[a.id] ?? 0, a.currency, intl) }))} />
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  form: { borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14 },
  formRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 46 },
  dateBtn: { width: 28, height: 32, alignItems: 'center', justifyContent: 'center' },
});
