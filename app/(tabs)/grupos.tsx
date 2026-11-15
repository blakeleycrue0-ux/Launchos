import { router } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { GroupCard } from '@/features/GroupCard';
import { useFinance } from '@/data/hooks';
import { netBalances } from '@/domain/groupLedger';
import { formatMoney } from '@/domain/money';
import { useT } from '@/i18n';
import { isSupabaseConfigured } from '@/lib/config';
import { Card } from '@/ui/Card';
import { Chip } from '@/ui/Chip';
import { EmptyState } from '@/ui/EmptyState';
import { IconButton } from '@/ui/Header';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { TAB_BAR_HEIGHT } from './_layout';

export default function Groups() {
  const f = useFinance();
  const { t, intl } = useT();
  if (!f) return null;
  const caption = (groupId: string, currency: string) => {
    if (!isSupabaseConfigured) return undefined;
    const net = netBalances({ expenses: f.ledger.expenses.filter((e) => e.groupId === groupId), settlements: f.ledger.settlements.filter((s) => s.groupId === groupId) })[f.me] ?? 0;
    const people = f.ledger.members.filter((m) => m.groupId === groupId && m.active).length;
    const pos = net > 0 ? t('group.owedToYou', { amount: formatMoney(net, currency, intl) }) : net < 0 ? t('group.youOwe', { amount: formatMoney(-net, currency, intl) }) : t('group.settled');
    return `${t('group.people', { n: people })} · ${pos}`;
  };
  return (
    <Screen bottomExtra={TAB_BAR_HEIGHT + 20} contentStyle={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 }}>
        <Text variant="title">{t('group.title')}</Text>
        <IconButton icon="plus" label={t('group.new')} onPress={() => router.push('/grupo')} testID="new-group" />
      </View>
      {isSupabaseConfigured ? (
        <View style={{ flexDirection: 'row' }}><Chip icon="groups" label={t('group.haveInvite')} onPress={() => router.push('/unirse')} testID="have-invite" /></View>
      ) : null}
      {f.groups.length === 0 ? (
        <Card><EmptyState title={t('group.emptyTitle')} body={t('group.emptyBody')} action={t('group.new')} onAction={() => router.push('/grupo')} /></Card>
      ) : (
        f.groups.map((g, i) => (
          <Animated.View key={g.id} entering={FadeInDown.delay(40 * i).duration(250)}>
            <GroupCard group={g} testID={`group-${g.name}`} caption={caption(g.id, g.currency)}
              onPress={() => router.push(isSupabaseConfigured ? { pathname: '/grupo-detalle', params: { id: g.id } } : { pathname: '/grupo', params: { id: g.id } })} />
          </Animated.View>
        ))
      )}
      {!isSupabaseConfigured ? <Text variant="caption" tone="faint" align="center" style={{ paddingHorizontal: 12 }}>{t('group.syncNoteLocal')}</Text> : null}
    </Screen>
  );
}
