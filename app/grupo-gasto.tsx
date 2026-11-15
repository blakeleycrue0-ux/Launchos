import { router, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ledgerKey, snapshotKey, useFinance, useGroupRepo, useSyncPersonalEffects } from '@/data/hooks';
import { computeShares, expenseEffects, expenseRefPrefix, type SplitKind } from '@/domain/groupLedger';
import { currencySymbol, formatMoney, minorToInput, parseAmount } from '@/domain/money';
import { useT, type TKey } from '@/i18n';
import { haptic } from '@/lib/haptics';
import { newId } from '@/lib/id';
import { confirm } from '@/lib/platform';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Chip } from '@/ui/Chip';
import { DateField } from '@/ui/DateField';
import { Field, noOutline } from '@/ui/Field';
import { Header, IconButton } from '@/ui/Header';
import { Icon } from '@/ui/Icon';
import { PressableScale } from '@/ui/PressableScale';
import { Screen } from '@/ui/Screen';
import { Segmented } from '@/ui/Segmented';
import { Sheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';
import { Toggle } from '@/ui/Toggle';

export default function GroupExpenseModal() {
  const { group: groupId, id } = useLocalSearchParams<{ group: string; id?: string }>();
  const f = useFinance();
  const repo = useGroupRepo();
  const qc = useQueryClient();
  const sync = useSyncPersonalEffects();
  const { t, intl, decimalSep } = useT();
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const group = f?.groups.find((g) => g.id === groupId);
  const existing = f?.ledger.expenses.find((e) => e.id === id);
  const cur = group?.currency ?? 'EUR';
  const members = (f?.ledger.members ?? []).filter((m) => m.groupId === groupId && (m.active || (existing && (existing.shares[m.userId] !== undefined || existing.paidBy === m.userId))));
  const linked = !!existing && !!f?.transactions.some((x) => x.groupRef?.startsWith(expenseRefPrefix(existing.id)));

  const [amount, setAmount] = useState(existing ? minorToInput(existing.amountMinor, cur, decimalSep) : '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [paidBy, setPaidBy] = useState(existing?.paidBy ?? f?.me ?? '');
  const [date, setDate] = useState(existing?.occurredOn ?? f?.today ?? '');
  const [kind, setKind] = useState<SplitKind>(existing?.splitKind ?? 'equal');
  const [included, setIncluded] = useState<string[]>(existing ? Object.keys(existing.shares) : members.map((m) => m.userId));
  const [values, setValues] = useState<Record<string, string>>(() => {
    if (!existing || existing.splitKind === 'equal') return {};
    const out: Record<string, string> = {};
    for (const [u, s] of Object.entries(existing.shares)) {
      out[u] = existing.splitKind === 'amounts' ? minorToInput(s, cur, decimalSep) : String(Math.round((s * 10000) / existing.amountMinor) / 100).replace('.', decimalSep);
    }
    return out;
  });
  const [link, setLink] = useState(existing ? linked : true);
  const [accountId, setAccountId] = useState(f?.activeAccounts[0]?.id ?? '');
  const [sheet, setSheet] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!f || !repo || !group) return null;

  const total = parseAmount(amount, cur);
  const num = (s: string) => Number((s || '0').replace(',', '.'));
  const numeric: Record<string, number> = {};
  for (const m of members) {
    const raw = values[m.userId] ?? '';
    numeric[m.userId] = kind === 'amounts' ? parseAmount(raw || '0', cur) ?? -1 : num(raw);
  }
  const participants = kind === 'equal' ? members.map((m) => m.userId).filter((u) => included.includes(u)) : members.map((m) => m.userId).filter((u) => numeric[u] > 0);
  const result = total && total > 0 ? computeShares(total, kind, participants, numeric) : null;
  const shares = result && 'shares' in result ? result.shares : null;
  const money = (v: number) => formatMoney(v, cur, intl);
  const entered = members.reduce((s, m) => s + Math.max(0, numeric[m.userId] || 0), 0);
  const hint = kind === 'percent' ? t('gexp.percentLeft', { n: String(Math.round((100 - entered) * 100) / 100).replace('.', decimalSep) })
    : kind === 'amounts' && total ? t('gexp.amountLeft', { amount: money(total - entered) }) : null;
  const iPay = paidBy === f.me;
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ledgerKey(f.me) }), qc.invalidateQueries({ queryKey: snapshotKey(f.me) })]);

  const submit = async () => {
    if (!total || total <= 0) return setError(t('err.amount_required'));
    if (!result) return;
    if ('error' in result) return setError(t(`gexp.err.${result.error}` as TKey));
    setBusy(true); setError(null);
    const x = { id: existing?.id ?? newId(), groupId, paidBy, amountMinor: total, description: description.trim(), occurredOn: date, splitKind: kind, shares: result.shares };
    try {
      await repo.saveExpense(x);
      // Efecto en MIS cuentas: solo si pago yo y lo pido. Mi parte es gasto; el resto, dinero adelantado.
      await sync(expenseRefPrefix(x.id), expenseEffects(x, f.me), iPay && link && accountId ? accountId : null, `${group.name}${x.description ? ` · ${x.description}` : ''}`);
      haptic.success();
      await refresh();
      router.back();
    } catch (e) { haptic.warn(); setError(e instanceof Error ? e.message : t('error.generic')); } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!existing || !(await confirm(t('gexp.deleteTitle'), t('gexp.deleteBody'), t('common.delete'), t('common.cancel')))) return;
    try { await repo.deleteExpense(existing.id); await sync(expenseRefPrefix(existing.id), [], null, ''); await refresh(); router.back(); }
    catch (e) { setError(e instanceof Error ? e.message : t('error.generic')); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen contentStyle={{ gap: 14 }}>
        <Header close backLabel={t('common.close')} title={existing ? t('gexp.edit') : t('group.addExpense')}
          right={existing ? <IconButton icon="trash" label={t('common.delete')} onPress={remove} testID="gexp-delete" /> : undefined} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><Field label={`${t('add.amount')} (${currencySymbol(cur, intl)})`} value={amount} onChangeText={(v) => { setAmount(v); setError(null); }} keyboardType="decimal-pad" placeholder="0" autoFocus={!existing} testID="gexp-amount" /></View>
          <View style={{ flex: 1 }}><DateField label={t('add.date')} value={date} onChange={(v) => v && setDate(v)} testID="gexp-date" /></View>
        </View>
        <Field label={t('gexp.what')} value={description} onChangeText={setDescription} placeholder={t('gexp.whatPlaceholder')} maxLength={60} testID="gexp-description" />

        <View style={{ gap: 6 }}>
          <Text variant="caption" tone="soft" style={{ marginLeft: 4 }}>{t('gexp.paidBy')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {members.map((m) => <Chip key={m.userId} label={m.userId === f.me ? t('group.you') : m.name} selected={paidBy === m.userId} onPress={() => setPaidBy(m.userId)} testID={`payer-${m.name}`} />)}
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <Text variant="caption" tone="soft" style={{ marginLeft: 4 }}>{t('gexp.split')}</Text>
          <Segmented<SplitKind> value={kind} onChange={(k) => { setKind(k); setError(null); }} options={[{ value: 'equal', label: t('gexp.equal') }, { value: 'percent', label: t('gexp.percent') }, { value: 'amounts', label: t('gexp.amounts') }]} />
          <Card style={{ paddingVertical: 2, paddingHorizontal: 14 }}>
            {members.map((m, i) => {
              const on = included.includes(m.userId);
              return (
                <View key={m.userId} style={[styles.row, i < members.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line }]}>
                  {kind === 'equal' ? (
                    <PressableScale onPress={() => setIncluded((s) => (on ? s.filter((x) => x !== m.userId) : [...s, m.userId]))} hitSlop={8} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={m.name} testID={`include-${m.name}`}
                      style={[styles.check, { borderColor: on ? c.accent : c.line, backgroundColor: on ? c.accent : 'transparent' }]}>
                      {on ? <Icon name="check" size={13} color="#16130D" stroke={2.5} /> : null}
                    </PressableScale>
                  ) : null}
                  <Text variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>{m.userId === f.me ? `${m.name} (${t('group.you')})` : m.name}</Text>
                  {kind === 'equal' ? (
                    <Text tone={shares?.[m.userId] ? 'ink' : 'faint'} testID={`share-${m.name}`}>{shares?.[m.userId] ? money(shares[m.userId]) : '—'}</Text>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {kind === 'percent' && shares?.[m.userId] ? <Text variant="caption" tone="soft">{money(shares[m.userId])}</Text> : null}
                      <TextInput value={values[m.userId] ?? ''} onChangeText={(v) => { setValues((s) => ({ ...s, [m.userId]: v })); setError(null); }} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={c.inkFaint}
                        accessibilityLabel={m.name} testID={`value-${m.name}`} selectionColor={c.accent}
                        style={[{ width: 82, height: 36, borderRadius: 10, backgroundColor: c.surfaceAlt, color: c.ink, textAlign: 'right', paddingHorizontal: 10, fontFamily: fonts[600], fontSize: 16 }, noOutline]} />
                      <Text tone="soft" style={{ width: 16 }}>{kind === 'percent' ? '%' : currencySymbol(cur, intl)}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </Card>
          {hint ? <Text variant="caption" tone="soft" testID="gexp-hint">{hint}</Text> : null}
        </View>

        {iPay ? (
          <Card style={{ padding: 14, gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text variant="bodyStrong" style={{ flex: 1 }}>{t('gexp.link')}</Text>
              <Toggle value={link} onChange={setLink} label={t('gexp.link')} />
            </View>
            {link ? (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text tone="soft" style={{ flex: 1 }}>{t('add.account')}</Text>
                  <Chip icon="wallet" label={f.accounts.find((a) => a.id === accountId)?.name ?? '—'} trailing="chevron-down" onPress={() => setSheet(true)} />
                </View>
                {shares && total ? (
                  <Text variant="caption" tone="soft" testID="gexp-link-note">{t('gexp.linkNote', { total: money(total), mine: money(shares[f.me] ?? 0), lent: money(total - (shares[f.me] ?? 0)) })}</Text>
                ) : null}
              </>
            ) : <Text variant="caption" tone="soft">{t('gexp.linkOff')}</Text>}
          </Card>
        ) : <Text variant="caption" tone="faint">{t('gexp.notPayer')}</Text>}
        {error ? <Text variant="caption" accessibilityRole="alert" testID="gexp-error" style={{ color: c.accent }}>{error}</Text> : null}
      </Screen>
      <View style={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 12, paddingTop: 6 }}>
        <Button label={t('common.save')} onPress={submit} loading={busy} disabled={!total || total <= 0} testID="gexp-save" />
      </View>
      <Sheet<string> visible={sheet} title={t('add.account')} value={accountId} onClose={() => setSheet(false)} onSelect={setAccountId}
        options={f.activeAccounts.map((a) => ({ value: a.id, label: a.name }))} />
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 50 },
  check: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
