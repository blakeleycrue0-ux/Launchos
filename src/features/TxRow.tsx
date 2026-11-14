import React from 'react';
import { StyleSheet, View } from 'react-native';
import { formatMoney } from '@/domain/money';
import type { Account, Category, Transaction } from '@/domain/types';
import { useT } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { Icon } from '@/ui/Icon';
import { PressableScale } from '@/ui/PressableScale';
import { Text } from '@/ui/Text';
import { categoryLabel, txTitle } from './labels';

const KIND_ICON: Record<string, string> = { income: 'arrow-down-left', transfer: 'swap', adjustment: 'scale', refund: 'arrow-down-left', debt_payment: 'coins' };

export function TxRow({ tx, accounts, categories, currency, onPress, subtitleOverride }: {
  tx: Transaction; accounts: Account[]; categories: Category[]; currency: string; onPress?: () => void; subtitleOverride?: string;
}) {
  const c = useTheme();
  const { t, intl } = useT();
  const cat = categories.find((x) => x.id === tx.categoryId);
  const from = accounts.find((a) => a.id === tx.accountId)?.name ?? '';
  const to = tx.toAccountId ? accounts.find((a) => a.id === tx.toAccountId)?.name : null;
  const icon = tx.kind === 'expense' ? cat?.icon ?? 'dots' : KIND_ICON[tx.kind] ?? 'dots';
  const positive = tx.kind === 'income' || tx.kind === 'refund' || (tx.kind === 'adjustment' && tx.amountMinor > 0);
  const neutral = tx.kind === 'transfer';
  const signed = neutral ? tx.amountMinor : positive ? Math.abs(tx.amountMinor) : -Math.abs(tx.amountMinor);
  const sub = subtitleOverride ?? (to ? `${from} → ${to}` : [cat ? categoryLabel(cat, t) : null, from].filter(Boolean).join(' · '));
  return (
    <PressableScale onPress={onPress} scaleTo={0.985} style={styles.row} accessibilityRole="button"
      accessibilityLabel={`${txTitle(tx, categories, t)}, ${formatMoney(signed, currency, intl)}`}>
      <View style={[styles.icon, { backgroundColor: c.surfaceAlt }]}><Icon name={icon} size={20} color={c.ink} /></View>
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong" numberOfLines={1}>{txTitle(tx, categories, t)}</Text>
        <Text variant="caption" tone="soft" numberOfLines={1}>{sub}</Text>
      </View>
      <Text variant="bodyStrong" tone={neutral ? 'soft' : 'ink'}>
        {formatMoney(signed, currency, intl, { sign: !neutral })}
      </Text>
    </PressableScale>
  );
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10, minHeight: 64 },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
