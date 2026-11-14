import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

interface Props {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  compact?: boolean;
  testID?: string;
}

export function Button({ label, onPress, variant = 'primary', icon, loading, disabled, compact, testID }: Props) {
  const c = useTheme();
  const bg = { primary: c.ink, secondary: c.surfaceAlt, ghost: 'transparent', danger: 'transparent' }[variant];
  const fg = variant === 'primary' ? c.inverse : c.ink;
  const off = disabled || loading;
  return (
    <PressableScale
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      disabled={off}
      onPress={onPress}
      style={[
        styles.base,
        { backgroundColor: bg, height: compact ? 44 : 56, opacity: off && !loading ? 0.4 : 1, paddingHorizontal: compact ? 18 : 24 },
        variant === 'danger' && { borderWidth: StyleSheet.hairlineWidth * 2, borderColor: c.line },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.row}>
          {icon ? <Icon name={icon} size={20} color={fg} /> : null}
          <Text variant="bodyStrong" style={{ color: fg }}>{label}</Text>
        </View>
      )}
    </PressableScale>
  );
}
const styles = StyleSheet.create({
  base: { borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
