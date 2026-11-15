import React from 'react';
import { StyleSheet, View } from 'react-native';
import { formatMoney } from '@/domain/money';
import type { Account, Category, Transaction } from '@/domain/types';
import { useT } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { Icon } from '@/ui/Icon';
import { PressableScale } from '@/ui/PressableScale';
import { Text } from '@/ui/Text';
import { categoryLabel, dayLabel, txTitle } from './labels';

const KIND_ICON: Record<string, string> = { income: 'income', transfer: 'transfer', adjustment: 'scale', refund: 'income', debt_payment: 'coins', lent: 'groups', repaid: 'groups' };

export function TxRow({ tx, accounts, categories, currency, onPress, showDate, hideAccount, last }: {
  tx: Transaction; accounts: Account[]; categories: Category[]; currency: string; onPress?: () => void; showDate?: boolean; hideAccount?: boolean; last?: boolean;
}) {
  const c = useTheme();
  const { t, intl } = useT();
  const cat = categories.find((x) => x.id === tx.categoryId);
  const from = accounts.find((a) => a.id === tx.accountId)?.name ?? '';
  const to = tx.toAccountId ? accounts.find((a) => a.id === tx.toAccountId)?.name : null;
  const icon = tx.kind === 'expense' ? cat?.icon ?? (tx.groupRef ? 'groups' : 'expense') : KIND_ICON[tx.kind] ?? 'dots';
  const positive = tx.kind === 'income' || tx.kind === 'refund' || tx.kind === 'repaid' || (tx.kind === 'adjustment' && tx.amountMinor > 0);
  const neutral = tx.kind === 'transfer';
  const signed = neutral ? tx.amountMinor : positive ? Math.abs(tx.amountMinor) : -Math.abs(tx.amountMinor);
  const parts = to ? [`${from} → ${to}`] : [cat ? categoryLabel(cat, t) : null, hideAccount && cat ? null : from];
  if (showDate) parts.push(dayLabel(tx.occurredOn, t, intl));
  return (
    <PressableScale onPress={onPress} scaleTo={0.985} accessibilityRole="button"
      style={[styles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line }]}
      accessibilityLabel={`${txTitle(tx, categories, t)}, ${formatMoney(signed, currency, intl)}`}>
      <View style={[styles.icon, { backgroundColor: c.surfaceAlt }]}><Icon name={icon} size={17} color={c.ink} /></View>
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong" numberOfLines={1}>{txTitle(tx, categories, t)}</Text>
        <Text variant="caption" tone="soft" numberOfLines={1}>{parts.filter(Boolean).join(' · ')}</Text>
      </View>
      <Text variant="bodyStrong" style={{ color: neutral ? c.inkSoft : positive ? c.accent : c.ink }}>
        {formatMoney(signed, currency, intl, { sign: !neutral })}
      </Text>
    </PressableScale>
  );
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, minHeight: 56 },
  icon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
});
