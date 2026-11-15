import { router } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { TxRow } from '@/features/TxRow';
import { dueLabel } from '@/features/dueLabel';
import { monthLabel } from '@/features/labels';
import { useFinance } from '@/data/hooks';
import { formatMoney } from '@/domain/money';
import { useT, type TKey } from '@/i18n';
import { useSettings } from '@/lib/settings';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';
import { Card } from '@/ui/Card';
import { EmptyState } from '@/ui/EmptyState';
import { IconButton } from '@/ui/Header';
import { Icon } from '@/ui/Icon';
import { MetalCard, onMetal } from '@/ui/MetalCard';
import { MioMascot } from '@/ui/MioMascot';
import { PressableScale } from '@/ui/PressableScale';
import { Screen } from '@/ui/Screen';
import { BottomSheet } from '@/ui/Sheet';
import { Text } from '@/ui/Text';
import { TAB_BAR_HEIGHT } from './_layout';

const ACTIONS = [
  { key: 'add', icon: 'plus', label: 'home.qAdd', href: '/movimiento/nuevo' },
  { key: 'buy', icon: 'bag', label: 'home.qBuy', href: '/comprar' },
  { key: 'groups', icon: 'groups', label: 'home.qGroups', href: '/grupos' },
  { key: 'ai', icon: null, label: 'home.qAi', href: '/asistente' },
] as const;

export default function Home() {
  const f = useFinance();
  const { t, intl } = useT();
  const c = useTheme();
  const dash = useSettings((s) => s.dashboard);
  const [explain, setExplain] = useState(false);
  if (!f) return null;
  const cur = f.profile.currency;
  const money = (v: number, o?: { sign?: boolean }) => formatMoney(v, cur, intl, o);
  const { available, totalMoney, spendable, reserved } = f.availability;
  const recent = f.transactions.slice().sort((a, b) => b.occurredOn.localeCompare(a.occurredOn) || b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
  const m = f.thisMonth;
  const hour = new Date().getHours();
  const greet = hour < 6 ? t('home.night') : hour < 13 ? t('home.morning') : hour < 21 ? t('home.afternoon') : t('home.night');
  const monthName = monthLabel(f.month, intl).split(' ')[0];

  return (
    <Screen bottomExtra={TAB_BAR_HEIGHT + 20} contentStyle={{ gap: 16 }}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text variant="headline" style={{ fontSize: 22, lineHeight: 26, letterSpacing: -0.8, fontWeight: '800' }}>
            mio<Text variant="headline" style={{ fontSize: 22, color: c.accent }}>.</Text>
          </Text>
          <Text variant="caption" tone="soft" numberOfLines={1}>{greet}{f.profile.displayName ? `, ${f.profile.displayName}` : ''}</Text>
        </View>
        <IconButton icon="settings" label={t('set.title')} onPress={() => router.push('/ajustes')} testID="open-settings" />
        <PressableScale onPress={() => router.push('/asistente')} accessibilityRole="button" accessibilityLabel={t('home.qAi')} testID="open-assistant" scaleTo={0.92}>
          <MioMascot size={40} plate />
        </PressableScale>
      </View>

      <MetalCard>
        <View style={{ padding: 18, gap: 4 }} accessibilityRole="summary">
          <View style={styles.rowBetween}>
            <Text variant="micro" upper style={{ color: onMetal.soft }}>{t('home.available')}</Text>
            <PressableScale onPress={() => setExplain(true)} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('home.how')} testID="explain-available">
              <Icon name="info" size={16} color={onMetal.soft} />
            </PressableScale>
          </View>
          <Text variant="display" testID="available-amount" adjustsFontSizeToFit numberOfLines={1} style={{ color: onMetal.ink }}
            accessibilityLabel={`${t('home.available')} ${money(available)}`}>
            {money(available)}
          </Text>
          {available < 0 ? <Text variant="caption" style={{ color: onMetal.soft }}>{t('home.negative')}</Text> : null}
        </View>
        <PressableScale onPress={() => router.push('/cuentas')} scaleTo={0.99} accessibilityRole="button" testID="open-accounts"
          style={[styles.cardFoot, { borderTopColor: onMetal.line }]}>
          <Icon name="wallet" size={15} color={onMetal.soft} />
          <Text variant="caption" style={{ color: onMetal.soft, flex: 1 }}>{t('home.inAccounts')}</Text>
          <Text variant="bodyStrong" style={{ color: onMetal.ink, fontSize: 13.5 }}>{money(totalMoney)}</Text>
          <Icon name="chevron-right" size={15} color={onMetal.soft} />
        </PressableScale>
      </MetalCard>

      <View style={styles.actions}>
        {ACTIONS.map((a) => (
          <PressableScale key={a.key} testID={`quick-${a.key}`} accessibilityRole="button" accessibilityLabel={t(a.label as TKey)} scaleTo={0.94}
            onPress={() => router.push(a.href)} style={styles.action}>
            <View style={[styles.actionIcon, { backgroundColor: c.surface, borderColor: c.line }]}>
              {a.icon ? <Icon name={a.icon} size={19} color={c.ink} /> : <MioMascot size={30} plate={false} />}
            </View>
            <Text variant="caption" align="center" numberOfLines={2} style={{ fontSize: 11.5, lineHeight: 15, color: c.inkSoft }}>{t(a.label as TKey)}</Text>
          </PressableScale>
        ))}
      </View>

      {dash.month ? (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {([['expense', 'home.spendingMonth', m.spending], ['income', 'home.incomeMonth', m.income]] as const).map(([icon, label, v]) => (
            <Card key={label} style={{ flex: 1, padding: 14, gap: 2 }}>
              <View style={styles.rowBetween}>
                <Text variant="caption" tone="soft">{t(label)}</Text>
                <Icon name={icon} size={15} color={c.inkFaint} />
              </View>
              <Text variant="headline" adjustsFontSizeToFit numberOfLines={1}>{money(v)}</Text>
              <Text variant="caption" tone="faint" style={{ textTransform: 'capitalize' }}>{monthName}</Text>
            </Card>
          ))}
        </View>
      ) : null}

      <Card style={{ paddingVertical: 2, paddingHorizontal: 14 }}>
        {([
          { key: 'payments', icon: 'subscriptions', href: '/pagos', title: t('home.payments'), amount: reserved.payments,
            sub: f.upcomingPayments[0] ? `${f.upcomingPayments[0].name} · ${dueLabel(f.upcomingPayments[0].due, f.today, t, intl)}` : t('home.paymentsEmpty') },
          { key: 'goals', icon: 'target', href: '/objetivos', title: t('home.goals'), amount: reserved.savings,
            sub: f.goals.length ? t('home.goalsCount', { n: f.goals.length }) : t('home.goalsEmpty') },
          ...(f.position.owedToMe > 0 || f.position.iOwe > 0 ? [{ key: 'groups', icon: 'groups', href: '/grupos', title: t('home.groupDebts'), amount: 0,
            sub: [f.position.owedToMe > 0 ? t('group.owedToYou', { amount: money(f.position.owedToMe) }) : null, f.position.iOwe > 0 ? t('group.youOwe', { amount: money(f.position.iOwe) }) : null].filter(Boolean).join(' · ') }] : []),
        ] as { key: string; icon: string; href: '/pagos' | '/objetivos' | '/grupos'; title: string; amount: number; sub: string }[]).map((r, i, all) => (
          <PressableScale key={r.key} onPress={() => router.push(r.href)} scaleTo={0.985} testID={`home-${r.key}`} accessibilityRole="button" accessibilityLabel={r.title}
            style={[styles.planRow, i < all.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line }]}>
            <View style={[styles.planIcon, { backgroundColor: c.surfaceAlt }]}><Icon name={r.icon} size={17} color={c.ink} /></View>
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">{r.title}</Text>
              <Text variant="caption" tone="soft" numberOfLines={1}>{r.sub}</Text>
            </View>
            {r.amount > 0 ? <Text variant="bodyStrong">{money(r.amount)}</Text> : null}
            <Icon name="chevron-right" size={15} color={c.inkFaint} />
          </PressableScale>
        ))}
      </Card>

      {f.transactions.length === 0 ? (
        <Card><EmptyState title={t('home.emptyTitle')} body={t('home.emptyBody')} action={t('home.emptyCta')} onAction={() => router.push('/movimiento/nuevo')} /></Card>
      ) : dash.recent ? (
        <Animated.View entering={FadeInDown.duration(250)}>
          <View style={[styles.rowBetween, { marginBottom: 6, paddingHorizontal: 2 }]}>
            <Text variant="headline">{t('home.recent')}</Text>
            <PressableScale onPress={() => router.push('/movimientos')} hitSlop={8} accessibilityRole="link"><Text variant="caption" style={{ color: c.accent, fontWeight: '700' }}>{t('home.seeAll')}</Text></PressableScale>
          </View>
          <Card style={{ paddingVertical: 2, paddingHorizontal: 14 }}>
            {recent.map((tx, i) => (
              <TxRow key={tx.id} tx={tx} accounts={f.accounts} categories={f.categories} currency={cur} showDate hideAccount last={i === recent.length - 1} onPress={() => router.push(`/movimiento/${tx.id}`)} />
            ))}
          </Card>
        </Animated.View>
      ) : null}

      <BottomSheet visible={explain} title={t('home.how')} onClose={() => setExplain(false)}>
        <View style={{ gap: 10 }}>
          {([
            ['home.howSpendable', spendable, ''],
            ['home.howPayments', reserved.payments, '−'],
            ['home.howDebts', reserved.debts, '−'],
            ['home.howSavings', reserved.savings, '−'],
          ] as const).map(([k, v, sign]) => (
            <View key={k} style={styles.rowBetween}>
              <Text tone="soft" style={{ flex: 1 }}>{t(k)}</Text>
              <Text variant="bodyStrong">{sign ? `${sign} ` : ''}{money(v)}</Text>
            </View>
          ))}
          <View style={[styles.rowBetween, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line, paddingTop: 10 }]}>
            <Text variant="bodyStrong">{t('home.available')}</Text>
            <Text variant="headline" style={{ color: c.accent }}>{money(available)}</Text>
          </View>
          <Text variant="caption" tone="soft">{t('home.howNote')}</Text>
        </View>
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  cardFoot: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, height: 44, borderTopWidth: StyleSheet.hairlineWidth },
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  action: { flex: 1, alignItems: 'center', gap: 6 },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 8 },
  planIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  actionIcon: { width: 52, height: 52, borderRadius: radii.lg - 2, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
});
