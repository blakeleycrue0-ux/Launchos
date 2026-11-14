import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export function Chip({ label, selected, onPress, icon, trailing, testID }: {
  label: string; selected?: boolean; onPress?: () => void; icon?: IconName; trailing?: IconName; testID?: string;
}) {
  const c = useTheme();
  const fg = selected ? c.inverse : c.ink;
  return (
    <PressableScale
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      scaleTo={0.95}
      style={[styles.chip, { backgroundColor: selected ? c.ink : c.surfaceAlt }]}
    >
      <View style={styles.row}>
        {icon ? <Icon name={icon} size={16} color={fg} /> : null}
        <Text variant="bodyStrong" style={{ color: fg, fontSize: 14, lineHeight: 20 }} numberOfLines={1}>{label}</Text>
        {trailing ? <Icon name={trailing} size={14} color={fg} /> : null}
      </View>
    </PressableScale>
  );
}
const styles = StyleSheet.create({
  chip: { height: 38, paddingHorizontal: 14, borderRadius: radii.pill, justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
