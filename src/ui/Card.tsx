import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';

/** Superficie con borde fino y sombra suave (en oscuro la profundidad la da el borde). */
export function Card({ children, style, padded = true }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; padded?: boolean }) {
  const c = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: c.surface, borderColor: c.line, shadowColor: c.shadow, shadowOpacity: c.scheme === 'light' ? c.shadowOpacity : 0 },
        padded && { padding: 16 },
        style,
      ]}
    >
      {children}
    </View>
  );
}
const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 0,
  },
});
