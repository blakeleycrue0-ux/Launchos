import { router } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { useFinance } from '@/data/hooks';
import { goalProgress } from '@/domain/goals';
import { formatMoney } from '@/domain/money';
import { useT } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { Card } from '@/ui/Card';
import { EmptyState } from '@/ui/EmptyState';
import { Header, IconButton } from '@/ui/Header';
import { Icon } from '@/ui/Icon';
import { PressableScale } from '@/ui/PressableScale';
import { ProgressBar } from '@/ui/ProgressBar';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

export default function Goals() {
  const f = useFinance();
  const { t, intl } = useT();
  const c = useTheme();
  if (!f) return null;
  const cur = f.profile.currency;
  const money = (v: number) => formatMoney(v, cur, intl);
  return (
    <Screen contentStyle={{ gap: 12 }}>
      <Header backLabel={t('common.back')} title={t('goal.title')} right={<IconButton icon="plus" label={t('goal.new')} onPress={() => router.push('/objetivo')} testID="new-goal" />} />
      {f.goals.length === 0 ? (
        <Card><EmptyState title={t('goal.emptyTitle')} body={t('goal.emptyBody')} action={t('goal.new')} onAction={() => router.push('/objetivo')} /></Card>
      ) : (
        <>
          <Card style={{ padding: 14, gap: 2 }}>
            <Text variant="micro" tone="soft" upper>{t('goal.reserved')}</Text>
            <Text variant="title" testID="goals-reserved">{money(f.availability.reserved.savings)}</Text>
            <Text variant="caption" tone="soft">{t('goal.reservedHint')}</Text>
          </Card>
          {f.goals.map((g) => {
            const p = goalProgress(g, f.today);
            return (
              <PressableScale key={g.id} scaleTo={0.985} onPress={() => router.push({ pathname: '/objetivo', params: { id: g.id } })} testID={`goal-${g.name}`} accessibilityRole="button">
                <Card style={{ padding: 14, gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Icon name={p.done ? 'check' : 'target'} size={17} color={p.done ? c.accent : c.inkSoft} />
                    <Text variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>{g.name}</Text>
                    <Text variant="caption" tone="soft">{p.pct} %</Text>
                  </View>
                  <ProgressBar value={p.pct} />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                    <Text variant="caption" tone="soft">{t('goal.of', { saved: money(p.saved), target: money(g.targetMinor) })}</Text>
                    <Text variant="caption" style={{ color: c.inkSoft }} numberOfLines={1}>
                      {p.done ? t('goal.done') : p.perMonth ? t('goal.perMonth', { amount: money(p.perMonth) }) : t('goal.remaining', { amount: money(p.remaining) })}
                    </Text>
                  </View>
                </Card>
              </PressableScale>
            );
          })}
        </>
      )}
    </Screen>
  );
}
