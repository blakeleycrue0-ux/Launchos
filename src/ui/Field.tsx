import React, { forwardRef } from 'react';
import { Platform, StyleSheet, TextInput, View, type TextInputProps, type TextStyle } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radii } from '@/theme/tokens';
import { Text } from './Text';

/** En web el navegador dibuja su propio contorno de foco; el foco se indica con el borde champagne. */
export const noOutline = (Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) as TextStyle;

interface Props extends TextInputProps { label?: string; error?: string | null }

export const Field = forwardRef<React.ComponentRef<typeof TextInput>, Props>(function Field({ label, error, style, onFocus, onBlur, ...rest }, ref) {
  const c = useTheme();
  const [focused, setFocused] = React.useState(false);
  return (
    <View style={{ gap: 6 }}>
      {label ? <Text variant="caption" tone="soft" style={{ marginLeft: 4 }}>{label}</Text> : null}
      <TextInput
        ref={ref}
        placeholderTextColor={c.inkFaint}
        selectionColor={c.accent}
        onFocus={(e) => { setFocused(true); onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); onBlur?.(e); }}
        accessibilityLabel={label}
        {...rest}
        style={[styles.input, { backgroundColor: c.surfaceAlt, color: c.ink, fontFamily: fonts[500] }, noOutline, focused ? { borderColor: c.accent } : null, error ? { borderColor: c.ink } : null, style]}
      />
      {error ? <Text variant="caption" tone="soft" style={{ marginLeft: 4 }}>{error}</Text> : null}
    </View>
  );
});
const styles = StyleSheet.create({
  input: { height: 48, borderRadius: radii.md, paddingHorizontal: 14, fontSize: 15, borderWidth: 1, borderColor: 'transparent' },
});
