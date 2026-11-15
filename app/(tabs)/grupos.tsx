import { router } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { GroupCard } from '@/features/GroupCard';
import { useFinance } from '@/data/hooks';
import { useT } from '@/i18n';
import { isSupabaseConfigured } from '@/lib/config';
import { Card } from '@/ui/Card';
import { EmptyState } from '@/ui/EmptyState';
import { IconButton } from '@/ui/Header';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { TAB_BAR_HEIGHT } from './_layout';

export default function Groups() {
  const f = useFinance();
  const { t } = useT();
  if (!f) return null;
  return (
    <Screen bottomExtra={TAB_BAR_HEIGHT + 20} contentStyle={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 }}>
        <Text variant="title">{t('group.title')}</Text>
        <IconButton icon="plus" label={t('group.new')} onPress={() => router.push('/grupo')} testID="new-group" />
      </View>
      {f.groups.length === 0 ? (
        <Card><EmptyState title={t('group.emptyTitle')} body={t('group.emptyBody')} action={t('group.new')} onAction={() => router.push('/grupo')} /></Card>
      ) : (
        f.groups.map((g, i) => (
          <Animated.View key={g.id} entering={FadeInDown.delay(40 * i).duration(250)}>
            <GroupCard group={g} testID={`group-${g.name}`} onPress={() => router.push({ pathname: '/grupo', params: { id: g.id } })} />
          </Animated.View>
        ))
      )}
      <Text variant="caption" tone="faint" align="center" style={{ paddingHorizontal: 12 }}>{t(isSupabaseConfigured ? 'group.syncNoteCloud' : 'group.syncNoteLocal')}</Text>
    </Screen>
  );
}
