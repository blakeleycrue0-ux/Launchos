import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { NumpadKey } from '@/domain/amountInput';
import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';
import { Icon } from './Icon';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

const ROWS: NumpadKey[][] = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['dec', '0', 'back']];

/** Teclado numérico grande para introducir importes rápido. */
export function Numpad({ onKey, decimalSep = ',', allowDecimal = true }: { onKey: (k: NumpadKey) => void; decimalSep?: string; allowDecimal?: boolean }) {
  const c = useTheme();
  return (
    <View style={styles.pad}>
      {ROWS.map((row, i) => (
        <View key={i} style={styles.row}>
          {row.map((k) => {
            const hidden = k === 'dec' && !allowDecimal;
            return (
              <PressableScale
                key={k}
                feedback={false}
                disabled={hidden}
                scaleTo={0.9}
                onPress={() => { haptic.select(); onKey(k); }}
                accessibilityRole="button"
                accessibilityLabel={k === 'back' ? 'Borrar' : k === 'dec' ? decimalSep : k}
                style={[styles.key, { backgroundColor: hidden ? 'transparent' : c.surfaceAlt }]}
              >
                {k === 'back' ? <Icon name="backspace" size={26} color={c.ink} /> : hidden ? null : (
                  <Text variant="title" style={{ fontSize: 28 }}>{k === 'dec' ? decimalSep : k}</Text>
                )}
              </PressableScale>
            );
          })}
        </View>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  pad: { gap: 10 },
  row: { flexDirection: 'row', gap: 10 },
  key: { flex: 1, height: 58, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center' },
});
