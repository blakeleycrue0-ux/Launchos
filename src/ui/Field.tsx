import React, { forwardRef } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radii } from '@/theme/tokens';
import { Text } from './Text';

interface Props extends TextInputProps { label?: string; error?: string | null }

export const Field = forwardRef<React.ComponentRef<typeof TextInput>, Props>(function Field({ label, error, style, ...rest }, ref) {
  const c = useTheme();
  return (
    <View style={{ gap: 6 }}>
      {label ? <Text variant="caption" tone="soft" style={{ marginLeft: 4 }}>{label}</Text> : null}
      <TextInput
        ref={ref}
        placeholderTextColor={c.inkFaint}
        selectionColor={c.ink}
        accessibilityLabel={label}
        {...rest}
        style={[styles.input, { backgroundColor: c.surfaceAlt, color: c.ink, fontFamily: fonts[500] }, error ? { borderColor: c.ink } : null, style]}
      />
      {error ? <Text variant="caption" tone="soft" style={{ marginLeft: 4 }}>{error}</Text> : null}
    </View>
  );
});
const styles = StyleSheet.create({
  input: { height: 54, borderRadius: radii.md, paddingHorizontal: 18, fontSize: 16, borderWidth: 1.5, borderColor: 'transparent' },
});
