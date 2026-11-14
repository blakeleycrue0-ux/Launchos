import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { accountKindLabel } from '@/features/labels';
import { useFinance } from '@/data/hooks';
import { formatMoney } from '@/domain/money';
import { useT } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Icon } from '@/ui/Icon';
import { PressableScale } from '@/ui/PressableScale';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { TAB_BAR_HEIGHT } from './_layout';

const KIND_ICON = { bank: 'coins', cash: 'banknote', savings: 'shield', other: 'wallet' } as const;

export default function Accounts() {
  const f = useFinance();
  const { t, intl } = useT();
  const c = useTheme();
  if (!f) return null;
  const cur = f.profile.currency;
  const archived = f.accounts.filter((a) => a.archived);
  const row = (a: (typeof f.accounts)[number]) => (
    <PressableScale key={a.id} testID={`account-${a.name}`} onPress={() => router.push({ pathname: '/cuenta', params: { id: a.id } })} scaleTo={0.985} style={styles.row} accessibilityRole="button">
      <View style={[styles.icon, { backgroundColor: c.surfaceAlt }]}><Icon name={KIND_ICON[a.kind]} size={20} color={c.ink} /></View>
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong" numberOfLines={1}>{a.name}</Text>
        <Text variant="caption" tone="soft">{accountKindLabel(a.kind, t)}</Text>
      </View>
      <Text variant="bodyStrong" tone={a.archived ? 'faint' : 'ink'}>{formatMoney(f.balances[a.id] ?? 0, a.currency, intl)}</Text>
    </PressableScale>
  );
  return (
    <Screen bottomExtra={TAB_BAR_HEIGHT + 24} contentStyle={{ gap: 18 }}>
      <Text variant="title" style={{ minHeight: 48, paddingTop: 6 }}>{t('acc.title')}</Text>
      <Card style={{ gap: 6 }}>
        <Text variant="micro" tone="soft" upper>{t('acc.total')}</Text>
        <Text variant="display" style={{ fontSize: 44, lineHeight: 50 }} adjustsFontSizeToFit numberOfLines={1}>{formatMoney(f.availability.totalMoney, cur, intl)}</Text>
        <Text variant="caption" tone="soft">{t('acc.totalHint')}</Text>
      </Card>
      <Card style={{ paddingVertical: 6, paddingHorizontal: 16 }}>
        {f.activeAccounts.length ? f.activeAccounts.map(row) : <Text tone="soft" style={{ paddingVertical: 16 }}>{t('acc.empty')}</Text>}
      </Card>
      <Button label={t('acc.new')} icon="plus" variant="secondary" onPress={() => router.push('/cuenta')} testID="new-account" />
      {archived.length ? (
        <View style={{ gap: 6 }}>
          <Text variant="micro" tone="soft" upper>{t('acc.archived')}</Text>
          <Card style={{ paddingVertical: 6, paddingHorizontal: 16 }}>{archived.map(row)}</Card>
        </View>
      ) : null}
    </Screen>
  );
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10, minHeight: 64 },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
