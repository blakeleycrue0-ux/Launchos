import React from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { SCREEN_PADDING } from '@/theme/tokens';

/** Contenedor de pantalla que respeta barra de estado, Dynamic Island e indicador inferior. */
export function Screen({ children, scroll = true, bottomExtra = 0, style, contentStyle, topInset = true }: {
  children: React.ReactNode; scroll?: boolean; bottomExtra?: number; style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>; topInset?: boolean;
}) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const pad = { paddingTop: (topInset ? insets.top : 0) + 8, paddingBottom: insets.bottom + 16 + bottomExtra, paddingHorizontal: SCREEN_PADDING };
  if (!scroll) return <View style={[{ flex: 1, backgroundColor: c.bg }, pad, style, contentStyle]}>{children}</View>;
  return (
    <ScrollView
      style={[{ flex: 1, backgroundColor: c.bg }, style]}
      contentContainerStyle={[pad, contentStyle]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="never"
    >
      {children}
    </ScrollView>
  );
}
export const Gap = ({ h = 16 }: { h?: number }) => <View style={{ height: h }} />;
export const hairline = StyleSheet.hairlineWidth * 2;
