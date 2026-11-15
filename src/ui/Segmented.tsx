import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export function Segmented<T extends string>({ options, value, onChange }: {
  options: { value: T; label: string }[]; value: T; onChange: (v: T) => void;
}) {
  const c = useTheme();
  return (
    <View style={[styles.wrap, { backgroundColor: c.surfaceAlt }]} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <PressableScale
            key={o.value}
            onPress={() => onChange(o.value)}
            scaleTo={0.97}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={[styles.seg, on && { backgroundColor: c.ink }]}
          >
            <Text variant="caption" style={{ color: on ? c.inverse : c.inkSoft, fontWeight: '700' }} numberOfLines={1}>{o.label}</Text>
          </PressableScale>
        );
      })}
    </View>
  );
}
const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', padding: 3, borderRadius: radii.md, gap: 2 },
  seg: { flex: 1, height: 34, borderRadius: radii.md - 3, alignItems: 'center', justifyContent: 'center' },
});
