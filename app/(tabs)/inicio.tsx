import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { TxRow } from '@/features/TxRow';
import { monthLabel } from '@/features/labels';
import { useFinance } from '@/data/hooks';
import { formatMoney } from '@/domain/money';
import { useT } from '@/i18n';
import { useSettings } from '@/lib/settings';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';
import { Card } from '@/ui/Card';
import { EmptyState } from '@/ui/EmptyState';
import { Icon } from '@/ui/Icon';
import { Mascot } from '@/ui/Mascot';
import { PressableScale } from '@/ui/PressableScale';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { TAB_BAR_HEIGHT } from './_layout';

export default function Home() {
  const f = useFinance();
  const { t, intl } = useT();
  const c = useTheme();
  const dash = useSettings((s) => s.dashboard);
  if (!f) return null;
  const cur = f.profile.currency;
  const money = (v: number, o?: { sign?: boolean }) => formatMoney(v, cur, intl, o);
  const { available, totalMoney } = f.availability;
  const recent = f.transactions.slice().sort((a, b) => b.occurredOn.localeCompare(a.occurredOn) || b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
  const m = f.thisMonth;
  const maxBar = Math.max(m.income, m.spending, 1);
  const hour = new Date().getHours();
  const greet = hour < 6 ? t('home.night') : hour < 13 ? t('home.morning') : hour < 21 ? t('home.afternoon') : t('home.night');

  return (
    <Screen bottomExtra={TAB_BAR_HEIGHT + 24} contentStyle={{ gap: 22 }}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text variant="caption" tone="soft">{greet}{f.profile.displayName ? `, ${f.profile.displayName}` : ''}</Text>
        </View>
        <Mascot size={52} animated={false} glow={false} />
      </View>

      <Animated.View entering={FadeIn.duration(500)} style={{ gap: 6 }} accessibilityRole="summary">
        <Text variant="micro" tone="soft" upper>{t('home.available')}</Text>
        <Text variant="display" testID="available-amount" adjustsFontSizeToFit numberOfLines={1} accessibilityLabel={`${t('home.available')} ${money(available)}`}>
          {money(available, { sign: false })}
        </Text>
        <Text tone="soft" style={{ maxWidth: 320 }}>{available < 0 ? t('home.negative') : t('home.availableHint')}</Text>
      </Animated.View>

      <View style={styles.actions}>
        {([
          ['arrow-up-right', 'home.expense', 'expense'],
          ['arrow-down-left', 'home.income', 'income'],
          ['swap', 'home.transfer', 'transfer'],
        ] as const).map(([icon, label, kind]) => (
          <PressableScale key={kind} testID={`quick-${kind}`} accessibilityRole="button" accessibilityLabel={t(label)}
            onPress={() => router.push({ pathname: '/movimiento/nuevo', params: { kind } })}
            style={[styles.action, { backgroundColor: c.surface, borderColor: c.line }]}>
            <View style={[styles.actionIcon, { backgroundColor: c.ink }]}><Icon name={icon} size={18} color={c.inverse} stroke={2.2} /></View>
            <Text variant="caption" style={{ fontWeight: '700' }}>{t(label)}</Text>
          </PressableScale>
        ))}
      </View>

      {f.transactions.length === 0 ? (
        <Card>
          <EmptyState title={t('home.emptyTitle')} body={t('home.emptyBody')} action={t('home.emptyCta')} onAction={() => router.push('/movimiento/nuevo')} />
        </Card>
      ) : null}

      {dash.accounts ? (
        <Animated.View entering={FadeInDown.delay(80).duration(450)}>
          <Card style={{ gap: 14 }}>
            <View style={styles.rowBetween}>
              <Text variant="micro" tone="soft" upper>{t('home.inAccounts')}</Text>
              <PressableScale onPress={() => router.push('/cuentas')} accessibilityRole="link"><Icon name="chevron-right" size={20} color={c.inkFaint} /></PressableScale>
            </View>
            <Text variant="title">{money(totalMoney)}</Text>
            {f.activeAccounts.length ? (
              <View style={{ gap: 10 }}>
                {f.activeAccounts.slice(0, 4).map((a) => (
                  <View key={a.id} style={styles.rowBetween}>
                    <Text tone="soft" numberOfLines={1} style={{ flex: 1 }}>{a.name}</Text>
                    <Text variant="bodyStrong">{money(f.balances[a.id] ?? 0)}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </Card>
        </Animated.View>
      ) : null}

      {dash.month ? (
        <Animated.View entering={FadeInDown.delay(140).duration(450)}>
          <Card style={{ gap: 16 }}>
            <View style={styles.rowBetween}>
              <Text variant="headline">{t('home.thisMonth')}</Text>
              <Text variant="caption" tone="soft">{monthLabel(f.month, intl)}</Text>
            </View>
            {([['home.incomeLabel', m.income, c.ink], ['home.spendingLabel', m.spending, c.inkFaint]] as const).map(([k, v, col]) => (
              <View key={k} style={{ gap: 8 }}>
                <View style={styles.rowBetween}>
                  <Text tone="soft">{t(k)}</Text>
                  <Text variant="bodyStrong">{money(v)}</Text>
                </View>
                <View style={[styles.track, { backgroundColor: c.surfaceAlt }]}>
                  <View style={[styles.fill, { backgroundColor: col, width: `${Math.max(v > 0 ? 3 : 0, (Math.max(v, 0) / maxBar) * 100)}%` }]} />
                </View>
              </View>
            ))}
            <View style={[styles.rowBetween, { paddingTop: 4, borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: c.line }]}>
              <Text tone="soft">{t('home.balanceMonth')}</Text>
              <Text variant="bodyStrong">{money(m.net, { sign: true })}</Text>
            </View>
          </Card>
        </Animated.View>
      ) : null}

      {dash.recent && recent.length ? (
        <Animated.View entering={FadeInDown.delay(200).duration(450)}>
          <Card style={{ paddingVertical: 12 }}>
            <View style={[styles.rowBetween, { marginBottom: 4 }]}>
              <Text variant="headline">{t('home.recent')}</Text>
              <PressableScale onPress={() => router.push('/movimientos')} accessibilityRole="link"><Text variant="caption" tone="soft">{t('home.seeAll')}</Text></PressableScale>
            </View>
            {recent.map((tx) => (
              <TxRow key={tx.id} tx={tx} accounts={f.accounts} categories={f.categories} currency={cur} onPress={() => router.push(`/movimiento/${tx.id}`)} />
            ))}
          </Card>
        </Animated.View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 52 },
  actions: { flexDirection: 'row', gap: 10 },
  action: { flex: 1, borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth * 2, paddingVertical: 14, alignItems: 'center', gap: 8 },
  actionIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
});
