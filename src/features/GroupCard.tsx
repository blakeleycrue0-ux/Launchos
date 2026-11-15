import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { formatMoney } from '@/domain/money';
import type { Group } from '@/domain/types';
import { useT, type TKey } from '@/i18n';
import { radii } from '@/theme/tokens';
import { Icon } from '@/ui/Icon';
import { MetalCard } from '@/ui/MetalCard';
import { PressableScale } from '@/ui/PressableScale';
import { Text } from '@/ui/Text';
import { GROUP_KIND_ICON, groupPhotoSource } from './groupPhotos';

/** Tarjeta de grupo: fotografía a color con un degradado oscuro solo bajo el texto. */
export function GroupCard({ group, onPress, height = 148, testID, caption }: { group: Pick<Group, 'name' | 'kind' | 'photoUri' | 'photoPreset' | 'currency' | 'budgetMinor'>; onPress?: () => void; height?: number; testID?: string; caption?: string }) {
  const { t, intl } = useT();
  const src = groupPhotoSource(group);
  const body = (
    <>
      <View style={styles.kind}>
        <Icon name={GROUP_KIND_ICON[group.kind]} size={13} color="#F7F6F3" />
        <Text variant="caption" style={{ color: '#F7F6F3', fontWeight: '700', fontSize: 11.5 }}>{t(`group.kind.${group.kind}` as TKey)}</Text>
      </View>
      <View style={styles.text}>
        <Text variant="headline" numberOfLines={1} style={{ color: '#F7F6F3', fontSize: 19, lineHeight: 24 }}>{group.name || t('group.untitled')}</Text>
        <Text variant="caption" numberOfLines={1} style={{ color: 'rgba(247,246,243,0.78)' }}>
          {caption ? caption : group.budgetMinor > 0 ? t('group.budgetOf', { amount: formatMoney(group.budgetMinor, group.currency, intl, { compact: true }) }) : t('group.noBudget')}
        </Text>
      </View>
    </>
  );
  return (
    <PressableScale onPress={onPress} disabled={!onPress} scaleTo={0.985} testID={testID} accessibilityRole={onPress ? 'button' : 'image'} accessibilityLabel={group.name}>
      {src ? (
        <View style={[styles.card, { height }]}>
          <Image source={src} style={styles.photo} resizeMode="cover" accessibilityIgnoresInvertColors />
          <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 10 10" pointerEvents="none">
            <Defs>
              <LinearGradient id="gc-fade" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#000" stopOpacity="0.18" />
                <Stop offset="0.38" stopColor="#000" stopOpacity="0" />
                <Stop offset="1" stopColor="#000" stopOpacity="0.74" />
              </LinearGradient>
            </Defs>
            <Rect width="10" height="10" fill="url(#gc-fade)" />
          </Svg>
          {body}
        </View>
      ) : (
        <MetalCard radius={radii.lg} style={{ height }}>{body}</MetalCard>
      )}
    </PressableScale>
  );
}
const styles = StyleSheet.create({
  card: { borderRadius: radii.lg, overflow: 'hidden', backgroundColor: '#151515' },
  photo: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  kind: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 5, height: 26, paddingHorizontal: 9, borderRadius: 13, backgroundColor: 'rgba(9,9,9,0.5)' },
  text: { position: 'absolute', left: 14, right: 14, bottom: 12, gap: 1 },
});
